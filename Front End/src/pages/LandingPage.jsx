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
    indigo: "border-indigo-500/25 hover:border-indigo-500/50 bg-indigo-500/5 dark:bg-indigo-950/5",
    blue: "border-blue-500/25 hover:border-blue-500/50 bg-blue-500/5 dark:bg-blue-950/5",
    violet: "border-violet-500/25 hover:border-violet-500/50 bg-violet-500/5 dark:bg-violet-950/5",
    rose: "border-rose-500/25 hover:border-rose-500/50 bg-rose-500/5 dark:bg-rose-950/5",
    emerald: "border-emerald-500/25 hover:border-emerald-500/50 bg-emerald-500/5 dark:bg-emerald-950/5",
    cyan: "border-cyan-500/25 hover:border-cyan-500/50 bg-cyan-500/5 dark:bg-cyan-950/5",
    amber: "border-amber-500/25 hover:border-amber-500/50 bg-amber-500/5 dark:bg-amber-950/5",
    orange: "border-orange-500/25 hover:border-orange-500/50 bg-orange-500/5 dark:bg-orange-950/5"
  };

  const textStyles = {
    indigo: "text-indigo-600 dark:text-indigo-400",
    blue: "text-blue-600 dark:text-blue-400",
    violet: "text-violet-600 dark:text-violet-400",
    rose: "text-rose-600 dark:text-rose-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
    cyan: "text-cyan-600 dark:text-cyan-400",
    amber: "text-amber-600 dark:text-amber-400",
    orange: "text-orange-600 dark:text-orange-400"
  };

  return (
    <div className="relative overflow-hidden flex flex-col items-center">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 dark:bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="absolute top-1/3 left-1/4 w-[350px] h-[350px] bg-violet-500/10 dark:bg-violet-500/5 blur-[100px] rounded-full pointer-events-none -z-10 animate-pulse" />

      {/* Hero Section */}
      <section className="w-full max-w-4xl text-center pt-10 pb-16 md:pt-16 md:pb-24">
        {/* Decorative Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-500/35 bg-violet-500/10 text-violet-650 dark:text-violet-300 text-xs font-semibold uppercase tracking-wider mb-6 animate-bounce">
          <SparklesIcon className="w-4 h-4 shrink-0" />
          <span>Next-Generation Project Evaluation</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-6">
          ProjectReviewer <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">AI</span>
        </h1>

        <p className="text-xl sm:text-2xl text-slate-600 dark:text-slate-350 font-medium max-w-3xl mx-auto leading-relaxed mb-6">
          An Agentic AI Platform for Automated Software Project Evaluation
        </p>

        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-2xl mx-auto mb-10">
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
      <section id="agents-grid" className="w-full py-16 border-t border-slate-200 dark:border-slate-900 scroll-mt-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white">
            Powered by a Swarm of 8 Specialized AI Agents
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-2xl mx-auto">
            Each agent conducts a deep vertical analysis, communicating feedback to build a master developer score card.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {agentsPreview.map((agent, index) => (
            <div
              key={index}
              className={`p-6 rounded-2xl border transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${
                colorStyles[agent.color] || "border-slate-800"
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className={`w-2.5 h-2.5 rounded-full ${agent.color === "indigo" ? "bg-indigo-500" :
                  agent.color === "blue" ? "bg-blue-500" :
                  agent.color === "violet" ? "bg-violet-500" :
                  agent.color === "rose" ? "bg-rose-500" :
                  agent.color === "emerald" ? "bg-emerald-500" :
                  agent.color === "cyan" ? "bg-cyan-500" :
                  agent.color === "amber" ? "bg-amber-500" :
                  "bg-orange-500"}`} />
                <h3 className={`font-bold text-base ${textStyles[agent.color] || 'text-indigo-400'}`}>
                  {agent.name}
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {agent.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Static Interactive Workflow Steps */}
      <section className="w-full py-16 border-t border-slate-200 dark:border-slate-900">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white">
            How it Works
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Go from codebase upload to deep insights in three simple steps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {/* Step 1 */}
          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-violet-500/10 text-violet-650 dark:text-violet-300 border border-violet-500/20 flex items-center justify-center font-bold text-lg mx-auto">
              1
            </div>
            <h3 className="font-bold text-slate-850 dark:text-white text-lg">Upload Codebase</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Drag and drop your project folder as a `.zip` archive. We scan code structure and configuration files locally.
            </p>
          </div>

          {/* Step 2 */}
          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-650 dark:text-indigo-300 border border-indigo-500/20 flex items-center justify-center font-bold text-lg mx-auto">
              2
            </div>
            <h3 className="font-bold text-slate-850 dark:text-white text-lg">Swarm Evaluation</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              8 specialized agents read and analyze your code concurrently, testing for bugs, grading docs, and checking secrets.
            </p>
          </div>

          {/* Step 3 */}
          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-650 dark:text-emerald-300 border border-emerald-500/20 flex items-center justify-center font-bold text-lg mx-auto">
              3
            </div>
            <h3 className="font-bold text-slate-850 dark:text-white text-lg">Detailed Dashboard</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Explore your overall evaluation score, read specialized agent reports, and follow direct roadmaps for improvement.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
