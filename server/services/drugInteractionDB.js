/**
 * Drug Interaction Database Service
 * Uses PostgreSQL for comprehensive drug interaction checking
 * Falls back to in-memory database if PostgreSQL is unavailable
 */

const { Pool } = require("pg");

// PostgreSQL connection pool
let pool = null;
let usePostgres = false;

// Initialize PostgreSQL connection
async function initializeDatabase() {
  if (process.env.DATABASE_URL || process.env.POSTGRES_URL) {
    try {
      pool = new Pool({
        connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
        ssl:
          process.env.NODE_ENV === "production"
            ? { rejectUnauthorized: false }
            : false,
      });

      // Test connection
      await pool.query("SELECT NOW()");
      console.log("Connected to PostgreSQL drug interaction database");

      // Initialize tables if they don't exist
      await createTables();
      usePostgres = true;
    } catch (err) {
      console.log(
        "PostgreSQL not available, using in-memory drug database:",
        err.message
      );
      usePostgres = false;
    }
  } else {
    console.log("No PostgreSQL URL configured, using in-memory drug database");
  }
}

// Create database tables
async function createTables() {
  const createTablesSQL = `
    -- Drug Interactions Table
    CREATE TABLE IF NOT EXISTS drug_interactions (
      id SERIAL PRIMARY KEY,
      drug1 VARCHAR(255) NOT NULL,
      drug1_class VARCHAR(255),
      drug2 VARCHAR(255) NOT NULL,
      drug2_class VARCHAR(255),
      severity VARCHAR(50) NOT NULL CHECK (severity IN ('minor', 'moderate', 'major', 'contraindicated')),
      mechanism TEXT,
      description TEXT NOT NULL,
      clinical_effects TEXT,
      recommendation TEXT NOT NULL,
      evidence_level VARCHAR(50),
      source VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Condition Contraindications Table
    CREATE TABLE IF NOT EXISTS condition_contraindications (
      id SERIAL PRIMARY KEY,
      drug VARCHAR(255) NOT NULL,
      drug_class VARCHAR(255),
      condition VARCHAR(255) NOT NULL,
      severity VARCHAR(50) NOT NULL CHECK (severity IN ('caution', 'warning', 'contraindicated')),
      description TEXT NOT NULL,
      mechanism TEXT,
      recommendation TEXT NOT NULL,
      evidence_level VARCHAR(50),
      source VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Allergy Cross-Reactivity Table
    CREATE TABLE IF NOT EXISTS allergy_crossreactivity (
      id SERIAL PRIMARY KEY,
      allergy VARCHAR(255) NOT NULL,
      drug VARCHAR(255) NOT NULL,
      drug_class VARCHAR(255),
      cross_reactivity_risk VARCHAR(50) CHECK (cross_reactivity_risk IN ('low', 'moderate', 'high', 'definite')),
      severity VARCHAR(50) NOT NULL CHECK (severity IN ('caution', 'warning', 'contraindicated')),
      description TEXT NOT NULL,
      recommendation TEXT NOT NULL,
      source VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Drug Classes Table
    CREATE TABLE IF NOT EXISTS drug_classes (
      id SERIAL PRIMARY KEY,
      drug_name VARCHAR(255) NOT NULL,
      drug_class VARCHAR(255) NOT NULL,
      sub_class VARCHAR(255),
      mechanism VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Create indexes for faster lookups
    CREATE INDEX IF NOT EXISTS idx_drug_interactions_drug1 ON drug_interactions(LOWER(drug1));
    CREATE INDEX IF NOT EXISTS idx_drug_interactions_drug2 ON drug_interactions(LOWER(drug2));
    CREATE INDEX IF NOT EXISTS idx_condition_contraindications_drug ON condition_contraindications(LOWER(drug));
    CREATE INDEX IF NOT EXISTS idx_condition_contraindications_condition ON condition_contraindications(LOWER(condition));
    CREATE INDEX IF NOT EXISTS idx_allergy_crossreactivity_allergy ON allergy_crossreactivity(LOWER(allergy));
  `;

  try {
    await pool.query(createTablesSQL);
    console.log("Drug interaction database tables initialized");

    // Seed with essential data
    await seedEssentialData();
  } catch (err) {
    console.error("Error creating drug database tables:", err.message);
  }
}

