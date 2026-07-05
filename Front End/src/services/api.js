import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 300000, // 5 minutes
});

// Health
export const getHealth = () => API.get("/health");

// Upload project
// config allows:
// - onUploadProgress
// - signal (AbortController)
// - any other Axios options
export const uploadProject = (formData, config = {}) =>
  API.post("/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    ...config,
  });

// Analysis
export const getStatus = (projectId) =>
  API.get(`/analyze/status/${projectId}`);

export const analyzeAll = (projectId) =>
  API.post(`/analyze/all/${projectId}`);

export const getReport = (analysisId) =>
  API.get(`/reports/${analysisId}`);

export const getReportsList = () =>
  API.get("/reports");

export default API;