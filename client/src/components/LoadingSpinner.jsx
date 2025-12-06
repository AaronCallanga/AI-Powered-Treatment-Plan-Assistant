/**
 * LoadingSpinner - A minimalist, reusable loading animation component
 *
 * @param {string} size - 'sm' | 'md' | 'lg' | 'xl' (default: 'md')
 * @param {string} text - Optional loading text
 * @param {boolean} fullPage - Whether to center in full viewport
 * @param {string} className - Additional CSS classes
 */
const LoadingSpinner = ({
  size = "md",
  text = "",
  fullPage = false,
  className = "",
}) => {
  const sizeClasses = {
    sm: "loading-spinner--sm",
    md: "loading-spinner--md",
    lg: "loading-spinner--lg",
    xl: "loading-spinner--xl",
  };

  return (
    <div
      className={`loading-spinner-container ${
        fullPage ? "loading-spinner--fullpage" : ""
      } ${className}`}
    >
      <div className={`loading-spinner ${sizeClasses[size]}`}>
        <div className="loading-spinner__ring"></div>
        <div className="loading-spinner__ring"></div>
        <div className="loading-spinner__ring"></div>
      </div>
      {text && <p className="loading-spinner__text">{text}</p>}
    </div>
  );
};

/**
 * PulseLoader - A subtle pulse animation for inline loading states
 */
export const PulseLoader = ({ className = "" }) => (
  <span className={`pulse-loader ${className}`}>
    <span className="pulse-loader__dot"></span>
    <span className="pulse-loader__dot"></span>
    <span className="pulse-loader__dot"></span>
  </span>
);

/**
 * ButtonLoader - A compact spinner for button loading states
 */
export const ButtonLoader = ({ className = "" }) => (
  <span className={`button-loader ${className}`}></span>
);

export default LoadingSpinner;