// Seed essential drug interaction data
async function seedEssentialData() {
  // Check if data already exists
  const { rows } = await pool.query("SELECT COUNT(*) FROM drug_interactions");
  if (parseInt(rows[0].count) > 0) {
    console.log("Drug interaction data already seeded");
    return;
  }

  console.log("Seeding essential drug interaction data...");

  // Critical drug interactions
  const interactions = [
    // Nitrates + PDE5 Inhibitors (CRITICAL)
    {
      drug1: "nitroglycerin",
      drug1_class: "nitrates",
      drug2: "sildenafil",
      drug2_class: "pde5_inhibitor",
      severity: "contraindicated",
      mechanism: "Synergistic vasodilation causing severe hypotension",
      description:
        "Combination can cause life-threatening hypotension, syncope, and cardiovascular collapse",
      clinical_effects:
        "Severe hypotension, syncope, MI, death reported within 24-48 hours of combined use",
      recommendation:
        "NEVER combine. Wait at least 24 hours after sildenafil or 48 hours after tadalafil before nitrate administration",
      evidence_level: "High",
      source: "FDA Black Box Warning, ACC/AHA Guidelines",
    },
    {
      drug1: "isosorbide",
      drug1_class: "nitrates",
      drug2: "sildenafil",
      drug2_class: "pde5_inhibitor",
      severity: "contraindicated",
      mechanism: "Synergistic vasodilation causing severe hypotension",
      description:
        "Combination can cause life-threatening hypotension and cardiovascular collapse",
      clinical_effects: "Severe hypotension, syncope, potential cardiac events",
      recommendation:
        "NEVER combine. Consider alternative ED treatments that don't involve PDE5 inhibitors",
      evidence_level: "High",
      source: "FDA Black Box Warning",
    },
    {
      drug1: "nitroglycerin",
      drug1_class: "nitrates",
      drug2: "tadalafil",
      drug2_class: "pde5_inhibitor",
      severity: "contraindicated",
      mechanism: "Synergistic vasodilation",
      description: "Combination causes severe hypotension that can be fatal",
      clinical_effects: "Profound hypotension, cardiac ischemia, death",
      recommendation:
        "NEVER combine. Wait at least 48 hours after tadalafil before any nitrate",
      evidence_level: "High",
      source: "FDA Black Box Warning",
    },
    // Blood Thinners
    {
      drug1: "warfarin",
      drug1_class: "anticoagulant",
      drug2: "aspirin",
      drug2_class: "nsaid",
      severity: "major",
      mechanism:
        "Additive anticoagulation and platelet inhibition increases bleeding risk",
      description:
        "Significantly increased risk of major bleeding, including GI and intracranial hemorrhage",
      clinical_effects: "Major bleeding, GI hemorrhage, bruising",
      recommendation:
        "Avoid if possible. If necessary, use lowest aspirin dose and monitor INR closely",
      evidence_level: "High",
      source: "Clinical practice guidelines",
    },
    {
      drug1: "warfarin",
      drug1_class: "anticoagulant",
      drug2: "ibuprofen",
      drug2_class: "nsaid",
      severity: "major",
      mechanism: "NSAIDs inhibit platelet function and can cause GI erosion",
      description: "Increased bleeding risk, particularly GI bleeding",
      clinical_effects: "GI bleeding, bruising, prolonged bleeding",
      recommendation: "Avoid combination. Use acetaminophen for pain instead",
      evidence_level: "High",
      source: "Clinical guidelines",
    },
    // SSRIs and MAOIs
    {
      drug1: "sertraline",
      drug1_class: "ssri",
      drug2: "phenelzine",
      drug2_class: "maoi",
      severity: "contraindicated",
      mechanism: "Excessive serotonin accumulation causing serotonin syndrome",
      description:
        "Life-threatening serotonin syndrome with hyperthermia, rigidity, autonomic instability",
      clinical_effects:
        "Hyperthermia, muscle rigidity, delirium, death if untreated",
      recommendation:
        "NEVER combine. Wait 14 days after stopping MAOI before starting SSRI",
      evidence_level: "High",
      source: "FDA Warning, Clinical Guidelines",
    },
    // SSRIs and Blood Thinners
    {
      drug1: "sertraline",
      drug1_class: "ssri",
      drug2: "warfarin",
      drug2_class: "anticoagulant",
      severity: "moderate",
      mechanism:
        "SSRIs inhibit platelet function and may increase warfarin levels",
      description: "Increased bleeding risk when combined",
      clinical_effects: "Bruising, GI bleeding, prolonged bleeding time",
      recommendation:
        "Monitor INR more frequently, watch for signs of bleeding",
      evidence_level: "Moderate",
      source: "Clinical studies",
    },
    // Metformin and Contrast
    {
      drug1: "metformin",
      drug1_class: "biguanide",
      drug2: "iodinated_contrast",
      drug2_class: "contrast_agent",
      severity: "major",
      mechanism:
        "Contrast-induced nephropathy reduces metformin clearance, causing lactic acidosis",
      description:
        "Risk of lactic acidosis if kidney function is impaired by contrast",
      clinical_effects: "Lactic acidosis, metabolic acidosis, renal impairment",
      recommendation:
        "Hold metformin 48 hours before and after contrast administration. Check renal function before restarting",
      evidence_level: "High",
      source: "ACR Guidelines",
    },
    // ACE Inhibitors and Potassium
    {
      drug1: "lisinopril",
      drug1_class: "ace_inhibitor",
      drug2: "potassium_chloride",
      drug2_class: "potassium_supplement",
      severity: "major",
      mechanism: "ACE inhibitors reduce potassium excretion",
      description: "Risk of life-threatening hyperkalemia",
      clinical_effects: "Hyperkalemia, cardiac arrhythmias, muscle weakness",
      recommendation:
        "Avoid routine potassium supplementation. Monitor potassium levels regularly",
      evidence_level: "High",
      source: "Clinical guidelines",
    },
    // Beta Blockers and Calcium Channel Blockers
    {
      drug1: "metoprolol",
      drug1_class: "beta_blocker",
      drug2: "verapamil",
      drug2_class: "calcium_channel_blocker",
      severity: "major",
      mechanism: "Additive negative chronotropic and inotropic effects",
      description: "Severe bradycardia, heart block, and hypotension possible",
      clinical_effects: "Bradycardia, heart block, hypotension, heart failure",
      recommendation:
        "Use with extreme caution. Monitor heart rate and blood pressure closely",
      evidence_level: "High",
      source: "Clinical guidelines",
    },
    // Digoxin and Amiodarone
    {
      drug1: "digoxin",
      drug1_class: "cardiac_glycoside",
      drug2: "amiodarone",
      drug2_class: "antiarrhythmic",
      severity: "major",
      mechanism: "Amiodarone increases digoxin levels by 70-100%",
      description: "Risk of digoxin toxicity",
      clinical_effects:
        "Nausea, vomiting, visual disturbances, arrhythmias, death",
      recommendation:
        "Reduce digoxin dose by 50% when starting amiodarone. Monitor digoxin levels",
      evidence_level: "High",
      source: "Clinical guidelines",
    },
    // Finasteride and Pregnancy
    {
      drug1: "finasteride",
      drug1_class: "5_alpha_reductase_inhibitor",
      drug2: "pregnancy",
      drug2_class: "pregnancy",
      severity: "contraindicated",
      mechanism:
        "Finasteride inhibits DHT, essential for male fetal development",
      description:
        "Can cause birth defects in male fetuses. Women who are or may become pregnant must not handle crushed tablets",
      clinical_effects: "Hypospadias, ambiguous genitalia in male fetuses",
      recommendation:
        "Contraindicated in women of childbearing potential. Men's partners who are pregnant should not handle crushed tablets",
      evidence_level: "High",
      source: "FDA Label",
    },
  ];

  // Insert interactions
  for (const interaction of interactions) {
    await pool.query(
      `INSERT INTO drug_interactions 
       (drug1, drug1_class, drug2, drug2_class, severity, mechanism, description, clinical_effects, recommendation, evidence_level, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        interaction.drug1,
        interaction.drug1_class,
        interaction.drug2,
        interaction.drug2_class,
        interaction.severity,
        interaction.mechanism,
        interaction.description,
        interaction.clinical_effects,
        interaction.recommendation,
        interaction.evidence_level,
        interaction.source,
      ]
    );
  }

  // Condition contraindications
  const contraindications = [
    {
      drug: "sildenafil",
      drug_class: "pde5_inhibitor",
      condition: "unstable_angina",
      severity: "contraindicated",
      description:
        "PDE5 inhibitors contraindicated in unstable cardiovascular conditions",
      mechanism: "Vasodilation may worsen cardiac ischemia",
      recommendation:
        "Do not use until cardiovascular status is stable. Consider cardiology consult",
      evidence_level: "High",
      source: "ACC/AHA Guidelines",
    },
    {
      drug: "sildenafil",
      drug_class: "pde5_inhibitor",
      condition: "recent_mi",
      severity: "contraindicated",
      description: "Contraindicated within 90 days of myocardial infarction",
      mechanism: "Cardiovascular stress may trigger another event",
      recommendation:
        "Wait at least 90 days post-MI. Cardiology clearance recommended",
      evidence_level: "High",
      source: "FDA Label, ACC Guidelines",
    },
    {
      drug: "metformin",
      drug_class: "biguanide",
      condition: "kidney_disease",
      severity: "warning",
      description: "Risk of lactic acidosis increases with renal impairment",
      mechanism: "Reduced metformin clearance leads to accumulation",
      recommendation:
        "Check eGFR before starting. Contraindicated if eGFR < 30. Reduce dose if eGFR 30-45",
      evidence_level: "High",
      source: "FDA Label",
    },
    {
      drug: "lisinopril",
      drug_class: "ace_inhibitor",
      condition: "pregnancy",
      severity: "contraindicated",
      description: "ACE inhibitors cause fetal toxicity and birth defects",
      mechanism: "Affects fetal kidney development, causes oligohydramnios",
      recommendation:
        "Discontinue immediately if pregnancy detected. Switch to safer alternative",
      evidence_level: "High",
      source: "FDA Black Box Warning",
    },
    {
      drug: "nsaid",
      drug_class: "nsaid",
      condition: "heart_failure",
      severity: "warning",
      description: "NSAIDs can worsen heart failure and cause fluid retention",
      mechanism: "Prostaglandin inhibition causes sodium and water retention",
      recommendation:
        "Avoid if possible. If necessary, use lowest effective dose for shortest duration",
      evidence_level: "High",
      source: "ACC/AHA Heart Failure Guidelines",
    },
  ];

  for (const contra of contraindications) {
    await pool.query(
      `INSERT INTO condition_contraindications 
       (drug, drug_class, condition, severity, description, mechanism, recommendation, evidence_level, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        contra.drug,
        contra.drug_class,
        contra.condition,
        contra.severity,
        contra.description,
        contra.mechanism,
        contra.recommendation,
        contra.evidence_level,
        contra.source,
      ]
    );
  }

  console.log("Essential drug interaction data seeded");
}

