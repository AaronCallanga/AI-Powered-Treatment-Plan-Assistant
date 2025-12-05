/**
 * DDI RAG Service - Drug-Drug Interaction Retrieval-Augmented Generation
 *
 * This service provides RAG capabilities using the DDI database JSON file
 * to enhance LLM responses with accurate drug interaction, contraindication,
 * and dosage information.
 */

const fs = require("fs");
const path = require("path");

// Load DDI database at startup
let ddiDatabase = null;
let drugIndex = new Map(); // Fast lookup by drug name

/**
 * Initialize the DDI database from JSON file
 */
function initializeDDIDatabase() {
  try {
    const ddiPath = path.join(__dirname, "..", "DDI 2.0.json");
    const rawData = fs.readFileSync(ddiPath, "utf8");
    const parsed = JSON.parse(rawData);
    ddiDatabase = parsed.ddi_database || [];

    // Build drug index for fast lookup
    buildDrugIndex();

    console.log(
      `[DDI RAG] Loaded ${ddiDatabase.length} drug-drug interactions`
    );
    return true;
  } catch (error) {
    console.error("[DDI RAG] Failed to load DDI database:", error.message);
    ddiDatabase = [];
    return false;
  }
}

/**
 * Build an index of drugs for fast lookup
 */
function buildDrugIndex() {
  drugIndex.clear();

  for (const interaction of ddiDatabase) {
    const drugA = normalizeDrugName(interaction.drug_a);
    const drugB = normalizeDrugName(interaction.drug_b);

    // Add to index
    if (!drugIndex.has(drugA)) {
      drugIndex.set(drugA, []);
    }
    drugIndex.get(drugA).push(interaction);

    if (!drugIndex.has(drugB)) {
      drugIndex.set(drugB, []);
    }
    drugIndex.get(drugB).push(interaction);
  }

  console.log(`[DDI RAG] Indexed ${drugIndex.size} unique drug names`);
}

/**
 * Normalize drug name for consistent matching
 */
function normalizeDrugName(name) {
  if (!name) return "";
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "") // Remove special chars
    .replace(/\s+/g, " "); // Normalize spaces
}

/**
 * Find drug interactions between two specific drugs
 */
function findInteractionBetween(drugA, drugB) {
  if (!ddiDatabase || ddiDatabase.length === 0) {
    initializeDDIDatabase();
  }

  const normalizedA = normalizeDrugName(drugA);
  const normalizedB = normalizeDrugName(drugB);

  // Search for exact or partial matches
  for (const interaction of ddiDatabase) {
    const dbDrugA = normalizeDrugName(interaction.drug_a);
    const dbDrugB = normalizeDrugName(interaction.drug_b);

    // Check both orderings
    const matchAB =
      (dbDrugA.includes(normalizedA) || normalizedA.includes(dbDrugA)) &&
      (dbDrugB.includes(normalizedB) || normalizedB.includes(dbDrugB));
    const matchBA =
      (dbDrugA.includes(normalizedB) || normalizedB.includes(dbDrugA)) &&
      (dbDrugB.includes(normalizedA) || normalizedA.includes(dbDrugB));

    if (matchAB || matchBA) {
      return interaction;
    }
  }

  return null;
}

/**
 * Find all interactions for a given drug
 */
function findInteractionsForDrug(drugName) {
  if (!ddiDatabase || ddiDatabase.length === 0) {
    initializeDDIDatabase();
  }

  const normalized = normalizeDrugName(drugName);
  const interactions = [];

  // Check index first for exact matches
  if (drugIndex.has(normalized)) {
    interactions.push(...drugIndex.get(normalized));
  }

  // Also do fuzzy search for partial matches
  for (const interaction of ddiDatabase) {
    const dbDrugA = normalizeDrugName(interaction.drug_a);
    const dbDrugB = normalizeDrugName(interaction.drug_b);

    if (
      (dbDrugA.includes(normalized) ||
        normalized.includes(dbDrugA) ||
        dbDrugB.includes(normalized) ||
        normalized.includes(dbDrugB)) &&
      !interactions.includes(interaction)
    ) {
      interactions.push(interaction);
    }
  }

  return interactions;
}

