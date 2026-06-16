"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardShell from "@/components/layout/dashboard-shell";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import { api } from "@/lib/api";
import { API_BASE_URL } from "@/lib/config";
import { Product } from "@/lib/types";
import LoadingState from "@/components/ui/loading-state";
import EmptyState from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { useRole } from "@/lib/roles";

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params?.id as string;
  const toast = useToast();
  const confirm = useConfirm();
  const { can } = useRole();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProduct() {
    try {
      const data = await api(`/products/${productId}`);
      setProduct(data);
    } catch (err) {
      console.error("Product detail fetch error:", err);
    }
    setLoading(false);
  }

  async function deleteProduct() {
    if (!product) return;
    const ok = await confirm({
      title: `Delete ${product.name}?`,
      description: "This removes the product permanently. This can't be undone.",
      confirmLabel: "Delete product",
      tone: "danger",
      onConfirm: async () => {
        try {
          await api(`/products/${productId}`, { method: "DELETE" });
        } catch {
          throw new Error("Couldn't delete the product. Please try again.");
        }
      },
    });

    if (ok) {
      toast.success(`${product.name} was deleted.`);
      router.push("/products");
    }
  }

  useEffect(() => {
    loadProduct();
  }, []);

  if (loading) {
    return (
      <DashboardShell>
        <LoadingState message="Loading product..." />
      </DashboardShell>
    );
  }

  if (!product) {
    return (
      <DashboardShell>
        <EmptyState message="We couldn't find that product." />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="space-y-10">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              className="p-2 rounded-lg transition-colors hover:bg-[var(--bg-hover)]"
              onClick={() => router.push("/products")}
              aria-label="Back to products"
            >
              <ArrowLeft size={20} className="text-[var(--muted-foreground)]" />
            </button>

            <h1 className="text-2xl font-semibold text-[var(--foreground)]">
              {product.name}
            </h1>
          </div>

          <div className="flex gap-3">
            {can("manage:masterData") && (
              <Button
                variant="primary"
                onClick={() => router.push(`/products/${productId}/edit`)}
              >
                <Pencil size={16} /> Edit
              </Button>
            )}

            {can("manage:masterData") && (
              <Button variant="danger" onClick={deleteProduct}>
                <Trash2 size={16} /> Delete
              </Button>
            )}
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

          {/* IMAGE BLOCK */}
          <Card className="p-4 flex items-center justify-center h-72">
            {product.imagePath ? (
              <img
                src={`${API_BASE_URL}${product.imagePath}`}
                alt={product.name}
                className="w-full h-full object-cover rounded-xl"
              />
            ) : (
              <div className="w-full h-full rounded-xl bg-[var(--muted)] border border-[var(--border)] flex items-center justify-center">
                <span className="text-[var(--muted-foreground)] text-sm">No image</span>
              </div>
            )}
          </Card>

          {/* DETAILS BLOCK */}
          <Card className="p-8 lg:col-span-2">
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-6">
              Product details
            </h2>

            <div className="space-y-4 text-sm">
              <DetailRow label="Name" value={product.name} />
              <DetailRow label="Product code (SKU)" value={product.sku} />
              <DetailRow label="Category" value={product.category} />
              {product.brand && <DetailRow label="Brand" value={product.brand} />}
              <DetailRow label="Unit of measure (UOM)" value={product.uom} />
              <DetailRow
                label="Low stock alert"
                value={String(product.lowStockThreshold)}
              />
            </div>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}

/* Detail Row Component */
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center border-b border-[var(--border)] pb-3">
      <span className="text-sm text-[var(--muted-foreground)]">
        {label}
      </span>
      <span className="font-semibold text-[var(--foreground)]">{value}</span>
    </div>
  );
}
