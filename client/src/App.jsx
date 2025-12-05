import { useState, useEffect } from "react";
import PatientIntakeForm from "./components/PatientIntakeForm";
import PatientList from "./components/PatientList";
import ClinicalDashboard from "./components/ClinicalDashboard";
import TreatmentWizard from "./components/TreatmentWizard";
import ChatBot from "./components/ChatBot";
import "./App.css";

function App() {
  const [currentView, setCurrentView] = useState("intake");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [serverStatus, setServerStatus] = useState("checking");
  const [selectedPatient, setSelectedPatient] = useState(null);

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
          Clinical Assistant
        </div>
        <div className="nav-links">
          <button
            className={`nav-link ${currentView === "intake" ? "active" : ""}`}
            onClick={() => setCurrentView("intake")}
          >
            📋 New Intake
          </button>
          <button
            className={`nav-link ${currentView === "patients" ? "active" : ""}`}
            onClick={() => setCurrentView("patients")}
          >
            👥 Patients
          </button>
          {selectedPatient && (
            <button
              className={`nav-link ${currentView === "wizard" ? "active" : ""}`}
              onClick={() => setCurrentView("wizard")}
            >
              🩺 Treatment
            </button>
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

export default App;
