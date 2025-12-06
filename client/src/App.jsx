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
import ChatBot from "./components/ChatBot";
import Login from "./components/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import "./App.css";

function MainApp() {
  const [currentView, setCurrentView] = useState("patients");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [serverStatus, setServerStatus] = useState("checking");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const { user, logout } = useAuth();

  useEffect(() => {
    checkServerConnection();
  }, []);

  const checkServerConnection = async () => {
    try {
      const response = await fetch("http://localhost:3000/");
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
          <span>🏥</span>
          MediAssist
        </div>
        <div className="nav-links">
          <button
            className={`nav-link ${currentView === "intake" ? "active" : ""}`}
            onClick={() => setCurrentView("intake")}
            title="New Intake"
          >
            <span className="nav-icon">📋</span>
            <span className="nav-text">Intake</span>
          </button>
          <button
            className={`nav-link ${currentView === "patients" ? "active" : ""}`}
            onClick={() => setCurrentView("patients")}
            title="Patients"
          >
            <span className="nav-icon">👥</span>
            <span className="nav-text">Patients</span>
          </button>
          {selectedPatient && (
            <button
              className={`nav-link ${currentView === "wizard" ? "active" : ""}`}
              onClick={() => setCurrentView("wizard")}
              title="Treatment"
            >
              <span className="nav-icon">🩺</span>
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
                Logout
              </button>
            </>
          )}
        </div>
      </nav>

      <main className="main-content">
        {currentView === "intake" && (
          <PatientIntakeForm onSubmitSuccess={handleIntakeSuccess} />
        )}
        {currentView === "patients" && (
          <PatientList
            refreshTrigger={refreshTrigger}
            onSelectPatient={handleSelectPatient}
          />
        )}
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
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
