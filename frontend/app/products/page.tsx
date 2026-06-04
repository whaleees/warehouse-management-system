"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/layout/dashboard-shell";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import { Pencil, Trash2, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { API_BASE_URL } from "@/lib/config";
import { Product } from "@/lib/types";

export default function ProductsPage() {
  const router = useRouter();
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

  async function deleteProduct(id: string) {
    if (!confirm("Delete this product?")) return;
    await api(`/products/${id}`, { method: "DELETE" });
    loadProducts();
  }

  useEffect(() => {
    loadProducts();
  }, []);

  return (
    <DashboardShell>
      <div className="space-y-8">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-wide font-mono">
            PRODUCTS
          </h1>

          <button
            onClick={() => router.push("/products/create")}
            className="
              px-4 py-2 rounded-lg bg-white text-black 
              font-mono text-xs tracking-widest font-semibold
              hover:bg-gray-200 transition
              flex items-center gap-2
            "
          >
            <Plus size={14} /> ADD PRODUCT
          </button>
        </div>

        {/* CONTENT */}
        {loading ? (
          <p className="text-xs text-gray-500 font-mono tracking-wide">
            Loading products...
          </p>
        ) : products.length === 0 ? (
          <p className="text-xs text-gray-500 font-mono tracking-wide">
            No products found.
          </p>
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
                  p-5 bg-[#111217] border border-[#1c1d22] rounded-xl 
                  hover:border-gray-500 hover:bg-[#15161b]
                  transition-all cursor-pointer relative
                  flex flex-col justify-between shadow-md
                "
              >
                {/* CLICKABLE CONTENT */}
                <div
                  className="flex flex-col flex-grow"
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
                        w-full h-36 bg-[#0d0e10] rounded-lg mb-4 
                        flex items-center justify-center 
                        text-gray-600 text-xs font-mono tracking-wide
                      "
                    >
                      NO IMAGE
                    </div>
                  )}

                  {/* INFO */}
                  <div>
                    <p className="font-semibold text-lg mb-1">{p.name}</p>
                    <p className="text-[10px] text-gray-400 font-mono tracking-wider">
                      SKU: {p.sku}
                    </p>
                    <p className="text-[10px] text-gray-400 font-mono tracking-wider">
                      CATEGORY: {p.category}
                    </p>
                    <p className="text-[10px] text-gray-400 font-mono tracking-wider">
                      UOM: {p.uom}
                    </p>
                  </div>
                </div>

                {/* ACTIONS */}
                <div className="flex justify-end gap-4 mt-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/products/${p.id}`);
                    }}
                    className="text-gray-300 hover:text-white transition"
                  >
                    <Pencil size={18} />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteProduct(p.id);
                    }}
                    className="text-red-400 hover:text-red-300 transition"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
