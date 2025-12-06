import { useState } from "react";
import { consultationAPI } from "../api/patientAPI";
import {
  DocumentIcon,
  AIIcon,
  SuccessIcon,
  ErrorIcon,
  RefreshIcon,
  SearchIcon,
  CloseIcon,
  ClipboardIcon,
} from "./Icons";
import LoadingSpinner from "./LoadingSpinner";
import "./NaturalLanguageInput.css";

const EXAMPLE_TEXT = `Patient: John Smith, Male, DOB: 1985-03-15
Chief Complaint: Experiencing erectile dysfunction for the past 6 months, moderate severity.
Medical History: Type 2 Diabetes (diagnosed 2018), Hypertension
Current Medications: Metformin 500mg twice daily, Lisinopril 10mg once daily
Allergies: Penicillin, Sulfa drugs
Family History: Father had heart disease, Mother has diabetes
Vitals: Height 180cm, Weight 85kg, BP 130/85, Heart Rate 72
Lifestyle: Former smoker (quit 2020), Occasional alcohol, Light exercise 2x/week`;

const NaturalLanguageInput = ({ onDataExtracted, onClose }) => {
  const [inputText, setInputText] = useState("");
  const [status, setStatus] = useState("ready"); // ready, processing, complete, error
  const [extractedData, setExtractedData] = useState(null);
  const [error, setError] = useState("");

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInputText(text);
    } catch (err) {
      setError("Failed to read from clipboard. Please paste manually.");
    }
  };

  const handleLoadExample = () => {
    setInputText(EXAMPLE_TEXT);
  };

  const handleProcess = async () => {
    if (!inputText.trim()) {
      setError("Please enter some text to process.");
      return;
    }

    setStatus("processing");
    setError("");

    try {
      const response = await consultationAPI.extractFromText(inputText);

      if (response.data.success) {
        setExtractedData(response.data.data.extractedData);
        setStatus("complete");
      } else {
        throw new Error(response.data.message || "Processing failed");
      }
    } catch (err) {
      console.error("Error processing text:", err);
      setError(
        err.response?.data?.message ||
          "Failed to extract data. Please try again."
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

  const handleReset = () => {
    setInputText("");
    setExtractedData(null);
    setStatus("ready");
    setError("");
  };

  return (
    <div className="natural-language-input">
      <div className="nl-header">
        <DocumentIcon size={24} />
        <div>
          <h2>Natural Language Input</h2>
          <p>Paste or type patient information and let AI extract the data</p>
        </div>
      </div>

      {error && (
        <div className="nl-error">
          <ErrorIcon size={16} />
          <span>{error}</span>
          <button type="button" onClick={() => setError("")}>
            <CloseIcon size={14} />
          </button>
        </div>
      )}

      {/* Input State */}
      {(status === "ready" || status === "error") && (
        <div className="nl-input-section">
          <div className="nl-input-header">
            <label>Patient Information</label>
            <div className="nl-input-actions">
              <button
                type="button"
                className="btn-action"
                onClick={handlePasteFromClipboard}
                title="Paste from clipboard"
              >
                <ClipboardIcon size={16} />
                <span>Paste</span>
              </button>
              <button
                type="button"
                className="btn-action"
                onClick={handleLoadExample}
                title="Load example"
              >
                <DocumentIcon size={16} />
                <span>Example</span>
              </button>
            </div>
          </div>
          <textarea
            className="nl-textarea"
            placeholder="Enter patient information in natural language...

Example:
Patient John Doe, 45 year old male, complaining of chronic back pain for 3 months. 
Medical history includes hypertension and type 2 diabetes.
Currently taking Metformin 500mg twice daily and Lisinopril 10mg daily.
Allergic to penicillin.
Height: 175cm, Weight: 82kg, BP: 135/85
Non-smoker, occasional alcohol consumption."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={12}
          />
          <div className="nl-input-footer">
            <span className="char-count">{inputText.length} characters</span>
            <button
              type="button"
              className="btn-process"
              onClick={handleProcess}
              disabled={!inputText.trim()}
            >
              <AIIcon size={18} />
              <span>Extract with AI</span>
            </button>
          </div>
        </div>
      )}

      {/* Processing State */}
      {status === "processing" && (
        <div className="nl-processing">
          <LoadingSpinner size="lg" />
          <p>Analyzing text with AI...</p>
          <p className="processing-hint">
            Extracting patient demographics, medical history, medications, and
            more.
          </p>
        </div>
      )}

      {/* Complete State */}
      {status === "complete" && extractedData && (
        <div className="nl-complete">
          <div className="success-header">
            <SuccessIcon size={32} />
            <h3>Data Extracted Successfully!</h3>
          </div>

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
                  {extractedData.primaryComplaint.condition.replace(/_/g, " ")}
                </div>
              )}
              {extractedData.primaryComplaint?.severity && (
                <div className="summary-item">
                  <strong>Severity:</strong>{" "}
                  {extractedData.primaryComplaint.severity}
                </div>
              )}
              {extractedData.primaryComplaint?.duration && (
                <div className="summary-item">
                  <strong>Duration:</strong>{" "}
                  {extractedData.primaryComplaint.duration}
                </div>
              )}
              {extractedData.medicalHistory?.conditions?.length > 0 && (
                <div className="summary-item full-width">
                  <strong>Conditions:</strong>{" "}
                  {extractedData.medicalHistory.conditions.join(", ")}
                </div>
              )}
              {extractedData.medicalHistory?.allergies?.length > 0 && (
                <div className="summary-item full-width">
                  <strong>Allergies:</strong>{" "}
                  {extractedData.medicalHistory.allergies.join(", ")}
                </div>
              )}
              {extractedData.medicalHistory?.familyHistory?.length > 0 && (
                <div className="summary-item full-width">
                  <strong>Family History:</strong>{" "}
                  {extractedData.medicalHistory.familyHistory.join(", ")}
                </div>
              )}
              {extractedData.currentMedications?.length > 0 && (
                <div className="summary-item full-width">
                  <strong>Current Medications:</strong>{" "}
                  {extractedData.currentMedications
                    .map((m) => {
                      const parts = [m.drugName || m.name];
                      if (m.dosage) parts.push(m.dosage);
                      if (m.frequency) parts.push(m.frequency);
                      return parts.join(" ");
                    })
                    .filter(Boolean)
                    .join("; ")}
                </div>
              )}
              {(extractedData.healthMetrics?.height ||
                extractedData.healthMetrics?.weight) && (
                <div className="summary-item">
                  <strong>Height/Weight:</strong>{" "}
                  {extractedData.healthMetrics.height
                    ? `${extractedData.healthMetrics.height}cm`
                    : "N/A"}{" "}
                  /{" "}
                  {extractedData.healthMetrics.weight
                    ? `${extractedData.healthMetrics.weight}kg`
                    : "N/A"}
                </div>
              )}
              {extractedData.healthMetrics?.bloodPressure?.systolic && (
                <div className="summary-item">
                  <strong>Blood Pressure:</strong>{" "}
                  {extractedData.healthMetrics.bloodPressure.systolic}/
                  {extractedData.healthMetrics.bloodPressure.diastolic}
                </div>
              )}
              {extractedData.lifestyle?.smokingStatus && (
                <div className="summary-item">
                  <strong>Smoking:</strong>{" "}
                  {extractedData.lifestyle.smokingStatus}
                </div>
              )}
              {extractedData.lifestyle?.alcoholConsumption && (
                <div className="summary-item">
                  <strong>Alcohol:</strong>{" "}
                  {extractedData.lifestyle.alcoholConsumption}
                </div>
              )}
            </div>
          </div>

          <div className="nl-complete-actions">
            <button type="button" className="btn-reset" onClick={handleReset}>
              <RefreshIcon size={18} />
              <span>Start Over</span>
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
    </div>
  );
};

export default NaturalLanguageInput;
