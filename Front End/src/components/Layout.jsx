import React from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";

export default function Layout({ children }) {
  return (
    <div className="bg-gray-100 dark:bg-[#111111] dark:bg-gray-100 dark:bg-[#111111] text-slate-800 dark:text-slate-100 min-h-screen flex flex-col transition-colors duration-300">
      {/* Global Navbar */}
      <Navbar />

      {/* Main page content area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col justify-start">
        {children}
      </main>

      {/* Global Footer */}
      <Footer />
    </div>
  );
}
