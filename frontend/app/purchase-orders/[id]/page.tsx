"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardShell from "@/components/layout/dashboard-shell";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import { api } from "@/lib/api";
import { formatDate, formatIDR } from "@/lib/format";
import { orderStatusColor, grStatusColor, OrderStatus } from "@/lib/status";
import LoadingState from "@/components/ui/loading-state";
import EmptyState from "@/components/ui/empty-state";
import { usePurchaseOrderDetail } from "./use-purchase-order-detail";
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
} from "lucide-react";

export default function PurchaseOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const { po, loading, totals, reload: loadPo } = usePurchaseOrderDetail(id);
  const [acting, setActing] = useState(false);

  async function approvePo() {
    if (!po) return;
    if (!confirm("Approve this purchase order?")) return;

    setActing(true);
    try {
      await api(`/purchase-order/${po.id}/approve`, { method: "POST" });
      await loadPo();
    } catch (err) {
      console.error("Approve PO failed:", err);
      alert("Failed to approve PO");
    }
    setActing(false);
  }

  async function cancelPo() {
    if (!po) return;
    if (!confirm("Cancel this purchase order?")) return;

    setActing(true);
    try {
      await api(`/purchase-order/${po.id}/cancel`, { method: "POST" });
      await loadPo();
    } catch (err) {
      console.error("Cancel PO failed:", err);
      alert("Failed to cancel PO");
    }
    setActing(false);
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
      alert("Failed to start inbound");
    }
    setActing(false);
  }

  if (loading) {
    return (
      <DashboardShell>
        <LoadingState className="text-sm text-[var(--text-muted)]" message="Loading purchase order..." />
      </DashboardShell>
    );
  }

  if (!po) {
    return (
      <DashboardShell>
        <EmptyState className="text-sm text-red-400" message="Purchase Order not found." />
      </DashboardShell>
    );
  }

  const canApprove = po.status === "DRAFT";
  const canEditItems = po.status === "DRAFT" || po.status === "PENDING";
  const canStartInbound =
    po.status === "PENDING" || po.status === "PARTIALLY_RECEIVED";
  const canCancel = po.status === "DRAFT" || po.status === "PENDING";

  return (
    <DashboardShell>
      <div className="space-y-8">
        {/* HEADER */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              className="p-2 hover:bg-[#1a1b1f] rounded-lg transition"
              onClick={() => router.push("/purchase-orders")}
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-mono tracking-widest">
                  {po.orderNumber}
                </h1>
                <Badge color={orderStatusColor(po.status)}>{po.status}</Badge>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1 font-mono tracking-wide">
                Created on {formatDate(po.orderDate)}
              </p>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex flex-wrap gap-3 justify-end">

            {/* EDIT ITEMS */}
            {canEditItems && (
              <button
                onClick={() =>
                  router.push(`/purchase-orders/${po.id}/edit-items`)
                }
                className="
                  px-4 py-2 rounded-lg bg-white text-black 
                  font-mono text-xs tracking-widest font-semibold
                  hover:bg-gray-200 transition flex items-center gap-2
                "
              >
                <PackageOpen size={14} /> EDIT ITEMS
              </button>
            )}

            {/* APPROVE */}
            {canApprove && (
              <button
                onClick={approvePo}
                disabled={acting}
                className="
                  px-4 py-2 rounded-lg bg-white text-black 
                  font-mono text-xs tracking-widest font-semibold
                  hover:bg-gray-200 transition flex items-center gap-2
                "
              >
                <CheckCircle2 size={14} /> APPROVE
              </button>
            )}

            {/* START INBOUND */}
            {canStartInbound && (
              <button
                onClick={startInbound}
                disabled={acting}
                className="
                  px-4 py-2 rounded-lg bg-white text-black 
                  font-mono text-xs tracking-widest font-semibold
                  hover:bg-gray-200 transition flex items-center gap-2
                "
              >
                <Truck size={14} /> START INBOUND
              </button>
            )}

            {/* CANCEL */}
            {canCancel && (
              <button
                onClick={cancelPo}
                disabled={acting}
                className="
                  px-4 py-2 rounded-lg bg-red-600 text-white 
                  font-mono text-xs tracking-widest font-semibold
                  hover:bg-red-500 transition flex items-center gap-2
                "
              >
                <XCircle size={14} /> CANCEL
              </button>
            )}

          </div>
        </div>

        {/* SUPPLIER + TIMELINE */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* SUPPLIER CARD */}
          <Card className="p-5 bg-[#111217] border border-[#1c1d22]">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2 font-mono tracking-widest">
              <Building2 size={16} /> SUPPLIER
            </h2>

            <div className="space-y-2 text-sm font-mono">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Name</span>
                <span className="font-medium">{po.supplier?.name}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Code</span>
                <span className="font-medium">{po.supplier?.code}</span>
              </div>
            </div>

            <div className="mt-6 space-y-2 text-sm font-mono">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)] flex items-center gap-1">
                  <Clock3 size={14} /> Expected Date
                </span>
                <span className="font-medium">
                  {po.expectedDate ? formatDate(po.expectedDate) : "-"}
                </span>
              </div>
            </div>

            <div className="mt-6 border-t border-[#1c1d22] pt-4 text-xs text-[var(--text-muted)] font-mono">
              <p>Lines: {totals.lineCount}</p>
              <p>Total Qty: {totals.totalQty}</p>
              <p>
                Est. Amount:{" "}
                {formatIDR(totals.totalAmount)}
              </p>
            </div>
          </Card>

          {/* TIMELINE */}
          <Card className="p-5 bg-[#111217] border border-[#1c1d22] lg:col-span-2">
            <h2 className="text-sm font-semibold mb-4 font-mono tracking-widest">
              ORDER STATUS TIMELINE
            </h2>

        <div className="flex items-center justify-between gap-0 mt-2 w-full">
          {["DRAFT", "PENDING", "PARTIALLY_RECEIVED", "RECEIVED"].map(
            (step, idx, arr) => {
              const s = step as OrderStatus;

              const stepIndex = idx;
              const currentIndex = arr.indexOf(po.status);

              const isCurrent = currentIndex === stepIndex;
              const isDone = currentIndex > stepIndex;

              const bubbleClass = isCurrent
                ? "bg-white text-black"                  
                : isDone
                ? "bg-white/60 text-white"               
                : "bg-[#1e2027] text-white/40";          

              const labelClass = isCurrent
                ? "text-white"
                : isDone
                ? "text-white/70"
                : "text-[var(--text-muted)]";

              const lineClass =
                idx < arr.length - 1
                  ? isDone
                    ? "bg-white"                          
                    : "bg-[#2a2c32]"                      
                  : "";

              return (
                <div key={step} className="flex items-center flex-1 gap-0 w-full">

                  {/* CIRCLE + LABEL */}
                  <div className="flex flex-col items-center w-32 select-none">
                    <div
                      className={`
                        w-8 h-8 rounded-full flex items-center justify-center 
                        text-[10px] font-semibold 
                        transition-all border border-white/10
                        ${bubbleClass}
                      `}
                    >
                      {idx + 1}
                    </div>

                    <span
                      className={`mt-1 text-[10px] uppercase tracking-wide text-center ${labelClass}`}
                    >
                      {step.replace("_", " ")}
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



            {po.status === "CANCELLED" && (
              <div className="mt-4 flex items-center gap-2 text-xs text-red-400 font-mono">
                <XCircle size={14} />
                <span>This purchase order has been cancelled.</span>
              </div>
            )}
          </Card>
        </div>

        {/* ITEMS + GOODS RECEIPTS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ORDER ITEMS */}
          <Card className="p-0 bg-[#111217] border border-[#1c1d22] lg:col-span-2 overflow-hidden">
            <div className="px-5 py-4 border-b border-[#1c1d22] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={16} />
                <h2 className="text-sm font-semibold font-mono tracking-widest">
                  ORDER ITEMS
                </h2>
              </div>

              {canEditItems && (
                <button
                  onClick={() =>
                    router.push(`/purchase-orders/${po.id}/edit-items`)
                  }
                  className="
                    px-3 py-1 rounded-lg bg-white text-black 
                    font-mono text-[10px] tracking-widest font-semibold
                    hover:bg-gray-200 transition flex items-center gap-1
                  "
                >
                  <PackageOpen size={12} /> MANAGE
                </button>
              )}
            </div>

            <table className="w-full text-xs font-mono tracking-wide">
<thead className="bg-[#0e0f12] text-gray-500">
  <tr>
    <th className="px-4 py-3 text-left">PRODUCT</th>
    <th className="px-4 py-3 text-right">QTY</th>
    <th className="px-4 py-3 text-right">RECEIVED</th>
    <th className="px-4 py-3 text-right">REMAINING</th>
    <th className="px-4 py-3 text-right">UNIT PRICE</th>
    <th className="px-4 py-3 text-right">LINE TOTAL</th>
  </tr>
</thead>

<tbody>
  {po.items.length === 0 ? (
    <tr>
      <td
        colSpan={5}
        className="text-center py-4 text-gray-500"
      >
        NO ITEMS.
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
            border-t border-[#1c1d22] hover:bg-[#15171e] transition
            ${allReceived ? "opacity-60" : ""}
          `}
        >
          {/* PRODUCT */}
          <td className="px-4 py-3">
            <div className="flex flex-col cursor-pointer" 
                 onClick={() => router.push(`/products/${it.product?.id}`)}>
              <span className="font-medium">{it.product?.name}</span>
              <span className="text-[10px] text-gray-500">
                SKU: {it.product?.sku}
              </span>
            </div>
          </td>

          {/* ORDERED QTY */}
          <td className="px-4 py-3 text-right">
            {it.quantity} {it.product?.uom}
          </td>

          {/* RECEIVED QTY */}
          <td className="px-4 py-3 text-right">
            <span className={receivedQty > 0 ? "text-emerald-400" : "text-gray-500"}>
              {receivedQty}
            </span>
          </td>

          {/* REMAINING QTY */}
          <td className="px-4 py-3 text-right">
            <span className={remainingQty > 0 ? "text-yellow-400" : "text-emerald-400"}>
              {remainingQty}
            </span>
          </td>

          {/* UNIT PRICE */}
          <td className="px-4 py-3 text-right">
            {formatIDR(price)}
          </td>

          {/* LINE TOTAL */}
          <td className="px-4 py-3 text-right">
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
          <Card className="p-0 bg-[#111217] border border-[#1c1d22] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#1c1d22] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck size={16} />
                <h2 className="text-sm font-semibold font-mono tracking-widest">
                  GOODS RECEIPTS
                </h2>
              </div>

              {canStartInbound && (
                <button
                  onClick={startInbound}
                  disabled={acting}
                  className="
                    px-3 py-1 rounded-lg bg-white text-black 
                    font-mono text-[10px] tracking-widest font-semibold
                    hover:bg-gray-200 transition flex items-center gap-1
                  "
                >
                  <Plus size={12} /> START
                </button>
              )}
            </div>

            {po.goodsReceipts.length === 0 ? (
              <div className="px-5 py-4 text-xs text-gray-500 font-mono">
                NO GOODS RECEIPTS.
              </div>
            ) : (
              <div className="divide-y divide-[#1c1d22] text-xs font-mono">
                {po.goodsReceipts.map((gr) => (
                  <div
                    key={gr.id}
                    className="px-5 py-3 flex items-center justify-between hover:bg-[#15171e] cursor-pointer transition"
                    onClick={() => router.push(`/inbound/${gr.id}`)}
                  >
                    <div>
                      <p className="font-semibold">{gr.receiptNumber}</p>
                      <p className="text-[10px] text-gray-500">
                        {formatDate(gr.receivedAt)}
                      </p>
                    </div>
                    <Badge color={grStatusColor(gr.status)}>
                      {gr.status}
                    </Badge>
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
