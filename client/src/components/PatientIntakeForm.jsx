import { useState, useEffect } from "react";
import { patientAPI } from "../api/patientAPI";
import ConsultationUpload from "./ConsultationUpload";
import VoiceDictation from "./VoiceDictation";
import DocumentUpload from "./DocumentUpload";
import NaturalLanguageInput from "./NaturalLanguageInput";
import {
  FolderIcon,
  MicIcon,
  DocumentIcon,
  ClipboardIcon,
  MedicationIcon,
  ChartIcon,
  ExerciseIcon,
  TargetIcon,
  CloseIcon,
  CheckIcon,
  PlusIcon,
  TrashIcon,
  HeartIcon,
  HeartPulseIcon,
  BrainIcon,
  DropletsIcon,
  WarningIcon,
  PillIcon,
  ThermometerIcon,
  LabIcon,
  SuccessIcon,
  ErrorIcon,
  CopyIcon,
  AIIcon,
  ScrollTextIcon,
} from "./Icons";
import { ButtonLoader } from "./LoadingSpinner";
import DrugAutocomplete from "./DrugAutocomplete";
import "./LoadingSpinner.css";
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
  {
    value: "diabetes",
    label: "Diabetes",
    IconComponent: DropletsIcon,
    color: "#ef4444",
  },
  {
    value: "hypertension",
    label: "Hypertension",
    IconComponent: HeartPulseIcon,
    color: "#dc2626",
  },
  {
    value: "heart_disease",
    label: "Heart Disease",
    IconComponent: HeartIcon,
    color: "#e11d48",
  },
  {
    value: "asthma",
    label: "Asthma",
    IconComponent: ThermometerIcon,
    color: "#0ea5e9",
  },
  {
    value: "arthritis",
    label: "Arthritis",
    IconComponent: TargetIcon,
    color: "#f59e0b",
  },
  {
    value: "depression",
    label: "Depression",
    IconComponent: BrainIcon,
    color: "#8b5cf6",
  },
  {
    value: "anxiety",
    label: "Anxiety",
    IconComponent: BrainIcon,
    color: "#a855f7",
  },
  {
    value: "thyroid_disorder",
    label: "Thyroid Disorder",
    IconComponent: LabIcon,
    color: "#14b8a6",
  },
  { value: "pcos", label: "PCOS", IconComponent: HeartIcon, color: "#ec4899" },
  {
    value: "hyperlipidemia",
    label: "High Cholesterol",
    IconComponent: ChartIcon,
    color: "#f97316",
  },
];

const ALLERGY_OPTIONS = [
  {
    value: "penicillin",
    label: "Penicillin",
    IconComponent: PillIcon,
    color: "#3b82f6",
  },
  {
    value: "sulfa",
    label: "Sulfa Drugs",
    IconComponent: MedicationIcon,
    color: "#6366f1",
  },
  {
    value: "aspirin",
    label: "Aspirin",
    IconComponent: PillIcon,
    color: "#ef4444",
  },
  {
    value: "ibuprofen",
    label: "Ibuprofen",
    IconComponent: PillIcon,
    color: "#f97316",
  },
  {
    value: "latex",
    label: "Latex",
    IconComponent: WarningIcon,
    color: "#eab308",
  },
  {
    value: "shellfish",
    label: "Shellfish",
    IconComponent: WarningIcon,
    color: "#f43f5e",
  },
  {
    value: "peanuts",
    label: "Peanuts",
    IconComponent: WarningIcon,
    color: "#d97706",
  },
  {
    value: "eggs",
    label: "Eggs",
    IconComponent: WarningIcon,
    color: "#fbbf24",
  },
];

const FAMILY_HISTORY_OPTIONS = [
  {
    value: "heart_disease",
    label: "Heart Disease",
    IconComponent: HeartIcon,
    color: "#e11d48",
  },
  {
    value: "diabetes",
    label: "Diabetes",
    IconComponent: DropletsIcon,
    color: "#ef4444",
  },
  {
    value: "cancer",
    label: "Cancer",
    IconComponent: TargetIcon,
    color: "#ec4899",
  },
  {
    value: "stroke",
    label: "Stroke",
    IconComponent: BrainIcon,
    color: "#8b5cf6",
  },
  {
    value: "hypertension",
    label: "Hypertension",
    IconComponent: HeartPulseIcon,
    color: "#dc2626",
  },
  {
    value: "mental_illness",
    label: "Mental Illness",
    IconComponent: BrainIcon,
    color: "#a855f7",
  },
];

