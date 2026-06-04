/**
 * Inline loading placeholder. Renders a single <p> with the given message,
 * matching the existing detail-page loading markup.
 */
export default function LoadingState({
  message = "Loading...",
  className = "text-sm text-[var(--text-muted)]",
}: {
  message?: string;
  className?: string;
}) {
  return <p className={className}>{message}</p>;
}
