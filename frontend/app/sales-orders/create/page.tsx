"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import DashboardShell from "@/components/layout/dashboard-shell";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";
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

// peta kapasitas inventory per product
type InventoryMap = Record<string, number>;

export default function CreateSalesOrderPage() {
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [inventoryMap, setInventoryMap] = useState<InventoryMap>({});

  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [expectedDate, setExpectedDate] = useState("");

  const [items, setItems] = useState<
    { productId: string; quantity: number; unitPrice: number }[]
  >([]);

  const [loading, setLoading] = useState(false);

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
    }
  }

  useEffect(() => {
    loadMaster();
  }, []);

  function addItem() {
    setItems((prev) => [
      ...prev,
      { productId: "", quantity: 0, unitPrice: 0 },
    ]);
  }

  function updateItem(idx: number, key: string, value: any) {
    setItems((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [key]: value };
      return copy;
    });
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function saveSO() {
    if (!selectedCustomer) {
      alert("Please select a customer.");
      return;
    }
    if (!expectedDate) {
      alert("Expected date is required.");
      return;
    }
    if (items.length === 0) {
      alert("Add at least one item.");
      return;
    }

    // validasi basic per-item
    for (const [idx, it] of items.entries()) {
      if (!it.productId) {
        alert(`Please select a product for item #${idx + 1}.`);
        return;
      }
      if (!it.quantity || it.quantity <= 0) {
        alert(`Quantity for item #${idx + 1} must be greater than 0.`);
        return;
      }
    }

    // --- CHECK INVENTORY CAPACITY ---

    // aggregate quantity per product (kalau ada produk yang sama di beberapa baris)
    const requestedByProduct: Record<string, number> = {};
    for (const it of items) {
      requestedByProduct[it.productId] =
        (requestedByProduct[it.productId] ?? 0) + it.quantity;
    }

    const insufficientLines: string[] = [];

    for (const [productId, requested] of Object.entries(
      requestedByProduct
    )) {
      const hasInventoryEntry = Object.prototype.hasOwnProperty.call(
        inventoryMap,
        productId
      );

      // kalau tidak ada entry inventory untuk product ini, anggap tidak dibatasi
      const available = hasInventoryEntry
        ? inventoryMap[productId]
        : Number.POSITIVE_INFINITY;

      if (requested > available) {
        const product = products.find((p) => p.id === productId);
        const label = product
          ? `${product.name} (SKU ${product.sku})`
          : productId;

        insufficientLines.push(
          `${label} → requested ${requested}, available ${available}`
        );
      }
    }

    if (insufficientLines.length > 0) {
      alert(
        "Cannot create Sales Order.\nRequested quantity exceeds available inventory for:\n\n" +
          insufficientLines.join("\n")
      );
      return;
    }

    // --- IF PASSED, BARU CREATE SO ---

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

      router.push(`/sales-orders/${soId}`);
    } catch (err) {
      console.error("Create SO failed:", err);
      alert(err instanceof ApiError ? err.message : "Failed to create SO.");
    }

    setLoading(false);
  }

  return (
    <DashboardShell>
      <div className="space-y-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create Sales Order
        </h1>

        <Card className="p-6 bg-[#111217] border border-[#1c1d22] space-y-6">
          {/* CUSTOMER */}
          <div>
            <label className="text-sm text-[var(--text-muted)]">
              Customer
            </label>
            <select
              className="w-full bg-[#15171e] border border-[#23252e] rounded-lg px-3 py-2 mt-1 text-sm"
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
            >
              <option value="">-- Select Customer --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          {/* EXPECTED DATE */}
          <div>
            <label className="text-sm text-[var(--text-muted)]">
              Expected Date
            </label>
            <input
              type="date"
              className="w-full bg-[#15171e] border border-[#23252e] rounded-lg px-3 py-2 mt-1 text-sm"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
            />
          </div>

          {/* ITEMS */}
          <div className="border-t border-[#1c1d22] pt-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Items</h2>

              {/* WHITE ADD BUTTON */}
              <button
                onClick={addItem}
                className="
                  bg-white text-black font-mono tracking-wide
                  px-3 py-1.5 rounded-md text-xs flex items-center gap-2
                  hover:bg-gray-200 transition
                "
              >
                <Plus size={14} className="text-black" /> Add Item
              </button>
            </div>

            {items.length === 0 && (
              <p className="text-xs text-[var(--text-muted)]">
                No items. Click Add Item.
              </p>
            )}

            <div className="space-y-4">
              {items.map((it, idx) => {
                const available =
                  it.productId &&
                  Object.prototype.hasOwnProperty.call(
                    inventoryMap,
                    it.productId
                  )
                    ? inventoryMap[it.productId]
                    : undefined;

                return (
                  <Card
                    key={idx}
                    className="p-4 bg-[#15171e] border border-[#23252e]"
                  >
                    {/* PRODUCT SELECT */}
                    <div className="mb-3">
                      <label className="text-xs text-[var(--text-muted)]">
                        Product
                      </label>
                      <select
                        className="w-full bg-[#111217] border border-[#23252e] rounded-lg px-3 py-2 mt-1 text-xs"
                        value={it.productId}
                        onChange={(e) =>
                          updateItem(idx, "productId", e.target.value)
                        }
                      >
                        <option value="">-- Select Product --</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (SKU {p.sku})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* QUANTITY */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-[var(--text-muted)]">
                          Quantity
                        </label>
                        {available !== undefined && (
                          <span className="text-[10px] text-[var(--text-muted)]">
                            Available: {available}
                          </span>
                        )}
                      </div>
                      <input
                        type="number"
                        min={1}
                        className="w-full bg-[#111217] border border-[#23252e] rounded-lg px-3 py-2 mt-1 text-xs"
                        value={it.quantity}
                        onChange={(e) =>
                          updateItem(
                            idx,
                            "quantity",
                            Number(e.target.value)
                          )
                        }
                      />
                    </div>

                    {/* PRICE */}
                    <div className="mb-3">
                      <label className="text-xs text-[var(--text-muted)]">
                        Unit Price
                      </label>
                      <input
                        type="number"
                        min={0}
                        className="w-full bg-[#111217] border border-[#23252e] rounded-lg px-3 py-2 mt-1 text-xs"
                        value={it.unitPrice}
                        onChange={(e) =>
                          updateItem(
                            idx,
                            "unitPrice",
                            Number(e.target.value)
                          )
                        }
                      />
                    </div>

                    {/* REMOVE */}
                    <button
                      onClick={() => removeItem(idx)}
                      className="
                        bg-red-600 hover:bg-red-700 text-white
                        px-3 py-1.5 rounded-md text-xs
                        flex items-center gap-1
                      "
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* SUBMIT BUTTON — WHITE */}
          <div className="flex justify-end pt-4">
            <button
              onClick={saveSO}
              disabled={loading}
              className="
                bg-white text-black font-mono tracking-wide
                px-4 py-2 rounded-md text-sm
                hover:bg-gray-200 transition
              "
            >
              {loading ? "Saving..." : "Create Sales Order"}
            </button>
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}
