import { useState, useRef, useCallback } from "react";
import { consultationAPI } from "../api/patientAPI";
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

    // Check file extension as fallback
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

    // Check file type
    if (
      !acceptedTypes.includes(selectedFile.type) &&
      !allowedExtensions.includes(ext)
    ) {
      setError(
        "Invalid file type. Please upload MP3, WAV, M4A, MP4, or WebM files."
      );
      return;
    }

    // Check file size (25MB limit - Whisper API requirement)
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
      // Upload with progress tracking
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
    if (!file) return "📁";
    if (file.type.startsWith("video/")) return "🎬";
    return "🎵";
  };

  return (
    <div className="consultation-upload">
      <div className="upload-header">
        <h3>📋 Upload Consultation Recording</h3>
        <p className="upload-description">
          Upload an audio or video recording of the doctor-patient consultation.
          AI will transcribe and extract patient information automatically.
        </p>
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
            <span className="drop-icon">🎤</span>
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
              ✕
            </button>
          </div>
          <button
            className="process-btn"
            onClick={handleUpload}
            disabled={uploading}
          >
            🚀 Process Recording
          </button>
        </div>
      )}

      {/* Upload Progress */}
      {uploading && (
        <div className="upload-progress">
          <div className="progress-spinner"></div>
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
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Results Section */}
      {transcription && extractedData && (
        <div className="extraction-results">
          {/* Transcription */}
          <div className="result-section">
            <h4>📝 Transcription</h4>
            <div className="transcription-meta">
              <span>Duration: {Math.round(transcription.duration)}s</span>
              <span>Language: {transcription.language?.toUpperCase()}</span>
            </div>
            <div className="transcription-text">{transcription.text}</div>
          </div>

          {/* Extracted Data Preview */}
          <div className="result-section">
            <h4>🔍 Extracted Patient Data</h4>
            <div className="extracted-data-preview">
              {/* Basic Info */}
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

              {/* Primary Complaint */}
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
              {extractedData.primaryComplaint?.duration && (
                <div className="data-group">
                  <label>Duration:</label>
                  <span>{extractedData.primaryComplaint.duration}</span>
                </div>
              )}
              {extractedData.primaryComplaint?.severity && (
                <div className="data-group">
                  <label>Severity:</label>
                  <span>{extractedData.primaryComplaint.severity}</span>
                </div>
              )}

              {/* Medical History */}
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

              {extractedData.medicalHistory?.surgeries && (
                <div className="data-group">
                  <label>Surgeries:</label>
                  <span>{extractedData.medicalHistory.surgeries}</span>
                </div>
              )}

              {extractedData.medicalHistory?.familyHistory?.length > 0 && (
                <div className="data-group">
                  <label>Family History:</label>
                  <span>
                    {extractedData.medicalHistory.familyHistory.join(", ")}
                  </span>
                </div>
              )}

              {/* Medications */}
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

              {/* Health Metrics */}
              {extractedData.healthMetrics?.age && (
                <div className="data-group">
                  <label>Age:</label>
                  <span>{extractedData.healthMetrics.age} years</span>
                </div>
              )}

              {extractedData.healthMetrics?.weight && (
                <div className="data-group">
                  <label>Weight:</label>
                  <span>{extractedData.healthMetrics.weight} kg</span>
                </div>
              )}

              {extractedData.healthMetrics?.height && (
                <div className="data-group">
                  <label>Height:</label>
                  <span>{extractedData.healthMetrics.height} cm</span>
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

              {extractedData.healthMetrics?.heartRate && (
                <div className="data-group">
                  <label>Heart Rate:</label>
                  <span>{extractedData.healthMetrics.heartRate} bpm</span>
                </div>
              )}

              {extractedData.healthMetrics?.bloodGlucose && (
                <div className="data-group">
                  <label>Blood Glucose:</label>
                  <span>{extractedData.healthMetrics.bloodGlucose} mg/dL</span>
                </div>
              )}

              {/* Lifestyle */}
              {extractedData.lifestyle?.smokingStatus && (
                <div className="data-group">
                  <label>Smoking Status:</label>
                  <span>{extractedData.lifestyle.smokingStatus}</span>
                </div>
              )}

              {extractedData.lifestyle?.alcoholConsumption && (
                <div className="data-group">
                  <label>Alcohol Consumption:</label>
                  <span>{extractedData.lifestyle.alcoholConsumption}</span>
                </div>
              )}

              {extractedData.lifestyle?.exerciseFrequency && (
                <div className="data-group">
                  <label>Exercise Frequency:</label>
                  <span>{extractedData.lifestyle.exerciseFrequency}</span>
                </div>
              )}

              {extractedData.lifestyle?.dietType && (
                <div className="data-group">
                  <label>Diet Type:</label>
                  <span>{extractedData.lifestyle.dietType}</span>
                </div>
              )}

              {extractedData.lifestyle?.otherFactors && (
                <div className="data-group">
                  <label>Other Lifestyle Factors:</label>
                  <span>{extractedData.lifestyle.otherFactors}</span>
                </div>
              )}

              {/* Additional Notes */}
              {extractedData.extractedNotes && (
                <div className="data-group notes">
                  <label>Additional Notes:</label>
                  <span>{extractedData.extractedNotes}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="result-actions">
            <button className="apply-data-btn" onClick={handleApplyData}>
              ✅ Apply to Intake Form
            </button>
            <button className="clear-btn" onClick={handleClearFile}>
              🔄 Upload Another
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