/**
 * Check all drug interactions for a list of medications
 * Returns detailed interaction information for the LLM context
 */
function checkAllDrugInteractions(medications) {
  if (!ddiDatabase || ddiDatabase.length === 0) {
    initializeDDIDatabase();
  }

  const foundInteractions = [];
  const drugNames = medications
    .map((m) => m.drugName || m.name || m)
    .filter(Boolean);

  // Check each pair of drugs
  for (let i = 0; i < drugNames.length; i++) {
    for (let j = i + 1; j < drugNames.length; j++) {
      const interaction = findInteractionBetween(drugNames[i], drugNames[j]);
      if (interaction) {
        foundInteractions.push({
          ...interaction,
          patientDrug1: drugNames[i],
          patientDrug2: drugNames[j],
        });
      }
    }
  }

  return foundInteractions;
}

/**
 * Check interactions between current medications and a proposed new drug
 */
function checkNewDrugInteractions(currentMedications, proposedDrug) {
  if (!ddiDatabase || ddiDatabase.length === 0) {
    initializeDDIDatabase();
  }

  const interactions = [];
  const drugNames = currentMedications
    .map((m) => m.drugName || m.name || m)
    .filter(Boolean);

  for (const currentDrug of drugNames) {
    const interaction = findInteractionBetween(currentDrug, proposedDrug);
    if (interaction) {
      interactions.push({
        ...interaction,
        patientCurrentDrug: currentDrug,
        proposedDrug: proposedDrug,
      });
    }
  }

  return interactions;
}

/**
 * Get contraindications based on patient conditions
 * Maps conditions to drugs that should be avoided
 */
const CONDITION_CONTRAINDICATIONS = {
  diabetes: [
    { drug: "Corticosteroids", reason: "Can increase blood glucose levels" },
    { drug: "Thiazide Diuretics", reason: "Can worsen glycemic control" },
    {
      drug: "Beta-blockers (non-selective)",
      reason: "Can mask hypoglycemia symptoms",
    },
  ],
  hypertension: [
    {
      drug: "NSAIDs",
      reason:
        "Can increase blood pressure and reduce antihypertensive efficacy",
    },
    { drug: "Decongestants", reason: "Can increase blood pressure" },
    {
      drug: "Stimulants",
      reason: "Can increase blood pressure and heart rate",
    },
  ],
  heart_disease: [
    { drug: "NSAIDs", reason: "Increased cardiovascular risk" },
    {
      drug: "PDE5 inhibitors with nitrates",
      reason: "Severe hypotension - CONTRAINDICATED",
    },
    { drug: "Stimulants", reason: "Can worsen cardiac conditions" },
  ],
  asthma: [
    { drug: "Beta-blockers", reason: "Can trigger bronchospasm" },
    {
      drug: "Aspirin",
      reason: "Can trigger bronchospasm in aspirin-sensitive asthma",
    },
  ],
  liver_disease: [
    { drug: "Acetaminophen (high dose)", reason: "Hepatotoxicity risk" },
    { drug: "Statins", reason: "Increased risk of hepatotoxicity" },
    { drug: "Methotrexate", reason: "Hepatotoxic" },
  ],
  kidney_disease: [
    { drug: "NSAIDs", reason: "Can worsen renal function" },
    {
      drug: "Metformin",
      reason: "Risk of lactic acidosis with reduced renal function",
    },
    { drug: "Lithium", reason: "Narrow therapeutic window, renally cleared" },
  ],
  depression: [
    { drug: "CNS depressants", reason: "May worsen depression" },
    { drug: "Corticosteroids", reason: "Can cause mood changes" },
  ],
  anxiety: [
    { drug: "Stimulants", reason: "Can worsen anxiety" },
    { drug: "Decongestants", reason: "Can increase anxiety symptoms" },
  ],
  peptic_ulcer: [
    { drug: "NSAIDs", reason: "Can cause or worsen ulcers" },
    { drug: "Aspirin", reason: "GI bleeding risk" },
    { drug: "Corticosteroids", reason: "Can worsen GI bleeding risk" },
  ],
  bleeding_disorder: [
    { drug: "Anticoagulants", reason: "Increased bleeding risk" },
    { drug: "Antiplatelet agents", reason: "Increased bleeding risk" },
    { drug: "NSAIDs", reason: "Increased bleeding risk" },
  ],
};

