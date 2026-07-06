import React from "react";
import { AgentIcon, ClockIcon, CheckIcon } from "./Icons";

export default function AgentStatusItem({ agent }) {
  const { name, fullName, description, status, score, color } = agent;

  const statusStyles = {
    pending: {
      border: "border-white/5",
      bg: "bg-white/[0.01]",
      text: "text-slate-500 font-mono",
      badge: "bg-white/5 text-slate-400 border border-white/5",
      label: "Idle"
    },
    in_progress: {
      border: "border-[#00e5ff]/30 shadow-[0_0_15px_rgba(0,229,255,0.05)]",
      bg: "bg-[#00e5ff]/5 animate-pulse",
      text: "text-[#00e5ff] font-mono",
      badge: "bg-[#00e5ff]/10 text-[#00e5ff] border border-[#00e5ff]/30 animate-pulse",
      label: "Evaluating"
    },
    done: {
      border: "border-emerald-500/20",
      bg: "bg-emerald-500/[0.02]",
      text: "text-emerald-400 font-mono",
      badge: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
      label: "Complete"
    },
    error: {
      border: "border-rose-500/20",
      bg: "bg-rose-500/[0.02]",
      text: "text-rose-400",
      badge: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
      label: "Failed"
    }
  };

  const currentStyle = statusStyles[status] || statusStyles.pending;

  const colorClasses = {
    indigo: "text-[#0066ff] bg-[#0066ff]/10 border-[#0066ff]/20",
    blue: "text-[#00e5ff] bg-[#00e5ff]/10 border-[#00e5ff]/20",
    violet: "text-[#a855f7] bg-[#a855f7]/10 border-[#a855f7]/20",
    rose: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    cyan: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    orange: "text-orange-400 bg-orange-500/10 border-orange-500/20"
  };

  const iconClass = colorClasses[color] || "text-slate-500 bg-white/5 border-white/10";

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border ${currentStyle.border} ${currentStyle.bg} transition-all duration-300 gap-3`}
    >
      <div className="flex items-center gap-4">
        {/* Agent Icon */}
        <div className={`p-2.5 rounded-lg border ${iconClass} shrink-0`}>
          <AgentIcon name={agent.icon} className="w-5 h-5" />
        </div>

        {/* Text Details */}
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-space font-bold text-white text-sm leading-none">
              {fullName || name}
            </h4>
            <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${currentStyle.badge}`}>
              {currentStyle.label}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-sans mt-1 max-w-lg leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      {/* Status indicator / Score */}
      <div className="flex items-center justify-end sm:justify-start gap-3 shrink-0 self-end sm:self-center">
        {status === "pending" && (
          <div className="flex items-center gap-1.5 text-slate-500 font-mono text-xs">
            <ClockIcon className="w-4 h-4" />
            <span>Idle</span>
          </div>
        )}

        {status === "in_progress" && (
          <div className="flex items-center gap-1.5 text-[#00e5ff] font-mono text-xs font-bold">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Swarm check...</span>
          </div>
        )}

        {status === "done" && (
          <div className="flex items-center gap-3">
            {score != null && (
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-slate-500 font-mono font-bold uppercase">Score</span>
                <span className="text-xs font-mono font-bold text-white">{score}%</span>
              </div>
            )}
            <div className="p-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <CheckIcon className="w-3.5 h-3.5" />
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="flex items-center gap-1.5 text-rose-400 font-mono text-xs">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <span>Failed</span>
          </div>
        )}
      </div>
    </div>
  );
}
