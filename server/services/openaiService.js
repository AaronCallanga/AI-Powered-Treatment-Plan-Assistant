const OpenAI = require("openai");
const {
  checkDrugInteractions,
  checkContraindications,
  getTreatmentProtocol,
} = require("./medicalKnowledgeBase");
const {
  validateTreatmentPlan,
  sanitizeTreatmentPlan,
} = require("../schemas/treatmentPlanSchema");
const {
  checkDrugInteractionsDB,
  checkConditionContraindicationsDB,
  crossCheckInteractions,
} = require("./drugInteractionDB");
const {
  getDDIRagContextForTreatment,
  checkDosageAppropriateness,
} = require("./ddiRagService");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 5000, // 5 seconds base delay
  maxDelayMs: 30000, // 30 seconds max delay
  backoffMultiplier: 2,
};

// Helper function for delay
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Retry wrapper with exponential backoff
async function withRetry(operation, operationName = "API call") {
  let lastError = null;
  let lastNonConformingOutput = null;

  for (let attempt = 1; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      const result = await operation();
      return result;
    } catch (error) {
      lastError = error;

      // Store non-conforming output for logging
      if (error.nonConformingOutput) {
        lastNonConformingOutput = error.nonConformingOutput;
      }

      // Check if this is a schema validation error
      const isSchemaError =
        error.message?.includes("schema") ||
        error.message?.includes("validation") ||
        error.isSchemaValidationError;

      // Check if this is a retryable API error
      const isRetryableApiError =
        error.status === 429 || // Rate limit
        error.status === 500 || // Server error
        error.status === 502 || // Bad gateway
        error.status === 503 || // Service unavailable
        error.status === 504 || // Gateway timeout
        error.code === "ECONNRESET" ||
        error.code === "ETIMEDOUT" ||
        error.code === "ECONNREFUSED";

      const shouldRetry = isSchemaError || isRetryableApiError;

      if (shouldRetry && attempt < RETRY_CONFIG.maxRetries) {
        const delayMs = Math.min(
          RETRY_CONFIG.baseDelayMs *
            Math.pow(RETRY_CONFIG.backoffMultiplier, attempt - 1),
          RETRY_CONFIG.maxDelayMs
        );

        console.log(
          `[AI Retry] ${operationName} attempt ${attempt} failed: ${error.message}`
        );
        console.log(
          `[AI Retry] Retrying in ${delayMs / 1000} seconds... (${
            RETRY_CONFIG.maxRetries - attempt
          } attempts remaining)`
        );

        if (lastNonConformingOutput) {
          console.log(`[AI Retry] Non-conforming output logged for debugging`);
        }

        await delay(delayMs);
      } else if (!shouldRetry) {
        // Non-retryable error, throw immediately
        throw error;
      }
    }
  }

  // All retries exhausted
  console.error(
    `[AI Retry] All ${RETRY_CONFIG.maxRetries} attempts failed for ${operationName}`
  );

  if (lastNonConformingOutput) {
    console.error(
      `[AI Retry] Last non-conforming output:`,
      JSON.stringify(lastNonConformingOutput, null, 2)
    );
  }

  // Create a detailed error message for the user
  const userFriendlyError = new Error(
    lastError?.isSchemaValidationError
      ? "AI Analysis failed to conform to the required safety structure after multiple attempts. Please try again or manually enter the treatment plan."
      : `AI service temporarily unavailable after ${RETRY_CONFIG.maxRetries} attempts. Please try again in a few minutes.`
  );
  userFriendlyError.originalError = lastError;
  userFriendlyError.retryExhausted = true;

  throw userFriendlyError;
}

