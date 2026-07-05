import React from "react";
import { Link } from "react-router-dom";
import Button from "../components/Button";
import { SparklesIcon } from "../components/Icons";

export default function LandingPage() {
  const agentsPreview = [
    { name: "Structure", desc: "Analyzes project folder layout & modular clean architecture", color: "indigo" },
    { name: "Documentation", desc: "Checks README, comments, API specs & doc coverage", color: "blue" },
    { name: "Innovation", desc: "Measures advanced patterns, optimizations & tech stack", color: "violet" },
    { name: "Bug & Correctness", desc: "Finds logical errors, runtime issues & edge cases", color: "rose" },
    { name: "Security", desc: "Scans for credentials, exposed secrets & vulnerability risk", color: "emerald" },
    { name: "Presentation", desc: "Evaluates visual polish, styling cohesion & responsive UI", color: "cyan" },
    { name: "Interview Q&A", desc: "Simulates architectural Q&A on dev decision trade-offs", color: "amber" },
    { name: "Improvement", desc: "Constructs direct roadmaps & actionable refactoring recommendations", color: "orange" }
  ];

  const colorStyles = {
    indigo: "border-indigo-500/25 hover:border-indigo-500/50 bg-gray-100 dark:bg-[#111111]",
    blue: "border-blue-500/25 hover:border-blue-500/50 bg-blue-500/5 dark:bg-blue-950/5",
    violet: "border-violet-500/25 hover:border-violet-500/50 bg-gray-100 dark:bg-[#111111]",
    rose: "border-rose-500/25 hover:border-rose-500/50 bg-rose-500/5 dark:bg-rose-950/5",
    emerald: "border-emerald-500/25 hover:border-emerald-500/50 bg-gray-100 dark:bg-[#111111]",
    cyan: "border-cyan-500/25 hover:border-cyan-500/50 bg-cyan-500/5 dark:bg-cyan-950/5",
    amber: "border-amber-500/25 hover:border-amber-500/50 bg-amber-500/5 dark:bg-amber-950/5",
    orange: "border-orange-500/25 hover:border-orange-500/50 bg-orange-500/5 dark:bg-orange-950/5"
  };

  const textStyles = {
    indigo: "text-blue-600 dark:text-[#00f0ff] font-mono",
    blue: "text-blue-600 dark:text-blue-400",
    violet: "text-blue-600 dark:text-[#00f0ff] font-mono",
    rose: "text-rose-600 dark:text-rose-400",
    emerald: "text-blue-600 dark:text-[#00f0ff] font-mono",
    cyan: "text-cyan-600 dark:text-cyan-400",
    amber: "text-amber-600 dark:text-amber-400",
    orange: "text-orange-600 dark:text-orange-400"
  };

  return (
    <div className="relative overflow-hidden flex flex-col items-center min-h-[calc(100vh-100px)]">
      {/* Background Glows & Mesh */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-900/0 to-transparent dark:from-indigo-900/40 dark:via-slate-950/0 pointer-events-none -z-20" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gray-100 dark:bg-[#111111] hidden rounded-none pointer-events-none -z-10 mix-blend-screen" />
      <div className="absolute top-1/3 left-1/4 w-[450px] h-[450px] bg-gray-100 dark:bg-[#111111] hidden rounded-none pointer-events-none -z-10 animate-pulse mix-blend-screen" />
      <div className="absolute top-2/3 right-1/4 w-[500px] h-[500px] bg-fuchsia-500/10 dark:bg-fuchsia-500/5 hidden rounded-none pointer-events-none -z-10" />

      {/* Hero Section */}
      <section className="w-full max-w-5xl text-center pt-16 pb-20 md:pt-24 md:pb-32 px-4 z-10">
        {/* Decorative Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-none border border-violet-500/30 bg-gray-100 dark:bg-[#111111] backdrop-blur-md text-blue-600 dark:text-[#00f0ff] font-mono text-xs font-bold uppercase tracking-widest mb-8 hover:bg-gray-100 dark:bg-[#111111] transition-colors duration-300  cursor-default">
          <SparklesIcon className="w-4 h-4 shrink-0 animate-pulse text-blue-600 dark:text-[#00f0ff] font-mono" />
          <span>Next-Generation Project Evaluation</span>
        </div>

        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight mb-8 text-slate-900 dark:text-white drop-shadow-none">
          ProjectReviewer{" "}
          <span className="bg-gray-100 dark:bg-[#111111] border-2 border-gray-300 dark:border-[#222222] bg-clip-text text-transparent drop-shadow-none animate-gradient-x">
            AI
          </span>
        </h1>

        <p className="text-xl sm:text-2xl md:text-3xl text-slate-700 dark:text-slate-300 font-medium max-w-4xl mx-auto leading-relaxed mb-8">
          An Agentic AI Platform for Automated Software Project Evaluation
        </p>

        <p className="text-base sm:text-lg text-gray-500 font-mono dark:text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed">
          Upload your project .zip codebase and get immediate feedbacks across architecture, bugs, security vulnerabilities, documentation, presentation UI, and interview readiness. Powered by a collaborative swarm of 8 specialized Gemini agents.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/upload" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto group">
              Get Started
              <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Button>
          </Link>
          <a href="#agents-grid" className="w-full sm:w-auto">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              Meet the Agents
            </Button>
          </a>
        </div>
      </section>

      {/* Agents preview Grid */}
      <section id="agents-grid" className="w-full py-16 border-t border-gray-300 dark:border-[#222222] dark:border-gray-300 dark:border-[#222222] scroll-mt-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white">
            Powered by a Swarm of 8 Specialized AI Agents
          </h2>
          <p className="text-gray-500 font-mono dark:text-slate-400 mt-2 max-w-2xl mx-auto">
            Each agent conducts a deep vertical analysis, communicating feedback to build a master developer score card.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {agentsPreview.map((agent, index) => (
            <div
              key={index}
              className={`group p-6 rounded-none border transition-all duration-300 hover:shadow-none hover:-translate-y-1.5 backdrop-blur-sm bg-white dark:bg-[#0a0a0a] relative overflow-hidden ${
                colorStyles[agent.color] || "border-gray-300 dark:border-[#222222]"
              }`}
            >
              <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-${agent.color}-500/20 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              <div className="flex items-center gap-3 mb-4 relative z-10">
                <span className={`w-3 h-3 rounded-none  ${agent.color === "indigo" ? "bg-indigo-500 shadow-indigo-500/50" :
                  agent.color === "blue" ? "bg-blue-500 shadow-blue-500/50" :
                  agent.color === "violet" ? "bg-violet-500 shadow-violet-500/50" :
                  agent.color === "rose" ? "bg-rose-500 shadow-rose-500/50" :
                  agent.color === "emerald" ? "bg-emerald-500 shadow-emerald-500/50" :
                  agent.color === "cyan" ? "bg-cyan-500 shadow-cyan-500/50" :
                  agent.color === "amber" ? "bg-amber-500 shadow-amber-500/50" :
                  "bg-orange-500 shadow-orange-500/50"}`} />
                <h3 className={`font-extrabold text-lg tracking-tight ${textStyles[agent.color] || 'text-blue-600 dark:text-[#00f0ff] font-mono'}`}>
                  {agent.name}
                </h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium relative z-10">
                {agent.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Static Interactive Workflow Steps */}
      <section className="w-full py-16 border-t border-gray-300 dark:border-[#222222] dark:border-gray-300 dark:border-[#222222]">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white">
            How it Works
          </h2>
          <p className="text-gray-500 font-mono dark:text-slate-400 mt-2">
            Go from codebase upload to deep insights in three simple steps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {/* Step 1 */}
          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-none bg-gray-100 dark:bg-[#111111] text-blue-600 dark:text-[#00f0ff] font-mono border border-violet-500/20 flex items-center justify-center font-bold text-lg mx-auto">
              1
            </div>
            <h3 className="font-bold text-slate-850 dark:text-white text-lg">Upload Codebase</h3>
            <p className="text-sm text-gray-500 font-mono dark:text-slate-400 leading-relaxed">
              Drag and drop your project folder as a `.zip` archive. We scan code structure and configuration files locally.
            </p>
          </div>

          {/* Step 2 */}
          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-none bg-gray-100 dark:bg-[#111111] text-blue-600 dark:text-[#00f0ff] font-mono border border-indigo-500/20 flex items-center justify-center font-bold text-lg mx-auto">
              2
            </div>
            <h3 className="font-bold text-slate-850 dark:text-white text-lg">Swarm Evaluation</h3>
            <p className="text-sm text-gray-500 font-mono dark:text-slate-400 leading-relaxed">
              8 specialized agents read and analyze your code concurrently, testing for bugs, grading docs, and checking secrets.
            </p>
          </div>

          {/* Step 3 */}
          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-none bg-gray-100 dark:bg-[#111111] text-blue-600 dark:text-[#00f0ff] font-mono border border-emerald-500/20 flex items-center justify-center font-bold text-lg mx-auto">
              3
            </div>
            <h3 className="font-bold text-slate-850 dark:text-white text-lg">Detailed Dashboard</h3>
            <p className="text-sm text-gray-500 font-mono dark:text-slate-400 leading-relaxed">
              Explore your overall evaluation score, read specialized agent reports, and follow direct roadmaps for improvement.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
