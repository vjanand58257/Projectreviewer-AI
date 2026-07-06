import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { 
  Upload, Code2, Cpu, Shield, Layout, MessageSquare, 
  Settings, FolderTree, FileText, Lightbulb, CheckCircle, 
  ChevronRight, Star, Moon, Sun, ArrowRight, Play, Server, Zap
} from "lucide-react";

const ThemeToggle = () => {
  const [isDark, setIsDark] = useState(true);
  
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const toggle = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <button onClick={toggle} className="p-2 rounded-full glass-panel hover:bg-white/20 transition-all text-white">
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
};

const AGENTS = [
  { name: "Folder Analyzer", icon: FolderTree, color: "#00e5ff", angle: 0 },
  { name: "Docs Reviewer", icon: FileText, color: "#00ffff", angle: 45 },
  { name: "Innovation Scorer", icon: Lightbulb, color: "#b026ff", angle: 90 },
  { name: "Bug Finder", icon: CheckCircle, color: "#ff007f", angle: 135 },
  { name: "Security Checker", icon: Shield, color: "#4b00ff", angle: 180 },
  { name: "Presentation", icon: Layout, color: "#00e5ff", angle: 225 },
  { name: "Interview Gen", icon: MessageSquare, color: "#b026ff", angle: 270 },
  { name: "Improvement", icon: Settings, color: "#00ffff", angle: 315 },
];

