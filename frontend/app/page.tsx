"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthGuard, getUser } from "@/lib/auth";
import DashboardShell from "@/components/layout/dashboard-shell";
import Badge from "@/components/ui/badge";
import Card from "@/components/ui/card";
import LoadingState from "@/components/ui/loading-state";
import { api } from "@/lib/api";
import { formatDateOnly } from "@/lib/format";

import {
  PackageSearch,
  AlertTriangle,
  Users,
  Building2,
  Clock,
  Boxes,
  ChevronRight,
  ArrowDownToLine,
  ArrowUpFromLine,
} from "lucide-react";

export default function DashboardPage() {
  const ready = useAuthGuard();
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState("Welcome back");
  const [userName, setUserName] = useState("");

  const [stats, setStats] = useState<any>({});
  const [recent, setRecent] = useState<any[]>([]);
  const [reportStats, setReportStats] = useState<any>({
    lowStock: 0,
    expiringSoon: 0,
    productCount: 0,
  });

  useEffect(() => {
    // Time-based greeting + first name (derived from email) for a warm hello.
    const hour = new Date().getHours();
    setGreeting(
      hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening",
    );
    const user = getUser<{ email?: string }>();
    if (user?.email) {
      const raw = user.email.split("@")[0]?.split(/[._-]/)[0] ?? "";
      if (raw) setUserName(raw.charAt(0).toUpperCase() + raw.slice(1));
    }
  }, []);

  useEffect(() => {
    if (!ready) return;

    async function load() {
      try {
        const dashboard = await api("/reports/dashboard");
        const low = await api("/reports/low-stock");
        const exp = await api("/reports/expiry");
        const prod = await api("/reports/products");
        const movements = await api("/reports/stock-movement?page=1&pageSize=5");

        setStats(dashboard ?? {});
        setRecent(Array.isArray(movements?.data) ? movements.data : []);
        setReportStats({
          lowStock: low?.data?.length ?? 0,
          expiringSoon: exp?.data?.length ?? 0,
          productCount: prod?.data?.length ?? 0,
        });
      } catch (err) {
        console.error("Dashboard fetch failed:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [ready]);

  if (!ready) return null;

  if (loading) {
    return (
      <DashboardShell>
        <LoadingState message="Loading dashboard…" />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="mb-7">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          {greeting}
          {userName ? `, ${userName}` : ""} 👋
        </h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Here&apos;s a quick look at your warehouse today.
        </p>
      </div>

      {/* Key numbers */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Products"
          value={stats.totalProducts ?? 0}
          icon={<PackageSearch size={20} />}
          chip="blue"
        />
        <StatCard
          label="Suppliers"
          value={stats.totalSuppliers ?? 0}
          icon={<Building2 size={20} />}
          chip="blue"
        />
        <StatCard
          label="Customers"
          value={stats.totalCustomers ?? 0}
          icon={<Users size={20} />}
          chip="green"
        />
        <StatCard
          label="Low stock"
          value={reportStats.lowStock ?? 0}
          icon={<AlertTriangle size={20} />}
          chip="red"
          tone="danger"
        />
      </div>

      {/* Reports */}
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
        Reports
      </h2>
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <ReportCard
          title="Low stock"
          subtitle="Products below their threshold"
          value={reportStats.lowStock}
          link="/reports/low-stock"
          icon={<AlertTriangle size={20} />}
          chip="red"
        />
        <ReportCard
          title="Expiring soon"
          subtitle="Batches nearing their expiry date"
          value={reportStats.expiringSoon}
          link="/reports/expiry"
          icon={<Clock size={20} />}
          chip="amber"
        />
        <ReportCard
          title="Batches & locations"
          subtitle="Where your stock is stored"
          value={reportStats.productCount}
          link="/reports/batches"
          icon={<Boxes size={20} />}
          chip="blue"
        />
      </div>

      {/* Recent activity */}
      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[var(--card-foreground)]">
            Recent stock movements
          </h2>
          <Link
            href="/reports/stock-movement"
            className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--primary)] hover:underline"
          >
            View all
            <ChevronRight size={15} />
          </Link>
        </div>

        {recent.length === 0 ? (
          <p className="py-2 text-sm text-[var(--muted-foreground)]">
            No stock movements yet.
          </p>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            {recent.map((move, idx) => {
              const isIn = move.type === "IN";
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between py-3.5 first:pt-1 last:pb-0"
                >
                  <div className="flex items-center gap-3.5">
                    <span
                      className={`icon-chip h-10 w-10 ${
                        isIn ? "icon-chip-green" : "icon-chip-red"
                      }`}
                    >
                      {isIn ? (
                        <ArrowDownToLine size={18} />
                      ) : (
                        <ArrowUpFromLine size={18} />
                      )}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[var(--foreground)]">
                        {move.product?.name ?? "Unknown product"}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {move.quantity} units
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge color={isIn ? "success" : "danger"}>
                      {isIn ? "Stock in" : "Stock out"}
                    </Badge>
                    <span className="min-w-[58px] text-right text-xs text-[var(--muted-foreground)]">
                      {formatDateOnly(move.createdAt)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </DashboardShell>
  );
}

function StatCard({
  label,
  value,
  icon,
  chip = "blue",
  tone = "default",
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  chip?: "blue" | "green" | "amber" | "red";
  tone?: "default" | "danger";
}) {
  const valueColor =
    tone === "danger" ? "text-[var(--danger-text)]" : "text-[var(--foreground)]";
  return (
    <Card className="flex flex-col p-4!">
      <div className="flex items-start justify-between">
        <p className="text-sm font-semibold text-[var(--card-foreground)]">
          {label}
        </p>
        <span className={`icon-chip icon-chip-${chip} h-9 w-9 shrink-0`}>
          {icon}
        </span>
      </div>
      <p
        className={`text-[1.75rem] font-bold leading-none tracking-tight ${valueColor}`}
      >
        {value.toLocaleString()}
      </p>
    </Card>
  );
}

function ReportCard({
  title,
  subtitle,
  value,
  link,
  icon,
  chip = "blue",
}: {
  title: string;
  subtitle: string;
  value: number;
  link: string;
  icon: React.ReactNode;
  chip?: "blue" | "green" | "amber" | "red";
}) {
  return (
    <Link
      href={link}
      className="card-hover group flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-card)]"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--card-foreground)]">
            {title}
          </p>
          <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
            {subtitle}
          </p>
        </div>
        <span className={`icon-chip icon-chip-${chip} h-10 w-10 shrink-0`}>
          {icon}
        </span>
      </div>
      <p className="text-[1.75rem] font-bold leading-none tracking-tight text-[var(--foreground)]">
        {value.toLocaleString()}
      </p>
      <span className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--primary)]">
        View report
        <ChevronRight
          size={16}
          className="transition-transform group-hover:translate-x-0.5"
        />
      </span>
    </Link>
  );
}
