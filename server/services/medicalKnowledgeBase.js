// Medical knowledge base for drug interactions and contraindications
// This supplements LLM analysis with structured medical data

const DRUG_INTERACTIONS = {
  // Nitrates + PDE5 Inhibitors (Severe)
  nitroglycerin: {
    sildenafil: {
      severity: "contraindicated",
      description: "Severe hypotension risk - can be fatal",
    },
    tadalafil: {
      severity: "contraindicated",
      description: "Severe hypotension risk - can be fatal",
    },
    vardenafil: {
      severity: "contraindicated",
      description: "Severe hypotension risk - can be fatal",
    },
  },
  isosorbide: {
    sildenafil: {
      severity: "contraindicated",
      description: "Severe hypotension risk",
    },
    tadalafil: {
      severity: "contraindicated",
      description: "Severe hypotension risk",
    },
  },

  // Blood thinners
  warfarin: {
    aspirin: { severity: "major", description: "Increased bleeding risk" },
    ibuprofen: {
      severity: "major",
      description: "Increased bleeding risk and reduced warfarin metabolism",
    },
    naproxen: { severity: "major", description: "Increased bleeding risk" },
  },
  clopidogrel: {
    aspirin: {
      severity: "moderate",
      description:
        "Increased bleeding risk, but sometimes used together under supervision",
    },
    omeprazole: {
      severity: "major",
      description: "Reduces clopidogrel effectiveness",
    },
    esomeprazole: {
      severity: "major",
      description: "Reduces clopidogrel effectiveness",
    },
  },

  // SSRIs
  sertraline: {
    tramadol: { severity: "major", description: "Risk of serotonin syndrome" },
    sumatriptan: {
      severity: "major",
      description: "Risk of serotonin syndrome",
    },
    maois: {
      severity: "contraindicated",
      description: "Severe serotonin syndrome risk",
    },
  },
  escitalopram: {
    tramadol: { severity: "major", description: "Risk of serotonin syndrome" },
    ondansetron: { severity: "moderate", description: "QT prolongation risk" },
  },

  // Beta blockers
  metoprolol: {
    verapamil: {
      severity: "major",
      description: "Risk of severe bradycardia and heart block",
    },
    diltiazem: { severity: "major", description: "Risk of severe bradycardia" },
    clonidine: {
      severity: "moderate",
      description: "Rebound hypertension if clonidine stopped",
    },
  },

  // Statins
  atorvastatin: {
    gemfibrozil: {
      severity: "major",
      description: "Increased risk of rhabdomyolysis",
    },
    clarithromycin: {
      severity: "major",
      description: "Increased statin levels, myopathy risk",
    },
    grapefruit: {
      severity: "moderate",
      description: "Increased statin levels",
    },
  },
  simvastatin: {
    amiodarone: {
      severity: "major",
      description: "Increased risk of myopathy",
    },
    amlodipine: {
      severity: "moderate",
      description: "Limit simvastatin to 20mg",
    },
  },

  // Metformin
  metformin: {
    contrast_dye: {
      severity: "major",
      description: "Risk of lactic acidosis - hold before/after contrast",
    },
    alcohol: {
      severity: "moderate",
      description: "Increased risk of lactic acidosis",
    },
  },

  // ACE Inhibitors
  lisinopril: {
    potassium: { severity: "moderate", description: "Risk of hyperkalemia" },
    spironolactone: {
      severity: "moderate",
      description: "Risk of hyperkalemia",
    },
    nsaids: {
      severity: "moderate",
      description: "Reduced antihypertensive effect, kidney risk",
    },
  },

  // Finasteride (hair loss)
  finasteride: {
    saw_palmetto: {
      severity: "moderate",
      description: "Additive anti-androgenic effects",
    },
  },

  // Sleep medications
  zolpidem: {
    alcohol: { severity: "major", description: "Enhanced CNS depression" },
    opioids: {
      severity: "major",
      description: "Risk of respiratory depression",
    },
    benzodiazepines: {
      severity: "major",
      description: "Enhanced CNS depression",
    },
  },

  // Weight loss medications
  phentermine: {
    maois: { severity: "contraindicated", description: "Hypertensive crisis" },
    ssris: { severity: "major", description: "Serotonin syndrome risk" },
  },
  semaglutide: {
    insulin: {
      severity: "moderate",
      description: "Increased hypoglycemia risk - may need dose reduction",
    },
    sulfonylureas: {
      severity: "moderate",
      description: "Increased hypoglycemia risk",
    },
  },
};

