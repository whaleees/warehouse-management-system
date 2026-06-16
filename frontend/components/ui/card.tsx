import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export default function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`bg-[var(--card)] text-[var(--card-foreground)] border border-[var(--border)] rounded-2xl p-5 shadow-[var(--shadow-card)] ${className}`}
    >
      {children}
    </div>
  );
}
