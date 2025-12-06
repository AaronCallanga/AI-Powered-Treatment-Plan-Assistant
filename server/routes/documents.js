const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { processDocument } = require("../services/documentService");

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for document uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `document-${uniqueSuffix}${ext}`);
  },
});

// File filter for documents and images
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    // Documents
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    // Images
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/bmp",
    "image/tiff",
  ];

  const allowedExtensions = [
    ".pdf",
    ".doc",
    ".docx",
    ".csv",
    ".xls",
    ".xlsx",
    ".txt",
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".bmp",
    ".tiff",
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
        `Invalid file type: ${file.mimetype}. Supported formats: PDF, DOC, DOCX, CSV, XLS, XLSX, TXT, JPG, PNG, WebP, BMP, TIFF (max 10MB)`
      ),
      false
    );
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
});

/**
 * POST /api/documents/upload
 * Upload and process medical documents
 * Returns extracted text and patient data
 */
router.post("/upload", upload.single("document"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded. Please upload a document or image.",
      });
    }

    console.log(`Processing document: ${req.file.filename}`);
    console.log(`File size: ${(req.file.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Mime type: ${req.file.mimetype}`);

    const result = await processDocument(req.file.path);

    // Clean up file after processing
    try {
      fs.unlinkSync(req.file.path);
    } catch (err) {
      console.error("Error deleting file:", err);
    }

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Document processing error:", error);
    console.error("Error stack:", error.stack);
    console.error("Error message:", error.message);

    // Clean up file on error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.error("Error deleting file:", err);
      }
    }

    // Determine status code based on error type
    const isUserError =
      error.message.includes("not supported") ||
      error.message.includes("Please convert") ||
      error.message.includes("Invalid file") ||
      error.message.includes("No text could be extracted");

    const statusCode = isUserError ? 400 : 500;

    res.status(statusCode).json({
      success: false,
      error: error.message || "Failed to process document",
    });
  }
});

module.exports = router;
