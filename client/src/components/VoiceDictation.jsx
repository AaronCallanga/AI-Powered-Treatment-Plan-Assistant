import { useState, useEffect, useRef } from "react";
import { consultationAPI } from "../api/patientAPI";
import {
  MicIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  SuccessIcon,
  TrashIcon,
  AIIcon,
  DocumentIcon,
  SearchIcon,
  RefreshIcon,
  ErrorIcon,
} from "./Icons";
import LoadingSpinner from "./LoadingSpinner";
import "./LoadingSpinner.css";
import "./VoiceDictation.css";

const VoiceDictation = ({ onDataExtracted, onClose }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [status, setStatus] = useState("ready");
  const [transcript, setTranscript] = useState("");
  const [extractedData, setExtractedData] = useState(null);
  const [error, setError] = useState("");

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

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
      const file = new File([audioBlob], "recording.webm", {
        type: "audio/webm",
      });

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
        <MicIcon size={24} />
        <div>
          <h2>Voice Dictation</h2>
          <p>
            Record the patient consultation and let AI extract the information
          </p>
        </div>
      </div>

      {error && <div className="dictation-error">{error}</div>}

      {/* Recording Controls */}
      {status === "ready" || status === "recording" ? (
        <div className="recording-section">
          {!isRecording && !audioBlob && (
            <div className="ready-state">
              <div className="mic-icon-large">
                <MicIcon size={48} />
              </div>
              <p>Click the button below to start recording</p>
              <button
                type="button"
                className="btn-start-recording"
                onClick={startRecording}
              >
                <MicIcon size={20} />
                <span>Start Recording</span>
              </button>
            </div>
          )}

          {isRecording && (
            <div className="recording-state">
              <div
                className={`recording-indicator ${isPaused ? "paused" : ""}`}
              >
                {isPaused ? (
                  <PauseIcon size={32} />
                ) : (
                  <div className="pulse-ring"></div>
                )}
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
                    <PauseIcon size={18} />
                    <span>Pause</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-resume"
                    onClick={resumeRecording}
                  >
                    <PlayIcon size={18} />
                    <span>Resume</span>
                  </button>
                )}
                <button
                  type="button"
                  className="btn-stop"
                  onClick={stopRecording}
                >
                  <StopIcon size={18} />
                  <span>Stop</span>
                </button>
              </div>
            </div>
          )}

          {audioBlob && status === "ready" && (
            <div className="recorded-state">
              <div className="success-icon">
                <SuccessIcon size={40} />
              </div>
              <p>Recording complete ({formatTime(recordingTime)})</p>
              <div className="recorded-controls">
                <button
                  type="button"
                  className="btn-discard"
                  onClick={handleDiscard}
                >
                  <TrashIcon size={18} />
                  <span>Discard</span>
                </button>
                <button
                  type="button"
                  className="btn-process"
                  onClick={processRecording}
                >
                  <AIIcon size={18} />
                  <span>Process with AI</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Processing State */}
      {status === "processing" && (
        <div className="processing-state">
          <LoadingSpinner size="lg" />
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
            <SuccessIcon size={32} />
            <h3>Processing Complete!</h3>
          </div>

          {transcript && (
            <div className="transcript-preview">
              <h4>
                <DocumentIcon size={18} />
                <span>Transcript</span>
              </h4>
              <div className="transcript-box">{transcript}</div>
            </div>
          )}

          <div className="extracted-summary">
            <h4>
              <SearchIcon size={18} />
              <span>Extracted Information</span>
            </h4>
            <div className="summary-grid">
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
              {extractedData.primaryComplaint?.condition && (
                <div className="summary-item">
                  <strong>Primary Complaint:</strong>{" "}
                  {extractedData.primaryComplaint.condition}
                </div>
              )}
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
              {extractedData.healthMetrics?.age && (
                <div className="summary-item">
                  <strong>Age:</strong> {extractedData.healthMetrics.age} years
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
              <RefreshIcon size={18} />
              <span>Record Again</span>
            </button>
            <button
              type="button"
              className="btn-apply"
              onClick={handleApplyData}
            >
              <SuccessIcon size={18} />
              <span>Apply to Form</span>
            </button>
          </div>
        </div>
      )}

      {/* Error State */}
      {status === "error" && (
        <div className="error-state">
          <ErrorIcon size={40} />
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