/**
 * Get allergy-based contraindications
 */
const ALLERGY_CONTRAINDICATIONS = {
  penicillin: [
    {
      drugs: ["Amoxicillin", "Ampicillin", "Penicillin", "Piperacillin"],
      reason: "Penicillin allergy - cross-reactivity",
    },
    {
      drugs: ["Cephalosporins"],
      reason: "Potential cross-reactivity (1-2% risk)",
      severity: "caution",
    },
  ],
  sulfa: [
    {
      drugs: [
        "Sulfamethoxazole",
        "Sulfasalazine",
        "Trimethoprim-Sulfamethoxazole",
      ],
      reason: "Sulfonamide allergy",
    },
    {
      drugs: ["Thiazide diuretics", "Furosemide", "Celecoxib"],
      reason: "Potential cross-reactivity with sulfonamide-containing drugs",
      severity: "caution",
    },
  ],
  aspirin: [
    { drugs: ["Aspirin", "Salicylates"], reason: "Aspirin allergy" },
    {
      drugs: ["NSAIDs"],
      reason:
        "Cross-reactivity possible, especially in aspirin-exacerbated respiratory disease",
      severity: "caution",
    },
  ],
  ibuprofen: [{ drugs: ["Ibuprofen", "NSAIDs"], reason: "NSAID allergy" }],
  codeine: [
    {
      drugs: ["Codeine", "Morphine", "Opioids"],
      reason: "Opioid allergy - potential cross-reactivity",
      severity: "caution",
    },
  ],
  latex: [
    {
      drugs: [],
      reason:
        "No direct drug contraindication, but avoid latex-containing medical supplies",
    },
  ],
  shellfish: [
    {
      drugs: ["Iodinated contrast dye"],
      reason:
        "Historical concern - current evidence suggests no increased risk, but caution advised",
      severity: "caution",
    },
  ],
  eggs: [
    {
      drugs: ["Some vaccines (e.g., influenza)"],
      reason: "Some vaccines are egg-based",
      severity: "caution",
    },
  ],
};

/**
 * Check contraindications based on patient conditions and allergies
 */
function checkContraindicationsFromProfile(
  conditions = [],
  allergies = [],
  proposedDrug
) {
  const contraindications = [];
  const normalizedDrug = normalizeDrugName(proposedDrug);

  // Check condition-based contraindications
  for (const condition of conditions) {
    const normalizedCondition = condition.toLowerCase().replace(/[^a-z]/g, "_");
    const conditionRules = CONDITION_CONTRAINDICATIONS[normalizedCondition];

    if (conditionRules) {
      for (const rule of conditionRules) {
        if (
          normalizeDrugName(rule.drug).includes(normalizedDrug) ||
          normalizedDrug.includes(normalizeDrugName(rule.drug))
        ) {
          contraindications.push({
            type: "condition",
            condition: condition,
            drug: proposedDrug,
            reason: rule.reason,
            severity: "warning",
          });
        }
      }
    }
  }

  // Check allergy-based contraindications
  for (const allergy of allergies) {
    const normalizedAllergy = allergy.toLowerCase().replace(/[^a-z]/g, "");
    const allergyRules = ALLERGY_CONTRAINDICATIONS[normalizedAllergy];

    if (allergyRules) {
      for (const rule of allergyRules) {
        for (const drugPattern of rule.drugs) {
          if (
            normalizeDrugName(drugPattern).includes(normalizedDrug) ||
            normalizedDrug.includes(normalizeDrugName(drugPattern))
          ) {
            contraindications.push({
              type: "allergy",
              allergy: allergy,
              drug: proposedDrug,
              reason: rule.reason,
              severity: rule.severity || "contraindicated",
            });
          }
        }
      }
    }
  }

  return contraindications;
}

