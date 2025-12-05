/**
 * JSON Schema for validating LLM-generated treatment plans
 * Used to ensure AI output conforms to expected structure
 */

const treatmentPlanJsonSchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  required: ["treatment", "safetyAssessment", "rationale"],
  properties: {
    treatment: {
      type: "object",
      required: ["primaryMedication"],
      properties: {
        primaryMedication: {
          type: "object",
          required: ["name", "dosage", "frequency", "duration"],
          properties: {
            name: { type: "string", minLength: 1 },
            dosage: { type: "string", minLength: 1 },
            frequency: { type: "string", minLength: 1 },
            duration: { type: "string", minLength: 1 },
            instructions: { type: "string" },
            confidence: { type: "number", minimum: 0, maximum: 100 },
          },
        },
        supportingMedications: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              dosage: { type: "string" },
              frequency: { type: "string" },
              duration: { type: "string" },
              reason: { type: "string" },
              confidence: { type: "number", minimum: 0, maximum: 100 },
            },
          },
        },
        lifestyleRecommendations: {
          type: "array",
          items: { type: "string" },
        },
        monitoringRequired: {
          type: "array",
          items: { type: "string" },
        },
      },
    },
    safetyAssessment: {
      type: "object",
      required: ["overallRiskLevel", "riskScore"],
      properties: {
        overallRiskLevel: {
          type: "string",
          enum: ["low", "medium", "high", "critical"],
        },
        riskScore: {
          type: "number",
          minimum: 0,
          maximum: 100,
        },
        riskFactors: {
          type: "array",
          items: {
            type: "object",
            properties: {
              factor: { type: "string" },
              severity: {
                type: "string",
                enum: ["low", "medium", "high", "critical"],
              },
              description: { type: "string" },
            },
          },
        },
      },
    },
    drugInteractions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          drug1: { type: "string" },
          drug2: { type: "string" },
          severity: {
            type: "string",
            enum: ["minor", "moderate", "major", "contraindicated"],
          },
          description: { type: "string" },
          recommendation: { type: "string" },
          source: { type: "string" },
          confidence: { type: "number", minimum: 0, maximum: 100 },
        },
      },
    },
    contraindications: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["allergy", "condition", "age", "medication", "lifestyle"],
          },
          item: { type: "string" },
          severity: {
            type: "string",
            enum: ["warning", "caution", "contraindicated"],
          },
          description: { type: "string" },
          recommendation: { type: "string" },
          source: { type: "string" },
        },
      },
    },
    alternatives: {
      type: "array",
      items: {
        type: "object",
        required: ["medication", "reason"],
        properties: {
          medication: { type: "string" },
          dosage: { type: "string" },
          reason: { type: "string" },
          suitabilityScore: { type: "number", minimum: 0, maximum: 100 },
          confidence: { type: "number", minimum: 0, maximum: 100 },
        },
      },
    },
    rationale: {
      type: "object",
      required: ["summary", "clinicalReasoning"],
      properties: {
        summary: { type: "string", minLength: 10 },
        clinicalReasoning: { type: "string", minLength: 10 },
        evidenceBasis: { type: "string" },
        patientSpecificFactors: {
          type: "array",
          items: { type: "string" },
        },
        overallConfidence: { type: "number", minimum: 0, maximum: 100 },
      },
    },
  },
};

/**
 * Validate treatment plan against JSON schema
 */
