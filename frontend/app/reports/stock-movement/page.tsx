"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/layout/dashboard-shell";
import Card from "@/components/ui/card";
import Badge from "@/components/ui/badge";
import LoadingState from "@/components/ui/loading-state";
import EmptyState from "@/components/ui/empty-state";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function MovementBadge({ type }: { type: string }) {
  const value = String(type || "");
  if (value === "IN") return <Badge color="success">Stock in</Badge>;
  if (value === "OUT") return <Badge color="danger">Stock out</Badge>;
  if (value === "TRANSFER") return <Badge color="default">Transfer</Badge>;
  if (value === "ADJUSTMENT") return <Badge color="warning">Adjustment</Badge>;
  return <Badge color="default">{value || "-"}</Badge>;
}

export default function StockMovementReportPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const res = await api("/reports/stock-movement");
      setRows(res.data || []);

      // group by date
      const group: any = {};
      res.data.forEach((row: any) => {
        const d = new Date(row.createdAt).toLocaleDateString();
        group[d] = (group[d] || 0) + 1;
      });

      setChartData(
        Object.entries(group).map(([date, count]) => ({
          date,
          count,
        }))
      );

      setLoading(false);
    }
    load();
  }, []);

  return (
    <DashboardShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">
          Stock movement
        </h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Trends and activity for stock moving in and out.
        </p>
      </div>

      {/* Chart */}
      <Card className="mb-8">
        <p className="mb-4 text-sm font-semibold text-[var(--card-foreground)]">
          Movements per day
        </p>

        <div className="h-[280px] w-full">
          {chartData.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              {loading ? "Loading chart…" : "No stock movements yet."}
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="date" stroke="var(--muted-foreground)" />
                <YAxis stroke="var(--muted-foreground)" />

                <Tooltip
                  cursor={{ stroke: "var(--border)" }}
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "var(--card-foreground)",
                  }}
                />

                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  dot={{ fill: "var(--primary)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* Table */}
      <Card>
        {loading ? (
          <LoadingState message="Loading stock movements…" />
        ) : rows.length === 0 ? (
          <EmptyState message="No stock movements yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="border-b border-[var(--border)] text-left text-xs font-semibold text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">From</th>
                  <th className="px-4 py-3">To</th>
                  <th className="px-4 py-3 text-right">Quantity</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[var(--border)] text-sm text-[var(--foreground)]">
                {rows.map((row, i) => (
                  <tr
                    key={i}
                    className="transition-colors hover:bg-[var(--bg-hover)]"
                  >
                    <td className="px-4 py-3">{row.product?.name}</td>
                    <td className="px-4 py-3">
                      <MovementBadge type={row.type} />
                    </td>
                    <td className="px-4 py-3">{row.fromLocation?.code || "-"}</td>
                    <td className="px-4 py-3">{row.toLocation?.code || "-"}</td>
                    <td className="px-4 py-3 text-right">{row.quantity}</td>
                    <td className="px-4 py-3">{formatDate(row.createdAt)}</td>
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
