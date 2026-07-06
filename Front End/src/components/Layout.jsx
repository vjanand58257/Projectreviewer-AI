import React from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";

export default function Layout({ children }) {
  return (
    <div className="bg-[#020205] text-slate-100 min-h-screen flex flex-col transition-colors duration-300 relative bg-grid-pattern selection:bg-[#00e5ff]/20">
      {/* Background Nebulas */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[45vw] h-[45vw] rounded-full bg-[#0066ff] opacity-10 blur-[130px] animate-pulse-slow" />
        <div className="absolute bottom-[20%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-[#a855f7] opacity-10 blur-[130px] animate-pulse-slow" style={{ animationDelay: "2s" }} />
        <div className="absolute top-[35%] left-[55%] w-[35vw] h-[35vw] rounded-full bg-[#00e5ff] opacity-[0.07] blur-[120px] animate-pulse-slow" style={{ animationDelay: "4s" }} />
      </div>

      {/* Global Navbar */}
      <div className="pt-4">
        <Navbar />
      </div>

      {/* Main page content area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col justify-start">
        {children}
      </main>

      {/* Global Footer */}
      <Footer />
    </div>
  );
}
