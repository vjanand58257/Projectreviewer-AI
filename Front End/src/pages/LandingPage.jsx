import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Upload, Code2, Cpu, Shield, Layout, MessageSquare, 
  Settings, FolderTree, FileText, Lightbulb, CheckCircle, 
  ChevronRight, Star, ArrowRight, Zap, Play, Terminal
} from "lucide-react";

// Interactive Canvas Particle Background
const ParticleBackground = () => {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: null, y: null, radius: 150 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationFrameId;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Particles array
    const particles = [];
    const particleCount = 80;

    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 0.5;
        this.speedX = Math.random() * 0.4 - 0.2;
        this.speedY = Math.random() * 0.4 - 0.2;
        this.color = Math.random() > 0.5 ? "rgba(0, 229, 255, 0.4)" : "rgba(168, 85, 247, 0.3)";
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        // Bounce on edges
        if (this.x > canvas.width || this.x < 0) this.speedX = -this.speedX;
        if (this.y > canvas.height || this.y < 0) this.speedY = -this.speedY;

        // Mouse interaction
        const dx = mouseRef.current.x - this.x;
        const dy = mouseRef.current.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < mouseRef.current.radius) {
          const forceDirectionX = dx / distance;
          const forceDirectionY = dy / distance;
          const force = (mouseRef.current.radius - distance) / mouseRef.current.radius;
          const directionX = forceDirectionX * force * 0.6;
          const directionY = forceDirectionY * force * 0.6;
          this.x -= directionX;
          this.y -= directionY;
        }
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      }
    }

    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    const handleMouseMove = (e) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouseRef.current.x = null;
      mouseRef.current.y = null;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw grid in canvas for depth
      ctx.strokeStyle = "rgba(255, 255, 255, 0.015)";
      ctx.lineWidth = 1;
      const gridSize = 60;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      particles.forEach((particle) => {
        particle.update();
        particle.draw();
      });

      // Connect close particles with fine lines
      for (let a = 0; a < particles.length; a++) {
        for (let b = a + 1; b < particles.length; b++) {
          const dx = particles[a].x - particles[b].x;
          const dy = particles[a].y - particles[b].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(particles[a].x, particles[a].y);
            ctx.lineTo(particles[b].x, particles[b].y);
            ctx.strokeStyle = `rgba(0, 229, 255, ${0.15 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none -z-20 bg-transparent" />;
};

// Smooth Counter Animation Component
function AnimatedCounter({ value, duration = 1500, suffix = "" }) {
  const [count, setCount] = useState(0);
  const elementRef = useRef(null);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setHasStarted(true);
        }
      },
      { threshold: 0.1 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!hasStarted) return;
    let start = 0;
    const target = parseFloat(value.replace(/,/g, "").replace(/\+/g, ""));
    const startTime = performance.now();

    const updateCount = (timestamp) => {
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = progress * (2 - progress); // easeOutQuad
      const current = start + easeProgress * (target - start);
      setCount(current);

      if (progress < 1) {
        requestAnimationFrame(updateCount);
      } else {
        setCount(target);
      }
    };

    requestAnimationFrame(updateCount);
  }, [value, duration, hasStarted]);

  return (
    <span ref={elementRef} className="font-space">
      {Math.round(count).toLocaleString()}
      {suffix}
    </span>
  );
}

const AGENTS = [
  { name: "Folder Analyzer", icon: FolderTree, color: "#0066ff", angle: 0, desc: "Scans project architecture, checks layout modularity and clean folder structures." },
  { name: "Documentation", icon: FileText, color: "#00e5ff", angle: 45, desc: "Evaluates readme files, inline docstrings, API specifications, and comments." },
  { name: "Innovation", icon: Lightbulb, color: "#a855f7", angle: 90, desc: "Scores engineering creativity, optimizations, and modern frameworks usage." },
  { name: "Bug Finder", icon: CheckCircle, color: "#f43f5e", angle: 135, desc: "Finds logic anomalies, missing validations, uncaught promises, and crashes." },
  { name: "Security Checker", icon: Shield, color: "#10b981", angle: 180, desc: "Scans for credentials leaks, dependency flaws, and common CVEs." },
  { name: "Presentation", icon: Layout, color: "#00e5ff", angle: 225, desc: "Reviews accessibility ratings, layout compliance, and visual details." },
  { name: "Interview Gen", icon: MessageSquare, color: "#a855f7", angle: 270, desc: "Creates mock-interview questions custom tailored to codebase decisions." },
  { name: "Improvement", icon: Settings, color: "#f43f5e", angle: 315, desc: "Delivers direct refactoring steps, roadmaps, and optimization tasks." }
];

export default function LandingPage() {
  const [hoveredAgent, setHoveredAgent] = useState(null);
  const [rotationDegree, setRotationDegree] = useState(0);

  // Auto rotate the orbit core slowly
  useEffect(() => {
    const interval = setInterval(() => {
      setRotationDegree((prev) => (prev + 0.1) % 360);
    }, 30);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative min-h-screen text-slate-100 flex flex-col justify-start">
      
      {/* Interactive canvas background */}
      <ParticleBackground />

      {/* Floating Light Beams */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[20%] left-[20%] w-[1px] h-[400px] bg-gradient-to-b from-transparent via-[#00e5ff]/20 to-transparent blur-[1px] transform -rotate-45" />
        <div className="absolute top-[30%] right-[30%] w-[1px] h-[500px] bg-gradient-to-b from-transparent via-[#a855f7]/15 to-transparent blur-[2px] transform -rotate-45" />
      </div>

      {/* Hero Section */}
      <section className="relative pt-12 pb-24 px-4 overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          
          {/* Left Text details */}
          <div className="lg:col-span-6 space-y-8 text-left z-10">
            {/* Header pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#00e5ff]/35 bg-[#00e5ff]/5 text-[#00e5ff] text-[10px] uppercase font-bold tracking-widest font-mono shadow-[0_0_15px_rgba(0,229,255,0.1)]">
              <Cpu className="w-3.5 h-3.5 animate-spin-slow" />
              <span>Next-Gen Swarm Orchestrator</span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-space font-extrabold leading-[1.05] tracking-tighter">
              ProjectReviewer <span className="text-gradient from-[#0066ff] via-[#00e5ff] to-[#a855f7] text-glow-cyan">AI</span>
              <span className="block text-xl sm:text-2xl font-medium tracking-wide text-slate-400 font-sans mt-4 max-w-lg leading-relaxed">
                The AI Operating System for Software Project Evaluation
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-400 max-w-lg leading-relaxed">
              Upload your codebase, zip-extracted, and trigger a parallel swarm of 8 highly specialized Gemini AI agents. Review quality grades, vulnerabilities, and roadmap plans in real time.
            </p>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link to="/upload">
                <button className="h-12 px-6 rounded-xl bg-gradient-to-r from-[#0066ff] via-[#00e5ff] to-[#a855f7] text-white font-bold font-mono text-xs tracking-wider uppercase flex items-center justify-center gap-2 hover:shadow-[0_0_25px_rgba(0,229,255,0.4)] transition-all active:scale-95 duration-300 w-full sm:w-auto cursor-pointer">
                  <Upload className="w-4 h-4" />
                  Upload Project
                </button>
              </Link>
              <Link to="/dashboard">
                <button className="h-12 px-6 rounded-xl bg-white/5 border border-white/10 hover:border-[#00e5ff]/30 text-[#00e5ff] font-bold font-mono text-xs tracking-wider uppercase flex items-center justify-center gap-2 hover:bg-[#00e5ff]/5 hover:shadow-[0_0_20px_rgba(0,229,255,0.1)] transition-all active:scale-95 duration-300 w-full sm:w-auto cursor-pointer">
                  <Layout className="w-4 h-4" />
                  See Dashboard
                </button>
              </Link>
            </div>

            {/* Badges / Micro indicators */}
            <div className="pt-4 flex flex-wrap gap-3">
              {["React v19 Support", "Gemini Ultra", "Full Visual twin"].map((badge, idx) => (
                <div key={idx} className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 border border-white/5 text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff]" />
                  {badge}
                </div>
              ))}
            </div>
          </div>

          {/* Right Holographic AI Core & Orbiting Swarm */}
          <div className="lg:col-span-6 h-[550px] relative flex items-center justify-center z-10 mt-8 lg:mt-0">
            {/* Center Gradient glow */}
            <div className="absolute w-[300px] h-[300px] rounded-full bg-gradient-to-tr from-[#0066ff]/10 to-[#a855f7]/10 blur-[60px] pointer-events-none" />

            {/* Outer dotted rings */}
            <div className="absolute w-[440px] h-[440px] border border-white/5 rounded-full z-0 pointer-events-none" />
            <div className="absolute w-[440px] h-[440px] border border-dashed border-[#00e5ff]/15 rounded-full z-0 animate-spin-slow pointer-events-none" />
            <div className="absolute w-[320px] h-[320px] border border-dashed border-[#a855f7]/10 rounded-full z-0 animate-spin-reverse-slow pointer-events-none" />

            {/* Glowing lines connecting Agents to Core */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
              <defs>
                <linearGradient id="cyanPurple" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity="0.2" />
                </linearGradient>
              </defs>
              {AGENTS.map((agent, i) => {
                const total = AGENTS.length;
                const angleRad = ((i * (360 / total) + rotationDegree) * Math.PI) / 180;
                
                // Orbit radius is 200px
                const radius = 190;
                const startX = 275; // center x (out of 550)
                const startY = 275; // center y
                const endX = startX + radius * Math.cos(angleRad);
                const endY = startY + radius * Math.sin(angleRad);
                
                const isHovered = hoveredAgent === agent.name;

                return (
                  <g key={i}>
                    {/* Basic link line */}
                    <line 
                      x1={startX} 
                      y1={startY} 
                      x2={endX} 
                      y2={endY} 
                      stroke={isHovered ? agent.color : "rgba(255, 255, 255, 0.05)"}
                      strokeWidth={isHovered ? 2 : 1}
                      transition="stroke 0.3s"
                    />
                    {/* Animated Flow pulses */}
                    <circle
                      cx={startX + (endX - startX) * 0.5}
                      cy={startY + (endY - startY) * 0.5}
                      r={isHovered ? 3 : 1.5}
                      fill={agent.color}
                      className="animate-pulse"
                      style={{
                        animation: "float 2s ease-in-out infinite",
                        animationDelay: `${i * 0.25}s`
                      }}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Central Holographic AI Core */}
            <motion.div 
              className="relative w-36 h-36 rounded-3xl glass-panel-glow flex flex-col items-center justify-center border-[#00e5ff]/30 shadow-[0_0_60px_rgba(0,229,255,0.15)] z-20 cursor-pointer overflow-hidden group"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.3 }}
            >
              {/* Inner animated core grid */}
              <div className="absolute inset-0 bg-grid-pattern opacity-30 animate-pulse-slow" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0066ff]/10 to-transparent pointer-events-none" />
              
              <AnimatePresence mode="wait">
                {hoveredAgent ? (
                  <motion.div 
                    key="hovered" 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="text-center p-3 space-y-1 relative z-10"
                  >
                    <span className="text-[10px] font-mono text-[#00e5ff] uppercase font-bold tracking-widest">Active Agent</span>
                    <h4 className="text-xs font-bold font-space text-white truncate max-w-[120px]">{hoveredAgent}</h4>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="idle" 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center space-y-1 relative z-10"
                  >
                    <Cpu className="w-10 h-10 text-[#00e5ff] animate-pulse" />
                    <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-widest mt-1">AI CORE</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Orbiting Agent Cards */}
            <div className="absolute inset-0 w-full h-full pointer-events-none">
              {AGENTS.map((agent, i) => {
                const total = AGENTS.length;
                const angleRad = ((i * (360 / total) + rotationDegree) * Math.PI) / 180;
                const radius = 190;
                
                // Calculate position relative to container center
                const x = 275 + radius * Math.cos(angleRad) - 26; // minus half size of node (52px)
                const y = 275 + radius * Math.sin(angleRad) - 26;

                return (
                  <div
                    key={i}
                    className="absolute pointer-events-auto"
                    style={{ left: `${x}px`, top: `${y}px` }}
                    onMouseEnter={() => setHoveredAgent(agent.name)}
                    onMouseLeave={() => setHoveredAgent(null)}
                  >
                    <motion.div 
                      className={`w-14 h-14 rounded-2xl glass-panel flex items-center justify-center cursor-pointer transition-all duration-300 relative group border-white/10 hover:scale-115`}
                      style={{ 
                        boxShadow: hoveredAgent === agent.name ? `0 0 25px ${agent.color}55` : "0 4px 20px rgba(0,0,0,0.3)",
                        borderColor: hoveredAgent === agent.name ? agent.color : "rgba(255,255,255,0.08)"
                      }}
                    >
                      <agent.icon className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" style={{ color: agent.color }} />
                      
                      {/* Floating mini description when hovered */}
                      <div className="absolute bottom-[-45px] left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-[#040408] border border-white/10 px-3 py-1 rounded-lg text-[9px] font-mono text-slate-300 whitespace-nowrap z-50 shadow-md">
                        {agent.name}
                      </div>
                    </motion.div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Counter Section */}
      <section className="py-12 border-y border-white/5 bg-white/[0.01]">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { label: "Projects Reviewed", value: "14092", suffix: "+", color: "#0066ff" },
            { label: "Lines of Code Analyzed", value: "4200000", suffix: "+", color: "#00e5ff" },
            { label: "Active AI Agents", value: "8", suffix: "", color: "#a855f7" },
            { label: "Security Faults Found", value: "89431", suffix: "+", color: "#f43f5e" }
          ].map((stat, i) => (
            <div key={i} className="text-center space-y-1 relative">
              {i < 3 && <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 h-10 w-[1px] bg-white/5" />}
              <h3 className="text-3xl sm:text-4xl font-space font-black text-white" style={{ color: stat.color }}>
                <AnimatedCounter value={stat.value} suffix={stat.suffix} />
              </h3>
              <p className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it Works / Dynamic Steps */}
      <section id="how-it-works" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-6 space-y-16">
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-space font-bold text-white tracking-tight">Evaluation Process</h2>
            <p className="text-sm text-slate-400 leading-relaxed font-mono">
              The codebase traverses a pipeline of security validation, architectural linting, and quality review.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            {/* Connector Line in background */}
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-y-1/2 z-0" />

            {[
              { title: "Code Upload", desc: "Drag your .zip codebase directly into the secure upload terminal.", icon: Upload, color: "#0066ff" },
              { title: "Extraction & Lint", desc: "Vetted sandbox unpacks structure, reading readme, tests, config.", icon: Terminal, color: "#00e5ff" },
              { title: "Swarm Execution", desc: "8 specialized AI agents analyze aspects concurrently.", icon: Cpu, color: "#a855f7" },
              { title: "Digital Twin & Report", desc: "Examine execution timeline, charts, and action roadmaps.", icon: Layout, color: "#f43f5e" }
            ].map((step, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="relative z-10 glass-panel p-6 flex flex-col items-start text-left group hover:border-[#00e5ff]/20 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 transition-all duration-300 group-hover:scale-105" style={{ background: `${step.color}10`, border: `1px solid ${step.color}30` }}>
                  <step.icon className="w-6 h-6" style={{ color: step.color }} />
                </div>
                <h3 className="text-base font-bold text-white font-space mb-2">{step.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Swarm Console & Timeline Showcase */}
      <section className="py-20 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Console */}
          <div className="lg:col-span-5 glass-panel p-5 h-[320px] overflow-hidden relative flex flex-col justify-end border-white/5">
            {/* Ambient terminal top bar */}
            <div className="absolute top-0 inset-x-0 h-8 bg-white/5 flex items-center px-4 justify-between border-b border-white/5">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <span className="text-[10px] font-mono text-slate-500">live_activity.log</span>
            </div>

            <div className="absolute inset-0 bg-gradient-to-t from-[#020205] via-transparent to-transparent z-10 pointer-events-none" />
            
            <div className="space-y-3 pb-2 z-0 animate-float font-mono text-[11px]">
              {[
                "Initializing agent swarm pipelines...",
                "Running Folder & Structure check...",
                "Bug Finder discovered 2 Async warnings.",
                "Innovation Agent calculated 95% rating.",
                "Security Agent validated API endpoints.",
                "Synthesizing final executive summary..."
              ].map((msg, i) => (
                <div key={i} className="flex items-center gap-2.5 text-slate-400 bg-white/[0.02] px-3.5 py-2.5 rounded-lg border border-white/5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#00e5ff]" />
                  <span>{msg}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Progress */}
          <div className="lg:col-span-3 flex flex-col items-center justify-center relative h-[320px]">
            <div className="absolute w-60 h-60 border border-white/5 rounded-full animate-spin-slow pointer-events-none" />
            <div className="absolute w-52 h-52 border border-dashed border-[#00e5ff]/20 rounded-full animate-spin-reverse-slow pointer-events-none" />
            
            <div className="w-44 h-44 glass-panel rounded-full flex flex-col items-center justify-center relative z-10 shadow-[0_0_40px_rgba(0,229,255,0.06)] border-[#00e5ff]/20">
              <span className="text-slate-500 text-[10px] font-mono uppercase tracking-widest mb-1">Health Score</span>
              <span className="text-4xl font-space font-black text-white">84%</span>
              <span className="text-[#00e5ff] text-[9px] font-mono uppercase mt-1 tracking-widest font-bold">Good</span>
            </div>
          </div>

          {/* Detailed explanation */}
          <div className="lg:col-span-4 text-left space-y-6">
            <h3 className="text-2xl font-space font-bold text-white tracking-tight">Swarm Mission Control</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every agent records telemetry, highlighting architecture errors, documentation deficits, performance bottlenecks, and security gaps. See live progress loops as evaluations take place.
            </p>
            <Link to="/upload">
              <button className="px-5 py-2.5 rounded-xl border border-white/10 hover:border-[#00e5ff]/30 text-white font-mono font-bold text-xs tracking-wider uppercase hover:bg-white/5 transition-all flex items-center gap-2 cursor-pointer">
                Launch Evaluation Swarm
                <ArrowRight className="w-4 h-4 text-[#00e5ff]" />
              </button>
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
