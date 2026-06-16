"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/layout/dashboard-shell";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useRole } from "@/lib/roles";
import { useRouter } from "next/navigation";
import { Repeat } from "lucide-react";
import TransferModal from "./transfer-modal";

export default function InventoryPage() {
  const router = useRouter();
  const { can } = useRole();

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedInv, setSelectedInv] = useState<any | null>(null);

  async function loadInventory() {
    try {
      const data = await api("/inventory");   // Backend already grouped
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Inventory API error:", err);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadInventory();
  }, []);

  // ---------------------------------------------------------
  // FILTER & SORT (no grouping here!)
  // ---------------------------------------------------------
  const filtered = items
    .filter((inv) => {
      const text =
        (inv.product?.name || "") +
        (inv.product?.sku || "") +
        (inv.batch?.code || "") +
        (inv.location?.code || "");
      return text.toLowerCase().includes(search.toLowerCase());
    })
    .sort((a, b) => {
      const prodA = a.product?.name || "";
      const prodB = b.product?.name || "";
      if (prodA !== prodB) return prodA.localeCompare(prodB);

      const skuA = a.product?.sku || "";
      const skuB = b.product?.sku || "";
      if (skuA !== skuB) return skuA.localeCompare(skuB);

      const batchA = a.batch?.code || "";
      const batchB = b.batch?.code || "";
      if (batchA !== batchB) return batchA.localeCompare(batchB);

      const locA = a.location?.code || "";
      const locB = b.location?.code || "";
      return locA.localeCompare(locB);
    });

  return (
    <DashboardShell>
      <div className="space-y-8">

        {/* HEADER */}
        <div>
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">
            Inventory
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            See where your stock is and how much is available.
          </p>
        </div>

        {/* SEARCH */}
        <div className="flex items-center gap-3">
          <input
            placeholder="Search by product, item code, batch, or location"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="
              w-full min-h-10 rounded-lg px-3 py-2 text-sm
              bg-[var(--card)] border border-[var(--border)]
              text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]
              outline-none focus:border-[var(--primary)]
            "
          />
        </div>

        {/* TABLE */}
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[820px] text-sm">

            <thead className="bg-[var(--muted)] text-[var(--muted-foreground)] text-xs">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Product</th>
                <th className="px-4 py-3 text-left font-semibold" title="Stock Keeping Unit — the product's item code">
                  Item code
                </th>
                <th className="px-4 py-3 text-left font-semibold">Batch</th>
                <th className="px-4 py-3 text-left font-semibold">Location</th>
                <th className="px-4 py-3 text-right font-semibold">On hand</th>
                <th className="px-4 py-3 text-right font-semibold">Reserved</th>
                <th className="px-4 py-3 text-right font-semibold">Available</th>
                <th className="px-4 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>

            <tbody>

              {/* LOADING */}
              {loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-sm text-[var(--muted-foreground)]">
                    Loading inventory…
                  </td>
                </tr>
              )}

              {/* EMPTY */}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-sm text-[var(--muted-foreground)]">
                    No inventory found. Try a different search.
                  </td>
                </tr>
              )}

              {/* DATA ROWS */}
              {!loading &&
                filtered.map((inv) => {
                  const available = inv.quantity - inv.reservedQty;
                  const low = available <= (inv.product?.lowStockThreshold || 0);

                  return (
                    <tr
                      key={inv.id}
                      onClick={() => router.push(`/inventory/${inv.id}`)}
                      className="cursor-pointer border-t border-[var(--border)] transition-colors hover:bg-[var(--bg-hover)]"
                    >
                      <td className="px-4 py-3 font-medium text-[var(--foreground)]">
                        {inv.product?.name}
                      </td>

                      <td className="px-4 py-3 text-[var(--muted-foreground)]">
                        {inv.product?.sku}
                      </td>

                      <td className="px-4 py-3 text-[var(--foreground)]">
                        {inv.batch?.code || "—"}
                      </td>

                      <td className="px-4 py-3 text-[var(--foreground)]">
                        {inv.location?.code || "—"}
                      </td>

                      <td className="px-4 py-3 text-right font-semibold text-[var(--foreground)]">
                        {inv.quantity}
                      </td>

                      <td className="px-4 py-3 text-right text-[var(--muted-foreground)]">
                        {inv.reservedQty}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <Badge color={low ? "danger" : "success"}>
                          {available}
                        </Badge>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          {can("manage:business") && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedInv(inv);
                              }}
                            >
                              <Repeat size={16} />
                              Transfer
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </Card>
      </div>

      {/* TRANSFER MODAL */}
      {selectedInv && (
        <TransferModal
          inv={selectedInv}
          onClose={() => setSelectedInv(null)}
          onSuccess={() => {
            setSelectedInv(null);
            loadInventory();
          }}
        />
      )}
    </DashboardShell>
  );
}
