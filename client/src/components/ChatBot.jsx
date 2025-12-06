import { useState, useRef, useEffect, useCallback } from "react";
import { chatAPI } from "../api/patientAPI";
import {
  ChatIcon,
  CloseIcon,
  TrashIcon,
  SendIcon,
  MicIcon,
  MicOffIcon,
  WarningIcon,
  MedicationIcon,
  ClipboardIcon,
  BanIcon,
  AIIcon,
  PatientIcon,
  GlobeIcon,
  CheckIcon,
  TreatmentIcon,
  SpeakerIcon,
  SpeakerOffIcon,
  SpinnerIcon,
} from "./Icons";
import AlertModal from "./AlertModal";
import "./ChatBot.css";

// Supported languages for speech recognition
const SUPPORTED_LANGUAGES = [
  { code: "en-US", name: "English (US)", flag: "US" },
  { code: "en-GB", name: "English (UK)", flag: "GB" },
  { code: "es-ES", name: "Spanish", flag: "ES" },
  { code: "fr-FR", name: "French", flag: "FR" },
  { code: "de-DE", name: "German", flag: "DE" },
  { code: "it-IT", name: "Italian", flag: "IT" },
  { code: "pt-BR", name: "Portuguese (BR)", flag: "BR" },
  { code: "zh-CN", name: "Chinese", flag: "CN" },
  { code: "ja-JP", name: "Japanese", flag: "JP" },
  { code: "ko-KR", name: "Korean", flag: "KR" },
  { code: "ar-SA", name: "Arabic", flag: "SA" },
  { code: "hi-IN", name: "Hindi", flag: "IN" },
  { code: "ru-RU", name: "Russian", flag: "RU" },
  { code: "nl-NL", name: "Dutch", flag: "NL" },
  { code: "pl-PL", name: "Polish", flag: "PL" },
  { code: "vi-VN", name: "Vietnamese", flag: "VN" },
  { code: "th-TH", name: "Thai", flag: "TH" },
  { code: "tl-PH", name: "Filipino", flag: "PH" },
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

  // Text-to-speech state
  const [playingMessageIndex, setPlayingMessageIndex] = useState(null);
  const [loadingTTSIndex, setLoadingTTSIndex] = useState(null);
  const [selectedVoice, setSelectedVoice] = useState("nova");
  const audioRef = useRef(null);
  const audioUrlRef = useRef(null);

  // Alert modal state
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "error",
  });

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
        setAlertModal({
          isOpen: true,
          title: "Microphone Access Required",
          message:
            "Microphone access was denied. Please allow microphone access in your browser settings to use voice input.",
          type: "warning",
        });
      }
      setIsListening(false);
      setInterimTranscript("");
    };

    recognition.onend = () => {
      if (isListening) {
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

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
    };
  }, []);

  // Auto-resize textarea
  const handleTextareaChange = useCallback((e) => {
    const textarea = e.target;
    setInputMessage(textarea.value);

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = "auto";
    // Set height to scrollHeight, but cap at max-height
    const maxHeight = 120;
    const newHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${newHeight}px`;
  }, []);

  // Reset textarea height when input is cleared
  useEffect(() => {
    if (!inputMessage && inputRef.current) {
      inputRef.current.style.height = "auto";
    }
  }, [inputMessage]);

  // Text-to-speech handler
  const handleTextToSpeech = useCallback(
    async (messageIndex, text) => {
      // If already playing this message, stop it
      if (playingMessageIndex === messageIndex) {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
        setPlayingMessageIndex(null);
        return;
      }

      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }

      setLoadingTTSIndex(messageIndex);
      setPlayingMessageIndex(null);

      try {
        const audioBlob = await chatAPI.textToSpeech(text, selectedVoice);
        const audioUrl = URL.createObjectURL(audioBlob);
        audioUrlRef.current = audioUrl;

        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        audio.onended = () => {
          setPlayingMessageIndex(null);
          URL.revokeObjectURL(audioUrl);
          audioUrlRef.current = null;
        };

        audio.onerror = () => {
          console.error("Audio playback error");
          setPlayingMessageIndex(null);
          setLoadingTTSIndex(null);
        };

        await audio.play();
        setPlayingMessageIndex(messageIndex);
      } catch (error) {
        console.error("TTS error:", error);
        setAlertModal({
          isOpen: true,
          title: "Speech Generation Failed",
          message:
            "Failed to generate speech. Please check your connection and try again.",
          type: "error",
        });
      } finally {
        setLoadingTTSIndex(null);
      }
    },
    [playingMessageIndex, selectedVoice]
  );

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
      const conversationHistory = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

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
    const lines = content.split("\n");
    let html = "";
    let inList = false;
    let listType = null; // 'ul' or 'ol'

    const closeList = () => {
      if (inList) {
        html += listType === "ol" ? "</ol>" : "</ul>";
        inList = false;
        listType = null;
      }
    };

    const formatInlineText = (text) => {
      // Bold text with **...**
      text = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      // Italic text with *...*
      text = text.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>");
      // Inline code with `...`
      text = text.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
      // Format labels like "Drugs:", "Consideration:", "Reason:", etc.
      text = text.replace(
        /^([\w\s]+):\s*/,
        '<span class="chat-label">$1:</span> '
      );
      return text;
    };

    lines.forEach((line, i) => {
      const trimmedLine = line.trim();

      // Skip empty lines but close any open lists
      if (!trimmedLine) {
        closeList();
        html += '<div class="chat-spacer"></div>';
        return;
      }

      // Handle headers (### Header, #### Header, etc.)
      const headerMatch = trimmedLine.match(/^(#{1,6})\s+(.+)$/);
      if (headerMatch) {
        closeList();
        const level = headerMatch[1].length;
        const headerText = formatInlineText(headerMatch[2]);
        const headerClass = level <= 3 ? "chat-header-main" : "chat-header-sub";
        html += `<h${Math.min(
          level + 2,
          6
        )} class="${headerClass}">${headerText}</h${Math.min(level + 2, 6)}>`;
        return;
      }

      // Handle bullet points (- item or • item)
      if (trimmedLine.startsWith("- ") || trimmedLine.startsWith("• ")) {
        if (!inList || listType !== "ul") {
          closeList();
          html += '<ul class="chat-list">';
          inList = true;
          listType = "ul";
        }
        const itemContent = formatInlineText(trimmedLine.substring(2));
        html += `<li>${itemContent}</li>`;
        return;
      }

      // Handle numbered lists (1. item)
      const numberedMatch = trimmedLine.match(/^(\d+)\.\s+(.+)$/);
      if (numberedMatch) {
        if (!inList || listType !== "ol") {
          closeList();
          html += '<ol class="chat-list">';
          inList = true;
          listType = "ol";
        }
        const itemContent = formatInlineText(numberedMatch[2]);
        html += `<li>${itemContent}</li>`;
        return;
      }

      // Regular paragraph
      closeList();
      const formattedLine = formatInlineText(trimmedLine);
      html += `<p class="chat-paragraph">${formattedLine}</p>`;
    });

    closeList();
    return html;
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <button
        className={`chat-toggle-btn ${isOpen ? "active" : ""}`}
        onClick={toggleChat}
        title="Clinical Assistant Chat"
      >
        {isOpen ? <CloseIcon size={24} /> : <ChatIcon size={24} />}
        {!isOpen && <span className="chat-badge">AI</span>}
      </button>

      {/* Chat Side Modal */}
      <div className={`chat-modal ${isOpen ? "open" : ""}`}>
        <div className="chat-header">
          <div className="chat-header-info">
            <div className="chat-avatar">
              <AIIcon size={24} />
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
              <TrashIcon size={18} />
            </button>
            <button
              onClick={toggleChat}
              className="chat-close-btn"
              title="Close chat"
            >
              <CloseIcon size={20} />
            </button>
          </div>
        </div>

        {currentPatient && (
          <div className="chat-patient-context">
            <PatientIcon size={16} />
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
                  <TreatmentIcon size={16} />
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
                        <MedicationIcon size={12} />
                        {drug}
                      </span>
                    ))}
                  </div>
                )}
                {/* Text-to-speech button for assistant messages */}
                {msg.role === "assistant" && !msg.isError && (
                  <div className="message-actions">
                    <button
                      className={`tts-btn ${
                        playingMessageIndex === index ? "playing" : ""
                      } ${loadingTTSIndex === index ? "loading" : ""}`}
                      onClick={() => handleTextToSpeech(index, msg.content)}
                      disabled={
                        loadingTTSIndex !== null && loadingTTSIndex !== index
                      }
                      title={
                        playingMessageIndex === index
                          ? "Stop speaking"
                          : "Read aloud"
                      }
                    >
                      {loadingTTSIndex === index ? (
                        <SpinnerIcon size={14} className="spin" />
                      ) : playingMessageIndex === index ? (
                        <SpeakerOffIcon size={14} />
                      ) : (
                        <SpeakerIcon size={14} />
                      )}
                      <span className="tts-label">
                        {loadingTTSIndex === index
                          ? "Loading..."
                          : playingMessageIndex === index
                          ? "Stop"
                          : "Listen"}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="chat-message assistant loading">
              <div className="message-avatar">
                <TreatmentIcon size={16} />
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
              <WarningIcon size={14} />
              <span>Drug Interactions</span>
            </button>
            <button onClick={() => handleQuickAction("dosage")}>
              <MedicationIcon size={14} />
              <span>Dosage Help</span>
            </button>
            <button onClick={() => handleQuickAction("guidelines")}>
              <ClipboardIcon size={14} />
              <span>Guidelines</span>
            </button>
            <button onClick={() => handleQuickAction("contraindications")}>
              <BanIcon size={14} />
              <span>Contraindications</span>
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
                <GlobeIcon size={16} />
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
                      <span className="lang-code">{lang.flag}</span>
                      <span className="lang-name">{lang.name}</span>
                      {selectedLanguage === lang.code && (
                        <CheckIcon size={14} className="lang-check" />
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
              onChange={handleTextareaChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={
                isListening
                  ? "🎤 Listening... speak now"
                  : "How can I help you?"
              }
              rows={1}
              disabled={isLoading}
              className={isListening ? "listening" : ""}
            />
            {interimTranscript && (
              <div className="interim-transcript">
                <MicIcon size={14} />
                <span>{interimTranscript}</span>
              </div>
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
              {isListening ? <MicOffIcon size={20} /> : <MicIcon size={20} />}
              {isListening && <span className="listening-pulse"></span>}
            </button>
          )}

          <button
            onClick={() => handleSendMessage()}
            disabled={!inputMessage.trim() || isLoading}
            className="send-btn"
          >
            <SendIcon size={20} />
          </button>
        </div>

        <div className="chat-disclaimer">
          <TreatmentIcon size={14} />
          <span>
            AI-assisted guidance. Always verify with clinical judgment.
          </span>
        </div>
      </div>

      {/* Overlay */}
      {isOpen && <div className="chat-overlay" onClick={toggleChat}></div>}

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </>
  );
}

export default ChatBot;
