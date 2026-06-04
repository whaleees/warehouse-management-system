"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardShell from "@/components/layout/dashboard-shell";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import { api } from "@/lib/api";
import { API_BASE_URL } from "@/lib/config";

export default function EditCustomerPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

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
      }
      setLoading(false);
    }
    load();
  }, [id]);

  function updateField(field: string, value: any) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function saveCustomer() {
    setSaving(true);

    try {
      await api(`/customer/${id}`, {
        method: "PATCH",
        body: JSON.stringify(form),
      });

      router.push("/customers");
    } catch (err) {
      console.error("Save failed:", err);
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <DashboardShell>
        <p className="text-gray-500 text-sm font-mono">LOADING CUSTOMER...</p>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      {/* HEADER SECTION — EXACT MATCH */}
      <div className="mb-10">
        <h1 className="text-xl font-mono tracking-widest text-white mb-1">
          EDIT CUSTOMER
        </h1>
        <p className="text-xs font-mono text-gray-500 tracking-widest">
          UPDATE CUSTOMER DETAILS
        </p>
      </div>

      <Card className="p-8 bg-[#111217] border border-[#1c1d22] rounded-xl space-y-8">

        {/* IMAGE PREVIEW — EXACT SAME BLOCK */}
        <div className="w-full h-64 bg-[#0d0e10] border border-[#1c1d22] rounded-xl flex items-center justify-center overflow-hidden">
          {form.imagePath ? (
            <img
              src={`${API_BASE_URL}${form.imagePath}`}
              alt="Customer"
              className="w-full h-full object-cover rounded-lg"
            />
          ) : (
            <span className="text-gray-500 text-xs font-mono">NO IMAGE</span>
          )}
        </div>

        {/* FORM — IDENTICAL GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* NAME */}
          <Field label="NAME">
            <input
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              className="input-style"
              placeholder="Customer Name"
            />
          </Field>

          {/* CODE (READONLY) */}
          <Field label="CODE">
            <input
              value={form.code}
              disabled
              className="input-style bg-[#1a1c20] text-gray-500 cursor-not-allowed"
            />
          </Field>

          {/* CONTACT PERSON */}
          <Field label="CONTACT PERSON">
            <input
              value={form.contact}
              onChange={(e) => updateField("contact", e.target.value)}
              className="input-style"
              placeholder="Contact Person"
            />
          </Field>

          {/* EMAIL */}
          <Field label="EMAIL">
            <input
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              className="input-style"
              placeholder="Email"
            />
          </Field>

          {/* PHONE */}
          <Field label="PHONE">
            <input
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              className="input-style"
              placeholder="Phone Number"
            />
          </Field>

          {/* ADDRESS */}
          <Field label="ADDRESS" full>
            <textarea
              value={form.address}
              onChange={(e) => updateField("address", e.target.value)}
              className="input-style h-24 resize-none"
              placeholder="Full address"
            />
          </Field>
        </div>

        {/* SAVE BUTTON — EXACT MATCH */}
        <div className="flex justify-end">
          <button
            onClick={saveCustomer}
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

/* FIELD WRAPPER — SAME COMPONENT */
function Field({ label, children, full }: any) {
  return (
    <div className={`${full ? "md:col-span-2" : ""} flex flex-col gap-2`}>
      <label className="text-gray-400 text-[11px] font-mono tracking-widest">
        {label}
      </label>
      {children}
    </div>
  );
}

/* SAME SHARED INPUT STYLE AS PRODUCT */
const inputStyles = `
  w-full rounded-lg p-2.5 text-sm
  bg-[#0e0f13] border border-[#1c1d22]
  focus:border-white outline-none font-mono
`;
