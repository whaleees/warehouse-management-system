"use client";

import { useMemo } from "react";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import { formatIDR } from "@/lib/format";
import { Plus, Trash2 } from "lucide-react";

export interface EditorProduct {
  id: string;
  name: string;
  sku: string;
  uom: string;
}

/** A line item staged locally before the purchase order is saved. */
export interface DraftItem {
  /** Local-only id for React keys; not sent to the API. */
  key: string;
  productId: string;
  quantity: number;
  unitPrice: number;
}

interface PoItemsEditorProps {
  products: EditorProduct[];
  items: DraftItem[];
  onChange: (items: DraftItem[]) => void;
}

let keyCounter = 0;
function nextKey() {
  keyCounter += 1;
  return `draft-${keyCounter}-${Date.now()}`;
}

/**
 * Editable list of purchase-order line items held in local state. Mirrors the
 * sales-order create page: an "Add item" button appends a full-width editable
 * block, rather than an always-open input grid. Used on the create page to
 * stage items before the order is saved.
 */
export default function PoItemsEditor({
  products,
  items,
  onChange,
}: PoItemsEditorProps) {
  const orderTotal = useMemo(
    () => items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0),
    [items],
  );

  // Product ids already chosen, so a product can't be added twice.
  const usedProductIds = useMemo(
    () => items.map((it) => it.productId).filter(Boolean),
    [items],
  );

  // Options for one line: unused products, plus this line's own current pick.
  function productsForLine(currentId: string) {
    const usedByOthers = new Set(
      usedProductIds.filter((id) => id !== currentId),
    );
    return products.filter((p) => !usedByOthers.has(p.id));
  }

  function addItem() {
    onChange([
      ...items,
      { key: nextKey(), productId: "", quantity: 1, unitPrice: 0 },
    ]);
  }

  function updateItem(key: string, patch: Partial<DraftItem>) {
    onChange(items.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  }

  function removeItem(key: string) {
    onChange(items.filter((it) => it.key !== key));
  }

  // A product can only appear once on a PO (backend rejects duplicates), so
  // there's nothing left to add when every product is already on the order.
  const noProducts = products.length === 0;
  const allProductsUsed = !noProducts && items.length >= products.length;
  const cannotAdd = noProducts || allProductsUsed;

  return (
    <Card className="space-y-5">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-[var(--card-foreground)]">
            Order items
          </h2>
          <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
            {items.length === 0
              ? "No items added"
              : `${items.length} item${items.length === 1 ? "" : "s"}`}
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addItem}
          disabled={cannotAdd}
        >
          <Plus size={16} /> Add item
        </Button>
      </div>

      {/* Explain why adding is unavailable, instead of a silent disabled button. */}
      {cannotAdd && (
        <p className="text-xs text-[var(--muted-foreground)]">
          {noProducts
            ? "No products available yet. Add products under Master data → Products first."
            : "Every product is already on this order — a product can only be added once. Create more products to add more lines."}
        </p>
      )}

      {/* EMPTY STATE */}
      {items.length === 0 && (
        <p className="text-sm text-[var(--muted-foreground)]">
          No items yet. Add products with the Add item button above.
        </p>
      )}

      {/* ITEM BLOCKS */}
      {items.length > 0 && (
        <div className="space-y-4">
          {items.map((it, idx) => {
            const product = products.find((p) => p.id === it.productId);
            const lineTotal = it.quantity * it.unitPrice;

            return (
              <div
                key={it.key}
                className="rounded-xl border border-[var(--border)] bg-[var(--muted)] p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-[var(--foreground)]">
                    Item {idx + 1}
                  </span>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => removeItem(it.key)}
                    aria-label={`Remove ${product?.name ?? "item"}`}
                  >
                    <Trash2 size={15} /> Remove
                  </Button>
                </div>

                {/* Product */}
                <div className="mb-3 flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-[var(--foreground)]">
                    Product
                  </label>
                  <select
                    className="input-style"
                    value={it.productId}
                    onChange={(e) =>
                      updateItem(it.key, { productId: e.target.value })
                    }
                  >
                    <option value="">Select a product</option>
                    {productsForLine(it.productId).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (SKU {p.sku})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity + Unit price */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-[var(--foreground)]">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={it.quantity}
                      onChange={(e) =>
                        updateItem(it.key, {
                          quantity: Math.max(1, Number(e.target.value) || 1),
                        })
                      }
                      className="input-style"
                      placeholder="100"
                    />
                    {product?.uom && (
                      <p className="text-xs text-[var(--muted-foreground)]">
                        Unit: {product.uom}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-[var(--foreground)]">
                      Unit price (Rp)
                    </label>
                    <input
                      type="number"
                      min={0}
                      // Show empty (placeholder) instead of a leading 0, so
                      // typing a price doesn't produce values like "067000".
                      value={it.unitPrice === 0 ? "" : it.unitPrice}
                      onChange={(e) =>
                        updateItem(it.key, {
                          unitPrice:
                            e.target.value === ""
                              ? 0
                              : Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className="input-style"
                      placeholder="15000"
                    />
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Line total: {formatIDR(lineTotal)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}

          {/* ORDER TOTAL */}
          <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
            <span className="text-sm font-medium text-[var(--muted-foreground)]">
              Order total
            </span>
            <span className="text-lg font-semibold text-[var(--foreground)]">
              {formatIDR(orderTotal)}
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}
