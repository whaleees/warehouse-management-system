"use client";

import React from "react";
import { Loader2 } from "lucide-react";

type Variant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "success"
  | "white";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Shows a spinner and disables the button. */
  loading?: boolean;
}

export default function Button({
  children,
  className = "",
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] disabled:opacity-50 disabled:cursor-not-allowed";

  // Generous touch targets (≥40px on md) for tablet use.
  const sizes: Record<Size, string> = {
    lg: "min-h-12 px-6 text-base",
    md: "min-h-10 px-4 text-sm",
    sm: "min-h-9 px-3 text-sm",
  };

  const styles: Record<Variant, string> = {
    primary:
      "bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)]",
    secondary:
      "bg-[var(--secondary)] text-[var(--secondary-foreground)] border border-[var(--border)] hover:bg-[var(--bg-hover)]",
    outline:
      "bg-transparent border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--bg-hover)]",
    ghost:
      "bg-transparent text-[var(--muted-foreground)] hover:bg-[var(--bg-hover)] hover:text-[var(--foreground)]",
    danger:
      "bg-[var(--danger)] text-[var(--danger-foreground)] hover:brightness-110",
    success:
      "bg-[var(--success)] text-[var(--success-foreground)] hover:brightness-110",
    white:
      "bg-[var(--secondary)] text-[var(--secondary-foreground)] border border-[var(--border)] hover:bg-[var(--bg-hover)]",
  };

  return (
    <button
      className={`${base} ${sizes[size]} ${styles[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
}
