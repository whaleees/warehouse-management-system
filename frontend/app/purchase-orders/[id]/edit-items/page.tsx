"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardShell from "@/components/layout/dashboard-shell";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import { api } from "@/lib/api";
import { formatIDR } from "@/lib/format";
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

export default function EditPoItemsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

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
    if (!newItem.productId || !newItem.quantity || !newItem.unitPrice) {
      alert("Please enter product, quantity, and unit price.");
      return;
    }

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
    } catch {
      alert("Failed to add item");
    }
    setSaving(false);
  }

  async function deleteItem(itemId: string) {
    if (!confirm("Remove this item from the PO?")) return;
    try {
      await api(`/purchase-order/${id}/item/${itemId}`, {
        method: "DELETE",
      });
      await loadPo();
    } catch {
      alert("Failed to delete item");
    }
  }

  if (loading) {
    return (
      <DashboardShell>
        <LoadingState className="text-sm text-[var(--text-muted)]" message="Loading..." />
      </DashboardShell>
    );
  }

  if (!po) {
    return (
      <DashboardShell>
        <EmptyState className="text-sm text-red-400" message="Purchase Order not found." />
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
            className="p-2 rounded-lg hover:bg-[#2b2c31] transition"
          >
            <ArrowLeft size={20} />
          </button>

          <div>
            <h1 className="text-2xl font-semibold">{po.orderNumber} – Edit Items</h1>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Add, edit, or remove items in this purchase order.
            </p>
          </div>
        </div>

        {/* CURRENT ITEMS */}
        <Card className="p-0 bg-[#111217] border border-[#1c1d22] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1c1d22] flex items-center gap-2">
            <Package size={16} />
            <h2 className="text-sm font-semibold">Current Items</h2>
          </div>

          <table className="w-full text-xs">
            <thead className="bg-[#0e0f12] text-[var(--text-muted)]">
              <tr>
                <th className="px-4 py-3 text-left">Product</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3 text-right">Unit Price</th>
                <th className="px-4 py-3 text-right">Line Total</th>
                <th className="px-4 py-3 text-right"></th>
              </tr>
            </thead>
              <tbody>
                {po.items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-4 text-center text-[var(--text-muted)]"
                    >
                      No items yet. Add one below.
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
                      } catch {
                        alert("Failed to update item");
                      }
                    }

                    return (
                      <tr
                        key={it.id}
                        className="border-t border-[#1c1d22] hover:bg-[#15171e] transition"
                      >
                        {/* PRODUCT */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-medium">{it.product.name}</span>
                            <span className="text-[10px] text-[var(--text-muted)]">
                              SKU: {it.product.sku}
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
                                    qty: Number(e.target.value),
                                  },
                                }))
                              }
                              className="w-20 px-2 py-1 bg-[#111217] border border-[#1c1d22] rounded"
                            />
                          ) : (
                            `${it.quantity} ${it.product.uom}`
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
                                    price: Number(e.target.value),
                                  },
                                }))
                              }
                              className="w-24 px-2 py-1 bg-[#111217] border border-[#1c1d22] rounded"
                            />
                          ) : (
                            formatIDR(Number(it.unitPrice))
                          )}
                        </td>

                        {/* LINE TOTAL */}
                        <td className="px-4 py-3 text-right">
                          {formatIDR(lineTotal)}
                        </td>

                        {/* ACTIONS */}
                        <td className="px-4 py-3 text-right flex gap-2 justify-end">
                          {isEditable && (
                            <>
                              {!isRowEditing ? (
                                <button
                                  onClick={beginEdit}
                                  className="px-2 py-1 text-blue-400 hover:text-blue-300 hover:bg-[#2b2c31] rounded transition"
                                >
                                  Edit
                                </button>
                              ) : (
                                <>
                                  <button
                                    onClick={saveEdit}
                                    className="px-2 py-1 text-green-400 hover:text-green-300 hover:bg-[#2b2c31] rounded transition"
                                  >
                                    Save
                                  </button>

                                  <button
                                    onClick={cancelEdit}
                                    className="px-2 py-1 text-yellow-400 hover:text-yellow-300 hover:bg-[#2b2c31] rounded transition"
                                  >
                                    Cancel
                                  </button>
                                </>
                              )}

                              <button
                                onClick={() => deleteItem(it.id)}
                                className="p-2 rounded-lg hover:bg-[#2b2c31] text-red-400 hover:text-red-300 transition"
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

          </table>
        </Card>

        {/* ADD ITEM */}
        <Card className="p-6 bg-[#111217] border border-[#1c1d22] rounded-xl">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Plus size={16} /> Add Item
          </h2>

          {!isEditable && (
            <p className="text-xs text-[var(--text-muted)] mb-4">
              This PO is no longer editable.
            </p>
          )}

          <form
            onSubmit={addItem}
            className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
          >
            {/* Product */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium">Product</label>
              <select
                disabled={!isEditable}
                value={newItem.productId}
                onChange={(e) =>
                  setNewItem((prev) => ({ ...prev, productId: e.target.value }))
                }
                className="px-3 py-2 rounded-lg bg-[#111217] border border-[#1c1d22] text-sm"
              >
                <option value="">Select Product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sku} - {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium">Quantity</label>
              <input
                type="number"
                min={1}
                disabled={!isEditable}
                value={newItem.quantity}
                onChange={(e) =>
                  setNewItem((prev) => ({ ...prev, quantity: e.target.value }))
                }
                className="px-3 py-2 rounded-lg bg-[#111217] border border-[#1c1d22] text-sm"
                placeholder="100"
              />
            </div>

            {/* Unit Price */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium">Unit Price (IDR)</label>
              <input
                type="number"
                min={0}
                disabled={!isEditable}
                value={newItem.unitPrice}
                onChange={(e) =>
                  setNewItem((prev) => ({ ...prev, unitPrice: e.target.value }))
                }
                className="px-3 py-2 rounded-lg bg-[#111217] border border-[#1c1d22] text-sm"
                placeholder="15000"
              />
            </div>

            {/* Add Button */}
            <div className="flex flex-col gap-1 text-right">
              <label className="text-xs text-[var(--text-muted)]">Line Total</label>
              <div className="text-sm font-semibold mb-2">
                {formatIDR(newLineTotal)}
              </div>

              <Button
                type="submit"
                disabled={!isEditable || saving}
                className="w-full md:w-auto bg-white text-black rounded-full h-10 px-5 font-medium hover:bg-neutral-100 transition"
              >
                {saving ? "Adding..." : "Add Item"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </DashboardShell>
  );
}
