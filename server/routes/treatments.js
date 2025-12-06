const express = require("express");
const router = express.Router();
const TreatmentPlan = require("../models/TreatmentPlan");
const Patient = require("../models/Patient");
const AuditLog = require("../models/AuditLog");
const { generateTreatmentPlan } = require("../services/openaiService");

// POST - Generate new treatment plan for a patient
router.post("/generate/:patientId", async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.patientId);
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Generate treatment plan using OpenAI
    const aiPlan = await generateTreatmentPlan(patient);

    // Save to database
    const treatmentPlan = new TreatmentPlan({
      patientId: patient._id,
      ...aiPlan,
    });

    const savedPlan = await treatmentPlan.save();

    // Update patient status
    await Patient.findByIdAndUpdate(patient._id, { status: "reviewed" });

    // Create audit log
    await AuditLog.log({
      action: "TREATMENT_GENERATED",
      performedBy: {
        userName: "System",
        role: "system",
      },
      target: {
        entityType: "treatment_plan",
        entityId: savedPlan._id,
        entityName: `Treatment for ${patient.firstName} ${patient.lastName}`,
      },
      patientId: patient._id,
      treatmentPlanId: savedPlan._id,
      details: {
        description: `AI-generated treatment plan for ${patient.primaryComplaint?.condition}`,
        reason: "Patient intake completed",
      },
      validation: savedPlan.validation,
      safety: {
        riskLevel: savedPlan.safetyAssessment?.overallRiskLevel,
        riskAcknowledged: false,
      },
      session: {
        wizardStep: "analysis",
      },
    });

    // Log if critical interactions were found
    if (savedPlan.safetyAssessment?.overallRiskLevel === "critical") {
      await AuditLog.log({
        action: "INTERACTION_FLAGGED",
        performedBy: { userName: "System", role: "system" },
        patientId: patient._id,
        treatmentPlanId: savedPlan._id,
        details: {
          description: "Critical drug interaction or contraindication detected",
        },
        safety: {
          riskLevel: "critical",
          interactionsOverridden: [],
        },
      });
    }

    res.status(201).json(savedPlan);
  } catch (error) {
    console.error("Treatment generation error:", error);
    res.status(500).json({ message: error.message });
  }
});