const MEDICAL_SYSTEM_PROMPT = `You are an AI clinical decision support assistant designed to help physicians make informed treatment decisions. You analyze patient data and generate treatment recommendations following evidence-based medical guidelines.

IMPORTANT: You will be provided with a DDI (Drug-Drug Interaction) RAG CONTEXT from our curated database containing evidence-based drug interaction data from DrugBank 6.0 and clinical references. YOU MUST USE THIS DATABASE as your primary source for:
1. Drug-drug interaction checking
2. Contraindication verification
3. Dosage appropriateness validation
4. Safer alternative recommendations

CRITICAL SAFETY RULES:
1. ALWAYS check for drug-drug interactions using the DDI RAG CONTEXT before recommending any medication
2. ALWAYS verify no contraindications exist based on patient allergies and conditions
3. ALWAYS consider patient age, weight, kidney function, liver function when dosing
4. Flag ANY potential safety concerns prominently with severity from DDI database
5. Nitrates (nitroglycerin, isosorbide) are ABSOLUTELY CONTRAINDICATED with PDE5 inhibitors (sildenafil, tadalafil, vardenafil)
6. Consider cardiac risk for all patients with cardiovascular history
7. When DDI database shows a Major or Contraindicated interaction, ALWAYS use the safer_alternative from the database

DRUG INTERACTION SEVERITY LEVELS (from DDI Database):
- Major: Avoid combination. High risk of serious adverse effects. Use safer alternative.
- Moderate: Use with caution. Monitor closely. Consider dose adjustment.
- Minor: Usually not clinically significant. Monitor as needed.
- Contraindicated: ABSOLUTELY DO NOT USE together. Life-threatening risk.

DDI DATABASE FIELD USAGE:
- severity: Determines risk level (Major/Moderate/Minor)
- mechanism: Explains why the interaction occurs (use in rationale)
- clinical_effect: Describes what happens to the patient (include in warnings)
- safer_alternative: PREFER this drug instead when interaction is Major
- clinical_management: Include this guidance in monitoring recommendations

TREATMENT GUIDELINES BY CONDITION:

ERECTILE DYSFUNCTION:
- First-line: PDE5 inhibitors (sildenafil 50mg, tadalafil 10mg)
- Contraindicated with nitrates, alpha-blockers (hypotension risk)
- Use lower doses with CYP3A4 inhibitors
- Caution in cardiovascular disease - ensure stable before prescribing
- Cardiac patients taking nitrates should NEVER receive PDE5 inhibitors

HAIR LOSS (Androgenetic Alopecia):
- First-line: Finasteride 1mg daily (men only) + Minoxidil 5% topical
- Finasteride contraindicated in women of childbearing potential
- Monitor for sexual side effects, depression
- Results take 3-6 months to appear

WEIGHT LOSS:
- First-line: GLP-1 agonists (semaglutide, tirzepatide)
- Start low, titrate slowly to minimize GI side effects
- Phentermine: short-term only, avoid in cardiovascular disease
- Always combine with lifestyle modifications

ANXIETY:
- First-line: SSRIs (sertraline, escitalopram)
- Start low, increase gradually
- Monitor for activation, suicidal ideation (especially young adults)
- Combine with therapy (CBT) for best outcomes

INSOMNIA:
- First-line: CBT-I (non-pharmacological)
- If medication needed: start with melatonin or trazodone
- Z-drugs (zolpidem) only short-term
- Avoid in patients with substance abuse history

RISK ASSESSMENT:
Assign risk levels based on:
- LOW: No significant interactions, standard patient profile
- MEDIUM: Minor interactions, some risk factors present, needs monitoring
- HIGH: Major interactions, multiple comorbidities, careful consideration needed
- CRITICAL: Contraindications present, DO NOT proceed without addressing

OUTPUT FORMAT:
You must respond with valid JSON matching this exact schema:
{
  "treatment": {
    "primaryMedication": {
      "name": "string",
      "dosage": "string",
      "frequency": "string",
      "duration": "string",
      "instructions": "string"
    },
    "supportingMedications": [...],
    "lifestyleRecommendations": [...],
    "monitoringRequired": [...]
  },
  "safetyAssessment": {
    "overallRiskLevel": "low|medium|high|critical",
    "riskScore": 0-100,
    "riskFactors": [{"factor": "string", "severity": "low|medium|high|critical", "description": "string"}]
  },
  "drugInteractions": [{
    "drug1": "string",
    "drug2": "string",
    "severity": "minor|moderate|major|contraindicated",
    "description": "string",
    "recommendation": "string",
    "confidence": 0-100
  }],
  "contraindications": [{
    "type": "allergy|condition|age|medication|lifestyle",
    "item": "string",
    "severity": "warning|caution|contraindicated",
    "description": "string",
    "recommendation": "string"
  }],
  "alternatives": [{
    "medication": "string",
    "dosage": "string",
    "reason": "string",
    "suitabilityScore": 0-100,
    "confidence": 0-100
  }],
  "rationale": {
    "summary": "string",
    "clinicalReasoning": "string",
    "evidenceBasis": "string",
    "patientSpecificFactors": [...],
    "overallConfidence": 0-100
  }
}

CONFIDENCE SCORING GUIDELINES:
- 90-100: High confidence - well-established treatment with strong evidence
- 70-89: Moderate confidence - standard treatment, some patient-specific considerations
- 50-69: Low confidence - off-label use, limited evidence, or complex patient profile
- Below 50: Very low confidence - flag for physician review, consider alternatives

CRITICAL REQUIREMENTS:
1. ALWAYS provide a valid medication name - NEVER use "None", "N/A", or empty values
2. ALWAYS include specific dosage amounts (e.g., "50mg", "10mg daily")
3. ALWAYS specify frequency (e.g., "once daily", "twice daily", "as needed")
4. ALWAYS specify duration (e.g., "30 days", "3 months", "ongoing")
5. ALWAYS provide at least 2 alternative treatment options with suitability scores
6. ALL string fields must have meaningful content - no nulls or empty strings
7. Risk factors severity must be one of: "low", "medium", "high", "critical"
8. If no treatment is appropriate due to contraindications, recommend the SAFEST alternative and explain why

EXAMPLE VALID RESPONSE STRUCTURE:
{
  "treatment": {
    "primaryMedication": {
      "name": "Ibuprofen",
      "dosage": "400mg",
      "frequency": "every 6 hours as needed",
      "duration": "7 days",
      "instructions": "Take with food to reduce stomach upset",
      "confidence": 85
    }
  }
}`;

