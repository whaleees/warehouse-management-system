"use client";

import React from "react";

type Variant = "primary" | "ghost" | "danger" | "outline" | "white";
type Size = "sm" | "md";

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export default function Button({
  children,
  className = "",
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed";

  const sizes: Record<Size, string> = {
    md: "px-4 py-2 text-sm",
    sm: "px-3 py-1.5 text-xs",
  };

  const styles: Record<Variant, string> = {
    primary:
      "bg-[var(--accent)] text-black hover:bg-emerald-400 focus:ring-[var(--accent)]",
    ghost:
      "bg-transparent text-[var(--text-muted)] hover:bg-[var(--bg-hover)] focus:ring-[var(--border-subtle)]",
    danger:
      "bg-[var(--danger)] text-black hover:bg-red-400 focus:ring-[var(--danger)]",
    outline:
      "bg-transparent border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)] focus:ring-[var(--border-subtle)]",
    white:
      "bg-white text-black hover:bg-gray-200 focus:ring-white",
  };

  return (
    <button
      className={`${base} ${sizes[size]} ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
