"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/layout/dashboard-shell";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import { api, upload, ApiError } from "@/lib/api";
import { useToast } from "@/components/ui/toast";

export default function CreateSupplierPage() {
  const router = useRouter();
  const toast = useToast();

  const [form, setForm] = useState({
    code: "",
    name: "",
    contact: "",
    email: "",
    phone: "",
    address: "",
  });

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imagePath, setImagePath] = useState<string | null>(null);
  type FieldErrors = Partial<Record<keyof typeof form, string>>;
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  function generateCode(name: string) {
    if (!name.trim()) return "";
    return "SUP-" + name.substring(0, 3).toUpperCase();
  }

  function updateField(field: string, value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "name" ? { code: generateCode(value) } : {}),
    }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (!form.name.trim()) next.name = "Enter a supplier name.";
    if (!form.contact.trim()) next.contact = "Enter a contact person.";
    if (!form.phone.trim()) next.phone = "Enter a phone number.";
    if (!form.address.trim()) next.address = "Enter an address.";
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      next.email = "Enter a valid email address.";
    return next;
  }

  async function handleImageUpload(file: File) {
    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await upload("/upload", formData);
      if (!res?.imagePath) {
        toast.error("Couldn't upload that image. Try a different file.");
        return;
      }
      setImagePath(res.imagePath);
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Couldn't upload that image. Try a different file.");
    }
  }

  function onImageChange(e: any) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImagePreview(URL.createObjectURL(file));
    handleImageUpload(file);
  }

  async function handleSubmit(e: any) {
    e.preventDefault();

    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSaving(true);
    try {
      await api("/supplier", {
        method: "POST",
        body: JSON.stringify({
          code: form.code,
          name: form.name.trim(),
          contact: form.contact.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
          email: form.email.trim() || undefined,
          imagePath: imagePath ?? null,
        }),
      });

      toast.success(`${form.name} was added.`);
      router.push("/suppliers");
    } catch (err) {
      console.error("Create supplier failed:", err);
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Couldn't add this supplier. Check the details and try again.",
      );
      setSaving(false);
    }
  }

  return (
    <DashboardShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">
          Add supplier
        </h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Save a new vendor you buy stock from.
        </p>
      </div>

      <Card className="space-y-8 p-8">

        {/* Image upload */}
        <div className="relative flex h-52 w-full items-center justify-center overflow-hidden rounded-xl bg-[var(--muted)]">
          {imagePreview ? (
            <img
              src={imagePreview}
              alt="Supplier preview"
              className="h-full w-full rounded-xl object-cover"
            />
          ) : (
            <span className="text-sm text-[var(--muted-foreground)]">
              No image selected
            </span>
          )}

          <label className="absolute bottom-3 right-3 inline-flex min-h-10 cursor-pointer items-center rounded-lg border border-[var(--border)] bg-[var(--secondary)] px-4 text-sm font-medium text-[var(--secondary-foreground)] transition-colors hover:bg-[var(--bg-hover)]">
            Upload image
            <input
              type="file"
              accept="image/*"
              onChange={onImageChange}
              className="hidden"
            />
          </label>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

            <Input
              label="Supplier name"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="Ocean Fresh Fisheries"
              error={errors.name}
            />

            <Input
              label="Code"
              value={form.code}
              readOnly
              hint="Generated automatically from the name."
            />

            <Input
              label="Contact person"
              value={form.contact}
              onChange={(e) => updateField("contact", e.target.value)}
              placeholder="Mr. Whale"
              error={errors.contact}
            />

            <Input
              label="Phone"
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              placeholder="+62-812-8888-9999"
              error={errors.phone}
            />

            <div className="md:col-span-2">
              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="contact@oceanfresh.com"
                error={errors.email}
                hint="Optional."
              />
            </div>

            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="block text-sm font-medium text-[var(--foreground)]">
                Address
              </label>
              <textarea
                value={form.address}
                onChange={(e) => updateField("address", e.target.value)}
                placeholder="Jl. Sukarno Hatta No. 45, Surabaya"
                className={`input-style h-24 resize-none ${
                  errors.address ? "border-[var(--danger)]" : ""
                }`}
              />
              {errors.address && (
                <p className="text-xs font-medium text-[var(--danger-text)]">
                  {errors.address}
                </p>
              )}
            </div>

          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/suppliers")}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              Add supplier
            </Button>
          </div>
        </form>
      </Card>
    </DashboardShell>
  );
}
