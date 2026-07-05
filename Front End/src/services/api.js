import axios from "axios";

console.log("API URL:", import.meta.env.VITE_API_BASE_URL);

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "https://projectreviewer-ai.onrender.com/api",
  timeout: 300000,
});

export const getHealth = () => API.get("/health");

export const uploadProject = (formData, config = {}) =>
  API.post("/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    ...config,
  });

export const getStatus = (projectId) =>
  API.get(`/analyze/status/${projectId}`);

export const analyzeAll = (projectId) =>
  API.post(`/analyze/all/${projectId}`);

export const getReport = (analysisId) =>
  API.get(`/reports/${analysisId}`);

export const getReportsList = () =>
  API.get("/reports");

export default API;