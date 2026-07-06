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
    "inline-flex items-center justify-center font-mono font-bold uppercase tracking-wider rounded-xl transition-all duration-300 focus:outline-none focus:ring-1 focus:ring-[#00e5ff]/50 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none cursor-pointer border border-transparent";

  const variants = {
    primary:
      "bg-gradient-to-r from-[#0066ff] via-[#00e5ff] to-[#a855f7] text-white hover:shadow-[0_0_20px_rgba(0,229,255,0.3)] hover:opacity-95",
    secondary:
      "bg-white/5 border-white/10 hover:border-white/20 text-slate-200 hover:bg-white/10 hover:text-white shadow-sm",
    outline:
      "border-[#00e5ff]/40 bg-transparent text-[#00e5ff] hover:bg-[#00e5ff]/10 hover:border-[#00e5ff]/60 shadow-[0_0_15px_rgba(0,229,255,0.05)]",
    danger:
      "border-rose-500/40 bg-transparent text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/60",
    ghost:
      "bg-transparent text-slate-400 hover:bg-white/5 hover:text-white"
  };

  const sizes = {
    sm: "px-4 py-1.5 text-[10px] tracking-widest",
    md: "px-6 py-2.5 text-xs tracking-wider",
    lg: "px-8 py-3.5 text-sm tracking-widest"
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
