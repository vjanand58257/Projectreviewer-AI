import React from "react";
import { AgentIcon } from "./Icons";

export default function ScoreCard({ agent }) {
  if (!agent) return null;

  const { name, fullName, score, bullets, icon, color, errors } = agent;

  // Tailwind border and shadow mapping for card hover states
  const borderClasses = {
    indigo: "hover:border-indigo-500/50 focus:border-indigo-500/50 shadow-indigo-500/5",
    blue: "hover:border-blue-500/50 focus:border-blue-500/50 shadow-blue-500/5",
    violet: "hover:border-violet-500/50 focus:border-violet-500/50 shadow-violet-500/5",
    rose: "hover:border-rose-500/50 focus:border-rose-500/50 shadow-rose-500/5",
    emerald: "hover:border-emerald-500/50 focus:border-emerald-500/50 shadow-emerald-500/5",
    cyan: "hover:border-cyan-500/50 focus:border-cyan-500/50 shadow-cyan-500/5",
    amber: "hover:border-amber-500/50 focus:border-amber-500/50 shadow-amber-500/5",
    orange: "hover:border-orange-500/50 focus:border-orange-500/50 shadow-orange-500/5"
  };

  // Text color mapping
  const textClasses = {
    indigo: "text-indigo-600 dark:text-indigo-400",
    blue: "text-blue-600 dark:text-blue-400",
    violet: "text-violet-600 dark:text-violet-400",
    rose: "text-rose-600 dark:text-rose-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
    cyan: "text-cyan-600 dark:text-cyan-400",
    amber: "text-amber-600 dark:text-amber-400",
    orange: "text-orange-600 dark:text-orange-400"
  };

  // Background and border indicators for the score pill
  const pillClasses = {
    indigo: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
    rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    cyan: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    orange: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20"
  };

  // Icon container mapping
  const iconClasses = {
    indigo: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/10",
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/10",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/10",
    rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/10",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/10",
    cyan: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/10",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/10",
    orange: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/10"
  };

  const getScoreGrade = (s) => {
    if (s >= 90) return "Excellent";
    if (s >= 80) return "Very Good";
    if (s >= 70) return "Good";
    return "Needs Attention";
  };

  return (
    <div
      className={`relative group bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-xl ${
        borderClasses[color] || "hover:border-slate-700 shadow-slate-900/5"
      }`}
    >
      {/* Dynamic top-edge subtle color bar */}
      <div
        className={`absolute top-0 left-0 right-0 h-1 rounded-t-2xl bg-gradient-to-r ${
          color === "indigo" ? "from-indigo-600 to-blue-500" :
          color === "blue" ? "from-blue-600 to-cyan-500" :
          color === "violet" ? "from-violet-600 to-fuchsia-500" :
          color === "rose" ? "from-rose-600 to-red-500" :
          color === "emerald" ? "from-emerald-600 to-teal-500" :
          color === "cyan" ? "from-cyan-600 to-blue-400" :
          color === "amber" ? "from-amber-500 to-orange-400" :
          "from-orange-600 to-amber-500"
        }`}
      />

      <div className="flex items-start justify-between gap-4 mt-1">
        {/* Title and Icon */}
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl border ${iconClasses[color] || "bg-slate-800 text-slate-400"}`}>
            <AgentIcon name={icon} className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base leading-tight">
              {name}
            </h3>
            <span className="text-xs text-slate-400 dark:text-slate-500 block">
              {fullName}
            </span>
          </div>
        </div>

        {/* Score display */}
        <div className="text-right shrink-0">
          <span
            className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-bold border ${
              pillClasses[color] || "bg-slate-850 text-slate-350"
            }`}
          >
            {score}%
          </span>
          <span className="block text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-wide">
            {getScoreGrade(score)}
          </span>
        </div>
      </div>

      {/* Bullet Points List or Error Message */}
      <div className="mt-6 space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-450 dark:text-slate-500">
          {errors && errors.length > 0 ? "Execution Errors" : "Key Findings"}
        </h4>
        {errors && errors.length > 0 ? (
          <div className="p-3 text-xs leading-relaxed border rounded-xl font-mono bg-rose-50/50 dark:bg-rose-950/10 border-rose-500/20 text-rose-650 dark:text-rose-400 space-y-1 max-h-[120px] overflow-y-auto">
            {errors.map((err, idx) => (
              <p key={idx}>
                {typeof err === "object" ? err.message : err}
              </p>
            ))}
          </div>
        ) : bullets && bullets.length > 0 ? (
          <ul className="space-y-2.5">
            {bullets.map((bullet, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-650 dark:text-slate-300 leading-relaxed">
                <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${
                  color === "indigo" ? "bg-indigo-500" :
                  color === "blue" ? "bg-blue-500" :
                  color === "violet" ? "bg-violet-500" :
                  color === "rose" ? "bg-rose-500" :
                  color === "emerald" ? "bg-emerald-500" :
                  color === "cyan" ? "bg-cyan-500" :
                  color === "amber" ? "bg-amber-500" :
                  "bg-orange-500"
                }`} />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-slate-450 dark:text-slate-500 italic">No findings or results available.</p>
        )}
      </div>
    </div>
  );
}