export default function LandingPage() {
  const { scrollY } = useScroll();
  const navBackground = useTransform(scrollY, [0, 100], ["rgba(255,255,255,0)", "rgba(5,8,20,0.8)"]);
  const navBlur = useTransform(scrollY, [0, 100], ["blur(0px)", "blur(20px)"]);

  return (
    <div className="min-h-screen bg-[#050814] text-white overflow-x-hidden selection:bg-[#b026ff]/30 relative">
      
      {/* Background Nebulas */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#4b00ff] opacity-10 blur-[150px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#00e5ff] opacity-10 blur-[150px]" />
        <div className="absolute top-[40%] left-[60%] w-[40%] h-[40%] rounded-full bg-[#b026ff] opacity-10 blur-[150px]" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 animate-pulse" />
      </div>

      {/* Navbar */}
      <motion.nav 
        style={{ background: navBackground, backdropFilter: navBlur }}
        className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 transition-colors"
      >
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-[#4b00ff] to-[#00e5ff] flex items-center justify-center shadow-[0_0_20px_#4b00ff66]">
              <Cpu className="w-6 h-6 text-white" />
            </div>
            <span className="font-space font-bold text-xl tracking-tight">ProjectReviewer AI</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#" className="hover:text-white transition-colors">Home</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it Works</a>
            <a href="#agents" className="hover:text-white transition-colors">Agents</a>
            <a href="#" className="hover:text-white transition-colors">Docs</a>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link to="/upload">
              <button className="relative group px-6 py-2.5 rounded-full overflow-hidden font-medium text-sm">
                <div className="absolute inset-0 bg-gradient-to-r from-[#00e5ff] via-[#b026ff] to-[#ff007f] opacity-80 group-hover:opacity-100 transition-opacity" />
                <div className="absolute inset-[1px] bg-[#050814] rounded-full transition-colors group-hover:bg-transparent" />
                <span className="relative z-10 group-hover:text-white transition-colors">Get Started</span>
              </button>
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-32 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Left Text */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <h1 className="text-6xl sm:text-7xl lg:text-8xl font-space font-extrabold leading-[1.1] tracking-tighter mb-6">
              AI-Powered Insights.<br />
              Expert-Level Results.<br />
              <span className="text-gradient from-[#00e5ff] via-[#b026ff] to-[#ff007f] block pb-2">
                Better Projects.
              </span>
            </h1>
            
            <p className="text-xl text-slate-400 mb-10 max-w-lg leading-relaxed">
              Upload your codebase and instantly deploy a swarm of 8 highly specialized Gemini AI agents. Experience an operating system built for absolute code perfection.
            </p>

            <div className="flex flex-col sm:flex-row gap-5">
              <Link to="/upload">
                <button className="h-14 px-8 rounded-full bg-white text-[#050814] font-bold flex items-center justify-center gap-2 hover:scale-105 hover:shadow-[0_0_30px_#ffffff66] transition-all">
                  <Upload className="w-5 h-5" />
                  Upload Your Project
                </button>
              </Link>
              <Link to="/dashboard">
                <button className="h-14 px-8 rounded-full glass-panel font-bold flex items-center justify-center gap-2 hover:bg-white/10 hover:shadow-[0_0_30px_#00e5ff33] transition-all border border-[#00e5ff]/30 text-[#00e5ff]">
                  <Layout className="w-5 h-5" />
                  See Dashboard
                </button>
              </Link>
            </div>

            {/* Badges */}
            <div className="mt-14 flex flex-wrap gap-4">
              {['Lightning Fast', 'Bank-Grade Security', 'Deep Analysis'].map((text, i) => (
                <div key={i} className="glass-panel px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest text-slate-300 flex items-center gap-2 hover:text-white hover:border-[#b026ff]/50 hover:shadow-[0_0_15px_#b026ff33] transition-all cursor-default">
                  <Star className="w-3.5 h-3.5 text-[#00e5ff]" />
                  {text}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right Holographic Core */}
          <div className="relative h-[600px] flex items-center justify-center">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(75,0,255,0.1)_0%,transparent_70%)] animate-pulse" />
            
            {/* Center Cube */}
            <motion.div 
              animate={{ rotateY: 360, rotateX: 180 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="relative w-32 h-32 glass-panel shadow-[0_0_50px_#b026ff66] flex items-center justify-center border-[#00e5ff]/50 z-20"
            >
              <Code2 className="w-16 h-16 text-[#00e5ff]" />
            </motion.div>

            {/* Orbiting Agents */}
            <div className="absolute inset-0">
              {AGENTS.map((agent, i) => {
                const radius = 220; // 220px orbit radius
                return (
                  <motion.div 
                    key={i}
                    className="orbit-container"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 40, repeat: Infinity, ease: "linear", delay: i * -5 }}
                  >
                    <div 
                      className="absolute group"
                      style={{ transform: `translateX(${radius}px)` }}
                    >
                      <motion.div 
                        animate={{ rotate: -360 }}
                        transition={{ duration: 40, repeat: Infinity, ease: "linear", delay: i * -5 }}
                        className="glass-panel w-14 h-14 rounded-[16px] flex items-center justify-center cursor-pointer transition-all hover:scale-125"
                        style={{ borderColor: `${agent.color}40`, boxShadow: `0 0 20px ${agent.color}33` }}
                      >
                        <agent.icon className="w-6 h-6" style={{ color: agent.color }} />
                        
                        {/* Tooltip */}
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-black/80 px-3 py-1 rounded-full text-xs font-bold border border-white/10 text-white">
                          {agent.name}
                        </div>
                      </motion.div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
            
            {/* Orbit Rings */}
            <div className="absolute w-[440px] h-[440px] border border-white/5 rounded-full z-0" />
            <div className="absolute w-[440px] h-[440px] border border-[#b026ff]/10 rounded-full z-0 border-dashed animate-[spin_60s_linear_infinite]" />
          </div>

        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-32 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-space font-bold mb-6">How It Works</h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg">A seamless workflow designed to transform messy repositories into architectural masterpieces in minutes.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            {/* Connector Line */}
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#00e5ff]/30 to-transparent -translate-y-1/2 z-0" />

            {[
              { title: "Upload", desc: "Drag & Drop .zip", icon: Upload, color: "#00e5ff" },
              { title: "AI Analysis", desc: "Swarm reads code", icon: Server, color: "#b026ff" },
              { title: "Insights", desc: "Generate report", icon: Zap, color: "#ff007f" },
              { title: "Improve", desc: "Apply feedback", icon: Code2, color: "#4b00ff" }
            ].map((step, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="relative z-10 glass-panel p-8 flex flex-col items-center text-center group hover:-translate-y-4 transition-transform duration-500"
                style={{ '--tw-shadow-color': `${step.color}22`, boxShadow: '0 20px 40px var(--tw-shadow-color)' }}
              >
                <div className="w-16 h-16 rounded-[18px] flex items-center justify-center mb-6 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6" style={{ background: `${step.color}15`, border: `1px solid ${step.color}40` }}>
                  <step.icon className="w-8 h-8" style={{ color: step.color }} />
                </div>
                <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                <p className="text-slate-400 text-sm">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Analysis Showcase */}
      <section className="py-32 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Feed */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            className="lg:col-span-4 glass-panel p-6 h-[400px] overflow-hidden relative flex flex-col justify-end"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-[#050814]/80 to-transparent z-10" />
            <div className="space-y-4 relative z-0 animate-float">
              {['Scanning architecture...', 'Analyzing README...', 'Running Security Scan...', 'Generating Interview Questions...', 'Review Complete'].map((msg, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-slate-300 bg-white/5 px-4 py-3 rounded-[12px] border border-white/10">
                  <div className="w-2 h-2 rounded-full bg-[#00e5ff] animate-pulse" />
                  <span className="font-mono">{msg}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Center Progress */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            className="lg:col-span-4 flex items-center justify-center relative h-[400px]"
          >
            <div className="absolute w-72 h-72 border border-[#b026ff]/20 rounded-full animate-[spin_10s_linear_infinite]" />
            <div className="absolute w-64 h-64 border-4 border-dashed border-[#00e5ff]/40 rounded-full animate-[spin_20s_linear_infinite_reverse]" />
            <div className="w-56 h-56 glass-panel rounded-full flex flex-col items-center justify-center relative z-10 shadow-[0_0_80px_#4b00ff44]">
              <span className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-2">Progress</span>
              <span className="text-6xl font-space font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-white to-[#00e5ff]">76%</span>
            </div>
          </motion.div>

          {/* Right Stats */}
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            className="lg:col-span-4 space-y-4"
          >
            {[
              { label: 'Projects Reviewed', val: '14,092', color: '#00e5ff' },
              { label: 'Lines of Code', val: '4.2M+', color: '#b026ff' },
              { label: 'Bugs Found', val: '89,431', color: '#ff007f' }
            ].map((stat, i) => (
              <div key={i} className="glass-panel p-6 border-l-4" style={{ borderLeftColor: stat.color }}>
                <div className="text-4xl font-space font-bold mb-1" style={{ color: stat.color }}>{stat.val}</div>
                <div className="text-sm font-bold text-slate-400 uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative pt-32 pb-10 border-t border-white/10 overflow-hidden">
        <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-[#4b00ff]/20 to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-16">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <Cpu className="w-6 h-6 text-[#00e5ff]" />
                <span className="font-space font-bold text-lg">ProjectReviewer AI</span>
              </div>
              <p className="text-slate-400 text-sm">The world's most advanced holographic code review engine.</p>
            </div>
            <div>
              <h4 className="font-bold mb-6 text-white uppercase tracking-widest text-xs">Product</h4>
              <ul className="space-y-3 text-sm text-slate-400">
                <li><a href="#" className="hover:text-[#00e5ff]">Agents</a></li>
                <li><a href="#" className="hover:text-[#00e5ff]">Dashboard</a></li>
                <li><a href="#" className="hover:text-[#00e5ff]">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-6 text-white uppercase tracking-widest text-xs">Resources</h4>
              <ul className="space-y-3 text-sm text-slate-400">
                <li><a href="#" className="hover:text-[#b026ff]">Documentation</a></li>
                <li><a href="#" className="hover:text-[#b026ff]">API</a></li>
                <li><a href="#" className="hover:text-[#b026ff]">Blog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-6 text-white uppercase tracking-widest text-xs">Company</h4>
              <ul className="space-y-3 text-sm text-slate-400">
                <li><a href="#" className="hover:text-[#ff007f]">About</a></li>
                <li><a href="#" className="hover:text-[#ff007f]">Careers</a></li>
                <li><a href="#" className="hover:text-[#ff007f]">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="text-center text-sm text-slate-500 pt-8 border-t border-white/10">
            © 2026 ProjectReviewer AI. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
