import { useState, useEffect } from "react";
import { patientAPI, treatmentAPI } from "../api/patientAPI";
import "./PatientList.css";

const COMPLAINT_ICONS = {
  erectile_dysfunction: "💊",
  hair_loss: "💇",
  weight_loss: "⚖️",
  anxiety: "🧠",
  insomnia: "😴",
  other: "🏥",
};

export default function PatientList({ onSelectPatient, refreshTrigger }) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [treatmentModal, setTreatmentModal] = useState(null);
  const [loadingTreatment, setLoadingTreatment] = useState(false);

  useEffect(() => {
    fetchPatients();
  }, [refreshTrigger]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const response = await patientAPI.getAll();
      setPatients(response.data);
      setError(null);
    } catch (err) {
      setError("Failed to load patients. Make sure the server is running.");
      console.error("Error fetching patients:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCondition = (condition) => {
    return condition.replace(/_/g, " ");
  };

  const handleViewTreatment = async (e, patient) => {
    e.stopPropagation(); // Prevent card click
    try {
      setLoadingTreatment(true);
      const response = await treatmentAPI.getByPatient(patient._id);
      if (response.data && response.data.length > 0) {
        setTreatmentModal({
          patient,
          plan: response.data[0],
        });
      }
    } catch (err) {
      console.error("Error fetching treatment:", err);
    } finally {
      setLoadingTreatment(false);
    }
  };

  const closeTreatmentModal = () => {
    setTreatmentModal(null);
  };

  const getRiskIcon = (level) => {
    switch (level) {
      case "low":
        return "✅";
      case "medium":
        return "⚠️";
      case "high":
        return "🔴";
      case "critical":
        return "🚨";
      default:
        return "❓";
    }
  };

  if (loading) {
    return <div className="loading-spinner">Loading patients...</div>;
  }

  if (error) {
    return (
      <div className="patient-list">
        <div className="empty-state">
          <h3>⚠️ {error}</h3>
          <button className="btn btn-primary" onClick={fetchPatients}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="patient-list">
      <h1>👥 Patient Records</h1>

      {patients.length === 0 ? (
        <div className="empty-state">
          <h3>No patients found</h3>
          <p>Submit a patient intake form to get started.</p>
        </div>
      ) : (
        <div className="patient-grid">
          {patients.map((patient) => (
            <div
              key={patient._id}
              className="patient-card"
              onClick={() => onSelectPatient && onSelectPatient(patient)}
            >
              <div className="patient-header">
                <h3 className="patient-name">
                  {patient.firstName} {patient.lastName}
                </h3>
                <span className={`status-badge status-${patient.status}`}>
                  {patient.status === "treatment_planned"
                    ? "Planned"
                    : patient.status === "pending"
                    ? "Pending"
                    : patient.status === "reviewed"
                    ? "Reviewed"
                    : patient.status}
                </span>
              </div>

              <div className="patient-meta">
                {patient.gender} • {patient.healthMetrics?.age || "N/A"} years
              </div>

              <div className="patient-complaint">
                <span className="complaint-icon">
                  {COMPLAINT_ICONS[patient.primaryComplaint?.condition] || "🏥"}
                </span>
                <div className="complaint-details">
                  <div className="complaint-condition">
                    {formatCondition(
                      patient.primaryComplaint?.condition || "Not specified"
                    )}
                  </div>
                  <div className="complaint-severity">
                    {patient.primaryComplaint?.severity} •{" "}
                    {patient.primaryComplaint?.duration}
                  </div>
                </div>
              </div>

              <div className="patient-info-grid">
                <div className="info-item">
                  <span className="info-label">BMI</span>
                  <span className="info-value">
                    {patient.healthMetrics?.bmi?.toFixed(1) || "N/A"}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Blood Pressure</span>
                  <span className="info-value">
                    {patient.healthMetrics?.bloodPressure?.systolic || "N/A"}/
                    {patient.healthMetrics?.bloodPressure?.diastolic || "N/A"}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Intake Date</span>
                  <span className="info-value">
                    {formatDate(patient.intakeDate)}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Smoking</span>
                  <span className="info-value">
                    {patient.lifestyle?.smokingStatus || "N/A"}
                  </span>
                </div>
              </div>

              <div className="patient-tags">
                {patient.medicalHistory?.allergies
                  ?.slice(0, 3)
                  .map((allergy) => (
                    <span key={allergy} className="tag allergy">
                      ⚠️ {allergy}
                    </span>
                  ))}
                {patient.medicalHistory?.conditions
                  ?.slice(0, 2)
                  .map((condition) => (
                    <span key={condition} className="tag condition">
                      {condition}
                    </span>
                  ))}
              </div>

              {/* Current Medications List */}
              {patient.currentMedications?.length > 0 && (
                <div className="medications-section">
                  <div className="medications-header">
                    💊 Current Medications ({patient.currentMedications.length})
                  </div>
                  <div className="medications-list">
                    {patient.currentMedications.map((med, index) => (
                      <div key={index} className="medication-item-small">
                        <span className="med-name">{med.drugName}</span>
                        <span className="med-dose">
                          {med.dosage} - {med.frequency}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* View Treatment Button for patients with treatment plans */}
              {(patient.status === "treatment_planned" ||
                patient.status === "reviewed") && (
                <button
                  className="view-treatment-btn"
                  onClick={(e) => handleViewTreatment(e, patient)}
                  disabled={loadingTreatment}
                >
                  📋 View Treatment Plan
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Treatment Plan Modal */}
      {treatmentModal && (
        <div className="treatment-modal-overlay" onClick={closeTreatmentModal}>
          <div className="treatment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Treatment Plan</h2>
              <button className="modal-close" onClick={closeTreatmentModal}>
                ×
              </button>
            </div>

            <div className="modal-patient-info">
              <h3>
                {treatmentModal.patient.firstName}{" "}
                {treatmentModal.patient.lastName}
              </h3>
              <span className={`modal-status ${treatmentModal.plan.status}`}>
                {treatmentModal.plan.status === "approved" && "✅ Approved"}
                {treatmentModal.plan.status === "modified" && "✏️ Modified"}
                {treatmentModal.plan.status === "rejected" && "❌ Rejected"}
                {treatmentModal.plan.status === "pending" && "⏳ Pending"}
              </span>
            </div>

            <div className="modal-section">
              <h4>Primary Medication</h4>
              <div className="modal-med-details">
                <div className="modal-med-name">
                  {treatmentModal.plan.treatment?.primaryMedication?.name ||
                    "Not specified"}
                </div>
                <div className="modal-med-info">
                  <span>
                    <strong>Dosage:</strong>{" "}
                    {treatmentModal.plan.treatment?.primaryMedication?.dosage ||
                      "N/A"}
                  </span>
                  <span>
                    <strong>Frequency:</strong>{" "}
                    {treatmentModal.plan.treatment?.primaryMedication
                      ?.frequency || "N/A"}
                  </span>
                  <span>
                    <strong>Duration:</strong>{" "}
                    {treatmentModal.plan.treatment?.primaryMedication
                      ?.duration || "N/A"}
                  </span>
                </div>
                {treatmentModal.plan.treatment?.primaryMedication
                  ?.instructions && (
                  <div className="modal-instructions">
                    <strong>Instructions:</strong>{" "}
                    {
                      treatmentModal.plan.treatment.primaryMedication
                        .instructions
                    }
                  </div>
                )}
              </div>
            </div>

            <div className="modal-section">
              <h4>Risk Assessment</h4>
              <div
                className={`modal-risk ${treatmentModal.plan.safetyAssessment?.overallRiskLevel}`}
              >
                <span className="risk-icon">
                  {getRiskIcon(
                    treatmentModal.plan.safetyAssessment?.overallRiskLevel
                  )}
                </span>
                <span className="risk-level">
                  {treatmentModal.plan.safetyAssessment?.overallRiskLevel?.toUpperCase() ||
                    "N/A"}
                </span>
                <span className="risk-score">
                  Score: {treatmentModal.plan.safetyAssessment?.riskScore || 0}
                  /100
                </span>
              </div>
            </div>

            {treatmentModal.plan.drugInteractions?.length > 0 && (
              <div className="modal-section">
                <h4>
                  ⚠️ Drug Interactions (
                  {treatmentModal.plan.drugInteractions.length})
                </h4>
                <div className="modal-interactions">
                  {treatmentModal.plan.drugInteractions
                    .slice(0, 3)
                    .map((int, idx) => (
                      <div
                        key={idx}
                        className={`modal-interaction ${int.severity}`}
                      >
                        <span className="int-drugs">
                          {int.drug1} + {int.drug2}
                        </span>
                        <span className={`int-severity ${int.severity}`}>
                          {int.severity}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {treatmentModal.plan.reviewedBy && (
              <div className="modal-section review-info">
                <p>
                  <strong>Reviewed by:</strong> {treatmentModal.plan.reviewedBy}
                </p>
                <p>
                  <strong>Date:</strong>{" "}
                  {new Date(treatmentModal.plan.reviewedAt).toLocaleString()}
                </p>
                {treatmentModal.plan.reviewNotes && (
                  <p>
                    <strong>Notes:</strong> {treatmentModal.plan.reviewNotes}
                  </p>
                )}
              </div>
            )}

            <div className="modal-actions">
              <button className="btn-secondary" onClick={closeTreatmentModal}>
                Close
              </button>
              <button
                className="btn-primary"
                onClick={() => {
                  closeTreatmentModal();
                  // Pass patient with existing treatment plan so wizard jumps to review/final step
                  onSelectPatient &&
                    onSelectPatient(
                      treatmentModal.patient,
                      treatmentModal.plan
                    );
                }}
              >
                Open Full Workflow
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
