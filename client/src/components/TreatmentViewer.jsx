import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import QRCode from "qrcode";
import { useAuth } from "../context/AuthContext";
import { publicAPI, treatmentAPI } from "../api/patientAPI";
import {
  PatientIcon,
  MedicationIcon,
  WarningIcon,
  AlertIcon,
  SafeIcon,
  RiskIcon,
  CalendarIcon,
  DurationIcon,
  BadgeCheckIcon,
  InfoIcon,
  ShareIcon,
  PrinterIcon,
  CloseIcon,
  CheckIcon,
  ChevronLeftIcon,
  DownloadIcon,
} from "./Icons";
import LoadingSpinner from "./LoadingSpinner";
import "./TreatmentViewer.css";

export default function TreatmentViewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const qrRef = useRef(null);

  const [treatment, setTreatment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    fetchTreatment();
  }, [id, isAuthenticated]);

  const fetchTreatment = async () => {
    try {
      setLoading(true);
      setError(null);

      if (
        isAuthenticated &&
        (user?.role === "admin" || user?.role === "doctor")
      ) {
        // Authenticated doctors/admins get full details
        const response = await treatmentAPI.getFullDetails(id);
        setTreatment({
          ...response.data,
          fullAccess: true,
        });
        setShowLoginPrompt(false);
      } else {
        // Public access - limited data
        const response = await publicAPI.getTreatment(id);
        if (response.data.success) {
          setTreatment({
            ...response.data.data,
            fullAccess: false,
          });
          setShowLoginPrompt(response.data.requiresAuth);
        } else {
          setError(response.data.message || "Failed to load treatment plan");
        }
      }
    } catch (err) {
      console.error("Error fetching treatment:", err);
      if (err.response?.status === 404) {
        setError("Treatment plan not found");
      } else {
        setError("Failed to load treatment plan. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleLogin = () => {
    // Store the current URL to redirect back after login
    sessionStorage.setItem("redirectAfterLogin", window.location.pathname);
    navigate("/login");
  };

  const handlePrint = () => {
    window.print();
  };

  const getShareUrl = () => {
    return window.location.href;
  };

  const copyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      showNotification("Link copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy:", err);
      showNotification("Failed to copy link", "error");
    }
  };

  const downloadQRCode = async () => {
    try {
      const qrDataUrl = await QRCode.toDataURL(getShareUrl(), {
        width: 400,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      });

      const link = document.createElement("a");
      link.download = `treatment-plan-${id}-qr.png`;
      link.href = qrDataUrl;
      link.click();
      showNotification("QR code downloaded!");
    } catch (err) {
      console.error("Failed to download QR code:", err);
      showNotification("Failed to download QR code", "error");
    }
  };

  const getRiskBadgeClass = (riskLevel) => {
    switch (riskLevel?.toLowerCase()) {
      case "critical":
        return "risk-critical";
      case "high":
        return "risk-high";
      case "moderate":
        return "risk-moderate";
      case "low":
        return "risk-low";
      default:
        return "risk-unknown";
    }
  };

  const getRiskIcon = (riskLevel) => {
    switch (riskLevel?.toLowerCase()) {
      case "critical":
      case "high":
        return <AlertIcon size={18} />;
      case "moderate":
        return <WarningIcon size={18} />;
      case "low":
        return <SafeIcon size={18} />;
      default:
        return <InfoIcon size={18} />;
    }
  };

  if (loading) {
    return (
      <div className="treatment-viewer-container">
        <div className="treatment-viewer-loading">
          <LoadingSpinner size="large" message="Loading treatment plan..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="treatment-viewer-container">
        <div className="treatment-viewer-error">
          <AlertIcon size={48} />
          <h2>Unable to Load Treatment Plan</h2>
          <p>{error}</p>
          <button className="btn-primary" onClick={() => navigate("/")}>
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="treatment-viewer-container">
      {/* Notification Toast */}
      {notification && (
        <div className={`notification-toast ${notification.type}`}>
          {notification.type === "success" ? (
            <CheckIcon size={18} />
          ) : (
            <AlertIcon size={18} />
          )}
          {notification.message}
        </div>
      )}

      <header className="treatment-viewer-header">
        <div className="header-left">
          <button className="back-button" onClick={() => navigate(-1)}>
            <ChevronLeftIcon size={20} />
            Back
          </button>
        </div>
        <div className="header-title">
          <h1>Treatment Plan</h1>
          {treatment?.fullAccess && (
            <span className="access-badge full-access">
              <BadgeCheckIcon size={16} /> Full Access
            </span>
          )}
        </div>
        <div className="header-actions">
          {treatment?.fullAccess && (
            <button className="btn-icon" onClick={handlePrint} title="Print">
              <PrinterIcon size={20} />
            </button>
          )}
          <button className="btn-icon" onClick={copyShareUrl} title="Copy Link">
            <ShareIcon size={20} />
          </button>
        </div>
      </header>

      <main className="treatment-viewer-content">
        {/* Login Prompt for Unauthenticated Users */}
        {showLoginPrompt && !treatment?.fullAccess && (
          <div className="login-prompt-banner">
            <div className="prompt-content">
              <InfoIcon size={24} />
              <div className="prompt-text">
                <h3>Limited View</h3>
                <p>
                  Log in as a doctor to view full treatment details and medical
                  data.
                </p>
              </div>
            </div>
            <button className="btn-primary" onClick={handleLogin}>
              Log In
            </button>
          </div>
        )}

        {/* Patient Info Card */}
        <div className="viewer-card patient-info-card">
          <div className="card-header">
            <PatientIcon size={24} />
            <h2>Patient Information</h2>
          </div>
          <div className="card-content">
            <div className="info-row">
              <span className="label">Patient Name:</span>
              <span className="value">
                {treatment?.fullAccess
                  ? treatment?.patient?.name
                  : treatment?.patientName}
              </span>
            </div>
            {treatment?.fullAccess && treatment?.patient?.condition && (
              <div className="info-row">
                <span className="label">Primary Condition:</span>
                <span className="value">{treatment.patient.condition}</span>
              </div>
            )}
            <div className="info-row">
              <span className="label">Status:</span>
              <span
                className={`status-badge status-${treatment?.status?.toLowerCase()}`}
              >
                {treatment?.status}
              </span>
            </div>
            <div className="info-row">
              <span className="label">Generated:</span>
              <span className="value">
                {new Date(
                  treatment?.createdAt || treatment?.generatedAt
                ).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Full Access Content */}
        {treatment?.fullAccess ? (
          <>
            {/* Risk Assessment */}
            <div className="viewer-card risk-card">
              <div className="card-header">
                <RiskIcon size={24} />
                <h2>Risk Assessment</h2>
              </div>
              <div className="card-content">
                <div
                  className={`risk-banner ${getRiskBadgeClass(
                    treatment?.currentPlan?.safetyAssessment?.overallRiskLevel
                  )}`}
                >
                  {getRiskIcon(
                    treatment?.currentPlan?.safetyAssessment?.overallRiskLevel
                  )}
                  <span className="risk-level">
                    {treatment?.currentPlan?.safetyAssessment?.overallRiskLevel?.toUpperCase() ||
                      "UNKNOWN"}{" "}
                    RISK
                  </span>
                  {treatment?.currentPlan?.safetyAssessment?.riskScore && (
                    <span className="risk-score">
                      Score: {treatment.currentPlan.safetyAssessment.riskScore}
                      /100
                    </span>
                  )}
                </div>

                {/* Drug Interactions */}
                {treatment?.currentPlan?.drugInteractions?.length > 0 && (
                  <div className="interactions-section">
                    <h3>
                      <WarningIcon size={18} /> Drug Interactions
                    </h3>
                    <div className="interactions-list">
                      {treatment.currentPlan.drugInteractions.map(
                        (interaction, idx) => (
                          <div
                            key={idx}
                            className={`interaction-item severity-${interaction.severity?.toLowerCase()}`}
                          >
                            <div className="interaction-drugs">
                              {interaction.drug1} + {interaction.drug2}
                            </div>
                            <div className="interaction-severity">
                              {interaction.severity}
                            </div>
                            <div className="interaction-effect">
                              {interaction.effect}
                            </div>
                            {interaction.recommendation && (
                              <div className="interaction-recommendation">
                                <strong>Recommendation:</strong>{" "}
                                {interaction.recommendation}
                              </div>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Contraindications */}
                {treatment?.currentPlan?.contraindications?.length > 0 && (
                  <div className="contraindications-section">
                    <h3>
                      <AlertIcon size={18} /> Contraindications
                    </h3>
                    <ul className="contraindications-list">
                      {treatment.currentPlan.contraindications.map(
                        (item, idx) => (
                          <li key={idx}>
                            <strong>{item.condition}:</strong> {item.warning}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Treatment Plan */}
            <div className="viewer-card treatment-card">
              <div className="card-header">
                <MedicationIcon size={24} />
                <h2>Treatment Plan</h2>
              </div>
              <div className="card-content">
                {/* Primary Medication */}
                <div className="medication-section primary-medication">
                  <h3>Primary Medication</h3>
                  <div className="medication-card">
                    <div className="med-name">
                      {
                        treatment?.currentPlan?.treatment?.primaryMedication
                          ?.name
                      }
                    </div>
                    <div className="med-details">
                      <div className="detail-item">
                        <span className="detail-label">Dosage:</span>
                        <span className="detail-value">
                          {
                            treatment?.currentPlan?.treatment?.primaryMedication
                              ?.dosage
                          }
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Frequency:</span>
                        <span className="detail-value">
                          {
                            treatment?.currentPlan?.treatment?.primaryMedication
                              ?.frequency
                          }
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Duration:</span>
                        <span className="detail-value">
                          {
                            treatment?.currentPlan?.treatment?.primaryMedication
                              ?.duration
                          }
                        </span>
                      </div>
                      {treatment?.currentPlan?.treatment?.primaryMedication
                        ?.instructions && (
                        <div className="detail-item full-width">
                          <span className="detail-label">Instructions:</span>
                          <span className="detail-value">
                            {
                              treatment.currentPlan.treatment.primaryMedication
                                .instructions
                            }
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Supporting Medications */}
                {treatment?.currentPlan?.treatment?.supportingMedications
                  ?.length > 0 && (
                  <div className="medication-section supporting-medications">
                    <h3>Supporting Medications</h3>
                    <div className="medications-grid">
                      {treatment.currentPlan.treatment.supportingMedications.map(
                        (med, idx) => (
                          <div key={idx} className="medication-card supporting">
                            <div className="med-name">{med.name}</div>
                            <div className="med-details">
                              <div className="detail-item">
                                <span className="detail-label">Dosage:</span>
                                <span className="detail-value">
                                  {med.dosage}
                                </span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">Frequency:</span>
                                <span className="detail-value">
                                  {med.frequency}
                                </span>
                              </div>
                              {med.reason && (
                                <div className="detail-item full-width">
                                  <span className="detail-label">Reason:</span>
                                  <span className="detail-value">
                                    {med.reason}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Lifestyle Recommendations */}
                {treatment?.currentPlan?.treatment?.lifestyleRecommendations
                  ?.length > 0 && (
                  <div className="lifestyle-section">
                    <h3>Lifestyle Recommendations</h3>
                    <ul className="lifestyle-list">
                      {treatment.currentPlan.treatment.lifestyleRecommendations.map(
                        (rec, idx) => (
                          <li key={idx}>
                            <CheckIcon size={16} />
                            {rec}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}

                {/* Monitoring Requirements */}
                {treatment?.currentPlan?.treatment?.monitoringRequirements
                  ?.length > 0 && (
                  <div className="monitoring-section">
                    <h3>Monitoring Requirements</h3>
                    <div className="monitoring-list">
                      {treatment.currentPlan.treatment.monitoringRequirements.map(
                        (req, idx) => (
                          <div key={idx} className="monitoring-item">
                            <CalendarIcon size={16} />
                            <span>{req}</span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Rationale */}
            {treatment?.currentPlan?.rationale && (
              <div className="viewer-card rationale-card">
                <div className="card-header">
                  <InfoIcon size={24} />
                  <h2>Clinical Rationale</h2>
                </div>
                <div className="card-content">
                  {treatment.currentPlan.rationale.summary && (
                    <div className="rationale-section">
                      <h3>Summary</h3>
                      <p>{treatment.currentPlan.rationale.summary}</p>
                    </div>
                  )}
                  {treatment.currentPlan.rationale.evidence && (
                    <div className="rationale-section">
                      <h3>Evidence Base</h3>
                      <p>{treatment.currentPlan.rationale.evidence}</p>
                    </div>
                  )}
                  {treatment.currentPlan.rationale.considerations && (
                    <div className="rationale-section">
                      <h3>Special Considerations</h3>
                      <p>{treatment.currentPlan.rationale.considerations}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Review Information */}
            {treatment?.reviewedBy && (
              <div className="viewer-card review-card">
                <div className="card-header">
                  <BadgeCheckIcon size={24} />
                  <h2>Review Information</h2>
                </div>
                <div className="card-content">
                  <div className="info-row">
                    <span className="label">Reviewed By:</span>
                    <span className="value">{treatment.reviewedBy}</span>
                  </div>
                  {treatment.reviewedAt && (
                    <div className="info-row">
                      <span className="label">Reviewed At:</span>
                      <span className="value">
                        {new Date(treatment.reviewedAt).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </span>
                    </div>
                  )}
                  {treatment.reviewNotes && (
                    <div className="info-row">
                      <span className="label">Notes:</span>
                      <span className="value">{treatment.reviewNotes}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          /* Limited Access Message */
          <div className="viewer-card limited-access-card">
            <div className="card-content centered">
              <InfoIcon size={48} />
              <h2>Full Details Require Authentication</h2>
              <p>
                {treatment?.message ||
                  "Please log in as a healthcare provider to view the complete treatment plan, including medications, dosages, and clinical details."}
              </p>
              <button className="btn-primary large" onClick={handleLogin}>
                Log In to View Details
              </button>
            </div>
          </div>
        )}

        {/* QR Code Share Section */}
        <div className="viewer-card qr-share-card">
          <div className="card-header">
            <ShareIcon size={24} />
            <h2>Share This Treatment Plan</h2>
          </div>
          <div className="card-content qr-content">
            <div className="qr-code-wrapper" ref={qrRef}>
              <QRCodeSVG
                value={getShareUrl()}
                size={150}
                level="M"
                includeMargin={true}
              />
              <button
                className="qr-download-btn"
                onClick={downloadQRCode}
                title="Download QR Code"
              >
                <DownloadIcon size={16} />
              </button>
            </div>
            <div className="share-info">
              <p>
                Scan this QR code to share this treatment plan with other
                healthcare providers.
              </p>
              <div className="share-url-container">
                <code className="share-url">{getShareUrl()}</code>
                <button className="btn-secondary" onClick={copyShareUrl}>
                  Copy Link
                </button>
              </div>
              <div className="share-actions">
                <button className="btn-outline" onClick={downloadQRCode}>
                  <DownloadIcon size={16} />
                  Download QR Code
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="treatment-viewer-footer">
        <p>
          This treatment plan was generated using AI assistance and reviewed by
          healthcare professionals. Always consult with a qualified healthcare
          provider before making treatment decisions.
        </p>
      </footer>
    </div>
  );
}