const CONDITION_CONTRAINDICATIONS = {
  // Cardiovascular conditions
  coronary_artery_disease: {
    sildenafil: {
      severity: "caution",
      description: "Use with caution, avoid with nitrates",
    },
    tadalafil: {
      severity: "caution",
      description: "Use with caution, avoid with nitrates",
    },
    phentermine: {
      severity: "contraindicated",
      description: "Cardiovascular stimulant effects",
    },
    pseudoephedrine: {
      severity: "caution",
      description: "May increase blood pressure",
    },
  },
  heart_failure: {
    nsaids: {
      severity: "caution",
      description: "Fluid retention, may worsen heart failure",
    },
    thiazolidinediones: {
      severity: "contraindicated",
      description: "Fluid retention",
    },
    sildenafil: { severity: "caution", description: "Hemodynamic effects" },
  },
  hypertension: {
    pseudoephedrine: {
      severity: "caution",
      description: "May raise blood pressure",
    },
    nsaids: { severity: "caution", description: "May raise blood pressure" },
    phentermine: {
      severity: "contraindicated",
      description: "Stimulant effects on blood pressure",
    },
  },
  arrhythmia: {
    ondansetron: { severity: "caution", description: "QT prolongation" },
    azithromycin: { severity: "caution", description: "QT prolongation" },
    fluconazole: { severity: "caution", description: "QT prolongation" },
  },

  // Kidney disease
  chronic_kidney_disease: {
    nsaids: { severity: "contraindicated", description: "Nephrotoxic" },
    metformin: {
      severity: "caution",
      description: "Lactic acidosis risk if eGFR < 30",
    },
    lithium: { severity: "caution", description: "Reduced clearance" },
  },

  // Liver disease
  liver_disease: {
    acetaminophen: {
      severity: "caution",
      description: "Hepatotoxic at high doses",
    },
    statins: { severity: "caution", description: "Monitor liver function" },
    methotrexate: { severity: "contraindicated", description: "Hepatotoxic" },
  },

  // Diabetes
  diabetes: {
    corticosteroids: {
      severity: "caution",
      description: "Raises blood glucose",
    },
    thiazides: {
      severity: "caution",
      description: "May worsen glucose control",
    },
    beta_blockers: {
      severity: "caution",
      description: "May mask hypoglycemia symptoms",
    },
  },

  // Mental health
  depression: {
    beta_blockers: {
      severity: "caution",
      description: "May worsen depression",
    },
    corticosteroids: { severity: "caution", description: "Mood effects" },
    isotretinoin: {
      severity: "warning",
      description: "Monitor for mood changes",
    },
  },
  anxiety: {
    stimulants: { severity: "caution", description: "May worsen anxiety" },
    decongestants: { severity: "caution", description: "May increase anxiety" },
    caffeine: { severity: "caution", description: "May worsen anxiety" },
  },
  bipolar_disorder: {
    antidepressants: {
      severity: "warning",
      description: "Risk of manic switch without mood stabilizer",
    },
    corticosteroids: {
      severity: "caution",
      description: "May trigger mood episodes",
    },
  },

  // Pregnancy
  pregnancy: {
    warfarin: { severity: "contraindicated", description: "Teratogenic" },
    ace_inhibitors: {
      severity: "contraindicated",
      description: "Fetal toxicity",
    },
    statins: {
      severity: "contraindicated",
      description: "Potential fetal harm",
    },
    finasteride: {
      severity: "contraindicated",
      description: "Teratogenic - do not handle if pregnant",
    },
    isotretinoin: {
      severity: "contraindicated",
      description: "Severe teratogenic effects",
    },
    methotrexate: {
      severity: "contraindicated",
      description: "Abortifacient and teratogenic",
    },
  },

  // PCOS
  pcos: {
    metformin: {
      severity: "beneficial",
      description: "Often used for insulin resistance in PCOS",
    },
  },

  // Gout
  gout: {
    aspirin: {
      severity: "caution",
      description: "May raise uric acid at low doses",
    },
    thiazides: { severity: "caution", description: "May raise uric acid" },
  },
};

