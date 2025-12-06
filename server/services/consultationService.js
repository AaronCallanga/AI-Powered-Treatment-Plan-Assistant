const OpenAI = require("openai");
const fs = require("fs");
const path = require("path");

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

/**
 * Transcribe audio/video file using OpenAI Whisper
 * Supported formats: mp3, mp4, mpeg, mpga, m4a, wav, webm
 * Max file size: 25MB
 * @param {string} filePath - Path to the audio/video file
 * @returns {Promise<Object>} - Transcription result
 */
async function transcribeMedia(filePath) {
  console.log(`Transcribing file: ${filePath}`);

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  // Check file size (Whisper has 25MB limit)
  const stats = fs.statSync(filePath);
  const fileSizeMB = stats.size / (1024 * 1024);
  console.log(`File size: ${fileSizeMB.toFixed(2)} MB`);

  if (fileSizeMB > 25) {
    throw new Error(
      `File too large for Whisper API. Maximum size is 25MB, your file is ${fileSizeMB.toFixed(
        2
      )}MB. Please use a shorter recording or compress the file.`
    );
  }

  const ext = path.extname(filePath).toLowerCase();
  console.log(`File extension: ${ext}`);

  try {
    const fileStream = fs.createReadStream(filePath);

    const transcription = await getOpenAIClient().audio.transcriptions.create({
      file: fileStream,
      model: "whisper-1",
      response_format: "verbose_json",
    });

    console.log(
      `Transcription completed. Duration: ${transcription.duration}s`
    );
    return {
      text: transcription.text,
      duration: transcription.duration,
      language: transcription.language,
      segments: transcription.segments || [],
    };
  } catch (error) {
    console.error("Transcription error details:", error);

    // Provide more helpful error messages
    if (error.status === 400) {
      throw new Error(
        `Invalid audio file format or corrupted file. Supported formats: MP3, MP4, M4A, WAV, WebM. Error: ${error.message}`
      );
    } else if (error.status === 413) {
      throw new Error(`File too large. Maximum size is 25MB.`);
    } else if (error.status === 401) {
      throw new Error(
        `OpenAI API authentication failed. Please check your API key.`
      );
    }

    throw new Error(`Failed to transcribe media: ${error.message}`);
  }
}

/**
 * Extract patient information from consultation transcript
 * @param {string} transcript - The consultation transcript
 * @returns {Promise<Object>} - Extracted patient data matching intake form structure
 */
async function extractPatientData(transcript) {
  console.log("Extracting patient data from transcript...");

  const extractionPrompt = `You are a medical data extraction AI. Analyze the following doctor-patient consultation transcript and extract all relevant patient information.

CONSULTATION TRANSCRIPT:
"""
${transcript}
"""

Extract the following information from the conversation. If information is not mentioned, leave that field empty or use null. Be thorough and extract every piece of medical information mentioned.

IMPORTANT: For conditions, allergies, and family history, return the ACTUAL CONDITION NAMES, not abbreviated or mapped values. For example:
- Return: "Diabetes" not "diabetes" (we'll handle case conversion)
- Return: "Heart Disease" not "heart_disease"
- Return: "High Cholesterol" not "hyperlipidemia"

Return a JSON object with the following structure:
{
  "firstName": "string or null",
  "lastName": "string or null", 
  "dateOfBirth": "YYYY-MM-DD format or null",
  "gender": "Male", "Female", or "Other" or null,
  "medicalHistory": {
    "conditions": ["array of existing conditions mentioned - use actual names like Diabetes, Hypertension, etc."],
    "allergies": ["array of allergies mentioned - use actual names like Penicillin, Aspirin, etc."],
    "surgeries": "description of past surgeries or empty string",
    "familyHistory": ["array of family medical history items - use actual names like Heart Disease, Diabetes, Cancer, etc."]
  },
  "currentMedications": [
    {
      "drugName": "medication name - extract exactly as mentioned",
      "dosage": "dosage if mentioned (e.g., '500mg', '1 tablet', '10 units') or empty string",
      "frequency": "frequency if mentioned (e.g., 'twice daily', 'once at bedtime', 'as needed') or empty string"
    }
  ],
  "healthMetrics": {
    "age": "number or null",
    "weight": "weight with unit (e.g., '180 lbs', '82 kg') or empty string",
    "height": "height with unit (e.g., \"5'10\\\", '180 cm') or empty string",
    "bloodPressure": "in format 'systolic/diastolic' (e.g., '120/80') or empty string",
    "heartRate": "beats per minute as number (e.g., '72', '72 bpm') or empty string",
    "bloodGlucose": "glucose level with unit if available (e.g., '95 mg/dL', '5.3 mmol/L') or empty string"
  },
  "lifestyle": {
    "smokingStatus": "Never", "Former", "Current", or null,
    "alcoholConsumption": "None", "Occasional", "Moderate", "Heavy", or null,
    "exerciseFrequency": "Sedentary", "Light", "Moderate", "Active", or null,
    "dietType": "Regular", "Vegetarian", "Vegan", "Keto", "Low-sodium", or null
  },
  "primaryComplaint": {
    "condition": "main condition or symptom (e.g., 'Headache', 'Back pain')",
    "description": "detailed description of the complaint",
    "duration": "how long they've had the issue (e.g., '3 days', '2 weeks', '6 months')",
    "severity": "number 1-10 or null"
  },
  "extractedNotes": "Any additional relevant medical notes from the conversation that don't fit the above categories"
}

Important guidelines:
- Extract drug names exactly as mentioned by the patient or doctor
- Convert mentioned ages to numbers
- Infer gender from context if directly stated or use pronouns
- For conditions and allergies, use the actual names mentioned, not abbreviations
- Format blood pressure as systolic/diastolic numbers only (e.g., "120/80")
- Include units with weight and height measurements
- If the patient mentions multiple complaints, put the primary/main one first
- Return severity as a number 1-10 if mentioned or inferred, otherwise null

Return ONLY the JSON object, no additional text.`;

  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a medical data extraction specialist. Extract patient information from consultation transcripts accurately and completely. Always return valid JSON.",
        },
        {
          role: "user",
          content: extractionPrompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2, // Low temperature for accurate extraction
    });

    const extractedData = JSON.parse(response.choices[0].message.content);
    console.log("Patient data extraction completed");
    return extractedData;
  } catch (error) {
    console.error("Extraction error:", error);
    throw new Error(`Failed to extract patient data: ${error.message}`);
  }
}

/**
 * Process consultation media file - transcribe and extract patient data
 * @param {string} filePath - Path to the media file
 * @returns {Promise<Object>} - Object containing transcript and extracted patient data
 */
async function processConsultation(filePath) {
  // Step 1: Transcribe the media
  const transcription = await transcribeMedia(filePath);

  // Step 2: Extract patient data from transcript
  const patientData = await extractPatientData(transcription.text);

  // Clean up the uploaded file after processing
  try {
    fs.unlinkSync(filePath);
    console.log(`Cleaned up temporary file: ${filePath}`);
  } catch (cleanupError) {
    console.warn(`Failed to cleanup file: ${cleanupError.message}`);
  }

  return {
    transcription: {
      text: transcription.text,
      duration: transcription.duration,
      language: transcription.language,
    },
    extractedData: patientData,
    processedAt: new Date().toISOString(),
  };
}

module.exports = {
  transcribeMedia,
  extractPatientData,
  processConsultation,
};
