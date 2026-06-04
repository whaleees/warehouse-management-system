/**
 * Inline empty placeholder. Renders a single <p> with the given message,
 * matching the existing empty-placeholder markup.
 */
export default function EmptyState({
  message = "No data found.",
  className = "text-sm text-[var(--text-muted)]",
}: {
  message?: string;
  className?: string;
}) {
  return <p className={className}>{message}</p>;
}
