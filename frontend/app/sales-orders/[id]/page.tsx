"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import DashboardShell from "@/components/layout/dashboard-shell";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import StatusBadge from "@/components/ui/status-badge";
import { api } from "@/lib/api";
import { formatDate, formatIDR } from "@/lib/format";
import { useRole } from "@/lib/roles";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import LoadingState from "@/components/ui/loading-state";
import ErrorState from "@/components/ui/error-state";

import { ArrowLeft, Package, Truck, CheckCircle2, User2 } from "lucide-react";

export default function SalesOrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const { can } = useRole();

  const [so, setSo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  async function loadSO() {
    try {
      const data = await api(`/sales-order/${id}`);
      setSo(data);
    } catch (err) {
      console.error("Load SO failed:", err);
      setSo(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadSO();
  }, [id]);

  async function approveSO() {
    const ok = await confirm({
      title: "Approve this sales order?",
      description:
        "Once approved, the order is locked for shipping and the items can't be edited.",
      confirmLabel: "Approve order",
      onConfirm: async () => {
        try {
          await api(`/sales-order/${id}/approve`, { method: "POST" });
        } catch {
          throw new Error("Couldn't approve the order. Try again.");
        }
      },
    });

    // Only refresh + confirm to the user when approval actually went through.
    if (!ok) return;
    await loadSO();
    toast.success("Sales order approved.");
  }

  async function startShipment() {
    setActing(true);

    try {
      const res = await api(`/shipment`, {
        method: "POST",
        body: JSON.stringify({ salesOrderId: id }),
      });

      router.push(`/shipments/${res.id}`);
    } catch (err) {
      console.error("Start shipment failed:", err);
      toast.error("Couldn't start the shipment. Try again.");
      setActing(false);
    }
  }

  if (loading)
    return (
      <DashboardShell>
        <LoadingState message="Loading sales order…" />
      </DashboardShell>
    );

  if (!so)
    return (
      <DashboardShell>
        <ErrorState message="We couldn't find that sales order." />
      </DashboardShell>
    );

  return (
    <DashboardShell>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            className="rounded-lg p-2 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--foreground)]"
            onClick={() => router.push("/sales-orders")}
            aria-label="Back to sales orders"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-[var(--foreground)]">
              {so.orderNumber}
            </h1>
            <StatusBadge kind="salesOrder" status={so.status} />
          </div>
        </div>

        {/* Summary */}
        <Card>
          <div className="flex flex-col gap-1 text-sm">
            <span className="flex items-center gap-1 text-[var(--muted-foreground)]">
              <User2 size={14} />
              Customer
            </span>
            <span className="font-medium text-[var(--foreground)]">
              {so.customer?.name ?? "-"}
            </span>
            {so.customer?.code && (
              <span className="text-xs text-[var(--muted-foreground)]">
                Code: {so.customer.code}
              </span>
            )}

            <div className="mt-3">
              <p className="text-xs text-[var(--muted-foreground)]">
                Order date
              </p>
              <p className="font-medium text-[var(--foreground)]">
                {formatDate(so.orderDate)}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-5 flex gap-3">
            {so.status === "DRAFT" && can("manage:business") && (
              <Button
                variant="primary"
                onClick={approveSO}
                disabled={acting}
              >
                <CheckCircle2 size={16} />
                Approve order
              </Button>
            )}

            {(so.status === "PENDING" ||
              so.status === "PARTIALLY_SHIPPED") &&
              can("manage:business") && (
              <Button
                variant="primary"
                onClick={startShipment}
                loading={acting}
              >
                <Truck size={16} />
                Start shipment
              </Button>
            )}
          </div>
        </Card>

        {/* Items */}
        <Card className="p-0 overflow-hidden">
          <div className="border-b border-[var(--border)] px-5 py-3">
            <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--card-foreground)]">
              <Package size={18} /> Items
            </h2>
          </div>

          {so.items.length === 0 ? (
            <p className="px-5 py-6 text-sm text-[var(--muted-foreground)]">
              This order has no items yet.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-[var(--muted)] text-left text-xs font-medium text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-5 py-3">Product</th>
                  <th className="px-5 py-3 text-right">Qty</th>
                  <th className="px-5 py-3 text-right">Unit price</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[var(--border)]">
                {so.items.map((it: any) => (
                  <tr
                    key={it.id}
                    className="transition-colors hover:bg-[var(--bg-hover)]"
                  >
                    <td className="px-5 py-3 text-[var(--foreground)]">
                      {it.product.name}
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-[var(--foreground)]">
                      {it.quantity}
                    </td>
                    <td className="px-5 py-3 text-right text-[var(--foreground)]">
                      {formatIDR(Number(it.unitPrice))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        {/* Shipments */}
        <Card>
          <h2 className="mb-3 text-base font-semibold text-[var(--card-foreground)]">
            Shipments
          </h2>

          {!so.shipments || so.shipments.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              No shipments yet. Approve the order, then use Start shipment to send stock to the customer.
            </p>
          ) : (
            <div className="space-y-2 text-sm">
              {so.shipments.map((sh: any) => (
                <div
                  key={sh.id}
                  className="cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--muted)] p-3 text-[var(--foreground)] transition-colors hover:bg-[var(--bg-hover)]"
                  onClick={() => router.push(`/shipments/${sh.id}`)}
                >
                  <span className="font-medium">{sh.shipmentNumber}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </DashboardShell>
  );
}