/**
 * Dosage appropriateness guidelines
 */
const DOSAGE_GUIDELINES = {
  sildenafil: {
    standard: {
      min: 25,
      max: 100,
      unit: "mg",
      frequency: "as needed (max once daily)",
    },
    elderly: { max: 50, note: "Start with lower dose in patients >65 years" },
    renalImpairment: { max: 25, note: "Reduce dose if CrCl < 30 mL/min" },
    hepaticImpairment: { max: 25, note: "Reduce dose in hepatic impairment" },
    withCYP3A4inhibitors: {
      max: 25,
      note: "Reduce dose when used with strong CYP3A4 inhibitors",
    },
  },
  tadalafil: {
    standard: {
      min: 2.5,
      max: 20,
      unit: "mg",
      frequency: "as needed or 2.5-5mg daily",
    },
    elderly: { note: "No dose adjustment required based on age alone" },
    renalImpairment: {
      max: 5,
      note: "Max 5mg/day if CrCl 30-50 mL/min; avoid if <30",
    },
  },
  finasteride: {
    standard: { min: 1, max: 1, unit: "mg", frequency: "once daily" },
    note: "Fixed dose for hair loss",
  },
  metformin: {
    standard: {
      min: 500,
      max: 2550,
      unit: "mg",
      frequency: "divided doses with meals",
    },
    elderly: { max: 2000, note: "Start low, titrate slowly in elderly" },
    renalImpairment: {
      max: 1000,
      note: "Reduce dose if eGFR 30-45; contraindicated if <30",
    },
  },
  sertraline: {
    standard: { min: 25, max: 200, unit: "mg", frequency: "once daily" },
    elderly: { max: 100, note: "Start with 25mg in elderly" },
    hepaticImpairment: { max: 50, note: "Reduce dose in hepatic impairment" },
  },
  lisinopril: {
    standard: { min: 2.5, max: 40, unit: "mg", frequency: "once daily" },
    elderly: { note: "Start with lower dose in elderly" },
    renalImpairment: { note: "Reduce dose based on renal function" },
  },
  atorvastatin: {
    standard: { min: 10, max: 80, unit: "mg", frequency: "once daily" },
    withCYP3A4inhibitors: {
      max: 20,
      note: "Max 20mg when used with strong CYP3A4 inhibitors",
    },
  },
  warfarin: {
    standard: {
      min: 1,
      max: 10,
      unit: "mg",
      frequency: "once daily",
      note: "Dose individualized based on INR",
    },
    note: "Highly individualized dosing based on INR monitoring",
  },
};

/**
 * Check if a dosage is appropriate for a drug considering patient factors
 */
function checkDosageAppropriateness(drugName, dosage, patientFactors = {}) {
  const normalizedDrug = normalizeDrugName(drugName);
  const guidelines = DOSAGE_GUIDELINES[normalizedDrug];

  if (!guidelines) {
    return {
      hasGuidelines: false,
      message: "No specific dosage guidelines in database for this drug",
    };
  }

  const result = {
    hasGuidelines: true,
    isAppropriate: true,
    warnings: [],
    recommendations: [],
  };

  // Parse dosage number
  const dosageNum = parseFloat(dosage);

  // Check standard range
  if (guidelines.standard) {
    if (dosageNum < guidelines.standard.min) {
      result.warnings.push(
        `Dose ${dosage} is below standard minimum of ${guidelines.standard.min}${guidelines.standard.unit}`
      );
    }
    if (dosageNum > guidelines.standard.max) {
      result.isAppropriate = false;
      result.warnings.push(
        `Dose ${dosage} exceeds standard maximum of ${guidelines.standard.max}${guidelines.standard.unit}`
      );
    }
  }

  // Check age-related adjustments
  if (patientFactors.age && patientFactors.age >= 65 && guidelines.elderly) {
    if (guidelines.elderly.max && dosageNum > guidelines.elderly.max) {
      result.isAppropriate = false;
      result.warnings.push(
        `Dose exceeds recommended maximum of ${guidelines.elderly.max}${
          guidelines.standard?.unit || "mg"
        } for elderly patients`
      );
    }
    if (guidelines.elderly.note) {
      result.recommendations.push(guidelines.elderly.note);
    }
  }

  // Check renal impairment
  if (patientFactors.renalImpairment && guidelines.renalImpairment) {
    if (
      guidelines.renalImpairment.max &&
      dosageNum > guidelines.renalImpairment.max
    ) {
      result.isAppropriate = false;
      result.warnings.push(
        `Dose exceeds recommended maximum for renal impairment`
      );
    }
    if (guidelines.renalImpairment.note) {
      result.recommendations.push(guidelines.renalImpairment.note);
    }
  }

  // Check hepatic impairment
  if (patientFactors.hepaticImpairment && guidelines.hepaticImpairment) {
    if (
      guidelines.hepaticImpairment.max &&
      dosageNum > guidelines.hepaticImpairment.max
    ) {
      result.isAppropriate = false;
      result.warnings.push(
        `Dose exceeds recommended maximum for hepatic impairment`
      );
    }
    if (guidelines.hepaticImpairment.note) {
      result.recommendations.push(guidelines.hepaticImpairment.note);
    }
  }

  return result;
}

