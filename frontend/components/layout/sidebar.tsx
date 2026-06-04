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
} from "lucide-react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getUser } from "@/lib/auth";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/products", label: "Products", icon: Boxes },
  { href: "/suppliers", label: "Suppliers", icon: Truck },
  { href: "/customers", label: "Customers", icon: Users2 },
  { href: "/inventory", label: "Inventory", icon: PackageSearch },
  { href: "/sections", label: "Sections", icon: Building2 },
  { href: "/purchase-orders", label: "Purchase Orders", icon: ClipboardList },
  { href: "/inbound", label: "Inbound", icon: Truck },
  { href: "/sales-orders", label: "Sales Orders", icon: ShoppingCart },
  { href: "/shipments", label: "Shipments", icon: Truck },
  { href: "/reports", label: "Reports", icon: BarChart3 },
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

  return (
    <aside
      className="
        flex flex-col justify-between
        h-screen w-60
        bg-[#0b0c0f] border-r border-[#1e1f22]
        px-4 py-6
      "
    >

      {/* TOP SECTION */}
      <div className="space-y-8">

        {/* LOGO */}
        <div className="flex items-center gap-3 px-1">
          <div
            className="
              w-9 h-9 rounded-lg bg-white/10
              flex items-center justify-center
              text-white font-mono text-sm tracking-wide
              border border-white/10
            "
          >
            XS
          </div>

          <div className="flex flex-col leading-tight">
            <span className="text-sm font-mono tracking-widest text-white">
              XSTOCK
            </span>
            <span className="text-[10px] text-gray-500 tracking-wide font-mono">
              WAREHOUSE CONSOLE
            </span>
          </div>
        </div>

        {/* NAVIGATION */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-md font-mono text-xs tracking-widest
                  transition-all border border-transparent
                  ${
                    active
                      ? "bg-white/5 text-white border-white/20"
                      : "text-gray-500 hover:text-white hover:bg-white/5"
                  }
                `}
              >
                <Icon size={16} className="opacity-80" />
                <span>{item.label.toUpperCase()}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* USER SECTION */}
      <div className="px-2">
        <div
          className="
            flex items-center gap-3
            bg-[#111215] border border-[#1e1f22] rounded-lg
            px-3 py-3
          "
        >
          <div
            className="
              w-9 h-9 rounded-full bg-[#0d0e10]
              flex items-center justify-center border border-[#1e1f22]
            "
          >
            <User size={16} className="text-gray-500" />
          </div>

          <div className="flex flex-col leading-tight">
            <span className="text-xs text-white font-mono tracking-wide">
              {userInfo.email}
            </span>
            <span className="text-[10px] text-gray-500 font-mono tracking-widest">
              {userInfo.role}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
