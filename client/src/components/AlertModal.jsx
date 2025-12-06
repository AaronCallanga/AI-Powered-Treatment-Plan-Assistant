import { useEffect } from "react";
import {
  CloseIcon,
  WarningIcon,
  ErrorIcon,
  SuccessIcon,
  InfoIcon,
} from "./Icons";
import "./AlertModal.css";

/**
 * AlertModal - A styled modal to replace browser alerts
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is visible
 * @param {function} props.onClose - Function to close the modal
 * @param {string} props.title - Modal title
 * @param {string} props.message - Modal message
 * @param {string} props.type - Type of alert: 'error' | 'warning' | 'success' | 'info'
 * @param {string} props.buttonText - Custom button text (default: "OK")
 */
function AlertModal({
  isOpen,
  onClose,
  title,
  message,
  type = "info",
  buttonText = "OK",
}) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case "error":
        return <ErrorIcon size={32} />;
      case "warning":
        return <WarningIcon size={32} />;
      case "success":
        return <SuccessIcon size={32} />;
      case "info":
      default:
        return <InfoIcon size={32} />;
    }
  };

  return (
    <div className="alert-modal-overlay" onClick={onClose}>
      <div
        className={`alert-modal ${type}`}
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="alert-title"
        aria-describedby="alert-message"
      >
        <button
          className="alert-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          <CloseIcon size={18} />
        </button>

        <div className="alert-modal-content">
          <div className={`alert-icon ${type}`}>{getIcon()}</div>
          <h3 id="alert-title" className="alert-title">
            {title}
          </h3>
          <p id="alert-message" className="alert-message">
            {message}
          </p>
        </div>

        <div className="alert-modal-actions">
          <button className={`alert-btn ${type}`} onClick={onClose} autoFocus>
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AlertModal;
