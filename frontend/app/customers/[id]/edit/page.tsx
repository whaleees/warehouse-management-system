"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardShell from "@/components/layout/dashboard-shell";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import { api } from "@/lib/api";
import { API_BASE_URL } from "@/lib/config";
import LoadingState from "@/components/ui/loading-state";
import { useToast } from "@/components/ui/toast";

export default function EditCustomerPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    code: "",
    name: "",
    contact: "",
    email: "",
    phone: "",
    address: "",
    imagePath: "",
  });

  // Load customer data
  useEffect(() => {
    async function load() {
      try {
        const data = await api(`/customer/${id}`);
        setForm({
          code: data.code,
          name: data.name,
          contact: data.contact ?? "",
          email: data.email ?? "",
          phone: data.phone ?? "",
          address: data.address ?? "",
          imagePath: data.imagePath ?? "",
        });
      } catch (err) {
        console.error("Load customer failed:", err);
        toast.error("Couldn't load this customer. Go back and try again.");
      }
      setLoading(false);
    }
    load();
  }, [id]);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function saveCustomer() {
    setSaving(true);

    try {
      await api(`/customer/${id}`, {
        method: "PATCH",
        body: JSON.stringify(form),
      });

      toast.success("Changes saved.");
      router.push("/customers");
    } catch (err) {
      console.error("Save failed:", err);
      toast.error("Couldn't save your changes. Try again.");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <DashboardShell>
        <LoadingState message="Loading customer…" />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-2xl font-semibold text-[var(--foreground)] mb-1">
          Edit customer
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Update this customer's details.
        </p>
      </div>

      <Card className="p-8 space-y-8">

        {/* Image preview */}
        <div className="w-full h-64 bg-[var(--muted)] border border-[var(--border)] rounded-xl flex items-center justify-center overflow-hidden">
          {form.imagePath ? (
            <img
              src={`${API_BASE_URL}${form.imagePath}`}
              alt="Customer"
              className="w-full h-full object-cover rounded-lg"
            />
          ) : (
            <span className="text-[var(--muted-foreground)] text-sm">No image</span>
          )}
        </div>

        {/* Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          <Input
            label="Name"
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            placeholder="Customer name"
          />

          <Input
            label="Code"
            value={form.code}
            disabled
            hint="The customer code can't be changed."
          />

          <Input
            label="Contact person"
            value={form.contact}
            onChange={(e) => updateField("contact", e.target.value)}
            placeholder="Contact person"
          />

          <Input
            label="Email"
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
            placeholder="Email"
          />

          <Input
            label="Phone"
            value={form.phone}
            onChange={(e) => updateField("phone", e.target.value)}
            placeholder="Phone number"
          />

          {/* Address */}
          <div className="md:col-span-2 space-y-1.5">
            <label className="block text-sm font-medium text-[var(--foreground)]">
              Address
            </label>
            <textarea
              value={form.address}
              onChange={(e) => updateField("address", e.target.value)}
              className="w-full h-24 rounded-lg border border-[var(--border)] bg-[var(--input)] p-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] resize-none transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              placeholder="Full address"
            />
          </div>
        </div>

        {/* Save */}
        <div className="flex justify-end">
          <Button
            variant="primary"
            onClick={saveCustomer}
            loading={saving}
            className="w-full md:w-auto"
          >
            Save changes
          </Button>
        </div>

      </Card>
    </DashboardShell>
  );
}