// In-memory drug database (fallback when PostgreSQL is unavailable)
const inMemoryInteractions = {
  // Drug class mappings
  drugClasses: {
    nitroglycerin: "nitrates",
    isosorbide: "nitrates",
    isosorbide_mononitrate: "nitrates",
    isosorbide_dinitrate: "nitrates",
    sildenafil: "pde5_inhibitor",
    tadalafil: "pde5_inhibitor",
    vardenafil: "pde5_inhibitor",
    warfarin: "anticoagulant",
    aspirin: "nsaid",
    ibuprofen: "nsaid",
    naproxen: "nsaid",
    sertraline: "ssri",
    fluoxetine: "ssri",
    escitalopram: "ssri",
    phenelzine: "maoi",
    tranylcypromine: "maoi",
    metformin: "biguanide",
    lisinopril: "ace_inhibitor",
    enalapril: "ace_inhibitor",
    metoprolol: "beta_blocker",
    atenolol: "beta_blocker",
    verapamil: "calcium_channel_blocker",
    diltiazem: "calcium_channel_blocker",
    finasteride: "5_alpha_reductase_inhibitor",
  },

  // Class-based interactions
  classInteractions: {
    nitrates_pde5_inhibitor: {
      severity: "contraindicated",
      mechanism: "Synergistic vasodilation causing severe hypotension",
      description:
        "Combination can cause life-threatening hypotension and cardiovascular collapse. Death has been reported.",
      recommendation:
        "ABSOLUTELY CONTRAINDICATED. Never combine. If patient needs nitrates, PDE5 inhibitors are not an option.",
      source: "FDA Black Box Warning",
    },
    ssri_maoi: {
      severity: "contraindicated",
      mechanism: "Excessive serotonin causing serotonin syndrome",
      description:
        "Life-threatening serotonin syndrome with hyperthermia, rigidity, autonomic instability",
      recommendation:
        "Never combine. Wait at least 14 days between medications",
      source: "FDA Warning",
    },
    anticoagulant_nsaid: {
      severity: "major",
      mechanism: "Additive anticoagulation and platelet inhibition",
      description: "Significantly increased risk of bleeding, especially GI",
      recommendation:
        "Avoid if possible. Monitor closely if combination unavoidable",
      source: "Clinical Guidelines",
    },
    beta_blocker_calcium_channel_blocker: {
      severity: "major",
      mechanism: "Additive negative chronotropic effects",
      description: "Risk of severe bradycardia and heart block",
      recommendation: "Use with caution. Monitor heart rate and ECG",
      source: "Clinical Guidelines",
    },
  },

  // Condition contraindications by drug class
  conditionContraindications: {
    pde5_inhibitor: {
      unstable_angina: {
        severity: "contraindicated",
        description: "Contraindicated in unstable cardiovascular conditions",
        recommendation: "Do not use until cardiovascular status is stable",
      },
      recent_mi: {
        severity: "contraindicated",
        description: "Contraindicated within 90 days of MI",
        recommendation: "Wait at least 90 days post-MI",
      },
      hypotension: {
        severity: "warning",
        description: "May worsen hypotension",
        recommendation: "Avoid if BP < 90/50 mmHg",
      },
    },
    nsaid: {
      heart_failure: {
        severity: "warning",
        description: "Can worsen heart failure",
        recommendation: "Use lowest dose for shortest duration if necessary",
      },
      kidney_disease: {
        severity: "warning",
        description: "Can worsen renal function",
        recommendation: "Avoid in CKD stage 4-5",
      },
    },
    ace_inhibitor: {
      pregnancy: {
        severity: "contraindicated",
        description: "Causes fetal toxicity",
        recommendation: "Discontinue immediately if pregnant",
      },
      angioedema_history: {
        severity: "contraindicated",
        description: "High risk of recurrent angioedema",
        recommendation: "Use ARB with caution instead",
      },
    },
  },
};

