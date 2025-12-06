import axios from "axios";

// Use environment variable with fallback for development
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Enable cookies for authentication
  timeout: 30000, // 30 second timeout
});

// Add token to requests if it exists in localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for consistent error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle network errors
    if (!error.response) {
      error.message = "Network error. Please check your connection.";
    }
    // Handle timeout
    if (error.code === "ECONNABORTED") {
      error.message = "Request timed out. Please try again.";
    }
    return Promise.reject(error);
  }
);

export const patientAPI = {
  /**
   * Get all patients with pagination and filtering
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number (default: 1)
   * @param {number} params.limit - Items per page (default: 20, max: 100)
   * @param {string} params.status - Filter by status
   * @param {string} params.search - Search by name or condition
   * @param {string} params.sortBy - Sort field (default: createdAt)
   * @param {string} params.sortOrder - Sort order: 'asc' or 'desc' (default: desc)
   * @param {string} params.fields - Comma-separated fields to return
   */
  getAll: (params = {}) => api.get("/patients", { params }),

  // Legacy: Get all patients without pagination (for backwards compatibility)
  getAllLegacy: () =>
    api
      .get("/patients", { params: { limit: 1000 } })
      .then((res) => res.data.data || res.data),

  // Get single patient
  getById: (id, fields) =>
    api.get(`/patients/${id}`, { params: fields ? { fields } : undefined }),

  // Create new patient
  create: (patientData) => api.post("/patients", patientData),

  // Update patient
  update: (id, patientData) => api.put(`/patients/${id}`, patientData),

  // Delete patient
  delete: (id) => api.delete(`/patients/${id}`),
};

export const treatmentAPI = {
  // Generate new treatment plan
  generate: (patientId) => api.post(`/treatments/generate/${patientId}`),

  /**
   * Get all treatment plans with pagination and filtering
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number (default: 1)
   * @param {number} params.limit - Items per page (default: 20, max: 100)
   * @param {string} params.status - Filter by status
   * @param {string} params.patientId - Filter by patient
   * @param {string} params.riskLevel - Filter by risk level
   * @param {string} params.sortBy - Sort field (default: createdAt)
   * @param {string} params.sortOrder - Sort order: 'asc' or 'desc' (default: desc)
   * @param {string} params.summary - 'true' for lightweight list response
   */
  getAll: (params = {}) => api.get("/treatments", { params }),

  // Legacy: Get all treatment plans without pagination
  getAllLegacy: () =>
    api
      .get("/treatments", { params: { limit: 1000 } })
      .then((res) => res.data.data || res.data),

  // Get treatment plan by ID
  getById: (id) => api.get(`/treatments/${id}`),

  /**
   * Get treatment plans for a patient
   * @param {string} patientId - Patient ID
   * @param {Object} options - Optional parameters
   * @param {boolean} options.summary - Return lightweight summary
   */
  getByPatient: (patientId, { summary = false } = {}) =>
    api.get(`/treatments/patient/${patientId}`, {
      params: summary ? { summary: "true" } : undefined,
    }),

  // Get full analysis details
  getFullDetails: (id) => api.get(`/treatments/${id}/full-details`),

  // Enter review step (captures initial AI snapshot for audit)
  enterReview: (id, data) => api.post(`/treatments/${id}/enter-review`, data),

  // Approve treatment plan
  approve: (id, data) => api.put(`/treatments/${id}/approve`, data),

  // Reject treatment plan
  reject: (id, data) => api.put(`/treatments/${id}/reject`, data),

  // Modify treatment plan (initial modification before approval)
  modify: (id, data) => api.put(`/treatments/${id}/modify`, data),

  // Post-approval modification
  postApprovalModify: (id, data) =>
    api.put(`/treatments/${id}/post-approval-modify`, data),

  // Regenerate treatment plan (re-run AI analysis)
  regenerate: (id, data) => api.post(`/treatments/${id}/regenerate`, data),

  // Delete treatment plan
  delete: (id) => api.delete(`/treatments/${id}`),
};

export const auditAPI = {
  // Get all audit logs (paginated)
  getAll: (params = {}) => api.get("/audit", { params }),

  // Get audit trail for a patient
  getPatientAudit: (patientId, params = {}) =>
    api.get(`/audit/patient/${patientId}`, { params }),

  // Get audit trail for a treatment plan
  getTreatmentAudit: (treatmentPlanId) =>
    api.get(`/audit/treatment/${treatmentPlanId}`),

  // Get physician activity report
  getPhysicianActivity: (userName, params = {}) =>
    api.get(`/audit/physician/${userName}`, { params }),

  // Get critical safety events
  getCriticalEvents: (params = {}) =>
    api.get("/audit/safety/critical", { params }),

  // Get compliance summary
  getComplianceSummary: (params = {}) =>
    api.get("/audit/compliance/summary", { params }),
};

export const chatAPI = {
  // Send a chat message
  sendMessage: (message, conversationHistory = [], patientContext = null) =>
    api.post("/chat", { message, conversationHistory, patientContext }),

  // Get drug information
  getDrugInfo: (drugName) =>
    api.get(`/chat/drug/${encodeURIComponent(drugName)}`),

  // Check drug interactions
  checkInteractions: (drugs) => api.post("/chat/check-interactions", { drugs }),

  // Text-to-speech - returns audio blob
  textToSpeech: async (text, voice = "nova") => {
    const response = await api.post(
      "/chat/tts",
      { text, voice },
      {
        responseType: "blob",
        timeout: 60000, // 60 second timeout for audio generation
      }
    );
    return response.data;
  },
};

export const consultationAPI = {
  // Upload and process consultation audio/video
  uploadMedia: (file, onProgress) => {
    const formData = new FormData();
    formData.append("media", file);

    return api.post("/consultation/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        }
      },
    });
  },

  // Transcribe only (without extraction)
  transcribeOnly: (file) => {
    const formData = new FormData();
    formData.append("media", file);

    return api.post("/consultation/transcribe-only", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  // Extract patient data from text
  extractFromText: (transcript) =>
    api.post("/consultation/extract-from-text", { transcript }),
};

export const documentAPI = {
  // Upload and process medical documents (PDF, Word, Excel, images, etc.)
  uploadDocument: (file, onProgress) => {
    const formData = new FormData();
    formData.append("document", file);

    return api.post("/documents/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 60000, // 60 second timeout for document processing
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        }
      },
    });
  },
};

export const authAPI = {
  // Login
  login: (username, password) =>
    api.post("/auth/login", { username, password }),

  // Register new user
  register: (userData) => api.post("/auth/register", userData),

  // Logout
  logout: () => api.post("/auth/logout"),

  // Get current user
  getCurrentUser: () => api.get("/auth/me"),
};

export const publicAPI = {
  // Get treatment plan by ID (public route for QR codes)
  getTreatment: (id) => api.get(`/public/treatment/${id}`),
};

export const patientPortalAPI = {
  // Get the logged-in patient's own profile
  getProfile: () => api.get("/patient-portal/profile"),

  // Update the logged-in patient's own profile
  updateProfile: (data) => api.put("/patient-portal/profile", data),

  // Get the logged-in patient's treatment plans
  getTreatments: () => api.get("/patient-portal/treatments"),

  // Get a specific treatment plan
  getTreatment: (id) => api.get(`/patient-portal/treatment/${id}`),
};

export default api;
