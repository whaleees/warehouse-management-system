"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardShell from "@/components/layout/dashboard-shell";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import LoadingState from "@/components/ui/loading-state";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { API_BASE_URL } from "@/lib/config";

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const toast = useToast();

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

  function updateField(field: string, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function saveProduct() {
    setSaving(true);

    try {
      await api(`/products/${id}`, {
        method: "PATCH",
        body: JSON.stringify(form),
      });

      toast.success("Changes saved.");
      router.push("/products");
    } catch (err) {
      console.error("Save failed:", err);
      toast.error("Couldn't save your changes. Please try again.");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <DashboardShell>
        <LoadingState message="Loading product..." />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="mb-10">
        <h1 className="text-2xl font-semibold text-[var(--foreground)] mb-1">
          Edit product
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Update this product's details.
        </p>
      </div>

      <Card className="p-8 space-y-8">

        {/* IMAGE PREVIEW */}
        <div className="w-full h-64 bg-[var(--muted)] border border-[var(--border)] rounded-xl flex items-center justify-center overflow-hidden">
          {form.imagePath ? (
            <img
              src={`${API_BASE_URL}${form.imagePath}`}
              alt="Product"
              className="w-full h-full object-cover rounded-lg"
            />
          ) : (
            <span className="text-[var(--muted-foreground)] text-sm">No image</span>
          )}
        </div>

        {/* FORM */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          <Input
            label="Name"
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            placeholder="Product name"
          />

          <Input
            label="Product code (SKU)"
            value={form.sku}
            disabled
            hint="The product code can't be changed."
          />

          <Input
            label="Category"
            value={form.category}
            onChange={(e) => updateField("category", e.target.value)}
            placeholder="Category"
          />

          <Input
            label="Unit of measure (UOM)"
            value={form.uom}
            onChange={(e) => updateField("uom", e.target.value)}
            placeholder="e.g. PCS, BOX, ML"
          />

          <Input
            label="Low stock alert"
            type="number"
            value={form.lowStockThreshold}
            onChange={(e) =>
              updateField("lowStockThreshold", Number(e.target.value))
            }
            placeholder="10"
            min={0}
            hint="Get notified when stock drops to this amount."
          />
        </div>

        {/* ACTIONS */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/products")}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={saveProduct}
            loading={saving}
          >
            Save changes
          </Button>
        </div>
      </Card>
    </DashboardShell>
  );
}
