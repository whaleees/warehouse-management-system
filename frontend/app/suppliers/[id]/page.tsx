"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardShell from "@/components/layout/dashboard-shell";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import { api } from "@/lib/api";
import { API_BASE_URL } from "@/lib/config";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";

export default function SupplierDetailPage() {
  const router = useRouter();
  const params = useParams();
  const supplierId = params?.id as string;

  const [supplier, setSupplier] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function loadSupplier() {
    try {
      const data = await api(`/supplier/${supplierId}`);
      setSupplier(data);
    } catch (err) {
      console.error("Supplier detail fetch error:", err);
    }
    setLoading(false);
  }

  async function deleteSupplier() {
    if (!confirm("Delete this supplier?")) return;

    try {
      await api(`/supplier/${supplierId}`, { method: "DELETE" });
      router.push("/suppliers");
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete supplier.");
    }
  }

  useEffect(() => {
    loadSupplier();
  }, []);

  if (loading) {
    return (
      <DashboardShell>
        <p className="text-xs text-gray-500 font-mono tracking-wide">
          Loading supplier...
        </p>
      </DashboardShell>
    );
  }

  if (!supplier) {
    return (
      <DashboardShell>
        <p className="text-sm text-red-400 font-mono tracking-wide">
          Supplier not found.
        </p>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="space-y-10">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              className="p-2 rounded-lg hover:bg-[#15161b] transition"
              onClick={() => router.push("/suppliers")}
            >
              <ArrowLeft size={18} />
            </button>

            <h1 className="text-xl font-mono font-semibold tracking-wider uppercase">
              {supplier.name}
            </h1>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex gap-3">
            <button
              onClick={() => router.push(`/suppliers/${supplierId}/edit`)}
              className="
                px-4 py-2 rounded-lg bg-white text-black 
                font-mono text-xs tracking-widest font-semibold
                hover:bg-gray-200 transition flex items-center gap-2
              "
            >
              <Pencil size={14} /> EDIT
            </button>

            <button
              onClick={deleteSupplier}
              className="
                px-4 py-2 rounded-lg bg-red-500 text-white 
                font-mono text-xs tracking-widest font-semibold
                hover:bg-red-600 transition flex items-center gap-2
              "
            >
              <Trash2 size={14} /> DELETE
            </button>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

          {/* IMAGE BLOCK — MATCHES PRODUCT DETAIL */}
          <Card className="p-4 bg-[#111217] border border-[#1c1d22] rounded-xl">
            {supplier.imagePath ? (
              <img
                src={`${API_BASE_URL}${supplier.imagePath}`}
                alt={supplier.name}
                className="w-full h-64 object-cover rounded-lg"
              />
            ) : (
              <div className="w-full h-64 bg-[#0d0e10] rounded-lg flex items-center justify-center text-gray-500 font-mono text-xs tracking-wider">
                NO IMAGE
              </div>
            )}
          </Card>

          {/* DETAILS */}
          <Card className="p-8 bg-[#111217] border border-[#1c1d22] rounded-xl lg:col-span-2">
            <h2 className="text-lg font-mono tracking-wider font-semibold mb-6 uppercase">
              DETAILS
            </h2>

            <div className="space-y-4 text-sm">
              <DetailItem label="NAME" value={supplier.name} />
              <DetailItem label="CODE" value={supplier.code} />
              {supplier.contact && <DetailItem label="CONTACT PERSON" value={supplier.contact} />}
              {supplier.phone && <DetailItem label="PHONE" value={supplier.phone} />}
              {supplier.email && <DetailItem label="EMAIL" value={supplier.email} />}
              {supplier.address && <DetailItem label="ADDRESS" value={supplier.address} />}
              <DetailItem label="ACTIVE" value={supplier.isActive ? "YES" : "NO"} />
            </div>
          </Card>

        </div>
      </div>
    </DashboardShell>
  );
}

/* Reusable detail row */
function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-[#232428] pb-2">
      <span className="text-[10px] font-mono tracking-widest text-gray-500">
        {label}
      </span>
      <span className="font-mono text-sm tracking-wide text-white">{value}</span>
    </div>
  );
}
