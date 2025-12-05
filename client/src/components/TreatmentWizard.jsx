import { useState, useEffect, useRef } from "react";
import { treatmentAPI, auditAPI } from "../api/patientAPI";
import { QRCodeSVG } from "qrcode.react";
import QRCode from "qrcode";
import "./TreatmentWizard.css";

const STEPS = [
  { id: "intake", label: "Patient Intake", icon: "📋" },
  { id: "analysis", label: "AI Analysis", icon: "🤖" },
  { id: "review", label: "Doctor Review", icon: "👨‍⚕️" },
  { id: "finalized", label: "Final Summary", icon: "✅" },
];

export default function TreatmentWizard({
  patient,
  existingPlan,
  onBack,
  onComplete,
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [treatmentPlan, setTreatmentPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [modifications, setModifications] = useState([]);
  const [reviewedBy, setReviewedBy] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [auditLog, setAuditLog] = useState([]);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [showDetailedView, setShowDetailedView] = useState(false);
  const [detailedData, setDetailedData] = useState(null);
  const [regenerating, setRegenerating] = useState(false);
  const [isPostApprovalEdit, setIsPostApprovalEdit] = useState(false);

  // Editable medications state for doctor modification
  const [editableMedications, setEditableMedications] = useState([]);
  const [medicationsInitialized, setMedicationsInitialized] = useState(false);

  // Ref for print content
  const printContentRef = useRef(null);

  // Generate QR code URL for sharing
  const getShareUrl = () => {
    if (!treatmentPlan?._id) return "";
    // In production, this would be your actual domain
    const baseUrl = window.location.origin;
    return `${baseUrl}/treatment/${treatmentPlan._id}`;
  };

  // Print full analysis details
  const handlePrintFullAnalysis = async () => {
    // First fetch the detailed data if not already loaded
    let currentDetailedData = detailedData;
    if (!currentDetailedData && treatmentPlan) {
      try {
        const response = await treatmentAPI.getFullDetails(treatmentPlan._id);
        currentDetailedData = response.data;
        setDetailedData(response.data);
      } catch (err) {
        console.error("Error fetching details for print:", err);
        alert("Failed to load treatment details for printing");
        return;
      }
    }

    // Generate QR code as data URL
    const shareUrl = getShareUrl();
    let qrCodeDataUrl = "";
    try {
      qrCodeDataUrl = await QRCode.toDataURL(shareUrl, {
        width: 120,
        margin: 1,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      });
    } catch (err) {
      console.error("Error generating QR code:", err);
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to print the analysis");
      return;
    }

    const safetyData = currentDetailedData?.currentPlan?.safetyAssessment || {};
    const treatment = currentDetailedData?.currentPlan?.treatment || {};
    const riskLevel = safetyData?.overallRiskLevel || "unknown";

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Treatment Plan - ${patient?.firstName} ${
      patient?.lastName
    }</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding-bottom: 20px;
            border-bottom: 2px solid #6c5ce7;
            margin-bottom: 20px;
          }
          .header-info h1 { 
            color: #6c5ce7; 
            font-size: 24px;
            margin-bottom: 5px;
          }
          .header-info p { color: #666; font-size: 14px; }
          .qr-section {
            text-align: center;
          }
          .qr-section img {
            width: 120px;
            height: 120px;
          }
          .qr-section p { 
            font-size: 10px; 
            color: #666; 
            margin-top: 5px;
            max-width: 120px;
          }
          .risk-banner {
            padding: 15px 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 15px;
          }
          .risk-critical { background: #e74c3c; color: white; }
          .risk-high { background: #e67e22; color: white; }
          .risk-moderate { background: #f1c40f; color: #333; }
          .risk-low { background: #27ae60; color: white; }
          .risk-unknown { background: #95a5a6; color: white; }
          .risk-icon { font-size: 28px; }
          .risk-text h2 { font-size: 18px; margin-bottom: 2px; }
          .risk-text p { font-size: 14px; opacity: 0.9; }
          .section {
            margin-bottom: 20px;
            padding: 15px;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
          }
          .section h3 {
            font-size: 16px;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 1px solid #eee;
          }
          .section-primary { background: #ebf5fb; border-color: #3498db; }
          .section-warning { background: #fef9e7; border-color: #f39c12; }
          .section-danger { background: #fdf2f2; border-color: #e74c3c; }
          .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
          .grid-item { font-size: 14px; }
          .grid-item strong { display: block; color: #666; font-size: 12px; }
          .med-card {
            background: #f8f9fa;
            padding: 10px;
            border-radius: 6px;
            margin-bottom: 8px;
          }
          .med-card h4 { margin-bottom: 5px; }
          .confidence-badge {
            display: inline-block;
            padding: 2px 8px;
            background: #27ae60;
            color: white;
            border-radius: 12px;
            font-size: 12px;
            margin-left: 10px;
          }
          .interaction-item, .contra-item {
            padding: 10px;
            background: white;
            border-radius: 6px;
            margin-bottom: 8px;
            border-left: 3px solid;
          }
          .interaction-item { border-color: #f39c12; }
          .contra-item { border-color: #e74c3c; }
          .severity-badge {
            display: inline-block;
            padding: 2px 8px;
            background: #f39c12;
            color: white;
            border-radius: 4px;
            font-size: 11px;
            margin-left: 10px;
          }
          .audit-item {
            padding: 8px;
            background: #f8f9fa;
            border-radius: 6px;
            margin-bottom: 8px;
            border-left: 3px solid #3498db;
            font-size: 13px;
          }
          .audit-header {
            display: flex;
            justify-content: space-between;
          }
          .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #ddd;
            text-align: center;
            font-size: 12px;
            color: #666;
          }
          .signature-area {
            margin-top: 40px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
          }
          .signature-line {
            border-top: 1px solid #333;
            padding-top: 8px;
            font-size: 12px;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-info">
            <h1>🏥 Clinical Treatment Plan</h1>
            <p><strong>Patient:</strong> ${patient?.firstName} ${
      patient?.lastName
    }</p>
            <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Status:</strong> ${(
              currentDetailedData?.status ||
              treatmentPlan?.status ||
              "N/A"
            ).toUpperCase()}</p>
            ${
              currentDetailedData?.reviewedBy
                ? `<p><strong>Reviewed By:</strong> ${currentDetailedData.reviewedBy}</p>`
                : ""
            }
          </div>
          <div class="qr-section">
            ${
              qrCodeDataUrl
                ? `<img src="${qrCodeDataUrl}" alt="QR Code" />`
                : '<div style="width:120px;height:120px;background:#f0f0f0;display:flex;align-items:center;justify-content:center;font-size:10px;color:#666;">QR Code</div>'
            }
            <p>Scan to view digital version</p>
          </div>
        </div>

        <div class="risk-banner risk-${riskLevel}">
          <div class="risk-icon">${
            riskLevel === "critical"
              ? "🔴"
              : riskLevel === "high"
              ? "🟠"
              : riskLevel === "moderate"
              ? "🟡"
              : riskLevel === "low"
              ? "🟢"
              : "⚪"
          }</div>
          <div class="risk-text">
            <h2>Risk Level: ${riskLevel.toUpperCase()}</h2>
            <p>Safety Score: ${safetyData?.riskScore || "N/A"} / 100</p>
          </div>
        </div>

        <div class="section">
          <h3>👤 Patient Information</h3>
          <div class="grid">
            <div class="grid-item"><strong>Name</strong> ${
              patient?.firstName
            } ${patient?.lastName}</div>
            <div class="grid-item"><strong>Age</strong> ${
              patient?.age || "N/A"
            }</div>
            <div class="grid-item"><strong>Sex</strong> ${
              patient?.sex || "N/A"
            }</div>
            <div class="grid-item"><strong>Condition</strong> ${(
              patient?.primaryComplaint?.condition ||
              currentDetailedData?.patient?.condition ||
              "N/A"
            ).replace(/_/g, " ")}</div>
          </div>
        </div>

        <div class="section section-primary">
          <h3>💊 Primary Medication</h3>
          ${
            treatment?.primaryMedication
              ? `
            <div class="med-card">
              <h4>${treatment.primaryMedication.name}
                ${
                  treatment.primaryMedication.confidence
                    ? `<span class="confidence-badge">${treatment.primaryMedication.confidence}% Confidence</span>`
                    : ""
                }
              </h4>
              <div class="grid">
                <div class="grid-item"><strong>Dosage</strong> ${
                  treatment.primaryMedication.dosage
                }</div>
                <div class="grid-item"><strong>Frequency</strong> ${
                  treatment.primaryMedication.frequency
                }</div>
                <div class="grid-item"><strong>Duration</strong> ${
                  treatment.primaryMedication.duration
                }</div>
              </div>
              ${
                treatment.primaryMedication.instructions
                  ? `<p style="margin-top: 8px;"><strong>Instructions:</strong> ${treatment.primaryMedication.instructions}</p>`
                  : ""
              }
            </div>
          `
              : "<p>No primary medication specified</p>"
          }
        </div>

        ${
          treatment?.supportingMedications?.length > 0
            ? `
          <div class="section">
            <h3>💉 Supporting Medications (${
              treatment.supportingMedications.length
            })</h3>
            ${treatment.supportingMedications
              .map(
                (med) => `
              <div class="med-card">
                <strong>${med.name}</strong> - ${med.dosage}, ${
                  med.frequency
                }, ${med.duration}
                ${
                  med.reason
                    ? `<p style="font-size: 13px; color: #666; margin-top: 4px;">Reason: ${med.reason}</p>`
                    : ""
                }
              </div>
            `
              )
              .join("")}
          </div>
        `
            : ""
        }

        ${
          currentDetailedData?.currentPlan?.drugInteractions?.length > 0 ||
          treatmentPlan?.analysis?.drugInteractions?.length > 0
            ? `
          <div class="section section-warning">
            <h3>⚠️ Drug Interactions</h3>
            ${(
              currentDetailedData?.currentPlan?.drugInteractions ||
              treatmentPlan?.analysis?.drugInteractions ||
              []
            )
              .map(
                (interaction) => `
              <div class="interaction-item">
                ${
                  typeof interaction === "string"
                    ? interaction
                    : `
                  <strong>${interaction.drug1 || "Drug A"} ↔ ${
                        interaction.drug2 || "Drug B"
                      }</strong>
                  <span class="severity-badge">${(
                    interaction.severity || "CHECK"
                  ).toUpperCase()}</span>
                  <p style="margin-top: 6px; font-size: 13px;">${
                    interaction.description || interaction.effect || ""
                  }</p>
                `
                }
              </div>
            `
              )
              .join("")}
          </div>
        `
            : ""
        }

        ${
          currentDetailedData?.currentPlan?.contraindications?.length > 0 ||
          treatmentPlan?.analysis?.contraindications?.length > 0
            ? `
          <div class="section section-danger">
            <h3>🚫 Contraindications</h3>
            ${(
              currentDetailedData?.currentPlan?.contraindications ||
              treatmentPlan?.analysis?.contraindications ||
              []
            )
              .map(
                (contra) => `
              <div class="contra-item">
                ${
                  typeof contra === "string"
                    ? contra
                    : contra.description ||
                      contra.reason ||
                      JSON.stringify(contra)
                }
              </div>
            `
              )
              .join("")}
          </div>
        `
            : ""
        }

        <div class="section">
          <h3>📝 Clinical Rationale</h3>
          ${(() => {
            const rationale =
              currentDetailedData?.currentPlan?.rationale ||
              treatmentPlan?.analysis?.rationale;
            if (!rationale) return "<p>No rationale provided</p>";
            if (typeof rationale === "string") return `<p>${rationale}</p>`;
            let html = "";
            if (rationale.summary)
              html += `<p><strong>Summary:</strong> ${rationale.summary}</p>`;
            if (rationale.reasoning)
              html += `<p><strong>Reasoning:</strong> ${rationale.reasoning}</p>`;
            if (rationale.evidenceBasis)
              html += `<p><strong>Evidence Basis:</strong> ${rationale.evidenceBasis}</p>`;
            if (rationale.clinicalGuidelines)
              html += `<p><strong>Clinical Guidelines:</strong> ${rationale.clinicalGuidelines}</p>`;
            if (rationale.considerations) {
              html += `<p><strong>Key Considerations:</strong></p><ul>`;
              if (Array.isArray(rationale.considerations)) {
                rationale.considerations.forEach(
                  (c) => (html += `<li>${c}</li>`)
                );
              } else {
                html += `<li>${rationale.considerations}</li>`;
              }
              html += `</ul>`;
            }
            return html || "<p>No rationale provided</p>";
          })()}
        </div>

        ${
          currentDetailedData?.currentPlan?.alternatives?.length > 0 ||
          treatmentPlan?.analysis?.alternatives?.length > 0
            ? `
          <div class="section">
            <h3>🔄 Alternative Treatments</h3>
            ${(
              currentDetailedData?.currentPlan?.alternatives ||
              treatmentPlan?.analysis?.alternatives ||
              []
            )
              .map(
                (alt) => `
              <div class="med-card">
                <strong>${alt.name || alt.medication}</strong>
                ${alt.reason ? ` - ${alt.reason}` : ""}
              </div>
            `
              )
              .join("")}
          </div>
        `
            : ""
        }

        <div class="section">
          <h3>📜 Audit Trail</h3>
          ${
            auditLog?.length > 0
              ? auditLog
                  .map(
                    (entry) => `
            <div class="audit-item">
              <div class="audit-header">
                <strong>${(entry.action || "").replace(/_/g, " ")}</strong>
                <span>${new Date(entry.createdAt).toLocaleString()}</span>
              </div>
              <p>By: ${entry.performedBy?.userName || "Unknown"} (${
                      entry.performedBy?.role || "N/A"
                    })</p>
              ${
                entry.details?.description
                  ? `<p style="color: #666;">${entry.details.description}</p>`
                  : ""
              }
            </div>
          `
                  )
                  .join("")
              : "<p>No audit entries available</p>"
          }
        </div>

        <div class="signature-area">
          <div>
            <div class="signature-line">Physician Signature</div>
          </div>
          <div>
            <div class="signature-line">Date</div>
          </div>
        </div>

        <div class="footer">
          <p>⚕️ AI-Generated Treatment Plan - Must be verified by qualified medical professional</p>
          <p>Generated by Clinical Assistant System | ${new Date().toISOString()}</p>
          <p>Document ID: ${treatmentPlan?._id || "N/A"}</p>
        </div>

        <script>
          // Auto print after page loads
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  useEffect(() => {
    // If an existing plan was passed, use it directly and jump to appropriate step
    if (existingPlan) {
      setTreatmentPlan(existingPlan);

      // Determine which step to show based on plan status
      if (
        existingPlan.status === "approved" ||
        existingPlan.status === "modified" ||
        existingPlan.status === "rejected"
      ) {
        setCurrentStep(3); // Final summary
      } else if (
        existingPlan.workflowStep === "review" ||
        existingPlan.status === "pending"
      ) {
        setCurrentStep(2); // Review step
      } else {
        const stepIndex = STEPS.findIndex(
          (s) => s.id === existingPlan.workflowStep
        );
        setCurrentStep(stepIndex >= 0 ? stepIndex : 1);
      }

      // Fetch audit log for existing plan
      fetchAuditLog(existingPlan._id);
    } else if (patient?._id) {
      fetchExistingPlan();
    }
  }, [patient, existingPlan]);

  const fetchExistingPlan = async () => {
    try {
      setLoading(true);
      const response = await treatmentAPI.getByPatient(patient._id);
      if (response.data && response.data.length > 0) {
        const plan = response.data[0];
        setTreatmentPlan(plan);

        // Set step based on workflow status
        const stepIndex = STEPS.findIndex((s) => s.id === plan.workflowStep);
        if (stepIndex >= 0) {
          setCurrentStep(stepIndex);
        }

        // Fetch audit log
        fetchAuditLog(plan._id);
      }
    } catch (err) {
      console.error("Error fetching treatment plan:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLog = async (treatmentPlanId) => {
    try {
      const response = await auditAPI.getTreatmentAudit(treatmentPlanId);
      setAuditLog(response.data || []);
    } catch (err) {
      console.error("Error fetching audit log:", err);
    }
  };

  // Enter review step - capture initial AI output for audit
  const handleEnterReview = async () => {
    if (treatmentPlan) {
      try {
        await treatmentAPI.enterReview(treatmentPlan._id, {
          reviewedBy: reviewedBy || "Reviewing Physician",
        });
        fetchAuditLog(treatmentPlan._id);
      } catch (err) {
        console.error("Error entering review:", err);
      }
    }
    setCurrentStep(2);
  };

  // Fetch full analysis details for detailed view modal
  const fetchDetailedView = async () => {
    if (!treatmentPlan) {
      console.log("[DEBUG] No treatment plan available");
      return;
    }
    console.log("[DEBUG] Fetching detailed view for plan:", treatmentPlan._id);
    try {
      setLoading(true);
      setError(null);
      const response = await treatmentAPI.getFullDetails(treatmentPlan._id);
      console.log("[DEBUG] Detailed data received:", response.data);
      setDetailedData(response.data);
      setShowDetailedView(true);
      console.log("[DEBUG] Modal should now be visible");
    } catch (err) {
      setError(
        "Failed to fetch detailed analysis: " +
          (err.response?.data?.message || err.message)
      );
      console.error("[DEBUG] Error fetching details:", err);
    } finally {
      setLoading(false);
    }
  };

  // Regenerate treatment plan
  const handleRegenerate = async () => {
    if (!treatmentPlan) return;

    const confirmed = window.confirm(
      "This will re-run the AI analysis with current patient data. The existing plan will be replaced. Continue?"
    );
    if (!confirmed) return;

    try {
      setRegenerating(true);
      setError(null);
      const response = await treatmentAPI.regenerate(treatmentPlan._id, {
        requestedBy: reviewedBy || "Physician",
        reason: "Re-analysis requested",
      });
      setTreatmentPlan(response.data);
      setCurrentStep(1); // Go back to analysis step
      setMedicationsInitialized(false); // Reset medications
      setEditableMedications([]);
      fetchAuditLog(response.data._id);
      setShowDetailedView(false);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to regenerate treatment plan"
      );
    } finally {
      setRegenerating(false);
    }
  };

  // Handle post-approval modification
  const handlePostApprovalModify = async () => {
    if (!reviewedBy.trim()) {
      setError("Please enter your name to modify");
      return;
    }

    try {
      setLoading(true);
      const allMods = getAllModifications();

      const medicationData = {
        primaryMedication: editableMedications.find((m) => m.isPrimary) || null,
        supportingMedications: editableMedications.filter((m) => !m.isPrimary),
      };

      const response = await treatmentAPI.postApprovalModify(
        treatmentPlan._id,
        {
          modifications: allMods,
          reviewedBy,
          reviewNotes,
          updatedMedications: medicationData,
        }
      );

      setTreatmentPlan(response.data);
      fetchAuditLog(response.data._id);
      setModifications([]);
      setMedicationsInitialized(false); // Reset to reload medications from updated plan
      setIsPostApprovalEdit(false);
      setError(null);
    } catch (err) {
      setError(
        "Failed to save modifications: " +
          (err.response?.data?.message || err.message)
      );
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
      setCurrentStep(1); // Move to analysis step
      fetchAuditLog(response.data._id);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to generate treatment plan. Please check your API key."
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async () => {
    if (!reviewedBy.trim()) {
      setError("Please enter your name to approve");
      return;
    }

    try {
      setLoading(true);
      const response = await treatmentAPI.approve(treatmentPlan._id, {
        reviewedBy,
        reviewNotes,
      });
      setTreatmentPlan(response.data);
      setCurrentStep(3); // Move to finalized
      fetchAuditLog(response.data._id);
    } catch (err) {
      setError("Failed to approve treatment plan");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!reviewedBy.trim()) {
      setError("Please enter your name to reject");
      return;
    }

    try {
      setLoading(true);
      const response = await treatmentAPI.reject(treatmentPlan._id, {
        reviewedBy,
        reviewNotes,
      });
      setTreatmentPlan(response.data);
      fetchAuditLog(response.data._id);
    } catch (err) {
      setError("Failed to reject treatment plan");
    } finally {
      setLoading(false);
    }
  };

  const handleModify = async () => {
    if (!reviewedBy.trim()) {
      setError("Please enter your name to modify");
      return;
    }

    try {
      setLoading(true);

      // Build the complete modified medications list
      const allMods = getAllModifications();

      // Prepare the medication data to send to server
      const medicationData = {
        primaryMedication: editableMedications.find((m) => m.isPrimary) || null,
        supportingMedications: editableMedications.filter((m) => !m.isPrimary),
      };

      const response = await treatmentAPI.modify(treatmentPlan._id, {
        modifications: allMods,
        reviewedBy,
        reviewNotes,
        updatedMedications: medicationData,
      });
      setTreatmentPlan(response.data);
      setCurrentStep(3); // Move to finalized
      fetchAuditLog(response.data._id);
      setModifications([]);
      setMedicationsInitialized(false); // Reset to reload medications from updated plan
    } catch (err) {
      setError(
        "Failed to modify treatment plan: " +
          (err.response?.data?.message || err.message)
      );
    } finally {
      setLoading(false);
    }
  };

  // Initialize editable medications from treatment plan
  useEffect(() => {
    if (treatmentPlan && !medicationsInitialized) {
      const medications = [];

      // Add primary medication
      if (treatmentPlan.treatment?.primaryMedication) {
        medications.push({
          id: `primary-${Date.now()}`,
          isPrimary: true,
          name: treatmentPlan.treatment.primaryMedication.name || "",
          dosage: treatmentPlan.treatment.primaryMedication.dosage || "",
          frequency: treatmentPlan.treatment.primaryMedication.frequency || "",
          duration: treatmentPlan.treatment.primaryMedication.duration || "",
          instructions:
            treatmentPlan.treatment.primaryMedication.instructions || "",
          isNew: false,
        });
      }

      // Add supporting medications
      if (treatmentPlan.treatment?.supportingMedications) {
        treatmentPlan.treatment.supportingMedications.forEach((med, index) => {
          medications.push({
            id: `supporting-${index}-${Date.now()}`,
            isPrimary: false,
            name: med.name || "",
            dosage: med.dosage || "",
            frequency: med.frequency || "",
            duration: med.duration || "",
            instructions: med.instructions || med.reason || "",
            isNew: false,
          });
        });
      }

      setEditableMedications(medications);
      setMedicationsInitialized(true);
    }
  }, [treatmentPlan, medicationsInitialized]);

  // Update a medication field
  const updateMedication = (id, field, value) => {
    setEditableMedications((prev) =>
      prev.map((med) => (med.id === id ? { ...med, [field]: value } : med))
    );
  };

  // Add a new medication
  const addNewMedication = () => {
    const newMed = {
      id: `new-${Date.now()}`,
      isPrimary: false,
      name: "",
      dosage: "",
      frequency: "",
      duration: "",
      instructions: "",
      isNew: true,
    };
    setEditableMedications((prev) => [...prev, newMed]);
  };

  // Remove a medication
  const removeMedication = (id) => {
    setEditableMedications((prev) => prev.filter((med) => med.id !== id));
  };

  // Set a medication as primary
  const setPrimaryMedication = (id) => {
    setEditableMedications((prev) =>
      prev.map((med) => ({
        ...med,
        isPrimary: med.id === id,
      }))
    );
  };

  // Build modifications from editable medications
  const buildMedicationModifications = () => {
    if (!treatmentPlan) return [];

    const mods = [];
    const primaryMed = editableMedications.find((m) => m.isPrimary);
    const originalPrimary = treatmentPlan.treatment?.primaryMedication;

    // Check primary medication changes
    if (primaryMed && originalPrimary) {
      if (primaryMed.name !== originalPrimary.name) {
        mods.push({
          field: "primaryMedication.name",
          originalValue: originalPrimary.name,
          newValue: primaryMed.name,
          reason: "Physician modification",
        });
      }
      if (primaryMed.dosage !== originalPrimary.dosage) {
        mods.push({
          field: "primaryMedication.dosage",
          originalValue: originalPrimary.dosage,
          newValue: primaryMed.dosage,
          reason: "Physician modification",
        });
      }
      if (primaryMed.frequency !== originalPrimary.frequency) {
        mods.push({
          field: "primaryMedication.frequency",
          originalValue: originalPrimary.frequency,
          newValue: primaryMed.frequency,
          reason: "Physician modification",
        });
      }
      if (primaryMed.duration !== originalPrimary.duration) {
        mods.push({
          field: "primaryMedication.duration",
          originalValue: originalPrimary.duration,
          newValue: primaryMed.duration,
          reason: "Physician modification",
        });
      }
    }

    // Track new medications added
    const newMeds = editableMedications.filter((m) => m.isNew && m.name.trim());
    if (newMeds.length > 0) {
      mods.push({
        field: "medications.added",
        originalValue: "0 medications",
        newValue: `${newMeds.length} medication(s) added: ${newMeds
          .map((m) => m.name)
          .join(", ")}`,
        reason: "Physician added medications",
      });
    }

    // Track removed medications
    const originalSupporting =
      treatmentPlan.treatment?.supportingMedications || [];
    const currentIds = editableMedications
      .filter((m) => !m.isNew)
      .map((m) => m.name);
    const removedMeds = originalSupporting.filter(
      (m) => !currentIds.includes(m.name)
    );
    if (removedMeds.length > 0) {
      mods.push({
        field: "medications.removed",
        originalValue: `${removedMeds.length} medication(s)`,
        newValue: `Removed: ${removedMeds.map((m) => m.name).join(", ")}`,
        reason: "Physician removed medications",
      });
    }

    return mods;
  };

  // Get all modifications (original + medication changes)
  const getAllModifications = () => {
    return [...modifications, ...buildMedicationModifications()];
  };

  const addModification = (field, originalValue, newValue, reason) => {
    // Only add if values actually changed
    if (originalValue === newValue || !newValue?.trim()) {
      return;
    }

    setModifications((prev) => {
      // Remove any existing modification for this field
      const filtered = prev.filter((m) => m.field !== field);
      // Add the new modification
      return [...filtered, { field, originalValue, newValue, reason }];
    });
  };

  const formatCondition = (condition) => {
    return (
      condition?.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) ||
      "N/A"
    );
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 90) return "#27ae60";
    if (confidence >= 70) return "#f39c12";
    if (confidence >= 50) return "#e67e22";
    return "#e74c3c";
  };

  const getConfidenceLabel = (confidence) => {
    if (confidence >= 90) return "High";
    if (confidence >= 70) return "Moderate";
    if (confidence >= 50) return "Low";
    return "Very Low";
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

  // Render Step Indicators
  const renderStepIndicator = () => (
    <div className="wizard-steps">
      {STEPS.map((step, index) => (
        <div
          key={step.id}
          className={`wizard-step ${index === currentStep ? "active" : ""} ${
            index < currentStep ? "completed" : ""
          }`}
        >
          <div className="step-icon">{step.icon}</div>
          <div className="step-label">{step.label}</div>
          {index < STEPS.length - 1 && <div className="step-connector" />}
        </div>
      ))}
    </div>
  );

  // Step 0: Intake Summary
  const renderIntakeStep = () => (
    <div className="wizard-content intake-step">
      <h2>Patient Intake Summary</h2>

      <div className="intake-grid">
        <div className="intake-section">
          <h3>👤 Demographics</h3>
          <div className="intake-details">
            <p>
              <strong>Name:</strong> {patient.firstName} {patient.lastName}
            </p>
            <p>
              <strong>Age:</strong> {patient.healthMetrics?.age || "N/A"} years
            </p>
            <p>
              <strong>Gender:</strong> {patient.gender || "N/A"}
            </p>
            <p>
              <strong>BMI:</strong>{" "}
              {patient.healthMetrics?.bmi?.toFixed(1) || "N/A"}
            </p>
          </div>
        </div>

        <div className="intake-section">
          <h3>🩺 Primary Complaint</h3>
          <div className="intake-details">
            <p>
              <strong>Condition:</strong>{" "}
              {formatCondition(patient.primaryComplaint?.condition)}
            </p>
            <p>
              <strong>Severity:</strong>{" "}
              {patient.primaryComplaint?.severity || "N/A"}
            </p>
            <p>
              <strong>Duration:</strong>{" "}
              {patient.primaryComplaint?.duration || "N/A"}
            </p>
          </div>
        </div>

        <div className="intake-section">
          <h3>💊 Current Medications</h3>
          <div className="medication-list">
            {patient.currentMedications?.length > 0 ? (
              patient.currentMedications.map((med, idx) => (
                <div key={idx} className="med-item">
                  <span className="med-name">{med.drugName}</span>
                  <span className="med-dosage">
                    {med.dosage} - {med.frequency}
                  </span>
                </div>
              ))
            ) : (
              <p className="no-data">No current medications</p>
            )}
          </div>
        </div>

        <div className="intake-section">
          <h3>📋 Medical History</h3>
          <div className="intake-details">
            <p>
              <strong>Conditions:</strong>
            </p>
            <div className="tag-list">
              {patient.medicalHistory?.conditions?.map((c, idx) => (
                <span key={idx} className="tag condition">
                  {formatCondition(c)}
                </span>
              )) || <span className="no-data">None</span>}
            </div>
            <p>
              <strong>Allergies:</strong>
            </p>
            <div className="tag-list">
              {patient.medicalHistory?.allergies?.map((a, idx) => (
                <span key={idx} className="tag allergy">
                  ⚠️ {a}
                </span>
              )) || <span className="no-data">None</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="step-actions">
        <button className="btn-secondary" onClick={onBack}>
          ← Back to Patients
        </button>
        <button
          className="btn-primary"
          onClick={handleGeneratePlan}
          disabled={generating}
        >
          {generating ? (
            <>
              <span className="spinner-small"></span>
              Generating...
            </>
          ) : (
            "Generate AI Treatment Plan →"
          )}
        </button>
      </div>
    </div>
  );

  // Step 1: AI Analysis
  const renderAnalysisStep = () => (
    <div className="wizard-content analysis-step">
      <h2>AI Treatment Analysis</h2>

      {treatmentPlan && (
        <>
          {/* Risk Assessment */}
          <div
            className={`risk-banner ${treatmentPlan.safetyAssessment?.overallRiskLevel}`}
          >
            <div className="risk-icon">
              {getRiskIcon(treatmentPlan.safetyAssessment?.overallRiskLevel)}
            </div>
            <div className="risk-info">
              <h3>
                Risk Level:{" "}
                {treatmentPlan.safetyAssessment?.overallRiskLevel?.toUpperCase()}
              </h3>
              <p>Risk Score: {treatmentPlan.safetyAssessment?.riskScore}/100</p>
            </div>
            <div
              className="confidence-badge"
              style={{
                backgroundColor: getConfidenceColor(
                  treatmentPlan.rationale?.overallConfidence || 75
                ),
              }}
            >
              <span>
                {getConfidenceLabel(
                  treatmentPlan.rationale?.overallConfidence || 75
                )}{" "}
                Confidence
              </span>
              <span>{treatmentPlan.rationale?.overallConfidence || 75}%</span>
            </div>
          </div>

          {/* Validation Status */}
          {treatmentPlan.validation && (
            <div className="validation-status">
              <h4>
                {treatmentPlan.validation.schemaValid ? "✅" : "⚠️"}
                Schema Validation:{" "}
                {treatmentPlan.validation.schemaValid
                  ? "Passed"
                  : "Issues Found"}
              </h4>
              {treatmentPlan.validation.databaseCrossCheck?.performed && (
                <div className="crosscheck-info">
                  <span>🔍 Database Cross-Check:</span>
                  <span className="verified">
                    {
                      treatmentPlan.validation.databaseCrossCheck
                        .interactionsVerified
                    }{" "}
                    verified
                  </span>
                  <span className="unverified">
                    {
                      treatmentPlan.validation.databaseCrossCheck
                        .interactionsUnverified
                    }{" "}
                    AI-only
                  </span>
                  <span className="db-only">
                    {
                      treatmentPlan.validation.databaseCrossCheck
                        .databaseOnlyFindings
                    }{" "}
                    DB-only
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Drug Interactions */}
          {treatmentPlan.drugInteractions?.length > 0 && (
            <div className="analysis-section interactions">
              <h3>⚠️ Drug Interactions</h3>
              <div className="interaction-list">
                {treatmentPlan.drugInteractions.map((int, idx) => (
                  <div key={idx} className={`interaction-item ${int.severity}`}>
                    <div className="interaction-header">
                      <span className="drug-pair">
                        {int.drug1} + {int.drug2}
                      </span>
                      <span className={`severity-badge ${int.severity}`}>
                        {int.severity}
                      </span>
                      {int.verifiedByDatabase && (
                        <span className="verified-badge">✓ Verified</span>
                      )}
                    </div>
                    <p>{int.description}</p>
                    <p className="recommendation">
                      <strong>Recommendation:</strong> {int.recommendation}
                    </p>
                    {int.confidence && (
                      <div className="confidence-bar">
                        <div
                          className="confidence-fill"
                          style={{
                            width: `${int.confidence}%`,
                            backgroundColor: getConfidenceColor(int.confidence),
                          }}
                        />
                        <span>{int.confidence}% confidence</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Treatment */}
          <div className="analysis-section treatment">
            <h3>💊 Recommended Treatment</h3>
            <div className="treatment-card">
              <div className="primary-med">
                <h4>Primary Medication</h4>
                <div className="med-details">
                  <span className="med-name">
                    {treatmentPlan.treatment?.primaryMedication?.name}
                  </span>
                  <span>
                    {treatmentPlan.treatment?.primaryMedication?.dosage}
                  </span>
                  <span>
                    {treatmentPlan.treatment?.primaryMedication?.frequency}
                  </span>
                  <span>
                    {treatmentPlan.treatment?.primaryMedication?.duration}
                  </span>
                </div>
                {treatmentPlan.treatment?.primaryMedication?.confidence && (
                  <div className="confidence-indicator">
                    <span
                      style={{
                        color: getConfidenceColor(
                          treatmentPlan.treatment.primaryMedication.confidence
                        ),
                      }}
                    >
                      {getConfidenceLabel(
                        treatmentPlan.treatment.primaryMedication.confidence
                      )}{" "}
                      Confidence (
                      {treatmentPlan.treatment.primaryMedication.confidence}%)
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Alternative Treatments */}
          {treatmentPlan.alternatives?.length > 0 && (
            <div className="analysis-section alternatives">
              <h3>🔄 Alternative Treatment Options</h3>
              <div className="alternatives-grid">
                {treatmentPlan.alternatives.map((alt, idx) => (
                  <div key={idx} className="alternative-card">
                    <div className="alt-header">
                      <span className="alt-name">{alt.medication}</span>
                      <span className="suitability-score">
                        {alt.suitabilityScore}% suitable
                      </span>
                    </div>
                    {alt.dosage && <p className="alt-dosage">{alt.dosage}</p>}
                    <p className="alt-reason">{alt.reason}</p>
                    {alt.confidence && (
                      <div className="confidence-bar small">
                        <div
                          className="confidence-fill"
                          style={{
                            width: `${alt.confidence}%`,
                            backgroundColor: getConfidenceColor(alt.confidence),
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rationale */}
          <div className="analysis-section rationale">
            <h3>📝 Clinical Rationale</h3>
            <div className="rationale-content">
              <p>
                <strong>Summary:</strong> {treatmentPlan.rationale?.summary}
              </p>
              <p>
                <strong>Clinical Reasoning:</strong>{" "}
                {treatmentPlan.rationale?.clinicalReasoning}
              </p>
              <p>
                <strong>Evidence Basis:</strong>{" "}
                {treatmentPlan.rationale?.evidenceBasis}
              </p>
            </div>
          </div>
        </>
      )}

      <div className="step-actions">
        <button className="btn-secondary" onClick={() => setCurrentStep(0)}>
          ← Back to Intake
        </button>
        <button className="btn-detail" onClick={fetchDetailedView}>
          🔍 View Full Analysis Details
        </button>
        <button className="btn-primary" onClick={handleEnterReview}>
          Proceed to Review →
        </button>
      </div>
    </div>
  );

  // Step 2: Doctor Review
  const renderReviewStep = () => {
    const allMods = getAllModifications();

    return (
      <div className="wizard-content review-step">
        <h2>Physician Review & Decision</h2>

        {treatmentPlan && (
          <>
            {/* Medications Management Section */}
            <div className="medications-management">
              <div className="section-header">
                <h3>💊 Medication Plan</h3>
                <button className="btn-add-med" onClick={addNewMedication}>
                  + Add Medication
                </button>
              </div>

              <div className="medications-list-editable">
                {editableMedications.map((med, index) => (
                  <div
                    key={med.id}
                    className={`medication-card-editable ${
                      med.isPrimary ? "primary" : ""
                    } ${med.isNew ? "new" : ""}`}
                  >
                    <div className="med-card-header">
                      <div className="med-type-badge">
                        {med.isPrimary
                          ? "⭐ Primary"
                          : med.isNew
                          ? "✨ New"
                          : `#${index + 1}`}
                      </div>
                      <div className="med-card-actions">
                        {!med.isPrimary && (
                          <button
                            className="btn-set-primary"
                            onClick={() => setPrimaryMedication(med.id)}
                            title="Set as primary medication"
                          >
                            ⭐
                          </button>
                        )}
                        {editableMedications.length > 1 && (
                          <button
                            className="btn-remove-med"
                            onClick={() => removeMedication(med.id)}
                            title="Remove medication"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="med-fields-grid">
                      <div className="med-field">
                        <label>Medication Name *</label>
                        <input
                          type="text"
                          value={med.name}
                          onChange={(e) =>
                            updateMedication(med.id, "name", e.target.value)
                          }
                          placeholder="e.g., Sildenafil"
                        />
                      </div>
                      <div className="med-field">
                        <label>Dosage *</label>
                        <input
                          type="text"
                          value={med.dosage}
                          onChange={(e) =>
                            updateMedication(med.id, "dosage", e.target.value)
                          }
                          placeholder="e.g., 50mg"
                        />
                      </div>
                      <div className="med-field">
                        <label>Frequency *</label>
                        <input
                          type="text"
                          value={med.frequency}
                          onChange={(e) =>
                            updateMedication(
                              med.id,
                              "frequency",
                              e.target.value
                            )
                          }
                          placeholder="e.g., Once daily"
                        />
                      </div>
                      <div className="med-field">
                        <label>Duration *</label>
                        <input
                          type="text"
                          value={med.duration}
                          onChange={(e) =>
                            updateMedication(med.id, "duration", e.target.value)
                          }
                          placeholder="e.g., 30 days"
                        />
                      </div>
                    </div>

                    <div className="med-field full-width">
                      <label>Special Instructions</label>
                      <input
                        type="text"
                        value={med.instructions}
                        onChange={(e) =>
                          updateMedication(
                            med.id,
                            "instructions",
                            e.target.value
                          )
                        }
                        placeholder="e.g., Take with food"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modifications Pending */}
            {allMods.length > 0 && (
              <div className="modifications-pending">
                <h4>📝 Pending Modifications ({allMods.length})</h4>
                <ul>
                  {allMods.map((mod, idx) => (
                    <li key={idx}>
                      <strong>{mod.field}:</strong>{" "}
                      {mod.originalValue || "(empty)"} → {mod.newValue}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Warning for Critical Risk */}
            {treatmentPlan.safetyAssessment?.overallRiskLevel ===
              "critical" && (
              <div className="critical-warning">
                <h4>🚨 Critical Risk Warning</h4>
                <p>
                  This treatment plan has critical safety concerns. Please
                  review all drug interactions and contraindications carefully
                  before approving.
                </p>
                <label className="acknowledge-checkbox">
                  <input type="checkbox" required />I acknowledge the critical
                  risk and have reviewed all safety concerns
                </label>
              </div>
            )}

            {/* Reviewer Information */}
            <div className="reviewer-section">
              <div className="form-group">
                <label>Reviewing Physician *</label>
                <input
                  type="text"
                  value={reviewedBy}
                  onChange={(e) => setReviewedBy(e.target.value)}
                  placeholder="Dr. Smith"
                />
              </div>
              <div className="form-group">
                <label>Review Notes</label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Clinical notes, justifications, or concerns..."
                  rows={3}
                />
              </div>
            </div>

            {error && <div className="error-message">{error}</div>}
          </>
        )}

        <div className="step-actions review-actions">
          <button className="btn-secondary" onClick={() => setCurrentStep(1)}>
            ← Back to Analysis
          </button>
          <div className="decision-buttons">
            <button
              className="btn-reject"
              onClick={handleReject}
              disabled={loading || !reviewedBy.trim()}
            >
              ✕ Reject
            </button>
            {allMods.length > 0 ? (
              <button
                className="btn-modify"
                onClick={handleModify}
                disabled={loading || !reviewedBy.trim()}
              >
                ✓ Approve with Modifications
              </button>
            ) : (
              <button
                className="btn-approve"
                onClick={handleApprove}
                disabled={loading || !reviewedBy.trim()}
              >
                ✓ Approve
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Step 3: Final Summary
  const renderFinalStep = () => {
    const allMods = getAllModifications();

    return (
      <div className="wizard-content final-step">
        <h2>
          ✅ Treatment Plan{" "}
          {isPostApprovalEdit ? "- Editing Mode" : "Finalized"}
        </h2>

        {treatmentPlan && (
          <>
            <div className="final-status">
              <div className={`status-badge ${treatmentPlan.status}`}>
                {treatmentPlan.status === "approved" && "✅ Approved"}
                {treatmentPlan.status === "modified" &&
                  "✏️ Modified & Approved"}
                {treatmentPlan.status === "rejected" && "❌ Rejected"}
              </div>
              <p>
                Reviewed by <strong>{treatmentPlan.reviewedBy}</strong> on{" "}
                {new Date(treatmentPlan.reviewedAt).toLocaleString()}
              </p>
              {treatmentPlan.postApprovalModifications > 0 && (
                <p className="post-approval-count">
                  📝 {treatmentPlan.postApprovalModifications} post-approval
                  modification(s)
                </p>
              )}
            </div>

            {/* Post-Approval Edit Mode */}
            {isPostApprovalEdit ? (
              <>
                <div className="post-approval-edit-section">
                  <h3>✏️ Modify Treatment Plan</h3>
                  <p className="edit-notice">
                    You are making a post-approval modification. All changes
                    will be logged in the audit trail.
                  </p>

                  {/* Medications Management - reuse from review step */}
                  <div className="medications-management">
                    <div className="section-header">
                      <h4>💊 Medication Plan</h4>
                      <button
                        className="btn-add-med"
                        onClick={addNewMedication}
                      >
                        + Add Medication
                      </button>
                    </div>

                    <div className="medications-list-editable">
                      {editableMedications.map((med, index) => (
                        <div
                          key={med.id}
                          className={`medication-card-editable ${
                            med.isPrimary ? "primary" : ""
                          } ${med.isNew ? "new" : ""}`}
                        >
                          <div className="med-card-header">
                            <div className="med-type-badge">
                              {med.isPrimary
                                ? "⭐ Primary"
                                : med.isNew
                                ? "✨ New"
                                : `#${index + 1}`}
                            </div>
                            <div className="med-card-actions">
                              {!med.isPrimary && (
                                <button
                                  className="btn-set-primary"
                                  onClick={() => setPrimaryMedication(med.id)}
                                  title="Set as primary"
                                >
                                  ⭐
                                </button>
                              )}
                              {editableMedications.length > 1 && (
                                <button
                                  className="btn-remove-med"
                                  onClick={() => removeMedication(med.id)}
                                  title="Remove"
                                >
                                  🗑️
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="med-fields-grid">
                            <div className="med-field">
                              <label>Medication Name *</label>
                              <input
                                type="text"
                                value={med.name}
                                onChange={(e) =>
                                  updateMedication(
                                    med.id,
                                    "name",
                                    e.target.value
                                  )
                                }
                                placeholder="e.g., Sildenafil"
                              />
                            </div>
                            <div className="med-field">
                              <label>Dosage *</label>
                              <input
                                type="text"
                                value={med.dosage}
                                onChange={(e) =>
                                  updateMedication(
                                    med.id,
                                    "dosage",
                                    e.target.value
                                  )
                                }
                                placeholder="e.g., 50mg"
                              />
                            </div>
                            <div className="med-field">
                              <label>Frequency *</label>
                              <input
                                type="text"
                                value={med.frequency}
                                onChange={(e) =>
                                  updateMedication(
                                    med.id,
                                    "frequency",
                                    e.target.value
                                  )
                                }
                                placeholder="e.g., Once daily"
                              />
                            </div>
                            <div className="med-field">
                              <label>Duration *</label>
                              <input
                                type="text"
                                value={med.duration}
                                onChange={(e) =>
                                  updateMedication(
                                    med.id,
                                    "duration",
                                    e.target.value
                                  )
                                }
                                placeholder="e.g., 30 days"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pending modifications */}
                  {allMods.length > 0 && (
                    <div className="modifications-pending">
                      <h4>📝 Changes to Save ({allMods.length})</h4>
                      <ul>
                        {allMods.map((mod, idx) => (
                          <li key={idx}>
                            <strong>{mod.field}:</strong>{" "}
                            {mod.originalValue || "(empty)"} → {mod.newValue}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Reviewer info for post-approval */}
                  <div className="reviewer-section">
                    <div className="form-group">
                      <label>Modifying Physician *</label>
                      <input
                        type="text"
                        value={reviewedBy}
                        onChange={(e) => setReviewedBy(e.target.value)}
                        placeholder="Dr. Smith"
                      />
                    </div>
                    <div className="form-group">
                      <label>Modification Notes *</label>
                      <textarea
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        placeholder="Clinical justification for this modification..."
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                <div className="step-actions">
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setIsPostApprovalEdit(false);
                      setMedicationsInitialized(false);
                      setModifications([]);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn-approve"
                    onClick={handlePostApprovalModify}
                    disabled={
                      loading || !reviewedBy.trim() || allMods.length === 0
                    }
                  >
                    💾 Save Modifications
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Normal View - Final Treatment Summary */}
                <div className="final-summary">
                  <h3>📋 Final Treatment Plan</h3>
                  <div className="summary-grid">
                    <div className="summary-item">
                      <label>Patient</label>
                      <span>
                        {patient.firstName} {patient.lastName}
                      </span>
                    </div>
                    <div className="summary-item">
                      <label>Condition</label>
                      <span>
                        {formatCondition(patient.primaryComplaint?.condition)}
                      </span>
                    </div>
                    <div className="summary-item">
                      <label>Medication</label>
                      <span>
                        {treatmentPlan.treatment?.primaryMedication?.name}
                      </span>
                    </div>
                    <div className="summary-item">
                      <label>Dosage</label>
                      <span>
                        {treatmentPlan.treatment?.primaryMedication?.dosage}
                      </span>
                    </div>
                    <div className="summary-item">
                      <label>Frequency</label>
                      <span>
                        {treatmentPlan.treatment?.primaryMedication?.frequency}
                      </span>
                    </div>
                    <div className="summary-item">
                      <label>Duration</label>
                      <span>
                        {treatmentPlan.treatment?.primaryMedication?.duration}
                      </span>
                    </div>
                  </div>

                  {/* Supporting Medications */}
                  {treatmentPlan.treatment?.supportingMedications?.length >
                    0 && (
                    <div className="supporting-meds-final">
                      <h4>Supporting Medications</h4>
                      {treatmentPlan.treatment.supportingMedications.map(
                        (med, idx) => (
                          <div key={idx} className="supporting-med-item">
                            <strong>{med.name}</strong> - {med.dosage},{" "}
                            {med.frequency}
                            {med.duration && ` for ${med.duration}`}
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>

                {/* Modifications Applied */}
                {treatmentPlan.modifications?.length > 0 && (
                  <div className="modifications-applied">
                    <h3>
                      ✏️ Modification History (
                      {treatmentPlan.modifications.length})
                    </h3>
                    <ul>
                      {treatmentPlan.modifications.map((mod, idx) => (
                        <li
                          key={idx}
                          className={mod.isPostApproval ? "post-approval" : ""}
                        >
                          <strong>{mod.field}:</strong> {mod.originalValue} →{" "}
                          {mod.newValue}
                          <span className="mod-reason">({mod.reason})</span>
                          {mod.isPostApproval && (
                            <span className="post-approval-tag">
                              Post-Approval
                            </span>
                          )}
                          {mod.modifiedBy && (
                            <span className="mod-by">by {mod.modifiedBy}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Review Notes */}
                {treatmentPlan.reviewNotes && (
                  <div className="review-notes-final">
                    <h3>📝 Review Notes</h3>
                    <p>{treatmentPlan.reviewNotes}</p>
                  </div>
                )}

                {/* Action Buttons Row */}
                <div className="final-actions-row">
                  <button className="btn-detail" onClick={fetchDetailedView}>
                    🔍 View Full Analysis Details
                  </button>
                  <button
                    className="btn-modify-post"
                    onClick={() => {
                      setIsPostApprovalEdit(true);
                      setMedicationsInitialized(false);
                    }}
                  >
                    ✏️ Modify Treatment Plan
                  </button>
                  <button
                    className="btn-regenerate"
                    onClick={handleRegenerate}
                    disabled={regenerating}
                  >
                    {regenerating
                      ? "🔄 Regenerating..."
                      : "🔄 Re-Analyze with AI"}
                  </button>
                </div>

                {/* Audit Log Toggle */}
                <button
                  className="btn-audit-toggle"
                  onClick={() => setShowAuditLog(!showAuditLog)}
                >
                  {showAuditLog ? "Hide" : "Show"} Audit Trail 📜
                </button>

                {/* Audit Log */}
                {showAuditLog && (
                  <div className="audit-log-section">
                    <h3>📜 Complete Audit Trail</h3>
                    <div className="audit-entries">
                      {auditLog.map((entry, idx) => (
                        <div
                          key={idx}
                          className={`audit-entry ${entry.action}`}
                        >
                          <div className="audit-header">
                            <span className="audit-action">
                              {entry.action.replace(/_/g, " ")}
                            </span>
                            <span className="audit-time">
                              {new Date(entry.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <div className="audit-details">
                            <span className="audit-user">
                              👤 {entry.performedBy?.userName} (
                              {entry.performedBy?.role})
                            </span>
                            <span className="audit-desc">
                              {entry.details?.description}
                            </span>
                          </div>
                          {entry.details?.modifications && (
                            <div className="audit-mods">
                              {entry.details.modifications.map((m, i) => (
                                <div key={i} className="audit-mod-item">
                                  {m.field}: {m.from} → {m.to}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* QR Code Section for Sharing */}
                <div className="qr-share-section">
                  <div className="qr-container">
                    <QRCodeSVG
                      value={getShareUrl()}
                      size={120}
                      level="M"
                      includeMargin={true}
                    />
                    <div className="qr-info">
                      <h4>📱 Share Treatment Plan</h4>
                      <p>
                        Other doctors can scan this QR code to view the complete
                        treatment analysis
                      </p>
                      <code className="share-url">{getShareUrl()}</code>
                    </div>
                  </div>
                </div>

                <div className="step-actions">
                  <button className="btn-secondary" onClick={onBack}>
                    ← Back to Patients
                  </button>
                  <button
                    className="btn-primary"
                    onClick={handlePrintFullAnalysis}
                  >
                    🖨️ Print Full Analysis
                  </button>
                </div>
              </>
            )}

            {error && <div className="error-message">{error}</div>}
          </>
        )}
      </div>
    );
  };

  // Helper function to get risk level styling
  const getRiskLevelClass = (level) => {
    switch (level?.toLowerCase()) {
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

  const getRiskLevelIcon = (level) => {
    switch (level?.toLowerCase()) {
      case "critical":
        return "🔴";
      case "high":
        return "🟠";
      case "moderate":
        return "🟡";
      case "low":
        return "🟢";
      default:
        return "⚪";
    }
  };

  // Format field name to human readable
  const formatFieldName = (field) => {
    if (!field) return "Unknown Field";
    return field
      .replace(/([A-Z])/g, " $1")
      .replace(/_/g, " ")
      .replace(/\./g, " → ")
      .replace(/\b\w/g, (l) => l.toUpperCase())
      .trim();
  };

  // Detailed View Modal - Human Readable Format
  const renderDetailedViewModal = () => {
    console.log(
      "[DEBUG MODAL] showDetailedView:",
      showDetailedView,
      "detailedData:",
      detailedData
    );

    if (!showDetailedView || !detailedData) {
      console.log("[DEBUG MODAL] Early return - no data to show");
      return null;
    }

    console.log("[DEBUG MODAL] Rendering modal with data");
    const safetyData = detailedData.currentPlan?.safetyAssessment || {};
    const treatment = detailedData.currentPlan?.treatment || {};
    const riskLevel = safetyData?.overallRiskLevel || "unknown";
    console.log(
      "[DEBUG MODAL] Risk level:",
      riskLevel,
      "Treatment:",
      treatment
    );

    return (
      <div
        className="modal-overlay"
        onClick={() => setShowDetailedView(false)}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "1rem",
        }}
      >
        <div
          className="detailed-view-modal"
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: "white",
            borderRadius: "16px",
            maxWidth: "900px",
            width: "100%",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
            overflow: "hidden",
          }}
        >
          {/* Modal Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "1.25rem 1.5rem",
              borderBottom: "1px solid #e9ecef",
              background: "linear-gradient(135deg, #6c5ce7, #a29bfe)",
              color: "white",
            }}
          >
            <h2 style={{ margin: 0, fontSize: "1.25rem" }}>
              📋 Complete Treatment Analysis
            </h2>
            <button
              onClick={() => setShowDetailedView(false)}
              style={{
                background: "rgba(255, 255, 255, 0.2)",
                border: "none",
                fontSize: "1.5rem",
                color: "white",
                cursor: "pointer",
                padding: "0.25rem 0.75rem",
                borderRadius: "6px",
              }}
            >
              ×
            </button>
          </div>

          {/* Modal Content - Scrollable */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "1.5rem",
            }}
          >
            {/* Risk Indicator Banner */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1.5rem",
                padding: "1.5rem 2rem",
                borderRadius: "12px",
                marginBottom: "1.5rem",
                background:
                  riskLevel === "critical"
                    ? "linear-gradient(135deg, #e74c3c, #c0392b)"
                    : riskLevel === "high"
                    ? "linear-gradient(135deg, #e67e22, #d35400)"
                    : riskLevel === "moderate"
                    ? "linear-gradient(135deg, #f1c40f, #f39c12)"
                    : riskLevel === "low"
                    ? "linear-gradient(135deg, #27ae60, #1e8449)"
                    : "linear-gradient(135deg, #95a5a6, #7f8c8d)",
                color: riskLevel === "moderate" ? "#333" : "white",
              }}
            >
              <div style={{ fontSize: "3rem" }}>
                {riskLevel === "critical"
                  ? "🔴"
                  : riskLevel === "high"
                  ? "🟠"
                  : riskLevel === "moderate"
                  ? "🟡"
                  : riskLevel === "low"
                  ? "🟢"
                  : "⚪"}
              </div>
              <div>
                <h2 style={{ margin: 0 }}>
                  Overall Risk Level: {riskLevel.toUpperCase()}
                </h2>
                <p style={{ margin: "0.25rem 0 0 0" }}>
                  Safety Score:{" "}
                  <strong>{safetyData?.riskScore || "N/A"}</strong> / 100
                </p>
              </div>
            </div>

            {/* Status Banner */}
            <div
              style={{
                display: "flex",
                gap: "2rem",
                padding: "1rem 1.5rem",
                background: "#f8f9fa",
                borderRadius: "8px",
                marginBottom: "1.5rem",
                borderLeft: "4px solid #3498db",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#7f8c8d",
                    textTransform: "uppercase",
                  }}
                >
                  Status
                </div>
                <div style={{ fontWeight: 600 }}>
                  {detailedData.status?.toUpperCase() || "N/A"}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#7f8c8d",
                    textTransform: "uppercase",
                  }}
                >
                  Workflow Step
                </div>
                <div style={{ fontWeight: 600 }}>
                  {detailedData.workflowStep || "N/A"}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#7f8c8d",
                    textTransform: "uppercase",
                  }}
                >
                  Created
                </div>
                <div style={{ fontWeight: 600 }}>
                  {detailedData.createdAt
                    ? new Date(detailedData.createdAt).toLocaleDateString()
                    : "N/A"}
                </div>
              </div>
            </div>

            {/* Patient Info */}
            <div
              style={{
                marginBottom: "1.5rem",
                padding: "1rem",
                background: "#fff",
                border: "1px solid #e0e0e0",
                borderRadius: "8px",
              }}
            >
              <h3 style={{ margin: "0 0 1rem 0" }}>👤 Patient Information</h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "1rem",
                }}
              >
                <div>
                  <strong>Name:</strong> {detailedData.patient?.name || "N/A"}
                </div>
                <div>
                  <strong>Condition:</strong>{" "}
                  {detailedData.patient?.condition?.replace(/_/g, " ") || "N/A"}
                </div>
                {detailedData.reviewedBy && (
                  <div>
                    <strong>Reviewed By:</strong> {detailedData.reviewedBy}
                  </div>
                )}
              </div>
            </div>

            {/* Primary Medication */}
            <div
              style={{
                marginBottom: "1.5rem",
                padding: "1rem",
                background: "#ebf5fb",
                border: "1px solid #3498db",
                borderRadius: "8px",
              }}
            >
              <h3 style={{ margin: "0 0 1rem 0" }}>💊 Primary Medication</h3>
              {treatment?.primaryMedication ? (
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <h4 style={{ margin: 0 }}>
                      {treatment.primaryMedication.name}
                    </h4>
                    {treatment.primaryMedication.confidence && (
                      <span
                        style={{
                          padding: "0.25rem 0.75rem",
                          background:
                            treatment.primaryMedication.confidence >= 80
                              ? "#27ae60"
                              : "#f39c12",
                          color: "white",
                          borderRadius: "20px",
                          fontSize: "0.85rem",
                        }}
                      >
                        {treatment.primaryMedication.confidence}% Confidence
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: "1rem",
                    }}
                  >
                    <div>
                      <strong>Dosage:</strong>{" "}
                      {treatment.primaryMedication.dosage}
                    </div>
                    <div>
                      <strong>Frequency:</strong>{" "}
                      {treatment.primaryMedication.frequency}
                    </div>
                    <div>
                      <strong>Duration:</strong>{" "}
                      {treatment.primaryMedication.duration}
                    </div>
                  </div>
                  {treatment.primaryMedication.instructions && (
                    <div style={{ marginTop: "0.75rem" }}>
                      <strong>Instructions:</strong>{" "}
                      {treatment.primaryMedication.instructions}
                    </div>
                  )}
                </div>
              ) : (
                <p style={{ color: "#7f8c8d", fontStyle: "italic" }}>
                  No primary medication specified
                </p>
              )}
            </div>

            {/* Supporting Medications */}
            {treatment?.supportingMedications?.length > 0 && (
              <div
                style={{
                  marginBottom: "1.5rem",
                  padding: "1rem",
                  background: "#fff",
                  border: "1px solid #e0e0e0",
                  borderRadius: "8px",
                }}
              >
                <h3 style={{ margin: "0 0 1rem 0" }}>
                  💉 Supporting Medications (
                  {treatment.supportingMedications.length})
                </h3>
                {treatment.supportingMedications.map((med, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "0.75rem",
                      background: "#f8f9fa",
                      borderRadius: "6px",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <strong>{med.name}</strong> - {med.dosage}, {med.frequency},{" "}
                    {med.duration}
                    {med.reason && (
                      <div
                        style={{
                          fontSize: "0.9rem",
                          color: "#5a6c7d",
                          marginTop: "0.25rem",
                        }}
                      >
                        Reason: {med.reason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Drug Interactions */}
            {detailedData.currentPlan?.drugInteractions?.length > 0 && (
              <div
                style={{
                  marginBottom: "1.5rem",
                  padding: "1rem",
                  background: "#fef9e7",
                  border: "1px solid #f39c12",
                  borderRadius: "8px",
                }}
              >
                <h3 style={{ margin: "0 0 1rem 0" }}>
                  ⚠️ Drug Interactions (
                  {detailedData.currentPlan.drugInteractions.length})
                </h3>
                {detailedData.currentPlan.drugInteractions.map(
                  (interaction, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "0.75rem",
                        background: "#fff",
                        borderRadius: "6px",
                        marginBottom: "0.5rem",
                        borderLeft: "3px solid #f39c12",
                      }}
                    >
                      {typeof interaction === "string" ? (
                        interaction
                      ) : (
                        <>
                          <strong>
                            {interaction.drug1 || "Drug A"} ↔{" "}
                            {interaction.drug2 || "Drug B"}
                          </strong>
                          <span
                            style={{
                              marginLeft: "1rem",
                              padding: "0.15rem 0.5rem",
                              background: "#f39c12",
                              color: "white",
                              borderRadius: "4px",
                              fontSize: "0.75rem",
                            }}
                          >
                            {interaction.severity?.toUpperCase() || "CHECK"}
                          </span>
                          <div
                            style={{ marginTop: "0.5rem", color: "#5a6c7d" }}
                          >
                            {interaction.description || interaction.effect}
                          </div>
                        </>
                      )}
                    </div>
                  )
                )}
              </div>
            )}

            {/* Contraindications */}
            {detailedData.currentPlan?.contraindications?.length > 0 && (
              <div
                style={{
                  marginBottom: "1.5rem",
                  padding: "1rem",
                  background: "#fdf2f2",
                  border: "1px solid #e74c3c",
                  borderRadius: "8px",
                }}
              >
                <h3 style={{ margin: "0 0 1rem 0" }}>
                  🚫 Contraindications (
                  {detailedData.currentPlan.contraindications.length})
                </h3>
                {detailedData.currentPlan.contraindications.map(
                  (contra, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "0.75rem",
                        background: "#fff",
                        borderRadius: "6px",
                        marginBottom: "0.5rem",
                        borderLeft: "3px solid #e74c3c",
                      }}
                    >
                      {typeof contra === "string"
                        ? contra
                        : contra.description ||
                          contra.reason ||
                          JSON.stringify(contra)}
                    </div>
                  )
                )}
              </div>
            )}

            {/* Clinical Rationale */}
            <div
              style={{
                marginBottom: "1.5rem",
                padding: "1rem",
                background: "#fff",
                border: "1px solid #e0e0e0",
                borderRadius: "8px",
              }}
            >
              <h3 style={{ margin: "0 0 1rem 0" }}>📝 Clinical Rationale</h3>
              {detailedData.currentPlan?.rationale ? (
                typeof detailedData.currentPlan.rationale === "string" ? (
                  <p style={{ margin: 0, lineHeight: 1.6 }}>
                    {detailedData.currentPlan.rationale}
                  </p>
                ) : (
                  <div style={{ lineHeight: 1.6 }}>
                    {/* Handle object rationale with structured display */}
                    {detailedData.currentPlan.rationale.summary && (
                      <p style={{ margin: "0 0 1rem 0" }}>
                        <strong>Summary:</strong>{" "}
                        {detailedData.currentPlan.rationale.summary}
                      </p>
                    )}
                    {detailedData.currentPlan.rationale.reasoning && (
                      <p style={{ margin: "0 0 1rem 0" }}>
                        <strong>Reasoning:</strong>{" "}
                        {detailedData.currentPlan.rationale.reasoning}
                      </p>
                    )}
                    {detailedData.currentPlan.rationale.evidenceBasis && (
                      <p style={{ margin: "0 0 1rem 0" }}>
                        <strong>Evidence Basis:</strong>{" "}
                        {detailedData.currentPlan.rationale.evidenceBasis}
                      </p>
                    )}
                    {detailedData.currentPlan.rationale.clinicalGuidelines && (
                      <p style={{ margin: "0 0 1rem 0" }}>
                        <strong>Clinical Guidelines:</strong>{" "}
                        {detailedData.currentPlan.rationale.clinicalGuidelines}
                      </p>
                    )}
                    {detailedData.currentPlan.rationale.considerations && (
                      <div style={{ margin: "0 0 1rem 0" }}>
                        <strong>Key Considerations:</strong>
                        {Array.isArray(
                          detailedData.currentPlan.rationale.considerations
                        ) ? (
                          <ul
                            style={{
                              margin: "0.5rem 0 0 0",
                              paddingLeft: "1.5rem",
                            }}
                          >
                            {detailedData.currentPlan.rationale.considerations.map(
                              (item, idx) => (
                                <li
                                  key={idx}
                                  style={{ marginBottom: "0.25rem" }}
                                >
                                  {item}
                                </li>
                              )
                            )}
                          </ul>
                        ) : (
                          <span>
                            {" "}
                            {detailedData.currentPlan.rationale.considerations}
                          </span>
                        )}
                      </div>
                    )}
                    {/* Fallback: if none of the expected fields exist, display all keys nicely */}
                    {!detailedData.currentPlan.rationale.summary &&
                      !detailedData.currentPlan.rationale.reasoning &&
                      !detailedData.currentPlan.rationale.evidenceBasis &&
                      Object.entries(detailedData.currentPlan.rationale).map(
                        ([key, value]) => (
                          <p key={key} style={{ margin: "0 0 0.75rem 0" }}>
                            <strong>
                              {key
                                .replace(/([A-Z])/g, " $1")
                                .replace(/^./, (str) => str.toUpperCase())}
                              :
                            </strong>{" "}
                            {typeof value === "string"
                              ? value
                              : Array.isArray(value)
                              ? value.join(", ")
                              : String(value)}
                          </p>
                        )
                      )}
                  </div>
                )
              ) : (
                <p style={{ color: "#7f8c8d", fontStyle: "italic" }}>
                  No rationale provided
                </p>
              )}
            </div>

            {/* Alternatives */}
            {detailedData.currentPlan?.alternatives?.length > 0 && (
              <div
                style={{
                  marginBottom: "1.5rem",
                  padding: "1rem",
                  background: "#fff",
                  border: "1px solid #e0e0e0",
                  borderRadius: "8px",
                }}
              >
                <h3 style={{ margin: "0 0 1rem 0" }}>
                  🔄 Alternative Treatments
                </h3>
                {detailedData.currentPlan.alternatives.map((alt, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "0.75rem",
                      background: "#f8f9fa",
                      borderRadius: "6px",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <strong>{alt.name || alt.medication}</strong>
                    {alt.reason && (
                      <span style={{ marginLeft: "0.5rem", color: "#5a6c7d" }}>
                        - {alt.reason}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Audit Trail */}
            <div
              style={{
                marginBottom: "1.5rem",
                padding: "1rem",
                background: "#f8f9fa",
                border: "1px solid #e0e0e0",
                borderRadius: "8px",
              }}
            >
              <h3 style={{ margin: "0 0 1rem 0" }}>📜 Audit Trail</h3>
              {auditLog && auditLog.length > 0 ? (
                <div>
                  {auditLog.map((entry, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "0.75rem",
                        background: "#fff",
                        borderRadius: "6px",
                        marginBottom: "0.5rem",
                        borderLeft: "3px solid #3498db",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span style={{ fontWeight: 600, color: "#2c3e50" }}>
                          {entry.action?.replace(/_/g, " ")}
                        </span>
                        <span style={{ fontSize: "0.8rem", color: "#7f8c8d" }}>
                          {new Date(entry.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: "0.9rem",
                          color: "#5a6c7d",
                          marginTop: "0.25rem",
                        }}
                      >
                        By: {entry.performedBy?.userName} (
                        {entry.performedBy?.role})
                      </div>
                      {entry.details?.description && (
                        <div
                          style={{
                            fontSize: "0.85rem",
                            color: "#7f8c8d",
                            marginTop: "0.25rem",
                          }}
                        >
                          {entry.details.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: "#7f8c8d", fontStyle: "italic" }}>
                  No audit entries available
                </p>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "1rem",
              padding: "1rem 1.5rem",
              borderTop: "1px solid #e9ecef",
              background: "#f8f9fa",
            }}
          >
            {/* QR Code in Modal Footer */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginRight: "auto",
                padding: "8px 12px",
                background: "white",
                borderRadius: "8px",
                border: "1px solid #e0e0e0",
              }}
            >
              <QRCodeSVG value={getShareUrl()} size={50} level="L" />
              <div style={{ fontSize: "11px", color: "#666" }}>
                <div style={{ fontWeight: 600, marginBottom: "2px" }}>
                  Scan to Share
                </div>
                <div>Other doctors can view this plan</div>
              </div>
            </div>

            <button
              onClick={handlePrintFullAnalysis}
              style={{
                padding: "0.75rem 1.5rem",
                border: "1px solid #3498db",
                borderRadius: "8px",
                background: "white",
                color: "#3498db",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              🖨️ Print Full Analysis
            </button>
            <button
              onClick={() => setShowDetailedView(false)}
              style={{
                padding: "0.75rem 1.5rem",
                border: "1px solid #ddd",
                borderRadius: "8px",
                background: "white",
                cursor: "pointer",
              }}
            >
              Close
            </button>
            <button
              onClick={() => {
                setShowDetailedView(false);
                handleRegenerate();
              }}
              disabled={regenerating}
              style={{
                padding: "0.75rem 1.5rem",
                border: "none",
                borderRadius: "8px",
                background: "#9b59b6",
                color: "white",
                cursor: regenerating ? "not-allowed" : "pointer",
                opacity: regenerating ? 0.6 : 1,
              }}
            >
              🔄 Re-Analyze / Regenerate
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading && !treatmentPlan) {
    return (
      <div className="treatment-wizard">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading treatment plan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="treatment-wizard">
      <div className="wizard-header">
        <button className="back-btn" onClick={onBack}>
          ← Back
        </button>
        <h1>
          Treatment Workflow: {patient.firstName} {patient.lastName}
        </h1>
      </div>

      {renderStepIndicator()}

      {error && !loading && (
        <div className="wizard-error">
          <p>⚠️ {error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {generating && (
        <div className="generating-overlay">
          <div className="spinner"></div>
          <p>Analyzing patient data with AI...</p>
          <p className="sub-text">
            Checking drug interactions, contraindications, and generating
            recommendations...
          </p>
        </div>
      )}

      {regenerating && (
        <div className="generating-overlay">
          <div className="spinner"></div>
          <p>Re-analyzing with AI...</p>
          <p className="sub-text">
            Regenerating treatment plan with updated patient data...
          </p>
        </div>
      )}

      {!generating && !regenerating && (
        <>
          {currentStep === 0 && renderIntakeStep()}
          {currentStep === 1 && renderAnalysisStep()}
          {currentStep === 2 && renderReviewStep()}
          {currentStep === 3 && renderFinalStep()}
        </>
      )}

      {/* Detailed View Modal */}
      {renderDetailedViewModal()}
    </div>
  );
}
