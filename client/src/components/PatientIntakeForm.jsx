import { useState } from "react";
import { patientAPI } from "../api/patientAPI";
import ConsultationUpload from "./ConsultationUpload";
import VoiceDictation from "./VoiceDictation";
import DocumentUpload from "./DocumentUpload";
import "./PatientIntakeForm.css";

const initialFormState = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  gender: "",
  medicalHistory: {
    conditions: [],
    conditionsOther: "",
    allergies: [],
    allergiesOther: "",
    surgeries: "",
    familyHistory: [],
    familyHistoryOther: "",
  },
  currentMedications: [],
  healthMetrics: {
    age: "",
    weight: "",
    height: "",
    bloodPressure: { systolic: "", diastolic: "" },
    heartRate: "",
    bloodGlucose: "",
  },
  lifestyle: {
    smokingStatus: "never",
    alcoholConsumption: "none",
    exerciseFrequency: "sedentary",
    dietType: "",
    otherFactors: "",
  },
  primaryComplaint: {
    condition: "",
    description: "",
    duration: "",
    severity: "mild",
  },
};

const CONDITIONS_OPTIONS = [
  { value: "diabetes", label: "Diabetes" },
  { value: "hypertension", label: "Hypertension" },
  { value: "heart_disease", label: "Heart Disease" },
  { value: "asthma", label: "Asthma" },
  { value: "arthritis", label: "Arthritis" },
  { value: "depression", label: "Depression" },
  { value: "anxiety", label: "Anxiety" },
  { value: "thyroid_disorder", label: "Thyroid Disorder" },
  { value: "pcos", label: "PCOS" },
  { value: "hyperlipidemia", label: "High Cholesterol" },
];

const ALLERGY_OPTIONS = [
  { value: "penicillin", label: "Penicillin" },
  { value: "sulfa", label: "Sulfa Drugs" },
  { value: "aspirin", label: "Aspirin" },
  { value: "ibuprofen", label: "Ibuprofen" },
  { value: "latex", label: "Latex" },
  { value: "shellfish", label: "Shellfish" },
  { value: "peanuts", label: "Peanuts" },
  { value: "eggs", label: "Eggs" },
];

const FAMILY_HISTORY_OPTIONS = [
  { value: "heart_disease", label: "Heart Disease" },
  { value: "diabetes", label: "Diabetes" },
  { value: "cancer", label: "Cancer" },
  { value: "stroke", label: "Stroke" },
  { value: "hypertension", label: "Hypertension" },
  { value: "mental_illness", label: "Mental Illness" },
];