/**
 * Check drug interactions against database
 * @param {Array} currentMedications - Patient's current medications
 * @param {string} newDrug - New drug being considered
 * @returns {Array} - Array of interactions found
 */
async function checkDrugInteractionsDB(currentMedications, newDrug) {
  const interactions = [];
  const newDrugLower = newDrug.toLowerCase();

  if (usePostgres && pool) {
    try {
      for (const med of currentMedications) {
        const medName = med.drugName?.toLowerCase() || med.toLowerCase();

        // Check both directions
        const result = await pool.query(
          `SELECT * FROM drug_interactions 
           WHERE (LOWER(drug1) = $1 AND LOWER(drug2) = $2)
              OR (LOWER(drug1) = $2 AND LOWER(drug2) = $1)
              OR (LOWER(drug1_class) = $3 AND LOWER(drug2_class) = $4)
              OR (LOWER(drug1_class) = $4 AND LOWER(drug2_class) = $3)`,
          [
            medName,
            newDrugLower,
            getDrugClass(medName),
            getDrugClass(newDrugLower),
          ]
        );

        for (const row of result.rows) {
          interactions.push({
            drug1: med.drugName || med,
            drug2: newDrug,
            severity: row.severity,
            mechanism: row.mechanism,
            description: row.description,
            clinicalEffects: row.clinical_effects,
            recommendation: row.recommendation,
            evidenceLevel: row.evidence_level,
            source: row.source || "Drug Interaction Database",
            confidence: 95, // Database-verified
          });
        }
      }
    } catch (err) {
      console.error("PostgreSQL query error:", err.message);
      // Fall back to in-memory
      return checkDrugInteractionsInMemory(currentMedications, newDrug);
    }
  } else {
    return checkDrugInteractionsInMemory(currentMedications, newDrug);
  }

  return interactions;
}

