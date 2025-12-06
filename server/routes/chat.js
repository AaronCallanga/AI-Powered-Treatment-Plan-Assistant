const express = require("express");
const router = express.Router();
const OpenAI = require("openai");
const {
  getDDIRagContextForTreatment,
  findInteractionsForDrug,
  checkContraindicationsFromProfile,
  DOSAGE_GUIDELINES,
} = require("../services/ddiRagService");

// Lazy initialization of OpenAI client
let openai = null;

function getOpenAIClient() {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

// Chat system prompt for clinical assistant
const CHAT_SYSTEM_PROMPT = `You are a clinical decision support chatbot for physicians. You help doctors with:
1. Drug-drug interaction queries
2. Dosage recommendations
3. Contraindication checks
4. Clinical guidelines and best practices
5. Treatment alternatives
6. Patient-specific advice

IMPORTANT GUIDELINES:
- Always prioritize patient safety
- Be concise but thorough
- Cite evidence-based sources when possible
- If you're unsure, recommend consulting specialist resources
- Always remind that AI recommendations should be verified by clinical judgment
- Use the DDI database context provided for accurate drug interaction information

When answering about drug interactions:
- Clearly state the severity (Major, Moderate, Minor)
- Explain the mechanism of interaction
- Provide clinical management recommendations
- Suggest safer alternatives when applicable

Format your responses in a clear, readable manner using markdown:
- Use bullet points for lists
- Use **bold** for important warnings
- Use headers for organization when appropriate`;

// Conversation history storage (in production, use a database)
const conversationHistory = new Map();

// Clean up old conversations (older than 1 hour)
setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [sessionId, data] of conversationHistory.entries()) {
    if (data.lastUpdated < oneHourAgo) {
      conversationHistory.delete(sessionId);
    }
  }
}, 15 * 60 * 1000); // Run every 15 minutes

/**
 * Build context from patient data if provided
 */
function buildPatientContext(patient) {
  if (!patient) return "";

  let context = "\n\n--- CURRENT PATIENT CONTEXT ---\n";
  context += `Patient: ${patient.firstName} ${patient.lastName}\n`;
  context += `Age: ${patient.healthMetrics?.age || "Unknown"}\n`;
  context += `Gender: ${patient.gender || "Unknown"}\n`;

  if (patient.medicalHistory?.conditions?.length > 0) {
    context += `Conditions: ${patient.medicalHistory.conditions.join(", ")}\n`;
  }

  if (patient.medicalHistory?.allergies?.length > 0) {
    context += `Allergies: ${patient.medicalHistory.allergies.join(", ")}\n`;
  }

  if (patient.currentMedications?.length > 0) {
    context += `Current Medications: ${patient.currentMedications
      .map((m) => `${m.drugName} ${m.dosage}`)
      .join(", ")}\n`;
  }

  if (patient.primaryComplaint?.condition) {
    context += `Primary Complaint: ${patient.primaryComplaint.condition.replace(
      /_/g,
      " "
    )}\n`;
  }

  context += "--- END PATIENT CONTEXT ---\n";
  return context;
}

/**
 * Build DDI context for drug-related queries
 */
function buildDDIContext(message, patient) {
  let ddiContext = "";

  // Extract drug names from message (simple extraction)
  const drugKeywords = message.toLowerCase();

  // Get DDI RAG context if patient has medications
  if (patient?.currentMedications?.length > 0) {
    const ragContext = getDDIRagContextForTreatment(patient, []);
    if (
      ragContext.rawContext.drugInteractions.length > 0 ||
      ragContext.rawContext.relevantDDIEntries.length > 0
    ) {
      ddiContext += ragContext.promptContext;
    }
  }

  // Check for specific drug queries
  const commonDrugs = [
    "warfarin",
    "ibuprofen",
    "aspirin",
    "metformin",
    "lisinopril",
    "atorvastatin",
    "sertraline",
    "sildenafil",
    "tadalafil",
    "omeprazole",
    "metoprolol",
    "amlodipine",
    "gabapentin",
    "tramadol",
    "prednisone",
    "ciprofloxacin",
    "amoxicillin",
  ];

  for (const drug of commonDrugs) {
    if (drugKeywords.includes(drug)) {
      const interactions = findInteractionsForDrug(drug);
      if (interactions.length > 0) {
        ddiContext += `\n\n--- DDI DATABASE ENTRIES FOR ${drug.toUpperCase()} ---\n`;
        for (const interaction of interactions.slice(0, 5)) {
          ddiContext += `• ${interaction.drug_a} + ${interaction.drug_b} (${interaction.severity})\n`;
          ddiContext += `  Effect: ${interaction.clinical_effect}\n`;
          ddiContext += `  Management: ${interaction.clinical_management}\n`;
          ddiContext += `  Alternative: ${interaction.safer_alternative}\n\n`;
        }
      }

      // Add dosage guidelines if available
      if (DOSAGE_GUIDELINES[drug]) {
        ddiContext += `\n--- DOSAGE GUIDELINES FOR ${drug.toUpperCase()} ---\n`;
        const guidelines = DOSAGE_GUIDELINES[drug];
        if (guidelines.standard) {
          ddiContext += `Standard: ${guidelines.standard.min}-${
            guidelines.standard.max
          }${guidelines.standard.unit} ${
            guidelines.standard.frequency || ""
          }\n`;
        }
        if (guidelines.elderly) {
          ddiContext += `Elderly: ${
            guidelines.elderly.note ||
            `Max ${guidelines.elderly.max}${guidelines.standard?.unit || "mg"}`
          }\n`;
        }
        if (guidelines.renalImpairment) {
          ddiContext += `Renal Impairment: ${
            guidelines.renalImpairment.note ||
            `Max ${guidelines.renalImpairment.max}${
              guidelines.standard?.unit || "mg"
            }`
          }\n`;
        }
      }
    }
  }

  return ddiContext;
}

