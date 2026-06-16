"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardShell from "@/components/layout/dashboard-shell";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import LoadingState from "@/components/ui/loading-state";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/components/ui/toast";

export default function EditSupplierPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ name?: string }>({});

  const [form, setForm] = useState({
    code: "",
    name: "",
    contact: "",
    email: "",
    phone: "",
    address: "",
  });

  /** Load supplier */
  useEffect(() => {
    async function loadSupplier() {
      try {
        const data = await api(`/supplier/${id}`);

        setForm({
          code: data.code,
          name: data.name,
          contact: data.contact ?? "",
          email: data.email ?? "",
          phone: data.phone ?? "",
          address: data.address ?? "",
        });
      } catch (err) {
        console.error("Failed loading supplier:", err);
      }
      setLoading(false);
    }

    loadSupplier();
  }, [id]);

  function updateField(field: string, value: any) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "name" && value.trim()) {
      setErrors((prev) => ({ ...prev, name: undefined }));
    }
  }

  /** Save changes */
  async function saveSupplier() {
    if (!form.name.trim()) {
      setErrors({ name: "Enter a supplier name." });
      return;
    }

    setSaving(true);
    try {
      await api(`/supplier/${id}`, {
        method: "PATCH",
        body: JSON.stringify(form),
      });

      toast.success("Changes saved.");
      router.push("/suppliers");
    } catch (err) {
      console.error("Save failed:", err);
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Couldn't save your changes. Try again.",
      );
      setSaving(false);
    }
  }

  if (loading)
    return (
      <DashboardShell>
        <LoadingState message="Loading supplier…" />
      </DashboardShell>
    );

  return (
    <DashboardShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">
          Edit supplier
        </h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Update this vendor&apos;s contact details.
        </p>
      </div>

      <Card className="p-8">
        {/* Form grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

          <Input
            label="Code"
            value={form.code}
            disabled
            hint="The code can't be changed."
          />

          <Input
            label="Name"
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            error={errors.name}
          />

          <Input
            label="Contact person"
            value={form.contact}
            onChange={(e) => updateField("contact", e.target.value)}
          />

          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
          />

          <Input
            label="Phone"
            value={form.phone}
            onChange={(e) => updateField("phone", e.target.value)}
          />

          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="block text-sm font-medium text-[var(--foreground)]">
              Address
            </label>
            <textarea
              className="input-style h-24 resize-none"
              value={form.address}
              onChange={(e) => updateField("address", e.target.value)}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => router.push("/suppliers")}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button variant="primary" onClick={saveSupplier} loading={saving}>
            Save changes
          </Button>
        </div>
      </Card>
    </DashboardShell>
  );
}
