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
    "inline-flex items-center justify-center font-mono font-bold uppercase tracking-widest rounded-none border-2 transition-all duration-300 focus:outline-none focus:ring-0 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer";

  const variants = {
    primary:
      "border-blue-600 bg-blue-600 text-white hover:bg-blue-700 hover:border-blue-700 dark:border-[var(--color-brand-cyan)] dark:bg-[var(--color-brand-cyan-dim)] dark:text-[var(--color-brand-cyan)] dark:hover:bg-[var(--color-brand-cyan)] dark:hover:text-black ",
    secondary:
      "border-gray-300 bg-gray-100 text-gray-800 hover:bg-gray-200 dark:border-[var(--color-border-subtle)] dark:bg-[var(--color-bg-panel)] dark:text-[var(--color-text-primary)] dark:hover:bg-[#1a1a1a] dark:hover:border-gray-600",
    outline:
      "border-blue-600 bg-transparent text-blue-600 hover:bg-blue-50 dark:border-[var(--color-brand-cyan)] dark:text-[var(--color-brand-cyan)] dark:hover:bg-[var(--color-brand-cyan-dim)]",
    danger:
      "border-rose-600 bg-transparent text-rose-600 hover:bg-rose-50 dark:border-rose-500 dark:text-rose-500 dark:hover:bg-rose-500/10",
    ghost:
      "border-transparent bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-[var(--color-text-secondary)] dark:hover:bg-[var(--color-bg-panel)] dark:hover:text-[var(--color-text-primary)]"
  };

  const sizes = {
    sm: "px-3 py-1 text-xs",
    md: "px-6 py-2 text-sm",
    lg: "px-8 py-3 text-base"
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
