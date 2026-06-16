"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import LoadingState from "@/components/ui/loading-state";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { formatDateOnly } from "@/lib/format";
import { Building2, ClipboardList, ArrowRight } from "lucide-react";

type OrderStatus =
  | "DRAFT"
  | "PENDING"
  | "PARTIALLY_RECEIVED"
  | "RECEIVED"
  | "CANCELLED";

interface ReceivablePurchaseOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  orderDate: string;
  expectedDate?: string;
  supplier?: { name: string; code: string };
  items?: { quantity: number }[];
}

interface ReceiveModalProps {
  onClose: () => void;
}

// Only orders that have been approved but aren't fully received can take a
// new goods receipt — matches the PO detail page's `canStartInbound`.
const RECEIVABLE: OrderStatus[] = ["PENDING", "PARTIALLY_RECEIVED"];

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Awaiting delivery",
  PARTIALLY_RECEIVED: "Partly received",
};

export default function ReceiveModal({ onClose }: ReceiveModalProps) {
  const router = useRouter();
  const toast = useToast();

  const [orders, setOrders] = useState<ReceivablePurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingId, setStartingId] = useState<string | null>(null);

  async function loadOrders() {
    try {
      const data = await api("/purchase-order");
      const list: ReceivablePurchaseOrder[] = Array.isArray(data) ? data : [];
      setOrders(list.filter((po) => RECEIVABLE.includes(po.status)));
    } catch (err) {
      console.error("PO list error:", err);
      setOrders([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadOrders();
  }, []);

  async function startReceiving(po: ReceivablePurchaseOrder) {
    setStartingId(po.id);
    try {
      const gr = await api("/inbound/start", {
        method: "POST",
        body: JSON.stringify({ purchaseOrderId: po.id }),
      });
      router.push(`/inbound/${gr.id}`);
    } catch (err) {
      console.error("Start inbound failed:", err);
      toast.error("Couldn't start receiving for this order. Try again.");
      setStartingId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <Card className="flex max-h-[85vh] w-full max-w-lg flex-col gap-5 p-0">
        {/* HEADER */}
        <div className="border-b border-[var(--border)] px-6 pt-6 pb-4">
          <h1 className="text-lg font-semibold text-[var(--card-foreground)]">
            Receive a delivery
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Pick the purchase order the delivery arrived for. We&apos;ll open a
            new goods receipt so you can record what came in.
          </p>
        </div>

        {/* BODY */}
        <div className="min-h-[8rem] flex-1 overflow-y-auto px-6">
          {loading ? (
            <LoadingState message="Loading purchase orders…" />
          ) : orders.length === 0 ? (
            <div className="space-y-3 py-6 text-center">
              <p className="text-sm text-[var(--foreground)]">
                No purchase orders are ready to receive.
              </p>
              <p className="text-sm text-[var(--muted-foreground)]">
                A purchase order must be approved before its delivery can be
                received.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/purchase-orders")}
              >
                <ClipboardList size={16} /> Go to purchase orders
              </Button>
            </div>
          ) : (
            <ul className="space-y-2 py-1">
              {orders.map((po) => {
                const totalQty =
                  po.items?.reduce((sum, it) => sum + (it.quantity ?? 0), 0) ??
                  0;
                const busy = startingId === po.id;

                return (
                  <li key={po.id}>
                    <button
                      type="button"
                      disabled={startingId !== null}
                      onClick={() => startReceiving(po)}
                      className="flex w-full items-center justify-between gap-3 rounded-lg border border-[var(--border)] px-4 py-3 text-left transition-colors hover:bg-[var(--bg-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-[var(--foreground)]">
                          {po.orderNumber}
                        </p>
                        <p className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                          <Building2 size={12} />
                          {po.supplier?.name ?? "—"}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                          {STATUS_LABEL[po.status] ?? po.status}
                          {" · "}
                          {totalQty} unit(s)
                          {po.expectedDate
                            ? ` · expected ${formatDateOnly(po.expectedDate)}`
                            : ""}
                        </p>
                      </div>
                      <span className="shrink-0 text-[var(--muted-foreground)]">
                        {busy ? "Opening…" : <ArrowRight size={16} />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex justify-end gap-3 border-t border-[var(--border)] px-6 pt-4 pb-6">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={startingId !== null}
          >
            Cancel
          </Button>
        </div>
      </Card>
    </div>
  );
}
