import { useState, useEffect } from "react";
import {
  BrainIcon,
  MedicationIcon,
  WarningIcon,
  ShieldIcon,
  CheckIcon,
  CloseIcon,
  PatientIcon,
  LabIcon,
  DocumentIcon,
} from "./Icons";
import "./AIGenerationOverlay.css";

/**
 * AI Generation Overlay - Shows beautiful progress during AI treatment generation
 *
 * @param {boolean} isVisible - Whether the overlay is visible
 * @param {boolean} isRegenerating - If true, shows regeneration-specific messaging
 * @param {string} patientName - Patient name for personalized messaging
 * @param {function} onCancel - Optional callback when user cancels (if cancellation is supported)
 * @param {number} currentStep - Manually set current step (0-4), or let it auto-progress
 */
const GENERATION_STEPS = [
  {
    id: "analyzing",
    label: "Analyzing Patient Data",
    description:
      "Reviewing medical history, conditions, and current medications",
    icon: PatientIcon,
    duration: 2500,
  },
  {
    id: "interactions",
    label: "Checking Drug Interactions",
    description: "Cross-referencing medications for potential conflicts",
    icon: WarningIcon,
    duration: 3000,
  },
  {
    id: "generating",
    label: "Generating Treatment Plan",
    description: "AI is creating personalized treatment recommendations",
    icon: BrainIcon,
    duration: 4000,
  },
  {
    id: "validating",
    label: "Validating & Safety Check",
    description: "Ensuring recommendations meet clinical safety standards",
    icon: ShieldIcon,
    duration: 2000,
  },
  {
    id: "finalizing",
    label: "Finalizing Results",
    description: "Preparing your comprehensive treatment analysis",
    icon: DocumentIcon,
    duration: 1500,
  },
];

