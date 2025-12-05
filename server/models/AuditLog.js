/**
 * Audit Log Model
 * Tracks all medical compliance actions for regulatory requirements
 * HIPAA, FDA, and other healthcare compliance
 */
const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    // Action type
    action: {
      type: String,
      enum: [
        "PATIENT_CREATED",
        "PATIENT_UPDATED",
        "PATIENT_VIEWED",
        "TREATMENT_GENERATED",
        "TREATMENT_VIEWED",
        "TREATMENT_APPROVED",
        "TREATMENT_REJECTED",
        "TREATMENT_MODIFIED",
        "INTERACTION_FLAGGED",
        "CONTRAINDICATION_FLAGGED",
        "OVERRIDE_APPLIED",
        "MEDICATION_PRESCRIBED",
        "MEDICATION_CHANGED",
        "SYSTEM_ACCESS",
        "EXPORT_DATA",
        "VALIDATION_ERROR",
        "AI_RESPONSE_VALIDATED",
        "DATABASE_CROSSCHECK",
      ],
      required: true,
    },

    // Who performed the action
    performedBy: {
      userId: { type: String },
      userName: { type: String, required: true },
      role: {
        type: String,
        enum: ["physician", "nurse", "pharmacist", "admin", "system"],
        default: "physician",
      },
      ipAddress: { type: String },
      userAgent: { type: String },
    },

    // What was affected
    target: {
      entityType: {
        type: String,
        enum: [
          "patient",
          "treatment_plan",
          "medication",
          "interaction",
          "system",
        ],
      },
      entityId: { type: mongoose.Schema.Types.ObjectId },
      entityName: { type: String },
    },

    // Patient reference (for patient-specific actions)
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
    },

    // Treatment plan reference
    treatmentPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TreatmentPlan",
    },

    // Action details
    details: {
      description: { type: String, required: true },
      previousValue: { type: mongoose.Schema.Types.Mixed },
      newValue: { type: mongoose.Schema.Types.Mixed },
      reason: { type: String },
      clinicalJustification: { type: String },
    },

    // Safety-related flags
    safety: {
      interactionsOverridden: [
        {
          drug1: String,
          drug2: String,
          severity: String,
          justification: String,
        },
      ],
      contraindicationsOverridden: [
        {
          type: String,
          item: String,
          severity: String,
          justification: String,
        },
      ],
      riskAcknowledged: { type: Boolean, default: false },
      riskLevel: { type: String, enum: ["low", "medium", "high", "critical"] },
    },

    // Validation results (for AI responses)
    validation: {
      schemaValid: { type: Boolean },
      validationErrors: [{ type: String }],
      validationWarnings: [{ type: String }],
      databaseCrossCheck: {
        performed: { type: Boolean },
        interactionsVerified: { type: Number },
        interactionsUnverified: { type: Number },
        databaseOnlyFindings: { type: Number },
      },
    },

    // Compliance metadata
    compliance: {
      hipaaRelevant: { type: Boolean, default: true },
      requiresFollowUp: { type: Boolean, default: false },
      followUpDate: { type: Date },
      regulatoryFlags: [{ type: String }],
    },

    // Session information
    session: {
      sessionId: { type: String },
      wizardStep: { type: String },
      timestamp: { type: Date, default: Date.now },
    },

    // Timestamps
    createdAt: { type: Date, default: Date.now },
  },
  {
    timestamps: false, // We use our own createdAt
  }
);

// Indexes for efficient querying
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ patientId: 1, createdAt: -1 });
auditLogSchema.index({ treatmentPlanId: 1, createdAt: -1 });
auditLogSchema.index({ "performedBy.userName": 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ "safety.riskLevel": 1 });

// Static method to log an action
auditLogSchema.statics.log = async function (logData) {
  try {
    const entry = new this(logData);
    await entry.save();
    return entry;
  } catch (err) {
    console.error("Failed to create audit log:", err);
    // Don't throw - audit logging should not break the application
    return null;
  }
};

// Static method to get audit trail for a patient
auditLogSchema.statics.getPatientAuditTrail = async function (
  patientId,
  options = {}
) {
  const query = { patientId };

  if (options.action) {
    query.action = options.action;
  }

  if (options.startDate || options.endDate) {
    query.createdAt = {};
    if (options.startDate) query.createdAt.$gte = options.startDate;
    if (options.endDate) query.createdAt.$lte = options.endDate;
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 100)
    .lean();
};

// Static method to get audit trail for a treatment plan
auditLogSchema.statics.getTreatmentAuditTrail = async function (
  treatmentPlanId
) {
  return this.find({ treatmentPlanId }).sort({ createdAt: -1 }).lean();
};

// Static method to get physician activity report
auditLogSchema.statics.getPhysicianActivity = async function (
  userName,
  startDate,
  endDate
) {
  const query = {
    "performedBy.userName": userName,
    createdAt: {
      $gte: startDate,
      $lte: endDate,
    },
  };

  const actions = await this.find(query).sort({ createdAt: -1 }).lean();

  // Aggregate statistics
  const stats = {
    totalActions: actions.length,
    treatmentsApproved: actions.filter((a) => a.action === "TREATMENT_APPROVED")
      .length,
    treatmentsRejected: actions.filter((a) => a.action === "TREATMENT_REJECTED")
      .length,
    treatmentsModified: actions.filter((a) => a.action === "TREATMENT_MODIFIED")
      .length,
    overridesApplied: actions.filter((a) => a.action === "OVERRIDE_APPLIED")
      .length,
    criticalRiskActions: actions.filter(
      (a) => a.safety?.riskLevel === "critical"
    ).length,
  };

  return { actions, stats };
};

// Static method to get critical safety events
auditLogSchema.statics.getCriticalSafetyEvents = async function (
  startDate,
  endDate
) {
  return this.find({
    createdAt: {
      $gte: startDate,
      $lte: endDate,
    },
    $or: [
      { "safety.riskLevel": "critical" },
      { action: "OVERRIDE_APPLIED" },
      { action: "INTERACTION_FLAGGED" },
      { action: "CONTRAINDICATION_FLAGGED" },
    ],
  })
    .sort({ createdAt: -1 })
    .populate("patientId", "firstName lastName")
    .lean();
};

module.exports = mongoose.model("AuditLog", auditLogSchema);
