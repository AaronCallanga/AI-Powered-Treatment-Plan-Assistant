import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { patientPortalAPI } from "../api/patientAPI";
import {
  LogoutIcon,
  ClipboardIcon,
  MedicationIcon,
  ChartIcon,
  ExerciseIcon,
  CheckIcon,
} from "./Icons";
import LoadingSpinner from "./LoadingSpinner";
import "./LoadingSpinner.css";
import "./PatientPortal.css";

export default function PatientPortal() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [treatments, setTreatments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("profile");
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saveMessage, setSaveMessage] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [profileRes, treatmentsRes] = await Promise.all([
        patientPortalAPI.getProfile(),
        patientPortalAPI.getTreatments(),
      ]);

      if (profileRes.data.success) {
        setProfile(profileRes.data.data);
        setEditData(profileRes.data.data);
      }

      if (treatmentsRes.data.success) {
        setTreatments(treatmentsRes.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setEditData((prev) => {
      const keys = field.split(".");
      if (keys.length === 1) {
        return { ...prev, [field]: value };
      }
      // Handle nested fields
      const newData = { ...prev };
      let current = newData;
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return newData;
    });
  };

  const handleSave = async () => {
    try {
      setSaveMessage(null);
      const response = await patientPortalAPI.updateProfile(editData);
      if (response.data.success) {
        setProfile(response.data.data);
        setIsEditing(false);
        setSaveMessage({
          type: "success",
          text: "Profile updated successfully!",
        });
        setTimeout(() => setSaveMessage(null), 3000);
      }
    } catch (err) {
      setSaveMessage({
        type: "error",
        text: err.response?.data?.message || "Failed to save changes",
      });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="patient-portal">
        <div className="portal-loading">
          <LoadingSpinner size="lg" text="Loading your information..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="patient-portal">
        <div className="portal-error">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={fetchData} className="btn btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="patient-portal">
      <nav className="portal-nav">
        <div className="portal-nav-brand">
          <img src="/logo.png" alt="MedicAI" className="portal-nav-logo" />
        </div>
        <div className="portal-nav-user">
          {user && (
            <>
              <span className="user-info">
                Welcome, {user.firstName} {user.lastName}
              </span>
              <button className="logout-button" onClick={logout}>
                <LogoutIcon size={16} />
                <span>Logout</span>
              </button>
            </>
          )}
        </div>
      </nav>

      <div className="portal-tabs">
        <button
          className={`tab-btn ${activeTab === "profile" ? "active" : ""}`}
          onClick={() => setActiveTab("profile")}
        >
          <ClipboardIcon size={18} />
          My Profile
        </button>
        <button
          className={`tab-btn ${activeTab === "treatments" ? "active" : ""}`}
          onClick={() => setActiveTab("treatments")}
        >
          <MedicationIcon size={18} />
          Treatment Plans
        </button>
      </div>

      <main className="portal-content">
        {saveMessage && (
          <div className={`alert alert-${saveMessage.type}`}>
            {saveMessage.text}
          </div>
        )}

        {activeTab === "profile" && profile && (
          <div className="profile-section">
            <div className="section-header">
              <h2>Personal Information</h2>
              {!isEditing ? (
                <button
                  className="btn btn-secondary"
                  onClick={() => setIsEditing(true)}
                >
                  Edit Profile
                </button>
              ) : (
                <div className="edit-buttons">
                  <button className="btn btn-success" onClick={handleSave}>
                    <CheckIcon size={16} />
                    Save Changes
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setIsEditing(false);
                      setEditData(profile);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <div className="profile-card">
              <div className="profile-grid">
                <div className="profile-field">
                  <label>First Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editData.firstName || ""}
                      onChange={(e) =>
                        handleInputChange("firstName", e.target.value)
                      }
                    />
                  ) : (
                    <span>{profile.firstName}</span>
                  )}
                </div>
                <div className="profile-field">
                  <label>Last Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editData.lastName || ""}
                      onChange={(e) =>
                        handleInputChange("lastName", e.target.value)
                      }
                    />
                  ) : (
                    <span>{profile.lastName}</span>
                  )}
                </div>
                <div className="profile-field">
                  <label>Date of Birth</label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={editData.dateOfBirth?.split("T")[0] || ""}
                      onChange={(e) =>
                        handleInputChange("dateOfBirth", e.target.value)
                      }
                    />
                  ) : (
                    <span>{formatDate(profile.dateOfBirth)}</span>
                  )}
                </div>
                <div className="profile-field">
                  <label>Gender</label>
                  {isEditing ? (
                    <select
                      value={editData.gender || ""}
                      onChange={(e) =>
                        handleInputChange("gender", e.target.value)
                      }
                    >
                      <option value="">Select...</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  ) : (
                    <span className="capitalize">
                      {profile.gender || "Not specified"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="profile-card">
              <h3>
                <ChartIcon size={20} />
                Health Metrics
              </h3>
              <div className="profile-grid">
                <div className="profile-field">
                  <label>Weight (kg)</label>
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.1"
                      value={editData.healthMetrics?.weight || ""}
                      onChange={(e) =>
                        handleInputChange(
                          "healthMetrics.weight",
                          e.target.value
                        )
                      }
                    />
                  ) : (
                    <span>{profile.healthMetrics?.weight || "N/A"}</span>
                  )}
                </div>
                <div className="profile-field">
                  <label>Height (cm)</label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editData.healthMetrics?.height || ""}
                      onChange={(e) =>
                        handleInputChange(
                          "healthMetrics.height",
                          e.target.value
                        )
                      }
                    />
                  ) : (
                    <span>{profile.healthMetrics?.height || "N/A"}</span>
                  )}
                </div>
                <div className="profile-field">
                  <label>Blood Pressure</label>
                  {isEditing ? (
                    <div className="bp-input">
                      <input
                        type="number"
                        placeholder="Systolic"
                        value={
                          editData.healthMetrics?.bloodPressure?.systolic || ""
                        }
                        onChange={(e) =>
                          handleInputChange(
                            "healthMetrics.bloodPressure.systolic",
                            e.target.value
                          )
                        }
                      />
                      <span>/</span>
                      <input
                        type="number"
                        placeholder="Diastolic"
                        value={
                          editData.healthMetrics?.bloodPressure?.diastolic || ""
                        }
                        onChange={(e) =>
                          handleInputChange(
                            "healthMetrics.bloodPressure.diastolic",
                            e.target.value
                          )
                        }
                      />
                    </div>
                  ) : (
                    <span>
                      {profile.healthMetrics?.bloodPressure?.systolic &&
                      profile.healthMetrics?.bloodPressure?.diastolic
                        ? `${profile.healthMetrics.bloodPressure.systolic}/${profile.healthMetrics.bloodPressure.diastolic} mmHg`
                        : "N/A"}
                    </span>
                  )}
                </div>
                <div className="profile-field">
                  <label>Heart Rate (bpm)</label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editData.healthMetrics?.heartRate || ""}
                      onChange={(e) =>
                        handleInputChange(
                          "healthMetrics.heartRate",
                          e.target.value
                        )
                      }
                    />
                  ) : (
                    <span>{profile.healthMetrics?.heartRate || "N/A"}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="profile-card">
              <h3>
                <ExerciseIcon size={20} />
                Lifestyle
              </h3>
              <div className="profile-grid">
                <div className="profile-field">
                  <label>Smoking Status</label>
                  {isEditing ? (
                    <select
                      value={editData.lifestyle?.smokingStatus || ""}
                      onChange={(e) =>
                        handleInputChange(
                          "lifestyle.smokingStatus",
                          e.target.value
                        )
                      }
                    >
                      <option value="never">Never Smoked</option>
                      <option value="former">Former Smoker</option>
                      <option value="current">Current Smoker</option>
                    </select>
                  ) : (
                    <span className="capitalize">
                      {profile.lifestyle?.smokingStatus?.replace("_", " ") ||
                        "N/A"}
                    </span>
                  )}
                </div>
                <div className="profile-field">
                  <label>Alcohol Consumption</label>
                  {isEditing ? (
                    <select
                      value={editData.lifestyle?.alcoholConsumption || ""}
                      onChange={(e) =>
                        handleInputChange(
                          "lifestyle.alcoholConsumption",
                          e.target.value
                        )
                      }
                    >
                      <option value="none">None</option>
                      <option value="occasional">Occasional</option>
                      <option value="moderate">Moderate</option>
                      <option value="heavy">Heavy</option>
                    </select>
                  ) : (
                    <span className="capitalize">
                      {profile.lifestyle?.alcoholConsumption || "N/A"}
                    </span>
                  )}
                </div>
                <div className="profile-field">
                  <label>Exercise Frequency</label>
                  {isEditing ? (
                    <select
                      value={editData.lifestyle?.exerciseFrequency || ""}
                      onChange={(e) =>
                        handleInputChange(
                          "lifestyle.exerciseFrequency",
                          e.target.value
                        )
                      }
                    >
                      <option value="sedentary">Sedentary</option>
                      <option value="light">Light</option>
                      <option value="moderate">Moderate</option>
                      <option value="active">Active</option>
                      <option value="very_active">Very Active</option>
                    </select>
                  ) : (
                    <span className="capitalize">
                      {profile.lifestyle?.exerciseFrequency?.replace(
                        "_",
                        " "
                      ) || "N/A"}
                    </span>
                  )}
                </div>
                <div className="profile-field">
                  <label>Diet Type</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editData.lifestyle?.dietType || ""}
                      onChange={(e) =>
                        handleInputChange("lifestyle.dietType", e.target.value)
                      }
                    />
                  ) : (
                    <span>{profile.lifestyle?.dietType || "N/A"}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="profile-card read-only">
              <h3>
                <MedicationIcon size={20} />
                Medical History
              </h3>
              <p className="read-only-note">
                This information can only be updated by your healthcare
                provider.
              </p>
              <div className="medical-info">
                <div className="info-section">
                  <label>Conditions</label>
                  <span>
                    {profile.medicalHistory?.conditions?.length > 0
                      ? profile.medicalHistory.conditions.join(", ")
                      : "None recorded"}
                  </span>
                </div>
                <div className="info-section">
                  <label>Allergies</label>
                  <span>
                    {profile.medicalHistory?.allergies?.length > 0
                      ? profile.medicalHistory.allergies.join(", ")
                      : "None recorded"}
                  </span>
                </div>
                <div className="info-section">
                  <label>Current Medications</label>
                  <span>
                    {profile.currentMedications?.length > 0
                      ? profile.currentMedications
                          .map((m) => `${m.drugName} (${m.dosage})`)
                          .join(", ")
                      : "None recorded"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "treatments" && (
          <div className="treatments-section">
            <h2>My Treatment Plans</h2>
            {treatments.length === 0 ? (
              <div className="no-treatments">
                <MedicationIcon size={48} />
                <p>No treatment plans yet.</p>
                <p className="subtitle">
                  Your treatment plans will appear here once created by your
                  doctor.
                </p>
              </div>
            ) : (
              <div className="treatments-list">
                {treatments.map((treatment) => (
                  <div key={treatment._id} className="treatment-card">
                    <div className="treatment-header">
                      <span className={`status-badge ${treatment.status}`}>
                        {treatment.status}
                      </span>
                      <span className="treatment-date">
                        {formatDate(treatment.createdAt)}
                      </span>
                    </div>
                    <div className="treatment-body">
                      <h3>Treatment Plan</h3>
                      {treatment.diagnosis && (
                        <p>
                          <strong>Diagnosis:</strong> {treatment.diagnosis}
                        </p>
                      )}
                      {treatment.medications &&
                        treatment.medications.length > 0 && (
                          <div className="treatment-medications">
                            <strong>Prescribed Medications:</strong>
                            <ul>
                              {treatment.medications.map((med, index) => (
                                <li key={index}>
                                  {med.name} - {med.dosage} ({med.frequency})
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      {treatment.recommendations && (
                        <p>
                          <strong>Recommendations:</strong>{" "}
                          {treatment.recommendations}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
