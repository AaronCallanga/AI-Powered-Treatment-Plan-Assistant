import { useState, useEffect, useRef } from "react";
import { consultationAPI } from "../api/patientAPI";
import "./VoiceDictation.css";

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

const VoiceDictation = ({ onDataExtracted, onClose }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [status, setStatus] = useState("ready"); // ready, recording, processing, complete, error
  const [transcript, setTranscript] = useState("");
  const [extractedData, setExtractedData] = useState(null);
  const [error, setError] = useState("");

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      setError("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setIsPaused(false);
      setStatus("recording");
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Error starting recording:", err);
      setError(
        "Failed to access microphone. Please check permissions and try again."
      );
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setStatus("ready");
    }
  };

  const processRecording = async () => {
    if (!audioBlob) return;

    setStatus("processing");
    setError("");

    try {
      // Convert blob to file
      const file = new File([audioBlob], "recording.webm", {
        type: "audio/webm",
      });

      // Upload and process
      const response = await consultationAPI.uploadMedia(file);

      if (response.data.success) {
        setTranscript(response.data.data.transcript);
        setExtractedData(response.data.data.extractedData);
        setStatus("complete");
      } else {
        throw new Error(response.data.message || "Processing failed");
      }
    } catch (err) {
      console.error("Error processing recording:", err);
      setError(
        err.response?.data?.message ||
          "Failed to process recording. Please try again."
      );
      setStatus("error");
    }
  };

  const handleApplyData = () => {
    if (extractedData && onDataExtracted) {
      onDataExtracted(extractedData);
      onClose();
    }
  };

  const handleDiscard = () => {
    setAudioBlob(null);
    setTranscript("");
    setExtractedData(null);
    setStatus("ready");
    setRecordingTime(0);
    audioChunksRef.current = [];
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="voice-dictation">
      <div className="dictation-header">
        <h2>🎤 Voice Dictation</h2>
        <p>
          Record the patient consultation and let AI extract the information
        </p>
      </div>

      {error && <div className="dictation-error">{error}</div>}

      {/* Recording Controls */}
      {status === "ready" || status === "recording" ? (
        <div className="recording-section">
          {!isRecording && !audioBlob && (
            <div className="ready-state">
              <div className="mic-icon">🎤</div>
              <p>Click the button below to start recording</p>
              <button
                type="button"
                className="btn-start-recording"
                onClick={startRecording}
              >
                Start Recording
              </button>
            </div>
          )}

          {isRecording && (
            <div className="recording-state">
              <div
                className={`recording-indicator ${isPaused ? "paused" : ""}`}
              >
                {isPaused ? "⏸️" : "🔴"}
              </div>
              <div className="recording-time">{formatTime(recordingTime)}</div>
              <p className="recording-status">
                {isPaused ? "Recording paused" : "Recording..."}
              </p>
              <div className="recording-controls">
                {!isPaused ? (
                  <button
                    type="button"
                    className="btn-pause"
                    onClick={pauseRecording}
                  >
                    ⏸️ Pause
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-resume"
                    onClick={resumeRecording}
                  >
                    ▶️ Resume
                  </button>
                )}
                <button
                  type="button"
                  className="btn-stop"
                  onClick={stopRecording}
                >
                  ⏹️ Stop
                </button>
              </div>
            </div>
          )}

          {audioBlob && status === "ready" && (
            <div className="recorded-state">
              <div className="success-icon">✅</div>
              <p>Recording complete ({formatTime(recordingTime)})</p>
              <div className="recorded-controls">
                <button
                  type="button"
                  className="btn-discard"
                  onClick={handleDiscard}
                >
                  🗑️ Discard
                </button>
                <button
                  type="button"
                  className="btn-process"
                  onClick={processRecording}
                >
                  🤖 Process with AI
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Processing State */}
      {status === "processing" && (
        <div className="processing-state">
          <div className="processing-spinner"></div>
          <p>Processing recording with AI...</p>
          <p className="processing-hint">
            This may take a moment. We're transcribing and extracting patient
            information.
          </p>
        </div>
      )}

      {/* Complete State */}
      {status === "complete" && extractedData && (
        <div className="complete-state">
          <div className="success-header">
            <div className="success-icon">✅</div>
            <h3>Processing Complete!</h3>
          </div>

          {/* Transcript Preview */}
          {transcript && (
            <div className="transcript-preview">
              <h4>📝 Transcript</h4>
              <div className="transcript-box">{transcript}</div>
            </div>
          )}

          {/* Extracted Data Summary */}
          <div className="extracted-summary">
            <h4>🔍 Extracted Information</h4>
            <div className="summary-grid">
              {/* Basic Info */}
              {extractedData.firstName && (
                <div className="summary-item">
                  <strong>Name:</strong> {extractedData.firstName}{" "}
                  {extractedData.lastName}
                </div>
              )}
              {extractedData.dateOfBirth && (
                <div className="summary-item">
                  <strong>DOB:</strong> {extractedData.dateOfBirth}
                </div>
              )}
              {extractedData.gender && (
                <div className="summary-item">
                  <strong>Gender:</strong> {extractedData.gender}
                </div>
              )}

              {/* Primary Complaint */}
              {extractedData.primaryComplaint?.condition && (
                <div className="summary-item">
                  <strong>Primary Complaint:</strong>{" "}
                  {extractedData.primaryComplaint.condition}
                </div>
              )}
              {extractedData.primaryComplaint?.description && (
                <div className="summary-item">
                  <strong>Symptoms:</strong>{" "}
                  {extractedData.primaryComplaint.description}
                </div>
              )}
              {extractedData.primaryComplaint?.duration && (
                <div className="summary-item">
                  <strong>Duration:</strong>{" "}
                  {extractedData.primaryComplaint.duration}
                </div>
              )}
              {extractedData.primaryComplaint?.severity && (
                <div className="summary-item">
                  <strong>Severity:</strong>{" "}
                  {extractedData.primaryComplaint.severity}
                </div>
              )}

              {/* Medical History */}
              {extractedData.medicalHistory?.conditions?.length > 0 && (
                <div className="summary-item">
                  <strong>Conditions:</strong>{" "}
                  {extractedData.medicalHistory.conditions.join(", ")}
                </div>
              )}
              {extractedData.medicalHistory?.allergies?.length > 0 && (
                <div className="summary-item">
                  <strong>Allergies:</strong>{" "}
                  {extractedData.medicalHistory.allergies.join(", ")}
                </div>
              )}
              {extractedData.medicalHistory?.surgeries && (
                <div className="summary-item">
                  <strong>Surgeries:</strong>{" "}
                  {extractedData.medicalHistory.surgeries}
                </div>
              )}
              {extractedData.medicalHistory?.familyHistory?.length > 0 && (
                <div className="summary-item">
                  <strong>Family History:</strong>{" "}
                  {extractedData.medicalHistory.familyHistory.join(", ")}
                </div>
              )}

              {/* Medications */}
              {extractedData.currentMedications?.length > 0 && (
                <div className="summary-item">
                  <strong>Current Medications:</strong>{" "}
                  {extractedData.currentMedications
                    .map((m) =>
                      m.dosage
                        ? `${m.drugName} ${m.dosage} ${m.frequency}`
                        : m.drugName
                    )
                    .filter(Boolean)
                    .join("; ")}
                </div>
              )}

              {/* Health Metrics */}
              {extractedData.healthMetrics?.age && (
                <div className="summary-item">
                  <strong>Age:</strong> {extractedData.healthMetrics.age} years
                </div>
              )}
              {extractedData.healthMetrics?.weight && (
                <div className="summary-item">
                  <strong>Weight:</strong> {extractedData.healthMetrics.weight}{" "}
                  kg
                </div>
              )}
              {extractedData.healthMetrics?.height && (
                <div className="summary-item">
                  <strong>Height:</strong> {extractedData.healthMetrics.height}{" "}
                  cm
                </div>
              )}
              {extractedData.healthMetrics?.bloodPressure?.systolic && (
                <div className="summary-item">
                  <strong>Blood Pressure:</strong>{" "}
                  {extractedData.healthMetrics.bloodPressure.systolic}/
                  {extractedData.healthMetrics.bloodPressure.diastolic} mmHg
                </div>
              )}
              {extractedData.healthMetrics?.heartRate && (
                <div className="summary-item">
                  <strong>Heart Rate:</strong>{" "}
                  {extractedData.healthMetrics.heartRate} bpm
                </div>
              )}
              {extractedData.healthMetrics?.bloodGlucose && (
                <div className="summary-item">
                  <strong>Blood Glucose:</strong>{" "}
                  {extractedData.healthMetrics.bloodGlucose} mg/dL
                </div>
              )}

              {/* Lifestyle */}
              {extractedData.lifestyle?.smokingStatus && (
                <div className="summary-item">
                  <strong>Smoking Status:</strong>{" "}
                  {extractedData.lifestyle.smokingStatus}
                </div>
              )}
              {extractedData.lifestyle?.alcoholConsumption && (
                <div className="summary-item">
                  <strong>Alcohol:</strong>{" "}
                  {extractedData.lifestyle.alcoholConsumption}
                </div>
              )}
              {extractedData.lifestyle?.exerciseFrequency && (
                <div className="summary-item">
                  <strong>Exercise:</strong>{" "}
                  {extractedData.lifestyle.exerciseFrequency}
                </div>
              )}
              {extractedData.lifestyle?.dietType && (
                <div className="summary-item">
                  <strong>Diet:</strong> {extractedData.lifestyle.dietType}
                </div>
              )}
              {extractedData.lifestyle?.otherFactors && (
                <div className="summary-item">
                  <strong>Other Factors:</strong>{" "}
                  {extractedData.lifestyle.otherFactors}
                </div>
              )}
            </div>
          </div>

          <div className="complete-actions">
            <button
              type="button"
              className="btn-discard"
              onClick={handleDiscard}
            >
              🔄 Record Again
            </button>
            <button
              type="button"
              className="btn-apply"
              onClick={handleApplyData}
            >
              ✅ Apply to Form
            </button>
          </div>
        </div>
      )}

      {/* Error State */}
      {status === "error" && (
        <div className="error-state">
          <div className="error-icon">❌</div>
          <p>Failed to process recording</p>
          <button
            type="button"
            className="btn-retry"
            onClick={() => {
              setStatus("ready");
              setError("");
            }}
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
};

export default VoiceDictation;
