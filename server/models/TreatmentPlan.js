const mongoose = require("mongoose");

const treatmentPlanSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },

    // Workflow Step Tracking
    workflowStep: {
      type: String,
      enum: ["intake", "analysis", "review", "finalized"],
      default: "intake",
    },

    // Treatment Recommendation
    treatment: {
      primaryMedication: {
        name: { type: String, required: true },
        dosage: { type: String, required: true },
        frequency: { type: String, required: true },
        duration: { type: String, required: true },
        instructions: { type: String },
        confidence: { type: Number, min: 0, max: 100, default: 75 },
      },
      supportingMedications: [
        {
          name: { type: String },
          dosage: { type: String },
          frequency: { type: String },
          duration: { type: String },
          reason: { type: String },
          confidence: { type: Number, min: 0, max: 100 },
        },
      ],
      lifestyleRecommendations: [{ type: String }],
      monitoringRequired: [{ type: String }],
    },

    // Safety Assessment
    safetyAssessment: {
      overallRiskLevel: {
        type: String,
        enum: ["low", "medium", "high", "critical"],
        required: true,
      },
      riskScore: { type: Number, min: 0, max: 100 },
      riskFactors: [
        {
          factor: { type: String },
          severity: {
            type: String,
            enum: ["low", "medium", "high", "critical"],
          },
          description: { type: String },
        },
      ],
    },

    // Drug Interactions
    drugInteractions: [
      {
        drug1: { type: String },
        drug2: { type: String },
        severity: {
          type: String,
          enum: ["minor", "moderate", "major", "contraindicated"],
        },
        description: { type: String },
        recommendation: { type: String },
      },
    ],

    // Contraindications
    contraindications: [
      {
        type: {
          type: String,
          enum: ["allergy", "condition", "age", "medication", "lifestyle"],
        },
        item: { type: String },
        severity: {
          type: String,
          enum: ["warning", "caution", "contraindicated"],
        },
        description: { type: String },
        recommendation: { type: String },
      },
    ],

    // Alternative Treatments
    alternatives: [
      {
        medication: { type: String },
        dosage: { type: String },
        reason: { type: String },
        suitabilityScore: { type: Number, min: 0, max: 100 },
        confidence: { type: Number, min: 0, max: 100 },
      },
    ],

    // Rationale
    rationale: {
      summary: { type: String },
      clinicalReasoning: { type: String },
      evidenceBasis: { type: String },
      patientSpecificFactors: [{ type: String }],
      overallConfidence: { type: Number, min: 0, max: 100, default: 75 },
    },

    // Validation Results
    validation: {
      schemaValid: { type: Boolean, default: true },
      errors: [{ type: String }],
      warnings: [{ type: String }],
      databaseCrossCheck: {
        performed: { type: Boolean, default: false },
        interactionsVerified: { type: Number, default: 0 },
        interactionsUnverified: { type: Number, default: 0 },
        databaseOnlyFindings: { type: Number, default: 0 },
      },
    },

    // Approval Workflow
    status: {
      type: String,
      enum: ["pending", "approved", "modified", "rejected"],
      default: "pending",
    },
    reviewedBy: { type: String },
    reviewedAt: { type: Date },
    reviewNotes: { type: String },
    modifications: [
      {
        field: { type: String },
        originalValue: { type: String },
        newValue: { type: String },
        reason: { type: String },
        modifiedAt: { type: Date, default: Date.now },
        modifiedBy: { type: String },
        isPostApproval: { type: Boolean, default: false },
      },
    ],

    // Original AI Output Snapshot (captured when doctor enters review)
    originalAiOutput: {
      treatment: { type: mongoose.Schema.Types.Mixed },
      safetyAssessment: { type: mongoose.Schema.Types.Mixed },
      drugInteractions: { type: mongoose.Schema.Types.Mixed },
      contraindications: { type: mongoose.Schema.Types.Mixed },
      alternatives: { type: mongoose.Schema.Types.Mixed },
      rationale: { type: mongoose.Schema.Types.Mixed },
      capturedAt: { type: Date },
    },

    // Post-approval modification tracking
    lastModifiedBy: { type: String },
    lastModifiedAt: { type: Date },
    postApprovalModifications: { type: Number, default: 0 },

    // Regeneration tracking
    regeneratedAt: { type: Date },
    regeneratedBy: { type: String },
    regenerationCount: { type: Number, default: 0 },

    // AI Generation metadata
    aiModel: { type: String },
    generatedAt: { type: Date, default: Date.now },
    promptVersion: { type: String },
  },
  { timestamps: true }
);

// Indexes for common query patterns
treatmentPlanSchema.index({ patientId: 1, createdAt: -1 }); // Plans by patient
treatmentPlanSchema.index({ status: 1, createdAt: -1 }); // List by status
treatmentPlanSchema.index({ "safetyAssessment.overallRiskLevel": 1 }); // Filter by risk
treatmentPlanSchema.index({ createdAt: -1 }); // Default sort
treatmentPlanSchema.index({ reviewedBy: 1, reviewedAt: -1 }); // Audit queries

module.exports = mongoose.model("TreatmentPlan", treatmentPlanSchema);
