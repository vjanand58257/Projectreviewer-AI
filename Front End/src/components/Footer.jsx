import React from "react";
import { Link } from "react-router-dom";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative mt-20 border-t border-white/10 bg-[#020205] transition-all duration-300 overflow-hidden">
      {/* Bottom accent glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60%] h-[120px] rounded-full bg-gradient-to-t from-[#0066ff]/10 via-[#a855f7]/5 to-transparent blur-[50px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 py-16 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-5">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#0066ff] to-[#00e5ff] flex items-center justify-center shadow-[0_0_15px_rgba(0,229,255,0.2)]">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 21L8.188 15.904L3 15L8.188 14.096L9 9L9.813 14.096L15 15L9.813 15.904Z" />
                </svg>
              </div>
              <span className="font-space font-extrabold text-base tracking-tight text-white">
                ProjectReviewer <span className="text-[#00e5ff] font-mono">AI</span>
              </span>
            </div>
            <p className="text-sm text-slate-400 font-mono max-w-sm leading-relaxed">
              Automated multi-agent code evaluation suite. Run custom static-analysis swarms on complex codebases in seconds.
            </p>
          </div>

          {/* Links 1 */}
          <div>
            <h4 className="text-xs font-bold text-[#00e5ff] uppercase tracking-wider mb-4 font-space">Platform</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/upload" className="text-sm text-slate-400 font-mono hover:text-white transition-colors">
                  Upload Codebase
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="text-sm text-slate-400 font-mono hover:text-white transition-colors">
                  Evaluation Dashboard
                </Link>
              </li>
              <li>
                <a href="#how-it-works" className="text-sm text-slate-400 font-mono hover:text-white transition-colors">
                  How it Works
                </a>
              </li>
            </ul>
          </div>

          {/* Links 2 */}
          <div>
            <h4 className="text-xs font-bold text-[#a855f7] uppercase tracking-wider mb-4 font-space">Legal & Support</h4>
            <ul className="space-y-3">
              <li>
                <a href="#privacy" className="text-sm text-slate-400 font-mono hover:text-white transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#terms" className="text-sm text-slate-400 font-mono hover:text-white transition-colors">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="mailto:support@projectreviewer.ai" className="text-sm text-slate-400 font-mono hover:text-white transition-colors">
                  Contact Support
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500 font-mono">
            &copy; {currentYear} ProjectReviewer AI. All rights reserved.
          </p>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
            <span>Built with Gemini Flash & Tailwind CSS</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
