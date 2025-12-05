import axios from "axios";

const API_BASE_URL = "http://localhost:3000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
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

export default api;