/**
 * In-memory drug interaction check (fallback)
 */
function checkDrugInteractionsInMemory(currentMedications, newDrug) {
  const interactions = [];
  const newDrugLower = newDrug.toLowerCase();
  const newDrugClass = getDrugClass(newDrugLower);

  for (const med of currentMedications) {
    const medName = (med.drugName || med).toLowerCase();
    const medClass = getDrugClass(medName);

    // Check class-based interactions
    const classKey1 = `${medClass}_${newDrugClass}`;
    const classKey2 = `${newDrugClass}_${medClass}`;

    const interaction =
      inMemoryInteractions.classInteractions[classKey1] ||
      inMemoryInteractions.classInteractions[classKey2];

    if (interaction) {
      interactions.push({
        drug1: med.drugName || med,
        drug2: newDrug,
        severity: interaction.severity,
        mechanism: interaction.mechanism,
        description: interaction.description,
        recommendation: interaction.recommendation,
        source: interaction.source || "Medical Knowledge Base",
        confidence: 90,
      });
    }
  }

  return interactions;
}

/**
 * Check condition contraindications
 */
async function checkConditionContraindicationsDB(conditions, drug) {
  const contraindications = [];
  const drugLower = drug.toLowerCase();
  const drugClass = getDrugClass(drugLower);

  if (usePostgres && pool) {
    try {
      for (const condition of conditions) {
        const conditionLower = condition.toLowerCase().replace(/\s+/g, "_");

        const result = await pool.query(
          `SELECT * FROM condition_contraindications 
           WHERE (LOWER(drug) = $1 OR LOWER(drug_class) = $2)
             AND LOWER(condition) = $3`,
          [drugLower, drugClass, conditionLower]
        );

        for (const row of result.rows) {
          contraindications.push({
            type: "condition",
            item: condition,
            drug: drug,
            severity: row.severity,
            description: row.description,
            mechanism: row.mechanism,
            recommendation: row.recommendation,
            source: row.source || "Drug Interaction Database",
            confidence: 95,
          });
        }
      }
    } catch (err) {
      console.error("PostgreSQL query error:", err.message);
      return checkConditionContraindicationsInMemory(conditions, drug);
    }
  } else {
    return checkConditionContraindicationsInMemory(conditions, drug);
  }

  return contraindications;
}

