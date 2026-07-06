import React, { useState } from "react";
import { AgentIcon } from "./Icons";
import { ChevronDown, ChevronUp, Cpu, Award, Zap } from "lucide-react";

export default function ScoreCard({ agent }) {
  if (!agent) return null;

  const { name, fullName, score, bullets, icon, color, errors } = agent;
  const [isExpanded, setIsExpanded] = useState(false);

  // Derive stable dummy telemetry based on name hash
  const getAgentTelemetry = (id) => {
    const telemetries = {
      folder: { confidence: 98, time: 0.8, complexity: "Medium" },
      documentation: { confidence: 92, time: 1.4, complexity: "Low" },
      innovation: { confidence: 89, time: 2.1, complexity: "High" },
      bug: { confidence: 95, time: 3.2, complexity: "High" },
      security: { confidence: 99, time: 1.9, complexity: "High" },
      presentation: { confidence: 91, time: 2.5, complexity: "Medium" },
      interview: { confidence: 94, time: 4.1, complexity: "High" },
      improvement: { confidence: 96, time: 1.2, complexity: "Medium" }
    };
    return telemetries[id] || { confidence: 95, time: 1.5, complexity: "Medium" };
  };

  const telemetry = getAgentTelemetry(agent.id);

  const colorClasses = {
    indigo: "border-[#0066ff]/20 text-[#0066ff] bg-[#0066ff]/5 shadow-[0_0_15px_rgba(0,102,255,0.05)]",
    blue: "border-[#00e5ff]/20 text-[#00e5ff] bg-[#00e5ff]/5 shadow-[0_0_15px_rgba(0,229,255,0.05)]",
    violet: "border-[#a855f7]/20 text-[#a855f7] bg-[#a855f7]/5 shadow-[0_0_15px_rgba(168,85,247,0.05)]",
    rose: "border-rose-500/20 text-rose-400 bg-rose-500/5 shadow-[0_0_15px_rgba(244,63,94,0.05)]",
    emerald: "border-emerald-500/20 text-emerald-400 bg-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.05)]",
    cyan: "border-cyan-500/20 text-cyan-400 bg-cyan-500/5 shadow-[0_0_15px_rgba(6,182,212,0.05)]",
    amber: "border-amber-500/20 text-amber-400 bg-amber-500/5 shadow-[0_0_15px_rgba(245,158,11,0.05)]",
    orange: "border-orange-500/20 text-orange-400 bg-orange-500/5 shadow-[0_0_15px_rgba(249,115,22,0.05)]"
  };

  const agentColor = colorClasses[color] || "border-white/10 text-slate-300 bg-white/5";

  return (
    <div
      className={`glass-panel p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#00e5ff]/35 hover:shadow-[0_8px_30px_rgba(0,229,255,0.06)] flex flex-col justify-between ${
        errors && errors.length > 0 ? "border-rose-500/30 bg-rose-500/[0.02]" : "border-white/5"
      }`}
    >
      <div className="space-y-4">
        {/* Header: Icon, Name, and Score */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl border ${agentColor} shrink-0`}>
              <AgentIcon name={icon} className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-space font-bold text-white text-sm leading-tight group-hover:text-[#00e5ff] transition-colors">
                {name}
              </h3>
              <span className="text-[10px] text-slate-500 font-mono block mt-0.5 truncate max-w-[150px]">
                {fullName}
              </span>
            </div>
          </div>

          {/* Score gauge bubble */}
          <div className="text-right">
            <span className="inline-flex px-2 py-0.5 rounded-lg border border-[#00e5ff]/30 bg-[#00e5ff]/5 text-xs font-mono font-bold text-[#00e5ff]">
              {score}%
            </span>
            <span className="block text-[8px] font-mono font-bold uppercase tracking-wider text-slate-500 mt-1">
              Rating
            </span>
          </div>
        </div>

        {/* Telemetry info row: Confidence & Exec Time */}
        <div className="grid grid-cols-3 gap-2 py-2 border-y border-white/5 font-mono text-[9px] text-slate-400">
          <div className="space-y-0.5">
            <span className="text-slate-500 uppercase tracking-widest block">Conf.</span>
            <span className="text-white font-bold">{telemetry.confidence}%</span>
          </div>
          <div className="space-y-0.5">
            <span className="text-slate-500 uppercase tracking-widest block">Exec.</span>
            <span className="text-white font-bold">{telemetry.time}s</span>
          </div>
          <div className="space-y-0.5">
            <span className="text-slate-500 uppercase tracking-widest block">Load.</span>
            <span className="text-white font-bold">{telemetry.complexity}</span>
          </div>
        </div>

        {/* Findings bullets */}
        <div className="space-y-2.5">
          <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500">
            {errors && errors.length > 0 ? "Execution Faults" : "Core Findings"}
          </h4>

          {errors && errors.length > 0 ? (
            <div className="p-3 text-[10px] leading-relaxed border rounded-lg font-mono bg-rose-500/5 border-rose-500/20 text-rose-400 max-h-[100px] overflow-y-auto">
              {errors.map((err, idx) => (
                <p key={idx}>
                  {typeof err === "object" ? err.message : err}
                </p>
              ))}
            </div>
          ) : bullets && bullets.length > 0 ? (
            <ul className="space-y-2">
              {/* Show only first 2 bullets to keep UI clean, expand for more */}
              {bullets.slice(0, isExpanded ? bullets.length : 2).map((bullet, idx) => (
                <li key={idx} className="flex items-start gap-2 text-[11px] text-slate-300 leading-relaxed">
                  <span className="mt-1.5 w-1 h-1 rounded-full bg-[#00e5ff] shrink-0" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[10px] text-slate-500 font-mono italic">No results returned.</p>
          )}
        </div>
      </div>

      {/* Expand / Collapse toggle */}
      {bullets && bullets.length > 2 && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-4 flex items-center justify-center gap-1.5 w-full py-1 border border-white/5 hover:border-white/10 rounded-lg text-[9px] font-mono text-slate-400 hover:text-white transition-all cursor-pointer bg-white/[0.01]"
        >
          {isExpanded ? (
            <>
              <span>Collapse details</span>
              <ChevronUp className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              <span>Expand recommendations</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      )}
    </div>
  );
}
