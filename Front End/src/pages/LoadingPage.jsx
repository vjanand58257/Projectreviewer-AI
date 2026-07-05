import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getStatus, analyzeAll } from "../services/api";
import { agentsData } from "../data/dummyData";
import { useReview } from "../context/ReviewContext";
import AgentStatusItem from "../components/AgentStatusItem";
import Button from "../components/Button";

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

  const updateStepStatus = (id, newStatus) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, status: newStatus } : s)));
  };

  useEffect(() => {
    let cancelled = false;
    let pollInterval = null;

    if (!projectId) {
      navigate("/upload");
      return;
    }

    // --- REAL SWARM ORCHESTRATION ---
    const runRealAnalysis = async () => {
      // 1. Mark extraction as completed immediately (since it ran during upload)
      updateStepStatus("extract", "done");
      setOverallProgress(10);
      setActiveStage("Starting dynamic analysis orchestrator...");

      try {
        // 2. Trigger background analysis orchestration (blocks until complete)
        const orchestratorPromise = analyzeAll(projectId);
        
        // 3. Poll status endpoint
        pollInterval = setInterval(async () => {
          try {
            const statusRes = await getStatus(projectId);
            if (cancelled) return;

            const { status, agents } = statusRes.data;
            
            // Map backend agent statuses to UI steps
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

            // Update user-facing text based on active agents
            const activeAgentNames = Object.keys(agents || {}).filter(
              (name) => agents[name] === "in_progress"
            );
            if (activeAgentNames.length > 0) {
              setActiveStage(`Running ${activeAgentNames.join(", ")} agent(s) in swarm...`);
            } else if (status === "done") {
              setActiveStage("Analysis completed! Fetching final report details...");
            }

            if (status === "done") {
              clearInterval(pollInterval);
            }
          } catch (err) {
            console.error("Polling error:", err);
          }
        }, 1500);

        // Wait for the orchestration to actually finish
        const finalRes = await orchestratorPromise;
        if (cancelled) return;

        clearInterval(pollInterval);
        setOverallProgress(100);
        setActiveStage("All evaluations complete! Synthesizing final grade...");
        
        // Emulate structure expected by ReviewContext
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
        }, 1000);

      } catch (err) {
        if (!cancelled) {
          setErrorText(err.response?.data?.error ?? err.message ?? "Analysis swarm execution failed.");
          setActiveStage("Orchestration failed.");
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

  return (
    <div className="max-w-3xl mx-auto py-6 sm:py-10 w-full">
      <div className="text-center mb-10 space-y-4">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white">
          Codebase Analysis in Progress
        </h2>
        {uploadedFilename && (
          <p className="text-xs text-gray-500 font-mono dark:text-slate-400 font-mono bg-gray-100 dark:bg-[#111111] dark:bg-gray-100 dark:bg-[#111111] px-3 py-1 rounded-none inline-block">
            {uploadedFilename}
          </p>
        )}
        <p className="text-sm font-semibold text-blue-600 dark:text-[#00f0ff] font-mono min-h-6 transition-all duration-300">
          {activeStage}
        </p>

        {/* Progress Bar */}
        <div className="max-w-md mx-auto mt-6">
          <div className="flex items-center justify-between text-xs text-gray-500 font-mono font-extrabold mb-2 uppercase tracking-widest">
            <span>Overall Swarm Progress</span>
            <span className="text-blue-600 dark:text-[#00f0ff] font-mono">{overallProgress}%</span>
          </div>
          <div className="w-full h-3 bg-gray-100 dark:bg-[#111111] dark:bg-gray-100 dark:bg-[#111111] rounded-none overflow-hidden shadow-inner">
            <div
              className="h-full bg-gray-100 dark:bg-[#111111] border-2 border-gray-300 dark:border-[#222222] bg-[length:200%_200%] rounded-none transition-all duration-700 ease-out animate-gradient-x "
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Error banners */}
      {errorText && (
        <div className="mb-6 p-4 rounded-none border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400 text-sm space-y-3">
          <p className="font-semibold">Orchestration Error</p>
          <p className="font-mono text-xs break-all">{errorText}</p>
          <Button variant="outline" onClick={() => navigate("/upload")} className="text-xs">
            Try Again — Back to Upload
          </Button>
        </div>
      )}

      {/* Steps list */}
      <div className="space-y-4 mb-8">
        {steps.map((step) => (
          <AgentStatusItem key={step.id} agent={step} />
        ))}
      </div>

      {/* Bottom action */}
      <div className="flex justify-center">
        {overallProgress === 100 && (
          <Button onClick={() => navigate("/dashboard")} className="shadow-none shadow-violet-500/20">
            View Dashboard
          </Button>
        )}
      </div>
    </div>
  );
}
