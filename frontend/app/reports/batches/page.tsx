"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/layout/dashboard-shell";
import Card from "@/components/ui/card";
import LoadingState from "@/components/ui/loading-state";
import EmptyState from "@/components/ui/empty-state";
import { api } from "@/lib/api";
import { formatDateOnly } from "@/lib/format";
import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  YAxis,
} from "recharts";

export default function BatchReportPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const res = await api("/reports/batches");
      setRows(res.data || []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <DashboardShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">
          Batches & locations
        </h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Every batch and where it is stored across the warehouse.
        </p>
      </div>

      {/* Chart */}
      <Card className="mb-8">
        <p className="mb-4 text-sm font-semibold text-[var(--card-foreground)]">
          Quantity by batch
        </p>

        <div className="h-[280px] w-full">
          {rows.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              {loading ? "Loading chart…" : "No batches to show yet."}
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows.slice(0, 15)}>
                <XAxis dataKey="batchNumber" stroke="var(--muted-foreground)" />
                <YAxis stroke="var(--muted-foreground)" />

                <Tooltip
                  cursor={{ fill: "var(--bg-hover)" }}
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "var(--card-foreground)",
                  }}
                />

                <Bar
                  dataKey="quantity"
                  fill="var(--primary)"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* Table */}
      <Card>
        {loading ? (
          <LoadingState message="Loading batches…" />
        ) : rows.length === 0 ? (
          <EmptyState message="No batches to show yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="border-b border-[var(--border)] text-left text-xs font-semibold text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Batch</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3 text-right">Quantity</th>
                  <th className="px-4 py-3">Expiry date</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[var(--border)] text-sm text-[var(--foreground)]">
                {rows.map((row, i) => (
                  <tr
                    key={i}
                    className="transition-colors hover:bg-[var(--bg-hover)]"
                  >
                    <td className="px-4 py-3">{row.productName}</td>
                    <td className="px-4 py-3">{row.batchNumber}</td>
                    <td className="px-4 py-3">{row.locationCode}</td>
                    <td className="px-4 py-3 text-right">{row.quantity}</td>
                    <td className="px-4 py-3">
                      {row.expiryDate ? formatDateOnly(row.expiryDate) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </DashboardShell>
  );
}