const ALLERGY_CONTRAINDICATIONS = {
  penicillin: {
    amoxicillin: {
      severity: "contraindicated",
      description: "Cross-reactivity likely",
    },
    ampicillin: {
      severity: "contraindicated",
      description: "Cross-reactivity likely",
    },
    cephalosporins: {
      severity: "caution",
      description: "~1-2% cross-reactivity risk",
    },
  },
  sulfa: {
    sulfamethoxazole: {
      severity: "contraindicated",
      description: "Sulfonamide antibiotic",
    },
    sulfasalazine: {
      severity: "contraindicated",
      description: "Contains sulfonamide",
    },
    thiazides: {
      severity: "caution",
      description: "Possible cross-reactivity (rare)",
    },
    furosemide: {
      severity: "caution",
      description: "Sulfonamide structure (low risk)",
    },
  },
  aspirin: {
    aspirin: { severity: "contraindicated", description: "Known allergy" },
    nsaids: { severity: "caution", description: "Cross-reactivity possible" },
    ibuprofen: {
      severity: "caution",
      description: "Cross-reactivity possible",
    },
  },
  ibuprofen: {
    ibuprofen: { severity: "contraindicated", description: "Known allergy" },
    nsaids: {
      severity: "caution",
      description: "Cross-reactivity with other NSAIDs",
    },
    aspirin: { severity: "caution", description: "Possible cross-reactivity" },
  },
  ace_inhibitors: {
    lisinopril: {
      severity: "contraindicated",
      description: "ACE inhibitor class allergy",
    },
    enalapril: {
      severity: "contraindicated",
      description: "ACE inhibitor class allergy",
    },
    ramipril: {
      severity: "contraindicated",
      description: "ACE inhibitor class allergy",
    },
  },
  shellfish: {
    iodine_contrast: {
      severity: "caution",
      description: "Previously thought related, now known to be separate",
    },
    glucosamine: {
      severity: "caution",
      description: "Often shellfish-derived",
    },
  },
  latex: {
    some_fruits: {
      severity: "info",
      description: "Latex-fruit syndrome: bananas, avocados, kiwi, chestnuts",
    },
  },
};

// Treatment protocols by condition
const TREATMENT_PROTOCOLS = {
  erectile_dysfunction: {
    firstLine: [
      {
        name: "Sildenafil",
        dosage: "50mg",
        frequency: "as needed",
        maxDose: "100mg",
      },
      {
        name: "Tadalafil",
        dosage: "10mg",
        frequency: "as needed",
        maxDose: "20mg",
      },
    ],
    alternatives: [
      { name: "Vardenafil", dosage: "10mg", frequency: "as needed" },
      { name: "Avanafil", dosage: "100mg", frequency: "as needed" },
    ],
    contraindicated_with: ["nitrates", "alpha_blockers_unstable"],
    lifestyle: [
      "Regular exercise improves erectile function",
      "Smoking cessation is strongly recommended",
      "Moderate alcohol consumption",
      "Weight management if overweight",
    ],
  },
  hair_loss: {
    firstLine: [
      { name: "Finasteride", dosage: "1mg", frequency: "once daily" },
      { name: "Minoxidil 5%", dosage: "1ml", frequency: "twice daily topical" },
    ],
    alternatives: [
      { name: "Dutasteride", dosage: "0.5mg", frequency: "once daily" },
    ],
    contraindicated_with: ["pregnancy", "liver_disease"],
    lifestyle: [
      "Avoid tight hairstyles",
      "Gentle hair care",
      "Balanced diet with adequate protein",
    ],
  },
  weight_loss: {
    firstLine: [
      {
        name: "Semaglutide",
        dosage: "0.25mg",
        frequency: "once weekly, titrate up",
      },
      {
        name: "Tirzepatide",
        dosage: "2.5mg",
        frequency: "once weekly, titrate up",
      },
    ],
    alternatives: [
      { name: "Phentermine", dosage: "15mg", frequency: "once daily morning" },
      {
        name: "Orlistat",
        dosage: "120mg",
        frequency: "three times daily with meals",
      },
    ],
    contraindicated_with: [
      "pregnancy",
      "eating_disorder",
      "cardiovascular_disease_for_phentermine",
    ],
    lifestyle: [
      "Caloric deficit of 500-750 kcal/day",
      "At least 150 minutes moderate exercise weekly",
      "Behavioral counseling recommended",
      "Regular meal timing",
    ],
  },
  anxiety: {
    firstLine: [
      {
        name: "Sertraline",
        dosage: "25mg",
        frequency: "once daily, titrate to 50-200mg",
      },
      {
        name: "Escitalopram",
        dosage: "5mg",
        frequency: "once daily, titrate to 10-20mg",
      },
    ],
    alternatives: [
      {
        name: "Buspirone",
        dosage: "5mg",
        frequency: "twice daily, titrate up",
      },
      {
        name: "Venlafaxine XR",
        dosage: "37.5mg",
        frequency: "once daily, titrate up",
      },
    ],
    contraindicated_with: ["maois", "qtc_prolongation_for_escitalopram"],
    lifestyle: [
      "Cognitive behavioral therapy recommended",
      "Regular exercise",
      "Limit caffeine and alcohol",
      "Sleep hygiene",
      "Stress management techniques",
    ],
  },
  insomnia: {
    firstLine: [
      {
        name: "Cognitive Behavioral Therapy for Insomnia (CBT-I)",
        dosage: "N/A",
        frequency: "First-line treatment",
      },
      { name: "Melatonin", dosage: "1-3mg", frequency: "30 min before bed" },
    ],
    alternatives: [
      { name: "Zolpidem", dosage: "5mg", frequency: "at bedtime, short-term" },
      { name: "Eszopiclone", dosage: "1mg", frequency: "at bedtime" },
      { name: "Trazodone", dosage: "25-50mg", frequency: "at bedtime" },
    ],
    contraindicated_with: ["sleep_apnea_for_sedatives", "substance_abuse"],
    lifestyle: [
      "Consistent sleep schedule",
      "Dark, cool, quiet bedroom",
      "Avoid screens 1 hour before bed",
      "No caffeine after noon",
      "Regular exercise (not close to bedtime)",
    ],
  },
};

