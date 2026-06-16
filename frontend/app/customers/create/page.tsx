"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/layout/dashboard-shell";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import { api, upload, ApiError } from "@/lib/api";
import { useToast } from "@/components/ui/toast";

export default function CreateCustomerPage() {
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

  type FieldErrors = Partial<Record<keyof typeof form, string>>;
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imagePath, setImagePath] = useState<string | null>(null);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (!form.code.trim()) next.code = "Enter a customer code.";
    if (!form.name.trim()) next.name = "Enter a customer name.";
    if (!form.contact.trim()) next.contact = "Enter a contact person.";
    if (!form.phone.trim()) next.phone = "Enter a phone number.";
    if (!form.address.trim()) next.address = "Enter an address.";
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      next.email = "Enter a valid email address.";
    return next;
  }

  async function handleImageUpload(file: File) {
    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await upload("/upload", formData);

      if (!res?.imagePath) {
        toast.error("Couldn't upload the image. Try a different file.");
        return;
      }

      setImagePath(res.imagePath);
    } catch {
      toast.error("Couldn't upload the image. Try again.");
    }
  }

  function onImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImagePreview(URL.createObjectURL(file));
    handleImageUpload(file);
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
      await api("/customer", {
        method: "POST",
        body: JSON.stringify({
          code: form.code.trim(),
          name: form.name.trim(),
          contact: form.contact.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
          email: form.email.trim() || undefined,
          imagePath: imagePath ?? null,
        }),
      });

      toast.success("Customer created.");
      router.push("/customers");
    } catch (err) {
      toast.error(
        err instanceof ApiError && err.message
          ? err.message
          : "Couldn't create the customer. Check the details and try again.",
      );
      setSaving(false);
    }
  }

  return (
    <DashboardShell>
      <h1 className="text-2xl font-semibold mb-6 text-[var(--foreground)]">
        Add customer
      </h1>

      <Card className="p-8 space-y-8">

        {/* Image upload */}
        <div className="w-full h-52 bg-[var(--muted)] rounded-xl flex items-center justify-center relative overflow-hidden">
          {imagePreview ? (
            <img
              src={imagePreview}
              alt="Customer preview"
              className="w-full h-full object-cover rounded-xl"
            />
          ) : (
            <span className="text-[var(--muted-foreground)] text-sm">
              No image selected
            </span>
          )}

          <label className="absolute bottom-3 right-3 inline-flex min-h-10 items-center rounded-lg border border-[var(--border)] bg-[var(--secondary)] px-4 text-sm font-medium text-[var(--secondary-foreground)] cursor-pointer hover:bg-[var(--bg-hover)] transition-colors">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <Input
              label="Customer code"
              value={form.code}
              onChange={(e) => updateField("code", e.target.value)}
              placeholder="CUST-001"
              error={errors.code}
            />

            <Input
              label="Name"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="Customer name"
              error={errors.name}
            />

            <Input
              label="Contact person"
              value={form.contact}
              onChange={(e) => updateField("contact", e.target.value)}
              placeholder="e.g. John Doe"
              error={errors.contact}
            />

            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="example@mail.com"
              error={errors.email}
              hint="Optional."
            />

            <Input
              label="Phone"
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              placeholder="+62..."
              error={errors.phone}
            />

            {/* Address */}
            <div className="md:col-span-2 space-y-1.5">
              <label className="block text-sm font-medium text-[var(--foreground)]">
                Address
              </label>
              <textarea
                value={form.address}
                onChange={(e) => updateField("address", e.target.value)}
                className={`w-full h-24 rounded-lg border bg-[var(--input)] p-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] resize-none transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--ring)] ${
                  errors.address
                    ? "border-[var(--danger)]"
                    : "border-[var(--border)]"
                }`}
                placeholder="Full address"
              />
              {errors.address && (
                <p className="text-xs font-medium text-[var(--danger-text)]">
                  {errors.address}
                </p>
              )}
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={saving}
            className="w-full"
          >
            Create customer
          </Button>

        </form>
      </Card>
    </DashboardShell>
  );
}
