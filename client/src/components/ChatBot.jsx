import { useState, useRef, useEffect, useCallback } from "react";
import { chatAPI } from "../api/patientAPI";
import "./ChatBot.css";

// Supported languages for speech recognition
const SUPPORTED_LANGUAGES = [
  { code: "en-US", name: "English (US)", flag: "🇺🇸" },
  { code: "en-GB", name: "English (UK)", flag: "🇬🇧" },
  { code: "es-ES", name: "Spanish", flag: "🇪🇸" },
  { code: "fr-FR", name: "French", flag: "🇫🇷" },
  { code: "de-DE", name: "German", flag: "🇩🇪" },
  { code: "it-IT", name: "Italian", flag: "🇮🇹" },
  { code: "pt-BR", name: "Portuguese (BR)", flag: "🇧🇷" },
  { code: "zh-CN", name: "Chinese (Simplified)", flag: "🇨🇳" },
  { code: "ja-JP", name: "Japanese", flag: "🇯🇵" },
  { code: "ko-KR", name: "Korean", flag: "🇰🇷" },
  { code: "ar-SA", name: "Arabic", flag: "🇸🇦" },
  { code: "hi-IN", name: "Hindi", flag: "🇮🇳" },
  { code: "ru-RU", name: "Russian", flag: "🇷🇺" },
  { code: "nl-NL", name: "Dutch", flag: "🇳🇱" },
  { code: "pl-PL", name: "Polish", flag: "🇵🇱" },
  { code: "vi-VN", name: "Vietnamese", flag: "🇻🇳" },
  { code: "th-TH", name: "Thai", flag: "🇹🇭" },
  { code: "tl-PH", name: "Filipino", flag: "🇵🇭" },
];

