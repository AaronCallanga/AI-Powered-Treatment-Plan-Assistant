import { useState } from "react";
import { patientAPI } from "../api/patientAPI";
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

      {message.text && (
        <div className={`alert alert-${message.type}`}>{message.text}</div>
      )}

      {/* Basic Information */}
      <div className="form-section">
        <h2>📋 Basic Information</h2>
        <div className="form-row">
          <div className="form-group">
            <label>First Name *</label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) =>
                handleInputChange(null, "firstName", e.target.value)
              }
              required
            />
          </div>
          <div className="form-group">
            <label>Last Name *</label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) =>
                handleInputChange(null, "lastName", e.target.value)
              }
              required
            />
          </div>
          <div className="form-group">
            <label>Date of Birth *</label>
            <input
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => handleDateOfBirthChange(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Gender</label>
            <select
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
          <label>Existing Conditions</label>
          <div className="checkbox-group">
            {CONDITIONS_OPTIONS.map((option) => (
              <label key={option.value} className="checkbox-item">
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
              style={{ marginTop: "0.25rem" }}
            />
          </div>
        </div>

        <div className="form-group" style={{ marginTop: "1rem" }}>
          <label>Known Allergies</label>
          <div className="checkbox-group">
            {ALLERGY_OPTIONS.map((option) => (
              <label key={option.value} className="checkbox-item">
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
              style={{ marginTop: "0.25rem" }}
            />
          </div>
        </div>

        <div className="form-row" style={{ marginTop: "1rem" }}>
          <div className="form-group">
            <label>Previous Surgeries (comma-separated)</label>
            <input
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
          <label>Family History</label>
          <div className="checkbox-group">
            {FAMILY_HISTORY_OPTIONS.map((option) => (
              <label key={option.value} className="checkbox-item">
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
              style={{ marginTop: "0.25rem" }}
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
                <label>Drug Name</label>
                <input
                  type="text"
                  placeholder="e.g., Metformin"
                  value={med.drugName}
                  onChange={(e) =>
                    updateMedication(index, "drugName", e.target.value)
                  }
                />
              </div>
              <div className="form-group">
                <label>Dosage</label>
                <input
                  type="text"
                  placeholder="e.g., 500mg"
                  value={med.dosage}
                  onChange={(e) =>
                    updateMedication(index, "dosage", e.target.value)
                  }
                />
              </div>
              <div className="form-group">
                <label>Frequency</label>
                <input
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
            <label>
              Age{" "}
              {formData.dateOfBirth && (
                <span style={{ fontSize: "0.8rem", color: "#7f8c8d" }}>
                  (auto-calculated)
                </span>
              )}
            </label>
            <input
              type="number"
              value={formData.healthMetrics.age}
              onChange={(e) =>
                handleInputChange("healthMetrics", "age", e.target.value)
              }
              readOnly={formData.dateOfBirth !== ""}
              placeholder={
                formData.dateOfBirth ? "Auto-calculated from DOB" : "Enter age"
              }
              style={
                formData.dateOfBirth
                  ? { backgroundColor: "#f5f5f5", cursor: "not-allowed" }
                  : {}
              }
            />
          </div>
          <div className="form-group">
            <label>Weight (kg)</label>
            <input
              type="number"
              step="0.1"
              value={formData.healthMetrics.weight}
              onChange={(e) =>
                handleInputChange("healthMetrics", "weight", e.target.value)
              }
            />
          </div>
          <div className="form-group">
            <label>Height (cm)</label>
            <input
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
            <label>Blood Pressure</label>
            <div className="blood-pressure-group">
              <input
                type="number"
                placeholder="Systolic"
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
                type="number"
                placeholder="Diastolic"
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
            <label>Heart Rate (bpm)</label>
            <input
              type="number"
              value={formData.healthMetrics.heartRate}
              onChange={(e) =>
                handleInputChange("healthMetrics", "heartRate", e.target.value)
              }
            />
          </div>
          <div className="form-group">
            <label>Blood Glucose (mg/dL)</label>
            <input
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
            <label>Smoking Status</label>
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
            <label>Alcohol Consumption</label>
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
            <label>Exercise Frequency</label>
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
            <label>Diet Type</label>
            <input
              type="text"
              placeholder="e.g., Vegetarian, Keto, Mediterranean"
              value={formData.lifestyle.dietType}
              onChange={(e) =>
                handleInputChange("lifestyle", "dietType", e.target.value)
              }
            />
          </div>
        </div>
        <div className="form-row" style={{ marginTop: "1rem" }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Other Lifestyle Factors</label>
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
            <label>Condition *</label>
            <select
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
            <label>Duration</label>
            <input
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
            <label>Severity</label>
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
          <label>Describe your symptoms</label>
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
