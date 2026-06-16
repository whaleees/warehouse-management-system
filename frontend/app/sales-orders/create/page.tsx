"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import DashboardShell from "@/components/layout/dashboard-shell";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import { api, ApiError } from "@/lib/api";
import { formatIDR } from "@/lib/format";
import { useToast } from "@/components/ui/toast";
import { Plus, Trash2 } from "lucide-react";

interface Customer {
  id: string;
  name: string;
  code: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  uom: string;
}

// Available stock per product id.
type InventoryMap = Record<string, number>;

interface LineItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export default function CreateSalesOrderPage() {
  const router = useRouter();
  const toast = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [inventoryMap, setInventoryMap] = useState<InventoryMap>({});

  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [expectedDate, setExpectedDate] = useState("");

  const [items, setItems] = useState<LineItem[]>([]);
  // Per-line product search text, keyed by line index.
  const [productFilters, setProductFilters] = useState<Record<number, string>>(
    {},
  );

  const [loading, setLoading] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  async function loadMaster() {
    try {
      const cus = await api("/customer");
      const pro = await api("/products");
      const inv = await api("/inventory");

      setCustomers(Array.isArray(cus) ? cus : cus.data ?? []);
      setProducts(Array.isArray(pro) ? pro : pro.data ?? []);

      // build inventory map: productId -> availableQty
      const invList = Array.isArray(inv) ? inv : inv?.data ?? [];
      const map: InventoryMap = {};

      for (const row of invList as any[]) {
        const raw: any = row;

        // sesuaikan dengan shape data di backend:
        // prioritas: productId langsung, kalau nggak ada coba product.id
        const productId: string | undefined =
          raw.productId ?? raw.product_id ?? raw.product?.id;

        if (!productId) continue;

        // coba beberapa nama field yang mungkin dipakai di backend
        const availableRaw =
          raw.availableQty ??
          raw.availableQuantity ??
          raw.onHandQty ??
          raw.onHandQuantity ??
          raw.quantity ??
          0;

        const available =
          typeof availableRaw === "number"
            ? availableRaw
            : Number(availableRaw) || 0;

        map[productId] = (map[productId] ?? 0) + available;
      }

      setInventoryMap(map);
    } catch (err) {
      console.error("Failed loading master data:", err);
      setCustomers([]);
      setProducts([]);
      setInventoryMap({});
      toast.error("Couldn't load customers and products. Refresh and try again.");
    }
  }

  useEffect(() => {
    loadMaster();
  }, []);

  // Available stock for a product, or undefined when not tracked.
  function availableFor(productId: string): number | undefined {
    return Object.prototype.hasOwnProperty.call(inventoryMap, productId)
      ? inventoryMap[productId]
      : undefined;
  }

  function addItem() {
    setItems((prev) => [...prev, { productId: "", quantity: 1, unitPrice: 0 }]);
  }

  function updateItem(idx: number, key: keyof LineItem, value: string | number) {
    setItems((prev) => {
      const copy = [...prev];
      let next = { ...copy[idx], [key]: value } as LineItem;

      // Keep quantity within 1..available so staff can't over-promise stock.
      if (key === "quantity" || key === "productId") {
        const available = availableFor(next.productId);
        const max =
          available !== undefined && available > 0
            ? available
            : Number.POSITIVE_INFINITY;
        const q = Number(next.quantity) || 0;
        next.quantity = Math.max(1, Math.min(q, max));
      }

      copy[idx] = next;
      return copy;
    });
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
    setProductFilters((prev) => {
      const copy = { ...prev };
      delete copy[idx];
      return copy;
    });
  }