/**
 * In-memory condition contraindication check
 */
function checkConditionContraindicationsInMemory(conditions, drug) {
  const contraindications = [];
  const drugLower = drug.toLowerCase();
  const drugClass = getDrugClass(drugLower);

  const classContra =
    inMemoryInteractions.conditionContraindications[drugClass];
  if (!classContra) return contraindications;

  for (const condition of conditions) {
    const conditionKey = condition.toLowerCase().replace(/\s+/g, "_");

    if (classContra[conditionKey]) {
      const contra = classContra[conditionKey];
      contraindications.push({
        type: "condition",
        item: condition,
        drug: drug,
        severity: contra.severity,
        description: contra.description,
        recommendation: contra.recommendation,
        source: "Medical Knowledge Base",
        confidence: 85,
      });
    }
  }

  return contraindications;
}

/**
 * Get drug class from drug name
 */
function getDrugClass(drugName) {
  const drugLower = drugName.toLowerCase();

  // Check direct mapping
  if (inMemoryInteractions.drugClasses[drugLower]) {
    return inMemoryInteractions.drugClasses[drugLower];
  }

  // Check if drug name contains class keywords
  if (drugLower.includes("nitro") || drugLower.includes("isosorbide")) {
    return "nitrates";
  }
  if (
    drugLower.includes("sildenafil") ||
    drugLower.includes("tadalafil") ||
    drugLower.includes("vardenafil")
  ) {
    return "pde5_inhibitor";
  }
  if (drugLower.includes("pril")) {
    return "ace_inhibitor";
  }
  if (drugLower.includes("olol")) {
    return "beta_blocker";
  }
  if (drugLower.includes("statin")) {
    return "statin";
  }

  return "unknown";
}

