"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/layout/dashboard-shell";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import { api } from "@/lib/api";
import { formatDateOnly } from "@/lib/format";
import { orderStatusColor } from "@/lib/status";
import { useRouter } from "next/navigation";
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
      <div className="space-y-10">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-mono tracking-widest">PURCHASE ORDERS</h1>

          <button
            onClick={() => router.push("/purchase-orders/create")}
            className="
              px-4 py-2 rounded-lg bg-white text-black
              font-mono text-xs tracking-widest font-semibold
              hover:bg-gray-200 transition flex items-center gap-2
            "
          >
            <Plus size={14} /> NEW PURCHASE ORDER
          </button>
        </div>

        {/* TABLE */}
        <Card className="p-0 bg-[#111217] border border-[#1c1d22] overflow-hidden">

          <table className="w-full text-sm font-mono tracking-wider">
            <thead className="bg-[#0e0f12] text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left text-[10px] tracking-widest">PO NUMBER</th>
                <th className="px-4 py-3 text-left text-[10px] tracking-widest">SUPPLIER</th>
                <th className="px-4 py-3 text-left text-[10px] tracking-widest">STATUS</th>
                <th className="px-4 py-3 text-left text-[10px] tracking-widest">DATES</th>
                <th className="px-4 py-3 text-left text-[10px] tracking-widest">ITEMS</th>
                <th className="px-4 py-3 text-right text-[10px] tracking-widest">ACTION</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-gray-500 text-xs">
                    LOADING PURCHASE ORDERS...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-gray-500 text-xs">
                    NO PURCHASE ORDERS FOUND.
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
                        border-t border-[#1c1d22]
                        hover:bg-[#131419] transition cursor-pointer
                      "
                      onClick={() => router.push(`/purchase-orders/${po.id}`)}
                    >
                      {/* PO Number */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileText size={14} className="opacity-60" />
                          <span className="font-semibold">{po.orderNumber}</span>
                        </div>
                      </td>

                      {/* Supplier */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="flex items-center gap-1">
                            <Building2 size={13} className="opacity-60" />
                            {po.supplier?.name}
                          </span>
                          <span className="text-[11px] text-gray-500">
                            {po.supplier?.code}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <Badge color={orderStatusColor(po.status)}>
                          {po.status}
                        </Badge>
                      </td>

                      {/* Dates */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col text-xs">
                          <span className="flex items-center gap-1 text-gray-500">
                            <Clock3 size={11} /> ORDER:{" "}
                            <span className="text-white">{formatDateOnly(po.orderDate)}</span>
                          </span>
                          <span className="text-gray-500">
                            ETA: <span className="text-white">{formatDateOnly(po.expectedDate)}</span>
                          </span>
                        </div>
                      </td>

                      {/* Items */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-semibold">{itemCount} line(s)</span>
                          <span className="text-[11px] text-gray-500">
                            Total qty: {totalQty}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <ArrowRight size={16} className="opacity-60" />
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
