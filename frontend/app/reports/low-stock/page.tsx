"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/layout/dashboard-shell";
import Card from "@/components/ui/card";
import LoadingState from "@/components/ui/loading-state";
import EmptyState from "@/components/ui/empty-state";
import { api } from "@/lib/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function LowStockReportPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const res = await api("/reports/low-stock");
      setRows(res.data || []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <DashboardShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">
          Low stock
        </h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Products that have dropped below their reorder threshold.
        </p>
      </div>

      {/* Chart */}
      <Card className="mb-8">
        <p className="mb-4 text-sm font-semibold text-[var(--card-foreground)]">
          Stock on hand vs reorder threshold
        </p>

        <div className="h-[280px] w-full">
          {rows.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              {loading ? "Loading chart…" : "All stock is above its threshold."}
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows.slice(0, 12)}>
                <XAxis dataKey="sku" stroke="var(--muted-foreground)" />
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
                <Legend />
                <Bar
                  name="Stock on hand"
                  dataKey="totalStock"
                  fill="var(--primary)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  name="Reorder threshold"
                  dataKey="lowStockThreshold"
                  fill="var(--danger)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* Table */}
      <Card>
        {loading ? (
          <LoadingState message="Loading low stock…" />
        ) : rows.length === 0 ? (
          <EmptyState message="Nothing to show — all stock is above its threshold." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="border-b border-[var(--border)] text-left text-xs font-semibold text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3 text-right">Stock on hand</th>
                  <th className="px-4 py-3 text-right">Reorder threshold</th>
                  <th className="px-4 py-3 text-right">Difference</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[var(--border)] text-sm text-[var(--foreground)]">
                {rows.map((row, i) => (
                  <tr
                    key={i}
                    className="transition-colors hover:bg-[var(--bg-hover)]"
                  >
                    <td className="px-4 py-3">{row.name}</td>
                    <td className="px-4 py-3">{row.sku}</td>
                    <td className="px-4 py-3 text-right">{row.totalStock}</td>
                    <td className="px-4 py-3 text-right">
                      {row.lowStockThreshold}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-medium ${
                        row.difference < 0
                          ? "text-[var(--danger-text)]"
                          : "text-[var(--warning-text)]"
                      }`}
                    >
                      {row.difference}
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
