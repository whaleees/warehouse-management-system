"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardShell from "@/components/layout/dashboard-shell";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import StatusBadge from "@/components/ui/status-badge";
import { api } from "@/lib/api";
import { formatDate, formatIDR } from "@/lib/format";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import LoadingState from "@/components/ui/loading-state";
import EmptyState from "@/components/ui/empty-state";
import { usePurchaseOrderDetail } from "./use-purchase-order-detail";
import { useRole } from "@/lib/roles";
import {
  ArrowLeft,
  Building2,
  Clock3,
  FileText,
  Truck,
  CheckCircle2,
  XCircle,
  PackageOpen,
  Plus,
  Lightbulb,
} from "lucide-react";

const STEP_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PENDING: "Awaiting approval",
  PARTIALLY_RECEIVED: "Partly received",
  RECEIVED: "Received",
};

type GuidanceTone = "info" | "success" | "danger";

const STATUS_GUIDANCE: Record<
  string,
  { tone: GuidanceTone; title: string; body: string }
> = {
  DRAFT: {
    tone: "info",
    title: "This order is still a draft",
    body: "Add the items you're ordering, then approve it to start receiving goods.",
  },
  PENDING: {
    tone: "info",
    title: "Approved and waiting for delivery",
    body: "When the goods arrive at the warehouse, choose Receive goods to record what came in.",
  },
  PARTIALLY_RECEIVED: {
    tone: "info",
    title: "Some items received",
    body: "Keep going — choose Receive goods again when the rest of the delivery arrives.",
  },
  RECEIVED: {
    tone: "success",
    title: "All items received",
    body: "Everything on this order has arrived. There's nothing left to do here.",
  },
  CANCELLED: {
    tone: "danger",
    title: "This order was cancelled",
    body: "It's closed and can't be received or reopened.",
  },
};