function validateTreatmentPlan(plan) {
  const errors = [];
  const warnings = [];

  // Check required top-level properties
  if (!plan.treatment) {
    errors.push({ path: "treatment", message: "Treatment object is required" });
  } else {
    if (!plan.treatment.primaryMedication) {
      errors.push({
        path: "treatment.primaryMedication",
        message: "Primary medication is required",
      });
    } else {
      const pm = plan.treatment.primaryMedication;
      if (!pm.name || pm.name.trim() === "") {
        errors.push({
          path: "treatment.primaryMedication.name",
          message: "Medication name is required",
        });
      }
      if (!pm.dosage || pm.dosage.trim() === "") {
        errors.push({
          path: "treatment.primaryMedication.dosage",
          message: "Dosage is required",
        });
      }
      if (!pm.frequency || pm.frequency.trim() === "") {
        errors.push({
          path: "treatment.primaryMedication.frequency",
          message: "Frequency is required",
        });
      }
      if (!pm.duration || pm.duration.trim() === "") {
        errors.push({
          path: "treatment.primaryMedication.duration",
          message: "Duration is required",
        });
      }
    }
  }

  // Check safety assessment
  if (!plan.safetyAssessment) {
    errors.push({
      path: "safetyAssessment",
      message: "Safety assessment is required",
    });
  } else {
    const validRiskLevels = ["low", "medium", "high", "critical"];
    if (!validRiskLevels.includes(plan.safetyAssessment.overallRiskLevel)) {
      errors.push({
        path: "safetyAssessment.overallRiskLevel",
        message: `Invalid risk level. Must be one of: ${validRiskLevels.join(
          ", "
        )}`,
      });
    }
    if (
      typeof plan.safetyAssessment.riskScore !== "number" ||
      plan.safetyAssessment.riskScore < 0 ||
      plan.safetyAssessment.riskScore > 100
    ) {
      warnings.push({
        path: "safetyAssessment.riskScore",
        message: "Risk score should be a number between 0 and 100",
      });
    }
  }

  // Check rationale
  if (!plan.rationale) {
    errors.push({ path: "rationale", message: "Rationale is required" });
  } else {
    if (!plan.rationale.summary || plan.rationale.summary.length < 10) {
      warnings.push({
        path: "rationale.summary",
        message: "Rationale summary should be at least 10 characters",
      });
    }
    if (
      !plan.rationale.clinicalReasoning ||
      plan.rationale.clinicalReasoning.length < 10
    ) {
      warnings.push({
        path: "rationale.clinicalReasoning",
        message: "Clinical reasoning should be at least 10 characters",
      });
    }
  }

  // Validate drug interactions structure
  if (plan.drugInteractions && Array.isArray(plan.drugInteractions)) {
    const validSeverities = ["minor", "moderate", "major", "contraindicated"];
    plan.drugInteractions.forEach((interaction, idx) => {
      if (!interaction.drug1 || !interaction.drug2) {
        warnings.push({
          path: `drugInteractions[${idx}]`,
          message: "Drug interaction should have both drug1 and drug2",
        });
      }
      if (!validSeverities.includes(interaction.severity)) {
        warnings.push({
          path: `drugInteractions[${idx}].severity`,
          message: `Invalid severity. Must be one of: ${validSeverities.join(
            ", "
          )}`,
        });
      }
    });
  }

  // Validate contraindications structure
  if (plan.contraindications && Array.isArray(plan.contraindications)) {
    const validTypes = [
      "allergy",
      "condition",
      "age",
      "medication",
      "lifestyle",
    ];
    const validSeverities = ["warning", "caution", "contraindicated"];
    plan.contraindications.forEach((contra, idx) => {
      if (!validTypes.includes(contra.type)) {
        warnings.push({
          path: `contraindications[${idx}].type`,
          message: `Invalid type. Must be one of: ${validTypes.join(", ")}`,
        });
      }
      if (!validSeverities.includes(contra.severity)) {
        warnings.push({
          path: `contraindications[${idx}].severity`,
          message: `Invalid severity. Must be one of: ${validSeverities.join(
            ", "
          )}`,
        });
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Sanitize and fix common issues in LLM output
 */
function sanitizeTreatmentPlan(plan) {
  const sanitized = { ...plan };

  // Ensure arrays exist
  if (!sanitized.drugInteractions) sanitized.drugInteractions = [];
  if (!sanitized.contraindications) sanitized.contraindications = [];
  if (!sanitized.alternatives) sanitized.alternatives = [];
  if (!sanitized.treatment?.lifestyleRecommendations) {
    sanitized.treatment = sanitized.treatment || {};
    sanitized.treatment.lifestyleRecommendations = [];
  }
  if (!sanitized.treatment?.monitoringRequired) {
    sanitized.treatment.monitoringRequired = [];
  }
  if (!sanitized.treatment?.supportingMedications) {
    sanitized.treatment.supportingMedications = [];
  }

  // Ensure rationale exists
  if (!sanitized.rationale) {
    sanitized.rationale = {
      summary: "AI-generated treatment recommendation",
      clinicalReasoning: "Based on patient profile and medical guidelines",
      evidenceBasis: "Standard clinical protocols",
      patientSpecificFactors: [],
    };
  }

  // Ensure safety assessment exists
  if (!sanitized.safetyAssessment) {
    sanitized.safetyAssessment = {
      overallRiskLevel: "medium",
      riskScore: 50,
      riskFactors: [],
    };
  }

  // Fix risk score if out of bounds
  if (
    sanitized.safetyAssessment.riskScore < 0 ||
    sanitized.safetyAssessment.riskScore > 100
  ) {
    sanitized.safetyAssessment.riskScore = Math.max(
      0,
      Math.min(100, sanitized.safetyAssessment.riskScore)
    );
  }

  // Ensure riskFactors array exists
  if (!sanitized.safetyAssessment.riskFactors) {
    sanitized.safetyAssessment.riskFactors = [];
  }

  // Add default confidence scores if missing
  if (
    sanitized.treatment?.primaryMedication &&
    typeof sanitized.treatment.primaryMedication.confidence !== "number"
  ) {
    sanitized.treatment.primaryMedication.confidence = 75;
  }

  if (
    sanitized.rationale &&
    typeof sanitized.rationale.overallConfidence !== "number"
  ) {
    sanitized.rationale.overallConfidence = 75;
  }

  return sanitized;
}

module.exports = {
  treatmentPlanJsonSchema,
  validateTreatmentPlan,
  sanitizeTreatmentPlan,
};
