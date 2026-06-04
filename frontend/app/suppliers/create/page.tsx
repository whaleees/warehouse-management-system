"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/layout/dashboard-shell";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import { api, upload, ApiError } from "@/lib/api";

export default function CreateSupplierPage() {
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

    if (!form.name || !form.code) {
      alert("Please complete required fields.");
      return;
    }

    try {
      await api("/supplier", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          imagePath: imagePath ?? null,
        }),
      });

      router.push("/suppliers");
    } catch (err) {
      console.error("Create supplier failed:", err);
      alert(err instanceof ApiError ? err.message : "Failed to create supplier");
    }
  }

  return (
    <DashboardShell>
      {/* Heading matches products-create style */}
      <h1 className="text-xl font-semibold tracking-wide font-mono mb-6">
        ADD SUPPLIER
      </h1>

      <Card className="p-8 space-y-8 bg-[#111217] border border-[#1c1d22] rounded-xl shadow-md">

        {/* IMAGE UPLOAD SECTION — identical style to product create */}
        <div className="w-full h-52 bg-[#0d0e10] rounded-xl flex items-center justify-center relative overflow-hidden">
          {imagePreview ? (
            <img
              src={imagePreview}
              className="w-full h-full object-cover rounded-xl"
            />
          ) : (
            <span className="text-gray-500 text-xs font-mono tracking-wider">
              NO IMAGE SELECTED
            </span>
          )}

          <label
            className="
              absolute bottom-3 right-3
              bg-white text-black
              px-3 py-1 rounded-lg
              text-xs font-mono tracking-wider
              cursor-pointer hover:bg-gray-200 transition
            "
          >
            UPLOAD IMAGE
            <input type="file" accept="image/*" onChange={onImageChange} className="hidden" />
          </label>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Supplier Name */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-mono tracking-widest text-gray-300">
                SUPPLIER NAME
              </label>
              <input
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="Ocean Fresh Fisheries"
                className="
                  px-3 py-2 rounded-lg bg-[#0e0f13] 
                  border border-[#1c1d22] text-sm
                  focus:border-gray-400 outline-none
                "
              />
            </div>

            {/* Code */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-mono tracking-widest text-gray-300">
                CODE
              </label>
              <input
                value={form.code}
                readOnly
                className="
                  px-3 py-2 rounded-lg bg-[#1a1c20] 
                  border border-[#2a2c32] text-gray-500 
                  text-sm cursor-not-allowed
                "
              />
            </div>

            {/* Contact */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-mono tracking-widest text-gray-300">
                CONTACT PERSON
              </label>
              <input
                value={form.contact}
                onChange={(e) => updateField("contact", e.target.value)}
                placeholder="Mr. Whale"
                className="
                  px-3 py-2 rounded-lg bg-[#0e0f13] 
                  border border-[#1c1d22] text-sm
                "
              />
            </div>

            {/* Phone */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-mono tracking-widest text-gray-300">
                PHONE
              </label>
              <input
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                placeholder="+62-812-8888-9999"
                className="
                  px-3 py-2 rounded-lg bg-[#0e0f13] 
                  border border-[#1c1d22] text-sm
                "
              />
            </div>

            {/* Email */}
            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-[11px] font-mono tracking-widest text-gray-300">
                EMAIL
              </label>
              <input
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="contact@oceanfresh.com"
                className="
                  px-3 py-2 rounded-lg bg-[#0e0f13] 
                  border border-[#1c1d22] text-sm
                "
              />
            </div>

            {/* Address */}
            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-[11px] font-mono tracking-widest text-gray-300">
                ADDRESS
              </label>
              <textarea
                value={form.address}
                onChange={(e) => updateField("address", e.target.value)}
                placeholder="Jl. Sukarno Hatta No. 45, Surabaya"
                className="
                  px-3 py-2 rounded-lg bg-[#0e0f13] 
                  border border-[#1c1d22] text-sm h-24 resize-none
                "
              />
            </div>

          </div>

          <Button
            type="submit"
            className="
              w-full py-3 text-lg rounded-xl 
              bg-white text-black font-mono tracking-wider
              hover:bg-gray-200 transition
            "
          >
            CREATE SUPPLIER
          </Button>
        </form>
      </Card>
    </DashboardShell>
  );
}
