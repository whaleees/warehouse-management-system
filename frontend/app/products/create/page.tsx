"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/layout/dashboard-shell";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { api, upload, ApiError } from "@/lib/api";

const UOMS = ["PCS", "BOX", "BOTTLE", "G", "ML"];
const CATEGORIES = ["Seafood", "Beverages", "Grains", "Snacks", "General"];

export default function CreateProductPage() {
  const router = useRouter();
  const toast = useToast();

  const [form, setForm] = useState({
    name: "",
    sku: "",
    category: "",
    uom: "",
    lowStockThreshold: "",
  });

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  type FieldErrors = Partial<Record<keyof typeof form, string>>;
  const [errors, setErrors] = useState<FieldErrors>({});

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
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (!form.name.trim()) next.name = "Enter a product name.";
    if (!form.category) next.category = "Select a category.";
    if (!form.uom) next.uom = "Select a unit of measure.";
    return next;
  }

  async function uploadImage(file: File) {
    const fd = new FormData();
    fd.append("image", file);

    try {
      const data = await upload("/upload", fd);
      if (!data.imagePath) {
        toast.error("Couldn't upload the image. Try a different file.");
        return;
      }
      setImagePath(data.imagePath);
    } catch (err) {
      console.error("UPLOAD ERROR:", err);
      toast.error("Couldn't upload the image. Try a different file.");
    }
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImagePreview(URL.createObjectURL(file));
    uploadImage(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSaving(true);
    try {
      await api("/products", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          sku: form.sku,
          category: form.category,
          uom: form.uom,
          lowStockThreshold: Number(form.lowStockThreshold || 0),
          imagePath: imagePath ?? null,
        }),
      });

      toast.success("Product created.");
      router.push("/products");
    } catch (err) {
      console.error("Create product failed:", err);
      toast.error(
        err instanceof ApiError && err.message
          ? err.message
          : "Couldn't create the product. Please try again.",
      );
      setSaving(false);
    }
  }

  return (
    <DashboardShell>
      <h1 className="text-2xl font-semibold text-[var(--foreground)] mb-8">
        Add product
      </h1>

      <Card className="p-8 space-y-10">

        {/* IMAGE PREVIEW */}
        <div className="w-full h-56 rounded-xl bg-[var(--muted)] border border-[var(--border)] flex items-center justify-center relative overflow-hidden">
          {imagePreview ? (
            <img src={imagePreview} alt="Product preview" className="w-full h-full object-cover" />
          ) : (
            <span className="text-[var(--muted-foreground)] text-sm">
              No image selected
            </span>
          )}

          <label
            className="
              absolute bottom-4 right-4 inline-flex items-center justify-center
              min-h-10 px-4 rounded-lg cursor-pointer text-sm font-medium
              bg-[var(--primary)] text-[var(--primary-foreground)]
              hover:bg-[var(--primary-hover)] transition-colors
            "
          >
            Upload image
            <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
          </label>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="space-y-8">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

            {/* NAME */}
            <Input
              label="Name"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="Product name"
              error={errors.name}
            />

            {/* SKU */}
            <Input
              label="Product code (SKU)"
              value={form.sku}
              readOnly
              hint="Generated automatically from the name."
            />

            {/* CATEGORY */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="category"
                className="block text-sm font-medium text-[var(--foreground)]"
              >
                Category
              </label>
              <select
                id="category"
                value={form.category}
                onChange={(e) => updateField("category", e.target.value)}
                className={`input-style ${
                  errors.category ? "border-[var(--danger)]" : ""
                }`}
              >
                <option value="">Select a category</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {errors.category && (
                <p className="text-xs font-medium text-[var(--danger-text)]">
                  {errors.category}
                </p>
              )}
            </div>

            {/* UOM */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="uom"
                className="block text-sm font-medium text-[var(--foreground)]"
              >
                Unit of measure (UOM)
              </label>
              <select
                id="uom"
                value={form.uom}
                onChange={(e) => updateField("uom", e.target.value)}
                className={`input-style ${
                  errors.uom ? "border-[var(--danger)]" : ""
                }`}
              >
                <option value="">Select a unit</option>
                {UOMS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
              {errors.uom && (
                <p className="text-xs font-medium text-[var(--danger-text)]">
                  {errors.uom}
                </p>
              )}
            </div>

            {/* LOW STOCK */}
            <div className="md:col-span-2 max-w-xs">
              <Input
                label="Low stock alert"
                type="number"
                min={0}
                value={form.lowStockThreshold}
                onChange={(e) => updateField("lowStockThreshold", e.target.value)}
                placeholder="10"
                hint="Get notified when stock drops to this amount."
              />
            </div>

          </div>

          {/* ACTIONS */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/products")}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              Create product
            </Button>
          </div>

        </form>
      </Card>
    </DashboardShell>
  );
}