function ChatBot({ currentPatient = null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hello! I'm your clinical assistant. I can help you with:\n\n• Drug interactions and contraindications\n• Dosage recommendations\n• Clinical guidelines\n• Patient-specific advice\n\nHow can I assist you today?",
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Voice recognition state
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("en-US");
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const recognitionRef = useRef(null);
  const languageMenuRef = useRef(null);

  // Check for speech recognition support
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
    }
  }, []);

  // Setup speech recognition handlers
  useEffect(() => {
    if (!recognitionRef.current) return;

    const recognition = recognitionRef.current;
    recognition.lang = selectedLanguage;

    recognition.onresult = (event) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      if (final) {
        setInputMessage((prev) => prev + (prev ? " " : "") + final);
        setInterimTranscript("");
      } else {
        setInterimTranscript(interim);
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "not-allowed") {
        alert(
          "Microphone access denied. Please allow microphone access to use voice input."
        );
      }
      setIsListening(false);
      setInterimTranscript("");
    };

    recognition.onend = () => {
      if (isListening) {
        // Restart if we're still supposed to be listening
        try {
          recognition.start();
        } catch (e) {
          setIsListening(false);
        }
      }
    };

    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
    };
  }, [selectedLanguage, isListening]);

  // Close language menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        languageMenuRef.current &&
        !languageMenuRef.current.contains(event.target)
      ) {
        setShowLanguageMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setInterimTranscript("");
    } else {
      try {
        recognitionRef.current.lang = selectedLanguage;
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error("Failed to start speech recognition:", error);
      }
    }
  }, [isListening, selectedLanguage]);

  const handleLanguageChange = (langCode) => {
    setSelectedLanguage(langCode);
    setShowLanguageMenu(false);

    // Restart recognition with new language if currently listening
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setTimeout(() => {
        recognitionRef.current.lang = langCode;
        recognitionRef.current.start();
      }, 100);
    }
  };

  const getCurrentLanguage = () => {
    return (
      SUPPORTED_LANGUAGES.find((lang) => lang.code === selectedLanguage) ||
      SUPPORTED_LANGUAGES[0]
    );
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const handleSendMessage = async (messageText = inputMessage) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage = { role: "user", content: messageText.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);
    setShowQuickActions(false);

    try {
      // Build conversation history for context
      const conversationHistory = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Build patient context if available
      let patientContext = null;
      if (currentPatient) {
        patientContext = {
          age: currentPatient.age,
          sex: currentPatient.sex,
          conditions: currentPatient.medicalHistory?.conditions || [],
          allergies: currentPatient.medicalHistory?.allergies || [],
          currentMedications:
            currentPatient.medicalHistory?.currentMedications || [],
          familyHistory: currentPatient.medicalHistory?.familyHistory || [],
          lifestyle: currentPatient.medicalHistory?.lifestyle || {},
        };
      }

      const response = await chatAPI.sendMessage(
        messageText.trim(),
        conversationHistory,
        patientContext
      );

      const assistantMessage = {
        role: "assistant",
        content: response.data.response,
        drugContext: response.data.drugContext,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage = {
        role: "assistant",
        content:
          "I apologize, but I encountered an error processing your request. Please try again or rephrase your question.",
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleQuickAction = (action) => {
    const quickPrompts = {
      interactions:
        "What are the most common dangerous drug interactions I should watch for?",
      dosage: "Can you help me with dosage calculations?",
      guidelines: "What are the current treatment guidelines for hypertension?",
      contraindications:
        "What are key contraindications to consider for elderly patients?",
    };
    handleSendMessage(quickPrompts[action]);
  };

  const clearChat = () => {
    setMessages([
      {
        role: "assistant",
        content: "Chat cleared. How can I assist you today?",
      },
    ]);
    setShowQuickActions(true);
  };

  const formatMessage = (content) => {
    // Simple markdown-like formatting
    return content
      .split("\n")
      .map((line, i) => {
        // Bold text
        line = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
        // Bullet points
        if (line.startsWith("• ") || line.startsWith("- ")) {
          return `<li key="${i}">${line.substring(2)}</li>`;
        }
        // Numbered lists
        if (/^\d+\.\s/.test(line)) {
          return `<li key="${i}">${line.replace(/^\d+\.\s/, "")}</li>`;
        }
        return line;
      })
      .join("<br/>");
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <button
        className={`chat-toggle-btn ${isOpen ? "active" : ""}`}
        onClick={toggleChat}
        title="Clinical Assistant Chat"
      >
        {isOpen ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        )}
        {!isOpen && <span className="chat-badge">AI</span>}
      </button>

      {/* Chat Side Modal */}
      <div className={`chat-modal ${isOpen ? "open" : ""}`}>
        <div className="chat-header">
          <div className="chat-header-info">
            <div className="chat-avatar">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 8V4H8"></path>
                <rect x="2" y="8" width="20" height="12" rx="2"></rect>
                <path d="M6 16h.01"></path>
                <path d="M10 16h.01"></path>
                <path d="M14 16h.01"></path>
                <path d="M18 16h.01"></path>
              </svg>
            </div>
            <div>
              <h3>Clinical Assistant</h3>
              <span className="chat-status">
                <span className="status-dot"></span>
                AI-Powered • DDI Database Connected
              </span>
            </div>
          </div>
          <div className="chat-header-actions">
            <button
              onClick={clearChat}
              className="chat-action-btn"
              title="Clear chat"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
            <button
              onClick={toggleChat}
              className="chat-close-btn"
              title="Close chat"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        {currentPatient && (
          <div className="chat-patient-context">
            <span className="context-icon">👤</span>
            <span>
              Context: {currentPatient.firstName} {currentPatient.lastName} (
              {currentPatient.age}y, {currentPatient.sex})
            </span>
          </div>
        )}

        <div className="chat-messages">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`chat-message ${msg.role} ${
                msg.isError ? "error" : ""
              }`}
            >
              {msg.role === "assistant" && (
                <div className="message-avatar">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 8V4H8"></path>
                    <rect x="2" y="8" width="20" height="12" rx="2"></rect>
                    <path d="M6 16h.01"></path>
                    <path d="M10 16h.01"></path>
                  </svg>
                </div>
              )}
              <div className="message-content">
                <div
                  className="message-text"
                  dangerouslySetInnerHTML={{
                    __html: formatMessage(msg.content),
                  }}
                />
                {msg.drugContext && msg.drugContext.length > 0 && (
                  <div className="drug-context-pills">
                    {msg.drugContext.map((drug, i) => (
                      <span key={i} className="drug-pill">
                        💊 {drug}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="chat-message assistant loading">
              <div className="message-avatar">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 8V4H8"></path>
                  <rect x="2" y="8" width="20" height="12" rx="2"></rect>
                  <path d="M6 16h.01"></path>
                  <path d="M10 16h.01"></path>
                </svg>
              </div>
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {showQuickActions && (
          <div className="quick-actions">
            <button onClick={() => handleQuickAction("interactions")}>
              ⚠️ Drug Interactions
            </button>
            <button onClick={() => handleQuickAction("dosage")}>
              💊 Dosage Help
            </button>
            <button onClick={() => handleQuickAction("guidelines")}>
              📋 Guidelines
            </button>
            <button onClick={() => handleQuickAction("contraindications")}>
              🚫 Contraindications
            </button>
          </div>
        )}

        <div className="chat-input-container">
          {/* Language Selector */}
          {speechSupported && (
            <div className="language-selector" ref={languageMenuRef}>
              <button
                className="language-btn"
                onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                title={`Language: ${getCurrentLanguage().name}`}
              >
                <span className="lang-flag">{getCurrentLanguage().flag}</span>
              </button>
              {showLanguageMenu && (
                <div className="language-menu">
                  <div className="language-menu-header">Select Language</div>
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      className={`language-option ${
                        selectedLanguage === lang.code ? "active" : ""
                      }`}
                      onClick={() => handleLanguageChange(lang.code)}
                    >
                      <span className="lang-flag">{lang.flag}</span>
                      <span className="lang-name">{lang.name}</span>
                      {selectedLanguage === lang.code && (
                        <span className="lang-check">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="input-wrapper">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                isListening
                  ? "Listening..."
                  : "Ask about medications, interactions, guidelines..."
              }
              rows={1}
              disabled={isLoading}
            />
            {interimTranscript && (
              <div className="interim-transcript">{interimTranscript}</div>
            )}
          </div>

          {/* Microphone Button */}
          {speechSupported && (
            <button
              onClick={toggleListening}
              disabled={isLoading}
              className={`mic-btn ${isListening ? "listening" : ""}`}
              title={isListening ? "Stop listening" : "Start voice input"}
            >
              {isListening ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  stroke="none"
                >
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                  <line x1="12" x2="12" y1="19" y2="22"></line>
                </svg>
              )}
              {isListening && <span className="listening-pulse"></span>}
            </button>
          )}

          <button
            onClick={() => handleSendMessage()}
            disabled={!inputMessage.trim() || isLoading}
            className="send-btn"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>

        <div className="chat-disclaimer">
          ⚕️ AI-assisted guidance. Always verify with clinical judgment.
        </div>
      </div>

      {/* Overlay */}
      {isOpen && <div className="chat-overlay" onClick={toggleChat}></div>}
    </>
  );
}

export default ChatBot;