export default function PatientIntakeForm({ onSubmitSuccess }) {
  const [formData, setFormData] = useState(initialFormState);
  const [loading, setLoading] = useState(false);
  const [showConsultationUpload, setShowConsultationUpload] = useState(false);
  const [showVoiceDictation, setShowVoiceDictation] = useState(false);
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [showNaturalLanguage, setShowNaturalLanguage] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModal, setMessageModal] = useState({ type: "", text: "" });
  const [patientCredentials, setPatientCredentials] = useState(null);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Auto-save to localStorage
  useEffect(() => {
    const savedData = localStorage.getItem("patientIntakeFormDraft");
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setFormData(parsed);
      } catch (e) {
        console.error("Error loading saved form data:", e);
      }
    }
  }, []);

  useEffect(() => {
    const hasData = Object.values(formData).some((v) => {
      if (typeof v === "string") return v.length > 0;
      if (Array.isArray(v)) return v.length > 0;
      if (typeof v === "object")
        return Object.values(v).some((sv) => sv && sv.length > 0);
      return false;
    });
    if (hasData) {
      localStorage.setItem("patientIntakeFormDraft", JSON.stringify(formData));
    }
  }, [formData]);

  // Show message in modal
  const showMessage = (type, text) => {
    setMessageModal({ type, text });
    setShowMessageModal(true);
  };

  // Validation
  const validateForm = () => {
    const newErrors = {};
    if (!formData.firstName.trim())
      newErrors.firstName = "First name is required";
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
    if (!formData.dateOfBirth)
      newErrors.dateOfBirth = "Date of birth is required";
    if (!formData.primaryComplaint.condition)
      newErrors.condition = "Please select a primary concern";

    // Validate current medications - if any medication is added, it must have at least a drug name
    const invalidMedications = formData.currentMedications.filter(
      (med, index) => !med.drugName.trim()
    );
    if (invalidMedications.length > 0) {
      newErrors.medications =
        "Please fill in the drug name for all medications or remove empty entries";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle extracted data from consultation upload
  const handleConsultationDataExtracted = (extractedData) => {
    console.log("=== RECEIVED EXTRACTED DATA ===");
    console.log(JSON.stringify(extractedData, null, 2));
    console.log("===============================");

    setFormData((prev) => {
      const newFormData = { ...prev };

      // Basic info
      if (extractedData.firstName)
        newFormData.firstName = extractedData.firstName;
      if (extractedData.lastName) newFormData.lastName = extractedData.lastName;
      if (extractedData.dateOfBirth)
        newFormData.dateOfBirth = extractedData.dateOfBirth;
      if (extractedData.gender) {
        const mappedGender = mapGender(extractedData.gender);
        if (mappedGender) newFormData.gender = mappedGender;
      }

      // Medical History
      if (extractedData.medicalHistory) {
        const mh = extractedData.medicalHistory;
        const mappedConditions =
          mh.conditions
            ?.map((c) => mapConditionToFormValue(c))
            .filter((c) => c !== null) || [];
        const mappedAllergies =
          mh.allergies
            ?.map((a) => mapAllergyToFormValue(a))
            .filter((a) => a !== null) || [];
        const mappedFamilyHistory =
          mh.familyHistory
            ?.map((f) => mapFamilyHistoryToFormValue(f))
            .filter((f) => f !== null) || [];

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
      }

      // Current Medications
      const medications = extractedData.currentMedications || [];
      if (medications.length > 0) {
        newFormData.currentMedications = medications.map((med) => ({
          drugName: med.drugName || med.name || "",
          dosage: med.dosage || "",
          frequency: med.frequency || "",
        }));
      }

      // Health Metrics
      const healthMetrics = extractedData.healthMetrics || extractedData;
      if (healthMetrics.age || extractedData.age) {
        newFormData.healthMetrics.age = extractNumericValue(
          healthMetrics.age || extractedData.age
        );
      }
      if (healthMetrics.weight || extractedData.weight) {
        newFormData.healthMetrics.weight = extractNumericValue(
          healthMetrics.weight || extractedData.weight
        );
      }
      if (healthMetrics.height || extractedData.height) {
        newFormData.healthMetrics.height = extractNumericValue(
          healthMetrics.height || extractedData.height
        );
      }
      const bp = healthMetrics.bloodPressure || extractedData.bloodPressure;
      if (bp) {
        if (typeof bp === "object" && bp.systolic && bp.diastolic) {
          newFormData.healthMetrics.bloodPressure = {
            systolic: String(bp.systolic),
            diastolic: String(bp.diastolic),
          };
        } else {
          const parsed = parseBP(String(bp));
          if (parsed && parsed.systolic)
            newFormData.healthMetrics.bloodPressure = parsed;
        }
      }
      if (healthMetrics.heartRate || extractedData.heartRate) {
        newFormData.healthMetrics.heartRate = extractNumericValue(
          healthMetrics.heartRate || extractedData.heartRate
        );
      }
      if (healthMetrics.bloodGlucose || extractedData.bloodGlucose) {
        newFormData.healthMetrics.bloodGlucose = String(
          healthMetrics.bloodGlucose || extractedData.bloodGlucose
        ).trim();
      }

      // Lifestyle
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
        newFormData.lifestyle.dietType =
          lifestyle.dietType || extractedData.dietType;
      }

      // Primary Complaint
      const primaryComplaint = extractedData.primaryComplaint || {};
      if (primaryComplaint.condition) {
        const mappedCondition = mapPrimaryCondition(primaryComplaint.condition);
        if (mappedCondition) {
          newFormData.primaryComplaint.condition = mappedCondition;
        }
      }
      if (primaryComplaint.description)
        newFormData.primaryComplaint.description = primaryComplaint.description;
      if (primaryComplaint.duration)
        newFormData.primaryComplaint.duration = primaryComplaint.duration;
      if (primaryComplaint.severity) {
        const severity = mapSeverity(primaryComplaint.severity);
        if (severity) newFormData.primaryComplaint.severity = severity;
      }

      return newFormData;
    });

    // Close modals and show success
    setShowConsultationUpload(false);
    setShowDocumentUpload(false);
    setShowVoiceDictation(false);
    showMessage(
      "success",
      "Patient data extracted successfully! Please review and make any necessary corrections."
    );
  };

  // Helper functions for mapping
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
    if (match) return { systolic: match[1], diastolic: match[2] };
    return { systolic: "", diastolic: "" };
  };

  const extractNumericValue = (value) => {
    if (!value) return "";
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

  const mapGender = (gender) => {
    if (!gender) return null;
    const lower = gender.toLowerCase().trim();
    if (lower === "male" || lower === "m") return "male";
    if (lower === "female" || lower === "f") return "female";
    if (lower === "other" || lower === "non-binary" || lower === "nonbinary")
      return "other";
    return null;
  };

  const mapPrimaryCondition = (condition) => {
    if (!condition) return null;
    const lower = condition.toLowerCase().trim();
    const mapping = {
      "erectile dysfunction": "erectile_dysfunction",
      erectile_dysfunction: "erectile_dysfunction",
      ed: "erectile_dysfunction",
      impotence: "erectile_dysfunction",
      "hair loss": "hair_loss",
      hair_loss: "hair_loss",
      alopecia: "hair_loss",
      baldness: "hair_loss",
      "weight loss": "weight_loss",
      weight_loss: "weight_loss",
      obesity: "weight_loss",
      overweight: "weight_loss",
      anxiety: "anxiety",
      "anxiety disorder": "anxiety",
      stress: "anxiety",
      insomnia: "insomnia",
      "sleep disorder": "insomnia",
      "sleep problems": "insomnia",
      "difficulty sleeping": "insomnia",
    };
    return mapping[lower] || "other";
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

  // Form handlers
  const handleInputChange = (section, field, value) => {
    if (section) {
      setFormData((prev) => ({
        ...prev,
        [section]: { ...prev[section], [field]: value },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleNestedChange = (section, parent, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [parent]: { ...prev[section][parent], [field]: value },
      },
    }));
  };

  const handleCheckboxChange = (section, field, value, checked) => {
    setFormData((prev) => {
      const currentArray = prev[section][field];
      return {
        ...prev,
        [section]: {
          ...prev[section],
          [field]: checked
            ? [...currentArray, value]
            : currentArray.filter((item) => item !== value),
        },
      };
    });
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
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
    // Clear medication error when removing
    if (errors.medications) {
      setErrors((prev) => ({ ...prev, medications: null }));
    }
  };

  const updateMedication = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      currentMedications: prev.currentMedications.map((med, i) =>
        i === index ? { ...med, [field]: value } : med
      ),
    }));
    // Clear medication error when updating drug name
    if (field === "drugName" && errors.medications) {
      setErrors((prev) => ({ ...prev, medications: null }));
    }
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
      healthMetrics: { ...prev.healthMetrics, age: calculateAge(value) },
    }));
    if (errors.dateOfBirth) {
      setErrors((prev) => ({ ...prev, dateOfBirth: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      showMessage("error", "Please fill in all required fields.");
      return;
    }

    setLoading(true);

    try {
      const parseOtherField = (value) =>
        value
          ? value
              .split(",")
              .map((s) => s.trim())
              .filter((s) => s)
          : [];

      const allConditions = [
        ...formData.medicalHistory.conditions,
        ...parseOtherField(formData.medicalHistory.conditionsOther),
      ];
      const allAllergies = [
        ...formData.medicalHistory.allergies,
        ...parseOtherField(formData.medicalHistory.allergiesOther),
      ];
      const allFamilyHistory = [
        ...formData.medicalHistory.familyHistory,
        ...parseOtherField(formData.medicalHistory.familyHistoryOther),
      ];

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
        lifestyle: { ...formData.lifestyle },
      };

      const response = await patientAPI.create(submitData);

      if (response.data.credentials) {
        setPatientCredentials(response.data.credentials);
        setShowCredentialsModal(true);
      } else {
        showMessage("success", "Patient intake submitted successfully!");
      }

      localStorage.removeItem("patientIntakeFormDraft");
      setFormData(initialFormState);

      if (onSubmitSuccess) {
        onSubmitSuccess(response.data.patient || response.data);
      }
    } catch (error) {
      showMessage(
        "error",
        error.response?.data?.message ||
          "Failed to submit intake form. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const clearDraft = () => {
    setShowConfirmModal(true);
  };

  const confirmClearDraft = () => {
    localStorage.removeItem("patientIntakeFormDraft");
    setFormData(initialFormState);
    setErrors({});
    setShowConfirmModal(false);
    showMessage("success", "Form has been cleared successfully.");
  };

  return (
    <div className="intake-form-wrapper">
      <form className="intake-form" onSubmit={handleSubmit}>
        {/* Page Header */}
        <div className="intake-page-header">
          <div className="header-title-section">
            <ClipboardIcon size={28} />
            <div>
              <h1>Patient Intake Form</h1>
              <p>Complete patient information for treatment planning</p>
            </div>
          </div>
          <div className="header-ai-tools">
            <div className="ai-tools-badge">
              <AIIcon size={14} />
              <span>AI-Powered Tools</span>
            </div>
            <div className="ai-tools-buttons">
              <button
                type="button"
                className="ai-tool-btn text"
                onClick={() => setShowNaturalLanguage(true)}
                title="Natural Language Input"
              >
                <ScrollTextIcon size={18} />
                <span>Text</span>
              </button>
              <button
                type="button"
                className="ai-tool-btn"
                onClick={() => setShowConsultationUpload(true)}
                title="Upload Recording"
              >
                <FolderIcon size={18} />
                <span>Recording</span>
              </button>
              <button
                type="button"
                className="ai-tool-btn voice"
                onClick={() => setShowVoiceDictation(true)}
                title="Voice Dictation"
              >
                <MicIcon size={18} />
                <span>Dictate</span>
              </button>
              <button
                type="button"
                className="ai-tool-btn document"
                onClick={() => setShowDocumentUpload(true)}
                title="Upload Document"
              >
                <DocumentIcon size={18} />
                <span>Document</span>
              </button>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="intake-form-content">
          {/* Section: Basic Information */}
          <section className="form-section">
            <div className="section-header">
              <ClipboardIcon size={20} />
              <h2>Basic Information</h2>
            </div>
            <div className="form-grid">
              <div
                className={`form-field ${
                  errors.firstName && touched.firstName ? "error" : ""
                }`}
              >
                <label htmlFor="firstName">
                  First Name <span className="required">*</span>
                </label>
                <input
                  id="firstName"
                  type="text"
                  placeholder="Enter first name"
                  value={formData.firstName}
                  onChange={(e) =>
                    handleInputChange(null, "firstName", e.target.value)
                  }
                  onBlur={() => handleBlur("firstName")}
                />
                {errors.firstName && touched.firstName && (
                  <span className="field-error">{errors.firstName}</span>
                )}
              </div>

              <div
                className={`form-field ${
                  errors.lastName && touched.lastName ? "error" : ""
                }`}
              >
                <label htmlFor="lastName">
                  Last Name <span className="required">*</span>
                </label>
                <input
                  id="lastName"
                  type="text"
                  placeholder="Enter last name"
                  value={formData.lastName}
                  onChange={(e) =>
                    handleInputChange(null, "lastName", e.target.value)
                  }
                  onBlur={() => handleBlur("lastName")}
                />
                {errors.lastName && touched.lastName && (
                  <span className="field-error">{errors.lastName}</span>
                )}
              </div>

              <div
                className={`form-field ${
                  errors.dateOfBirth && touched.dateOfBirth ? "error" : ""
                }`}
              >
                <label htmlFor="dateOfBirth">
                  Date of Birth <span className="required">*</span>
                </label>
                <input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleDateOfBirthChange(e.target.value)}
                  onBlur={() => handleBlur("dateOfBirth")}
                />
                {errors.dateOfBirth && touched.dateOfBirth && (
                  <span className="field-error">{errors.dateOfBirth}</span>
                )}
                {formData.dateOfBirth && (
                  <span className="field-hint">
                    Age: {calculateAge(formData.dateOfBirth)} years
                  </span>
                )}
              </div>

              <div className="form-field">
                <label>Gender</label>
                <div className="gender-options">
                  {["male", "female", "other"].map((g) => (
                    <button
                      key={g}
                      type="button"
                      className={`gender-option ${
                        formData.gender === g ? "selected" : ""
                      }`}
                      onClick={() => handleInputChange(null, "gender", g)}
                    >
                      {g.charAt(0).toUpperCase() + g.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Section: Primary Complaint */}
          <section className="form-section">
            <div className="section-header">
              <TargetIcon size={20} />
              <h2>Primary Complaint</h2>
            </div>
            <div className="form-grid">
              <div className={`form-field ${errors.condition ? "error" : ""}`}>
                <label>
                  Primary Concern <span className="required">*</span>
                </label>
                <select
                  value={formData.primaryComplaint.condition}
                  onChange={(e) =>
                    handleInputChange(
                      "primaryComplaint",
                      "condition",
                      e.target.value
                    )
                  }
                >
                  <option value="">Select primary concern...</option>
                  <option value="erectile_dysfunction">
                    Erectile Dysfunction
                  </option>
                  <option value="hair_loss">Hair Loss</option>
                  <option value="weight_loss">Weight Loss</option>
                  <option value="anxiety">Anxiety</option>
                  <option value="insomnia">Insomnia</option>
                  <option value="other">Other</option>
                </select>
                {errors.condition && (
                  <span className="field-error">{errors.condition}</span>
                )}
              </div>

              <div className="form-field">
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

              <div className="form-field">
                <label>Severity</label>
                <div className="severity-options">
                  {["mild", "moderate", "severe"].map((sev) => (
                    <button
                      key={sev}
                      type="button"
                      className={`severity-btn ${sev} ${
                        formData.primaryComplaint.severity === sev
                          ? "selected"
                          : ""
                      }`}
                      onClick={() =>
                        handleInputChange("primaryComplaint", "severity", sev)
                      }
                    >
                      {sev.charAt(0).toUpperCase() + sev.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-field full-width">
                <label>Describe Symptoms</label>
                <textarea
                  placeholder="Please describe the symptoms in detail..."
                  value={formData.primaryComplaint.description}
                  onChange={(e) =>
                    handleInputChange(
                      "primaryComplaint",
                      "description",
                      e.target.value
                    )
                  }
                  rows={3}
                />
              </div>
            </div>
          </section>

          {/* Section: Medical History */}
          <section className="form-section">
            <div className="section-header">
              <FolderIcon size={20} />
              <h2>Medical History</h2>
            </div>

            <div className="subsection">
              <h3>Existing Conditions</h3>
              <div className="checkbox-grid">
                {CONDITIONS_OPTIONS.map((option) => {
                  const IconComp = option.IconComponent;
                  return (
                    <label
                      key={option.value}
                      className={`checkbox-card ${
                        formData.medicalHistory.conditions.includes(
                          option.value
                        )
                          ? "selected"
                          : ""
                      }`}
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
                      <span
                        className="checkbox-icon"
                        style={{ color: option.color }}
                      >
                        <IconComp size={18} />
                      </span>
                      <span className="checkbox-label">{option.label}</span>
                    </label>
                  );
                })}
              </div>
              <input
                type="text"
                className="other-input"
                placeholder="Other conditions (comma-separated)"
                value={formData.medicalHistory.conditionsOther}
                onChange={(e) =>
                  handleInputChange(
                    "medicalHistory",
                    "conditionsOther",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="subsection">
              <h3>Known Allergies</h3>
              <div className="checkbox-grid">
                {ALLERGY_OPTIONS.map((option) => {
                  const IconComp = option.IconComponent;
                  return (
                    <label
                      key={option.value}
                      className={`checkbox-card allergy ${
                        formData.medicalHistory.allergies.includes(option.value)
                          ? "selected"
                          : ""
                      }`}
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
                      <span
                        className="checkbox-icon"
                        style={{ color: option.color }}
                      >
                        <IconComp size={18} />
                      </span>
                      <span className="checkbox-label">{option.label}</span>
                    </label>
                  );
                })}
              </div>
              <input
                type="text"
                className="other-input"
                placeholder="Other allergies (comma-separated)"
                value={formData.medicalHistory.allergiesOther}
                onChange={(e) =>
                  handleInputChange(
                    "medicalHistory",
                    "allergiesOther",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="subsection">
              <h3>Family History</h3>
              <div className="checkbox-grid">
                {FAMILY_HISTORY_OPTIONS.map((option) => {
                  const IconComp = option.IconComponent;
                  return (
                    <label
                      key={option.value}
                      className={`checkbox-card ${
                        formData.medicalHistory.familyHistory.includes(
                          option.value
                        )
                          ? "selected"
                          : ""
                      }`}
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
                      <span
                        className="checkbox-icon"
                        style={{ color: option.color }}
                      >
                        <IconComp size={18} />
                      </span>
                      <span className="checkbox-label">{option.label}</span>
                    </label>
                  );
                })}
              </div>
              <input
                type="text"
                className="other-input"
                placeholder="Other family history (comma-separated)"
                value={formData.medicalHistory.familyHistoryOther}
                onChange={(e) =>
                  handleInputChange(
                    "medicalHistory",
                    "familyHistoryOther",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="subsection">
              <h3>Previous Surgeries</h3>
              <div className="form-field">
                <input
                  type="text"
                  placeholder="e.g., Appendectomy 2015, Knee surgery 2020 (comma-separated)"
                  value={formData.medicalHistory.surgeries}
                  onChange={(e) =>
                    handleInputChange(
                      "medicalHistory",
                      "surgeries",
                      e.target.value
                    )
                  }
                />
              </div>
            </div>
          </section>

          {/* Section: Current Medications */}
          <section
            className={`form-section ${errors.medications ? "has-error" : ""}`}
          >
            <div className="section-header">
              <MedicationIcon size={20} />
              <h2>Current Medications</h2>
              <button
                type="button"
                className="btn-add-inline"
                onClick={addMedication}
              >
                <PlusIcon size={16} /> Add
              </button>
            </div>
            {errors.medications && (
              <div className="section-error">
                <WarningIcon size={16} />
                <span>{errors.medications}</span>
              </div>
            )}
            {formData.currentMedications.length === 0 ? (
              <p className="empty-hint">
                No medications added. Click "Add" to add medications.
              </p>
            ) : (
              <div className="medication-list">
                {formData.currentMedications.map((med, index) => (
                  <div
                    key={index}
                    className={`medication-row ${
                      errors.medications && !med.drugName.trim() ? "error" : ""
                    }`}
                  >
                    <div className="medication-drug-field">
                      <DrugAutocomplete
                        value={med.drugName}
                        onChange={(value) =>
                          updateMedication(index, "drugName", value)
                        }
                        onSelect={(drug) => {
                          updateMedication(
                            index,
                            "drugName",
                            `${drug.genericName}${
                              drug.brandName ? ` (${drug.brandName})` : ""
                            }`
                          );
                          if (drug.strength && !med.dosage) {
                            updateMedication(index, "dosage", drug.strength);
                          }
                        }}
                        placeholder="Search medication..."
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Dosage"
                      value={med.dosage}
                      onChange={(e) =>
                        updateMedication(index, "dosage", e.target.value)
                      }
                    />
                    <input
                      type="text"
                      placeholder="Frequency"
                      value={med.frequency}
                      onChange={(e) =>
                        updateMedication(index, "frequency", e.target.value)
                      }
                    />
                    <button
                      type="button"
                      className="btn-remove-inline"
                      onClick={() => removeMedication(index)}
                    >
                      <TrashIcon size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Section: Health Metrics */}
          <section className="form-section">
            <div className="section-header">
              <ChartIcon size={20} />
              <h2>Health Metrics</h2>
            </div>
            <div className="metrics-row">
              <div className="metric-field">
                <label>Height (cm)</label>
                <input
                  type="number"
                  placeholder="180"
                  value={formData.healthMetrics.height}
                  onChange={(e) =>
                    handleInputChange("healthMetrics", "height", e.target.value)
                  }
                />
              </div>
              <div className="metric-field">
                <label>Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="75"
                  value={formData.healthMetrics.weight}
                  onChange={(e) =>
                    handleInputChange("healthMetrics", "weight", e.target.value)
                  }
                />
              </div>
              <div className="metric-field bp-field">
                <label>Blood Pressure</label>
                <div className="bp-inputs">
                  <input
                    type="number"
                    placeholder="120"
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
                    placeholder="80"
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
                </div>
              </div>
              <div className="metric-field">
                <label>Heart Rate (bpm)</label>
                <input
                  type="number"
                  placeholder="72"
                  value={formData.healthMetrics.heartRate}
                  onChange={(e) =>
                    handleInputChange(
                      "healthMetrics",
                      "heartRate",
                      e.target.value
                    )
                  }
                />
              </div>
              <div className="metric-field">
                <label>Blood Glucose (mg/dL)</label>
                <input
                  type="number"
                  placeholder="100"
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
              {formData.healthMetrics.weight &&
                formData.healthMetrics.height && (
                  <div className="metric-field calculated">
                    <label>BMI</label>
                    <div className="bmi-value">
                      {(
                        formData.healthMetrics.weight /
                        Math.pow(formData.healthMetrics.height / 100, 2)
                      ).toFixed(1)}
                    </div>
                  </div>
                )}
            </div>
          </section>

          {/* Section: Lifestyle */}
          <section className="form-section">
            <div className="section-header">
              <ExerciseIcon size={20} />
              <h2>Lifestyle</h2>
            </div>
            <div className="lifestyle-row">
              <div className="lifestyle-field">
                <label>Smoking</label>
                <div className="option-buttons">
                  {[
                    { value: "never", label: "Never" },
                    { value: "former", label: "Former" },
                    { value: "current", label: "Current" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`option-btn ${
                        formData.lifestyle.smokingStatus === opt.value
                          ? "selected"
                          : ""
                      }`}
                      onClick={() =>
                        handleInputChange(
                          "lifestyle",
                          "smokingStatus",
                          opt.value
                        )
                      }
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="lifestyle-field">
                <label>Alcohol</label>
                <div className="option-buttons">
                  {[
                    { value: "none", label: "None" },
                    { value: "occasional", label: "Occasional" },
                    { value: "moderate", label: "Moderate" },
                    { value: "heavy", label: "Heavy" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`option-btn ${
                        formData.lifestyle.alcoholConsumption === opt.value
                          ? "selected"
                          : ""
                      }`}
                      onClick={() =>
                        handleInputChange(
                          "lifestyle",
                          "alcoholConsumption",
                          opt.value
                        )
                      }
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="lifestyle-field">
                <label>Exercise</label>
                <div className="option-buttons">
                  {[
                    { value: "sedentary", label: "Sedentary" },
                    { value: "light", label: "Light" },
                    { value: "moderate", label: "Moderate" },
                    { value: "active", label: "Active" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`option-btn ${
                        formData.lifestyle.exerciseFrequency === opt.value
                          ? "selected"
                          : ""
                      }`}
                      onClick={() =>
                        handleInputChange(
                          "lifestyle",
                          "exerciseFrequency",
                          opt.value
                        )
                      }
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="form-grid" style={{ marginTop: "1rem" }}>
              <div className="form-field">
                <label>Diet Type</label>
                <input
                  type="text"
                  placeholder="e.g., Vegetarian, Keto, No restrictions"
                  value={formData.lifestyle.dietType}
                  onChange={(e) =>
                    handleInputChange("lifestyle", "dietType", e.target.value)
                  }
                />
              </div>
              <div className="form-field">
                <label>Other Factors</label>
                <input
                  type="text"
                  placeholder="e.g., Night shifts, High stress"
                  value={formData.lifestyle.otherFactors}
                  onChange={(e) =>
                    handleInputChange(
                      "lifestyle",
                      "otherFactors",
                      e.target.value
                    )
                  }
                />
              </div>
            </div>
          </section>
        </div>

        {/* Footer Actions */}
        <div className="intake-footer">
          <button type="button" className="btn-clear" onClick={clearDraft}>
            Clear Form
          </button>
          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? (
              <>
                <ButtonLoader />
                Submitting...
              </>
            ) : (
              <>
                <CheckIcon size={18} />
                Submit Intake Form
              </>
            )}
          </button>
        </div>
      </form>

      {/* Message Modal */}
      {showMessageModal && (
        <div
          className="intake-modal-overlay"
          onClick={() => setShowMessageModal(false)}
        >
          <div
            className="intake-modal message-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`message-modal-content ${messageModal.type}`}>
              <div className="message-icon">
                {messageModal.type === "success" ? (
                  <SuccessIcon size={32} />
                ) : (
                  <ErrorIcon size={32} />
                )}
              </div>
              <p>{messageModal.text}</p>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setShowMessageModal(false)}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Consultation Upload Modal */}
      {showConsultationUpload && (
        <div
          className="intake-modal-overlay"
          onClick={() => setShowConsultationUpload(false)}
        >
          <div className="intake-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close"
              onClick={() => setShowConsultationUpload(false)}
            >
              <CloseIcon size={20} />
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
        <div
          className="intake-modal-overlay"
          onClick={() => setShowVoiceDictation(false)}
        >
          <div className="intake-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close"
              onClick={() => setShowVoiceDictation(false)}
            >
              <CloseIcon size={20} />
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
        <div
          className="intake-modal-overlay"
          onClick={() => setShowDocumentUpload(false)}
        >
          <div className="intake-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close"
              onClick={() => setShowDocumentUpload(false)}
            >
              <CloseIcon size={20} />
            </button>
            <DocumentUpload
              onDataExtracted={handleConsultationDataExtracted}
              onClose={() => setShowDocumentUpload(false)}
            />
          </div>
        </div>
      )}

      {/* Natural Language Input Modal */}
      {showNaturalLanguage && (
        <div
          className="intake-modal-overlay"
          onClick={() => setShowNaturalLanguage(false)}
        >
          <div className="intake-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close"
              onClick={() => setShowNaturalLanguage(false)}
            >
              <CloseIcon size={20} />
            </button>
            <NaturalLanguageInput
              onDataExtracted={handleConsultationDataExtracted}
              onClose={() => setShowNaturalLanguage(false)}
            />
          </div>
        </div>
      )}

      {/* Credentials Modal */}
      {showCredentialsModal && patientCredentials && (
        <div className="intake-modal-overlay">
          <div className="intake-modal credentials-modal">
            <button
              type="button"
              className="modal-close"
              onClick={() => setShowCredentialsModal(false)}
            >
              <CloseIcon size={20} />
            </button>
            <div className="credentials-content">
              <div className="credentials-header">
                <div className="credentials-success-icon">
                  <SuccessIcon size={48} />
                </div>
                <h2>Patient Account Created!</h2>
                <p>Please save these login credentials for the patient</p>
              </div>
              <div className="credentials-box">
                <div className="credential-item">
                  <label>Email:</label>
                  <div className="credential-value">
                    <code>{patientCredentials.email}</code>
                    <button
                      type="button"
                      className="copy-btn"
                      onClick={() =>
                        navigator.clipboard.writeText(patientCredentials.email)
                      }
                      title="Copy"
                    >
                      <CopyIcon size={16} />
                    </button>
                  </div>
                </div>
                <div className="credential-item">
                  <label>Username:</label>
                  <div className="credential-value">
                    <code>{patientCredentials.username}</code>
                    <button
                      type="button"
                      className="copy-btn"
                      onClick={() =>
                        navigator.clipboard.writeText(
                          patientCredentials.username
                        )
                      }
                      title="Copy"
                    >
                      <CopyIcon size={16} />
                    </button>
                  </div>
                </div>
                <div className="credential-item">
                  <label>Password:</label>
                  <div className="credential-value">
                    <code>{patientCredentials.password}</code>
                    <button
                      type="button"
                      className="copy-btn"
                      onClick={() =>
                        navigator.clipboard.writeText(
                          patientCredentials.password
                        )
                      }
                      title="Copy"
                    >
                      <CopyIcon size={16} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="credentials-warning">
                <div className="warning-header">
                  <WarningIcon size={18} />
                  <strong>Important:</strong>
                </div>
                <span>
                  This password will not be shown again. Please ensure the
                  patient saves these credentials securely.
                </span>
              </div>
              <button
                type="button"
                className="btn-submit full-width"
                onClick={() => {
                  setShowCredentialsModal(false);
                  setPatientCredentials(null);
                }}
              >
                <CheckIcon size={18} />
                I've Saved the Credentials
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div
          className="intake-modal-overlay"
          onClick={() => setShowConfirmModal(false)}
        >
          <div
            className="intake-modal confirm-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="confirm-modal-content">
              <div className="confirm-icon">
                <WarningIcon size={48} />
              </div>
              <h3>Clear Form Data?</h3>
              <p>
                Are you sure you want to clear all form data? This action cannot
                be undone.
              </p>
              <div className="confirm-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowConfirmModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-confirm-danger"
                  onClick={confirmClearDraft}
                >
                  <TrashIcon size={16} />
                  Clear Form
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
