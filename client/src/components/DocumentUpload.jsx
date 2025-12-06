import { useState, useRef, useCallback } from "react";
import { documentAPI } from "../api/patientAPI";
import {
  DocumentIcon,
  FileIcon,
  SpreadsheetIcon,
  ImageIcon,
  UploadIcon,
  WarningIcon,
  SuccessIcon,
  AIIcon,
  CloseIcon,
  SearchIcon,
  RefreshIcon,
} from "./Icons";
import LoadingSpinner from "./LoadingSpinner";
import "./LoadingSpinner.css";
import "./DocumentUpload.css";

const DocumentUpload = ({ onDataExtracted, onClose }) => {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processingStage, setProcessingStage] = useState("");
  const [extractedData, setExtractedData] = useState(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const acceptedTypes = {
    "application/pdf": { name: "PDF Document", Icon: FileIcon },
    "application/msword": { name: "Word Document", Icon: FileIcon },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
      name: "Word Document",
      Icon: FileIcon,
    },
    "application/vnd.ms-excel": {
      name: "Excel Spreadsheet",
      Icon: SpreadsheetIcon,
    },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
      name: "Excel Spreadsheet",
      Icon: SpreadsheetIcon,
    },
    "text/plain": { name: "Text File", Icon: DocumentIcon },
    "text/csv": { name: "CSV File", Icon: SpreadsheetIcon },
    "image/jpeg": { name: "JPEG Image", Icon: ImageIcon },
    "image/png": { name: "PNG Image", Icon: ImageIcon },
    "image/gif": { name: "GIF Image", Icon: ImageIcon },
  };

  const getFileIcon = (fileType) => {
    const typeInfo = acceptedTypes[fileType];
    if (typeInfo) {
      return <typeInfo.Icon size={24} />;
    }
    return <FileIcon size={24} />;
  };

  const getFileTypeName = (fileType) => {
    return acceptedTypes[fileType]?.name || "Document";
  };

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setError("");

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  }, []);

  const validateAndSetFile = (selectedFile) => {
    setError("");

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("File too large. Maximum size is 10MB.");
      return;
    }

    setFile(selectedFile);
    setExtractedData(null);
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError("");
    setProcessingStage("Uploading document...");

    try {
      const response = await documentAPI.uploadDocument(file);

      if (response.data.success) {
        setExtractedData(response.data.data.extractedData);
        setProcessingStage("Complete!");
      } else {
        throw new Error(response.data.error || "Processing failed");
      }
    } catch (err) {
      console.error("Document upload error:", err);
      setError(
        err.response?.data?.error || err.message || "Failed to process document"
      );
    } finally {
      setUploading(false);
    }
  };

  const handleApplyData = () => {
    if (extractedData && onDataExtracted) {
      onDataExtracted(extractedData);
    }
  };

  const handleClear = () => {
    setFile(null);
    setExtractedData(null);
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="document-upload">
      <div className="doc-upload-header">
        <DocumentIcon size={24} />
        <div>
          <h3>Upload Medical Documents</h3>
          <p>
            Upload patient documents, lab results, prescriptions, or medical
            records. AI will extract relevant information automatically.
          </p>
        </div>
      </div>

      {/* Drop Zone */}
      {!file && !uploading && (
        <div
          className={`doc-drop-zone ${dragActive ? "active" : ""}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="doc-drop-content">
            <UploadIcon size={40} className="drop-icon" />
            <p className="drop-text">Drag & drop your document here</p>
            <p className="drop-subtext">or click to browse</p>
            <p className="file-types">
              PDF, Word, Excel, CSV, TXT, or Images (max 10MB)
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.jpg,.jpeg,.png,.gif"
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />
        </div>
      )}

      {/* File Preview */}
      {file && !uploading && !extractedData && (
        <div className="doc-file-preview">
          <div className="doc-file-info">
            <span className="doc-file-icon">{getFileIcon(file.type)}</span>
            <div className="doc-file-details">
              <span className="doc-file-name">{file.name}</span>
              <span className="doc-file-meta">
                {getFileTypeName(file.type)} • {formatFileSize(file.size)}
              </span>
            </div>
            <button className="doc-clear-btn" onClick={handleClear}>
              <CloseIcon size={16} />
            </button>
          </div>
          <button
            className="doc-process-btn"
            onClick={handleUpload}
            disabled={uploading}
          >
            <AIIcon size={18} />
            <span>Extract Data with AI</span>
          </button>
        </div>
      )}

      {/* Processing State */}
      {uploading && (
        <div className="doc-processing">
          <LoadingSpinner size="lg" />
          <p className="processing-stage">{processingStage}</p>
          <p className="processing-note">
            Analyzing document and extracting medical information...
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="doc-error">
          <WarningIcon size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Extracted Data */}
      {extractedData && (
        <div className="doc-extraction-results">
          <div className="doc-success-header">
            <SuccessIcon size={24} />
            <h4>Data Extracted Successfully</h4>
          </div>

          <div className="doc-extracted-preview">
            <h5>
              <SearchIcon size={16} />
              <span>Extracted Information</span>
            </h5>
            <div className="doc-data-grid">
              {extractedData.firstName && (
                <div className="doc-data-item">
                  <strong>Name:</strong> {extractedData.firstName}{" "}
                  {extractedData.lastName}
                </div>
              )}
              {extractedData.dateOfBirth && (
                <div className="doc-data-item">
                  <strong>DOB:</strong> {extractedData.dateOfBirth}
                </div>
              )}
              {extractedData.gender && (
                <div className="doc-data-item">
                  <strong>Gender:</strong> {extractedData.gender}
                </div>
              )}
              {extractedData.primaryComplaint?.condition && (
                <div className="doc-data-item">
                  <strong>Condition:</strong>{" "}
                  {extractedData.primaryComplaint.condition}
                </div>
              )}
              {extractedData.medicalHistory?.conditions?.length > 0 && (
                <div className="doc-data-item">
                  <strong>Conditions:</strong>{" "}
                  {extractedData.medicalHistory.conditions.join(", ")}
                </div>
              )}
              {extractedData.medicalHistory?.allergies?.length > 0 && (
                <div className="doc-data-item">
                  <strong>Allergies:</strong>{" "}
                  {extractedData.medicalHistory.allergies.join(", ")}
                </div>
              )}
              {extractedData.currentMedications?.length > 0 && (
                <div className="doc-data-item">
                  <strong>Medications:</strong>{" "}
                  {extractedData.currentMedications
                    .map((m) =>
                      m.dosage ? `${m.drugName} ${m.dosage}` : m.drugName
                    )
                    .filter(Boolean)
                    .join("; ")}
                </div>
              )}
              {extractedData.healthMetrics?.bloodPressure?.systolic && (
                <div className="doc-data-item">
                  <strong>Blood Pressure:</strong>{" "}
                  {extractedData.healthMetrics.bloodPressure.systolic}/
                  {extractedData.healthMetrics.bloodPressure.diastolic} mmHg
                </div>
              )}
            </div>
          </div>

          <div className="doc-actions">
            <button className="doc-apply-btn" onClick={handleApplyData}>
              <SuccessIcon size={18} />
              <span>Apply to Intake Form</span>
            </button>
            <button className="doc-clear-btn-text" onClick={handleClear}>
              <RefreshIcon size={18} />
              <span>Upload Another</span>
            </button>
          </div>
        </div>
      )}

      {onClose && (
        <button className="doc-close-btn" onClick={onClose}>
          Close
        </button>
      )}
    </div>
  );
};

export default DocumentUpload;