/**
 * Cross-check AI-generated interactions with database
 * @param {Array} aiInteractions - Interactions from AI
 * @param {Array} currentMedications - Patient's medications
 * @param {string} recommendedDrug - AI's recommended drug
 * @returns {Object} - Verified interactions with confidence scores
 */
async function crossCheckInteractions(
  aiInteractions,
  currentMedications,
  recommendedDrug
) {
  const dbInteractions = await checkDrugInteractionsDB(
    currentMedications,
    recommendedDrug
  );

  const verified = [];
  const aiOnly = [];
  const dbOnly = [...dbInteractions];

  for (const aiInt of aiInteractions) {
    const match = dbInteractions.find(
      (dbInt) =>
        (dbInt.drug1.toLowerCase() === aiInt.drug1?.toLowerCase() &&
          dbInt.drug2.toLowerCase() === aiInt.drug2?.toLowerCase()) ||
        (dbInt.drug1.toLowerCase() === aiInt.drug2?.toLowerCase() &&
          dbInt.drug2.toLowerCase() === aiInt.drug1?.toLowerCase())
    );

    if (match) {
      // Verified by both AI and database
      verified.push({
        ...aiInt,
        verifiedByDatabase: true,
        databaseSeverity: match.severity,
        confidence: 98,
        source: match.source,
        // Use more severe of the two if different
        severity:
          getSeverityRank(match.severity) > getSeverityRank(aiInt.severity)
            ? match.severity
            : aiInt.severity,
      });

      // Remove from dbOnly
      const dbIdx = dbOnly.findIndex(
        (d) => d.drug1 === match.drug1 && d.drug2 === match.drug2
      );
      if (dbIdx > -1) dbOnly.splice(dbIdx, 1);
    } else {
      // AI-only, not verified
      aiOnly.push({
        ...aiInt,
        verifiedByDatabase: false,
        confidence: 70,
        source: "AI Analysis (unverified)",
      });
    }
  }

  // Mark database-only findings
  const dbOnlyMarked = dbOnly.map((d) => ({
    ...d,
    verifiedByDatabase: true,
    aiMissed: true,
  }));

  return {
    verified,
    aiOnly,
    databaseOnly: dbOnlyMarked,
    all: [...verified, ...aiOnly, ...dbOnlyMarked],
    summary: {
      totalFound: verified.length + aiOnly.length + dbOnlyMarked.length,
      verifiedCount: verified.length,
      aiOnlyCount: aiOnly.length,
      databaseOnlyCount: dbOnlyMarked.length,
      hasCritical: [...verified, ...aiOnly, ...dbOnlyMarked].some(
        (i) => i.severity === "contraindicated"
      ),
    },
  };
}

function getSeverityRank(severity) {
  const ranks = {
    minor: 1,
    moderate: 2,
    major: 3,
    contraindicated: 4,
  };
  return ranks[severity] || 0;
}

module.exports = {
  initializeDatabase,
  checkDrugInteractionsDB,
  checkConditionContraindicationsDB,
  crossCheckInteractions,
  getDrugClass,
};
