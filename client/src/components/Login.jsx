import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { EyeIcon, EyeOffIcon } from "./Icons";
import { ButtonLoader } from "./LoadingSpinner";
import "./LoadingSpinner.css";
import "./Login.css";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!username || !password) {
      setErrorMessage("Please enter both username and password");
      return;
    }

    setIsLoading(true);

    const result = await login(username, password);

    setIsLoading(false);

    if (result.success) {
      // Check if there's a redirect URL stored (e.g., from QR code scan)
      const redirectUrl = sessionStorage.getItem("redirectAfterLogin");
      if (redirectUrl) {
        sessionStorage.removeItem("redirectAfterLogin");
        navigate(redirectUrl);
      } else {
        // Route based on user role
        const userRole = result.user?.role;
        if (userRole === "patient") {
          navigate("/patient-portal");
        } else {
          navigate("/dashboard");
        }
      }
    } else {
      setErrorMessage(result.error || "Invalid credentials");
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <img src="/logo.png" alt="MedicAI" className="login-logo-image" />
          </div>
          <p>Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {errorMessage && <div className="login-error">{errorMessage}</div>}

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              disabled={isLoading}
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={isLoading}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOffIcon size={18} />
                ) : (
                  <EyeIcon size={18} />
                )}
              </button>
            </div>
          </div>

          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading ? (
              <>
                <ButtonLoader />
                <span>Signing in...</span>
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className="login-footer">
          <a href="/" className="back-link">
            Back to Home
          </a>
        </div>
      </div>
    </div>
  );
};

export default Login;