export default function PatientIntakeForm({ onSubmitSuccess }) {
  const [formData, setFormData] = useState(initialFormState);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [showConsultationUpload, setShowConsultationUpload] = useState(false);
  const [showVoiceDictation, setShowVoiceDictation] = useState(false);
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);

  // Handle extracted data from consultation upload
  const handleConsultationDataExtracted = (extractedData) => {
    console.log("=== RECEIVED EXTRACTED DATA ===");
    console.log(JSON.stringify(extractedData, null, 2));
    console.log("===============================");

    // Map extracted data to form structure
    setFormData((prev) => {
      const newFormData = { ...prev };

      // Basic info
      if (extractedData.firstName)
        newFormData.firstName = extractedData.firstName;
      if (extractedData.lastName) newFormData.lastName = extractedData.lastName;
      if (extractedData.dateOfBirth)
        newFormData.dateOfBirth = extractedData.dateOfBirth;
      if (extractedData.gender) newFormData.gender = extractedData.gender;

      // Medical History
      if (extractedData.medicalHistory) {
        const mh = extractedData.medicalHistory;

        console.log("[MEDICAL HISTORY DEBUG] Raw medicalHistory:", mh);
        console.log(
          "[MEDICAL HISTORY DEBUG] Family history array:",
          mh.familyHistory
        );

        // Map conditions to form values
        const mappedConditions =
          mh.conditions
            ?.map((c) => mapConditionToFormValue(c))
            .filter((c) => c !== null) || [];

        // Map allergies to form values
        const mappedAllergies =
          mh.allergies
            ?.map((a) => mapAllergyToFormValue(a))
            .filter((a) => a !== null) || [];

        // Map family history to form values
        const mappedFamilyHistory =
          mh.familyHistory
            ?.map((f) => {
              const mapped = mapFamilyHistoryToFormValue(f);
              console.log("[FAMILY HISTORY DEBUG] Mapping:", f, "->", mapped);
              return mapped;
            })
            .filter((f) => f !== null) || [];

        console.log(
          "[FAMILY HISTORY DEBUG] Final mapped array:",
          mappedFamilyHistory
        );

        newFormData.medicalHistory = {
          ...prev.medicalHistory,
          conditions:
            mappedConditions.length > 0
              ? mappedConditions
              : prev.medicalHistory.conditions,
          conditionsOther:
            mh.conditions?.length > 0
              ? mh.conditions.join(", ")
              : prev.medicalHistory.conditionsOther,
          allergies:
            mappedAllergies.length > 0
              ? mappedAllergies
              : prev.medicalHistory.allergies,
          allergiesOther:
            mh.allergies?.length > 0
              ? mh.allergies.join(", ")
              : prev.medicalHistory.allergiesOther,
          surgeries: mh.surgeries || prev.medicalHistory.surgeries,
          familyHistory:
            mappedFamilyHistory.length > 0
              ? mappedFamilyHistory
              : prev.medicalHistory.familyHistory,
          familyHistoryOther:
            mh.familyHistory?.length > 0
              ? mh.familyHistory.join(", ")
              : prev.medicalHistory.familyHistoryOther,
        };

        console.log(
          "[MEDICAL HISTORY DEBUG] Final familyHistory in form:",
          newFormData.medicalHistory.familyHistory
        );
      }

      // Current Medications - handle both array formats
      const medications = extractedData.currentMedications || [];
      if (medications.length > 0) {
        newFormData.currentMedications = medications.map((med) => ({
          drugName: med.drugName || med.name || "",
          dosage: med.dosage || "",
          frequency: med.frequency || "",
        }));
      }

      // Health Metrics - handle both nested and flat structures
      const healthMetrics = extractedData.healthMetrics || extractedData;

      // Update age
      if (healthMetrics.age || extractedData.age) {
        newFormData.healthMetrics.age = extractNumericValue(
          healthMetrics.age || extractedData.age
        );
      }

      // Update weight
      if (healthMetrics.weight || extractedData.weight) {
        newFormData.healthMetrics.weight = extractNumericValue(
          healthMetrics.weight || extractedData.weight
        );
      }

      // Update height
      if (healthMetrics.height || extractedData.height) {
        newFormData.healthMetrics.height = extractNumericValue(
          healthMetrics.height || extractedData.height
        );
      }

      // Update blood pressure
      const bp = healthMetrics.bloodPressure || extractedData.bloodPressure;
      if (bp) {
        console.log("[BP DEBUG] Blood pressure value:", bp, "Type:", typeof bp);

        // Handle object format: { systolic: 120, diastolic: 80 }
        if (typeof bp === "object" && bp.systolic && bp.diastolic) {
          newFormData.healthMetrics.bloodPressure = {
            systolic: String(bp.systolic),
            diastolic: String(bp.diastolic),
          };
          console.log(
            "[BP DEBUG] Used object format:",
            newFormData.healthMetrics.bloodPressure
          );
        }
        // Handle string format: "120/80"
        else {
          const parsed = parseBP(String(bp));
          if (parsed && parsed.systolic) {
            newFormData.healthMetrics.bloodPressure = parsed;
            console.log("[BP DEBUG] Parsed string format:", parsed);
          }
        }
      }

      // Update heart rate
      if (healthMetrics.heartRate || extractedData.heartRate) {
        newFormData.healthMetrics.heartRate = extractNumericValue(
          healthMetrics.heartRate || extractedData.heartRate
        );
      }

      // Update blood glucose
      if (healthMetrics.bloodGlucose || extractedData.bloodGlucose) {
        newFormData.healthMetrics.bloodGlucose = String(
          healthMetrics.bloodGlucose || extractedData.bloodGlucose
        ).trim();
      }

      // Lifestyle - handle both nested and flat structures
      const lifestyle = extractedData.lifestyle || extractedData;

      if (lifestyle.smokingStatus || extractedData.smokingStatus) {
        const status = mapSmokingStatus(
          lifestyle.smokingStatus || extractedData.smokingStatus
        );
        if (status) newFormData.lifestyle.smokingStatus = status;
      }

      if (lifestyle.alcoholConsumption || extractedData.alcoholConsumption) {
        const alcohol = mapAlcoholConsumption(
          lifestyle.alcoholConsumption || extractedData.alcoholConsumption
        );
        if (alcohol) newFormData.lifestyle.alcoholConsumption = alcohol;
      }

      if (lifestyle.exerciseFrequency || extractedData.exerciseFrequency) {
        const exercise = mapExerciseFrequency(
          lifestyle.exerciseFrequency || extractedData.exerciseFrequency
        );
        if (exercise) newFormData.lifestyle.exerciseFrequency = exercise;
      }

      if (lifestyle.dietType || extractedData.dietType) {
        const dietValue = lifestyle.dietType || extractedData.dietType;
        console.log("[DIET DEBUG] Diet type value:", dietValue);
        newFormData.lifestyle.dietType = dietValue;
      }

      // Primary Complaint - handle both nested and flat structures
      const primaryComplaint = extractedData.primaryComplaint || {};

      console.log("[PRIMARY COMPLAINT DEBUG] Raw data:", primaryComplaint);

      if (primaryComplaint.condition) {
        console.log(
          "[PRIMARY COMPLAINT DEBUG] Setting condition:",
          primaryComplaint.condition
        );
        newFormData.primaryComplaint.condition = primaryComplaint.condition;
      }

      if (primaryComplaint.description) {
        console.log(
          "[PRIMARY COMPLAINT DEBUG] Setting description:",
          primaryComplaint.description
        );
        newFormData.primaryComplaint.description = primaryComplaint.description;
      }

      if (primaryComplaint.duration) {
        console.log(
          "[PRIMARY COMPLAINT DEBUG] Setting duration:",
          primaryComplaint.duration
        );
        newFormData.primaryComplaint.duration = primaryComplaint.duration;
      }

      if (primaryComplaint.severity) {
        const severity = mapSeverity(primaryComplaint.severity);
        console.log(
          "[PRIMARY COMPLAINT DEBUG] Severity input:",
          primaryComplaint.severity,
          "Mapped:",
          severity
        );
        if (severity) newFormData.primaryComplaint.severity = severity;
      }

      return newFormData;
    });

    // Close the upload modal and show success message
    setShowConsultationUpload(false);
    setShowDocumentUpload(false);
    setMessage({
      type: "success",
      text: "Patient data extracted from consultation! Please review and make any necessary corrections.",
    });
  };

  // Helper function to map extracted condition names to form values
  const mapConditionToFormValue = (conditionName) => {
    if (!conditionName) return null;

    const lower = conditionName.toLowerCase().trim();
    const mapping = {
      diabetes: "diabetes",
      hypertension: "hypertension",
      "high blood pressure": "hypertension",
      "heart disease": "heart_disease",
      asthma: "asthma",
      arthritis: "arthritis",
      depression: "depression",
      anxiety: "anxiety",
      "thyroid disorder": "thyroid_disorder",
      thyroid: "thyroid_disorder",
      pcos: "pcos",
      "high cholesterol": "hyperlipidemia",
      hyperlipidemia: "hyperlipidemia",
      cholesterol: "hyperlipidemia",
    };

    return mapping[lower] || null;
  };

  // Helper function to map extracted allergy names to form values
  const mapAllergyToFormValue = (allergyName) => {
    if (!allergyName) return null;

    const lower = allergyName.toLowerCase().trim();
    const mapping = {
      penicillin: "penicillin",
      sulfa: "sulfa",
      "sulfa drugs": "sulfa",
      aspirin: "aspirin",
      ibuprofen: "ibuprofen",
      latex: "latex",
      shellfish: "shellfish",
      peanuts: "peanuts",
      eggs: "eggs",
    };

    return mapping[lower] || null;
  };

  // Helper function to map extracted family history to form values
  const mapFamilyHistoryToFormValue = (historyName) => {
    if (!historyName) return null;

    const lower = historyName.toLowerCase().trim();
    const mapping = {
      "heart disease": "heart_disease",
      diabetes: "diabetes",
      cancer: "cancer",
      stroke: "stroke",
      hypertension: "hypertension",
      "high blood pressure": "hypertension",
      "mental illness": "mental_illness",
      "mental health": "mental_illness",
    };

    return mapping[lower] || null;
  };

  const parseBP = (bpString) => {
    if (!bpString) return { systolic: "", diastolic: "" };
    const match = bpString.match(/(\d+)\s*[\/\-]\s*(\d+)/);
    if (match) {
      return { systolic: match[1], diastolic: match[2] };
    }
    return { systolic: "", diastolic: "" };
  };

  const extractNumericValue = (value) => {
    if (!value) return "";
    // Extract number (including decimals) from string like "64 kg" or "182 cm"
    const match = String(value).match(/(\d+\.?\d*)/);
    return match ? match[1] : "";
  };

  const mapSmokingStatus = (status) => {
    if (!status) return null;
    const lower = status.toLowerCase();
    if (lower.includes("never") || lower.includes("non")) return "never";
    if (
      lower.includes("former") ||
      lower.includes("quit") ||
      lower.includes("ex")
    )
      return "former";
    if (
      lower.includes("current") ||
      lower.includes("yes") ||
      lower.includes("active")
    )
      return "current";
    return null;
  };

  const mapAlcoholConsumption = (consumption) => {
    if (!consumption) return null;
    const lower = consumption.toLowerCase();
    if (
      lower.includes("none") ||
      lower.includes("no") ||
      lower.includes("never")
    )
      return "none";
    if (
      lower.includes("occasional") ||
      lower.includes("social") ||
      lower.includes("rare")
    )
      return "occasional";
    if (lower.includes("moderate") || lower.includes("regular"))
      return "moderate";
    if (
      lower.includes("heavy") ||
      lower.includes("frequent") ||
      lower.includes("daily")
    )
      return "heavy";
    return null;
  };

  const mapExerciseFrequency = (frequency) => {
    if (!frequency) return null;
    const lower = frequency.toLowerCase();
    if (
      lower.includes("sedentary") ||
      lower.includes("none") ||
      lower.includes("no")
    )
      return "sedentary";
    if (lower.includes("light") || lower.includes("occasional")) return "light";
    if (lower.includes("moderate") || lower.includes("regular"))
      return "moderate";
    if (
      lower.includes("active") ||
      lower.includes("intense") ||
      lower.includes("high")
    )
      return "active";
    return null;
  };

  const mapSeverity = (severity) => {
    if (!severity) return null;
    if (typeof severity === "number") {
      if (severity <= 3) return "mild";
      if (severity <= 6) return "moderate";
      return "severe";
    }
    const lower = String(severity).toLowerCase();
    if (lower.includes("mild") || lower.includes("low")) return "mild";
    if (lower.includes("moderate") || lower.includes("medium"))
      return "moderate";
    if (
      lower.includes("severe") ||
      lower.includes("high") ||
      lower.includes("intense")
    )
      return "severe";
    return null;
  };

  const handleInputChange = (section, field, value) => {
    if (section) {
      setFormData((prev) => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value,
        },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleNestedChange = (section, parent, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [parent]: {
          ...prev[section][parent],
          [field]: value,
        },
      },
    }));
  };

  const handleCheckboxChange = (section, field, value, checked) => {
    setFormData((prev) => {
      const currentArray = prev[section][field];
      if (checked) {
        return {
          ...prev,
          [section]: {
            ...prev[section],
            [field]: [...currentArray, value],
          },
        };
      } else {
        return {
          ...prev,
          [section]: {
            ...prev[section],
            [field]: currentArray.filter((item) => item !== value),
          },
        };
      }
    });
  };

  const addMedication = () => {
    setFormData((prev) => ({
      ...prev,
      currentMedications: [
        ...prev.currentMedications,
        { drugName: "", dosage: "", frequency: "" },
      ],
    }));
  };

  const removeMedication = (index) => {
    setFormData((prev) => ({
      ...prev,
      currentMedications: prev.currentMedications.filter((_, i) => i !== index),
    }));
  };

  const updateMedication = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      currentMedications: prev.currentMedications.map((med, i) =>
        i === index ? { ...med, [field]: value } : med
      ),
    }));
  };

  const calculateAge = (dob) => {
    if (!dob) return "";
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  };

  const handleDateOfBirthChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      dateOfBirth: value,
      healthMetrics: {
        ...prev.healthMetrics,
        age: calculateAge(value),
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      // Parse "other" fields and merge with checkbox selections
      const parseOtherField = (value) =>
        value
          ? value
              .split(",")
              .map((s) => s.trim())
              .filter((s) => s)
          : [];

      // Merge conditions with other conditions
      const allConditions = [
        ...formData.medicalHistory.conditions,
        ...parseOtherField(formData.medicalHistory.conditionsOther),
      ];

      // Merge allergies with other allergies
      const allAllergies = [
        ...formData.medicalHistory.allergies,
        ...parseOtherField(formData.medicalHistory.allergiesOther),
      ];

      // Merge family history with other family history
      const allFamilyHistory = [
        ...formData.medicalHistory.familyHistory,
        ...parseOtherField(formData.medicalHistory.familyHistoryOther),
      ];

      // Prepare data for submission
      const submitData = {
        ...formData,
        medicalHistory: {
          conditions: allConditions,
          allergies: allAllergies,
          familyHistory: allFamilyHistory,
          surgeries: formData.medicalHistory.surgeries
            ? formData.medicalHistory.surgeries.split(",").map((s) => s.trim())
            : [],
        },
        lifestyle: {
          ...formData.lifestyle,
          // Keep otherFactors as a string for flexibility
        },
      };

      const response = await patientAPI.create(submitData);
      setMessage({
        type: "success",
        text: "Patient intake submitted successfully!",
      });
      setFormData(initialFormState);
      if (onSubmitSuccess) {
        onSubmitSuccess(response.data);
      }
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error.response?.data?.message ||
          "Failed to submit intake form. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="intake-form" onSubmit={handleSubmit}>
      <h1>🏥 Patient Intake Form</h1>
      <p className="subtitle">AI-Powered Clinical Assistant</p>

      {/* Consultation Upload Button */}
      <div className="consultation-upload-trigger">
        <button
          type="button"
          className="upload-consultation-btn"
          onClick={() => setShowConsultationUpload(true)}
        >
          📁 Upload Recording
        </button>
        <button
          type="button"
          className="voice-dictation-btn"
          onClick={() => setShowVoiceDictation(true)}
        >
          🎤 Live Voice Dictation
        </button>
        <button
          type="button"
          className="upload-document-btn"
          onClick={() => setShowDocumentUpload(true)}
        >
          📄 Upload Document
        </button>
        <span className="upload-hint">
          Upload recordings, documents, lab results, or use voice dictation to
          auto-fill the form with AI
        </span>
      </div>

      {/* Consultation Upload Modal */}
      {showConsultationUpload && (
        <div className="consultation-modal-overlay">
          <div className="consultation-modal">
            <button
              type="button"
              className="consultation-modal-close"
              onClick={() => setShowConsultationUpload(false)}
            >
              ✕
            </button>
            <ConsultationUpload
              onDataExtracted={handleConsultationDataExtracted}
              onClose={() => setShowConsultationUpload(false)}
            />
          </div>
        </div>
      )}

      {/* Voice Dictation Modal */}
      {showVoiceDictation && (
        <div className="consultation-modal-overlay">
          <div className="consultation-modal">
            <button
              type="button"
              className="consultation-modal-close"
              onClick={() => setShowVoiceDictation(false)}
            >
              ✕
            </button>
            <VoiceDictation
              onDataExtracted={handleConsultationDataExtracted}
              onClose={() => setShowVoiceDictation(false)}
            />
          </div>
        </div>
      )}

      {/* Document Upload Modal */}
      {showDocumentUpload && (
        <div className="consultation-modal-overlay">
          <div className="consultation-modal">
            <button
              type="button"
              className="consultation-modal-close"
              onClick={() => setShowDocumentUpload(false)}
            >
              ✕
            </button>
            <DocumentUpload
              onDataExtracted={handleConsultationDataExtracted}
              onClose={() => setShowDocumentUpload(false)}
            />
          </div>
        </div>
      )}

      {message.text && (
        <div className={`alert alert-${message.type}`}>{message.text}</div>
      )}

      {/* Basic Information */}
      <div className="form-section">
        <h2>📋 Basic Information</h2>
        <div className="form-row">
          <div className="form-group">
            <label style={{ color: "black" }}>First Name *</label>
            <input
              type="text"
              placeholder="e.g., John"
              style={{
                color: "black",
                border: "2px solid black", // Adds a 2px solid red border
              }}
              value={formData.firstName}
              onChange={(e) =>
                handleInputChange(null, "firstName", e.target.value)
              }
              required
            />
          </div>
          <div className="form-group">
            <label style={{ color: "black" }}>Last Name *</label>
            <input
              type="text"
              placeholder="e.g., Smith"
              style={{
                color: "black",
                border: "2px solid black",
              }}
              value={formData.lastName}
              onChange={(e) =>
                handleInputChange(null, "lastName", e.target.value)
              }
              required
            />
          </div>
          <div className="form-group">
            <label style={{ color: "black" }}>Date of Birth *</label>
            <input
              style={{
                color: "black",
                border: "2px solid black",
              }}
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => handleDateOfBirthChange(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label style={{ color: "black" }}>Gender</label>
            <select
              className="label-input"
              style={{
                color: "black",
                border: "2px solid black",
              }}
              value={formData.gender}
              onChange={(e) =>
                handleInputChange(null, "gender", e.target.value)
              }
            >
              <option value="">Select...</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Medical History */}
      <div className="form-section">
        <h2>📁 Medical History</h2>

        <div className="form-group">
          <label style={{ color: "black" }}>Existing Conditions</label>
          <div className="checkbox-group">
            {CONDITIONS_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="checkbox-item"
                style={{ color: "black" }}
              >
                <input
                  type="checkbox"
                  checked={formData.medicalHistory.conditions.includes(
                    option.value
                  )}
                  onChange={(e) =>
                    handleCheckboxChange(
                      "medicalHistory",
                      "conditions",
                      option.value,
                      e.target.checked
                    )
                  }
                />
                {option.label}
              </label>
            ))}
          </div>
          <div className="other-input-group" style={{ marginTop: "0.75rem" }}>
            <label className="other-label">
              Other conditions (comma-separated):
            </label>
            <input
              type="text"
              placeholder="e.g., COPD, Epilepsy, Chronic kidney disease"
              value={formData.medicalHistory.conditionsOther}
              onChange={(e) =>
                handleInputChange(
                  "medicalHistory",
                  "conditionsOther",
                  e.target.value
                )
              }
              style={{
                marginTop: "0.25rem",
                color: "black",
                border: "2px solid black",
              }}
            />
          </div>
        </div>

        <div className="form-group" style={{ marginTop: "1rem" }}>
          <label style={{ color: "black" }}>Known Allergies</label>
          <div className="checkbox-group">
            {ALLERGY_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="checkbox-item"
                style={{ color: "black" }}
              >
                <input
                  type="checkbox"
                  checked={formData.medicalHistory.allergies.includes(
                    option.value
                  )}
                  onChange={(e) =>
                    handleCheckboxChange(
                      "medicalHistory",
                      "allergies",
                      option.value,
                      e.target.checked
                    )
                  }
                />
                {option.label}
              </label>
            ))}
          </div>
          <div className="other-input-group" style={{ marginTop: "0.75rem" }}>
            <label className="other-label">
              Other allergies (comma-separated):
            </label>
            <input
              type="text"
              placeholder="e.g., Codeine, Dairy, Gluten, Bee stings"
              value={formData.medicalHistory.allergiesOther}
              onChange={(e) =>
                handleInputChange(
                  "medicalHistory",
                  "allergiesOther",
                  e.target.value
                )
              }
              style={{
                marginTop: "0.25rem",
                color: "black",
                border: "2px solid black",
              }}
            />
          </div>
        </div>

        <div className="form-row" style={{ marginTop: "1rem" }}>
          <div className="form-group">
            <label style={{ color: "black" }}>
              Previous Surgeries (comma-separated)
            </label>
            <input
              style={{
                marginTop: "0.25rem",
                color: "black",
                border: "2px solid black",
              }}
              type="text"
              placeholder="e.g., Appendectomy 2015, Knee surgery 2020"
              value={formData.medicalHistory.surgeries}
              onChange={(e) =>
                handleInputChange("medicalHistory", "surgeries", e.target.value)
              }
            />
          </div>
        </div>

        <div className="form-group" style={{ marginTop: "1rem" }}>
          <label style={{ color: "black" }}>Family History</label>
          <div className="checkbox-group">
            {FAMILY_HISTORY_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="checkbox-item"
                style={{ color: "black" }}
              >
                <input
                  type="checkbox"
                  checked={formData.medicalHistory.familyHistory.includes(
                    option.value
                  )}
                  onChange={(e) =>
                    handleCheckboxChange(
                      "medicalHistory",
                      "familyHistory",
                      option.value,
                      e.target.checked
                    )
                  }
                />
                {option.label}
              </label>
            ))}
          </div>
          <div className="other-input-group" style={{ marginTop: "0.75rem" }}>
            <label className="other-label">
              Other family history (comma-separated):
            </label>
            <input
              type="text"
              placeholder="e.g., Alzheimer's, Kidney disease, Autoimmune disorders"
              value={formData.medicalHistory.familyHistoryOther}
              onChange={(e) =>
                handleInputChange(
                  "medicalHistory",
                  "familyHistoryOther",
                  e.target.value
                )
              }
              style={{
                marginTop: "0.25rem",
                color: "black",
                border: "2px solid black",
              }}
            />
          </div>
        </div>
      </div>

      {/* Current Medications */}
      <div className="form-section">
        <h2>💊 Current Medications</h2>
        <div className="medication-list">
          {formData.currentMedications.map((med, index) => (
            <div key={index} className="medication-item">
              <div className="form-group">
                <label style={{ color: "black" }}>Drug Name</label>
                <input
                  style={{
                    marginTop: "0.25rem",
                    color: "black",
                    border: "2px solid black",
                  }}
                  type="text"
                  placeholder="e.g., Metformin"
                  value={med.drugName}
                  onChange={(e) =>
                    updateMedication(index, "drugName", e.target.value)
                  }
                />
              </div>
              <div className="form-group">
                <label style={{ color: "black" }}>Dosage</label>
                <input
                  style={{
                    marginTop: "0.25rem",
                    color: "black",
                    border: "2px solid black",
                  }}
                  type="text"
                  placeholder="e.g., 500mg"
                  value={med.dosage}
                  onChange={(e) =>
                    updateMedication(index, "dosage", e.target.value)
                  }
                />
              </div>
              <div className="form-group">
                <label style={{ color: "black" }}>Frequency</label>
                <input
                  style={{
                    marginTop: "0.25rem",
                    color: "black",
                    border: "2px solid black",
                  }}
                  type="text"
                  placeholder="e.g., twice daily"
                  value={med.frequency}
                  onChange={(e) =>
                    updateMedication(index, "frequency", e.target.value)
                  }
                />
              </div>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => removeMedication(index)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button type="button" className="btn btn-add" onClick={addMedication}>
          + Add Medication
        </button>
      </div>

      {/* Health Metrics */}
      <div className="form-section">
        <h2>📊 Health Metrics</h2>
        <div className="form-row">
          <div className="form-group">
            <label style={{ color: "black" }}>
              Age{" "}
              {formData.dateOfBirth && (
                <span style={{ fontSize: "0.8rem", color: "#212323ff" }}>
                  (auto-calculated)
                </span>
              )}
            </label>
            <input
              type="number"
              placeholder={
                formData.dateOfBirth ? "Auto-calculated from DOB" : "e.g., 35"
              }
              value={formData.healthMetrics.age}
              onChange={(e) =>
                handleInputChange("healthMetrics", "age", e.target.value)
              }
              readOnly={formData.dateOfBirth !== ""}
              style={
                formData.dateOfBirth
                  ? { backgroundColor: "#ffffffff", cursor: "not-allowed", color: "black", border: "2px solid black" }
                  : {
                      marginTop: "0.25rem",
                      color: "black",
                      border: "2px solid black",
                    }
              }
            />
          </div>
          <div className="form-group">
            <label style={{ color: "black" }}>Weight (kg)</label>
            <input
              placeholder="e.g., 75.5"
              style={{
                marginTop: "0.25rem",
                color: "black",
                border: "2px solid black",
              }}
              type="number"
              step="0.1"
              value={formData.healthMetrics.weight}
              onChange={(e) =>
                handleInputChange("healthMetrics", "weight", e.target.value)
              }
            />
          </div>
          <div className="form-group">
            <label style={{ color: "black" }}>Height (cm)</label>
            <input
              placeholder="e.g., 180"
              style={{
                marginTop: "0.25rem",
                color: "black",
                border: "2px solid black",
              }}
              type="number"
              value={formData.healthMetrics.height}
              onChange={(e) =>
                handleInputChange("healthMetrics", "height", e.target.value)
              }
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label style={{ color: "black" }}>Blood Pressure</label>
            <div className="blood-pressure-group">
              <input
                style={{
                  marginTop: "0.25rem",
                  color: "black",
                  border: "2px solid black",
                }}
                type="number"
                placeholder="e.g., 120"
                value={formData.healthMetrics.bloodPressure.systolic}
                onChange={(e) =>
                  handleNestedChange(
                    "healthMetrics",
                    "bloodPressure",
                    "systolic",
                    e.target.value
                  )
                }
              />
              <span>/</span>
              <input
                style={{
                  marginTop: "0.25rem",
                  color: "black",
                  border: "2px solid black",
                }}
                type="number"
                placeholder="e.g., 80"
                value={formData.healthMetrics.bloodPressure.diastolic}
                onChange={(e) =>
                  handleNestedChange(
                    "healthMetrics",
                    "bloodPressure",
                    "diastolic",
                    e.target.value
                  )
                }
              />
              <span>mmHg</span>
            </div>
          </div>
          <div className="form-group">
            <label style={{ color: "black" }}>Heart Rate (bpm)</label>
            <input
              placeholder="e.g., 72"
              style={{
                marginTop: "0.25rem",
                color: "black",
                border: "2px solid black",
              }}
              type="number"
              value={formData.healthMetrics.heartRate}
              onChange={(e) =>
                handleInputChange("healthMetrics", "heartRate", e.target.value)
              }
            />
          </div>
          <div className="form-group">
            <label style={{ color: "black" }}>Blood Glucose (mg/dL)</label>
            <input
              placeholder="e.g., 100"
              style={{
                marginTop: "0.25rem",
                color: "black",
                border: "2px solid black",
              }}
              type="number"
              value={formData.healthMetrics.bloodGlucose}
              onChange={(e) =>
                handleInputChange(
                  "healthMetrics",
                  "bloodGlucose",
                  e.target.value
                )
              }
            />
          </div>
        </div>
      </div>

      {/* Lifestyle Factors */}
      <div className="form-section">
        <h2>🏃 Lifestyle Factors</h2>
        <div className="form-row">
          <div className="form-group">
            <label style={{ color: "black" }}>Smoking Status</label>
            <select
              value={formData.lifestyle.smokingStatus}
              onChange={(e) =>
                handleInputChange("lifestyle", "smokingStatus", e.target.value)
              }
            >
              <option value="never">Never Smoked</option>
              <option value="former">Former Smoker</option>
              <option value="current">Current Smoker</option>
            </select>
          </div>
          <div className="form-group">
            <label style={{ color: "black" }}>Alcohol Consumption</label>
            <select
              value={formData.lifestyle.alcoholConsumption}
              onChange={(e) =>
                handleInputChange(
                  "lifestyle",
                  "alcoholConsumption",
                  e.target.value
                )
              }
            >
              <option value="none">None</option>
              <option value="occasional">Occasional</option>
              <option value="moderate">Moderate</option>
              <option value="heavy">Heavy</option>
            </select>
          </div>
          <div className="form-group">
            <label style={{ color: "black" }}>Exercise Frequency</label>
            <select
              value={formData.lifestyle.exerciseFrequency}
              onChange={(e) =>
                handleInputChange(
                  "lifestyle",
                  "exerciseFrequency",
                  e.target.value
                )
              }
            >
              <option value="sedentary">Sedentary</option>
              <option value="light">Light (1-2 days/week)</option>
              <option value="moderate">Moderate (3-4 days/week)</option>
              <option value="active">Active (5-6 days/week)</option>
              <option value="very_active">Very Active (Daily)</option>
            </select>
          </div>
          <div className="form-group">
            <label style={{ color: "black" }}>Diet Type</label>
            <input
              placeholder="e.g., Vegetarian, Keto, Mediterranean, Vegan"
              style={{
                marginTop: "0.25rem",
                color: "black",
                border: "2px solid black",
              }}
              type="text"
              value={formData.lifestyle.dietType}
              onChange={(e) =>
                handleInputChange("lifestyle", "dietType", e.target.value)
              }
            />
          </div>
        </div>
        <div className="form-row" style={{ marginTop: "1rem" }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label style={{ color: "black" }}>Other Lifestyle Factors</label>
            <textarea
              placeholder="e.g., Works night shifts, High stress job, Travels frequently, Sleep apnea, Uses supplements..."
              value={formData.lifestyle.otherFactors}
              onChange={(e) =>
                handleInputChange("lifestyle", "otherFactors", e.target.value)
              }
              rows={3}
              style={{ width: "100%", resize: "vertical" }}
            />
          </div>
        </div>
      </div>

      {/* Primary Complaint */}
      <div className="form-section">
        <h2>🎯 Primary Complaint</h2>
        <div className="form-row">
          <div className="form-group">
            <label style={{ color: "black" }}>Condition *</label>
            <select
              style={{
                marginTop: "0.25rem",
                color: "black",
                border: "2px solid black",
              }}
              value={formData.primaryComplaint.condition}
              onChange={(e) =>
                handleInputChange(
                  "primaryComplaint",
                  "condition",
                  e.target.value
                )
              }
              required
            >
              <option value="">Select primary concern...</option>
              <option value="erectile_dysfunction">Erectile Dysfunction</option>
              <option value="hair_loss">Hair Loss</option>
              <option value="weight_loss">Weight Loss</option>
              <option value="anxiety">Anxiety</option>
              <option value="insomnia">Insomnia</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="form-group">
            <label style={{ color: "black" }}>Duration</label>
            <input
              style={{
                marginTop: "0.25rem",
                color: "black",
                border: "2px solid black",
              }}
              type="text"
              placeholder="e.g., 6 months, 2 years"
              value={formData.primaryComplaint.duration}
              onChange={(e) =>
                handleInputChange(
                  "primaryComplaint",
                  "duration",
                  e.target.value
                )
              }
            />
          </div>
          <div className="form-group">
            <label style={{ color: "black" }}>Severity</label>
            <select
              value={formData.primaryComplaint.severity}
              onChange={(e) =>
                handleInputChange(
                  "primaryComplaint",
                  "severity",
                  e.target.value
                )
              }
            >
              <option value="mild">Mild</option>
              <option value="moderate">Moderate</option>
              <option value="severe">Severe</option>
            </select>
          </div>
        </div>
        <div className="form-group">
          <label style={{ color: "black" }}>Describe your symptoms</label>
          <textarea
            placeholder="Please describe your symptoms in detail..."
            value={formData.primaryComplaint.description}
            onChange={(e) =>
              handleInputChange(
                "primaryComplaint",
                "description",
                e.target.value
              )
            }
          />
        </div>
      </div>

      {/* Submit */}
      <div className="form-actions">
        <button type="submit" className="btn btn-success" disabled={loading}>
          {loading ? "Submitting..." : "✓ Submit Intake Form"}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setFormData(initialFormState)}
        >
          Clear Form
        </button>
      </div>
    </form>
  );
}
