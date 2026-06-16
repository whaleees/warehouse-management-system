"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import DashboardShell from "@/components/layout/dashboard-shell";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";

interface SalesOrder {
  id: string;
  orderNumber: string;
  status: string;
  customer?: { name?: string };
}

export default function CreateShipmentPage() {
  const router = useRouter();
  const toast = useToast();

  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadSO() {
    try {
      const res = await api("/sales-order");
      const list = res?.data ?? res ?? [];

      // Only orders that still have items to ship can start a shipment.
      setOrders(
        list.filter((o: SalesOrder) =>
          ["PENDING", "PARTIALLY_SHIPPED"].includes(o.status),
        ),
      );
    } catch (err) {
      console.error("Failed loading sales orders:", err);
      setOrders([]);
    }
  }

  useEffect(() => {
    loadSO();
  }, []);

  async function createShipment() {
    if (!selected) {
      toast.error("Choose a sales order to ship first.");
      return;
    }

    setLoading(true);
    try {
      const sh = await api("/shipment", {
        method: "POST",
        body: JSON.stringify({ salesOrderId: selected }),
      });

      toast.success("Shipment created. Add the items you're sending.");
      router.push(`/shipments/${sh.id}`);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Couldn't create the shipment. Please try again.",
      );
      setLoading(false);
    }
  }

  return (
    <DashboardShell>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">
            New shipment
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Pick the customer order you're getting ready to send.
          </p>
        </div>

        {/* Form card */}
        <Card className="max-w-lg space-y-6">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="sales-order"
              className="text-sm font-medium text-[var(--foreground)]"
            >
              Sales order
            </label>

            <select
              id="sales-order"
              className="min-h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm text-[var(--foreground)] transition-colors focus:border-[var(--ring)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="">Choose a sales order</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.orderNumber}
                  {o.customer?.name ? ` — ${o.customer.name}` : ""}
                </option>
              ))}
            </select>

            {orders.length === 0 && (
              <p className="text-xs text-[var(--muted-foreground)]">
                No orders are ready to ship right now.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => router.push("/shipments")}>
              Cancel
            </Button>
            <Button onClick={createShipment} loading={loading}>
              Create shipment
            </Button>
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}