/**
 * Generate RAG context for the LLM based on patient medications and conditions
 * This is the main function used to augment LLM prompts
 */
function generateRAGContext(patient) {
  if (!ddiDatabase || ddiDatabase.length === 0) {
    initializeDDIDatabase();
  }

  const context = {
    drugInteractions: [],
    contraindications: [],
    dosageGuidelines: [],
    relevantDDIEntries: [],
  };

  const currentMeds = patient.currentMedications || [];
  const conditions = patient.medicalHistory?.conditions || [];
  const allergies = patient.medicalHistory?.allergies || [];

  // 1. Check interactions between current medications
  context.drugInteractions = checkAllDrugInteractions(currentMeds);

  // 2. Get all potentially relevant DDI entries for current medications
  const seenInteractionIds = new Set();
  for (const med of currentMeds) {
    const drugName = med.drugName || med.name || med;
    if (drugName) {
      const interactions = findInteractionsForDrug(drugName);
      for (const interaction of interactions) {
        if (!seenInteractionIds.has(interaction.interaction_id)) {
          seenInteractionIds.add(interaction.interaction_id);
          context.relevantDDIEntries.push(interaction);
        }
      }
    }
  }

  // 3. Check contraindications based on conditions and allergies
  // Check common drugs that might be prescribed
  const commonDrugs = [
    "sildenafil",
    "tadalafil",
    "finasteride",
    "minoxidil",
    "sertraline",
    "escitalopram",
    "ibuprofen",
    "aspirin",
    "metformin",
    "lisinopril",
    "atorvastatin",
  ];

  for (const drug of commonDrugs) {
    const contras = checkContraindicationsFromProfile(
      conditions,
      allergies,
      drug
    );
    context.contraindications.push(...contras);
  }

  // 4. Add dosage guidelines for commonly prescribed medications
  for (const drugName of Object.keys(DOSAGE_GUIDELINES)) {
    context.dosageGuidelines.push({
      drug: drugName,
      guidelines: DOSAGE_GUIDELINES[drugName],
    });
  }

  return context;
}

/**
 * Format RAG context for inclusion in LLM prompt
 */