  const filteredCustomers = useMemo(() => {
    const q = customerFilter.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q),
    );
  }, [customers, customerFilter]);

  function filterProducts(idx: number) {
    const q = (productFilters[idx] ?? "").trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q),
    );
  }

  async function saveSO() {
    setShowErrors(true);

    if (!selectedCustomer) {
      toast.error("Choose a customer for this order.");
      return;
    }
    if (!expectedDate) {
      toast.error("Pick the date the customer expects their order.");
      return;
    }
    if (items.length === 0) {
      toast.error("Add at least one product to the order.");
      return;
    }

    // Basic per-item validation.
    for (const [idx, it] of items.entries()) {
      if (!it.productId) {
        toast.error(`Choose a product for line ${idx + 1}.`);
        return;
      }
      if (!it.quantity || it.quantity <= 0) {
        toast.error(`Quantity for line ${idx + 1} must be at least 1.`);
        return;
      }
    }

    // Aggregate requested quantity per product (same product across lines).
    const requestedByProduct: Record<string, number> = {};
    for (const it of items) {
      requestedByProduct[it.productId] =
        (requestedByProduct[it.productId] ?? 0) + it.quantity;
    }

    const insufficient: string[] = [];

    for (const [productId, requested] of Object.entries(requestedByProduct)) {
      const available = availableFor(productId);
      // No inventory record means the product isn't stock-limited here.
      if (available === undefined) continue;

      if (requested > available) {
        const product = products.find((p) => p.id === productId);
        const label = product ? product.name : "this product";
        insufficient.push(
          `${label}: you asked for ${requested}, only ${available} in stock`,
        );
      }
    }

    if (insufficient.length > 0) {
      toast.error(
        `Not enough stock. ${insufficient.join(
          "; ",
        )}. Reduce the quantity or wait for restock.`,
      );
      return;
    }

    setLoading(true);

    try {
      const so = await api("/sales-order", {
        method: "POST",
        body: JSON.stringify({
          customerId: selectedCustomer,
          expectedDate,
        }),
      });

      const soId = so.id;

      for (const it of items) {
        await api(`/sales-order/${soId}/item`, {
          method: "POST",
          body: JSON.stringify(it),
        });
      }

      toast.success("Sales order created.");
      router.push(`/sales-orders/${soId}`);
    } catch (err) {
      console.error("Create SO failed:", err);
      toast.error(
        err instanceof ApiError && err.message
          ? err.message
          : "Couldn't create the sales order. Try again.",
      );
      setLoading(false);
    }
  }

  return (
    <DashboardShell>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">
            Create sales order
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            A sales order (SO) records what a customer wants to buy before it ships.
          </p>
        </div>

        <Card className="space-y-6">
          {/* Customer */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[var(--foreground)]">
              Customer
            </label>
            <input
              type="text"
              placeholder="Search by name or code…"
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="min-h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
            <select
              className="min-h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
            >
              <option value="">Select a customer</option>
              {filteredCustomers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
            {showErrors && !selectedCustomer && (
              <p className="text-xs font-medium text-[var(--danger-text)]">
                Choose a customer.
              </p>
            )}
          </div>

          {/* Expected date */}
          <Input
            label="Expected date"
            type="date"
            value={expectedDate}
            onChange={(e) => setExpectedDate(e.target.value)}
            hint="When the customer expects their order."
            error={
              showErrors && !expectedDate ? "Pick an expected date." : undefined
            }
          />

          {/* Items */}
          <div className="border-t border-[var(--border)] pt-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[var(--card-foreground)]">
                Items
              </h2>

              <Button variant="outline" size="sm" onClick={addItem}>
                <Plus size={16} /> Add item
              </Button>
            </div>

            {items.length === 0 && (
              <p className="text-sm text-[var(--muted-foreground)]">
                No items yet. Add products with the Add item button above.
              </p>
            )}

            <div className="space-y-4">
              {items.map((it, idx) => {
                const available = availableFor(it.productId);

                return (
                  <div
                    key={idx}
                    className="rounded-lg border border-[var(--border)] bg-[var(--muted)] p-4"
                  >
                    {/* Product */}
                    <div className="mb-3 space-y-1.5">
                      <label className="block text-sm font-medium text-[var(--foreground)]">
                        Product
                      </label>
                      <input
                        type="text"
                        placeholder="Search by name or SKU…"
                        value={productFilters[idx] ?? ""}
                        onChange={(e) =>
                          setProductFilters((prev) => ({
                            ...prev,
                            [idx]: e.target.value,
                          }))
                        }
                        className="min-h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                      />
                      <select
                        className="min-h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                        value={it.productId}
                        onChange={(e) =>
                          updateItem(idx, "productId", e.target.value)
                        }
                      >
                        <option value="">Select a product</option>
                        {filterProducts(idx).map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (SKU {p.sku})
                          </option>
                        ))}
                      </select>
                      {showErrors && !it.productId && (
                        <p className="text-xs font-medium text-[var(--danger-text)]">
                          Choose a product.
                        </p>
                      )}
                    </div>

                    {/* Quantity */}
                    <div className="mb-3">
                      <Input
                        label="Quantity"
                        type="number"
                        min={1}
                        max={available}
                        value={it.quantity}
                        onChange={(e) =>
                          updateItem(idx, "quantity", Number(e.target.value))
                        }
                        hint={
                          available !== undefined
                            ? `In stock: ${available}`
                            : undefined
                        }
                      />
                    </div>

                    {/* Unit price */}
                    <div className="mb-4">
                      <Input
                        label="Unit price"
                        type="number"
                        min={0}
                        value={it.unitPrice}
                        onChange={(e) =>
                          updateItem(idx, "unitPrice", Number(e.target.value))
                        }
                        hint={`Shown to the customer as ${formatIDR(
                          it.unitPrice,
                        )}`}
                      />
                    </div>

                    {/* Remove */}
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => removeItem(idx)}
                    >
                      <Trash2 size={16} /> Remove
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end border-t border-[var(--border)] pt-5">
            <Button variant="primary" onClick={saveSO} loading={loading}>
              {loading ? "Saving…" : "Create sales order"}
            </Button>
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}
