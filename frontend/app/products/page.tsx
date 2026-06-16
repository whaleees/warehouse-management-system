"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/layout/dashboard-shell";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import LoadingState from "@/components/ui/loading-state";
import EmptyState from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Pencil, Trash2, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { API_BASE_URL } from "@/lib/config";
import { Product } from "@/lib/types";
import { useRole } from "@/lib/roles";

export default function ProductsPage() {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const { can } = useRole();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadProducts() {
    try {
      const data = await api("/products");
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Product API error:", err);
      setProducts([]);
    }
    setLoading(false);
  }

  async function deleteProduct(product: Product) {
    const ok = await confirm({
      title: `Delete ${product.name}?`,
      description: "This removes the product permanently. This can't be undone.",
      confirmLabel: "Delete product",
      tone: "danger",
      onConfirm: async () => {
        try {
          await api(`/products/${product.id}`, { method: "DELETE" });
        } catch {
          throw new Error("Couldn't delete the product. Please try again.");
        }
      },
    });

    if (ok) {
      toast.success(`${product.name} was deleted.`);
      loadProducts();
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  return (
    <DashboardShell>
      <div className="space-y-8">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">
            Products
          </h1>

          {can("manage:masterData") && (
            <Button
              variant="primary"
              onClick={() => router.push("/products/create")}
            >
              <Plus size={16} /> Add product
            </Button>
          )}
        </div>

        {/* CONTENT */}
        {loading ? (
          <LoadingState message="Loading products..." />
        ) : products.length === 0 ? (
          <EmptyState message="No products yet. Use the Add product button to create your first one." />
        ) : (
          <div
            className="
              grid
              grid-cols-1
              sm:grid-cols-2
              lg:grid-cols-3
              xl:grid-cols-4
              gap-6
            "
          >
            {products.map((p) => (
              <Card
                key={p.id}
                className="
                  hover:border-[var(--ring)] hover:bg-[var(--bg-hover)]
                  transition-all relative
                  flex flex-col justify-between
                "
              >
                {/* CLICKABLE CONTENT */}
                <div
                  className="flex flex-col flex-grow cursor-pointer"
                  onClick={() => router.push(`/products/${p.id}`)}
                >
                  {/* IMAGE */}
                  {p.imagePath ? (
                    <img
                      src={`${API_BASE_URL}${p.imagePath}`}
                      alt={p.name}
                      className="w-full h-36 object-cover rounded-lg mb-4"
                    />
                  ) : (
                    <div
                      className="
                        w-full h-36 bg-[var(--muted)] rounded-lg mb-4
                        flex items-center justify-center
                        text-[var(--muted-foreground)] text-sm
                      "
                    >
                      No image
                    </div>
                  )}

                  {/* INFO */}
                  <div className="space-y-1">
                    <p className="font-semibold text-lg text-[var(--foreground)] mb-1">
                      {p.name}
                    </p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      Product code (SKU): {p.sku}
                    </p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      Category: {p.category}
                    </p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      Unit of measure (UOM): {p.uom}
                    </p>
                  </div>
                </div>

                {/* ACTIONS */}
                <div className="flex justify-end gap-2 mt-4">
                  {can("manage:masterData") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/products/${p.id}/edit`);
                      }}
                    >
                      <Pencil size={16} /> Edit
                    </Button>
                  )}

                  {can("manage:masterData") && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteProduct(p);
                      }}
                    >
                      <Trash2 size={16} /> Delete
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
