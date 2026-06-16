"use client";

import { logout } from "@/lib/auth";
import { LogOut, Sun, Moon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "@/lib/theme";
import { useConfirm } from "@/components/ui/confirm-dialog";

const TITLES: Record<string, string> = {
  "": "Dashboard",
  products: "Products",
  suppliers: "Suppliers",
  customers: "Customers",
  inventory: "Inventory",
  sections: "Sections",
  "purchase-orders": "Purchase orders",
  inbound: "Goods receipts",
  "sales-orders": "Sales orders",
  shipments: "Shipments",
  reports: "Reports",
};

function titleFor(pathname: string): string {
  const seg = pathname.split("/")[1] ?? "";
  if (seg in TITLES) return TITLES[seg];
  const words = seg.replace(/-/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export default function Topbar() {
  const pathname = usePathname();
  const { resolvedTheme, toggle } = useTheme();
  const confirm = useConfirm();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const title = titleFor(pathname);

  async function handleLogout() {
    const ok = await confirm({
      title: "Log out of xStock?",
      description: "You'll need to sign in again to continue.",
      confirmLabel: "Log out",
    });
    if (ok) logout();
  }

  return (
    <header className="sticky top-0 z-10 flex h-[60px] items-center justify-between border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_80%,transparent)] px-6 backdrop-blur-md">
      <h1 className="text-base font-semibold text-[var(--foreground)]">
        {title}
      </h1>

      <div className="flex items-center gap-1">
        <button
          onClick={toggle}
          aria-label="Toggle light or dark theme"
          title="Toggle light or dark theme"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted-foreground)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--foreground)]"
        >
          {mounted && resolvedTheme === "dark" ? (
            <Sun size={18} />
          ) : (
            <Moon size={18} />
          )}
        </button>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[var(--muted-foreground)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--foreground)]"
        >
          <LogOut size={16} />
          Log out
        </button>
      </div>
    </header>
  );
}
