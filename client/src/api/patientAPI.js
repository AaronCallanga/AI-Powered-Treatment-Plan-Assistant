import axios from "axios";

const API_BASE_URL = "http://localhost:3000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Enable cookies for authentication
});

// Add token to requests if it exists in localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const patientAPI = {
  // Get all patients
  getAll: () => api.get("/patients"),

  // Get single patient
  getById: (id) => api.get(`/patients/${id}`),

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

  // Get all treatment plans
  getAll: () => api.get("/treatments"),

  // Get treatment plan by ID
  getById: (id) => api.get(`/treatments/${id}`),

  // Get treatment plans for a patient
  getByPatient: (patientId) => api.get(`/treatments/patient/${patientId}`),

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
  getTreatment: (id) =>
    axios.get(`${API_BASE_URL}/public/treatment/${id}`, {
      withCredentials: true,
    }),
};

export default api;
