"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import DashboardShell from "@/components/layout/dashboard-shell";
import Card from "@/components/ui/card";
import { api, ApiError } from "@/lib/api";

interface SalesOrder {
  id: string;
  orderNumber: string;
  status: string;
}

export default function CreateShipmentPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadSO() {
    try {
      const res = await api("/sales-order");
      const list = res?.data ?? res ?? [];

      // Only allow PENDING or PARTIALLY_SHIPPED
      setOrders(list.filter((o: SalesOrder) =>
        ["PENDING", "PARTIALLY_SHIPPED"].includes(o.status)
      ));
    } catch (err) {
      console.error("Failed loading sales orders:", err);
      setOrders([]);
    }
  }

  useEffect(() => {
    loadSO();
  }, []);

  async function createShipment() {
    if (!selected) return alert("Select a Sales Order first.");

    setLoading(true);
    try {
      const sh = await api("/shipment", {
        method: "POST",
        body: JSON.stringify({ salesOrderId: selected }),
      });

      router.push(`/shipments/${sh.id}`);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to create shipment.");
    }
    setLoading(false);
  }

  return (
    <DashboardShell>
      <div className="space-y-8">

        {/* HEADER */}
        <div>
          <h1 className="text-xl font-mono tracking-widest text-white mb-1">
            CREATE SHIPMENT
          </h1>
          <p className="text-xs font-mono text-gray-500 tracking-widest">
            OUTBOUND FULFILLMENT
          </p>
        </div>

        {/* FORM CARD */}
        <Card className="p-6 bg-[#0e0f12] border border-[#1c1d22] rounded-xl space-y-6">

          {/* SELECT SO */}
          <div className="space-y-1">
            <label className="text-xs font-mono tracking-wide text-gray-400">
              SELECT SALES ORDER
            </label>

            <select
              className="
                w-full px-3 py-2 bg-[#111217] border border-[#23252e] rounded-lg
                text-sm font-mono tracking-wide outline-none
                focus:border-white transition
              "
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="">-- Choose Sales Order --</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.orderNumber}
                </option>
              ))}
            </select>
          </div>

          {/* CREATE BUTTON — WHITE STYLE */}
          <div className="flex justify-end pt-4">
            <button
              onClick={createShipment}
              disabled={loading}
              className="
                bg-white text-black px-5 py-2 rounded-lg font-mono 
                tracking-widest text-xs font-semibold
                hover:bg-gray-200 transition
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              {loading ? "CREATING..." : "CREATE SHIPMENT"}
            </button>
          </div>

        </Card>
      </div>
    </DashboardShell>
  );
}
