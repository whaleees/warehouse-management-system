"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import DashboardShell from "@/components/layout/dashboard-shell";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import StatusBadge from "@/components/ui/status-badge";
import LoadingState from "@/components/ui/loading-state";
import EmptyState from "@/components/ui/empty-state";
import { api } from "@/lib/api";
import { useRole } from "@/lib/roles";
import { formatDate } from "@/lib/format";
import { Truck, ArrowRight, Plus } from "lucide-react";
import ReceiveModal from "./receive-modal";

type GRStatus = "PENDING" | "RECEIVED";

interface InboundRow {
  id: string;
  receiptNumber: string;
  status: GRStatus;
  receivedAt: string;
  purchaseOrder?: {
    id: string;
    orderNumber: string;
    supplier?: {
      id: string;
      name: string;
      code: string;
    };
  };
}

export default function InboundListPage() {
  const router = useRouter();
  const { can } = useRole();

  const [rows, setRows] = useState<InboundRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [receiving, setReceiving] = useState(false);

  async function loadInbound() {
    try {
      const res = await api("/inbound");
      const list: InboundRow[] = Array.isArray(res)
        ? res
        : Array.isArray(res.data)
        ? res.data
        : [];

      setRows(list);
    } catch (err) {
      console.error("Inbound list API error:", err);
      setRows([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadInbound();
  }, []);

  return (
    <DashboardShell>
      <div className="space-y-8">

        {/* HEADER */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-[var(--muted-foreground)]">
              <Truck size={20} />
            </span>

            <div>
              <h1 className="text-2xl font-semibold text-[var(--foreground)]">
                Goods receipts
              </h1>
              <p
                className="mt-1 text-sm text-[var(--muted-foreground)]"
                title="A goods receipt (GRN) records the items that physically arrived from a purchase order."
              >
                Record deliveries as they arrive against your purchase orders.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => router.push("/purchase-orders")}
            >
              Purchase orders
              <ArrowRight size={16} />
            </Button>

            {can("receive:goods") && (
              <Button variant="primary" onClick={() => setReceiving(true)}>
                <Plus size={16} /> Receive a delivery
              </Button>
            )}
          </div>
        </div>

        {/* TABLE */}
        <Card className="overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--muted)] text-xs font-medium text-[var(--muted-foreground)]">
              <tr>
                <th
                  className="px-4 py-3 text-left"
                  title="Goods receipt note: the record of what arrived."
                >
                  Receipt
                </th>
                <th className="px-4 py-3 text-left">Purchase order</th>
                <th className="px-4 py-3 text-left">Supplier</th>
                <th className="px-4 py-3 text-left">Received</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Open</th>
              </tr>
            </thead>

            <tbody>
              {/* LOADING */}
              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-6">
                    <LoadingState message="Loading goods receipts…" />
                  </td>
                </tr>
              )}

              {/* EMPTY */}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <EmptyState message="No goods receipts yet. When a delivery arrives, start a receipt here." />
                      {can("receive:goods") && (
                        <Button
                          variant="primary"
                          onClick={() => setReceiving(true)}
                        >
                          <Plus size={16} /> Receive a delivery
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              )}

              {/* ROWS */}
              {!loading &&
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="cursor-pointer border-t border-[var(--border)] transition-colors hover:bg-[var(--bg-hover)]"
                    onClick={() => router.push(`/inbound/${row.id}`)}
                  >
                    <td className="px-4 py-3 font-semibold text-[var(--foreground)]">
                      {row.receiptNumber}
                    </td>

                    <td className="px-4 py-3 text-[var(--foreground)]">
                      {row.purchaseOrder?.orderNumber ?? "—"}
                    </td>

                    <td className="px-4 py-3 text-[var(--muted-foreground)]">
                      {row.purchaseOrder?.supplier?.name ?? "—"}
                    </td>

                    <td className="px-4 py-3 text-[var(--muted-foreground)]">
                      {formatDate(row.receivedAt)}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <StatusBadge kind="gr" status={row.status} />
                    </td>

                    <td className="px-4 py-3 text-right text-[var(--muted-foreground)]">
                      <ArrowRight size={16} className="inline-block" />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </Card>

      </div>

      {receiving && <ReceiveModal onClose={() => setReceiving(false)} />}
    </DashboardShell>
  );
}
