import { useState, useEffect } from "react";
import { treatmentAPI } from "../api/patientAPI";
import "./ClinicalDashboard.css";

export default function ClinicalDashboard({ patient, onBack }) {
  const [treatmentPlan, setTreatmentPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(null); // 'approve', 'reject', 'modify'
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewedBy, setReviewedBy] = useState("");

  useEffect(() => {
    if (patient?._id) {
      fetchExistingPlan();
    }
  }, [patient]);

  const fetchExistingPlan = async () => {
    try {
      setLoading(true);
      const response = await treatmentAPI.getByPatient(patient._id);
      if (response.data && response.data.length > 0) {
        setTreatmentPlan(response.data[0]); // Get most recent plan
      }
    } catch (err) {
      console.error("Error fetching treatment plan:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePlan = async () => {
    try {
      setGenerating(true);
      setError(null);
      const response = await treatmentAPI.generate(patient._id);
      setTreatmentPlan(response.data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to generate treatment plan. Please check your API key."
      );
      console.error("Error generating treatment plan:", err);
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async () => {
    try {
      const response = await treatmentAPI.approve(treatmentPlan._id, {
        reviewedBy,
        reviewNotes,
      });
      setTreatmentPlan(response.data);
      setShowModal(null);
      setReviewNotes("");
      setReviewedBy("");
    } catch (err) {
      setError("Failed to approve treatment plan");
    }
  };

  const handleReject = async () => {
    try {
      const response = await treatmentAPI.reject(treatmentPlan._id, {
        reviewedBy,
        reviewNotes,
      });
      setTreatmentPlan(response.data);
      setShowModal(null);
      setReviewNotes("");
      setReviewedBy("");
    } catch (err) {
      setError("Failed to reject treatment plan");
    }
  };

  const formatCondition = (condition) => {
    return (
      condition?.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) ||
      "N/A"
    );
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

  const getCriticalAlerts = () => {
    if (!treatmentPlan) return [];

    const alerts = [];

    // Add contraindicated interactions
    treatmentPlan.drugInteractions?.forEach((interaction) => {
      if (
        interaction.severity === "contraindicated" ||
        interaction.severity === "major"
      ) {
        alerts.push({
          type: "interaction",
          severity: interaction.severity,
          title: `${interaction.drug1} + ${interaction.drug2}`,
          description: interaction.description,
          recommendation: interaction.recommendation,
        });
      }
    });

    // Add contraindications
    treatmentPlan.contraindications?.forEach((contra) => {
      if (
        contra.severity === "contraindicated" ||
        contra.severity === "warning"
      ) {
        alerts.push({
          type: "contraindication",
          severity: contra.severity,
          title: `${contra.type}: ${contra.item}`,
          description: contra.description,
          recommendation: contra.recommendation,
        });
      }
    });

    return alerts;
  };

  if (loading) {
    return (
      <div className="clinical-dashboard">
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p className="loading-text">Loading treatment plan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="clinical-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <h1>🏥 Clinical Decision Support</h1>
        <button className="back-btn" onClick={onBack}>
          ← Back to Patients
        </button>
      </div>

      {/* Patient Summary */}
      <div className="patient-summary">
        <h2>
          {patient.firstName} {patient.lastName}
        </h2>
        <div className="patient-summary-grid">
          <div className="summary-item">
            <label>Age</label>
            <span>{patient.healthMetrics?.age || "N/A"} years</span>
          </div>
          <div className="summary-item">
            <label>Gender</label>
            <span>{patient.gender || "N/A"}</span>
          </div>
          <div className="summary-item">
            <label>Primary Complaint</label>
            <span>{formatCondition(patient.primaryComplaint?.condition)}</span>
          </div>
          <div className="summary-item">
            <label>Severity</label>
            <span>{patient.primaryComplaint?.severity || "N/A"}</span>
          </div>
          <div className="summary-item">
            <label>Blood Pressure</label>
            <span>
              {patient.healthMetrics?.bloodPressure?.systolic || "N/A"}/
              {patient.healthMetrics?.bloodPressure?.diastolic || "N/A"} mmHg
            </span>
          </div>
          <div className="summary-item">
            <label>BMI</label>
            <span>{patient.healthMetrics?.bmi?.toFixed(1) || "N/A"}</span>
          </div>
        </div>
      </div>

      {/* Current Medications - Always Show */}
      {patient.currentMedications?.length > 0 && (
        <div className="treatment-plan-card">
          <h3>💊 Current Medications ({patient.currentMedications.length})</h3>
          <div className="current-medications-grid">
            {patient.currentMedications.map((med, index) => (
              <div key={index} className="current-med-item">
                <div className="current-med-name">{med.drugName}</div>
                <div className="current-med-details">
                  <span>{med.dosage}</span>
                  <span>•</span>
                  <span>{med.frequency}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Medical Conditions & Allergies */}
      <div className="treatment-plan-card">
        <h3>📋 Medical History</h3>
        <div className="history-grid">
          <div className="history-section">
            <h4>Conditions</h4>
            <div className="history-tags">
              {patient.medicalHistory?.conditions?.length > 0 ? (
                patient.medicalHistory.conditions.map((condition, index) => (
                  <span key={index} className="history-tag condition">
                    {formatCondition(condition)}
                  </span>
                ))
              ) : (
                <span className="no-data">None reported</span>
              )}
            </div>
          </div>
          <div className="history-section">
            <h4>Allergies</h4>
            <div className="history-tags">
              {patient.medicalHistory?.allergies?.length > 0 ? (
                patient.medicalHistory.allergies.map((allergy, index) => (
                  <span key={index} className="history-tag allergy">
                    ⚠️ {allergy}
                  </span>
                ))
              ) : (
                <span className="no-data">None reported</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="critical-alerts">
          <h3>⚠️ Error</h3>
          <div className="alert-item major">
            <div className="alert-description">{error}</div>
          </div>
        </div>
      )}

      {/* Generate Plan Section */}
      {!treatmentPlan && !generating && (
        <div className="generate-section">
          <h3>🤖 AI Treatment Analysis</h3>
          <p>
            Generate a personalized treatment plan with drug interaction checks,
            contraindication analysis, and evidence-based recommendations.
          </p>
          <button className="generate-btn" onClick={handleGeneratePlan}>
            Generate Treatment Plan
          </button>
        </div>
      )}

      {/* Loading State */}
      {generating && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p className="loading-text">
            Analyzing patient data and generating treatment plan...
          </p>
          <p
            className="loading-text"
            style={{ fontSize: "0.85rem", color: "#95a5a6" }}
          >
            Checking drug interactions, contraindications, and risk factors...
          </p>
        </div>
      )}

      {/* Treatment Plan Display */}
      {treatmentPlan && (
        <>
          {/* Status */}
          <div style={{ marginBottom: "1rem" }}>
            <span className={`plan-status ${treatmentPlan.status}`}>
              {treatmentPlan.status === "pending" && "⏳ Pending Review"}
              {treatmentPlan.status === "approved" && "✅ Approved"}
              {treatmentPlan.status === "modified" && "📝 Modified"}
              {treatmentPlan.status === "rejected" && "❌ Rejected"}
            </span>
          </div>

          {/* Risk Indicator - SHOW FIRST */}
          <div
            className={`risk-indicator ${treatmentPlan.safetyAssessment?.overallRiskLevel}`}
          >
            <span className="risk-icon">
              {getRiskIcon(treatmentPlan.safetyAssessment?.overallRiskLevel)}
            </span>
            <div className="risk-details">
              <h3>Safety Risk Assessment</h3>
              <div className="risk-score">
                {treatmentPlan.safetyAssessment?.riskScore || 0}/100
              </div>
              <div className="risk-label">
                Risk Level:{" "}
                {treatmentPlan.safetyAssessment?.overallRiskLevel?.toUpperCase()}
              </div>
            </div>
          </div>

          {/* Critical Alerts - SHOW SECOND */}
          {getCriticalAlerts().length > 0 && (
            <div className="critical-alerts">
              <h3>🚨 Critical Safety Alerts</h3>
              {getCriticalAlerts().map((alert, index) => (
                <div key={index} className={`alert-item ${alert.severity}`}>
                  <div className="alert-header">
                    <span className="alert-title">{alert.title}</span>
                    <span className={`severity-badge ${alert.severity}`}>
                      {alert.severity}
                    </span>
                  </div>
                  <div className="alert-description">{alert.description}</div>
                  {alert.recommendation && (
                    <div className="alert-recommendation">
                      💡 {alert.recommendation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* All Drug Interactions */}
          {treatmentPlan.drugInteractions?.length > 0 && (
            <div className="treatment-plan-card">
              <h3>💊 Drug Interactions</h3>
              {treatmentPlan.drugInteractions.map((interaction, index) => (
                <div
                  key={index}
                  className={`alert-item ${interaction.severity}`}
                >
                  <div className="alert-header">
                    <span className="alert-title">
                      {interaction.drug1} ↔ {interaction.drug2}
                    </span>
                    <span className={`severity-badge ${interaction.severity}`}>
                      {interaction.severity}
                    </span>
                  </div>
                  <div className="alert-description">
                    {interaction.description}
                  </div>
                  {interaction.recommendation && (
                    <div className="alert-recommendation">
                      💡 {interaction.recommendation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Treatment Plan */}
          <div className="treatment-plan-card">
            <h3>💉 Recommended Treatment</h3>

            {/* Primary Medication */}
            <div className="primary-medication">
              <div className="medication-name">
                {treatmentPlan.treatment?.primaryMedication?.name}
              </div>
              <div className="medication-details">
                <div className="med-detail">
                  <label>Dosage</label>
                  <span>
                    {treatmentPlan.treatment?.primaryMedication?.dosage}
                  </span>
                </div>
                <div className="med-detail">
                  <label>Frequency</label>
                  <span>
                    {treatmentPlan.treatment?.primaryMedication?.frequency}
                  </span>
                </div>
                <div className="med-detail">
                  <label>Duration</label>
                  <span>
                    {treatmentPlan.treatment?.primaryMedication?.duration}
                  </span>
                </div>
              </div>
              {treatmentPlan.treatment?.primaryMedication?.instructions && (
                <div className="medication-instructions">
                  {treatmentPlan.treatment.primaryMedication.instructions}
                </div>
              )}
            </div>

            {/* Supporting Medications */}
            {treatmentPlan.treatment?.supportingMedications?.length > 0 && (
              <div className="supporting-medications">
                <h4>Supporting Medications</h4>
                {treatmentPlan.treatment.supportingMedications.map(
                  (med, index) => (
                    <div key={index} className="supporting-med">
                      <div className="supporting-med-info">
                        {med.name} - {med.dosage} {med.frequency}
                      </div>
                      <div className="supporting-med-reason">{med.reason}</div>
                    </div>
                  )
                )}
              </div>
            )}

            {/* Lifestyle Recommendations */}
            {treatmentPlan.treatment?.lifestyleRecommendations?.length > 0 && (
              <div className="lifestyle-recommendations">
                <h4>🏃 Lifestyle Recommendations</h4>
                {treatmentPlan.treatment.lifestyleRecommendations.map(
                  (rec, index) => (
                    <div key={index} className="lifestyle-item">
                      {rec}
                    </div>
                  )
                )}
              </div>
            )}

            {/* Monitoring */}
            {treatmentPlan.treatment?.monitoringRequired?.length > 0 && (
              <div className="monitoring-section">
                <h4>Monitoring Required</h4>
                {treatmentPlan.treatment.monitoringRequired.map(
                  (item, index) => (
                    <div key={index} className="monitoring-item">
                      {item}
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          {/* Alternatives */}
          {treatmentPlan.alternatives?.length > 0 && (
            <div className="treatment-plan-card">
              <h3>🔄 Alternative Treatments</h3>
              <div className="alternatives-section">
                {treatmentPlan.alternatives.map((alt, index) => (
                  <div key={index} className="alternative-item">
                    <div className="alternative-info">
                      <div className="alternative-name">
                        {alt.medication} - {alt.dosage}
                      </div>
                      <div className="alternative-reason">{alt.reason}</div>
                    </div>
                    <span className="suitability-score">
                      {alt.suitabilityScore}% suitable
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rationale */}
          {treatmentPlan.rationale && (
            <div className="treatment-plan-card">
              <h3>📋 Clinical Rationale</h3>
              <div className="rationale-section">
                <div className="rationale-summary">
                  {treatmentPlan.rationale.summary}
                </div>
                {treatmentPlan.rationale.clinicalReasoning && (
                  <div className="rationale-detail">
                    <strong>Clinical Reasoning:</strong>{" "}
                    {treatmentPlan.rationale.clinicalReasoning}
                  </div>
                )}
                {treatmentPlan.rationale.evidenceBasis && (
                  <div className="rationale-detail">
                    <strong>Evidence Basis:</strong>{" "}
                    {treatmentPlan.rationale.evidenceBasis}
                  </div>
                )}
                {treatmentPlan.rationale.patientSpecificFactors?.length > 0 && (
                  <div className="rationale-factors">
                    <h5>Patient-Specific Factors Considered:</h5>
                    {treatmentPlan.rationale.patientSpecificFactors.map(
                      (factor, index) => (
                        <span key={index} className="factor-tag">
                          {factor}
                        </span>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {treatmentPlan.status === "pending" && (
            <div className="action-buttons">
              <button
                className="action-btn approve"
                onClick={() => setShowModal("approve")}
              >
                ✓ Approve Plan
              </button>
              <button
                className="action-btn modify"
                onClick={() => setShowModal("modify")}
              >
                ✏️ Modify Plan
              </button>
              <button
                className="action-btn reject"
                onClick={() => setShowModal("reject")}
              >
                ✕ Reject Plan
              </button>
            </div>
          )}

          {/* Regenerate Button */}
          <div style={{ textAlign: "center", marginTop: "1rem" }}>
            <button
              className="generate-btn"
              onClick={handleGeneratePlan}
              disabled={generating}
              style={{ background: "#8e44ad" }}
            >
              🔄 Regenerate Plan
            </button>
          </div>
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>
              {showModal === "approve" && "✅ Approve Treatment Plan"}
              {showModal === "reject" && "❌ Reject Treatment Plan"}
              {showModal === "modify" && "✏️ Modify Treatment Plan"}
            </h3>
            <div className="modal-form">
              <div>
                <label>Reviewed By (Physician Name) *</label>
                <input
                  type="text"
                  value={reviewedBy}
                  onChange={(e) => setReviewedBy(e.target.value)}
                  placeholder="Dr. Smith"
                  required
                />
              </div>
              <div>
                <label>
                  Notes {showModal === "reject" ? "*" : "(optional)"}
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder={
                    showModal === "reject"
                      ? "Reason for rejection..."
                      : showModal === "modify"
                      ? "Describe the modifications needed..."
                      : "Any additional notes or instructions..."
                  }
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => {
                    setShowModal(null);
                    setReviewedBy("");
                    setReviewNotes("");
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={`submit-btn ${
                    showModal === "approve"
                      ? "approve"
                      : showModal === "reject"
                      ? "reject"
                      : "modify"
                  }`}
                  onClick={() => {
                    if (showModal === "approve") {
                      handleApprove();
                    } else if (showModal === "reject") {
                      handleReject();
                    } else if (showModal === "modify") {
                      handleApprove(); // For now, treat modify as approve with notes
                    }
                  }}
                  disabled={!reviewedBy.trim()}
                >
                  {showModal === "approve" && "✓ Approve"}
                  {showModal === "reject" && "✕ Reject"}
                  {showModal === "modify" && "✓ Save Modifications"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
