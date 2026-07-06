import React, { useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { uploadProject } from "../services/api";
import Button from "../components/Button";
import { UploadIcon, CloseIcon } from "../components/Icons";
const GithubIcon = (props) => (
  <svg className={props.className} fill="currentColor" viewBox="0 0 24 24" stroke="none">
    <path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.08-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.18 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z"/>
  </svg>
);

const GitlabIcon = (props) => (
  <svg className={props.className} fill="currentColor" viewBox="0 0 24 24" stroke="none">
    <path d="m22.4 12.9-2.5-7.9c-.1-.3-.3-.4-.5-.4a.5.5 0 0 0-.5.3l-2.4 7.6H7.5L5.1 4.9A.5.5 0 0 0 4.6 4.6c-.3 0-.5.2-.5.4L1.6 12.9a1 1 0 0 0 .4 1.2l9.3 6.8a.5.5 0 0 0 .7 0l9.3-6.8c.4-.3.5-.8.4-1.2z"/>
  </svg>
);

const CodeIcon = (props) => (
  <svg className={props.className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
  </svg>
);

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

    const MAX_SIZE = 100 * 1024 * 1024;
    if (selectedFile.size > MAX_SIZE) {
      setError("File size exceeds the maximum limit of 100MB.");
      setFile(null);
      return;
    }

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

      if (err.name === "CanceledError" || axios.isCancel?.(err)) {
        setError("Upload cancelled.");
        return;
      }
      console.error("Upload error:", err);

      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else if (err.message) {
        setError(`Upload Failed: ${err.message}`);
      } else {
        setError("Network Error: Could not connect to the backend server. Make sure it is running on port 5000.");
      }
    }
  };

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

  const techStack = [
    "React", "Angular", "Vue", "Python", "Java", "C#", "Node", "Flutter", "Spring Boot", "Docker"
  ];

  return (
    <div className="max-w-3xl mx-auto py-6 sm:py-12 w-full flex flex-col justify-center items-center z-10 space-y-8">
      {/* Title block */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-space font-extrabold tracking-tight text-white">
          AI Upload Station
        </h2>
        <p className="text-sm font-mono text-slate-400">
          Upload zipped codebase repository to deploy analysis swarm
        </p>
      </div>

      {/* Git Provider Integration (Visual Only) */}
      <div className="w-full grid grid-cols-3 gap-3">
        <button className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] text-slate-300 text-xs font-mono font-bold tracking-wide transition-all opacity-80 hover:opacity-100 cursor-not-allowed">
          <GithubIcon className="w-4 h-4 text-[#00e5ff]" />
          GitHub
        </button>
        <button className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] text-slate-300 text-xs font-mono font-bold tracking-wide transition-all opacity-80 hover:opacity-100 cursor-not-allowed">
          <GitlabIcon className="w-4 h-4 text-[#a855f7]" />
          GitLab
        </button>
        <button className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] text-slate-300 text-xs font-mono font-bold tracking-wide transition-all opacity-80 hover:opacity-100 cursor-not-allowed">
          <CodeIcon className="w-4 h-4 text-[#f43f5e]" />
          Bitbucket
        </button>
      </div>

      {/* Main Upload Glass Panel */}
      <div className="w-full glass-panel p-6 sm:p-8 relative overflow-hidden">
        {/* Glow overlay inside the panel */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#00e5ff]/5 blur-[40px] pointer-events-none" />

        {/* Error banner */}
        {error && (
          <div className="mb-6 p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-400 text-xs flex items-center justify-between font-mono">
            <span className="font-semibold">{error}</span>
            <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-300 cursor-pointer" disabled={isUploading}>
              <CloseIcon className="w-4 h-4" />
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
            className={`w-full min-h-[260px] flex flex-col items-center justify-center p-6 border border-dashed rounded-xl transition-all duration-300 relative overflow-hidden ${dragActive
              ? "border-[#00e5ff] bg-[#00e5ff]/5 scale-[0.99] shadow-[0_0_20px_rgba(0,229,255,0.05)]"
              : "border-white/10 hover:border-[#00e5ff]/40 bg-white/[0.01] hover:bg-white/[0.02]"
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
            <div className={`p-4 rounded-xl border mb-5 transition-all duration-300 ${dragActive ? "bg-[#00e5ff]/10 border-[#00e5ff] text-[#00e5ff]" : "bg-white/5 border-white/10 text-slate-400"
              }`}>
              <UploadIcon className={`w-8 h-8 ${dragActive ? 'animate-bounce' : ''}`} />
            </div>

            {/* Text description */}
            <div className="text-center space-y-1 mb-6">
              <p className="font-space font-bold text-white text-base">
                {dragActive ? "Drop project now!" : "Drag & Drop codebase .zip"}
              </p>
              <p className="text-xs font-mono text-slate-500">
                Support files up to 100MB
              </p>
            </div>

            {/* Selection Button */}
            <Button variant="secondary" onClick={onButtonClick} disabled={isUploading}>
              Browse ZIP
            </Button>
          </div>
        ) : (
          /* File Preview State */
          <div className="w-full flex flex-col gap-5">
            <div className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-[#00e5ff]/15 border border-[#00e5ff]/30 text-[#00e5ff] shrink-0">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h4 className="font-space font-bold text-white text-sm truncate max-w-[200px] sm:max-w-[400px]">
                    {file.name}
                  </h4>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                    {formatBytes(file.size)}
                  </p>
                </div>
              </div>

              {/* Remove button */}
              <button
                onClick={removeFile}
                className={`p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-[#f43f5e] transition-colors cursor-pointer ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                aria-label="Remove file"
                disabled={isUploading}
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Upload Progress Bar */}
            {isUploading && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 font-mono uppercase tracking-widest">
                  <span>Uploading codebase...</span>
                  <span className="text-[#00e5ff]">{uploadProgress}%</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#0066ff] to-[#00e5ff] rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Start evaluation */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Button onClick={startAnalysis} className="w-full sm:flex-1" disabled={isUploading}>
                {isUploading ? `Uploading ${uploadProgress}%` : "Analyze Codebase"}
              </Button>
              <Button
                variant="secondary"
                onClick={removeFile}
                className="w-full sm:w-auto"
                disabled={isUploading}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Supported Technologies Grid */}
      <div className="w-full space-y-4">
        <h4 className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest text-center">
          Supported Environments
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {techStack.map((tech, i) => (
            <div key={i} className="flex items-center justify-center gap-2 p-3 rounded-xl border border-white/5 bg-white/[0.01] hover:border-white/10 transition-colors">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff]" />
              <span className="text-xs text-slate-300 font-mono">{tech}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
