import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  IntakeIcon,
  TreatmentIcon,
  MedicationIcon,
  UploadIcon,
  MicIcon,
  AIIcon,
  ChartIcon,
  ChatIcon,
  QuickIcon,
  TargetIcon,
  ShieldIcon,
  TrendingUpIcon,
  LinkIcon,
  RocketIcon,
  ArrowRightIcon,
  ChevronRightIcon,
  MenuIcon,
  CloseIcon,
  DatabaseIcon,
  VerifiedIcon,
  ExternalLinkIcon,
} from "./Icons";
const logoImage = "/logo.png";
import "./LandingPage.css";

const LandingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleGetStarted = () => {
    if (user) {
      navigate("/dashboard");
    } else {
      navigate("/login");
    }
  };

  const handleSignIn = () => {
    navigate("/login");
  };

  return (
    <div className="landing-page">
      {/* Navigation Bar */}
      <nav className="landing-navbar">
        <div className="navbar-container">
          <div className="navbar-brand">
            <img src={logoImage} alt="MedicAI" className="brand-logo" />
          </div>

          <button
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <CloseIcon size={24} /> : <MenuIcon size={24} />}
          </button>

          <div className={`navbar-menu ${mobileMenuOpen ? "open" : ""}`}>
            <a href="#features" className="navbar-link">
              Features
            </a>
            <a href="#benefits" className="navbar-link">
              Benefits
            </a>
            <a href="#data" className="navbar-link">
              Data Sources
            </a>
            {user ? (
              <button
                className="navbar-btn navbar-dashboard"
                onClick={() => navigate("/dashboard")}
              >
                Dashboard
              </button>
            ) : (
              <button
                className="navbar-btn navbar-signin"
                onClick={handleSignIn}
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h2 className="hero-title">
            AI-Powered Clinical Assistant for Modern Healthcare
          </h2>
          <p className="hero-subtitle">
            Transform patient intake, streamline diagnosis, and generate
            treatment plans with advanced AI technology
          </p>
          <button className="cta-button" onClick={handleGetStarted}>
            {user ? "Go to Dashboard" : "Get Started Free"}
            <ArrowRightIcon size={18} />
          </button>
        </div>

        <div className="hero-visual">
          <div className="hero-card">
            <div className="card-header">
              <IntakeIcon size={40} strokeWidth={1.5} />
            </div>
            <p>AI-Powered Intake</p>
          </div>
          <div className="hero-card featured">
            <div className="card-header">
              <TreatmentIcon size={40} strokeWidth={1.5} />
            </div>
            <p>Smart Diagnosis</p>
          </div>
          <div className="hero-card">
            <div className="card-header">
              <MedicationIcon size={40} strokeWidth={1.5} />
            </div>
            <p>Treatment Plans</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features" id="features">
        <div className="features-container">
          <h2 className="section-title">Powerful Features</h2>
          <p className="section-subtitle">
            Everything you need to enhance patient care and clinical efficiency
          </p>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <UploadIcon size={32} />
              </div>
              <h3>Multi-Format Uploads</h3>
              <p>
                Upload patient documents, lab results, medical records, and
                images. AI extracts and organizes all relevant information
                automatically.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <MicIcon size={32} />
              </div>
              <h3>Live Voice Dictation</h3>
              <p>
                Record patient consultations in real-time. AI transcribes and
                extracts key medical information instantly for your records.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <AIIcon size={32} />
              </div>
              <h3>Intelligent Extraction</h3>
              <p>
                Advanced NLP algorithms automatically identify and extract
                medical data from any document format with high accuracy.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <MedicationIcon size={32} />
              </div>
              <h3>Drug Interaction Checker</h3>
              <p>
                Real-time DDI (Drug-Drug Interaction) database to prevent
                adverse medication combinations and ensure patient safety.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <ChartIcon size={32} />
              </div>
              <h3>Treatment Planning</h3>
              <p>
                Generate comprehensive, evidence-based treatment plans based on
                patient data and clinical guidelines. Customize as needed.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <ChatIcon size={32} />
              </div>
              <h3>AI Chat Assistant</h3>
              <p>
                Get instant answers to clinical questions. Our AI assistant
                provides medical knowledge support throughout your workflow.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="benefits" id="benefits">
        <div className="benefits-container">
          <h2 className="section-title">Why Choose MedicAI?</h2>

          <div className="benefits-grid">
            <div className="benefit-item">
              <div className="benefit-icon">
                <QuickIcon size={28} />
              </div>
              <div className="benefit-content">
                <h3>Save Time</h3>
                <p>
                  Automate routine data entry and reduce administrative burden
                  by 70%
                </p>
              </div>
            </div>

            <div className="benefit-item">
              <div className="benefit-icon">
                <TargetIcon size={28} />
              </div>
              <div className="benefit-content">
                <h3>Improve Accuracy</h3>
                <p>
                  AI-driven extraction minimizes human error in patient data
                  collection
                </p>
              </div>
            </div>

            <div className="benefit-item">
              <div className="benefit-icon">
                <ShieldIcon size={28} />
              </div>
              <div className="benefit-content">
                <h3>HIPAA Compliant</h3>
                <p>
                  Enterprise-grade security with full compliance for patient
                  data protection
                </p>
              </div>
            </div>

            <div className="benefit-item">
              <div className="benefit-icon">
                <TrendingUpIcon size={28} />
              </div>
              <div className="benefit-content">
                <h3>Better Outcomes</h3>
                <p>
                  Evidence-based treatment suggestions lead to improved patient
                  results
                </p>
              </div>
            </div>

            <div className="benefit-item">
              <div className="benefit-icon">
                <LinkIcon size={28} />
              </div>
              <div className="benefit-content">
                <h3>Easy Integration</h3>
                <p>
                  Seamlessly integrate with existing EHR systems and workflows
                </p>
              </div>
            </div>

            <div className="benefit-item">
              <div className="benefit-icon">
                <RocketIcon size={28} />
              </div>
              <div className="benefit-content">
                <h3>Scale Effortlessly</h3>
                <p>
                  Handle unlimited patients and records with cloud-based
                  infrastructure
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works">
        <div className="how-it-works-container">
          <h2 className="section-title">How It Works</h2>

          <div className="steps-grid">
            <div className="step">
              <div className="step-number">1</div>
              <h3>Upload or Record</h3>
              <p>
                Upload patient documents or record a consultation using voice
                dictation
              </p>
            </div>

            <div className="step-arrow">
              <ChevronRightIcon size={32} />
            </div>

            <div className="step">
              <div className="step-number">2</div>
              <h3>AI Processing</h3>
              <p>
                Our AI analyzes and extracts relevant medical information
                automatically
              </p>
            </div>

            <div className="step-arrow">
              <ChevronRightIcon size={32} />
            </div>

            <div className="step">
              <div className="step-number">3</div>
              <h3>Auto-Fill Form</h3>
              <p>
                Patient intake form is automatically populated with extracted
                data
              </p>
            </div>

            <div className="step-arrow">
              <ChevronRightIcon size={32} />
            </div>

            <div className="step">
              <div className="step-number">4</div>
              <h3>Generate Plan</h3>
              <p>
                Create evidence-based treatment plans with AI recommendations
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Data Sources Section */}
      <section className="data-sources" id="data">
        <div className="data-sources-container">
          <div className="data-sources-header">
            <div className="data-badge">
              <VerifiedIcon size={20} />
              <span>Verified Sources</span>
            </div>
            <h2 className="section-title">Powered by Real Medical Data</h2>
            <p className="section-subtitle">
              Our platform uses authentic, verified data from trusted healthcare
              institutions and research databases
            </p>
          </div>

          <div className="data-cards-grid">
            <div className="data-card">
              <div className="data-card-icon">
                <DatabaseIcon size={36} />
              </div>
              <div className="data-card-content">
                <h3>Philippine FDA Drug Registry</h3>
                <p className="data-description">
                  Complete database of <strong>31,000+ registered drugs</strong>{" "}
                  from the Food and Drug Administration Philippines. Includes
                  brand names, generic names, dosage forms, and manufacturer
                  information.
                </p>
                <a
                  href="https://verification.fda.gov.ph/drug_productslist.php"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="data-source-link"
                >
                  <span>View Official Source</span>
                  <ExternalLinkIcon size={14} />
                </a>
              </div>
              <div className="data-card-badge verified">
                <VerifiedIcon size={14} />
                <span>Official FDA Data</span>
              </div>
            </div>

            <div className="data-card">
              <div className="data-card-icon">
                <MedicationIcon size={36} />
              </div>
              <div className="data-card-content">
                <h3>Drug-Drug Interaction Database</h3>
                <p className="data-description">
                  Comprehensive DDI dataset with{" "}
                  <strong>interaction severity levels</strong>, clinical
                  effects, and safer alternatives. Helps prevent adverse drug
                  combinations and ensures patient safety.
                </p>
                <a
                  href="https://www.kaggle.com/datasets/shayanhusain/drug-drug-interactions-management-and-safer-alters"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="data-source-link"
                >
                  <span>View Dataset Source</span>
                  <ExternalLinkIcon size={14} />
                </a>
              </div>
              <div className="data-card-badge research">
                <ChartIcon size={14} />
                <span>Research Dataset</span>
              </div>
            </div>
          </div>

          <div className="data-trust-indicators">
            <div className="trust-item">
              <VerifiedIcon size={18} />
              <span>Government Verified</span>
            </div>
            <div className="trust-item">
              <ShieldIcon size={18} />
              <span>Regularly Updated</span>
            </div>
            <div className="trust-item">
              <DatabaseIcon size={18} />
              <span>31,000+ Drug Records</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2>Ready to Transform Your Clinical Workflow?</h2>
          <p>
            Join healthcare professionals using MedicAI to improve patient care
          </p>
          <button className="cta-button-large" onClick={handleGetStarted}>
            {user ? "Go to Dashboard" : "Start Free Trial"}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-section footer-brand-section">
            <div className="footer-brand">
              <img src={logoImage} alt="MedicAI" className="footer-logo" />
            </div>
            <p>AI-Powered Clinical Assistant</p>
          </div>

          <div className="footer-section">
            <h4>Quick Links</h4>
            <ul>
              <li>
                <a href="#features">Features</a>
              </li>
              <li>
                <a href="#benefits">Benefits</a>
              </li>
              <li>
                <a href="#about">About</a>
              </li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>Legal</h4>
            <ul>
              <li>
                <a href="#privacy">Privacy Policy</a>
              </li>
              <li>
                <a href="#terms">Terms of Service</a>
              </li>
              <li>
                <a href="#hipaa">HIPAA Compliance</a>
              </li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>Contact</h4>
            <p>Email: support@mediassist.com</p>
            <p>Phone: (555) 123-4567</p>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; 2025 MedicAI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
