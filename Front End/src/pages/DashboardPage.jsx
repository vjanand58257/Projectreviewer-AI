import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { getReport, getReportsList } from "../services/api";
import { agentsData } from "../data/dummyData";
import { useReview } from "../context/ReviewContext";
import ScoreCard from "../components/ScoreCard";
import Button from "../components/Button";
import { 
  Search, Bell, Settings as SettingsIcon, Award, Cpu, Shield, 
  Sparkles, CheckCircle, FileText, TrendingUp, AlertTriangle, 
  HelpCircle, MessageSquare, Plus, Star, X, Info, HelpCircle as HelpIcon,
  ChevronRight, Calendar, GitCompare, ChevronDown
} from "lucide-react";

export default function DashboardPage() {
  const [filter, setFilter] = useState("all");
  const { activeReview, agentResults, loadReview } = useReview();
  const [historyList, setHistoryList] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Extra UI State
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Simulated Favorite/Pin state
  const [pinnedReports, setPinnedReports] = useState([]);
  const [favoriteProjects, setFavoriteProjects] = useState([]);

  // AI Assistant Chat state
  const [chatMessages, setChatMessages] = useState([
    { role: "assistant", text: "Hello! I am your Swarm Co-Pilot. Ask me anything about this codebase audit." }
  ]);
  const [chatInput, setChatInput] = useState("");

  const commandInputRef = useRef(null);

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

  // Global Keyboard listener for Command Palette (Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (isCommandPaletteOpen && commandInputRef.current) {
      commandInputRef.current.focus();
    }
  }, [isCommandPaletteOpen]);

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

  const togglePin = (id) => {
    setPinnedReports((prev) => 
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const toggleFavorite = (name) => {
    setFavoriteProjects((prev) =>
      prev.includes(name) ? prev.filter((f) => f !== name) : [...prev, name]
    );
  };

  const handleChatSubmit = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userMsg = { role: "user", text: chatInput };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");

    // Simulate AI response based on the active review
    setTimeout(() => {
      let reply = "I'm analyzing the telemetry of your project. Let me know if you want detailed recommendations for security or architecture.";
      const score = activeReview?.overall_score ?? 0;
      if (chatInput.toLowerCase().includes("score") || chatInput.toLowerCase().includes("grade")) {
        reply = `The codebase has an overall score of ${score}/100. It is rated as '${score >= 90 ? "Excellent" : score >= 80 ? "Good" : "Needs work"}'.`;
      } else if (chatInput.toLowerCase().includes("bug") || chatInput.toLowerCase().includes("error")) {
        reply = "The Bug Finder agent reported that the async components lack error catch blocks. Let's wrap your api hooks in try-catch structures.";
      } else if (chatInput.toLowerCase().includes("security")) {
        reply = "Security is strong with 90% score, but upgrading minor dependency versions via npm audit fix is recommended.";
      }
      setChatMessages((prev) => [...prev, { role: "assistant", text: reply }]);
    }, 800);
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

  if (!activeReview) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-6 z-10 max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.05)]">
          <Cpu className="w-8 h-8 text-slate-400" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-space font-extrabold text-white">No Review Loaded</h2>
          <p className="text-sm font-mono text-slate-400">Please upload a zipped codebase project to initialize review.</p>
        </div>
        <Link to="/upload">
          <Button variant="primary">Go to Upload Terminal</Button>
        </Link>
      </div>
    );
  }

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
                         "Analysis completed successfully. Review detailed indicators below.";

  const displayMeta = {
    projectName: activeReview?.meta?.projectName || activeReview?.project_id || "Unknown Project",
    analyzedAt: activeReview?.created_at ? new Date(activeReview.created_at).toLocaleString() : "Just now",
    filesScanned: activeReview?.meta?.files_scanned ?? 12,
    loc: activeReview?.meta?.loc ?? 1840,
    language: activeReview?.meta?.language ?? "JavaScript/React"
  };

  const mergedAgents = agentsData.map((agent) => {
    const real = activeReview.results?.[agent.id];
    if (!real) return { ...agent, score: 0, bullets: ["Agent did not run or failed."] };
    
    const findingsList = (real.data?.findings || []).map((f) => 
      typeof f === "object" && f !== null ? f.description : f
    );
    
    const recsList = (real.data?.recommendations || []).map((r) => 
      typeof r === "object" && r !== null ? r.action : r
    );

    return {
      ...agent,
      score: real.score,
      errors: real.errors || [],
      bullets: [
        ...(real.data?.highlights || []).slice(0, 2),
        ...(findingsList.length > 0 ? [`Findings: ${findingsList[0]}`] : []),
        ...(recsList.length > 0 ? [`Recommendation: ${recsList[0]}`] : []),
      ].slice(0, 4),
    };
  });

  const filteredAgents = mergedAgents.filter((agent) => {
    if (filter === "high") return agent.score >= 85;
    if (filter === "low") return agent.score < 85;
    return true;
  });

  // Calculate 8 KPIs based on real agent scores
  const getKpiScore = (id) => {
    const agentMap = {
      architecture: "folder",
      security: "security",
      documentation: "documentation",
      innovation: "innovation",
      codeQuality: "bug",
      maintainability: "improvement",
      interviewReadiness: "interview",
      deploymentReadiness: "security" // derived fallback
    };
    const agentId = agentMap[id];
    const found = mergedAgents.find(a => a.id === agentId);
    return found ? found.score : 80;
  };

  const kpis = [
    { label: "Architecture", val: getKpiScore("architecture"), desc: "Module boundaries" },
    { label: "Security Checker", val: getKpiScore("security"), desc: "Leak & vuln scanner" },
    { label: "Documentation", val: getKpiScore("documentation"), desc: "Docstrings & spec" },
    { label: "Innovation Index", val: getKpiScore("innovation"), desc: "Modern optimizations" },
    { label: "Code Quality", val: getKpiScore("codeQuality"), desc: "Anomalies & faults" },
    { label: "Maintainability", val: getKpiScore("maintainability"), desc: "Technical debt score" },
    { label: "Interview Ready", val: getKpiScore("interviewReadiness"), desc: "Q&A score rating" },
    { label: "Deployment Ready", val: Math.round((getKpiScore("architecture") + getKpiScore("security")) / 2), desc: "Production sanity" }
  ];

  // Helper to plot Radar Chart coordinates in SVG (300x300 canvas)
  const getRadarPolygonPath = () => {
    const center = 150;
    const maxRadius = 100;
    const points = kpis.map((kpi, idx) => {
      const angle = (idx * (360 / kpis.length) * Math.PI) / 180;
      const valRatio = kpi.val / 100;
      const x = center + maxRadius * valRatio * Math.cos(angle);
      const y = center + maxRadius * valRatio * Math.sin(angle);
      return `${x},${y}`;
    });
    return points.join(" ");
  };

  // Commands for the command palette
  const allCommands = [
    { name: "Upload Codebase Project", desc: "Go to upload terminal screen", action: () => navigate("/upload") },
    { name: "Toggle Settings Configuration", desc: "Open drawer for AI temperature adjustments", action: () => setIsSettingsDrawerOpen(true) },
    { name: "Toggle Theme View", desc: "Change appearance setting", action: () => alert("Theme modified") },
    { name: "Simulate Comparison audit", desc: "Open details side by side modal", action: () => setIsCompareOpen(true) },
    { name: "Review Documentation Docs", desc: "Open developer setup instructions", action: () => window.open("#", "_blank") }
  ];

  const filteredCommands = allCommands.filter(
    (cmd) => cmd.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
             cmd.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full flex flex-col space-y-8 z-10 relative">
      
      {/* Top Header Toolbars */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <span className="text-[10px] font-mono text-[#00e5ff] uppercase font-bold tracking-widest">Swarm Swarm telemetry</span>
          <h2 className="text-3xl font-space font-extrabold text-white mt-1">
            Evaluation Dashboard
          </h2>
          <p className="text-xs font-mono text-slate-400 mt-1">
            Auditing codebase: <span className="text-white font-bold">{displayMeta.projectName}</span>
          </p>
        </div>

        {/* Action Widgets */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Favorites Star */}
          <button 
            onClick={() => toggleFavorite(displayMeta.projectName)}
            className={`p-2.5 rounded-xl border transition-all ${
              favoriteProjects.includes(displayMeta.projectName) 
                ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
            }`}
          >
            <Star className="w-4 h-4" />
          </button>

          {/* Pin Report */}
          <button 
            onClick={() => togglePin(activeReview.project_id)}
            className={`px-3 py-2 rounded-xl border font-mono text-xs font-bold tracking-wider transition-all uppercase ${
              pinnedReports.includes(activeReview.project_id)
                ? "bg-[#00e5ff]/10 border-[#00e5ff]/30 text-[#00e5ff]"
                : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
            }`}
          >
            {pinnedReports.includes(activeReview.project_id) ? "Pinned" : "Pin Report"}
          </button>

          {/* Search Button (Ctrl + K trigger) */}
          <button 
            onClick={() => setIsCommandPaletteOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:text-white text-xs font-mono"
          >
            <Search className="w-4 h-4 text-[#00e5ff]" />
            <span>Search</span>
            <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[9px]">Ctrl+K</kbd>
          </button>

          {/* Notification bell */}
          <div className="relative">
            <button 
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="p-2.5 rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-rose-500" />
            </button>
            
            {/* Notification popup drop */}
            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl glass-panel border-white/10 p-3 space-y-2 z-50 shadow-xl">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Alerts Center</span>
                  <button onClick={() => setIsNotificationsOpen(false)} className="text-slate-500 hover:text-white"><X className="w-3.5 h-3.5" /></button>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  <div className="p-2 rounded-lg bg-rose-500/5 border border-rose-500/10 text-[10px] text-rose-400 leading-normal font-mono">
                    Bug Agent: 2 async calls missing catch closures.
                  </div>
                  <div className="p-2 rounded-lg bg-amber-500/5 border border-amber-500/10 text-[10px] text-amber-400 leading-normal font-mono">
                    Security: Minor npm vulnerabilities discovered.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Settings button */}
          <button 
            onClick={() => setIsSettingsDrawerOpen(true)}
            className="p-2.5 rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left column sidebar: History / Shortcuts */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* History Swarm Reports */}
          <div className="glass-panel p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="font-space font-bold text-xs text-white uppercase tracking-widest">
                Recent Swarms
              </h3>
              <Calendar className="w-4 h-4 text-[#a855f7]" />
            </div>

            {isLoadingHistory ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#00e5ff]"></div>
              </div>
            ) : historyList.length === 0 ? (
              <div className="text-center py-4 text-slate-500 font-mono text-[10px]">
                No historical reports.
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
                {historyList.map((item) => {
                  const isActive = activeReview?.analysis_id === item.analysis_id;
                  return (
                    <button
                      key={item.analysis_id}
                      onClick={() => handleLoadReport(item.analysis_id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex flex-col gap-1 cursor-pointer ${
                        isActive
                          ? "border-[#00e5ff]/40 bg-[#00e5ff]/5"
                          : "border-white/5 bg-white/[0.01] hover:border-white/10 hover:bg-white/[0.02]"
                      }`}
                    >
                      <div className="flex justify-between items-center w-full gap-2">
                        <span className="font-bold text-white text-[11px] truncate max-w-[100px]">
                          {item.project_name || item.project_id}
                        </span>
                        <span className="px-1.5 py-0.5 rounded-lg border border-[#00e5ff]/20 bg-[#00e5ff]/10 text-[9px] font-mono text-[#00e5ff] font-bold shrink-0">
                          {item.overall_score}%
                        </span>
                      </div>
                      <div className="flex justify-between text-[9px] text-slate-500 font-mono w-full">
                        <span>{formatAnalyzedAt(item.created_at)}</span>
                        <span className="capitalize">{item.status.replace("_", " ")}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Keyboard Shortcuts cheat sheet */}
          <div className="glass-panel p-4 space-y-3 font-mono text-[10px] text-slate-400">
            <h4 className="font-space font-bold text-white uppercase tracking-widest text-[9px] border-b border-white/5 pb-2">
              Keyboard Shortcuts
            </h4>
            <div className="flex justify-between">
              <span>Search menu</span>
              <kbd className="bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-white text-[9px]">Ctrl+K</kbd>
            </div>
            <div className="flex justify-between">
              <span>Settings Drawer</span>
              <kbd className="bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-white text-[9px]">S</kbd>
            </div>
            <div className="flex justify-between">
              <span>Toggle Side comparison</span>
              <kbd className="bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-white text-[9px]">C</kbd>
            </div>
          </div>

          {/* Project Comparison Drawer Shortcut */}
          <div className="glass-panel p-4 space-y-3 text-center">
            <h4 className="font-space font-bold text-xs text-white">Compare Audits</h4>
            <p className="text-[10px] text-slate-450 leading-relaxed font-mono">
              Evaluate current findings side-by-side with previous runs.
            </p>
            <Button variant="outline" size="sm" onClick={() => setIsCompareOpen(true)} className="w-full">
              <GitCompare className="w-3.5 h-3.5 mr-2" />
              Compare Reports
            </Button>
          </div>

        </div>

        {/* Middle/Right: Main Content Dashboard */}
        <div className="lg:col-span-9 space-y-8">
          
          {/* Row 1: circular gauge + KPI Cards grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* Circular score gauge */}
            <div className="lg:col-span-4 glass-panel p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-24 h-24 bg-[#00e5ff]/5 blur-[35px] pointer-events-none" />

              {/* Concentric rings score display */}
              <div className="relative w-40 h-40 flex items-center justify-center drop-shadow-[0_0_15px_rgba(0,229,255,0.06)] hover:scale-102 transition-transform duration-500 cursor-pointer">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {/* Outer circle */}
                  <circle
                    className="text-white/5"
                    strokeWidth="7"
                    stroke="currentColor"
                    fill="transparent"
                    r="40"
                    cx="50"
                    cy="50"
                  />
                  <circle
                    className="text-[#00e5ff] transition-all duration-1000 ease-out"
                    strokeWidth="7"
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

                {/* Score text */}
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-4xl font-black text-white font-space">
                    {displayScore}
                  </span>
                  <span className="text-slate-500 font-mono text-[9px] uppercase tracking-widest mt-0.5">
                    / 100
                  </span>
                </div>
              </div>

              {/* Quality grade label */}
              <div className="space-y-1.5 mt-5">
                <span className="px-3 py-1.5 rounded-lg border border-[#00e5ff]/35 bg-[#00e5ff]/5 text-[10px] font-mono font-bold text-[#00e5ff] uppercase tracking-wider">
                  Grade: {displayGrade}
                </span>
                <h3 className="text-base font-space font-extrabold text-white mt-3">
                  Overall Health Rating
                </h3>
                <p className="text-[10px] text-slate-500 font-mono">
                  Checked on {formatAnalyzedAt(activeReview.created_at)}
                </p>
              </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {kpis.map((kpi, idx) => (
                <div key={idx} className="glass-panel p-4 space-y-3 flex flex-col justify-between border-white/5 hover:border-[#00e5ff]/20 transition-all duration-300">
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block truncate">{kpi.label}</span>
                    <span className="text-xl font-space font-black text-white">{kpi.val}%</span>
                  </div>

                  {/* Tiny progress indicator bar */}
                  <div className="space-y-1">
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-[#0066ff] to-[#00e5ff] rounded-full"
                        style={{ width: `${kpi.val}%` }}
                      />
                    </div>
                    <span className="text-[8px] font-mono text-slate-500 block truncate">{kpi.desc}</span>
                  </div>
                </div>
              ))}
            </div>

          </div>

          {/* Row 2: Swarm Analytics (Charts) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left: Custom SVG Radar Chart */}
            <div className="lg:col-span-6 glass-panel p-6 space-y-4">
              <h3 className="font-space font-bold text-xs text-slate-400 uppercase tracking-widest border-b border-white/5 pb-2.5">
                Swarm Vector signature (Radar Chart)
              </h3>
              
              <div className="flex items-center justify-center h-[260px] relative">
                <svg className="w-full max-w-[280px] h-full" viewBox="0 0 300 300">
                  {/* Concentric octagons (Grid helper lines) */}
                  {[25, 50, 75, 100].map((radius, rIdx) => {
                    const points = kpis.map((k, idx) => {
                      const angle = (idx * (360 / kpis.length) * Math.PI) / 180;
                      const x = 150 + radius * Math.cos(angle);
                      const y = 150 + radius * Math.sin(angle);
                      return `${x},${y}`;
                    }).join(" ");
                    return (
                      <polygon
                        key={rIdx}
                        points={points}
                        fill="transparent"
                        stroke="rgba(255,255,255,0.03)"
                        strokeWidth="1"
                      />
                    );
                  })}

                  {/* Axes lines */}
                  {kpis.map((kpi, idx) => {
                    const angle = (idx * (360 / kpis.length) * Math.PI) / 180;
                    const endX = 150 + 100 * Math.cos(angle);
                    const endY = 150 + 100 * Math.sin(angle);
                    return (
                      <line
                        key={idx}
                        x1="150"
                        y1="150"
                        x2={endX}
                        y2={endY}
                        stroke="rgba(255,255,255,0.04)"
                        strokeWidth="1"
                      />
                    );
                  })}

                  {/* Radar Polygon data */}
                  <polygon
                    points={getRadarPolygonPath()}
                    fill="rgba(0, 229, 255, 0.08)"
                    stroke="#00e5ff"
                    strokeWidth="1.5"
                    className="animate-pulse"
                  />

                  {/* Plot indicators */}
                  {kpis.map((kpi, idx) => {
                    const angle = (idx * (360 / kpis.length) * Math.PI) / 180;
                    const valRatio = kpi.val / 100;
                    const x = 150 + 100 * valRatio * Math.cos(angle);
                    const y = 150 + 100 * valRatio * Math.sin(angle);
                    return (
                      <circle
                        key={idx}
                        cx={x}
                        cy={y}
                        r="3.5"
                        fill="#a855f7"
                        stroke="#00e5ff"
                        strokeWidth="1"
                      />
                    );
                  })}

                  {/* Outer Labels */}
                  {kpis.map((kpi, idx) => {
                    const angle = (idx * (360 / kpis.length) * Math.PI) / 180;
                    const labelRadius = 118;
                    const x = 150 + labelRadius * Math.cos(angle);
                    const y = 150 + labelRadius * Math.sin(angle);
                    const textAnchor = Math.cos(angle) > 0.1 ? "start" : Math.cos(angle) < -0.1 ? "end" : "middle";
                    return (
                      <text
                        key={idx}
                        x={x}
                        y={y + 3}
                        fill="rgba(255,255,255,0.4)"
                        fontSize="7.5"
                        fontFamily="monospace"
                        textAnchor={textAnchor}
                      >
                        {kpi.label}
                      </text>
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* Right: Custom Execution Timeline Chart */}
            <div className="lg:col-span-6 glass-panel p-6 space-y-4">
              <h3 className="font-space font-bold text-xs text-slate-400 uppercase tracking-widest border-b border-white/5 pb-2.5">
                Swarm Parallel Execution Times
              </h3>

              <div className="space-y-4 pt-1">
                {[
                  { name: "Folder Analyzer", time: 0.8, color: "#0066ff" },
                  { name: "Documentation Reviewer", time: 1.4, color: "#00e5ff" },
                  { name: "Innovation Scorer", time: 2.1, color: "#a855f7" },
                  { name: "Bug Finder", time: 3.2, color: "#f43f5e" },
                  { name: "Security Checker", time: 1.9, color: "#10b981" },
                  { name: "Presentation Reviewer", time: 2.5, color: "#00e5ff" }
                ].map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between font-mono text-[9px] text-slate-400">
                      <span>{item.name}</span>
                      <span className="text-white font-bold">{item.time} seconds</span>
                    </div>
                    {/* Simulated bar chart */}
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-1000"
                        style={{ 
                          width: `${(item.time / 4.1) * 100}%`,
                          backgroundColor: item.color
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Row 3: AI Executive Summary Report */}
          <div className="glass-panel p-6 sm:p-8 space-y-6 border-white/10 relative overflow-hidden bg-white/[0.01]">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#a855f7]/5 blur-[35px] pointer-events-none" />

            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div>
                <h3 className="font-space font-extrabold text-lg text-white">
                  AI Executive Audit Report
                </h3>
                <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                  Consolidated Swarm Insights & Roadmap Analysis
                </p>
              </div>
              <Award className="w-6 h-6 text-[#00e5ff]" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-sans text-xs leading-relaxed text-slate-300">
              {/* Left Column summary */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <h4 className="font-mono text-[10px] font-bold text-[#00e5ff] uppercase tracking-wider">Executive Overview</h4>
                  <p className="leading-relaxed">
                    {displaySummary}
                  </p>
                </div>
                <div className="space-y-1">
                  <h4 className="font-mono text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Primary Core Strengths</h4>
                  <ul className="list-disc pl-4 space-y-1 text-slate-400">
                    <li>Modularity of directory boundaries is highly standard.</li>
                    <li>Innovative framework integrations scoring {getKpiScore("innovation")}% quality.</li>
                  </ul>
                </div>
              </div>

              {/* Right Column recommendations */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <h4 className="font-mono text-[10px] font-bold text-rose-400 uppercase tracking-wider">Core Refactoring Risks</h4>
                  <ul className="list-disc pl-4 space-y-1 text-slate-400">
                    <li>Asynchronous request flows missing catch clauses in helpers.</li>
                    <li>Documentation gaps in complicated utility controllers.</li>
                  </ul>
                </div>
                <div className="space-y-1">
                  <h4 className="font-mono text-[10px] font-bold text-[#a855f7] uppercase tracking-wider">Targeted Business Value</h4>
                  <p className="text-slate-400 leading-normal">
                    Onboarding velocity is forecasted to improve by up to 24% after documentation improvements are merged and linter pipelines configured.
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom audit metadata block */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-white/5 font-mono text-[9px] text-slate-500">
              <div className="space-y-0.5">
                <span>Codebase Language</span>
                <span className="block text-white font-bold">{displayMeta.language}</span>
              </div>
              <div className="space-y-0.5">
                <span>Files Evaluated</span>
                <span className="block text-white font-bold">{displayMeta.filesScanned} files</span>
              </div>
              <div className="space-y-0.5">
                <span>Lines of Code</span>
                <span className="block text-white font-bold">{displayMeta.loc.toLocaleString()} LOC</span>
              </div>
              <div className="space-y-0.5">
                <span>Swarm Engine</span>
                <span className="block text-white font-bold">v1.2.0 (Gemini swarm)</span>
              </div>
            </div>
          </div>

          {/* Row 4: Specialized Agent Panels */}
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div>
                <h3 className="font-space font-bold text-base text-white">
                  Swarm Agent Panel Reviews ({filteredAgents.length})
                </h3>
                <p className="text-[10px] font-mono text-slate-500">
                  Inspect findings and action recommendations from each auditor.
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 font-mono text-[10px]">
                <button
                  onClick={() => setFilter("all")}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    filter === "all" ? "bg-[#00e5ff]/15 text-[#00e5ff]" : "text-slate-400 hover:text-white"
                  }`}
                >
                  All Agents
                </button>
                <button
                  onClick={() => setFilter("high")}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    filter === "high" ? "bg-[#00e5ff]/15 text-[#00e5ff]" : "text-slate-400 hover:text-white"
                  }`}
                >
                  High (&ge;85)
                </button>
                <button
                  onClick={() => setFilter("low")}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    filter === "low" ? "bg-[#00e5ff]/15 text-[#00e5ff]" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Improve (&lt;85)
                </button>
              </div>
            </div>

            {/* ScoreCards */}
            {filteredAgents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAgents.map((agent) => (
                  <ScoreCard key={agent.id} agent={agent} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
                <p className="text-slate-500 font-mono text-xs">
                  No agents matched selection filter.
                </p>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* COMMAND PALETTE MODAL (Ctrl + K) */}
      {isCommandPaletteOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-2xl glass-panel border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-white/5 flex items-center gap-3">
              <Search className="w-5 h-5 text-[#00e5ff]" />
              <input
                ref={commandInputRef}
                type="text"
                placeholder="Type a command or query..."
                className="w-full bg-transparent border-none text-white focus:outline-none focus:ring-0 font-mono text-sm placeholder-slate-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button 
                onClick={() => setIsCommandPaletteOpen(false)}
                className="p-1 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 max-h-72 overflow-y-auto space-y-1">
              {filteredCommands.length > 0 ? (
                filteredCommands.map((cmd, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      cmd.action();
                      setIsCommandPaletteOpen(false);
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-white/5 flex flex-col font-mono cursor-pointer"
                  >
                    <span className="text-xs text-white font-bold">{cmd.name}</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">{cmd.desc}</span>
                  </button>
                ))
              ) : (
                <div className="text-center py-6 text-slate-500 font-mono text-xs">
                  No matching commands found.
                </div>
              )}
            </div>
            <div className="p-3 bg-white/[0.02] border-t border-white/5 flex justify-between font-mono text-[9px] text-slate-500">
              <span>Use arrows to navigate</span>
              <span>ESC to close</span>
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS DRAWER (Right aligned) */}
      {isSettingsDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setIsSettingsDrawerOpen(false)} />
          <div className="w-full max-w-sm rounded-l-2xl glass-panel border-l border-white/10 shadow-2xl relative z-10 flex flex-col h-full bg-[#020205] p-6 justify-between">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <h3 className="font-space font-extrabold text-sm text-white uppercase tracking-wider">
                  Swarm Configurations
                </h3>
                <button onClick={() => setIsSettingsDrawerOpen(false)} className="p-1 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Models selection */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono font-bold text-slate-450 uppercase tracking-widest">AI Engine Model</label>
                <div className="relative">
                  <select className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-[#00e5ff]/50 appearance-none cursor-pointer">
                    <option value="flash" className="bg-[#020205]">Gemini 2.5 Flash (Swarm Default)</option>
                    <option value="pro" className="bg-[#020205]">Gemini 3.5 Pro (Precision review)</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Temperature slider */}
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-mono font-bold text-slate-450 uppercase tracking-widest">
                  <span>Temperature</span>
                  <span className="text-[#00e5ff]">0.15</span>
                </div>
                <input type="range" min="0" max="1" step="0.05" defaultValue="0.15" className="w-full accent-[#00e5ff] cursor-pointer" />
                <span className="text-[8px] font-mono text-slate-500 block leading-tight">Lower temperature forces strict deterministic responses.</span>
              </div>

              {/* Parallelism switches */}
              <div className="space-y-3 pt-2">
                <label className="text-[10px] font-mono font-bold text-slate-450 uppercase tracking-widest">Swarm behavior</label>
                <div className="flex items-center justify-between py-2 border-y border-white/5 text-xs font-mono">
                  <span className="text-slate-300">Parallel Agent execution</span>
                  <div className="w-8 h-4 bg-[#00e5ff]/20 rounded-full p-0.5 flex items-center justify-end border border-[#00e5ff]/40 cursor-pointer">
                    <div className="w-3 h-3 bg-[#00e5ff] rounded-full" />
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-300">Self-correction loop</span>
                  <div className="w-8 h-4 bg-white/10 rounded-full p-0.5 flex items-center justify-start border border-white/20 cursor-pointer">
                    <div className="w-3 h-3 bg-slate-400 rounded-full" />
                  </div>
                </div>
              </div>
            </div>

            <Button variant="primary" onClick={() => setIsSettingsDrawerOpen(false)} className="w-full">
              Apply Settings
            </Button>
          </div>
        </div>
      )}

      {/* SIMULATED SIDE COMPONENT: AUDIT COMPARE MODAL */}
      {isCompareOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-2xl glass-panel border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col h-[550px] bg-[#020205]">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitCompare className="w-5 h-5 text-[#00e5ff]" />
                <h3 className="font-space font-extrabold text-sm text-white uppercase tracking-wider">
                  Audit Comparison Matrix
                </h3>
              </div>
              <button onClick={() => setIsCompareOpen(false)} className="p-1 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 p-6 overflow-y-auto grid grid-cols-2 gap-6 font-mono text-[10px] text-slate-400">
              {/* Left Column: current */}
              <div className="space-y-4 border-r border-white/5 pr-6">
                <span className="px-2 py-0.5 rounded bg-[#00e5ff]/10 text-[#00e5ff] font-bold text-[9px]">Current Run (active)</span>
                <div className="space-y-2 mt-2">
                  <div className="flex justify-between"><span>Audit ID:</span><span className="text-white">{activeReview.project_id}</span></div>
                  <div className="flex justify-between"><span>Overall Score:</span><span className="text-white font-bold">{displayScore}%</span></div>
                  <div className="flex justify-between"><span>Files Analyzed:</span><span className="text-white">{displayMeta.filesScanned}</span></div>
                </div>
                <div className="pt-2 space-y-1.5">
                  <span className="text-slate-500 uppercase tracking-widest block text-[8px] font-bold">Recommendations:</span>
                  <p className="leading-relaxed">Async catch block additions in fetch utilities; upgrade minor css tools.</p>
                </div>
              </div>

              {/* Right Column: baseline */}
              <div className="space-y-4">
                <span className="px-2 py-0.5 rounded bg-white/5 text-slate-400 font-bold text-[9px]">Baseline Run (initial)</span>
                <div className="space-y-2 mt-2">
                  <div className="flex justify-between"><span>Audit ID:</span><span className="text-slate-500">baseline_01</span></div>
                  <div className="flex justify-between"><span>Overall Score:</span><span className="text-slate-300">76%</span></div>
                  <div className="flex justify-between"><span>Files Analyzed:</span><span className="text-slate-300">12</span></div>
                </div>
                <div className="pt-2 space-y-1.5">
                  <span className="text-slate-500 uppercase tracking-widest block text-[8px] font-bold">Recommendations:</span>
                  <p className="leading-relaxed">Add README.md setup documentation; decouple circular pages router imports.</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-white/[0.02] border-t border-white/5 flex justify-end gap-3">
              <Button variant="secondary" size="sm" onClick={() => setIsCompareOpen(false)}>Close</Button>
              <Button variant="primary" size="sm" onClick={() => {
                alert("Baseline sync locked.");
                setIsCompareOpen(false);
              }}>Lock Baseline</Button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING AI ASSISTANT CHATBOX */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {isAiAssistantOpen && (
          <div className="w-80 h-[380px] rounded-2xl glass-panel border-white/10 bg-[#020205]/95 shadow-2xl mb-3 flex flex-col overflow-hidden">
            {/* Assistant Header */}
            <div className="p-3 bg-white/5 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#00e5ff] animate-pulse" />
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">Swarm Co-Pilot</span>
              </div>
              <button onClick={() => setIsAiAssistantOpen(false)} className="text-slate-500 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Message lists */}
            <div className="flex-1 p-3 overflow-y-auto space-y-2.5 font-mono text-[10px]">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`p-2.5 rounded-lg max-w-[85%] ${
                  msg.role === "user" 
                    ? "bg-[#00e5ff]/10 text-white ml-auto border border-[#00e5ff]/20" 
                    : "bg-white/5 text-slate-300 mr-auto border border-white/5"
                }`}>
                  <p className="leading-relaxed">{msg.text}</p>
                </div>
              ))}
            </div>

            {/* Input form */}
            <form onSubmit={handleChatSubmit} className="p-2.5 border-t border-white/5 flex gap-1.5 bg-black/40">
              <input
                type="text"
                placeholder="Ask about security, score, findings..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] font-mono text-white focus:outline-none focus:ring-1 focus:ring-[#00e5ff]/50 placeholder-slate-500"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
              />
              <button type="submit" className="px-3 rounded-lg bg-gradient-to-r from-[#0066ff] to-[#00e5ff] text-white font-bold text-[10px] hover:opacity-90 cursor-pointer">
                Send
              </button>
            </form>
          </div>
        )}

        {/* Floating Toggle button */}
        <button
          onClick={() => setIsAiAssistantOpen(!isAiAssistantOpen)}
          className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#0066ff] via-[#00e5ff] to-[#a855f7] flex items-center justify-center text-white shadow-[0_4px_20px_rgba(0,229,255,0.35)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
          aria-label="Toggle AI assistant chat"
        >
          <MessageSquare className="w-5 h-5" />
        </button>
      </div>

    </div>
  );
}
