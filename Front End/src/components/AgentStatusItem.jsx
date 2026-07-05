import React from "react";
import { AgentIcon, ClockIcon, CheckIcon } from "./Icons";

export default function AgentStatusItem({ agent }) {
  const { name, fullName, description, status, score, color } = agent;

  const statusStyles = {
    pending: {
      border: "border-slate-800 dark:border-slate-800/80 light:border-slate-200",
      bg: "bg-slate-900/40 dark:bg-slate-900/40 light:bg-slate-50",
      text: "text-slate-500",
      badge: "bg-slate-800 text-slate-400 dark:bg-slate-850 dark:text-slate-400 light:bg-slate-200 light:text-slate-600",
      label: "Pending"
    },
    in_progress: {
      border: "border-indigo-500/40 animate-pulse shadow-md shadow-indigo-500/5",
      bg: "bg-indigo-950/10 dark:bg-indigo-950/10 light:bg-indigo-50/50",
      text: "text-indigo-400",
      badge: "bg-indigo-500/10 text-indigo-400 animate-pulse border border-indigo-500/20",
      label: "Evaluating"
    },
    done: {
      border: "border-emerald-500/30 hover:border-emerald-500/50",
      bg: "bg-emerald-950/5 dark:bg-emerald-950/5 light:bg-emerald-50/30",
      text: "text-emerald-400",
      badge: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
      label: "Complete"
    },
    error: {
      border: "border-rose-500/40",
      bg: "bg-rose-950/10 dark:bg-rose-950/10 light:bg-rose-50/30",
      text: "text-rose-400",
      badge: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
      label: "Failed"
    }
  };

  const currentStyle = statusStyles[status] || statusStyles.pending;

  // Badge/color mapping for the icon container
  const colorClasses = {
    indigo: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    violet: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    rose: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    cyan: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    orange: "text-orange-400 bg-orange-500/10 border-orange-500/20"
  };

  const textColorClasses = {
    indigo: "text-indigo-600 dark:text-indigo-400",
    blue: "text-blue-600 dark:text-blue-400",
    violet: "text-violet-600 dark:text-violet-400",
    rose: "text-rose-600 dark:text-rose-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
    cyan: "text-cyan-600 dark:text-cyan-450 dark:text-cyan-400",
    amber: "text-amber-600 dark:text-amber-400",
    orange: "text-orange-600 dark:text-orange-400"
  };

  const iconClass = colorClasses[color] || "text-slate-400 bg-slate-500/10 border-slate-500/20";

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl border ${currentStyle.border} ${currentStyle.bg} transition-all duration-300 gap-4`}
    >
      <div className="flex items-start gap-4">
        {/* Agent Icon */}
        <div className={`p-3 rounded-xl border ${iconClass} shrink-0 mt-0.5`}>
          <AgentIcon name={agent.icon} className="w-6 h-6" />
        </div>

        {/* Text Details */}
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-bold text-slate-100 dark:text-slate-100 light:text-slate-800 text-base">
              {fullName || name}
            </h4>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${currentStyle.badge}`}>
              {currentStyle.label}
            </span>
          </div>
          <p className="text-sm text-slate-400 dark:text-slate-400 light:text-slate-500 mt-1 max-w-xl">
            {description}
          </p>
        </div>
      </div>

      {/* Status indicator / Score */}
      <div className="flex items-center justify-end sm:justify-start gap-3 shrink-0 self-end sm:self-center">
        {status === "pending" && (
          <div className="flex items-center gap-1.5 text-slate-500 font-medium text-sm">
            <ClockIcon className="w-5 h-5 animate-pulse" />
            <span>Idle</span>
          </div>
        )}

        {status === "in_progress" && (
          <div className="flex items-center gap-2 text-indigo-400 font-medium text-sm">
            {/* Custom Spinner */}
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Analyzing...</span>
          </div>
        )}

        {status === "done" && (
          <div className="flex items-center gap-3">
            {score != null && (
              <div className="flex flex-col items-end">
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Score</span>
                <span className={`text-lg font-bold ${textColorClasses[color] || 'text-slate-400'}`}>{score}%</span>
              </div>
            )}
            <div className="p-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <CheckIcon className="w-4 h-4" />
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="flex items-center gap-2 text-rose-400 font-medium text-sm">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <span>Failed</span>
          </div>
        )}
      </div>
    </div>
  );
}
