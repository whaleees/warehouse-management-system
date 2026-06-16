"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/layout/dashboard-shell";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import StatusBadge from "@/components/ui/status-badge";
import { api } from "@/lib/api";
import { formatDateOnly } from "@/lib/format";
import { useRouter } from "next/navigation";
import { useRole } from "@/lib/roles";
import {
  Plus,
  ArrowRight,
  Building2,
  FileText,
  Clock3,
} from "lucide-react";

type OrderStatus =
  | "DRAFT"
  | "PENDING"
  | "PARTIALLY_RECEIVED"
  | "RECEIVED"
  | "CANCELLED";

interface PurchaseOrderItem {
  id: string;
  quantity: number;
  unitPrice: string;
  product?: { name: string; sku: string };
}

interface Supplier {
  id: string;
  name: string;
  code: string;
}

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  orderDate: string;
  expectedDate?: string;
  supplier: Supplier;
  items: PurchaseOrderItem[];
}

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const { can } = useRole();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadOrders() {
    try {
      const data = await api("/purchase-order");
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("PO list error:", err);
      setOrders([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadOrders();
  }, []);

  return (
    <DashboardShell>
      <div className="space-y-8">

        {/* HEADER */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--foreground)]">
              Purchase orders
            </h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Orders you send to suppliers to bring stock into the warehouse.
            </p>
          </div>

          {can("manage:business") && (
            <Button
              variant="primary"
              onClick={() => router.push("/purchase-orders/create")}
            >
              <Plus size={16} /> New purchase order
            </Button>
          )}
        </div>

        {/* TABLE */}
        <Card className="p-0 overflow-hidden">

          <table className="w-full text-sm">
            <thead className="bg-[var(--muted)] text-[var(--muted-foreground)]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium">Order number</th>
                <th className="px-4 py-3 text-left text-xs font-medium">Supplier</th>
                <th className="px-4 py-3 text-left text-xs font-medium">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium">Dates</th>
                <th className="px-4 py-3 text-left text-xs font-medium">Items</th>
                <th className="px-4 py-3 text-right text-xs font-medium">Open</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-[var(--muted-foreground)] text-sm">
                    Loading purchase orders…
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-[var(--muted-foreground)] text-sm">
                    No purchase orders yet. Create one with the New purchase order button above.
                  </td>
                </tr>
              ) : (
                orders.map((po) => {
                  const itemCount = po.items?.length ?? 0;
                  const totalQty = po.items.reduce(
                    (sum, it) => sum + (it.quantity ?? 0),
                    0
                  );

                  return (
                    <tr
                      key={po.id}
                      className="
                        border-t border-[var(--border)]
                        hover:bg-[var(--bg-hover)] transition cursor-pointer
                      "
                      onClick={() => router.push(`/purchase-orders/${po.id}`)}
                    >
                      {/* PO Number */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileText size={14} className="text-[var(--muted-foreground)]" />
                          <span className="font-semibold text-[var(--foreground)]">{po.orderNumber}</span>
                        </div>
                      </td>

                      {/* Supplier */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="flex items-center gap-1 text-[var(--foreground)]">
                            <Building2 size={13} className="text-[var(--muted-foreground)]" />
                            {po.supplier?.name}
                          </span>
                          <span className="text-xs text-[var(--muted-foreground)]">
                            {po.supplier?.code}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <StatusBadge kind="order" status={po.status} />
                      </td>

                      {/* Dates */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col text-xs">
                          <span className="flex items-center gap-1 text-[var(--muted-foreground)]">
                            <Clock3 size={11} /> Ordered:{" "}
                            <span className="text-[var(--foreground)]">{formatDateOnly(po.orderDate)}</span>
                          </span>
                          <span className="text-[var(--muted-foreground)]">
                            Expected: <span className="text-[var(--foreground)]">{formatDateOnly(po.expectedDate)}</span>
                          </span>
                        </div>
                      </td>

                      {/* Items */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-semibold text-[var(--foreground)]">{itemCount} line(s)</span>
                          <span className="text-xs text-[var(--muted-foreground)]">
                            Total qty: {totalQty}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <ArrowRight size={16} className="inline text-[var(--muted-foreground)]" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

        </Card>
      </div>
    </DashboardShell>
  );
}
