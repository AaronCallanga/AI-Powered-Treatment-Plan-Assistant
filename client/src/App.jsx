import { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LandingPage from "./components/LandingPage";
import PatientIntakeForm from "./components/PatientIntakeForm";
import PatientList from "./components/PatientList";
import ClinicalDashboard from "./components/ClinicalDashboard";
import TreatmentWizard from "./components/TreatmentWizard";
import TreatmentViewer from "./components/TreatmentViewer";
import ChatBot from "./components/ChatBot";
import Login from "./components/Login";
import PatientPortal from "./components/PatientPortal";
import ProtectedRoute from "./components/ProtectedRoute";
import {
  IntakeIcon,
  PatientsIcon,
  TreatmentIcon,
  LogoutIcon,
} from "./components/Icons";
import "./App.css";

function MainApp() {
  const [currentView, setCurrentView] = useState("patients");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [serverStatus, setServerStatus] = useState("checking");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  // Close mobile menu when view changes
  const handleViewChange = (view) => {
    setCurrentView(view);
    setMobileMenuOpen(false);
  };

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  useEffect(() => {
    checkServerConnection();
  }, []);

  const checkServerConnection = async () => {
    try {
      const response = await fetch("http://localhost:5000/");
      if (response.ok) {
        setServerStatus("connected");
      } else {
        setServerStatus("disconnected");
      }
    } catch {
      setServerStatus("disconnected");
    }
  };

  const handleIntakeSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
    setCurrentView("patients");
  };

  const [existingTreatmentPlan, setExistingTreatmentPlan] = useState(null);

  const handleSelectPatient = (patient, treatmentPlan = null) => {
    setSelectedPatient(patient);
    setExistingTreatmentPlan(treatmentPlan);
    setCurrentView("wizard");
  };

  const handleBackToPatients = () => {
    setSelectedPatient(null);
    setExistingTreatmentPlan(null);
    setCurrentView("patients");
  };

  const handleWizardComplete = () => {
    setRefreshTrigger((prev) => prev + 1);
    setSelectedPatient(null);
    setExistingTreatmentPlan(null);
    setCurrentView("patients");
  };

  return (
    <div className="app">
      <nav className="nav">
        <div className="nav-brand">
          <img src="/logo.png" alt="MedicAI" className="nav-logo" />
        </div>

        {/* Mobile Menu Toggle Button */}
        <button
          className={`mobile-menu-toggle ${mobileMenuOpen ? "open" : ""}`}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
          aria-expanded={mobileMenuOpen}
        >
          <div className="hamburger-icon">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </button>

        {/* Mobile Menu Overlay */}
        <div
          className={`mobile-menu-overlay ${mobileMenuOpen ? "open" : ""}`}
          onClick={() => setMobileMenuOpen(false)}
        />

        <div className={`nav-links ${mobileMenuOpen ? "open" : ""}`}>
          <button
            className={`nav-link ${currentView === "intake" ? "active" : ""}`}
            onClick={() => handleViewChange("intake")}
            title="New Intake"
          >
            <IntakeIcon size={20} className="nav-icon" />
            <span className="nav-text">Intake</span>
          </button>
          <button
            className={`nav-link ${currentView === "patients" ? "active" : ""}`}
            onClick={() => handleViewChange("patients")}
            title="Patients"
          >
            <PatientsIcon size={20} className="nav-icon" />
            <span className="nav-text">Patients</span>
          </button>
          {selectedPatient && (
            <button
              className={`nav-link ${currentView === "wizard" ? "active" : ""}`}
              onClick={() => handleViewChange("wizard")}
              title="Treatment"
            >
              <TreatmentIcon size={20} className="nav-icon" />
              <span className="nav-text">Treatment</span>
            </button>
          )}
        </div>
        <div className="nav-user">
          {user && (
            <>
              <span className="user-info">
                {user.firstName} {user.lastName}
              </span>
              <button className="logout-button" onClick={logout}>
                <LogoutIcon size={16} />
                <span>Logout</span>
              </button>
            </>
          )}
        </div>
      </nav>

      <main className="main-content">
        {currentView === "intake" && (
          <PatientIntakeForm onSubmitSuccess={handleIntakeSuccess} />
        )}
        {/* Keep PatientList mounted to preserve state and avoid re-fetching */}
        <div style={{ display: currentView === "patients" ? "block" : "none" }}>
          <PatientList
            refreshTrigger={refreshTrigger}
            onSelectPatient={handleSelectPatient}
          />
        </div>
        {currentView === "wizard" && selectedPatient && (
          <TreatmentWizard
            patient={selectedPatient}
            existingPlan={existingTreatmentPlan}
            onBack={handleBackToPatients}
            onComplete={handleWizardComplete}
          />
        )}
        {currentView === "dashboard" && selectedPatient && (
          <ClinicalDashboard
            patient={selectedPatient}
            onBack={handleBackToPatients}
          />
        )}
      </main>

      <div className={`connection-status ${serverStatus}`}>
        <span className={`status-dot ${serverStatus}`}></span>
        {serverStatus === "connected"
          ? "Server Connected"
          : "Server Disconnected"}
      </div>

      {/* ChatBot - available on all pages */}
      <ChatBot currentPatient={selectedPatient} />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requiredRoles={["admin", "doctor"]}>
                <MainApp />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient-portal"
            element={
              <ProtectedRoute requiredRoles={["patient"]}>
                <PatientPortal />
              </ProtectedRoute>
            }
          />
          {/* Public QR code route - accessible to all, shows full details to authenticated doctors */}
          <Route path="/treatment/:id" element={<TreatmentViewer />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
