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
  const base = "px-2 py-[2px] rounded-full text-[11px] font-medium border";

  const styles =
    color === "success"
      ? "border-emerald-500/40 text-emerald-300 bg-emerald-500/10"
      : color === "warning"
        ? "border-amber-500/40 text-amber-300 bg-amber-500/10"
        : color === "danger"
          ? "border-red-500/40 text-red-300 bg-red-500/10"
          : "border-[var(--border)] text-[var(--text-muted)] bg-[#0e1014]";

  return <span className={`${base} ${styles} ${className}`}>{children}</span>;
}