export default function PurchaseOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const toast = useToast();
  const confirm = useConfirm();
  const { can } = useRole();

  const { po, loading, totals, reload: loadPo } = usePurchaseOrderDetail(id);
  const [acting, setActing] = useState(false);

  async function approvePo() {
    if (!po) return;
    const ok = await confirm({
      title: "Approve this purchase order?",
      description:
        "Approving locks the order and lets goods be received against it. You won't be able to edit the items afterwards.",
      confirmLabel: "Approve order",
      onConfirm: async () => {
        try {
          await api(`/purchase-order/${po.id}/approve`, { method: "POST" });
        } catch {
          throw new Error("Couldn't approve the order. Try again.");
        }
      },
    });
    if (ok) {
      await loadPo();
      toast.success("Purchase order approved. You can now receive goods against it.");
    }
  }

  async function cancelPo() {
    if (!po) return;
    const ok = await confirm({
      title: "Cancel this purchase order?",
      description:
        "The order will be closed and can't be received or reopened. This can't be undone.",
      confirmLabel: "Cancel order",
      tone: "danger",
      onConfirm: async () => {
        try {
          await api(`/purchase-order/${po.id}/cancel`, { method: "POST" });
        } catch {
          throw new Error("Couldn't cancel the order. Try again.");
        }
      },
    });
    if (ok) {
      await loadPo();
      toast.success("Purchase order cancelled.");
    }
  }

  async function startInbound() {
    if (!po) return;
    setActing(true);
    try {
      const gr = await api("/inbound/start", {
        method: "POST",
        body: JSON.stringify({ purchaseOrderId: po.id }),
      });

      router.push(`/inbound/${gr.id}`);
    } catch (err) {
      console.error("Start inbound failed:", err);
      toast.error("Couldn't start receiving for this order. Try again.");
    }
    setActing(false);
  }

  if (loading) {
    return (
      <DashboardShell>
        <LoadingState message="Loading purchase order…" />
      </DashboardShell>
    );
  }

  if (!po) {
    return (
      <DashboardShell>
        <EmptyState message="We couldn't find this purchase order." />
      </DashboardShell>
    );
  }

  const canApprove = po.status === "DRAFT";
  const canEditItems = po.status === "DRAFT" || po.status === "PENDING";
  const canStartInbound =
    po.status === "PENDING" || po.status === "PARTIALLY_RECEIVED";
  const canCancel = po.status === "DRAFT" || po.status === "PENDING";

  // Receiving goods is the recommended next step once the order is approved,
  // so emphasise that button as primary for those statuses.
  const inboundIsPrimary = canStartInbound;

  const guidance = STATUS_GUIDANCE[po.status];
  const guidanceChipClass =
    guidance?.tone === "success"
      ? "icon-chip-green"
      : guidance?.tone === "danger"
      ? "icon-chip-red"
      : "icon-chip-blue";
  const GuidanceIcon =
    guidance?.tone === "success"
      ? CheckCircle2
      : guidance?.tone === "danger"
      ? XCircle
      : Lightbulb;

  return (
    <DashboardShell>
      <div className="space-y-8">
        {/* HEADER */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              className="p-2 hover:bg-[var(--bg-hover)] rounded-lg transition"
              onClick={() => router.push("/purchase-orders")}
              aria-label="Back to purchase orders"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold text-[var(--foreground)]">
                  {po.orderNumber}
                </h1>
                <StatusBadge kind="order" status={po.status} />
              </div>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">
                Created on {formatDate(po.orderDate)}
              </p>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex flex-wrap gap-3 justify-end">

            {/* EDIT ITEMS */}
            {canEditItems && can("manage:business") && (
              <Button
                variant="outline"
                onClick={() =>
                  router.push(`/purchase-orders/${po.id}/edit-items`)
                }
              >
                <PackageOpen size={16} /> Edit items
              </Button>
            )}

            {/* START INBOUND */}
            {canStartInbound && can("receive:goods") && (
              <Button
                variant={inboundIsPrimary ? "primary" : "outline"}
                onClick={startInbound}
                disabled={acting}
              >
                <Truck size={16} /> Receive goods
              </Button>
            )}

            {/* CANCEL */}
            {canCancel && can("manage:business") && (
              <Button
                variant="danger"
                onClick={cancelPo}
                disabled={acting}
              >
                <XCircle size={16} /> Cancel order
              </Button>
            )}

            {/* APPROVE (primary action) */}
            {canApprove && can("manage:business") && (
              <Button
                variant="primary"
                onClick={approvePo}
                disabled={acting}
              >
                <CheckCircle2 size={16} /> Approve order
              </Button>
            )}

          </div>
        </div>

        {/* WHAT TO DO NEXT */}
        {guidance && (
          <Card className="flex items-start gap-4">
            <div className={`icon-chip ${guidanceChipClass} h-11 w-11 shrink-0`}>
              <GuidanceIcon size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--card-foreground)]">
                {guidance.title}
              </p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                {guidance.body}
              </p>

              {/* Recommended next action, repeated here so it's easy to find */}
              {canApprove && can("manage:business") && (
                <Button
                  variant="primary"
                  size="sm"
                  className="mt-3"
                  onClick={approvePo}
                  disabled={acting}
                >
                  <CheckCircle2 size={16} /> Approve order
                </Button>
              )}
              {canStartInbound && can("receive:goods") && (
                <Button
                  variant="primary"
                  size="sm"
                  className="mt-3"
                  onClick={startInbound}
                  disabled={acting}
                >
                  <Truck size={16} /> Receive goods
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* SUPPLIER + TIMELINE */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* SUPPLIER CARD */}
          <Card>
            <h2 className="text-base font-semibold mb-4 flex items-center gap-2 text-[var(--card-foreground)]">
              <Building2 size={16} /> Supplier
            </h2>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">Name</span>
                <span className="font-medium text-[var(--foreground)]">{po.supplier?.name}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">Code</span>
                <span className="font-medium text-[var(--foreground)]">{po.supplier?.code}</span>
              </div>
            </div>

            <div className="mt-6 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)] flex items-center gap-1">
                  <Clock3 size={14} /> Expected date
                </span>
                <span className="font-medium text-[var(--foreground)]">
                  {po.expectedDate ? formatDate(po.expectedDate) : "-"}
                </span>
              </div>
            </div>

            <div className="mt-6 border-t border-[var(--border)] pt-4 space-y-1 text-sm text-[var(--muted-foreground)]">
              <p>Lines: {totals.lineCount}</p>
              <p>Total quantity: {totals.totalQty}</p>
              <p>
                Estimated amount:{" "}
                <span className="text-[var(--foreground)]">{formatIDR(totals.totalAmount)}</span>
              </p>
            </div>
          </Card>

          {/* TIMELINE */}
          <Card className="lg:col-span-2">
            <h2 className="text-base font-semibold mb-4 text-[var(--card-foreground)]">
              Order progress
            </h2>

            <div className="flex items-center justify-between gap-0 mt-2 w-full">
              {["DRAFT", "PENDING", "PARTIALLY_RECEIVED", "RECEIVED"].map(
                (step, idx, arr) => {
                  const stepIndex = idx;
                  const currentIndex = arr.indexOf(po.status);

                  const isCurrent = currentIndex === stepIndex;
                  const isDone = currentIndex > stepIndex;

                  const bubbleClass = isCurrent
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                    : isDone
                    ? "bg-[var(--success)] text-[var(--success-foreground)]"
                    : "bg-[var(--muted)] text-[var(--muted-foreground)]";

                  const labelClass = isCurrent
                    ? "text-[var(--foreground)] font-medium"
                    : isDone
                    ? "text-[var(--foreground)]"
                    : "text-[var(--muted-foreground)]";

                  const lineClass =
                    idx < arr.length - 1
                      ? isDone
                        ? "bg-[var(--success)]"
                        : "bg-[var(--border)]"
                      : "";

                  return (
                    <div key={step} className="flex items-center flex-1 gap-0 w-full">

                      {/* CIRCLE + LABEL */}
                      <div className="flex flex-col items-center w-32 select-none">
                        <div
                          className={`
                            w-8 h-8 rounded-full flex items-center justify-center
                            text-xs font-semibold
                            transition-all border border-[var(--border)]
                            ${bubbleClass}
                          `}
                        >
                          {idx + 1}
                        </div>

                        <span
                          className={`mt-1 text-xs text-center ${labelClass}`}
                        >
                          {STEP_LABELS[step]}
                        </span>
                      </div>

                      {/* PROGRESS LINE */}
                      {idx < arr.length - 1 && (
                        <div className={`flex-1 h-[2px] mx-2 ${lineClass}`} />
                      )}
                    </div>
                  );
                }
              )}
            </div>
          </Card>
        </div>

        {/* ITEMS + GOODS RECEIPTS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ORDER ITEMS */}
          <Card className="p-0 lg:col-span-2 overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-[var(--muted-foreground)]" />
                <h2 className="text-base font-semibold text-[var(--card-foreground)]">
                  Order items
                </h2>
              </div>

              {canEditItems && can("manage:business") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    router.push(`/purchase-orders/${po.id}/edit-items`)
                  }
                >
                  <PackageOpen size={14} /> Edit items
                </Button>
              )}
            </div>

            <table className="w-full text-sm">
              <thead className="bg-[var(--muted)] text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium">Product</th>
                  <th className="px-4 py-3 text-right text-xs font-medium">Ordered</th>
                  <th className="px-4 py-3 text-right text-xs font-medium">Received</th>
                  <th className="px-4 py-3 text-right text-xs font-medium">Remaining</th>
                  <th className="px-4 py-3 text-right text-xs font-medium">Unit price</th>
                  <th className="px-4 py-3 text-right text-xs font-medium">Line total</th>
                </tr>
              </thead>

              <tbody>
                {po.items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-center py-4 text-[var(--muted-foreground)]"
                    >
                      No items yet. Add items with the Edit items button above.
                    </td>
                  </tr>
                ) : (
                  po.items.map((it) => {
                    const price = Number(it.unitPrice ?? 0);
                    const lineTotal = price * it.quantity;

                    // SUM RECEIVED QTY
                    let receivedQty = 0;
                    if (it.receiptLines && Array.isArray(it.receiptLines)) {
                      receivedQty = it.receiptLines.reduce(
                        (sum, rl) => sum + (rl.quantity ?? 0),
                        0
                      );
                    }

                    const remainingQty = it.quantity - receivedQty;
                    const allReceived = remainingQty <= 0;

                    return (
                      <tr
                        key={it.id}
                        className={`
                          border-t border-[var(--border)] hover:bg-[var(--bg-hover)] transition
                          ${allReceived ? "opacity-60" : ""}
                        `}
                      >
                        {/* PRODUCT */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col cursor-pointer"
                               onClick={() => router.push(`/products/${it.product?.id}`)}>
                            <span className="font-medium text-[var(--foreground)]">{it.product?.name}</span>
                            <span
                              className="text-xs text-[var(--muted-foreground)]"
                              title="SKU: the product's stock-keeping number"
                            >
                              Item code: {it.product?.sku}
                            </span>
                          </div>
                        </td>

                        {/* ORDERED QTY */}
                        <td className="px-4 py-3 text-right text-[var(--foreground)]">
                          {it.quantity} {it.product?.uom}
                        </td>

                        {/* RECEIVED QTY */}
                        <td className="px-4 py-3 text-right">
                          <span className={receivedQty > 0 ? "text-[var(--success-text)]" : "text-[var(--muted-foreground)]"}>
                            {receivedQty}
                          </span>
                        </td>

                        {/* REMAINING QTY */}
                        <td className="px-4 py-3 text-right">
                          <span className={remainingQty > 0 ? "text-[var(--warning-text)]" : "text-[var(--success-text)]"}>
                            {remainingQty}
                          </span>
                        </td>

                        {/* UNIT PRICE */}
                        <td className="px-4 py-3 text-right text-[var(--foreground)]">
                          {formatIDR(price)}
                        </td>

                        {/* LINE TOTAL */}
                        <td className="px-4 py-3 text-right text-[var(--foreground)]">
                          {formatIDR(lineTotal)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </Card>

          {/* GOODS RECEIPTS */}
          <Card className="p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck size={16} className="text-[var(--muted-foreground)]" />
                <h2
                  className="text-base font-semibold text-[var(--card-foreground)]"
                  title="A goods receipt records the stock that physically arrived for this order."
                >
                  Goods receipts
                </h2>
              </div>

              {canStartInbound && can("receive:goods") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={startInbound}
                  disabled={acting}
                >
                  <Plus size={14} /> Receive
                </Button>
              )}
            </div>

            {po.goodsReceipts.length === 0 ? (
              <div className="px-5 py-4 text-sm text-[var(--muted-foreground)]">
                No goods received yet for this order.
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)] text-sm">
                {po.goodsReceipts.map((gr) => (
                  <div
                    key={gr.id}
                    className="px-5 py-3 flex items-center justify-between hover:bg-[var(--bg-hover)] cursor-pointer transition"
                    onClick={() => router.push(`/inbound/${gr.id}`)}
                  >
                    <div>
                      <p className="font-semibold text-[var(--foreground)]">{gr.receiptNumber}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {formatDate(gr.receivedAt)}
                      </p>
                    </div>
                    <StatusBadge kind="gr" status={gr.status} />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