async function generateTreatmentPlan(patient) {
  // Pre-check with knowledge base
  const protocol = getTreatmentProtocol(patient.primaryComplaint?.condition);

  // Build patient context
  const patientContext = buildPatientContext(patient);

  // Get DDI RAG context from the comprehensive drug database
  const ddiRagContext = getDDIRagContextForTreatment(
    patient,
    protocol?.firstLine?.map((m) => m.name) || []
  );
  console.log(
    "[DDI RAG] Generated context with",
    ddiRagContext.rawContext.drugInteractions.length,
    "interactions,",
    ddiRagContext.rawContext.contraindications.length,
    "contraindications,",
    ddiRagContext.rawContext.relevantDDIEntries.length,
    "relevant DDI entries"
  );

  // Get knowledge base checks for first-line medications
  let knowledgeBaseChecks = { interactions: [], contraindications: [] };
  if (protocol?.firstLine) {
    for (const med of protocol.firstLine) {
      const interactions = checkDrugInteractions(
        patient.currentMedications || [],
        med.name
      );
      const contraindications = checkContraindications(
        patient.medicalHistory?.conditions || [],
        patient.medicalHistory?.allergies || [],
        med.name
      );
      knowledgeBaseChecks.interactions.push(...interactions);
      knowledgeBaseChecks.contraindications.push(...contraindications);
    }
  }

  const userPrompt = `
PATIENT PROFILE:
${patientContext}

PRIMARY COMPLAINT: ${patient.primaryComplaint?.condition?.replace(/_/g, " ")}
- Description: ${patient.primaryComplaint?.description || "Not provided"}
- Duration: ${patient.primaryComplaint?.duration || "Not specified"}
- Severity: ${patient.primaryComplaint?.severity || "Not specified"}

TREATMENT PROTOCOL AVAILABLE:
${protocol ? JSON.stringify(protocol, null, 2) : "Standard guidelines apply"}

${ddiRagContext.promptContext}

KNOWLEDGE BASE PRE-CHECKS:
Drug Interactions Found: ${JSON.stringify(
    knowledgeBaseChecks.interactions,
    null,
    2
  )}
Contraindications Found: ${JSON.stringify(
    knowledgeBaseChecks.contraindications,
    null,
    2
  )}

IMPORTANT: Use the DDI RAG CONTEXT above as your primary reference for drug-drug interactions, contraindications, and dosage guidelines. This database contains evidence-based information from DrugBank 6.0 and clinical references.

Based on this patient profile, the DDI database context, and the pre-checks from our medical knowledge base, generate a comprehensive treatment plan. Pay special attention to:
1. Any interactions flagged in the DDI database - use the exact severity levels and clinical management recommendations
2. Contraindications based on patient conditions and allergies
3. Dosage appropriateness based on patient age and health factors
4. Safer alternatives suggested in the DDI database

If CRITICAL issues are found, recommend alternative treatments as suggested in the DDI database.

Respond with valid JSON only.`;

  // Use retry wrapper for the AI call
  return await withRetry(async () => {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: MEDICAL_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3, // Lower temperature for more consistent medical advice
      response_format: { type: "json_object" },
    });

    let aiResponse;
    try {
      aiResponse = JSON.parse(response.choices[0].message.content);
    } catch (parseError) {
      const error = new Error("AI returned invalid JSON format");
      error.isSchemaValidationError = true;
      error.nonConformingOutput = response.choices[0].message.content;
      throw error;
    }

    // Step 1: Validate against JSON schema
    const validationResult = validateTreatmentPlan(aiResponse);

    // If validation has critical errors, throw for retry
    if (!validationResult.isValid && validationResult.errors.length > 0) {
      const criticalErrors = validationResult.errors.filter(
        (e) => e.severity === "error" || !e.severity
      );

      if (criticalErrors.length > 0) {
        const error = new Error(
          `Schema validation failed: ${criticalErrors
            .map((e) => e.message)
            .join(", ")}`
        );
        error.isSchemaValidationError = true;
        error.nonConformingOutput = aiResponse;
        throw error;
      }
    }

    // Step 2: Sanitize and fix common issues
    const sanitizedPlan = sanitizeTreatmentPlan(aiResponse);

    // Step 3: Merge knowledge base checks with AI response
    const mergedPlan = mergeWithKnowledgeBase(
      sanitizedPlan,
      knowledgeBaseChecks
    );

    // Step 4: Cross-check with drug interaction database
    let databaseCrossCheck = {
      performed: false,
      interactionsVerified: 0,
      interactionsUnverified: 0,
      databaseOnlyFindings: 0,
    };

    try {
      const crossCheckResult = await crossCheckInteractions(
        mergedPlan.drugInteractions || [],
        patient.currentMedications || [],
        mergedPlan.treatment?.primaryMedication?.name || ""
      );

      databaseCrossCheck = {
        performed: true,
        interactionsVerified: crossCheckResult.summary.verifiedCount,
        interactionsUnverified: crossCheckResult.summary.aiOnlyCount,
        databaseOnlyFindings: crossCheckResult.summary.databaseOnlyCount,
      };

      // Update interactions with verified data
      mergedPlan.drugInteractions = crossCheckResult.all;

      // Upgrade risk if database found critical issues AI missed
      if (
        crossCheckResult.summary.hasCritical &&
        mergedPlan.safetyAssessment.overallRiskLevel !== "critical"
      ) {
        mergedPlan.safetyAssessment.overallRiskLevel = "critical";
        mergedPlan.safetyAssessment.riskScore = Math.max(
          mergedPlan.safetyAssessment.riskScore || 0,
          95
        );
      }
    } catch (dbError) {
      console.error("Database cross-check error:", dbError.message);
      // Continue without database verification
    }

    return {
      ...mergedPlan,
      validation: {
        schemaValid: validationResult.isValid,
        errors: validationResult.errors.map((e) => e.message),
        warnings: validationResult.warnings.map((w) => w.message),
        databaseCrossCheck,
      },
      aiModel: "gpt-4o",
      promptVersion: "2.0",
      workflowStep: "analysis",
    };
  }, "Treatment Plan Generation");
}

