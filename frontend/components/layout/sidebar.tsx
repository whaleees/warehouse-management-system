"use client";

import {
  LayoutDashboard,
  Boxes,
  PackageSearch,
  ClipboardList,
  Truck,
  ShoppingCart,
  BarChart3,
  User,
  Users2,
  Building2,
  PackageCheck,
  Send,
} from "lucide-react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getUser } from "@/lib/auth";

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard };
type NavGroup = { heading: string | null; items: NavItem[] };

// Task-based clusters instead of one flat list of 11 (see DESIGN.md).
const navGroups: NavGroup[] = [
  {
    heading: null,
    items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    heading: "Receiving",
    items: [
      { href: "/purchase-orders", label: "Purchase orders", icon: ClipboardList },
      { href: "/inbound", label: "Goods receipts", icon: PackageCheck },
    ],
  },
  {
    heading: "Shipping",
    items: [
      { href: "/sales-orders", label: "Sales orders", icon: ShoppingCart },
      { href: "/shipments", label: "Shipments", icon: Send },
    ],
  },
  {
    heading: "Stock",
    items: [
      { href: "/inventory", label: "Inventory", icon: PackageSearch },
      { href: "/sections", label: "Sections", icon: Building2 },
    ],
  },
  {
    heading: "Master data",
    items: [
      { href: "/products", label: "Products", icon: Boxes },
      { href: "/suppliers", label: "Suppliers", icon: Truck },
      { href: "/customers", label: "Customers", icon: Users2 },
    ],
  },
  {
    heading: "Reports",
    items: [{ href: "/reports", label: "Reports", icon: BarChart3 }],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [userInfo, setUserInfo] = useState<{ email?: string; role?: string }>({});

  useEffect(() => {
    const user = getUser<{ email?: string; role?: string }>();
    if (user) {
      setUserInfo({
        email: user.email ?? "unknown",
        role: user.role ?? "USER",
      });
    }
  }, []);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside className="flex h-screen w-64 flex-col justify-between border-r border-[var(--border)] bg-[var(--card)] px-3 py-5">
      <div className="space-y-6 overflow-y-auto">
        {/* Brand */}
        <div className="flex items-center gap-3 px-2">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white shadow-[0_4px_10px_rgba(37,99,235,0.35)]"
            style={{ background: "var(--brand-grad)" }}
          >
            xS
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-base font-semibold text-[var(--foreground)]">
              xStock
            </span>
            <span className="text-xs text-[var(--muted-foreground)]">
              Warehouse
            </span>
          </div>
        </div>

        {/* Grouped navigation */}
        <nav className="space-y-5">
          {navGroups.map((group, gi) => (
            <div key={gi} className="space-y-1">
              {group.heading && (
                <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                  {group.heading}
                </p>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                      active
                        ? "bg-[var(--accent)] font-semibold text-[var(--accent-foreground)]"
                        : "font-medium text-[var(--muted-foreground)] hover:bg-[var(--bg-hover)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* User */}
      <div className="pt-3">
        <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--muted)] px-3 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--card)] border border-[var(--border)]">
            <User size={16} className="text-[var(--muted-foreground)]" />
          </div>
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-sm font-medium text-[var(--foreground)]">
              {userInfo.email}
            </span>
            <span className="text-xs text-[var(--muted-foreground)]">
              {userInfo.role}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
