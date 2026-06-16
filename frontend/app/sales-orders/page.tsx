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
import { formatDate } from "@/lib/format";
import { useRole } from "@/lib/roles";
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
  const { can } = useRole();
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
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--foreground)]">
              Sales orders
            </h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Customer orders waiting to be approved and shipped.
            </p>
          </div>

          {can("manage:business") && (
            <Button
              variant="primary"
              onClick={() => router.push("/sales-orders/create")}
            >
              <Plus size={16} />
              New sales order
            </Button>
          )}
        </div>

        {/* Table */}
        <Card className="p-0 overflow-hidden">
          {loading ? (
            <div className="px-5 py-10">
              <LoadingState message="Loading sales orders…" />
            </div>
          ) : orders.length === 0 ? (
            <div className="px-5 py-10">
              <EmptyState message="No sales orders yet. Create one with the New sales order button above." />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--muted)] text-left text-xs font-medium text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-5 py-3">Order</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3 text-center">Shipments</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Open</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[var(--border)]">
                {orders.map((so) => (
                  <tr
                    key={so.id}
                    className="cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
                    onClick={() => router.push(`/sales-orders/${so.id}`)}
                  >
                    {/* Order */}
                    <td className="px-5 py-3 font-semibold text-[var(--foreground)]">
                      {so.orderNumber}
                    </td>

                    {/* Customer */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <User2
                          size={16}
                          className="text-[var(--muted-foreground)]"
                        />
                        <div className="flex flex-col">
                          <span className="text-[var(--foreground)]">
                            {so.customer?.name ?? "-"}
                          </span>
                          {so.customer?.code && (
                            <span className="text-xs text-[var(--muted-foreground)]">
                              {so.customer.code}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-5 py-3 text-[var(--muted-foreground)]">
                      {formatDate(so.orderDate)}
                    </td>

                    {/* Shipments */}
                    <td className="px-5 py-3 text-center font-semibold text-[var(--foreground)]">
                      {so.shipments?.length ?? 0}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3">
                      <StatusBadge kind="salesOrder" status={so.status} />
                    </td>

                    {/* Open */}
                    <td className="px-5 py-3 text-right">
                      <ArrowRight
                        size={18}
                        className="ml-auto text-[var(--muted-foreground)]"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </DashboardShell>
  );
}
