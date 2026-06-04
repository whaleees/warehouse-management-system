"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/layout/dashboard-shell";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import { api, upload, ApiError } from "@/lib/api";

export default function CreateCustomerPage() {
  const router = useRouter();

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

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleImageUpload(file: File) {
    const formData = new FormData();
    formData.append("image", file);

    const res = await upload("/upload", formData);

    if (!res?.imagePath) {
      alert("Image upload failed");
      return;
    }

    setImagePath(res.imagePath);
  }

  function onImageChange(e: any) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImagePreview(URL.createObjectURL(file));
    handleImageUpload(file);
  }

  async function handleSubmit(e: any) {
    e.preventDefault();

    if (!form.code || !form.name) {
      alert("Customer code and name are required.");
      return;
    }

    try {
      await api("/customer", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          imagePath: imagePath ?? null,
        }),
      });

      router.push("/customers");
    } catch (err) {
      console.error("Create customer failed:", err);
      alert(err instanceof ApiError ? err.message : "Failed to create customer");
    }
  }

  return (
    <DashboardShell>
      <h1 className="text-xl font-semibold mb-6 tracking-wide font-mono">
        ADD CUSTOMER
      </h1>

      <Card className="p-8 space-y-8 bg-[#111217] border border-[#1c1d22] rounded-xl">

        {/* IMAGE UPLOAD */}
        <div className="w-full h-52 bg-[#0d0e10] rounded-xl flex items-center justify-center relative overflow-hidden">
          {imagePreview ? (
            <img
              src={imagePreview}
              className="w-full h-full object-cover rounded-xl"
            />
          ) : (
            <span className="text-gray-500 text-xs font-mono tracking-wide">
              NO IMAGE SELECTED
            </span>
          )}

          <label
            className="
              absolute bottom-3 right-3
              bg-white text-black
              px-3 py-1 rounded-lg 
              text-xs font-mono tracking-widest
              cursor-pointer hover:bg-gray-200 transition
            "
          >
            Upload Image
            <input
              type="file"
              accept="image/*"
              onChange={onImageChange}
              className="hidden"
            />
          </label>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <Input
              label="Customer Code"
              value={form.code}
              onChange={(v: string) => updateField("code", v)}
              placeholder="CUST-001"
            />

            <Input
              label="Name"
              value={form.name}
              onChange={(v: string) => updateField("name", v)}
              placeholder="Customer Name"
            />

            <Input
              label="Contact Person"
              value={form.contact}
              onChange={(v: string) => updateField("contact", v)}
              placeholder="Mr. John Doe"
            />

            <Input
              label="Email"
              value={form.email}
              onChange={(v: string) => updateField("email", v)}
              placeholder="example@mail.com"
            />

            <Input
              label="Phone"
              value={form.phone}
              onChange={(v: string) => updateField("phone", v)}
              placeholder="+62..."
            />

            {/* ADDRESS */}
            <div className="md:col-span-2">
              <label className="text-sm font-medium font-mono tracking-wide text-gray-300">
                Address
              </label>
              <textarea
                value={form.address}
                onChange={(e) => updateField("address", e.target.value)}
                className="
                  w-full h-24 bg-[#0d0e10] border border-[#1c1d22]
                  rounded-lg p-2 resize-none
                "
                placeholder="Full address"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="
              w-full py-3 text-lg rounded-xl 
              bg-white text-black font-mono tracking-widest
              hover:bg-gray-200 transition
            "
          >
            CREATE CUSTOMER
          </Button>

        </form>
      </Card>
    </DashboardShell>
  );
}

/* Reusable Input Component */
function Input({ label, value, onChange, placeholder }: any) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium font-mono tracking-wide text-gray-300">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="
          px-3 py-2 rounded-lg bg-[#0e0f13] 
          border border-[#1c1d22]
        "
        placeholder={placeholder}
      />
    </div>
  );
}
