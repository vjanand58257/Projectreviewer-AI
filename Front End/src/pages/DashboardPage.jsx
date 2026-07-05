import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getReport, getReportsList } from "../services/api";
import { agentsData } from "../data/dummyData";
import { useReview } from "../context/ReviewContext";
import ScoreCard from "../components/ScoreCard";
import Button from "../components/Button";

export default function DashboardPage() {
  const [filter, setFilter] = useState("all");
  const { activeReview, agentResults, loadReview } = useReview();
  const [historyList, setHistoryList] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await getReportsList();
      if (res.data && res.data.success) {
        setHistoryList(res.data.reports || []);
      }
    } catch (err) {
      console.error("Error fetching review history:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [activeReview]);

  const handleLoadReport = async (analysisId) => {
    try {
      const res = await getReport(analysisId);
      if (res.data && res.data.success !== false) {
        loadReview(res.data);
      }
    } catch (err) {
      console.error("Error loading report:", err);
    }
  };

  const formatAnalyzedAt = (dateStr) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  // If no active review, show an empty state
  if (!activeReview) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">No Review Loaded</h2>
        <p className="text-slate-500 dark:text-slate-400">Please upload a project to see the dashboard.</p>
        <Link to="/upload">
          <Button>Go to Upload</Button>
        </Link>
      </div>
    );
  }

  // Derive overall metrics dynamically
  const displayScore = activeReview.overall_score || 0;
  
  const getGrade = (score) => {
    if (score >= 90) return "Excellent";
    if (score >= 80) return "Good";
    if (score >= 70) return "Average";
    return "Needs Work";
  };
  const displayGrade = getGrade(displayScore);

  const displaySummary = activeReview?.results?.improvement?.data?.highlights?.[0] || 
                         activeReview?.results?.improvement?.data?.findings?.[0]?.description ||
                         "Analysis completed. Please review individual agent results below.";

  const displayMeta = {
    projectName: activeReview?.meta?.projectName || activeReview?.project_id || "Unknown Project",
    analyzedAt: activeReview?.created_at ? new Date(activeReview.created_at).toLocaleString() : "Just now",
    filesScanned: activeReview?.meta?.files_scanned ?? "N/A",
    loc: activeReview?.meta?.loc ?? "N/A",
    language: activeReview?.meta?.language ?? "N/A"
  };

  // Merge real API results over dummy data metadata for agents that have run
  const mergedAgents = agentsData.map((agent) => {
    const real = activeReview.results?.[agent.id];
    if (!real) return { ...agent, score: 0, bullets: ["Agent did not run or failed."] };
    
    // Safely extract text from findings (which can be objects or strings)
    const findingsList = (real.data?.findings || []).map((f) => 
      typeof f === "object" && f !== null ? f.description : f
    );
    
    // Safely extract text from recommendations
    const recsList = (real.data?.recommendations || []).map((r) => 
      typeof r === "object" && r !== null ? r.action : r
    );

    return {
      ...agent,
      score: real.score,
      errors: real.errors || [],
      bullets: [
        ...(real.data?.highlights || []).slice(0, 2),
        ...(findingsList.length > 0
          ? [`Findings: ${findingsList[0]}`]
          : []),
        ...(recsList.length > 0
          ? [`Recommendation: ${recsList[0]}`]
          : []),
      ].slice(0, 4),
    };
  });

  const filteredAgents = mergedAgents.filter((agent) => {
    if (filter === "high") return agent.score >= 85;
    if (filter === "low") return agent.score < 85;
    return true;
  });

  const getScoreColor = (score) => {
    if (score >= 90) return "text-emerald-500 border-emerald-500/20 bg-emerald-500/5";
    if (score >= 80) return "text-indigo-500 border-indigo-500/20 bg-indigo-500/5";
    if (score >= 70) return "text-amber-500 border-amber-500/20 bg-amber-500/5";
    return "text-rose-500 border-rose-500/20 bg-rose-500/5";
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 py-4 sm:py-6">
      {/* Left Columns - Main Content */}
      <div className="lg:col-span-3 space-y-10">
        {/* Top Section: Header & Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white">
              Evaluation Report
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Swarm analysis for <span className="font-semibold text-slate-700 dark:text-slate-355">{displayMeta.projectName}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/upload">
              <Button variant="outline" size="sm">
                Upload New Archive
              </Button>
            </Link>
          </div>
        </div>

        {/* Main Stats: Overall Score Header */}
        <div className="w-full bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm transition-colors duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
            {/* Big Score Card */}
            <div className="flex flex-col sm:flex-row items-center gap-8 lg:border-r lg:border-slate-200 dark:lg:border-slate-800 lg:pr-10 relative">
              
              {/* Background ambient glow behind the gauge */}
              <div className={`absolute top-1/2 left-6 -translate-y-1/2 w-32 h-32 blur-[50px] rounded-full pointer-events-none -z-10 ${
                displayScore >= 90 ? "bg-emerald-500/30" :
                displayScore >= 80 ? "bg-indigo-500/30" :
                displayScore >= 70 ? "bg-amber-500/30" :
                "bg-rose-500/30"
              }`} />

              {/* Circular Progress Gauge */}
              <div className="relative w-44 h-44 shrink-0 flex items-center justify-center drop-shadow-xl hover:scale-105 transition-transform duration-500">
                <svg className="w-full h-full transform -rotate-95 drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]" viewBox="0 0 100 100">
                  {/* Background Ring */}
                  <circle
                    className="text-slate-100 dark:text-slate-800/80"
                    strokeWidth="8"
                    stroke="currentColor"
                    fill="transparent"
                    r="40"
                    cx="50"
                    cy="50"
                  />
                  {/* Foreground Progress */}
                  <circle
                    className={`${
                      displayScore >= 90 ? "text-emerald-500" :
                      displayScore >= 80 ? "text-indigo-500" :
                      displayScore >= 70 ? "text-amber-500" :
                      "text-rose-500"
                    } transition-all duration-1000 ease-out`}
                    strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - displayScore / 100)}`}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r="40"
                    cx="50"
                    cy="50"
                  />
                </svg>
                {/* Inner score */}
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter drop-shadow-sm">
                    {displayScore}
                  </span>
                  <span className="text-slate-400 dark:text-slate-500 font-extrabold text-xs block uppercase tracking-widest mt-1">
                    / 100
                  </span>
                </div>
              </div>

              {/* Score Meta details */}
              <div className="text-center sm:text-left space-y-2 z-10">
                <span className={`inline-flex px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border shadow-sm ${getScoreColor(displayScore)}`}>
                  Grade: {displayGrade}
                </span>
                <h3 className="text-xl font-extrabold text-slate-855 dark:text-slate-100 mt-2">
                  Overall Code Health
                </h3>
                <p className="text-xs text-slate-450 dark:text-slate-500 font-semibold">
                  Analyzed on {displayMeta.analyzedAt}
                </p>
              </div>
            </div>

            {/* Evaluation Narrative */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h4 className="text-xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider mb-2">
                  Executive Summary
                </h4>
                <p className="text-sm sm:text-base text-slate-650 dark:text-slate-350 leading-relaxed font-medium">
                  {displaySummary}
                </p>
              </div>

              {/* Micro Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100 dark:border-slate-850/60">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wide">Language</span>
                  <span className="text-sm font-bold text-slate-755 dark:text-slate-200 block">{displayMeta.language}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wide">Files Scanned</span>
                  <span className="text-sm font-bold text-slate-755 dark:text-slate-200 block">{displayMeta.filesScanned}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wide">Lines of Code</span>
                  <span className="text-sm font-bold text-slate-755 dark:text-slate-200 block">{displayMeta.loc.toLocaleString()}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wide">Engine Version</span>
                  <span className="text-sm font-bold text-slate-755 dark:text-slate-200 block">v1.2.0 (Gemini)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Agents Section: Filters & Grid */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-850 pb-4">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white">
              Specialized Agent Analysis ({filteredAgents.length})
            </h3>

            {/* Filter Toggles */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-905 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800">
              <button
                onClick={() => setFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filter === "all"
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-750 dark:text-slate-450 dark:hover:text-slate-355"
                }`}
              >
                All Agents
              </button>
              <button
                onClick={() => setFilter("high")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filter === "high"
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-750 dark:text-slate-450 dark:hover:text-slate-355"
                }`}
              >
                High Scores (&ge;85)
              </button>
              <button
                onClick={() => setFilter("low")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filter === "low"
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-750 dark:text-slate-450 dark:hover:text-slate-355"
                }`}
              >
                Areas to Improve (&lt;85)
              </button>
            </div>
          </div>

          {/* 8 Agent ScoreCards Grid */}
          {filteredAgents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAgents.map((agent) => (
                <ScoreCard key={agent.id} agent={agent} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border border-dashed border-slate-300 dark:border-slate-850 rounded-2xl">
              <p className="text-slate-500 dark:text-slate-455 font-medium">
                No agents matching this filter.
              </p>
            </div>
          )}
        </div>

        {/* Prioritized Improvements / Recommendations */}
        <div className="bg-gradient-to-br from-violet-500/5 to-indigo-500/5 dark:from-violet-900/10 dark:to-indigo-900/10 border border-violet-500/20 dark:border-violet-500/30 rounded-3xl p-6 sm:p-8 shadow-lg transition-colors duration-300 mt-12 relative overflow-hidden backdrop-blur-md">
          {/* Subtle Background Glow */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-violet-500/20 dark:bg-violet-500/10 blur-[80px] rounded-full pointer-events-none -z-10" />

          <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white mb-6">
            Prioritized Action Plan
          </h3>
          {activeReview.results?.improvement?.data?.recommendations?.length > 0 ? (
            <ul className="space-y-4">
              {activeReview.results.improvement.data.recommendations.map((rec, idx) => (
                <li key={idx} className="group text-sm text-slate-700 dark:text-slate-200 font-medium bg-white/60 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/60 flex items-start gap-4 transition-all duration-300 hover:shadow-md hover:border-violet-500/30 hover:-translate-y-0.5">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5 group-hover:scale-110 group-hover:bg-violet-500 group-hover:text-white transition-all duration-300 shadow-sm">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </span>
                  <span className="leading-relaxed mt-1">{rec}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">No specific recommendations provided by the Improvement Agent.</p>
          )}
        </div>
      </div>

      {/* Right Column - Review History Panel */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white dark:bg-slate-905 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm transition-colors duration-300">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">
            Recent Swarm Reports
          </h3>
          
          {isLoadingHistory ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-500"></div>
            </div>
          ) : historyList.length === 0 ? (
            <div className="text-center py-8 text-slate-450 dark:text-slate-500 text-xs font-semibold">
              No recent reports found.
            </div>
          ) : (
            <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-1">
              {historyList.map((item) => {
                const isActive = activeReview?.analysis_id === item.analysis_id;
                return (
                  <button
                    key={item.analysis_id}
                    onClick={() => handleLoadReport(item.analysis_id)}
                    className={`w-full text-left p-3 rounded-2xl border transition-all flex flex-col gap-1.5 cursor-pointer ${
                      isActive
                        ? "border-violet-500/50 bg-violet-500/5 dark:bg-violet-950/10 shadow-sm"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2 w-full">
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate max-w-[130px]">
                        {item.project_name || item.project_id}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                        item.overall_score >= 90 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                        item.overall_score >= 80 ? "bg-indigo-500/10 text-indigo-650 dark:text-indigo-400" :
                        item.overall_score >= 70 ? "bg-amber-500/10 text-amber-600 dark:text-amber-450" :
                        "bg-rose-500/10 text-rose-650 dark:text-rose-450"
                      }`}>
                        {item.overall_score}/100
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 dark:text-slate-500 font-semibold w-full">
                      <span>{formatAnalyzedAt(item.created_at)}</span>
                      <span className="capitalize">{item.status.replace("_", " ")}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
