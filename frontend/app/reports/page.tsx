"use client";

import DashboardShell from "@/components/layout/dashboard-shell";
import Link from "next/link";
import {
  BarChart2,
  Clock,
  Layers,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";

export default function ReportsIndexPage() {
  const items = [
    {
      title: "Low stock",
      desc: "Products that have dropped below their reorder threshold.",
      href: "/reports/low-stock",
      icon: <AlertTriangle size={22} className="text-[var(--danger)]" />,
    },
    {
      title: "Expiring soon",
      desc: "Batches nearing their expiry date so you can act on freshness.",
      href: "/reports/expiry",
      icon: <Clock size={22} className="text-[var(--warning)]" />,
    },
    {
      title: "Batches & locations",
      desc: "Every batch and where it is stored across the warehouse.",
      href: "/reports/batches",
      icon: <Layers size={22} className="text-[var(--primary)]" />,
    },
    {
      title: "Stock movement",
      desc: "Trends and activity for stock moving in and out.",
      href: "/reports/stock-movement",
      icon: <BarChart2 size={22} className="text-[var(--success)]" />,
    },
  ];

  return (
    <DashboardShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">
          Reports
        </h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Choose a report to review your warehouse.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {items.map((item, i) => (
          <Link
            key={i}
            href={item.href}
            className="group flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm transition-colors hover:bg-[var(--bg-hover)]"
          >
            <div className="flex items-center justify-between">
              <p className="text-base font-semibold text-[var(--card-foreground)]">
                {item.title}
              </p>
              {item.icon}
            </div>

            <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
              {item.desc}
            </p>

            <span className="inline-flex items-center gap-1 text-sm font-medium text-[var(--primary)]">
              View report
              <ChevronRight
                size={16}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </span>
          </Link>
        ))}
      </div>
    </DashboardShell>
  );
}
