"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/layout/dashboard-shell";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { Building2, Calendar } from "lucide-react";
import PoItemsEditor, {
  type DraftItem,
  type EditorProduct,
} from "../po-items-editor";

interface Supplier {
  id: string;
  code: string;
  name: string;
}

export default function CreatePurchaseOrderPage() {
  const router = useRouter();
  const toast = useToast();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);

  const [products, setProducts] = useState<EditorProduct[]>([]);
  const [items, setItems] = useState<DraftItem[]>([]);

  const [supplierId, setSupplierId] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [supplierError, setSupplierError] = useState("");

  // ─────────────────────────────────────────────
  // LOAD SUPPLIERS + PRODUCTS
  // ─────────────────────────────────────────────
  async function loadSuppliers() {
    try {
      const data = await api("/supplier");
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Load suppliers failed:", err);
      setSuppliers([]);
    }
    setLoadingSuppliers(false);
  }

  async function loadProducts() {
    try {
      const data = await api("/products");
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Load products failed:", err);
      setProducts([]);
    }
  }

  useEffect(() => {
    loadSuppliers();
    loadProducts();
  }, []);

  // ─────────────────────────────────────────────
  // SUBMIT FORM
  // ─────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!supplierId) {
      setSupplierError("Choose a supplier to continue.");
      return;
    }
    setSupplierError("");

    // Validate any staged line items (blank rows are possible now).
    for (const [idx, it] of items.entries()) {
      if (!it.productId) {
        toast.error(`Choose a product for item ${idx + 1}.`);
        return;
      }
      if (!it.quantity || it.quantity < 1) {
        toast.error(`Quantity for item ${idx + 1} must be at least 1.`);
        return;
      }
    }

    setSaving(true);
    try {
      const body: { supplierId: string; expectedDate?: string } = {
        supplierId,
      };
      if (expectedDate) {
        body.expectedDate = new Date(expectedDate).toISOString();
      }

      const po = await api("/purchase-order", {
        method: "POST",
        body: JSON.stringify(body),
      });

      // Add the staged line items to the new order, in order.
      for (const it of items) {
        await api(`/purchase-order/${po.id}/item`, {
          method: "POST",
          body: JSON.stringify({
            productId: it.productId,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
          }),
        });
      }

      toast.success(
        items.length > 0
          ? "Purchase order created with its items."
          : "Purchase order created. Add the items you want to order.",
      );
      router.push(`/purchase-orders/${po.id}`);
    } catch (err) {
      console.error("Create PO failed:", err);
      toast.error(
        err instanceof ApiError
          ? "Couldn't create the purchase order. Check the details and try again."
          : "Couldn't create the purchase order. Try again.",
      );
      setSaving(false);
    }
  }

  // ─────────────────────────────────────────────

  return (
    <DashboardShell>
      {/* PAGE HEADER */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">
          New purchase order
        </h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Pick a supplier and add the items you want to order.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SUPPLIER + DATE */}
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* SUPPLIER FIELD */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="supplier"
                className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]"
              >
                <Building2 size={14} className="text-[var(--muted-foreground)]" />
                Supplier
              </label>

              <select
                id="supplier"
                value={supplierId}
                onChange={(e) => {
                  setSupplierId(e.target.value);
                  if (e.target.value) setSupplierError("");
                }}
                className={`min-h-10 rounded-lg border bg-[var(--input)] px-3 py-2 text-sm text-[var(--foreground)] outline-none transition-colors focus:ring-2 focus:ring-[var(--ring)] ${
                  supplierError
                    ? "border-[var(--danger)]"
                    : "border-[var(--border)] focus:border-[var(--ring)]"
                }`}
              >
                <option value="">
                  {loadingSuppliers ? "Loading suppliers…" : "Select a supplier"}
                </option>

                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} — {s.name}
                  </option>
                ))}
              </select>

              {supplierError && (
                <p className="text-xs font-medium text-[var(--danger-text)]">
                  {supplierError}
                </p>
              )}
            </div>

            {/* EXPECTED DATE FIELD */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="expected-date"
                className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]"
              >
                <Calendar size={14} className="text-[var(--muted-foreground)]" />
                Expected delivery date
              </label>

              <input
                id="expected-date"
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                className="min-h-10 rounded-lg border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-[var(--ring)] focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
          </div>
        </Card>

        {/* LINE ITEMS */}
        <PoItemsEditor
          products={products}
          items={items}
          onChange={setItems}
        />

        {/* SUBMIT */}
        <div className="flex flex-col gap-2">
          <Button
            type="submit"
            variant="primary"
            loading={saving}
            className="w-full md:w-auto"
          >
            {saving ? "Creating…" : "Create purchase order"}
          </Button>
          <p className="text-sm text-[var(--muted-foreground)]">
            You can still create the order without items and add them later from
            the order&apos;s detail page.
          </p>
        </div>
      </form>
    </DashboardShell>
  );
}
