import React from "react";

export default function Button({
  children,
  variant = "primary",
  size = "md",
  onClick,
  className = "",
  type = "button",
  disabled = false,
  ...props
}) {
  const baseStyles =
    "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer";

  const variants = {
    primary:
      "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 focus:ring-indigo-500 focus:ring-offset-slate-900",
    secondary:
      "bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 focus:ring-slate-500 focus:ring-offset-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 dark:text-slate-100 light:bg-slate-100 light:hover:bg-slate-200 light:border-slate-300 light:text-slate-800",
    outline:
      "bg-transparent border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 focus:ring-indigo-500 focus:ring-offset-slate-900 dark:text-indigo-400 dark:border-indigo-500/30 light:text-indigo-600 light:border-indigo-600/30 light:hover:bg-indigo-500/5",
    danger:
      "bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-500/20 focus:ring-rose-500 focus:ring-offset-slate-900",
    ghost:
      "bg-transparent hover:bg-slate-800 text-slate-400 hover:text-slate-200 focus:ring-slate-500"
  };

  const sizes = {
    sm: "px-3.5 py-1.5 text-sm",
    md: "px-5 py-2.5 text-base",
    lg: "px-7 py-3.5 text-lg"
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
