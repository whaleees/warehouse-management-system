"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardShell from "@/components/layout/dashboard-shell";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import { api } from "@/lib/api";
import { formatIDR } from "@/lib/format";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import LoadingState from "@/components/ui/loading-state";
import EmptyState from "@/components/ui/empty-state";
import { ArrowLeft, Package, Plus, Trash2 } from "lucide-react";

interface Product {
  id: string;
  name: string;
  sku: string;
  uom: string;
}

interface PurchaseOrderItem {
  id: string;
  quantity: number;
  unitPrice: string;
  product: Product;
}

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  status: string;
  items: PurchaseOrderItem[];
}

interface NewItemErrors {
  productId?: string;
  quantity?: string;
  unitPrice?: string;
}

export default function EditPoItemsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const toast = useToast();
  const confirm = useConfirm();

  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);

  const [products, setProducts] = useState<Product[]>([]);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Record<
    string,
    { isEditing: boolean; qty?: number; price?: number }
  >>({});

  const [newItem, setNewItem] = useState({
    productId: "",
    quantity: "",
    unitPrice: "",
  });
  const [newItemErrors, setNewItemErrors] = useState<NewItemErrors>({});

  async function loadPo() {
    try {
      const data = await api(`/purchase-order/${id}`);
      setPo(data);
    } catch {
      setPo(null);
    }
    setLoading(false);
  }

  async function loadProducts() {
    try {
      const data = await api("/products");
      setProducts(Array.isArray(data) ? data : []);
    } catch {
      setProducts([]);
    }
  }

  useEffect(() => {
    loadPo();
    loadProducts();
  }, [id]);

  const isEditable = po?.status === "DRAFT" || po?.status === "PENDING";

  const newLineTotal = useMemo(() => {
    if (!newItem.quantity || !newItem.unitPrice) return 0;
    return Number(newItem.quantity) * Number(newItem.unitPrice);
  }, [newItem]);

  async function addItem(e: React.FormEvent) {
    e.preventDefault();

    const errors: NewItemErrors = {};
    if (!newItem.productId) errors.productId = "Choose a product.";
    if (!newItem.quantity || Number(newItem.quantity) < 1)
      errors.quantity = "Enter a quantity of 1 or more.";
    if (newItem.unitPrice === "" || Number(newItem.unitPrice) < 0)
      errors.unitPrice = "Enter a unit price of 0 or more.";

    if (Object.keys(errors).length > 0) {
      setNewItemErrors(errors);
      return;
    }
    setNewItemErrors({});

    setSaving(true);
    try {
      await api(`/purchase-order/${id}/item`, {
        method: "POST",
        body: JSON.stringify({
          productId: newItem.productId,
          quantity: Number(newItem.quantity),
          unitPrice: Number(newItem.unitPrice),
        }),
      });

      setNewItem({ productId: "", quantity: "", unitPrice: "" });
      await loadPo();
      toast.success("Item added to the purchase order.");
    } catch {
      toast.error("Couldn't add the item. Check the details and try again.");
    }
    setSaving(false);
  }

  async function deleteItem(itemId: string, productName: string) {
    const ok = await confirm({
      title: `Remove ${productName} from this order?`,
      description: "This takes the item off the purchase order.",
      confirmLabel: "Remove item",
      tone: "danger",
      onConfirm: async () => {
        try {
          await api(`/purchase-order/${id}/item/${itemId}`, {
            method: "DELETE",
          });
        } catch {
          throw new Error("Couldn't remove the item. Try again.");
        }
      },
    });
    if (ok) {
      await loadPo();
      toast.success("Item removed from the order.");
    }
  }

  if (loading) {
    return (
      <DashboardShell>
        <LoadingState message="Loading…" />
      </DashboardShell>
    );
  }

  if (!po) {
    return (
      <DashboardShell>
        <EmptyState message="We couldn't find this purchase order." />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="space-y-8">
        {/* HEADER */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/purchase-orders/${po.id}`)}
            className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition"
            aria-label="Back to purchase order"
          >
            <ArrowLeft size={20} />
          </button>

          <div>
            <h1 className="text-2xl font-semibold text-[var(--foreground)]">
              {po.orderNumber} — Edit items
            </h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              Add, change, or remove the items on this purchase order.
            </p>
          </div>
        </div>

        {/* CURRENT ITEMS */}
        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)] flex items-center gap-2">
            <Package size={16} className="text-[var(--muted-foreground)]" />
            <h2 className="text-base font-semibold text-[var(--card-foreground)]">Current items</h2>
          </div>

          <table className="w-full text-sm">
            <thead className="bg-[var(--muted)] text-[var(--muted-foreground)]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium">Product</th>
                <th className="px-4 py-3 text-right text-xs font-medium">Quantity</th>
                <th className="px-4 py-3 text-right text-xs font-medium">Unit price</th>
                <th className="px-4 py-3 text-right text-xs font-medium">Line total</th>
                <th className="px-4 py-3 text-right text-xs font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {po.items.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-4 text-center text-[var(--muted-foreground)]"
                  >
                    No items yet. Add one with the form below.
                  </td>
                </tr>
              ) : (
                po.items.map((it) => {
                  const isRowEditing = editing[it.id]?.isEditing || false;
                  const rowQty = editing[it.id]?.qty ?? it.quantity;
                  const rowPrice = editing[it.id]?.price ?? Number(it.unitPrice);
                  const lineTotal = rowQty * rowPrice;

                  function beginEdit() {
                    setEditing((prev) => ({
                      ...prev,
                      [it.id]: {
                        isEditing: true,
                        qty: it.quantity,
                        price: Number(it.unitPrice),
                      },
                    }));
                  }

                  function cancelEdit() {
                    setEditing((prev) => ({
                      ...prev,
                      [it.id]: { isEditing: false },
                    }));
                  }

                  async function saveEdit() {
                    try {
                      await api(`/purchase-order/${id}/item/${it.id}`, {
                        method: "PATCH",
                        body: JSON.stringify({
                          quantity: rowQty,
                          unitPrice: rowPrice,
                        }),
                      });

                      setEditing((prev) => ({
                        ...prev,
                        [it.id]: { isEditing: false },
                      }));

                      await loadPo();
                      toast.success("Item updated.");
                    } catch {
                      toast.error("Couldn't update the item. Try again.");
                    }
                  }

                  return (
                    <tr
                      key={it.id}
                      className="border-t border-[var(--border)] hover:bg-[var(--bg-hover)] transition"
                    >
                      {/* PRODUCT */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-[var(--foreground)]">{it.product.name}</span>
                          <span
                            className="text-xs text-[var(--muted-foreground)]"
                            title="SKU: the product's stock-keeping number"
                          >
                            Item code: {it.product.sku}
                          </span>
                        </div>
                      </td>

                      {/* QUANTITY */}
                      <td className="px-4 py-3 text-right">
                        {isRowEditing ? (
                          <input
                            type="number"
                            min={1}
                            value={rowQty}
                            onChange={(e) =>
                              setEditing((prev) => ({
                                ...prev,
                                [it.id]: {
                                  ...prev[it.id],
                                  qty: Math.max(1, Number(e.target.value) || 1),
                                },
                              }))
                            }
                            className="w-20 min-h-9 px-2 py-1 bg-[var(--input)] border border-[var(--border)] rounded text-[var(--foreground)] text-right focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                          />
                        ) : (
                          <span className="text-[var(--foreground)]">
                            {it.quantity} {it.product.uom}
                          </span>
                        )}
                      </td>

                      {/* UNIT PRICE */}
                      <td className="px-4 py-3 text-right">
                        {isRowEditing ? (
                          <input
                            type="number"
                            min={0}
                            value={rowPrice}
                            onChange={(e) =>
                              setEditing((prev) => ({
                                ...prev,
                                [it.id]: {
                                  ...prev[it.id],
                                  price: Math.max(0, Number(e.target.value) || 0),
                                },
                              }))
                            }
                            className="w-24 min-h-9 px-2 py-1 bg-[var(--input)] border border-[var(--border)] rounded text-[var(--foreground)] text-right focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                          />
                        ) : (
                          <span className="text-[var(--foreground)]">
                            {formatIDR(Number(it.unitPrice))}
                          </span>
                        )}
                      </td>

                      {/* LINE TOTAL */}
                      <td className="px-4 py-3 text-right text-[var(--foreground)]">
                        {formatIDR(lineTotal)}
                      </td>

                      {/* ACTIONS */}
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-end">
                          {isEditable && (
                            <>
                              {!isRowEditing ? (
                                <Button variant="outline" size="sm" onClick={beginEdit}>
                                  Edit
                                </Button>
                              ) : (
                                <>
                                  <Button variant="success" size="sm" onClick={saveEdit}>
                                    Save
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={cancelEdit}>
                                    Cancel
                                  </Button>
                                </>
                              )}

                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => deleteItem(it.id, it.product.name)}
                                aria-label={`Remove ${it.product.name}`}
                              >
                                <Trash2 size={15} />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </Card>

        {/* ADD ITEM */}
        <Card>
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2 text-[var(--card-foreground)]">
            <Plus size={16} /> Add item
          </h2>

          {!isEditable && (
            <p className="text-sm text-[var(--muted-foreground)] mb-4">
              This order can no longer be edited.
            </p>
          )}

          <form
            onSubmit={addItem}
            className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start"
          >
            {/* Product */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--foreground)]">Product</label>
              <select
                disabled={!isEditable}
                value={newItem.productId}
                onChange={(e) => {
                  setNewItem((prev) => ({ ...prev, productId: e.target.value }));
                  if (e.target.value)
                    setNewItemErrors((prev) => ({ ...prev, productId: undefined }));
                }}
                className={`min-h-10 px-3 py-2 rounded-lg bg-[var(--input)] border text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] ${
                  newItemErrors.productId ? "border-[var(--danger)]" : "border-[var(--border)]"
                }`}
              >
                <option value="">Select a product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sku} - {p.name}
                  </option>
                ))}
              </select>
              {newItemErrors.productId && (
                <p className="text-xs font-medium text-[var(--danger-text)]">
                  {newItemErrors.productId}
                </p>
              )}
            </div>

            {/* Quantity */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--foreground)]">Quantity</label>
              <input
                type="number"
                min={1}
                disabled={!isEditable}
                value={newItem.quantity}
                onChange={(e) => {
                  const raw = e.target.value;
                  const clamped = raw === "" ? "" : String(Math.max(1, Number(raw) || 1));
                  setNewItem((prev) => ({ ...prev, quantity: clamped }));
                  if (clamped !== "")
                    setNewItemErrors((prev) => ({ ...prev, quantity: undefined }));
                }}
                className={`min-h-10 px-3 py-2 rounded-lg bg-[var(--input)] border text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] ${
                  newItemErrors.quantity ? "border-[var(--danger)]" : "border-[var(--border)]"
                }`}
                placeholder="100"
              />
              {newItemErrors.quantity && (
                <p className="text-xs font-medium text-[var(--danger-text)]">
                  {newItemErrors.quantity}
                </p>
              )}
            </div>

            {/* Unit Price */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--foreground)]">Unit price (Rp)</label>
              <input
                type="number"
                min={0}
                disabled={!isEditable}
                value={newItem.unitPrice}
                onChange={(e) => {
                  const raw = e.target.value;
                  const clamped = raw === "" ? "" : String(Math.max(0, Number(raw) || 0));
                  setNewItem((prev) => ({ ...prev, unitPrice: clamped }));
                  if (clamped !== "")
                    setNewItemErrors((prev) => ({ ...prev, unitPrice: undefined }));
                }}
                className={`min-h-10 px-3 py-2 rounded-lg bg-[var(--input)] border text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] ${
                  newItemErrors.unitPrice ? "border-[var(--danger)]" : "border-[var(--border)]"
                }`}
                placeholder="15000"
              />
              {newItemErrors.unitPrice && (
                <p className="text-xs font-medium text-[var(--danger-text)]">
                  {newItemErrors.unitPrice}
                </p>
              )}
            </div>

            {/* Add Button */}
            <div className="flex flex-col gap-1 text-right">
              <label className="text-sm text-[var(--muted-foreground)]">Line total</label>
              <div className="text-sm font-semibold mb-2 text-[var(--foreground)]">
                {formatIDR(newLineTotal)}
              </div>

              <Button
                type="submit"
                variant="primary"
                loading={saving}
                disabled={!isEditable || saving}
                className="w-full md:w-auto"
              >
                {saving ? "Adding…" : "Add item"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </DashboardShell>
  );
}
