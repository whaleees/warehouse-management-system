"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import DashboardShell from "@/components/layout/dashboard-shell";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { salesOrderStatusColor } from "@/lib/status";
import { Plus, ArrowRight, User2 } from "lucide-react";

type SalesOrderStatus =
  | "DRAFT"
  | "PENDING"
  | "PARTIALLY_SHIPPED"
  | "SHIPPED"
  | "CANCELLED";

interface Customer {
  id: string;
  name: string;
  code: string;
}

interface SalesOrder {
  id: string;
  orderNumber: string;
  status: SalesOrderStatus;
  orderDate: string;
  customer?: Customer;
  shipments?: { id: string }[];
}


export default function SalesOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadOrders() {
    try {
      const res = await api("/sales-order");
      const list = Array.isArray(res) ? res : res.data ?? [];
      setOrders(list);
    } catch (err) {
      console.error("Sales order list failed:", err);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadOrders();
  }, []);

  return (
    <DashboardShell>
      <div className="space-y-10">

        {/* HEADER (MATCH INVENTORY STYLE) */}
        <div>
          <h1 className="text-xl font-mono tracking-widest text-white mb-1">
            SALES ORDERS
          </h1>
          <p className="text-xs font-mono text-gray-500 tracking-widest">
            CUSTOMER ORDER PROCESSING
          </p>
        </div>

        {/* TOP RIGHT BUTTON */}
        <div className="flex justify-end">
          <Button
            onClick={() => router.push("/sales-orders/create")}
            className="
              flex items-center gap-2 
              bg-white text-black 
              hover:bg-gray-200 
              font-mono tracking-wide 
            "
          >
            <Plus size={16} className="text-black" />
            NEW SALES ORDER
          </Button>
        </div>

        {/* TABLE */}
        <Card className="bg-[#0e0f12] border border-[#1c1d22] rounded-xl overflow-hidden p-0">
          <table className="w-full text-sm font-mono tracking-wide">
            <thead className="bg-[#111217] text-gray-500 text-[11px] uppercase">
              <tr>
                <th className="px-5 py-3 text-left">Order</th>
                <th className="px-5 py-3 text-left">Customer</th>
                <th className="px-5 py-3 text-left">Date</th>
                <th className="px-5 py-3 text-center">Shipments</th>
                <th className="px-5 py-3 text-right">Status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>

            <tbody>
              {/* LOADING */}
              {loading && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-6 text-center text-gray-500 text-xs"
                  >
                    LOADING SALES ORDERS...
                  </td>
                </tr>
              )}

              {/* EMPTY */}
              {!loading && orders.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-6 text-center text-gray-500 text-xs"
                  >
                    NO SALES ORDERS FOUND.
                  </td>
                </tr>
              )}

              {/* ROWS */}
              {!loading &&
                orders.map((so) => (
                  <tr
                    key={so.id}
                    className="
                      border-t border-[#1c1d22]
                      hover:bg-[#15161b] transition
                    "
                  >
                    {/* ORDER */}
                    <td
                      className="px-5 py-3 font-semibold cursor-pointer"
                      onClick={() => router.push(`/sales-orders/${so.id}`)}
                    >
                      {so.orderNumber}
                    </td>

                    {/* CUSTOMER */}
                    <td
                      className="px-5 py-3 cursor-pointer"
                      onClick={() => router.push(`/sales-orders/${so.id}`)}
                    >
                      <div className="flex items-center gap-2">
                        <User2 size={14} className="text-gray-500" />
                        <div className="flex flex-col">
                          <span>{so.customer?.name ?? "-"}</span>
                          <span className="text-[10px] text-gray-500">
                            {so.customer?.code}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* DATE */}
                    <td
                      className="px-5 py-3 cursor-pointer"
                      onClick={() => router.push(`/sales-orders/${so.id}`)}
                    >
                      {formatDate(so.orderDate)}
                    </td>

                    {/* SHIPMENTS */}
                    <td
                      className="px-5 py-3 text-center cursor-pointer font-bold text-white"
                      onClick={() => router.push(`/sales-orders/${so.id}`)}
                    >
                      {so.shipments?.length ?? 0}
                    </td>

                    {/* STATUS */}
                    <td
                      className="px-5 py-3 text-right cursor-pointer"
                      onClick={() => router.push(`/sales-orders/${so.id}`)}
                    >
                      <Badge color={salesOrderStatusColor(so.status)}>
                        {so.status}
                      </Badge>
                    </td>

                    {/* ACTION BUTTON */}
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => router.push(`/sales-orders/${so.id}`)}
                        className="
                          p-1 rounded
                          hover:bg-[#1c1d22]
                          transition
                        "
                      >
                        <ArrowRight
                          size={18}
                          className="opacity-70 hover:opacity-100 transition"
                        />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </Card>
      </div>
    </DashboardShell>
  );
}
