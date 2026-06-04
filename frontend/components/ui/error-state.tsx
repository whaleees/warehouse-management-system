/**
 * Inline error placeholder. Renders a single <p> with the given message.
 */
export default function ErrorState({
  message = "Something went wrong.",
  className = "text-sm text-[var(--danger)]",
}: {
  message?: string;
  className?: string;
}) {
  return <p className={className}>{message}</p>;
}
