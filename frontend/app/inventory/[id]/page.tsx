"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardShell from "@/components/layout/dashboard-shell";
import Card from "@/components/ui/card";
import Badge from "@/components/ui/badge";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { ArrowLeft } from "lucide-react";

type MovementType = "INBOUND" | "OUTBOUND" | "TRANSFER" | "ADJUST";

export default function InventoryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [inv, setInv] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const [movements, setMovements] = useState<any[]>([]);
  const [movementLoading, setMovementLoading] = useState(true);

  async function loadInventory() {
    try {
      const data = await api(`/inventory/${id}`);
      setInv(data);
    } catch (err) {
      console.error("Inventory fetch failed:", err);
    }
    setLoading(false);
  }

  async function loadMovements() {
    try {
      const data = await api(`/inventory/${id}/movements`);
      setMovements(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Movement fetch failed:", err);
    }
    setMovementLoading(false);
  }

  useEffect(() => {
    loadInventory();
    loadMovements();
  }, []);

  if (loading) {
    return (
      <DashboardShell>
        <p className="text-sm text-[var(--muted-foreground)]">
          Loading inventory…
        </p>
      </DashboardShell>
    );
  }

  if (!inv) {
    return (
      <DashboardShell>
        <p className="text-sm text-[var(--danger)]">
          We couldn&apos;t find this inventory item.
        </p>
      </DashboardShell>
    );
  }

  // Plain-English label + status color for each movement type.
  const movementMeta: Record<
    MovementType,
    { label: string; color: "success" | "danger" | "default" | "warning" }
  > = {
    INBOUND: { label: "Stock in", color: "success" },
    OUTBOUND: { label: "Stock out", color: "danger" },
    TRANSFER: { label: "Moved", color: "default" },
    ADJUST: { label: "Adjusted", color: "warning" },
  };

  return (
    <DashboardShell>
      <div className="space-y-8">

        {/* HEADER */}
        <div className="flex items-center gap-3">
          <button
            className="rounded-lg p-2 transition-colors hover:bg-[var(--bg-hover)]"
            onClick={() => router.push("/inventory")}
            aria-label="Back to inventory"
          >
            <ArrowLeft size={20} className="text-[var(--muted-foreground)]" />
          </button>

          <div>
            <h1 className="text-2xl font-semibold text-[var(--foreground)]">
              {inv.product?.name}
            </h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Inventory details and stock history
            </p>
          </div>
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* PRODUCT INFO CARD */}
          <Card>
            <h2 className="mb-5 text-base font-semibold text-[var(--card-foreground)]">
              Product
            </h2>

            <div className="space-y-3 text-sm">
              <DetailRow label="Name" value={inv.product?.name} />
              <DetailRow label="Item code" value={inv.product?.sku} />
              <DetailRow label="Category" value={inv.product?.category} />
              <DetailRow label="Unit" value={inv.product?.uom} />
            </div>
          </Card>

          {/* INVENTORY DETAILS CARD */}
          <Card className="lg:col-span-2">
            <h2 className="mb-5 text-base font-semibold text-[var(--card-foreground)]">
              Stock
            </h2>

            <div className="space-y-3 text-sm">
              <DetailRow label="Batch" value={inv.batch?.code || "—"} />
              <DetailRow label="Location" value={inv.location?.code || "—"} />
              <DetailRow label="On hand" value={inv.quantity} />
              <DetailRow label="Reserved" value={inv.reservedQty} />
              <DetailRow
                label="Available"
                value={inv.quantity - inv.reservedQty}
              />
            </div>
          </Card>
        </div>

        {/* MOVEMENT HISTORY */}
        <Card>
          <h2 className="mb-5 text-base font-semibold text-[var(--card-foreground)]">
            Stock history
          </h2>

          {movementLoading ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              Loading stock history…
            </p>
          ) : movements.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              No stock movements yet for this item.
            </p>
          ) : (
            <div className="space-y-3">
              {movements.map(
                (m: { type: MovementType; quantity: number; [key: string]: any }) => {

                  const meta =
                    movementMeta[m.type as MovementType] ?? {
                      label: m.type || "Other",
                      color: "default" as const,
                    };

                  const qtyColor =
                    m.type === "INBOUND"
                      ? "text-[var(--success-text)]"
                      : m.type === "OUTBOUND"
                      ? "text-[var(--danger-text)]"
                      : "text-[var(--foreground)]";

                  const qtyPrefix =
                    m.type === "INBOUND" ? "+" :
                    m.type === "OUTBOUND" ? "-" : "";

                  const referenceLabel =
                    m.referenceType === "PO"
                      ? m.purchaseOrder?.orderNumber
                      : m.referenceType === "SO"
                      ? m.salesOrder?.orderNumber
                      : null;

                  return (
                    <div
                      key={m.id}
                      className="rounded-lg border border-[var(--border)] bg-[var(--muted)] p-4"
                    >
                      <div className="flex items-start justify-between">

                        {/* LEFT SECTION */}
                        <div className="space-y-1.5 text-sm">

                          {/* BADGE + TITLE */}
                          <div className="flex items-center gap-2">
                            <Badge color={meta.color}>{meta.label}</Badge>

                            <span className="font-medium text-[var(--foreground)]">
                              {m.type === "INBOUND" && "Received from a purchase order"}
                              {m.type === "OUTBOUND" && "Shipped to a customer"}
                              {m.type === "TRANSFER" && "Moved between locations"}
                              {m.type === "ADJUST" && "Stock adjustment"}
                            </span>
                          </div>

                          {/* QUANTITY */}
                          <div className={`font-semibold ${qtyColor}`}>
                            {qtyPrefix}{m.quantity} units
                          </div>

                          {/* REFERENCE */}
                          {referenceLabel && (
                            <div className="text-[var(--muted-foreground)]">
                              Reference: {referenceLabel}
                            </div>
                          )}

                          {/* TRANSFER ROUTE */}
                          {m.type === "TRANSFER" && (
                            <div className="text-[var(--muted-foreground)]">
                              {m.fromLocation?.code || "?"} → {m.toLocation?.code || "?"}
                            </div>
                          )}

                          {/* TIME */}
                          <div className="text-xs text-[var(--muted-foreground)]">
                            {formatDate(m.createdAt)}
                          </div>
                        </div>

                        {/* RIGHT SECTION: USER */}
                        <div className="text-right text-xs text-[var(--muted-foreground)]">
                          {m.user?.name || "System"}
                        </div>

                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </Card>

      </div>
    </DashboardShell>
  );
}

/* DETAIL ROW COMPONENT */
function DetailRow({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
      <span className="text-sm text-[var(--muted-foreground)]">
        {label}
      </span>
      <span className="font-medium text-[var(--foreground)]">{value}</span>
    </div>
  );
}
