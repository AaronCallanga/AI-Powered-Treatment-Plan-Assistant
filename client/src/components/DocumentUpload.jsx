import { useState } from "react";
import axios from "axios";
import "./DocumentUpload.css";

// Create axios instance with auth token
const createAuthenticatedAxios = () => {
  const token = localStorage.getItem("token");
  return axios.create({
    baseURL: "http://localhost:3000",
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
  });
};

// Helper function to format complex data structures
const formatDataValue = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "object") {
          return Object.entries(item)
            .map(([k, v]) => `${k}: ${v}`)
            .join(", ");
        }
        return item;
      })
      .join("; ");
  }
  if (typeof value === "object") {
    return Object.entries(value)
      .map(([k, v]) => {
        const formattedKey = k.replace(/([A-Z])/g, " $1").trim();
        if (typeof v === "object") {
          return `${formattedKey}: ${formatDataValue(v)}`;
        }
        return `${formattedKey}: ${v}`;
      })
      .join(" | ");
  }
  return String(value);
};

export default function DocumentUpload({ onDataExtracted, onClose }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      setError(null);
      setResult(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file to upload");
      return;
    }

    const formData = new FormData();
    formData.append("document", file);

    try {
      setUploading(true);
      setError(null);
      setProgress(0);

      const api = createAuthenticatedAxios();
      const response = await api.post("/api/documents/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setProgress(percentCompleted);
        },
      });

      if (response.data.success) {
        setResult(response.data);
        setProgress(100);
      } else {
        setError(response.data.error || "Failed to process document");
      }
    } catch (err) {
      console.error("Document upload error:", err);
      setError(
        err.response?.data?.error ||
          err.message ||
          "Failed to upload and process document"
      );
    } finally {
      setUploading(false);
    }
  };

  const handleApplyData = () => {
    if (result?.extractedData) {
      onDataExtracted(result.extractedData);
      onClose();
    }
  };

  const getFileIcon = () => {
    if (!file) return "📄";
    const ext = file.name.split(".").pop().toLowerCase();
    switch (ext) {
      case "pdf":
        return "📕";
      case "doc":
      case "docx":
        return "📘";
      case "csv":
      case "xls":
      case "xlsx":
        return "📊";
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
        return "🖼️";
      default:
        return "📄";
    }
  };

  return (
    <div className="document-upload">
      <h2>📄 Upload Medical Document</h2>
      <p className="document-subtitle">
        Upload patient documents, lab results, medical records, or images to
        auto-populate the form
      </p>

      <div
        className={`drop-zone ${file ? "has-file" : ""}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => document.getElementById("document-input").click()}
      >
        {file ? (
          <div className="file-preview">
            <span className="file-icon">{getFileIcon()}</span>
            <div className="file-info">
              <p className="file-name">{file.name}</p>
              <p className="file-size">{(file.size / 1024).toFixed(2)} KB</p>
            </div>
            <button
              type="button"
              className="remove-file"
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
                setResult(null);
                setError(null);
              }}
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="drop-placeholder">
            <span className="upload-icon">📤</span>
            <p>
              <strong>Click to browse</strong> or drag and drop
            </p>
            <p className="supported-formats">
              Supported: PDF, DOC, DOCX, CSV, XLS, XLSX, JPG, PNG, WebP, BMP,
              TIFF (max 10MB)
            </p>
          </div>
        )}
      </div>

      <input
        id="document-input"
        type="file"
        accept=".pdf,.doc,.docx,.csv,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.tif,.txt"
        onChange={handleFileSelect}
        style={{ display: "none" }}
      />

      {uploading && (
        <div className="upload-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="progress-text">{progress}%</p>
          <p className="processing-message">
            {progress < 100 ? "Uploading document..." : "Processing with AI..."}
          </p>
        </div>
      )}

      {error && (
        <div className="error-message">
          <span>⚠️</span>
          {error}
        </div>
      )}

      {result && (
        <div className="extraction-result">
          <h3>✅ Data Extracted Successfully</h3>

          {result.extractedText && (
            <div className="extracted-section">
              <h4>📄 Document Content</h4>
              <div className="extracted-text">
                {result.extractedText.substring(0, 500)}
                {result.extractedText.length > 500 && "..."}
              </div>
            </div>
          )}

          {result.extractedData && (
            <div className="extracted-section">
              <h4>📋 Extracted Patient Information</h4>
              <div className="data-preview">
                {Object.entries(result.extractedData).map(([key, value]) => {
                  if (
                    !value ||
                    (typeof value === "object" &&
                      Object.keys(value).length === 0)
                  ) {
                    return null;
                  }
                  const displayKey = key
                    .replace(/([A-Z])/g, " $1")
                    .replace(/^./, (str) => str.toUpperCase())
                    .trim();
                  const displayValue = formatDataValue(value);
                  return (
                    <div key={key} className="data-item">
                      <strong>{displayKey}:</strong> {displayValue}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <button className="apply-button" onClick={handleApplyData}>
            ✓ Apply to Form
          </button>
        </div>
      )}

      {!result && !uploading && file && (
        <div className="action-buttons">
          <button className="process-button" onClick={handleUpload}>
            🤖 Process Document with AI
          </button>
        </div>
      )}
    </div>
  );
}
