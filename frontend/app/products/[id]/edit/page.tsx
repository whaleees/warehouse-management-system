"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardShell from "@/components/layout/dashboard-shell";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import { api } from "@/lib/api";
import { API_BASE_URL } from "@/lib/config";

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    sku: "",
    category: "",
    uom: "",
    lowStockThreshold: 0,
    imagePath: "",
  });

  // Load product data
  useEffect(() => {
    async function loadProduct() {
      try {
        const data = await api(`/products/${id}`);
        setForm({
          name: data.name,
          sku: data.sku,
          category: data.category,
          uom: data.uom,
          lowStockThreshold: data.lowStockThreshold,
          imagePath: data.imagePath ?? "",
        });
      } catch (err) {
        console.error("Load product failed:", err);
      }
      setLoading(false);
    }

    loadProduct();
  }, [id]);

  function updateField(field: string, value: any) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function saveProduct() {
    setSaving(true);

    try {
      await api(`/products/${id}`, {
        method: "PATCH",
        body: JSON.stringify(form),
      });

      router.push("/products");
    } catch (err) {
      console.error("Save failed:", err);
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <DashboardShell>
        <p className="text-gray-500 text-sm font-mono">LOADING PRODUCT...</p>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="mb-10">
        <h1 className="text-xl font-mono tracking-widest text-white mb-1">
          EDIT PRODUCT
        </h1>
        <p className="text-xs font-mono text-gray-500 tracking-widest">
          UPDATE PRODUCT DETAILS
        </p>
      </div>

      <Card className="p-8 bg-[#111217] border border-[#1c1d22] rounded-xl space-y-8">

        {/* IMAGE PREVIEW */}
        <div className="w-full h-64 bg-[#0d0e10] border border-[#1c1d22] rounded-xl flex items-center justify-center overflow-hidden">
          {form.imagePath ? (
            <img
              src={`${API_BASE_URL}${form.imagePath}`}
              alt="Product"
              className="w-full h-full object-cover rounded-lg"
            />
          ) : (
            <span className="text-gray-500 text-xs font-mono">NO IMAGE</span>
          )}
        </div>

        {/* FORM */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* NAME */}
          <Field label="NAME">
            <input
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              className="input-style"
              placeholder="Product name"
            />
          </Field>

          {/* SKU - READONLY */}
          <Field label="SKU">
            <input
              value={form.sku}
              disabled
              className="input-style bg-[#1a1c20] text-gray-500 cursor-not-allowed"
            />
          </Field>

          {/* CATEGORY */}
          <Field label="CATEGORY">
            <input
              value={form.category}
              onChange={(e) => updateField("category", e.target.value)}
              className="input-style"
              placeholder="Category"
            />
          </Field>

          {/* UOM */}
          <Field label="UOM">
            <input
              value={form.uom}
              onChange={(e) => updateField("uom", e.target.value)}
              className="input-style"
              placeholder="UOM"
            />
          </Field>

          {/* LOW STOCK */}
          <Field label="LOW STOCK THRESHOLD">
            <input
              type="number"
              value={form.lowStockThreshold}
              onChange={(e) =>
                updateField("lowStockThreshold", Number(e.target.value))
              }
              className="input-style"
              placeholder="10"
              min={0}
            />
          </Field>
        </div>

        {/* SAVE BUTTON */}
        <div className="flex justify-end">
          <button
            onClick={saveProduct}
            disabled={saving}
            className="
              px-6 py-2.5 rounded-lg 
              bg-white text-black font-mono text-xs tracking-widest
              hover:bg-gray-200 transition w-full md:w-auto
            "
          >
            {saving ? "SAVING..." : "SAVE CHANGES"}
          </button>
        </div>
      </Card>
    </DashboardShell>
  );
}

/* FIELD WRAPPER COMPONENT */
function Field({ label, children }: any) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-gray-400 text-[11px] font-mono tracking-widest">
        {label}
      </label>
      {children}
    </div>
  );
}

/* SHARED INPUT STYLE */
const inputStyles = `
  w-full rounded-lg p-2.5 text-sm
  bg-[#0e0f13] border border-[#1c1d22]
  focus:border-white outline-none font-mono
`;
