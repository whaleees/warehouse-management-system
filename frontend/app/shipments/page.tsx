"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import DashboardShell from "@/components/layout/dashboard-shell";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import StatusBadge from "@/components/ui/status-badge";
import LoadingState from "@/components/ui/loading-state";
import { api } from "@/lib/api";
import { useRole } from "@/lib/roles";

import { ArrowRight, Plus } from "lucide-react";

interface Shipment {
  id: string;
  shipmentNumber: string;
  status: string;
  createdAt: string;
  salesOrderId: string;
  salesOrder?: {
    orderNumber?: string;
    customer?: { name?: string };
  };
}

export default function ShipmentsPage() {
  const router = useRouter();
  const { can } = useRole();
  const [list, setList] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const res = await api("/shipment");
      setList(res?.data ?? res ?? []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <DashboardShell>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--foreground)]">
              Shipments
            </h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Orders being prepared and sent out to customers.
            </p>
          </div>

          {can("manage:business") && (
            <Button onClick={() => router.push("/shipments/create")}>
              <Plus size={16} />
              New shipment
            </Button>
          )}
        </div>

        {/* Table */}
        <Card className="overflow-hidden p-0">
          {loading ? (
            <div className="p-6">
              <LoadingState message="Loading shipments…" />
            </div>
          ) : list.length === 0 ? (
            <div className="p-6">
              <p className="text-sm text-[var(--muted-foreground)]">
                No shipments yet. Use the New shipment button to start one.
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--muted)] text-xs text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Shipment</th>
                  <th className="px-5 py-3 text-left font-medium">
                    Sales order
                  </th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Open</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[var(--border)]">
                {list.map((s) => {
                  const orderNumber = s.salesOrder?.orderNumber;
                  const customerName = s.salesOrder?.customer?.name;
                  const open = () => router.push(`/shipments/${s.id}`);
                  return (
                    <tr
                      key={s.id}
                      className="cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
                      onClick={open}
                    >
                      {/* Shipment number */}
                      <td className="px-5 py-3 font-medium text-[var(--foreground)]">
                        {s.shipmentNumber}
                      </td>

                      {/* Sales order + customer */}
                      <td className="px-5 py-3">
                        <div className="flex flex-col">
                          <span className="text-[var(--foreground)]">
                            {orderNumber ?? "—"}
                          </span>
                          {customerName && (
                            <span className="text-xs text-[var(--muted-foreground)]">
                              {customerName}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3">
                        <StatusBadge kind="shipment" status={s.status} />
                      </td>

                      {/* Open */}
                      <td className="px-5 py-3 text-right">
                        <span className="inline-flex justify-end text-[var(--muted-foreground)]">
                          <ArrowRight size={18} />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </DashboardShell>
  );
}
