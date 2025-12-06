const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { processConsultation } = require("../services/consultationService");

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `consultation-${uniqueSuffix}${ext}`);
  },
});

// File filter - accept audio and video files supported by Whisper API
// Supported: mp3, mp4, mpeg, mpga, m4a, wav, webm (max 25MB)
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    // Audio formats
    "audio/mpeg", // mp3
    "audio/mp3",
    "audio/wav",
    "audio/wave",
    "audio/x-wav",
    "audio/mp4", // m4a
    "audio/x-m4a",
    "audio/m4a",
    "audio/webm",
    // Video formats
    "video/mp4",
    "video/webm",
    "video/mpeg",
  ];

  // Also check file extension as a fallback
  const allowedExtensions = [
    ".mp3",
    ".mp4",
    ".mpeg",
    ".mpga",
    ".m4a",
    ".wav",
    ".webm",
  ];
  const ext = file.originalname
    .toLowerCase()
    .substring(file.originalname.lastIndexOf("."));

  if (
    allowedMimeTypes.includes(file.mimetype) ||
    allowedExtensions.includes(ext)
  ) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type: ${file.mimetype}. Supported formats: MP3, MP4, M4A, WAV, WebM (max 25MB)`
      ),
      false
    );
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB max file size (Whisper API limit)
  },
});

/**
 * POST /api/consultation/upload
 * Upload and process consultation audio/video
 * Returns transcription and extracted patient data
 */
router.post("/upload", upload.single("media"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded. Please upload an audio or video file.",
      });
    }

    console.log(`Processing consultation file: ${req.file.filename}`);
    console.log(`File size: ${(req.file.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Mime type: ${req.file.mimetype}`);

    // Process the consultation - transcribe and extract data
    const result = await processConsultation(req.file.path);

    res.json({
      success: true,
      data: {
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        transcription: result.transcription,
        extractedData: result.extractedData,
        processedAt: result.processedAt,
      },
    });
  } catch (error) {
    console.error("Consultation processing error:", error);

    // Clean up file if it exists and processing failed
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.warn("Failed to cleanup file after error:", cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      error: error.message || "Failed to process consultation file",
    });
  }
});

/**
 * POST /api/consultation/transcribe-only
 * Only transcribe the consultation without extracting patient data
 */
router.post("/transcribe-only", upload.single("media"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded.",
      });
    }

    const { transcribeMedia } = require("../services/consultationService");
    const transcription = await transcribeMedia(req.file.path);

    // Clean up file
    try {
      fs.unlinkSync(req.file.path);
    } catch (e) {
      console.warn("Cleanup error:", e);
    }

    res.json({
      success: true,
      data: {
        fileName: req.file.originalname,
        transcription: transcription,
      },
    });
  } catch (error) {
    console.error("Transcription error:", error);

    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {}
    }

    res.status(500).json({
      success: false,
      error: error.message || "Failed to transcribe file",
    });
  }
});

/**
 * POST /api/consultation/extract-from-text
 * Extract patient data from already transcribed text
 */
router.post("/extract-from-text", async (req, res) => {
  try {
    const { transcript } = req.body;

    if (!transcript || typeof transcript !== "string") {
      return res.status(400).json({
        success: false,
        error: "Transcript text is required",
      });
    }

    const { extractPatientData } = require("../services/consultationService");
    const extractedData = await extractPatientData(transcript);

    res.json({
      success: true,
      data: {
        extractedData: extractedData,
        processedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Extraction error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to extract patient data",
    });
  }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        error: "File too large. Maximum size is 100MB.",
      });
    }
    return res.status(400).json({
      success: false,
      error: error.message,
    });
  }

  if (error) {
    return res.status(400).json({
      success: false,
      error: error.message,
    });
  }

  next();
});

module.exports = router;