export default function AIGenerationOverlay({
  isVisible,
  isRegenerating = false,
  patientName = "patient",
  onCancel,
  error,
}) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepProgress, setStepProgress] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);

  // Reset and start progression when overlay becomes visible
  useEffect(() => {
    if (!isVisible) {
      // Reset state when hidden
      setCurrentStepIndex(0);
      setStepProgress(0);
      setCompletedSteps([]);
      return;
    }

    // Start the step progression
    let progressInterval;
    let stepTimeout;

    const progressStep = () => {
      const currentStep = GENERATION_STEPS[currentStepIndex];
      if (!currentStep) return;

      // Animate progress bar for current step
      const progressIncrement = 100 / (currentStep.duration / 50);
      let progress = 0;

      progressInterval = setInterval(() => {
        progress += progressIncrement;
        setStepProgress(Math.min(progress, 100));
      }, 50);

      // Move to next step after duration
      stepTimeout = setTimeout(() => {
        clearInterval(progressInterval);
        setCompletedSteps((prev) => [...prev, currentStepIndex]);
        setStepProgress(0);

        if (currentStepIndex < GENERATION_STEPS.length - 1) {
          setCurrentStepIndex((prev) => prev + 1);
        }
      }, currentStep.duration);
    };

    progressStep();

    return () => {
      clearInterval(progressInterval);
      clearTimeout(stepTimeout);
    };
  }, [isVisible, currentStepIndex]);

  // Restart progression when becoming visible
  useEffect(() => {
    if (isVisible) {
      setCurrentStepIndex(0);
      setStepProgress(0);
      setCompletedSteps([]);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  const currentStep = GENERATION_STEPS[currentStepIndex];
  const overallProgress =
    ((completedSteps.length + stepProgress / 100) / GENERATION_STEPS.length) *
    100;

  return (
    <div className="ai-generation-overlay">
      <div className="ai-generation-modal">
        {/* Close/Cancel button if cancellation is supported */}
        {onCancel && (
          <button
            className="generation-cancel-btn"
            onClick={onCancel}
            title="Cancel"
          >
            <CloseIcon size={20} />
          </button>
        )}

        {/* Animated Header */}
        <div className="generation-header">
          <div className="brain-container">
            <div className="brain-core">
              <BrainIcon size={48} />
            </div>
            <div className="brain-pulse pulse-1"></div>
            <div className="brain-pulse pulse-2"></div>
            <div className="brain-pulse pulse-3"></div>
            <div className="neural-lines">
              <div className="neural-line line-1"></div>
              <div className="neural-line line-2"></div>
              <div className="neural-line line-3"></div>
              <div className="neural-line line-4"></div>
            </div>
          </div>
          <h2>
            {isRegenerating
              ? "Regenerating Treatment Plan"
              : "Generating Treatment Plan"}
          </h2>
          <p className="generation-subtitle">
            {isRegenerating
              ? `Re-analyzing data for ${patientName} with updated parameters`
              : `AI is analyzing data for ${patientName}`}
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="generation-error">
            <WarningIcon size={24} />
            <div>
              <strong>Generation Failed</strong>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Progress Steps */}
        {!error && (
          <>
            <div className="generation-steps">
              {GENERATION_STEPS.map((step, index) => {
                const isCompleted = completedSteps.includes(index);
                const isCurrent = index === currentStepIndex;
                const isPending = index > currentStepIndex;
                const StepIcon = step.icon;

                return (
                  <div
                    key={step.id}
                    className={`generation-step ${
                      isCompleted ? "completed" : ""
                    } ${isCurrent ? "active" : ""} ${
                      isPending ? "pending" : ""
                    }`}
                  >
                    <div className="step-icon-wrapper">
                      {isCompleted ? (
                        <div className="step-icon completed">
                          <CheckIcon size={18} />
                        </div>
                      ) : (
                        <div
                          className={`step-icon ${isCurrent ? "active" : ""}`}
                        >
                          <StepIcon size={18} />
                        </div>
                      )}
                      {index < GENERATION_STEPS.length - 1 && (
                        <div
                          className={`step-connector ${
                            isCompleted ? "completed" : ""
                          }`}
                        ></div>
                      )}
                    </div>
                    <div className="step-content">
                      <span className="step-label">{step.label}</span>
                      {isCurrent && (
                        <>
                          <span className="step-description">
                            {step.description}
                          </span>
                          <div className="step-progress-bar">
                            <div
                              className="step-progress-fill"
                              style={{ width: `${stepProgress}%` }}
                            ></div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Overall Progress */}
            <div className="overall-progress">
              <div className="progress-bar-container">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${overallProgress}%` }}
                ></div>
              </div>
              <div className="progress-info">
                <span className="progress-percentage">
                  {Math.round(overallProgress)}%
                </span>
                <span className="progress-text">
                  {completedSteps.length} of {GENERATION_STEPS.length} steps
                  complete
                </span>
              </div>
            </div>

            {/* Helpful Tips */}
            <div className="generation-tips">
              <div className="tip-card">
                <LabIcon size={18} />
                <span>AI uses evidence-based clinical guidelines</span>
              </div>
              <div className="tip-card">
                <ShieldIcon size={18} />
                <span>All recommendations undergo safety validation</span>
              </div>
            </div>
          </>
        )}

        {/* Footer Note */}
        <div className="generation-footer">
          <p>
            {error
              ? "Please try again or contact support if the issue persists."
              : "This usually takes 10-15 seconds. Please don't close this window."}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Confirmation Modal for Regeneration
 */
export function RegenerateConfirmModal({
  isVisible,
  onConfirm,
  onCancel,
  patientName,
}) {
  if (!isVisible) return null;

  return (
    <div className="regenerate-confirm-overlay" onClick={onCancel}>
      <div
        className="regenerate-confirm-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="confirm-header">
          <div className="confirm-icon">
            <BrainIcon size={32} />
          </div>
          <h3>Regenerate Treatment Plan?</h3>
        </div>

        <div className="confirm-content">
          <p>
            This will re-run the AI analysis for <strong>{patientName}</strong>{" "}
            with the current patient data. The existing treatment plan will be
            replaced.
          </p>

          <div className="confirm-warnings">
            <div className="warning-item">
              <WarningIcon size={16} />
              <span>Current recommendations will be replaced</span>
            </div>
            <div className="warning-item">
              <WarningIcon size={16} />
              <span>Any unsaved modifications will be lost</span>
            </div>
            <div className="info-item">
              <CheckIcon size={16} />
              <span>Previous plan will be recorded in audit history</span>
            </div>
          </div>
        </div>

        <div className="confirm-actions">
          <button className="btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn-confirm" onClick={onConfirm}>
            <BrainIcon size={18} />
            Yes, Regenerate
          </button>
        </div>
      </div>
    </div>
  );
}