function checkDrugInteractions(medications, proposedDrug) {
  const interactions = [];
  const proposedDrugLower = proposedDrug.toLowerCase();

  for (const med of medications) {
    const medLower = med.drugName.toLowerCase();

    // Check if proposed drug has interactions with current med
    if (DRUG_INTERACTIONS[proposedDrugLower]?.[medLower]) {
      interactions.push({
        drug1: proposedDrug,
        drug2: med.drugName,
        ...DRUG_INTERACTIONS[proposedDrugLower][medLower],
      });
    }

    // Check reverse
    if (DRUG_INTERACTIONS[medLower]?.[proposedDrugLower]) {
      interactions.push({
        drug1: med.drugName,
        drug2: proposedDrug,
        ...DRUG_INTERACTIONS[medLower][proposedDrugLower],
      });
    }
  }

  return interactions;
}

function checkContraindications(conditions, allergies, proposedDrug) {
  const contraindications = [];
  const proposedDrugLower = proposedDrug.toLowerCase();

  // Check conditions
  for (const condition of conditions) {
    const condLower = condition.toLowerCase().replace(/\s+/g, "_");
    if (CONDITION_CONTRAINDICATIONS[condLower]?.[proposedDrugLower]) {
      contraindications.push({
        type: "condition",
        item: condition,
        drug: proposedDrug,
        ...CONDITION_CONTRAINDICATIONS[condLower][proposedDrugLower],
      });
    }
  }

  // Check allergies
  for (const allergy of allergies) {
    const allergyLower = allergy.toLowerCase();
    if (ALLERGY_CONTRAINDICATIONS[allergyLower]?.[proposedDrugLower]) {
      contraindications.push({
        type: "allergy",
        item: allergy,
        drug: proposedDrug,
        ...ALLERGY_CONTRAINDICATIONS[allergyLower][proposedDrugLower],
      });
    }
  }

  return contraindications;
}

function getTreatmentProtocol(condition) {
  const condKey = condition.toLowerCase().replace(/\s+/g, "_");
  return TREATMENT_PROTOCOLS[condKey] || null;
}

module.exports = {
  DRUG_INTERACTIONS,
  CONDITION_CONTRAINDICATIONS,
  ALLERGY_CONTRAINDICATIONS,
  TREATMENT_PROTOCOLS,
  checkDrugInteractions,
  checkContraindications,
  getTreatmentProtocol,
};
