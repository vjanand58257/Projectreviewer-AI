import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getStatus, analyzeAll } from "../services/api";
import { agentsData } from "../data/dummyData";
import { useReview } from "../context/ReviewContext";
import AgentStatusItem from "../components/AgentStatusItem";
import Button from "../components/Button";
import { Terminal, Cpu, HardDrive, FileCode, CheckCircle, AlertTriangle } from "lucide-react";

const EXTRACT_STEP = {
  id: "extract",
  name: "Extracting Project",
  fullName: "Extracting Project",
  description: "Unpacking and validating uploaded ZIP archive",
  color: "emerald",
  status: "pending",
};

const FOLDER_STEP = {
  id: "folder_analysis",
  name: "Folder Analysis",
  fullName: "Folder Structure Analysis",
  description: "Scanning project layout: README, tests, Docker, CI/CD, and more",
  color: "indigo",
  status: "pending",
};

export default function LoadingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { updateAgentResult, loadReview } = useReview();

  const projectId = location.state?.projectId ?? null;
  const uploadedFilename = location.state?.filename ?? null;

  const [steps, setSteps] = useState([
    { ...EXTRACT_STEP },
    { ...FOLDER_STEP },
    ...agentsData
      .filter((a) => a.id !== "folder")   // folder already represented by FOLDER_STEP
      .map((a) => ({ ...a, status: "pending" })),
  ]);

  const [overallProgress, setOverallProgress] = useState(0);
  const [activeStage, setActiveStage] = useState("Initializing evaluation swarm...");
  const [errorText, setErrorText] = useState(null);

  // Live Console Logs
  const [consoleLogs, setConsoleLogs] = useState([
    { type: "info", text: "Initializing sandbox environment on secure executor..." },
    { type: "info", text: "Standby for package verification..." }
  ]);

  const logEndRef = useRef(null);

  const addLog = (text, type = "info") => {
    const timestamp = new Date().toLocaleTimeString(undefined, {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
    setConsoleLogs((prev) => [...prev, { timestamp, text, type }]);
  };

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [consoleLogs]);

  const updateStepStatus = (id, newStatus) => {
    setSteps((prev) => {
      const updated = prev.map((s) => {
        if (s.id === id && s.status !== newStatus) {
          // Log changes in step status to console
          const statusLabels = {
            in_progress: "Evaluating...",
            done: "Completed successfully",
            error: "Failed"
          };
          if (statusLabels[newStatus]) {
            addLog(`${s.fullName || s.name}: ${statusLabels[newStatus]}`, newStatus === "error" ? "error" : "success");
          }
          return { ...s, status: newStatus };
        }
        return s;
      });
      return updated;
    });
  };

  useEffect(() => {
    let cancelled = false;
    let pollInterval = null;

    if (!projectId) {
      navigate("/upload");
      return;
    }

    const runRealAnalysis = async () => {
      addLog(`Unpacking uploaded archive: ${uploadedFilename || projectId}`, "info");
      updateStepStatus("extract", "done");
      setOverallProgress(10);
      setActiveStage("Starting dynamic analysis orchestrator...");

      try {
        addLog("Deploying 8 multi-agent validators concurrently...", "info");
        const orchestratorPromise = analyzeAll(projectId);
        
        pollInterval = setInterval(async () => {
          try {
            const statusRes = await getStatus(projectId);
            if (cancelled) return;

            const { status, agents } = statusRes.data;
            
            let completedCount = 0;
            const totalAgents = 8;
            
            if (agents) {
              Object.keys(agents).forEach((agentName) => {
                const agentState = agents[agentName];
                
                const statusMapping = {
                  "pending": "pending",
                  "in_progress": "in_progress",
                  "done": "done",
                  "failed": "error"
                };
                
                const uiStatus = statusMapping[agentState] || "pending";
                if (uiStatus === "done") completedCount++;
                
                if (agentName === "folder") {
                  updateStepStatus("folder_analysis", uiStatus);
                } else {
                  updateStepStatus(agentName, uiStatus);
                }
              });
            }

            const currentProgress = 10 + Math.floor((completedCount / totalAgents) * 90);
            setOverallProgress(currentProgress);

            const activeAgentNames = Object.keys(agents || {}).filter(
              (name) => agents[name] === "in_progress"
            );
            if (activeAgentNames.length > 0) {
              setActiveStage(`Evaluating with ${activeAgentNames.join(", ")}...`);
              if (Math.random() > 0.6) {
                addLog(`Agent ${activeAgentNames[Math.floor(Math.random() * activeAgentNames.length)]} reading files...`, "info");
              }
            } else if (status === "done") {
              setActiveStage("Analysis completed! Synthesizing final report...");
            }

            if (status === "done") {
              clearInterval(pollInterval);
            }
          } catch (err) {
            console.error("Polling error:", err);
          }
        }, 1500);

        const finalRes = await orchestratorPromise;
        if (cancelled) return;

        clearInterval(pollInterval);
        setOverallProgress(100);
        setActiveStage("All evaluations complete! Redirecting to report dashboard...");
        addLog("Synthesis finished. Grading report generated.", "success");
        
        const reportData = {
          success: true,
          project_id: projectId,
          overall_score: finalRes.data.overall_score,
          meta: { projectName: uploadedFilename || projectId },
          results: finalRes.data.results
        };
        
        loadReview(reportData);
        setTimeout(() => {
          if (!cancelled) navigate("/dashboard");
        }, 1200);

      } catch (err) {
        if (!cancelled) {
          const errMsg = err.response?.data?.error ?? err.message ?? "Analysis swarm execution failed.";
          setErrorText(errMsg);
          setActiveStage("Orchestration failed.");
          addLog(`Swarm crash: ${errMsg}`, "error");
          clearInterval(pollInterval);
        }
      }
    };

    let cleanupFn = () => {};
    if (projectId) {
      runRealAnalysis();
      cleanupFn = () => {
        if (pollInterval) clearInterval(pollInterval);
      };
    }

    return () => {
      cancelled = true;
      cleanupFn();
    };
  }, [projectId, navigate, updateAgentResult, loadReview]);

  // Find currently active step
  const activeStep = steps.find((s) => s.status === "in_progress") || steps.find((s) => s.status === "pending");

  return (
    <div className="w-full flex flex-col space-y-8 z-10 max-w-7xl mx-auto px-2">
      {/* Top Header & overall progress */}
      <div className="glass-panel p-6 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1.5 text-center md:text-left">
          <h2 className="text-2xl font-space font-extrabold text-white">
            Swarm Mission Control
          </h2>
          {uploadedFilename && (
            <p className="text-xs font-mono text-slate-400 bg-white/5 border border-white/5 px-2.5 py-1 rounded-lg inline-block">
              Repository: {uploadedFilename}
            </p>
          )}
          <p className="text-xs font-mono font-bold text-[#00e5ff] tracking-wide animate-pulse">
            {activeStage}
          </p>
        </div>

        {/* Big Glow progress bar */}
        <div className="w-full md:max-w-md space-y-2">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 font-mono uppercase tracking-widest">
            <span>Orchestration Swarm progress</span>
            <span className="text-[#00e5ff]">{overallProgress}%</span>
          </div>
          <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-[#0066ff] via-[#00e5ff] to-[#a855f7] rounded-full transition-all duration-700 ease-out shadow-[0_0_15px_rgba(0,229,255,0.4)]"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: AI Agent Pipeline */}
        <div className="lg:col-span-4 glass-panel p-5 space-y-4 max-h-[640px] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h3 className="font-space font-bold text-sm text-white uppercase tracking-wider">
              Swarm Pipeline Steps
            </h3>
            <span className="text-[10px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded-md">
              {steps.filter(s => s.status === "done").length} / {steps.length}
            </span>
          </div>
          <div className="space-y-3">
            {steps.map((step) => (
              <AgentStatusItem key={step.id} agent={step} />
            ))}
          </div>
        </div>

        {/* Center Column: AI Core & Project Digital Twin */}
        <div className="lg:col-span-4 glass-panel p-6 h-[500px] sm:h-[640px] flex flex-col items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#0066ff]/5 blur-[40px] pointer-events-none" />

          {/* Header Title */}
          <div className="text-center w-full">
            <h3 className="font-space font-bold text-xs text-slate-400 uppercase tracking-widest">
              Project Digital Twin
            </h3>
          </div>

          {/* Rotating AI Core Visual */}
          <div className="relative w-40 h-40 flex items-center justify-center">
            {/* Pulsing glow halos */}
            <div className={`absolute w-32 h-32 rounded-full border border-[#00e5ff]/20 animate-ping`} style={{ animationDuration: "3s" }} />
            <div className="absolute w-28 h-28 border border-dashed border-[#a855f7]/30 rounded-full animate-spin-reverse-slow" />
            <div className="absolute w-36 h-36 border border-white/5 rounded-full animate-spin-slow" />
            
            {/* Core Box */}
            <div className="w-20 h-20 rounded-2xl glass-panel-glow border-[#00e5ff]/35 shadow-[0_0_30px_rgba(0,229,255,0.2)] flex flex-col items-center justify-center z-10">
              <Cpu className="w-8 h-8 text-[#00e5ff] animate-pulse" />
              <span className="text-[8px] font-mono text-slate-400 uppercase font-bold tracking-widest mt-1">SWARM</span>
            </div>
          </div>

          {/* Directory Tree Digital Twin with Animated pulse nodes */}
          <div className="w-full bg-[#020205]/45 border border-white/5 p-4 rounded-xl font-mono text-[10px] text-slate-300 space-y-2 relative overflow-hidden">
            {/* Flow line animation */}
            <div className="absolute left-[20px] top-[25px] bottom-[30px] w-[1px] bg-gradient-to-b from-[#00e5ff]/50 via-[#a855f7]/50 to-transparent animate-pulse" />

            <div className="flex items-center gap-2">
              <HardDrive className="w-3.5 h-3.5 text-[#00e5ff]" />
              <span className="font-bold text-white">Project Root (Extract)</span>
            </div>
            
            <div className="pl-6 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">├── src/</span>
                {activeStep?.id === "folder_analysis" && <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff] animate-ping" />}
              </div>
              <div className="pl-6 space-y-1.5 text-slate-400">
                <div className="flex items-center justify-between">
                  <span>├── components/</span>
                  {activeStep?.id === "presentation" && <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff] animate-ping" />}
                </div>
                <div className="flex items-center justify-between">
                  <span>└── pages/</span>
                  {activeStep?.id === "innovation" && <span className="w-1.5 h-1.5 rounded-full bg-[#a855f7] animate-ping" />}
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span>├── README.md</span>
                {activeStep?.id === "documentation" && <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff] animate-ping" />}
              </div>
              <div className="flex items-center justify-between">
                <span>├── package.json</span>
                {activeStep?.id === "security" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />}
              </div>
              <div className="flex items-center justify-between">
                <span>└── vite.config.js</span>
                {activeStep?.id === "bug" && <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />}
              </div>
            </div>

            {/* Glowing signal message overlay */}
            <div className="absolute right-3 bottom-3 bg-[#00e5ff]/5 border border-[#00e5ff]/20 px-2 py-0.5 rounded text-[8px] uppercase font-bold text-[#00e5ff]">
              Data Stream Active
            </div>
          </div>
        </div>

        {/* Right Column: Live Activity Console */}
        <div className="lg:col-span-4 glass-panel p-5 h-[500px] sm:h-[640px] flex flex-col border-white/5 relative overflow-hidden">
          {/* Top terminal tab bar */}
          <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#a855f7]" />
              <h3 className="font-space font-bold text-sm text-white uppercase tracking-wider">
                Live Activity Console
              </h3>
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>

          {/* Terminal log messages container */}
          <div className="flex-1 overflow-y-auto space-y-2.5 font-mono text-[10px] leading-relaxed pr-1">
            {consoleLogs.map((log, idx) => (
              <div key={idx} className="flex items-start gap-2 border-b border-white/[0.02] pb-1.5">
                <span className="text-slate-500 shrink-0">[{log.timestamp || "00:00:00"}]</span>
                {log.type === "success" && <span className="text-emerald-400 shrink-0">[OK]</span>}
                {log.type === "error" && <span className="text-rose-400 shrink-0">[ERR]</span>}
                {log.type === "info" && <span className="text-[#00e5ff] shrink-0">[SWARM]</span>}
                <span className="text-slate-300 break-words">{log.text}</span>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>

          {/* Simulated input prompt typing indicator */}
          <div className="border-t border-white/5 pt-3 mt-4 flex items-center gap-2 font-mono text-[10px] text-slate-500">
            <span>root@swarm:~#</span>
            <span className="text-white animate-pulse">|</span>
            <span className="text-[9px] text-[#00e5ff]/60 uppercase ml-auto">Polling Status...</span>
          </div>
        </div>

      </div>

      {/* Error banner */}
      {errorText && (
        <div className="p-5 rounded-xl border border-rose-500/20 bg-rose-500/5 text-slate-300 text-xs space-y-4 max-w-2xl mx-auto font-mono">
          <div className="flex items-center gap-2.5 text-rose-400 font-bold">
            <AlertTriangle className="w-5 h-5" />
            <span>Sandbox Execution Interrupted</span>
          </div>
          <p className="text-slate-400 bg-black/40 p-3 rounded-lg border border-white/5 break-all">
            {errorText}
          </p>
          <Button variant="outline" onClick={() => navigate("/upload")}>
            Back to Upload Terminal
          </Button>
        </div>
      )}

      {/* Bottom Actions */}
      <div className="flex justify-center pt-2">
        {overallProgress === 100 && (
          <Button onClick={() => navigate("/dashboard")} className="shadow-[0_0_20px_rgba(0,229,255,0.2)]">
            Open Dashboard
          </Button>
        )}
      </div>
    </div>
  );
}