function formatRAGContextForPrompt(ragContext) {
  let prompt = "\n=== DRUG INTERACTION DATABASE (RAG) CONTEXT ===\n\n";

  // Current medication interactions
  if (ragContext.drugInteractions.length > 0) {
    prompt +=
      "🚨 DETECTED INTERACTIONS BETWEEN PATIENT'S CURRENT MEDICATIONS:\n";
    for (const interaction of ragContext.drugInteractions) {
      prompt += `\n• ${interaction.drug_a} ↔ ${interaction.drug_b}\n`;
      prompt += `  Severity: ${interaction.severity}\n`;
      prompt += `  Mechanism: ${interaction.mechanism}\n`;
      prompt += `  Clinical Effect: ${interaction.clinical_effect}\n`;
      prompt += `  Management: ${interaction.clinical_management}\n`;
      prompt += `  Safer Alternative: ${interaction.safer_alternative}\n`;
    }
    prompt += "\n";
  }

  // Relevant DDI database entries for reference
  if (ragContext.relevantDDIEntries.length > 0) {
    prompt += "📚 RELEVANT DDI DATABASE ENTRIES FOR PATIENT'S MEDICATIONS:\n";
    const sortedEntries = ragContext.relevantDDIEntries
      .sort((a, b) => {
        const severityOrder = { Major: 0, Moderate: 1, Minor: 2 };
        return (
          (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3)
        );
      })
      .slice(0, 15); // Limit to top 15 most relevant

    for (const entry of sortedEntries) {
      prompt += `\n[DDI #${entry.interaction_id}] ${entry.drug_a} + ${entry.drug_b} (${entry.severity})\n`;
      prompt += `  Effect: ${entry.clinical_effect}\n`;
      prompt += `  Alternative: ${entry.safer_alternative}\n`;
      prompt += `  Management: ${entry.clinical_management}\n`;
    }
    prompt += "\n";
  }

  // Contraindications
  if (ragContext.contraindications.length > 0) {
    prompt += "⚠️ CONTRAINDICATIONS BASED ON PATIENT PROFILE:\n";
    const uniqueContras = [];
    const seen = new Set();
    for (const contra of ragContext.contraindications) {
      const key = `${contra.type}-${contra.drug}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueContras.push(contra);
      }
    }

    for (const contra of uniqueContras) {
      if (contra.type === "condition") {
        prompt += `• CONDITION: Patient has ${contra.condition} - ${contra.drug}: ${contra.reason}\n`;
      } else if (contra.type === "allergy") {
        prompt += `• ALLERGY: Patient allergic to ${contra.allergy} - Avoid ${contra.drug}: ${contra.reason}\n`;
      }
    }
    prompt += "\n";
  }

  // Dosage guidelines summary
  prompt += "📋 DOSAGE GUIDELINES REFERENCE:\n";
  for (const guideline of ragContext.dosageGuidelines.slice(0, 8)) {
    const std = guideline.guidelines.standard;
    if (std) {
      prompt += `• ${
        guideline.drug.charAt(0).toUpperCase() + guideline.drug.slice(1)
      }: ${std.min}-${std.max}${std.unit} ${std.frequency || ""}\n`;
    }
  }

  prompt += "\n=== END DDI RAG CONTEXT ===\n";

  return prompt;
}

/**
 * Main function to get RAG-augmented context for treatment generation
 */
function getDDIRagContextForTreatment(patient, proposedDrugs = []) {
  const ragContext = generateRAGContext(patient);

  // Additionally check interactions with any proposed drugs
  if (proposedDrugs.length > 0) {
    const currentMeds = patient.currentMedications || [];
    for (const proposedDrug of proposedDrugs) {
      const interactions = checkNewDrugInteractions(currentMeds, proposedDrug);
      ragContext.drugInteractions.push(...interactions);

      // Also check contraindications for proposed drugs
      const contras = checkContraindicationsFromProfile(
        patient.medicalHistory?.conditions || [],
        patient.medicalHistory?.allergies || [],
        proposedDrug
      );
      ragContext.contraindications.push(...contras);
    }
  }

  return {
    rawContext: ragContext,
    promptContext: formatRAGContextForPrompt(ragContext),
  };
}

// Initialize on module load
initializeDDIDatabase();

module.exports = {
  initializeDDIDatabase,
  findInteractionBetween,
  findInteractionsForDrug,
  checkAllDrugInteractions,
  checkNewDrugInteractions,
  checkContraindicationsFromProfile,
  checkDosageAppropriateness,
  generateRAGContext,
  formatRAGContextForPrompt,
  getDDIRagContextForTreatment,
  DOSAGE_GUIDELINES,
  CONDITION_CONTRAINDICATIONS,
  ALLERGY_CONTRAINDICATIONS,
};
