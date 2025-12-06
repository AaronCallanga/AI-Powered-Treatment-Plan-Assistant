import { useState, useRef, useCallback } from "react";
import { consultationAPI } from "../api/patientAPI";
import {
  ClipboardIcon,
  MicIcon,
  AudioIcon,
  VideoIcon,
  RocketIcon,
  WarningIcon,
  DocumentIcon,
  SearchIcon,
  SuccessIcon,
  RefreshIcon,
  CloseIcon,
} from "./Icons";
import LoadingSpinner from "./LoadingSpinner";
import "./LoadingSpinner.css";
import "./ConsultationUpload.css";

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

const ConsultationUpload = ({ onDataExtracted, onClose }) => {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState("");
  const [transcription, setTranscription] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const acceptedTypes = [
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/mp4",
    "audio/x-m4a",
    "audio/webm",
    "video/mp4",
    "video/webm",
    "video/quicktime",
  ];

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
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
      const droppedFile = e.dataTransfer.files[0];
      validateAndSetFile(droppedFile);
    }
  }, []);

  const validateAndSetFile = (selectedFile) => {
    setError("");

    const allowedExtensions = [
      ".mp3",
      ".mp4",
      ".mpeg",
      ".mpga",
      ".m4a",
      ".wav",
      ".webm",
    ];
    const ext = selectedFile.name
      .toLowerCase()
      .substring(selectedFile.name.lastIndexOf("."));

    if (
      !acceptedTypes.includes(selectedFile.type) &&
      !allowedExtensions.includes(ext)
    ) {
      setError(
        "Invalid file type. Please upload MP3, WAV, M4A, MP4, or WebM files."
      );
      return;
    }

    if (selectedFile.size > 25 * 1024 * 1024) {
      setError(
        "File too large. Maximum size is 25MB (Whisper API limit). Please use a shorter recording or compress the file."
      );
      return;
    }

    setFile(selectedFile);
    setTranscription(null);
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
    setUploadProgress(0);
    setProcessingStage("Uploading file...");

    try {
      setProcessingStage("Uploading file...");
      const response = await consultationAPI.uploadMedia(file, (progress) => {
        setUploadProgress(progress);
        if (progress === 100) {
          setProcessingStage("Transcribing audio with AI...");
        }
      });

      if (response.data.success) {
        const { transcription: trans, extractedData: data } =
          response.data.data;

        setTranscription(trans);
        setExtractedData(data);
        setProcessingStage("Complete!");
      } else {
        throw new Error(response.data.error || "Processing failed");
      }
    } catch (err) {
      console.error("Upload error:", err);
      setError(
        err.response?.data?.error || err.message || "Failed to process file"
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

  const handleClearFile = () => {
    setFile(null);
    setTranscription(null);
    setExtractedData(null);
    setError("");
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getFileIcon = () => {
    if (!file) return <AudioIcon size={24} />;
    if (file.type.startsWith("video/")) return <VideoIcon size={24} />;
    return <AudioIcon size={24} />;
  };

  return (
    <div className="consultation-upload">
      <div className="upload-header">
        <ClipboardIcon size={24} />
        <div>
          <h3>Upload Consultation Recording</h3>
          <p className="upload-description">
            Upload an audio or video recording of the doctor-patient
            consultation. AI will transcribe and extract patient information
            automatically.
          </p>
        </div>
      </div>

      {/* File Drop Zone */}
      {!file && !uploading && (
        <div
          className={`drop-zone ${dragActive ? "active" : ""}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="drop-zone-content">
            <MicIcon size={40} className="drop-icon" />
            <p className="drop-text">
              Drag & drop your consultation recording here
            </p>
            <p className="drop-subtext">or click to browse</p>
            <p className="file-types">
              Supported: MP3, WAV, M4A, MP4, WebM (max 25MB)
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,.wav,.m4a,.mp4,.webm,.mpeg,audio/*,video/*"
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />
        </div>
      )}

      {/* File Preview */}
      {file && !uploading && !transcription && (
        <div className="file-preview">
          <div className="file-info">
            <span className="file-icon">{getFileIcon()}</span>
            <div className="file-details">
              <span className="file-name">{file.name}</span>
              <span className="file-size">{formatFileSize(file.size)}</span>
            </div>
            <button className="clear-file-btn" onClick={handleClearFile}>
              <CloseIcon size={16} />
            </button>
          </div>
          <button
            className="process-btn"
            onClick={handleUpload}
            disabled={uploading}
          >
            <RocketIcon size={18} />
            <span>Process Recording</span>
          </button>
        </div>
      )}

      {/* Upload Progress */}
      {uploading && (
        <div className="upload-progress">
          <LoadingSpinner size="lg" />
          <div className="progress-info">
            <span className="progress-stage">{processingStage}</span>
            {uploadProgress < 100 && (
              <div className="progress-bar-container">
                <div
                  className="progress-bar"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            )}
            {uploadProgress === 100 && (
              <p className="processing-note">
                This may take a few moments depending on the recording length...
              </p>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="upload-error">
          <WarningIcon size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Results Section */}
      {transcription && extractedData && (
        <div className="extraction-results">
          {/* Transcription */}
          <div className="result-section">
            <h4>
              <DocumentIcon size={18} />
              <span>Transcription</span>
            </h4>
            <div className="transcription-meta">
              <span>Duration: {Math.round(transcription.duration)}s</span>
              <span>Language: {transcription.language?.toUpperCase()}</span>
            </div>
            <div className="transcription-text">{transcription.text}</div>
          </div>

          {/* Extracted Data Preview */}
          <div className="result-section">
            <h4>
              <SearchIcon size={18} />
              <span>Extracted Patient Data</span>
            </h4>
            <div className="extracted-data-preview">
              {(extractedData.firstName || extractedData.lastName) && (
                <div className="data-group">
                  <label>Patient Name:</label>
                  <span>
                    {extractedData.firstName} {extractedData.lastName}
                  </span>
                </div>
              )}
              {extractedData.dateOfBirth && (
                <div className="data-group">
                  <label>Date of Birth:</label>
                  <span>{extractedData.dateOfBirth}</span>
                </div>
              )}
              {extractedData.gender && (
                <div className="data-group">
                  <label>Gender:</label>
                  <span>{extractedData.gender}</span>
                </div>
              )}
              {extractedData.primaryComplaint?.condition && (
                <div className="data-group">
                  <label>Primary Complaint:</label>
                  <span>{extractedData.primaryComplaint.condition}</span>
                </div>
              )}
              {extractedData.primaryComplaint?.description && (
                <div className="data-group">
                  <label>Description:</label>
                  <span>{extractedData.primaryComplaint.description}</span>
                </div>
              )}
              {extractedData.medicalHistory?.conditions?.length > 0 && (
                <div className="data-group">
                  <label>Conditions:</label>
                  <span>
                    {extractedData.medicalHistory.conditions.join(", ")}
                  </span>
                </div>
              )}
              {extractedData.medicalHistory?.allergies?.length > 0 && (
                <div className="data-group">
                  <label>Allergies:</label>
                  <span>
                    {extractedData.medicalHistory.allergies.join(", ")}
                  </span>
                </div>
              )}
              {extractedData.currentMedications?.length > 0 && (
                <div className="data-group">
                  <label>Current Medications:</label>
                  <span>
                    {extractedData.currentMedications
                      .map((m) =>
                        m.dosage
                          ? `${m.drugName} ${m.dosage} ${m.frequency}`
                          : m.drugName
                      )
                      .filter(Boolean)
                      .join("; ")}
                  </span>
                </div>
              )}
              {extractedData.healthMetrics?.age && (
                <div className="data-group">
                  <label>Age:</label>
                  <span>{extractedData.healthMetrics.age} years</span>
                </div>
              )}
              {extractedData.healthMetrics?.bloodPressure?.systolic && (
                <div className="data-group">
                  <label>Blood Pressure:</label>
                  <span>
                    {extractedData.healthMetrics.bloodPressure.systolic}/
                    {extractedData.healthMetrics.bloodPressure.diastolic} mmHg
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="result-actions">
            <button className="apply-data-btn" onClick={handleApplyData}>
              <SuccessIcon size={18} />
              <span>Apply to Intake Form</span>
            </button>
            <button className="clear-btn" onClick={handleClearFile}>
              <RefreshIcon size={18} />
              <span>Upload Another</span>
            </button>
          </div>
        </div>
      )}

      {/* Close Button */}
      {onClose && (
        <button className="close-upload-btn" onClick={onClose}>
          Close
        </button>
      )}
    </div>
  );
};

export default ConsultationUpload;