// GET - Get all treatment plans (with pagination and filtering)
router.get("/", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      patientId,
      riskLevel,
      sortBy = "createdAt",
      sortOrder = "desc",
      summary = "false", // Return summary view by default when 'true'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Build query filter
    const filter = {};
    if (status) filter.status = status;
    if (patientId) filter.patientId = patientId;
    if (riskLevel) filter["safetyAssessment.overallRiskLevel"] = riskLevel;

    // Build sort
    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    // Summary projection for list view (lighter payload)
    const summaryProjection =
      summary === "true"
        ? {
            patientId: 1,
            status: 1,
            workflowStep: 1,
            "treatment.primaryMedication.name": 1,
            "treatment.primaryMedication.dosage": 1,
            "safetyAssessment.overallRiskLevel": 1,
            "safetyAssessment.riskScore": 1,
            createdAt: 1,
            reviewedAt: 1,
            reviewedBy: 1,
          }
        : null;

    // Execute query with pagination
    const [plans, total] = await Promise.all([
      TreatmentPlan.find(filter, summaryProjection)
        .populate("patientId", "firstName lastName primaryComplaint")
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      TreatmentPlan.countDocuments(filter),
    ]);

    res.json({
      data: plans,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasMore: skip + plans.length < total,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET - Get treatment plans for a specific patient (MUST be before /:id)
router.get("/patient/:patientId", async (req, res) => {
  try {
    const { summary = "false" } = req.query;

    // Summary projection for list view
    const summaryProjection =
      summary === "true"
        ? {
            status: 1,
            workflowStep: 1,
            "treatment.primaryMedication.name": 1,
            "treatment.primaryMedication.dosage": 1,
            "safetyAssessment.overallRiskLevel": 1,
            createdAt: 1,
            reviewedAt: 1,
          }
        : null;

    const plans = await TreatmentPlan.find(
      { patientId: req.params.patientId },
      summaryProjection
    )
      .sort({ createdAt: -1 })
      .lean();

    res.json(plans);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET - Get full analysis details (complete LLM output) - MUST be before /:id
router.get("/:id/full-details", async (req, res) => {
  try {
    const plan = await TreatmentPlan.findById(req.params.id).populate(
      "patientId"
    );
    if (!plan) {
      return res.status(404).json({ message: "Treatment plan not found" });
    }

    // Return comprehensive details including original AI output
    res.json({
      _id: plan._id,
      patient: {
        id: plan.patientId._id,
        name: `${plan.patientId.firstName} ${plan.patientId.lastName}`,
        condition: plan.patientId.primaryComplaint?.condition,
      },
      status: plan.status,
      workflowStep: plan.workflowStep,
      createdAt: plan.createdAt,
      reviewedAt: plan.reviewedAt,
      reviewedBy: plan.reviewedBy,
      regeneratedAt: plan.regeneratedAt,
      regenerationCount: plan.regenerationCount || 0,

      // Current treatment state
      currentPlan: {
        treatment: plan.treatment,
        safetyAssessment: plan.safetyAssessment,
        drugInteractions: plan.drugInteractions,
        contraindications: plan.contraindications,
        alternatives: plan.alternatives,
        rationale: plan.rationale,
      },

      // Original AI output (if captured)
      originalAiOutput: plan.originalAiOutput,

      // Validation and technical details
      validation: plan.validation,
      aiModel: plan.aiModel,
      promptVersion: plan.promptVersion,

      // Modification history
      modifications: plan.modifications,
      postApprovalModifications: plan.postApprovalModifications || 0,

      // Review details
      reviewNotes: plan.reviewNotes,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET - Get treatment plan by ID (generic - MUST be after specific routes)
router.get("/:id", async (req, res) => {
  try {
    const plan = await TreatmentPlan.findById(req.params.id)
      .populate("patientId")
      .lean();
    if (!plan) {
      return res.status(404).json({ message: "Treatment plan not found" });
    }
    res.json(plan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT - Approve treatment plan
router.put("/:id/approve", async (req, res) => {
  try {
    const { reviewedBy, reviewNotes } = req.body;

    const plan = await TreatmentPlan.findByIdAndUpdate(
      req.params.id,
      {
        status: "approved",
        reviewedBy,
        reviewedAt: new Date(),
        reviewNotes,
        workflowStep: "finalized",
      },
      { new: true }
    ).populate("patientId");

    if (!plan) {
      return res.status(404).json({ message: "Treatment plan not found" });
    }

    // Update patient status
    await Patient.findByIdAndUpdate(plan.patientId._id, {
      status: "treatment_planned",
    });

    // Create audit log
    await AuditLog.log({
      action: "TREATMENT_APPROVED",
      performedBy: {
        userName: reviewedBy,
        role: "physician",
      },
      target: {
        entityType: "treatment_plan",
        entityId: plan._id,
        entityName: `Treatment for ${plan.patientId.firstName} ${plan.patientId.lastName}`,
      },
      patientId: plan.patientId._id,
      treatmentPlanId: plan._id,
      details: {
        description: `Approved treatment plan: ${plan.treatment.primaryMedication.name} ${plan.treatment.primaryMedication.dosage}`,
        reason: reviewNotes || "Standard approval",
        clinicalJustification: reviewNotes,
      },
      safety: {
        riskLevel: plan.safetyAssessment?.overallRiskLevel,
        riskAcknowledged: true,
      },
      session: {
        wizardStep: "finalized",
      },
    });

    res.json(plan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT - Reject treatment plan
router.put("/:id/reject", async (req, res) => {
  try {
    const { reviewedBy, reviewNotes } = req.body;

    const plan = await TreatmentPlan.findByIdAndUpdate(
      req.params.id,
      {
        status: "rejected",
        reviewedBy,
        reviewedAt: new Date(),
        reviewNotes,
        workflowStep: "review",
      },
      { new: true }
    ).populate("patientId");

    if (!plan) {
      return res.status(404).json({ message: "Treatment plan not found" });
    }

    // Create audit log
    await AuditLog.log({
      action: "TREATMENT_REJECTED",
      performedBy: {
        userName: reviewedBy,
        role: "physician",
      },
      target: {
        entityType: "treatment_plan",
        entityId: plan._id,
        entityName: `Treatment for ${plan.patientId.firstName} ${plan.patientId.lastName}`,
      },
      patientId: plan.patientId._id,
      treatmentPlanId: plan._id,
      details: {
        description: `Rejected treatment plan: ${plan.treatment.primaryMedication.name}`,
        reason: reviewNotes || "Clinical judgment",
        clinicalJustification: reviewNotes,
      },
      safety: {
        riskLevel: plan.safetyAssessment?.overallRiskLevel,
        riskAcknowledged: false,
      },
      session: {
        wizardStep: "review",
      },
    });

    res.json(plan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT - Modify treatment plan
router.put("/:id/modify", async (req, res) => {
  try {
    const { modifications, reviewedBy, reviewNotes, updatedMedications } =
      req.body;

    const plan = await TreatmentPlan.findById(req.params.id).populate(
      "patientId"
    );
    if (!plan) {
      return res.status(404).json({ message: "Treatment plan not found" });
    }

    // Capture original state for audit comparison
    const originalState = {
      treatment: JSON.parse(JSON.stringify(plan.treatment)),
      status: plan.status,
    };

    const modificationDetails = [];

    // Apply modifications from the modifications list
    for (const mod of modifications || []) {
      const modEntry = {
        field: mod.field,
        originalValue: mod.originalValue,
        newValue: mod.newValue,
        reason: mod.reason,
        modifiedAt: new Date(),
        modifiedBy: reviewedBy,
      };
      plan.modifications.push(modEntry);
      modificationDetails.push(modEntry);
    }

    // Handle updated medications if provided
    if (updatedMedications) {
      // Update primary medication
      if (updatedMedications.primaryMedication) {
        const primary = updatedMedications.primaryMedication;
        plan.treatment.primaryMedication = {
          name: primary.name,
          dosage: primary.dosage,
          frequency: primary.frequency,
          duration: primary.duration,
          instructions: primary.instructions || "",
          confidence: plan.treatment.primaryMedication?.confidence || 80,
        };
      }

      // Update supporting medications
      if (updatedMedications.supportingMedications) {
        plan.treatment.supportingMedications =
          updatedMedications.supportingMedications.map((med) => ({
            name: med.name,
            dosage: med.dosage,
            frequency: med.frequency,
            duration: med.duration,
            reason: med.instructions || med.reason || "",
            confidence: med.confidence || 75,
          }));
      }
    } else {
      // Legacy: Apply individual field modifications
      for (const mod of modifications || []) {
        if (mod.field === "primaryMedication.dosage") {
          plan.treatment.primaryMedication.dosage = mod.newValue;
        } else if (mod.field === "primaryMedication.frequency") {
          plan.treatment.primaryMedication.frequency = mod.newValue;
        } else if (mod.field === "primaryMedication.name") {
          plan.treatment.primaryMedication.name = mod.newValue;
        } else if (mod.field === "primaryMedication.duration") {
          plan.treatment.primaryMedication.duration = mod.newValue;
        }
      }
    }

    // Determine if this is initial modification (first time modifying AI plan)
    const isInitialModification = plan.status === "pending";

    plan.status = "modified";
    plan.reviewedBy = reviewedBy;
    plan.reviewedAt = new Date();
    plan.reviewNotes = reviewNotes;
    plan.workflowStep = "finalized";

    const updatedPlan = await plan.save();

    // Update patient status
    await Patient.findByIdAndUpdate(plan.patientId._id, {
      status: "treatment_planned",
    });

    // Create comprehensive audit log entry with full modification details
    await AuditLog.log({
      action: "TREATMENT_MODIFIED",
      performedBy: {
        userName: reviewedBy,
        role: "physician",
      },
      target: {
        entityType: "treatment_plan",
        entityId: plan._id,
        entityName: `Treatment for ${plan.patientId.firstName} ${plan.patientId.lastName}`,
      },
      patientId: plan.patientId._id,
      treatmentPlanId: plan._id,
      details: {
        description: isInitialModification
          ? `Initial modification of AI-proposed plan by ${reviewedBy}`
          : `Subsequent modification by ${reviewedBy}`,
        isInitialModification,
        // Store individual modifications for audit trail display
        modifications: modificationDetails.map((m) => ({
          field: m.field,
          from: m.originalValue,
          to: m.newValue,
          reason: m.reason,
        })),
        // Also store as previousValue/newValue for backwards compatibility
        previousValue: originalState.treatment,
        newValue: plan.treatment,
        reason: reviewNotes,
        clinicalJustification: reviewNotes,
        medicationsCount: updatedMedications
          ? 1 + (updatedMedications.supportingMedications?.length || 0)
          : undefined,
        // Snapshot of original AI output if available
        originalAiSnapshot: plan.originalAiOutput
          ? {
              primaryMedication:
                plan.originalAiOutput.treatment?.primaryMedication,
              riskLevel:
                plan.originalAiOutput.safetyAssessment?.overallRiskLevel,
            }
          : null,
      },
      safety: {
        riskLevel: plan.safetyAssessment?.overallRiskLevel,
        riskAcknowledged: true,
      },
      session: {
        wizardStep: "finalized",
      },
    });

    res.json(updatedPlan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST - Enter review step (captures initial AI snapshot for audit)
router.post("/:id/enter-review", async (req, res) => {
  try {
    const { reviewedBy } = req.body;

    const plan = await TreatmentPlan.findById(req.params.id).populate(
      "patientId"
    );
    if (!plan) {
      return res.status(404).json({ message: "Treatment plan not found" });
    }

    // Store original AI output snapshot if not already captured
    if (!plan.originalAiOutput) {
      plan.originalAiOutput = {
        treatment: JSON.parse(JSON.stringify(plan.treatment)),
        safetyAssessment: JSON.parse(JSON.stringify(plan.safetyAssessment)),
        drugInteractions: JSON.parse(
          JSON.stringify(plan.drugInteractions || [])
        ),
        contraindications: JSON.parse(
          JSON.stringify(plan.contraindications || [])
        ),
        alternatives: JSON.parse(JSON.stringify(plan.alternatives || [])),
        rationale: JSON.parse(JSON.stringify(plan.rationale || {})),
        capturedAt: new Date(),
      };
      plan.workflowStep = "review";
      await plan.save();
    }

    // Create audit log for entering review
    await AuditLog.log({
      action: "REVIEW_STARTED",
      performedBy: {
        userName: reviewedBy || "Unknown Physician",
        role: "physician",
      },
      target: {
        entityType: "treatment_plan",
        entityId: plan._id,
        entityName: `Treatment for ${plan.patientId.firstName} ${plan.patientId.lastName}`,
      },
      patientId: plan.patientId._id,
      treatmentPlanId: plan._id,
      details: {
        description: `Doctor ${
          reviewedBy || "Unknown"
        } began reviewing AI-proposed treatment plan`,
        originalAiPlan: {
          primaryMedication:
            plan.originalAiOutput?.treatment?.primaryMedication,
          supportingMedications:
            plan.originalAiOutput?.treatment?.supportingMedications,
          riskLevel: plan.originalAiOutput?.safetyAssessment?.overallRiskLevel,
          riskScore: plan.originalAiOutput?.safetyAssessment?.riskScore,
        },
      },
      safety: {
        riskLevel: plan.safetyAssessment?.overallRiskLevel,
        riskAcknowledged: false,
      },
      session: {
        wizardStep: "review",
      },
    });

    res.json(plan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT - Post-approval modification (for adjusting treatment after initial approval)
router.put("/:id/post-approval-modify", async (req, res) => {
  try {
    const { modifications, reviewedBy, reviewNotes, updatedMedications } =
      req.body;

    const plan = await TreatmentPlan.findById(req.params.id).populate(
      "patientId"
    );
    if (!plan) {
      return res.status(404).json({ message: "Treatment plan not found" });
    }

    // Store what was before this modification
    const previousState = {
      treatment: JSON.parse(JSON.stringify(plan.treatment)),
      status: plan.status,
      modifiedAt: new Date(),
    };

    const modificationDetails = [];

    // Apply modifications from the modifications list
    for (const mod of modifications || []) {
      const modEntry = {
        field: mod.field,
        originalValue: mod.originalValue,
        newValue: mod.newValue,
        reason: mod.reason || "Post-approval adjustment",
        modifiedAt: new Date(),
        modifiedBy: reviewedBy,
        isPostApproval: true,
      };
      plan.modifications.push(modEntry);
      modificationDetails.push(modEntry);
    }

    // Handle updated medications if provided
    if (updatedMedications) {
      if (updatedMedications.primaryMedication) {
        const primary = updatedMedications.primaryMedication;
        plan.treatment.primaryMedication = {
          name: primary.name,
          dosage: primary.dosage,
          frequency: primary.frequency,
          duration: primary.duration,
          instructions: primary.instructions || "",
          confidence: plan.treatment.primaryMedication?.confidence || 80,
        };
      }

      if (updatedMedications.supportingMedications) {
        plan.treatment.supportingMedications =
          updatedMedications.supportingMedications.map((med) => ({
            name: med.name,
            dosage: med.dosage,
            frequency: med.frequency,
            duration: med.duration,
            reason: med.instructions || med.reason || "",
            confidence: med.confidence || 75,
          }));
      }
    }

    // Keep status but add post-approval modification tracking
    plan.lastModifiedBy = reviewedBy;
    plan.lastModifiedAt = new Date();
    plan.postApprovalModifications = (plan.postApprovalModifications || 0) + 1;

    const updatedPlan = await plan.save();

    // Create detailed audit log for post-approval modification
    await AuditLog.log({
      action: "POST_APPROVAL_MODIFICATION",
      performedBy: {
        userName: reviewedBy,
        role: "physician",
      },
      target: {
        entityType: "treatment_plan",
        entityId: plan._id,
        entityName: `Treatment for ${plan.patientId.firstName} ${plan.patientId.lastName}`,
      },
      patientId: plan.patientId._id,
      treatmentPlanId: plan._id,
      details: {
        description: `Post-approval modification #${plan.postApprovalModifications} by ${reviewedBy}`,
        previousValue: previousState.treatment,
        newValue: plan.treatment,
        modifications: modificationDetails.map((m) => ({
          field: m.field,
          from: m.originalValue,
          to: m.newValue,
        })),
        reason: reviewNotes,
        clinicalJustification: reviewNotes,
        modificationNumber: plan.postApprovalModifications,
      },
      safety: {
        riskLevel: plan.safetyAssessment?.overallRiskLevel,
        riskAcknowledged: true,
      },
      session: {
        wizardStep: "finalized",
      },
    });

    res.json(updatedPlan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST - Regenerate treatment plan (re-run AI analysis)
router.post("/:id/regenerate", async (req, res) => {
  try {
    const { requestedBy, reason } = req.body;

    const existingPlan = await TreatmentPlan.findById(req.params.id).populate(
      "patientId"
    );
    if (!existingPlan) {
      return res.status(404).json({ message: "Treatment plan not found" });
    }

    const patient = await Patient.findById(existingPlan.patientId._id);
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Store previous plan for audit
    const previousPlan = {
      treatment: existingPlan.treatment,
      safetyAssessment: existingPlan.safetyAssessment,
      status: existingPlan.status,
    };

    // Generate new treatment plan using OpenAI
    const aiPlan = await generateTreatmentPlan(patient);

    // Update existing plan with new AI output
    existingPlan.treatment = aiPlan.treatment;
    existingPlan.safetyAssessment = aiPlan.safetyAssessment;
    existingPlan.drugInteractions = aiPlan.drugInteractions;
    existingPlan.contraindications = aiPlan.contraindications;
    existingPlan.alternatives = aiPlan.alternatives;
    existingPlan.rationale = aiPlan.rationale;
    existingPlan.validation = aiPlan.validation;
    existingPlan.status = "pending";
    existingPlan.workflowStep = "analysis";
    existingPlan.regeneratedAt = new Date();
    existingPlan.regeneratedBy = requestedBy;
    existingPlan.regenerationCount = (existingPlan.regenerationCount || 0) + 1;

    // Clear original AI output so it gets recaptured on next review
    existingPlan.originalAiOutput = null;

    const savedPlan = await existingPlan.save();

    // Create audit log for regeneration
    await AuditLog.log({
      action: "TREATMENT_REGENERATED",
      performedBy: {
        userName: requestedBy || "System",
        role: "physician",
      },
      target: {
        entityType: "treatment_plan",
        entityId: savedPlan._id,
        entityName: `Treatment for ${patient.firstName} ${patient.lastName}`,
      },
      patientId: patient._id,
      treatmentPlanId: savedPlan._id,
      details: {
        description: `Treatment plan regenerated (attempt #${savedPlan.regenerationCount})`,
        reason: reason || "Re-analysis requested",
        previousPlan: {
          medication: previousPlan.treatment?.primaryMedication?.name,
          riskLevel: previousPlan.safetyAssessment?.overallRiskLevel,
          status: previousPlan.status,
        },
        newPlan: {
          medication: savedPlan.treatment?.primaryMedication?.name,
          riskLevel: savedPlan.safetyAssessment?.overallRiskLevel,
        },
      },
      safety: {
        riskLevel: savedPlan.safetyAssessment?.overallRiskLevel,
        riskAcknowledged: false,
      },
      session: {
        wizardStep: "analysis",
      },
    });

    res.json(savedPlan);
  } catch (error) {
    console.error("Treatment regeneration error:", error);
    res.status(500).json({ message: error.message });
  }
});

// DELETE - Delete treatment plan
router.delete("/:id", async (req, res) => {
  try {
    const plan = await TreatmentPlan.findByIdAndDelete(req.params.id);
    if (!plan) {
      return res.status(404).json({ message: "Treatment plan not found" });
    }
    res.json({ message: "Treatment plan deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
