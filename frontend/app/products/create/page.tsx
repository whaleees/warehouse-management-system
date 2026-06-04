"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/layout/dashboard-shell";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import { api, upload, ApiError } from "@/lib/api";

const UOMS = ["PCS", "BOX", "BOTTLE", "G", "ML"];
const CATEGORIES = ["Seafood", "Beverages", "Grains", "Snacks", "General"];

export default function CreateProductPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    sku: "",
    category: "",
    uom: "",
    lowStockThreshold: "",
  });

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imagePath, setImagePath] = useState<string | null>(null);

  function generateSKU(name: string) {
    if (!name.trim()) return "";
    return "PRD-" + name.substring(0, 3).toUpperCase();
  }

  function updateField(field: string, value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "name" ? { sku: generateSKU(value) } : {}),
    }));
  }

  async function uploadImage(file: File) {
    const fd = new FormData();
    fd.append("image", file);

    try {
      const data = await upload("/upload", fd);
      if (!data.imagePath) return alert("Image upload failed");
      setImagePath(data.imagePath);
    } catch (err) {
      console.error("UPLOAD ERROR:", err);
      alert("Image upload failed");
    }
  }

  function handleImageChange(e: any) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImagePreview(URL.createObjectURL(file));
    uploadImage(file);
  }

  async function handleSubmit(e: any) {
    e.preventDefault();

    if (!form.name || !form.sku || !form.category || !form.uom) {
      alert("Please complete all required fields.");
      return;
    }

    try {
      await api("/products", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          sku: form.sku,
          category: form.category,
          uom: form.uom,
          lowStockThreshold: Number(form.lowStockThreshold || 0),
          imagePath: imagePath ?? null,
        }),
      });

      router.push("/products");
    } catch (err) {
      console.error("Create product failed:", err);
      alert(err instanceof ApiError ? err.message : "Failed to create product");
    }
  }

  return (
    <DashboardShell>
      <h1 className="text-xl font-semibold mb-8 tracking-wide font-mono">
        ADD PRODUCT
      </h1>

      <Card className="p-8 bg-[#111217] border border-[#1c1d22] rounded-xl shadow-lg space-y-10">

        {/* IMAGE PREVIEW */}
        <div className="w-full h-56 rounded-xl bg-[#0d0e10] border border-[#1c1d22] flex items-center justify-center relative overflow-hidden">
          {imagePreview ? (
            <img src={imagePreview} className="w-full h-full object-cover" />
          ) : (
            <span className="text-gray-500 text-xs font-mono tracking-wide">
              NO IMAGE SELECTED
            </span>
          )}

          <label
            className="
              absolute bottom-4 right-4 px-4 py-2 rounded-lg
              bg-white text-black font-mono text-[11px] tracking-widest
              cursor-pointer hover:bg-gray-200 transition
            "
          >
            UPLOAD
            <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
          </label>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="space-y-8">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

            {/* NAME */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-gray-400 tracking-wider font-mono">
                NAME
              </label>
              <input
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="Product Name"
                className="
                  px-3 py-2 rounded-lg bg-[#0d0e10] border border-[#1c1d22]
                  text-sm focus:border-gray-500 outline-none font-mono
                "
              />
            </div>

            {/* SKU */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-gray-400 tracking-wider font-mono">
                SKU
              </label>
              <input
                value={form.sku}
                readOnly
                className="
                  px-3 py-2 rounded-lg bg-[#181a1f] border border-[#1c1d22]
                  text-xs text-gray-600 font-mono cursor-not-allowed
                "
              />
            </div>

            {/* CATEGORY */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-gray-400 tracking-wider font-mono">
                CATEGORY
              </label>
              <select
                value={form.category}
                onChange={(e) => updateField("category", e.target.value)}
                className="
                  px-3 py-2 rounded-lg bg-[#0d0e10] border border-[#1c1d22]
                  text-sm focus:border-gray-500 outline-none font-mono
                "
              >
                <option value="">Select Category</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* UOM */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-gray-400 tracking-wider font-mono">
                UOM
              </label>
              <select
                value={form.uom}
                onChange={(e) => updateField("uom", e.target.value)}
                className="
                  px-3 py-2 rounded-lg bg-[#0d0e10] border border-[#1c1d22]
                  text-sm focus:border-gray-500 outline-none font-mono
                "
              >
                <option value="">Select UOM</option>
                {UOMS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>

            {/* LOW STOCK */}
            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="text-[11px] text-gray-400 tracking-wider font-mono">
                LOW STOCK THRESHOLD
              </label>
              <input
                type="number"
                min={0}
                value={form.lowStockThreshold}
                onChange={(e) => updateField("lowStockThreshold", e.target.value)}
                placeholder="10"
                className="
                  px-3 py-2 w-40 rounded-lg bg-[#0d0e10] border border-[#1c1d22]
                  text-sm focus:border-gray-500 outline-none font-mono
                "
              />
            </div>

          </div>

          {/* SUBMIT */}
          <Button
            type="submit"
            className="
              w-full py-3 rounded-lg bg-white text-black
              font-mono text-sm tracking-widest font-semibold
              hover:bg-gray-200 transition
            "
          >
            CREATE PRODUCT
          </Button>

        </form>
      </Card>
    </DashboardShell>
  );
}
