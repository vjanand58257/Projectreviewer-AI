import React, { useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { uploadProject } from "../services/api";
import Button from "../components/Button";
import { UploadIcon, CloseIcon } from "../components/Icons";

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const abortController = useRef(null);
  const fileInputRef = useRef(null);

  const navigate = useNavigate();

  const handleDrag = (e) => {
    if (isUploading) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateAndSetFile = (selectedFile) => {
    if (!selectedFile) return;

    // Check size limit client-side first (100MB)
    const MAX_SIZE = 100 * 1024 * 1024;
    if (selectedFile.size > MAX_SIZE) {
      setError("File exceeds the maximum limit of 100MB.");
      setFile(null);
      return;
    }

    // Check if the file is a zip archive
    const isZip = selectedFile.name.endsWith(".zip") ||
      selectedFile.type === "application/zip" ||
      selectedFile.type === "application/x-zip-compressed" ||
      selectedFile.type === "application/x-zip";

    if (!isZip) {
      setError("Please upload a valid .zip file containing your codebase.");
      setFile(null);
      return;
    }

    setError(null);
    setFile(selectedFile);
  };

  const handleDrop = (e) => {
    if (isUploading) return;
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current.click();
  };

  const removeFile = () => {

    // Cancel current upload if it is running
    if (abortController.current) {
      abortController.current.abort();
      abortController.current = null;
    }

    setFile(null);
    setError(null);
    setUploadProgress(0);
    setIsUploading(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const startAnalysis = async () => {
    if (!file || isUploading) return;

    setError(null);
    setIsUploading(true);
    abortController.current = new AbortController();

    const formData = new FormData();
    formData.append("file", file);

    try {
      logger_log("Uploading zip archive to API...");

      const formDataToSend = new FormData();
      formDataToSend.append("file", file);

      console.log("Uploading...");
      console.log(formDataToSend);

      // We manually construct axios config for upload to track progress, but using the API instance
      const response = await uploadProject(
        formDataToSend,
        {
          signal: abortController.current.signal,
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percent = Math.round(
                (progressEvent.loaded * 100) /
                progressEvent.total
              );
              setUploadProgress(percent);
            }
          }
        }
      );

      const { data } = response;
      if (data.success) {
        // Redirect to loading simulation and pass project_id + metadata
        navigate("/loading", {
          state: {
            projectId: data.project_id,
            filename: data.filename,
            size: data.size
          }
        });
      } else {
        setError(data.error || "An unknown error occurred during upload.");
        setIsUploading(false);
      }
    } catch (err) {

      setIsUploading(false);

      if (
        err.name === "CanceledError" ||
        axios.isCancel?.(err)
      ) {
        setError("Upload cancelled.");
        return;
      }
      console.log(err);
      console.log(err.response);
      console.log(err.request);
      console.log(err.config);
      console.error("Upload error:", err);
      setIsUploading(false);

      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else if (err.message) {
        setError(`Upload Failed: ${err.message}`);
      } else {
        setError("Network Error: Could not connect to the backend server. Make sure it is running on port 5000.");
      }
    }
  };

  // Safe logging helper
  const logger_log = (msg) => {
    console.log(`[UploadService] ${msg}`);
  };

  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  return (
    <div className="max-w-2xl mx-auto py-8 sm:py-12 w-full flex flex-col justify-center items-center">
      {/* Title block */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white">
          Upload Your Codebase
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          Zip your project folder and drag it here to initiate agentic swarm evaluation.
        </p>
      </div>

      {/* Main Upload Area Wrapper */}
      <div className="w-full bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl shadow-md transition-colors duration-300">
        {/* Error banner */}
        {error && (
          <div className="mb-6 p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-650 dark:text-rose-450 text-sm flex items-center justify-between">
            <span className="font-medium">{error}</span>
            <button onClick={() => setError(null)} className="text-rose-450 hover:text-rose-650 cursor-pointer" disabled={isUploading}>
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Drop Zone Box */}
        {!file ? (
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`w-full min-h-[260px] flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl transition-all duration-300 ${dragActive
              ? "border-violet-500 bg-violet-500/5 dark:bg-violet-950/10 shadow-lg shadow-violet-500/5"
              : "border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30"
              }`}
          >
            {/* Input Element */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              className="hidden"
              onChange={handleFileChange}
              disabled={isUploading}
            />

            {/* Cloud Icon */}
            <div className={`p-4 rounded-full border mb-4 transition-colors ${dragActive ? "bg-violet-500/15 border-violet-500/30 text-violet-650 dark:text-violet-400" : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-450 dark:text-slate-400"
              }`}>
              <UploadIcon className="w-8 h-8" />
            </div>

            {/* Text description */}
            <div className="text-center space-y-1.5 mb-6">
              <p className="font-semibold text-slate-800 dark:text-slate-200 text-base">
                Drag and drop your project here
              </p>
              <p className="text-xs text-slate-450 dark:text-slate-500">
                Supports folder zips up to 100MB
              </p>
            </div>

            {/* Selection Button */}
            <Button variant="secondary" onClick={onButtonClick} disabled={isUploading}>
              Browse Files
            </Button>
          </div>
        ) : (
          /* File Preview State */
          <div className="w-full flex flex-col gap-6">
            <div className="flex items-center justify-between p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
              <div className="flex items-center gap-4">
                {/* Zip icon placeholder */}
                <div className="p-3.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400 shrink-0">
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-slate-850 dark:text-slate-100 text-sm truncate">
                    {file.name}
                  </h4>
                  <p className="text-xs text-slate-450 dark:text-slate-500 mt-0.5">
                    {formatBytes(file.size)}
                  </p>
                </div>
              </div>

              {/* Remove button */}
              <button
                onClick={removeFile}
                className={`p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors cursor-pointer ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                aria-label="Remove file"
                disabled={isUploading}
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Upload Progress Bar */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                  <span>Uploading codebase...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-600 to-indigo-600 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Start evaluation */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Button onClick={startAnalysis} className="w-full sm:flex-1 animate-pulse" disabled={isUploading}>
                {isUploading ? `Uploading ${uploadProgress}%` : "Analyze Codebase"}
              </Button>
              <Button
                variant="secondary"
                onClick={removeFile}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
