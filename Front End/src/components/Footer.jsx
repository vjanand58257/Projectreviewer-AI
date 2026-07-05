import React from "react";
import { Link } from "react-router-dom";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-300 dark:border-[#222222] dark:border-gray-300 dark:border-[#222222] bg-white dark:bg-gray-100 dark:bg-[#111111] transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-none bg-gray-100 dark:bg-[#111111] border-2 border-gray-300 dark:border-[#222222] flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 21L8.188 15.904L3 15L8.188 14.096L9 9L9.813 14.096L15 15L9.813 15.904Z" />
                </svg>
              </div>
              <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                ProjectReviewer <span className="text-blue-600 dark:text-[#00f0ff] font-mono">AI</span>
              </span>
            </div>
            <p className="text-sm text-gray-500 font-mono dark:text-slate-400 max-w-sm leading-relaxed">
              An Agentic AI Platform for Automated Software Project Evaluation. Analyze architecture, bugs, security, documentation, and presentation in seconds.
            </p>
          </div>

          {/* Links 1 */}
          <div>
            <h4 className="text-xs font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-4">Platform</h4>
            <ul className="space-y-2.5">
              <li>
                <Link to="/upload" className="text-sm text-gray-500 font-mono hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
                  Upload Codebase
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="text-sm text-gray-500 font-mono hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
                  Evaluation Dashboard
                </Link>
              </li>
              <li>
                <a href="#how-it-works" className="text-sm text-gray-500 font-mono hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
                  How it Works
                </a>
              </li>
            </ul>
          </div>

          {/* Links 2 */}
          <div>
            <h4 className="text-xs font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-4">Legal & Support</h4>
            <ul className="space-y-2.5">
              <li>
                <a href="#privacy" className="text-sm text-gray-500 font-mono hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#terms" className="text-sm text-gray-500 font-mono hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="mailto:support@projectreviewer.ai" className="text-sm text-gray-500 font-mono hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
                  Contact Support
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-300 dark:border-[#222222] dark:border-gray-300 dark:border-[#222222] mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-400 dark:text-gray-500 font-mono">
            &copy; {currentYear} ProjectReviewer AI. All rights reserved.
          </p>
          <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-gray-500 font-mono">
            <span>Built with Gemini Flash & Tailwind CSS</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
