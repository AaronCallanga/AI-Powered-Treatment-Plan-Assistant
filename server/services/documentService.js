const OpenAI = require("openai");
const fs = require("fs");
const path = require("path");
const pdf = require("pdf-parse");
const mammoth = require("mammoth");
const XLSX = require("xlsx");

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
 * Extract text from PDF file
 */
async function extractTextFromPDF(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
  } catch (error) {
    console.error("PDF extraction error:", error);
    throw new Error("Failed to extract text from PDF");
  }
}

/**
 * Extract text from plain text file
 */
function extractTextFromTXT(filePath) {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch (error) {
    console.error("TXT extraction error:", error);
    throw new Error("Failed to read text file");
  }
}

/**
 * Extract text from CSV file
 */
function extractTextFromCSV(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    // Convert CSV to readable format
    const lines = content.split("\n");
    return lines.join("\n");
  } catch (error) {
    console.error("CSV extraction error:", error);
    throw new Error("Failed to read CSV file");
  }
}

/**
 * Extract text from DOCX file
 */
async function extractTextFromDOCX(filePath) {
  try {
    console.log(`[DOCX] Extracting text from Word document: ${filePath}`);
    const result = await mammoth.extractRawText({ path: filePath });
    const text = result.value;
    console.log(
      `[DOCX] Successfully extracted ${text?.length || 0} characters`
    );

    if (result.messages.length > 0) {
      console.log(`[DOCX] Warnings:`, result.messages);
    }

    return text;
  } catch (error) {
    console.error("[DOCX] Extraction error:", error);
    throw new Error(
      `Failed to extract text from Word document: ${error.message}`
    );
  }
}

/**
 * Extract text from XLSX/XLS file
 */
function extractTextFromXLSX(filePath) {
  try {
    console.log(`[XLSX] Extracting text from Excel file: ${filePath}`);
    const workbook = XLSX.readFile(filePath);
    let allText = "";

    // Process each sheet
    workbook.SheetNames.forEach((sheetName, index) => {
      console.log(`[XLSX] Processing sheet ${index + 1}: ${sheetName}`);
      const worksheet = workbook.Sheets[sheetName];
      const sheetData = XLSX.utils.sheet_to_csv(worksheet);

      if (index > 0) allText += "\n\n";
      allText += `Sheet: ${sheetName}\n`;
      allText += sheetData;
    });

    console.log(
      `[XLSX] Successfully extracted ${allText?.length || 0} characters from ${
        workbook.SheetNames.length
      } sheet(s)`
    );
    return allText;
  } catch (error) {
    console.error("[XLSX] Extraction error:", error);
    throw new Error(`Failed to extract text from Excel file: ${error.message}`);
  }
}

/**
 * Extract text from image using OpenAI Vision
 */
async function extractTextFromImage(filePath) {
  try {
    console.log(`[IMAGE OCR] Reading image file: ${filePath}`);
    const imageBuffer = fs.readFileSync(filePath);
    const base64Image = imageBuffer.toString("base64");
    const ext = path.extname(filePath).toLowerCase();

    console.log(
      `[IMAGE OCR] Image size: ${(imageBuffer.length / 1024).toFixed(2)} KB`
    );

    // Determine mime type
    let mimeType = "image/jpeg";
    if (ext === ".png") mimeType = "image/png";
    else if (ext === ".gif") mimeType = "image/gif";
    else if (ext === ".webp") mimeType = "image/webp";
    else if (ext === ".bmp") mimeType = "image/bmp";
    else if (ext === ".tiff" || ext === ".tif") mimeType = "image/tiff";

    console.log(`[IMAGE OCR] Using mime type: ${mimeType}`);
    console.log(`[IMAGE OCR] Calling OpenAI Vision API...`);

    const client = getOpenAIClient();

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract all visible text from this medical document or lab result image. Include all patient information, test results, measurements, dates, and any other relevant data. Format it in a clear, structured way.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 2000,
    });

    const extractedText = response.choices[0].message.content;
    console.log(
      `[IMAGE OCR] Successfully extracted ${
        extractedText?.length || 0
      } characters`
    );
    return extractedText;
  } catch (error) {
    console.error("[IMAGE OCR] Error:", error.message);
    if (error.response) {
      console.error("[IMAGE OCR] OpenAI API Error:", error.response.data);
    }
    throw new Error(`Failed to extract text from image: ${error.message}`);
  }
}

/**
 * Extract patient data from text using OpenAI
 */
