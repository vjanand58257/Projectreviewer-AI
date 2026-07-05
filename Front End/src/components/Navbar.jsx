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
    <nav className="sticky top-0 z-50 w-full border-b border-gray-300 dark:border-[#222222]/85 dark:border-gray-300 dark:border-[#222222]/85 bg-white dark:bg-gray-100 dark:bg-[#111111]/80 backdrop-blur-md transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Brand */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="h-9 w-9 rounded-none bg-gray-100 dark:bg-[#111111] border-2 border-gray-300 dark:border-[#222222] flex items-center justify-center shadow-none shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-350">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 21L8.188 15.904L3 15L8.188 14.096L9 9L9.813 14.096L15 15L9.813 15.904Z" />
                </svg>
              </div>
              <span className="font-extrabold text-lg tracking-tight bg-gray-100 dark:bg-[#111111] border-2 border-gray-300 dark:border-[#222222] dark:from-white dark:to-slate-350 bg-clip-text text-transparent group-hover:opacity-95 transition-opacity">
                ProjectReviewer <span className="text-blue-600 dark:text-[#00f0ff] font-mono">AI</span>
              </span>
            </Link>
          </div>

          {/* Desktop Nav Items */}
          <div className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`text-sm font-semibold transition-colors duration-200 ${
                  isActive(item.path)
                    ? "text-blue-600 dark:text-[#00f0ff] font-mono"
                    : "text-slate-650 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
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
              className="p-2.5 rounded-none border border-gray-300 dark:border-[#222222] hover:border-gray-300 dark:border-[#222222] dark:border-gray-300 dark:border-[#222222] dark:hover:border-gray-300 dark:border-[#222222] bg-gray-100 dark:bg-[#111111] dark:bg-gray-100 dark:bg-[#111111] text-slate-550 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-all cursor-pointer"
              aria-label="Toggle Theme"
            >
              {isDarkMode ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
            </button>

            <Link to="/upload">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>

          {/* Mobile Menu & Theme Toggle Actions */}
          <div className="flex items-center gap-2 md:hidden">
            {/* Theme Toggle for Mobile */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-none border border-gray-300 dark:border-[#222222] dark:border-gray-300 dark:border-[#222222] bg-gray-100 dark:bg-[#111111] dark:bg-gray-100 dark:bg-[#111111] text-slate-555 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-all cursor-pointer"
              aria-label="Toggle Theme"
            >
              {isDarkMode ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
            </button>

            {/* Hamburger Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-none border border-gray-300 dark:border-[#222222] dark:border-gray-300 dark:border-[#222222] text-slate-600 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200 hover:bg-gray-100 dark:bg-[#111111] dark:hover:bg-gray-100 dark:bg-[#111111] transition-colors cursor-pointer"
              aria-label="Open menu"
            >
              {isMobileMenuOpen ? (
                <CloseIcon className="w-6 h-6" />
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-gray-300 dark:border-[#222222] dark:border-gray-300 dark:border-[#222222] bg-white dark:bg-gray-100 dark:bg-[#111111] px-4 pt-2 pb-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block px-4 py-2.5 rounded-none text-base font-semibold transition-colors ${
                isActive(item.path)
                  ? "bg-gray-100 dark:bg-[#111111] text-blue-600 dark:text-[#00f0ff] font-mono"
                  : "text-slate-700 dark:text-slate-350 hover:bg-gray-100 dark:bg-[#111111] dark:hover:bg-gray-100 dark:bg-[#111111]"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <div className="pt-2 px-4">
            <Link to="/upload" onClick={() => setIsMobileMenuOpen(false)}>
              <Button className="w-full">Get Started</Button>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
