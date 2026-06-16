"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/layout/dashboard-shell";
import Card from "@/components/ui/card";
import LoadingState from "@/components/ui/loading-state";
import EmptyState from "@/components/ui/empty-state";
import { api } from "@/lib/api";
import { formatDateOnly } from "@/lib/format";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ExpiryRow {
  productName: string;
  batchNumber: string;
  locationCode: string;
  quantity: number;
  expiryDate: string;
}

interface ExpiryChartPoint {
  key: string;
  label: string;
  date: Date;
  count: number;
}

export default function ExpiryReportPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ExpiryRow[]>([]);
  const [chartData, setChartData] = useState<ExpiryChartPoint[]>([]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await api("/reports/expiry");
        const data: ExpiryRow[] = res.data || [];
        setRows(data);

        // Group by month and year
        const grouped: Record<string, ExpiryChartPoint> = {};

        data.forEach((row) => {
          const d = new Date(row.expiryDate);
          const year = d.getFullYear();
          const monthIndex = d.getMonth(); // 0–11
          const key = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;

          if (!grouped[key]) {
            grouped[key] = {
              key,
              label: d.toLocaleDateString("en-US", {
                month: "short",
                year: "numeric",
              }),
              date: new Date(year, monthIndex, 1),
              count: 0,
            };
          }
          grouped[key].count += 1;
        });

        const points = Object.values(grouped).sort(
          (a, b) => a.date.getTime() - b.date.getTime()
        );

        setChartData(points);
      } catch (err) {
        console.error("Failed to load expiry report:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <DashboardShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">
          Expiring soon
        </h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Batches nearing their expiry date so you can act on freshness.
        </p>
      </div>

      {/* Chart */}
      <Card className="mb-8">
        <p className="mb-4 text-sm font-semibold text-[var(--card-foreground)]">
          Batches expiring by month
        </p>

        <div className="h-[280px] w-full">
          {chartData.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              {loading ? "Loading chart…" : "Nothing is expiring soon."}
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="expiryColor" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="10%"
                      stopColor="var(--warning)"
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="90%"
                      stopColor="var(--warning)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>

                <XAxis dataKey="label" stroke="var(--muted-foreground)" />
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
                  formatter={(value: any) => [`${value}`, "Batches"]}
                  labelFormatter={(label: any) => `${label}`}
                />

                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="var(--warning)"
                  fill="url(#expiryColor)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* Table */}
      <Card>
        {loading ? (
          <LoadingState message="Loading expiring batches…" />
        ) : rows.length === 0 ? (
          <EmptyState message="Nothing is expiring soon — every batch is well within date." />
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
                      {formatDateOnly(row.expiryDate)}
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
