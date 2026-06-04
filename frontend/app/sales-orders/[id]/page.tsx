"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import DashboardShell from "@/components/layout/dashboard-shell";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { salesOrderStatusColor } from "@/lib/status";
import LoadingState from "@/components/ui/loading-state";
import EmptyState from "@/components/ui/empty-state";

import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle2,
  User2,
} from "lucide-react";

export default function SalesOrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();

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
    if (!confirm("Approve this Sales Order?")) return;
    setActing(true);

    try {
      await api(`/sales-order/${id}/approve`, { method: "POST" });
      await loadSO();
    } catch (err) {
      alert("Approve failed.");
    }

    setActing(false);
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
      alert("Failed to start shipment.");
    }

    setActing(false);
  }

  if (loading)
    return (
      <DashboardShell>
        <LoadingState className="text-sm text-[var(--text-muted)]" message="Loading..." />
      </DashboardShell>
    );

  if (!so)
    return (
      <DashboardShell>
        <EmptyState className="text-red-400" message="Sales Order not found." />
      </DashboardShell>
    );

  return (
    <DashboardShell>
      <div className="space-y-8">

        {/* HEADER */}
        <div className="flex items-center gap-3">
          <button
            className="p-2 hover:bg-[#1a1b1f] rounded-lg transition"
            onClick={() => router.push("/sales-orders")}
          >
            <ArrowLeft size={20} />
          </button>

          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-mono tracking-wide">
              {so.orderNumber}
            </h1>
            <Badge color={salesOrderStatusColor(so.status)}>{so.status}</Badge>
          </div>
        </div>

        {/* SUMMARY */}
        <Card className="p-5 bg-[#111217] border border-[#1c1d22]">
          <div className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--text-muted)] flex items-center gap-1">
              <User2 size={14} />
              Customer
            </span>
            <span className="font-medium text-sm">{so.customer?.name ?? "-"}</span>
            <span className="text-[10px] text-[var(--text-muted)]">
              Code: {so.customer?.code}
            </span>

            <div className="mt-3">
              <p className="text-[var(--text-muted)] text-xs">Order Date</p>
              <p className="font-medium text-sm">{formatDate(so.orderDate)}</p>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex gap-3 mt-5">
            {so.status === "DRAFT" && (
              <Button
                onClick={approveSO}
                disabled={acting}
                className="
                  bg-white text-black 
                  hover:bg-gray-200
                  font-mono tracking-wide
                  flex items-center gap-2
                "
              >
                <CheckCircle2 size={14} className="text-black" />
                Approve
              </Button>
            )}

            {(so.status === "PENDING" ||
              so.status === "PARTIALLY_SHIPPED") && (
              <Button
                onClick={startShipment}
                disabled={acting}
                className="
                  bg-white text-black 
                  hover:bg-gray-200
                  font-mono tracking-wide
                  flex items-center gap-2
                "
              >
                <Truck size={14} className="text-black" />
                Start Shipment
              </Button>
            )}
          </div>
        </Card>

        {/* ITEMS TABLE */}
        <Card className="p-0 bg-[#111217] border border-[#1c1d22] overflow-hidden">
          <div className="px-5 py-3 border-b border-[#1c1d22]">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Package size={16} /> Items
            </h2>
          </div>

          <table className="w-full text-xs">
            <thead className="bg-[#0e0f12] text-[var(--text-muted)] uppercase">
              <tr>
                <th className="px-5 py-3 text-left">Product</th>
                <th className="px-5 py-3 text-right">Qty</th>
                <th className="px-5 py-3 text-right">Unit Price</th>
              </tr>
            </thead>

            <tbody>
              {so.items.map((it: any) => (
                <tr
                  key={it.id}
                  className="border-t border-[#1c1d22] hover:bg-[#15171e] transition"
                >
                  <td className="px-5 py-3">{it.product.name}</td>
                  <td className="px-5 py-3 text-right font-medium">
                    {it.quantity}
                  </td>
                  <td className="px-5 py-3 text-right">{it.unitPrice}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* SHIPMENTS */}
        <Card className="p-5 bg-[#111217] border border-[#1c1d22]">
          <h2 className="text-sm font-semibold mb-3">Shipments</h2>

          {!so.shipments || so.shipments.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)]">No shipments.</p>
          ) : (
            <div className="space-y-2 text-xs">
              {so.shipments.map((sh: any) => (
                <div
                  key={sh.id}
                  className="
                    p-3 bg-[#15171e] border border-[#23252e]
                    rounded-lg cursor-pointer
                    hover:bg-[#1a1c24] transition
                  "
                  onClick={() => router.push(`/shipments/${sh.id}`)}
                >
                  <span className="font-mono">{sh.shipmentNumber}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </DashboardShell>
  );
}