async function extractPatientData(text) {
  try {
    const client = getOpenAIClient();

    const prompt = `You are a medical data extraction assistant. Extract patient information from the following medical document text and structure it into a JSON format that matches a patient intake form.

Extract the following information if available:
- firstName, lastName
- dateOfBirth (YYYY-MM-DD format)
- gender (male/female/other)
- age (numeric only)
- weight (kg, numeric only)
- height (cm, numeric only)
- bloodPressure: { systolic: number, diastolic: number } - IMPORTANT: Return as an object with both values
- heartRate (bpm, numeric only)
- bloodGlucose (mg/dL, numeric only)
- medicalHistory: {
    conditions: array of condition strings (e.g. ["diabetes", "hypertension"]),
    allergies: array of allergy strings,
    surgeries: string description,
    familyHistory: array of family conditions (e.g. ["diabetes", "heart disease"])
  }
- currentMedications: array of { name: string, dosage: string, frequency: string }
- primaryComplaint: {
    condition: main diagnosis or condition name,
    description: detailed symptoms,
    duration: how long symptoms present,
    severity: "mild" or "moderate" or "severe"
  }
- lifestyle: {
    smokingStatus: "never" or "former" or "current",
    alcoholConsumption: "none" or "occasional" or "moderate" or "heavy",
    exerciseFrequency: "sedentary" or "light" or "moderate" or "active",
    dietType: string (e.g. "balanced", "vegetarian", "low-carb")
  }

IMPORTANT formatting rules:
- bloodPressure MUST be an object: { "systolic": 120, "diastolic": 80 }
- All numeric fields (age, weight, height, heartRate, bloodGlucose) should be numbers without units
- Arrays should contain simple strings or objects as specified
- Use exact field names as shown above
- Use null for missing fields

Document Text:
${text}

Return ONLY a JSON object with the extracted data following the exact structure above.`;

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a medical data extraction expert. Extract patient information accurately and return only valid JSON following the exact structure specified.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const extractedData = JSON.parse(response.choices[0].message.content);
    console.log(
      "[DATA EXTRACT] Extracted JSON:",
      JSON.stringify(extractedData, null, 2)
    );
    return extractedData;
  } catch (error) {
    console.error("Patient data extraction error:", error);
    throw new Error("Failed to extract patient data from text");
  }
}

/**
 * Process document based on file type
 */
async function processDocument(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  let extractedText = "";

  console.log(`[DOC PROCESS] Starting processing for file: ${filePath}`);
  console.log(`[DOC PROCESS] File extension: ${ext}`);

  try {
    // Extract text based on file type
    if (ext === ".pdf") {
      console.log(`[DOC PROCESS] Processing as PDF`);
      extractedText = await extractTextFromPDF(filePath);
    } else if (ext === ".txt") {
      console.log(`[DOC PROCESS] Processing as TXT`);
      extractedText = extractTextFromTXT(filePath);
    } else if (ext === ".csv") {
      console.log(`[DOC PROCESS] Processing as CSV`);
      extractedText = extractTextFromCSV(filePath);
    } else if ([".docx", ".doc"].includes(ext)) {
      console.log(`[DOC PROCESS] Processing as DOCX (Word document)`);
      extractedText = await extractTextFromDOCX(filePath);
    } else if ([".xlsx", ".xls"].includes(ext)) {
      console.log(`[DOC PROCESS] Processing as XLSX (Excel spreadsheet)`);
      extractedText = extractTextFromXLSX(filePath);
    } else if (
      [
        ".jpg",
        ".jpeg",
        ".png",
        ".gif",
        ".webp",
        ".bmp",
        ".tiff",
        ".tif",
      ].includes(ext)
    ) {
      console.log(`[DOC PROCESS] Processing as IMAGE with OCR`);
      extractedText = await extractTextFromImage(filePath);
    } else {
      console.log(`[DOC PROCESS] Unsupported file type: ${ext}`);
      throw new Error(`Unsupported file type: ${ext}`);
    }

    console.log(
      `[DOC PROCESS] Extracted text length: ${
        extractedText?.length || 0
      } characters`
    );

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error(
        "No text could be extracted from the document. The file may be empty or unreadable."
      );
    }

    // Extract structured patient data from text
    console.log(`[DOC PROCESS] Extracting patient data with AI...`);
    const extractedData = await extractPatientData(extractedText);
    console.log(`[DOC PROCESS] Successfully extracted patient data`);

    return {
      extractedText,
      extractedData,
      fileType: ext,
    };
  } catch (error) {
    console.error(`[DOC PROCESS] Error processing document:`, error.message);
    console.error(`[DOC PROCESS] Error stack:`, error.stack);
    throw error;
  }
}

module.exports = {
  processDocument,
  extractTextFromPDF,
  extractTextFromDOCX,
  extractTextFromXLSX,
  extractTextFromImage,
  extractPatientData,
};
