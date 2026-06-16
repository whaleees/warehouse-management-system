import Badge from "@/components/ui/badge";
import { statusMeta, StatusKind } from "@/lib/status";

/**
 * Renders a status enum as a color-coded badge with a plain-English label.
 * The raw status and its hint are exposed via the title tooltip.
 */
export default function StatusBadge({
  kind,
  status,
  className = "",
}: {
  kind: StatusKind;
  status?: string | null;
  className?: string;
}) {
  const meta = statusMeta(kind, status);
  return (
    <span title={meta.hint || undefined} className="inline-flex">
      <Badge color={meta.color} className={className}>
        {meta.label}
      </Badge>
    </span>
  );
}
