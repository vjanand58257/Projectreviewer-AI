import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
  timeout: 30000,
});

export const getHealth = () => API.get("/health");
export const uploadProject = (formData) => API.post("/upload", formData, {
  headers: { "Content-Type": "multipart/form-data" }
});
export const getStatus = (projectId) => API.get(`/status/${projectId}`);
export const analyzeProject = (payload) => API.post("/analyze", payload);
export const getReport = (analysisId) => API.get(`/reports/${analysisId}`);
export const getReportsList = () => API.get("/reports");

export default API;
