import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { agentsData, overallEvaluation } from "../data/dummyData";
import { useReview } from "../context/ReviewContext";
import ScoreCard from "../components/ScoreCard";
import Button from "../components/Button";

export default function DashboardPage() {
  const [filter, setFilter] = useState("all");
  const { activeReview, agentResults, loadReview } = useReview();
  const [historyList, setHistoryList] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Fetch reports list for the history panel
  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await axios.get("http://localhost:5000/api/reports?limit=10");
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
      const res = await axios.get(`http://localhost:5000/api/reports/${analysisId}`);
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

  // Derive overall metrics dynamically
  const displayScore = activeReview ? activeReview.overall_score : overallEvaluation.score;
  
  const getGrade = (score) => {
    if (score >= 90) return "Excellent";
    if (score >= 80) return "Good";
    if (score >= 70) return "Average";
    return "Needs Work";
  };
  const displayGrade = activeReview ? getGrade(displayScore) : overallEvaluation.grade;

  const displaySummary = activeReview?.results?.improvement?.data?.highlights?.[0] || 
                         activeReview?.results?.improvement?.data?.findings?.[0]?.description ||
                         overallEvaluation.summary;

  const displayMeta = {
    projectName: activeReview?.meta?.project_name || activeReview?.project_id || overallEvaluation.meta.projectName,
    analyzedAt: activeReview?.created_at ? new Date(activeReview.created_at).toLocaleString() : overallEvaluation.meta.analyzedAt,
    filesScanned: activeReview?.meta?.files_scanned ?? overallEvaluation.meta.filesScanned,
    loc: activeReview?.meta?.loc ?? overallEvaluation.meta.loc,
    language: activeReview?.meta?.language ?? overallEvaluation.meta.language
  };

  // Merge real API results over dummy data for agents that have run
  const mergedAgents = agentsData.map((agent) => {
    const real = agentResults[agent.id];
    if (!real) return agent;
    
    // Safely extract text from findings (which can be objects or strings)
    const findingsList = (real.data.findings || []).map((f) => 
      typeof f === "object" && f !== null ? f.description : f
    );
    
    // Safely extract text from recommendations
    const recsList = (real.data.recommendations || []).map((r) => 
      typeof r === "object" && r !== null ? r.action : r
    );

    return {
      ...agent,
      score: real.score,
      errors: real.errors || [],
      bullets: [
        ...(real.data.highlights || []).slice(0, 3),
        ...(findingsList.length > 0
          ? [`Findings: ${findingsList.slice(0, 2).join(" | ")}`]
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
            <div className="flex flex-col sm:flex-row items-center gap-6 lg:border-r lg:border-slate-200 dark:lg:border-slate-800 lg:pr-8">
              {/* Circular Progress Gauge */}
              <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-95" viewBox="0 0 100 100">
                  {/* Background Ring */}
                  <circle
                    className="text-slate-100 dark:text-slate-850"
                    strokeWidth="8"
                    stroke="currentColor"
                    fill="transparent"
                    r="40"
                    cx="50"
                    cy="50"
                  />
                  {/* Foreground Progress */}
                  <circle
                    className="text-violet-650 dark:text-violet-500 transition-all duration-1000 ease-out"
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
                <div className="absolute text-center">
                  <span className="text-4xl font-black text-slate-850 dark:text-white">
                    {displayScore}
                  </span>
                  <span className="text-slate-400 dark:text-slate-500 font-bold text-sm block -mt-1">
                    / 100
                  </span>
                </div>
              </div>

              {/* Score Meta details */}
              <div className="text-center sm:text-left space-y-1">
                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${getScoreColor(displayScore)}`}>
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