// POST - Send a chat message
router.post("/", async (req, res) => {
  try {
    const {
      message,
      conversationHistory: clientHistory,
      patientContext,
    } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Message is required" });
    }

    // Build patient context string
    const patientContextStr = buildPatientContext(patientContext);
    const ddiContext = buildDDIContext(message, patientContext);

    // Build messages array from client history
    const messages = [
      {
        role: "system",
        content: CHAT_SYSTEM_PROMPT + patientContextStr + ddiContext,
      },
    ];

    // Add previous conversation history if provided
    if (clientHistory && Array.isArray(clientHistory)) {
      for (const msg of clientHistory.slice(-10)) {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    // Add current user message
    messages.push({
      role: "user",
      content: message,
    });

    // Call OpenAI
    const response = await getOpenAIClient().chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    const assistantMessage = response.choices[0].message.content;

    // Extract drug names mentioned for context pills
    const drugContext = extractDrugNames(message + " " + assistantMessage);

    res.json({
      response: assistantMessage,
      drugContext: drugContext,
    });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({
      message: "Failed to process chat message",
      error: error.message,
    });
  }
});

// Helper to extract drug names from text
function extractDrugNames(text) {
  const commonDrugs = [
    "warfarin",
    "ibuprofen",
    "aspirin",
    "metformin",
    "lisinopril",
    "atorvastatin",
    "sertraline",
    "sildenafil",
    "tadalafil",
    "omeprazole",
    "metoprolol",
    "amlodipine",
    "gabapentin",
    "tramadol",
    "prednisone",
    "ciprofloxacin",
    "amoxicillin",
    "losartan",
    "hydrochlorothiazide",
    "simvastatin",
    "pravastatin",
    "clopidogrel",
    "digoxin",
    "diltiazem",
    "verapamil",
    "furosemide",
    "spironolactone",
    "carvedilol",
    "propranolol",
  ];

  const found = [];
  const lowerText = text.toLowerCase();

  for (const drug of commonDrugs) {
    if (lowerText.includes(drug) && !found.includes(drug)) {
      found.push(drug.charAt(0).toUpperCase() + drug.slice(1));
    }
  }

  return found;
}

// POST - Clear conversation history
router.post("/clear", (req, res) => {
  const { sessionId } = req.body;

  if (sessionId && conversationHistory.has(sessionId)) {
    conversationHistory.delete(sessionId);
  }

  res.json({ message: "Conversation cleared" });
});

// GET - Get conversation history
router.get("/history/:sessionId", (req, res) => {
  const { sessionId } = req.params;

  if (!conversationHistory.has(sessionId)) {
    return res.json({ messages: [] });
  }

  const sessionData = conversationHistory.get(sessionId);
  res.json({
    messages: sessionData.messages,
    patient: sessionData.patient,
  });
});

// POST - Quick queries (predefined questions)
router.post("/quick-query", async (req, res) => {
  try {
    const { queryType, drugs, patient } = req.body;

    let prompt = "";

    switch (queryType) {
      case "interaction":
        if (!drugs || drugs.length < 2) {
          return res.status(400).json({
            message: "At least 2 drugs required for interaction check",
          });
        }
        prompt = `Check for drug-drug interactions between: ${drugs.join(
          ", "
        )}. Provide severity, mechanism, clinical effects, and management recommendations.`;
        break;

      case "dosage":
        if (!drugs || drugs.length === 0) {
          return res.status(400).json({ message: "Drug name required" });
        }
        prompt = `Provide dosage guidelines for ${drugs[0]}, including standard dosing, adjustments for elderly, renal impairment, and hepatic impairment.`;
        break;

      case "alternatives":
        if (!drugs || drugs.length === 0) {
          return res.status(400).json({ message: "Drug name required" });
        }
        prompt = `What are safer alternatives to ${drugs[0]}? Consider common contraindications and interactions.`;
        break;

      case "contraindications":
        if (!drugs || drugs.length === 0) {
          return res.status(400).json({ message: "Drug name required" });
        }
        prompt = `What are the main contraindications for ${drugs[0]}? Include conditions, allergies, and drug interactions to avoid.`;
        break;

      default:
        return res.status(400).json({ message: "Invalid query type" });
    }

    // Build context
    const patientContext = buildPatientContext(patient);
    const ddiContext = buildDDIContext(prompt, patient);

    const response = await getOpenAIClient().chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: CHAT_SYSTEM_PROMPT + patientContext + ddiContext,
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 800,
    });

    res.json({
      query: prompt,
      response: response.choices[0].message.content,
    });
  } catch (error) {
    console.error("Quick query error:", error);
    res.status(500).json({
      message: "Failed to process query",
      error: error.message,
    });
  }
});

module.exports = router;