function buildPatientContext(patient) {
  const age = patient.healthMetrics?.age || "Unknown";
  const weight = patient.healthMetrics?.weight || "Unknown";
  const height = patient.healthMetrics?.height || "Unknown";
  const bmi = patient.healthMetrics?.bmi || "Unknown";
  const bp = patient.healthMetrics?.bloodPressure;
  const bpStr = bp ? `${bp.systolic}/${bp.diastolic}` : "Unknown";

  const conditions =
    patient.medicalHistory?.conditions?.join(", ") || "None reported";
  const allergies =
    patient.medicalHistory?.allergies?.join(", ") || "None reported";
  const familyHistory =
    patient.medicalHistory?.familyHistory?.join(", ") || "None reported";
  const surgeries =
    patient.medicalHistory?.surgeries?.join(", ") || "None reported";

  const medications =
    patient.currentMedications
      ?.map((m) => `${m.drugName} ${m.dosage} ${m.frequency}`)
      .join("; ") || "None";

  const lifestyle = patient.lifestyle || {};

  return `
Demographics:
- Age: ${age} years
- Gender: ${patient.gender || "Not specified"}
- Weight: ${weight} kg
- Height: ${height} cm
- BMI: ${bmi}

Vital Signs:
- Blood Pressure: ${bpStr} mmHg
- Heart Rate: ${patient.healthMetrics?.heartRate || "Unknown"} bpm
- Blood Glucose: ${patient.healthMetrics?.bloodGlucose || "Unknown"} mg/dL

Medical History:
- Conditions: ${conditions}
- Allergies: ${allergies}
- Family History: ${familyHistory}
- Surgeries: ${surgeries}

Current Medications:
${medications}

Lifestyle Factors:
- Smoking: ${lifestyle.smokingStatus || "Unknown"}
- Alcohol: ${lifestyle.alcoholConsumption || "Unknown"}
- Exercise: ${lifestyle.exerciseFrequency || "Unknown"}
- Diet: ${lifestyle.dietType || "Unknown"}`;
}

