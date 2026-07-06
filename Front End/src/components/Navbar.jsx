import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { SunIcon, MoonIcon, CloseIcon } from "./Icons";
import Button from "./Button";

export default function Navbar() {
  const { isDarkMode, toggleTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { label: "Home", path: "/" },
    { label: "Upload & Review", path: "/upload" },
    { label: "Dashboard", path: "/dashboard" }
  ];

  const isActive = (path) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="sticky top-4 z-50 w-[95%] max-w-7xl mx-auto rounded-2xl border border-white/15 bg-[#020205]/65 backdrop-blur-md transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Brand */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#0066ff] via-[#00e5ff] to-[#a855f7] flex items-center justify-center shadow-[0_0_20px_rgba(0,229,255,0.3)] group-hover:scale-105 transition-all duration-300">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 21L8.188 15.904L3 15L8.188 14.096L9 9L9.813 14.096L15 15L9.813 15.904Z" />
                </svg>
              </div>
              <span className="font-space font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent group-hover:opacity-80 transition-opacity">
                ProjectReviewer <span className="text-[#00e5ff] font-mono">AI</span>
              </span>
            </Link>
          </div>

          {/* Desktop Nav Items */}
          <div className="hidden md:flex items-center gap-1 bg-white/5 p-1 rounded-full border border-white/10">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`relative px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-300 ${
                  isActive(item.path)
                    ? "bg-[#00e5ff]/10 text-[#00e5ff] border border-[#00e5ff]/20 shadow-[0_0_15px_rgba(0,229,255,0.15)]"
                    : "text-slate-400 hover:text-white border border-transparent hover:bg-white/5"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Right Side: Theme Toggle & CTAs */}
          <div className="hidden md:flex items-center gap-4">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all duration-300 cursor-pointer shadow-sm"
              aria-label="Toggle Theme"
            >
              {isDarkMode ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
            </button>

            <Link to="/upload">
              <button className="relative group px-5 py-2 rounded-xl overflow-hidden font-mono font-bold text-xs tracking-wider uppercase cursor-pointer">
                <div className="absolute inset-0 bg-gradient-to-r from-[#0066ff] via-[#00e5ff] to-[#a855f7] opacity-90 group-hover:opacity-100 transition-opacity" />
                <div className="absolute inset-[1px] bg-[#020205] rounded-[11px] transition-all group-hover:bg-transparent" />
                <span className="relative z-10 text-white group-hover:text-white transition-colors">Get Started</span>
              </button>
            </Link>
          </div>

          {/* Mobile Menu & Theme Toggle Actions */}
          <div className="flex items-center gap-2 md:hidden">
            {/* Theme Toggle for Mobile */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:text-white transition-all cursor-pointer"
              aria-label="Toggle Theme"
            >
              {isDarkMode ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
            </button>

            {/* Hamburger Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-xl border border-white/10 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Open menu"
            >
              {isMobileMenuOpen ? (
                <CloseIcon className="w-5 h-5" />
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#020205] px-4 pt-2 pb-4 space-y-2 rounded-b-2xl">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                isActive(item.path)
                  ? "bg-[#00e5ff]/10 text-[#00e5ff] border border-[#00e5ff]/20"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <div className="pt-2 px-2">
            <Link to="/upload" onClick={() => setIsMobileMenuOpen(false)}>
              <Button className="w-full rounded-xl">Get Started</Button>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
