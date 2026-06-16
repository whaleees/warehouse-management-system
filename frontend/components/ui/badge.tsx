import { BadgeColor } from "@/lib/types";

export default function Badge({
  children,
  color = "default",
  className = "",
}: {
  children: React.ReactNode;
  color?: BadgeColor;
  className?: string;
}) {
  const base =
    "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border";

  const styles =
    color === "success"
      ? "border-[var(--success-border)] text-[var(--success-text)] bg-[var(--success-bg)]"
      : color === "warning"
        ? "border-[var(--warning-border)] text-[var(--warning-text)] bg-[var(--warning-bg)]"
        : color === "danger"
          ? "border-[var(--danger-border)] text-[var(--danger-text)] bg-[var(--danger-bg)]"
          : "border-[var(--border)] text-[var(--muted-foreground)] bg-[var(--muted)]";

  return <span className={`${base} ${styles} ${className}`}>{children}</span>;
}
