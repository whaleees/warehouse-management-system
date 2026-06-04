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
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params?.id as string;

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
    if (!confirm("DELETE THIS PRODUCT?")) return;
    await api(`/products/${productId}`, { method: "DELETE" });
    router.push("/products");
  }

  useEffect(() => {
    loadProduct();
  }, []);

  if (loading) {
    return (
      <DashboardShell>
        <LoadingState className="text-sm text-gray-500 font-mono" message="LOADING PRODUCT..." />
      </DashboardShell>
    );
  }

  if (!product) {
    return (
      <DashboardShell>
        <EmptyState className="text-sm text-red-400 font-mono" message="PRODUCT NOT FOUND." />
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
              className="p-2 hover:bg-[#1a1c20] rounded-lg transition"
              onClick={() => router.push("/products")}
            >
              <ArrowLeft size={20} className="text-gray-300" />
            </button>

            <h1 className="text-xl font-semibold tracking-wide font-mono">
              {product.name.toUpperCase()}
            </h1>
          </div>

          <div className="flex gap-3">

            {/* EDIT BUTTON */}
            <button
              onClick={() => router.push(`/products/${productId}/edit`)}
              className="
                px-4 py-2 rounded-lg bg-white text-black font-mono text-xs tracking-widest
                hover:bg-gray-200 transition flex items-center gap-2
              "
            >
              <Pencil size={14} />
              EDIT
            </button>

            {/* DELETE BUTTON */}
            <button
              onClick={deleteProduct}
              className="
                px-4 py-2 rounded-lg border border-red-500 text-red-400
                font-mono text-xs tracking-widest hover:bg-red-500/20 transition
                flex items-center gap-2
              "
            >
              <Trash2 size={14} />
              DELETE
            </button>

          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

          {/* IMAGE BLOCK */}
          <Card className="p-4 bg-[#111217] border border-[#1c1d22] rounded-xl flex items-center justify-center h-72">
            {product.imagePath ? (
              <img
                src={`${API_BASE_URL}${product.imagePath}`}
                alt={product.name}
                className="w-full h-full object-cover rounded-xl"
              />
            ) : (
              <div className="w-full h-full rounded-xl bg-[#0d0e10] border border-[#1c1d22] flex items-center justify-center">
                <span className="text-gray-500 text-xs font-mono">NO IMAGE</span>
              </div>
            )}
          </Card>

          {/* DETAILS BLOCK */}
          <Card className="p-8 bg-[#111217] border border-[#1c1d22] rounded-xl lg:col-span-2">
            <h2 className="text-sm font-mono tracking-widest text-gray-400 mb-6">
              PRODUCT DETAILS
            </h2>

            <div className="space-y-4 text-sm">
              <DetailRow label="NAME" value={product.name} />
              <DetailRow label="SKU" value={product.sku} />
              <DetailRow label="CATEGORY" value={product.category} />
              {product.brand && <DetailRow label="BRAND" value={product.brand} />}
              <DetailRow label="UOM" value={product.uom} />
              <DetailRow
                label="LOW STOCK THRESHOLD"
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
    <div className="flex justify-between items-center border-b border-[#232428] pb-3">
      <span className="text-[11px] text-gray-500 font-mono tracking-widest">
        {label}
      </span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}
