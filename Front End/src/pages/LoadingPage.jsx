import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
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

    // --- SIMULATED FLOW FOR DEMO / NO PROJECT ---
    const runDemoSimulation = () => {
      const timers = [];
      const schedule = (delay, fn) => {
        const t = setTimeout(() => { if (!cancelled) fn(); }, delay);
        timers.push(t);
      };

      schedule(200, () => {
        updateStepStatus("extract", "done");
        updateStepStatus("folder_analysis", "done");
        setActiveStage("Orchestrating remaining agents...");
        updateStepStatus("innovation", "in_progress");
        setOverallProgress(55);
      });
      schedule(1500, () => {
        setActiveStage("Innovation audit complete. Running bug scanning routines...");
        updateStepStatus("innovation", "done");
        updateStepStatus("bug", "in_progress");
        setOverallProgress(68);
      });
      schedule(2700, () => {
        setActiveStage("Bug scanning done. Auditing package and code security...");
        updateStepStatus("bug", "done");
        updateStepStatus("security", "in_progress");
        updateStepStatus("presentation", "in_progress");
        setOverallProgress(80);
      });
      schedule(4100, () => {
        setActiveStage("Simulating developer interview prompts and recommendations...");
        updateStepStatus("security", "done");
        updateStepStatus("presentation", "done");
        updateStepStatus("interview", "in_progress");
        updateStepStatus("improvement", "in_progress");
        setOverallProgress(90);
      });
      schedule(5500, () => {
        setActiveStage("All evaluations complete! Synthesizing final grade...");
        updateStepStatus("interview", "done");
        updateStepStatus("improvement", "done");
        setOverallProgress(100);
      });
      schedule(6800, () => navigate("/dashboard"));

      return () => {
        timers.forEach(clearTimeout);
      };
    };

    // --- REAL SWARM ORCHESTRATION ---
    const runRealAnalysis = async () => {
      // 1. Mark extraction as completed immediately (since it ran during upload)
      updateStepStatus("extract", "done");
      setOverallProgress(10);
      setActiveStage("Starting dynamic analysis orchestrator...");

      try {
        // 2. Trigger background analysis orchestration
        const startRes = await axios.post("http://localhost:5000/api/analyze", {
          project_id: projectId
        });
        
        if (cancelled) return;
        
        if (!startRes.data.success) {
          throw new Error(startRes.data.error || "Failed to trigger analysis.");
        }

        const analysisId = startRes.data.analysis_id;
        
        // 3. Poll status endpoint
        pollInterval = setInterval(async () => {
          try {
            const statusRes = await axios.get(`http://localhost:5000/api/status/${projectId}`);
            if (cancelled) return;

            const { status, progress_percentage, agents } = statusRes.data;
            
            setOverallProgress(progress_percentage);
            
            // Map backend agent statuses to UI steps
            if (agents) {
              Object.keys(agents).forEach((agentName) => {
                const agentState = agents[agentName];
                const statusMapping = {
                  "pending": "pending",
                  "in_progress": "in_progress",
                  "completed": "done",
                  "failed": "error"
                };
                
                const uiStatus = statusMapping[agentState.status] || "pending";
                
                if (agentName === "folder") {
                  updateStepStatus("folder_analysis", uiStatus);
                } else {
                  updateStepStatus(agentName, uiStatus);
                }
              });
            }

            // Update user-facing text based on active agents
            const activeAgentNames = Object.keys(agents || {}).filter(
              (name) => agents[name].status === "in_progress"
            );
            if (activeAgentNames.length > 0) {
              setActiveStage(`Running ${activeAgentNames.join(", ")} agent(s) in swarm...`);
            } else if (status === "completed") {
              setActiveStage("Analysis completed! Fetching final report details...");
            }

            // 4. Finish and pull final report if completed
            if (status === "completed" || progress_percentage === 100) {
              clearInterval(pollInterval);
              
              // Fetch full results to store in context
              const reportRes = await axios.get(`http://localhost:5000/api/reports/${analysisId}`);
              if (!cancelled && reportRes.data.success !== false) {
                const reportData = reportRes.data;
                
                // Save all agent results to context
                loadReview(reportData);
                
                // Navigate to dashboard
                setTimeout(() => {
                  if (!cancelled) navigate("/dashboard");
                }, 1000);
              } else {
                throw new Error("Could not retrieve completed analysis report.");
              }
            } else if (status === "failed") {
              clearInterval(pollInterval);
              setErrorText("The agent analysis swarm failed to complete.");
              updateStepStatus("folder_analysis", "error");
            }

          } catch (err) {
            console.error("Polling error:", err);
            // Don't kill polling on a transient network error, just log it
          }
        }, 1500);

      } catch (err) {
        if (!cancelled) {
          setErrorText(err.response?.data?.error ?? err.message ?? "Analysis swarm execution failed.");
          setActiveStage("Orchestration failed.");
        }
      }
    };

    let cleanupFn = () => {};
    if (projectId) {
      runRealAnalysis();
      cleanupFn = () => {
        if (pollInterval) clearInterval(pollInterval);
      };
    } else {
      cleanupFn = runDemoSimulation();
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
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full inline-block">
            {uploadedFilename}
          </p>
        )}
        <p className="text-sm font-semibold text-violet-650 dark:text-violet-400 min-h-6 transition-all duration-300">
          {activeStage}
        </p>

        {/* Progress Bar */}
        <div className="max-w-md mx-auto mt-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold mb-1.5 uppercase tracking-wider">
            <span>Overall Swarm Progress</span>
            <span>{overallProgress}%</span>
          </div>
          <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-600 to-indigo-600 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Error banners */}
      {errorText && (
        <div className="mb-6 p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400 text-sm space-y-3">
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
        {overallProgress === 100 ? (
          <Button onClick={() => navigate("/dashboard")} className="shadow-lg shadow-violet-500/20">
            View Dashboard
          </Button>
        ) : !errorText ? (
          <Button variant="ghost" onClick={() => navigate("/dashboard")} className="text-xs text-slate-500 hover:text-slate-400">
            Skip Simulation (Go to Dashboard)
          </Button>
        ) : null}
      </div>
    </div>
  );
}