function mergeWithKnowledgeBase(aiResponse, knowledgeBaseChecks) {
  // Merge interactions from knowledge base that AI might have missed
  const aiInteractions = aiResponse.drugInteractions || [];
  const kbInteractions = knowledgeBaseChecks.interactions || [];

  const allInteractions = [...aiInteractions];
  for (const kbInt of kbInteractions) {
    const exists = allInteractions.some(
      (ai) =>
        ai.drug1?.toLowerCase() === kbInt.drug1?.toLowerCase() &&
        ai.drug2?.toLowerCase() === kbInt.drug2?.toLowerCase()
    );
    if (!exists) {
      allInteractions.push({
        drug1: kbInt.drug1,
        drug2: kbInt.drug2,
        severity: kbInt.severity,
        description: kbInt.description,
        recommendation: `Knowledge base flagged: ${kbInt.description}`,
      });
    }
  }

  // Merge contraindications
  const aiContra = aiResponse.contraindications || [];
  const kbContra = knowledgeBaseChecks.contraindications || [];

  const allContraindications = [...aiContra];
  for (const kbC of kbContra) {
    const exists = allContraindications.some(
      (ai) =>
        ai.item?.toLowerCase() === kbC.item?.toLowerCase() &&
        ai.type === kbC.type
    );
    if (!exists) {
      allContraindications.push({
        type: kbC.type,
        item: kbC.item,
        severity: kbC.severity,
        description: kbC.description,
        recommendation: `Flagged by knowledge base: ${kbC.description}`,
      });
    }
  }

  // Recalculate risk if critical issues found
  let overallRiskLevel = aiResponse.safetyAssessment?.overallRiskLevel || "low";
  let riskScore = aiResponse.safetyAssessment?.riskScore || 20;

  const hasCritical =
    allInteractions.some((i) => i.severity === "contraindicated") ||
    allContraindications.some((c) => c.severity === "contraindicated");
  const hasMajor = allInteractions.some((i) => i.severity === "major");

  if (hasCritical) {
    overallRiskLevel = "critical";
    riskScore = Math.max(riskScore, 90);
  } else if (hasMajor) {
    overallRiskLevel = overallRiskLevel === "low" ? "high" : overallRiskLevel;
    riskScore = Math.max(riskScore, 70);
  }

  return {
    ...aiResponse,
    drugInteractions: allInteractions,
    contraindications: allContraindications,
    safetyAssessment: {
      ...aiResponse.safetyAssessment,
      overallRiskLevel,
      riskScore,
    },
  };
}

module.exports = {
  generateTreatmentPlan,
};
