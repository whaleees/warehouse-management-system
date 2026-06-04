"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/layout/dashboard-shell";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";
import { Building2, Calendar } from "lucide-react";

interface Supplier {
  id: string;
  code: string;
  name: string;
}

export default function CreatePurchaseOrderPage() {
  const router = useRouter();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);

  const [supplierId, setSupplierId] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [saving, setSaving] = useState(false);

  // ─────────────────────────────────────────────
  // LOAD SUPPLIERS
  // ─────────────────────────────────────────────
  async function loadSuppliers() {
    try {
      const data = await api("/supplier");
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Load suppliers failed:", err);
      setSuppliers([]);
    }
    setLoadingSuppliers(false);
  }

  useEffect(() => {
    loadSuppliers();
  }, []);

  // ─────────────────────────────────────────────
  // SUBMIT FORM
  // ─────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!supplierId) {
      alert("Please select a supplier.");
      return;
    }

    setSaving(true);
    try {
      const body: any = { supplierId };
      if (expectedDate) {
        body.expectedDate = new Date(expectedDate).toISOString();
      }

      const po = await api("/purchase-order", {
        method: "POST",
        body: JSON.stringify(body),
      });

      router.push(`/purchase-orders/${po.id}`);
    } catch (err) {
      console.error("Create PO failed:", err);
      alert(err instanceof ApiError ? err.message : "Failed to create purchase order");
    }
    setSaving(false);
  }

  // ─────────────────────────────────────────────

  return (
    <DashboardShell>
      {/* PAGE HEADER */}
      <h1 className="text-xl font-mono tracking-widest mb-8">
        NEW PURCHASE ORDER
      </h1>

      <Card className="p-6 bg-[#111217] border border-[#1c1d22] rounded-xl max-w-xl">

        <form onSubmit={handleSubmit} className="space-y-8">

          {/* SUPPLIER FIELD */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-mono tracking-widest text-gray-400 flex items-center gap-2">
              <Building2 size={14} className="opacity-70" />
              SUPPLIER
            </label>

            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="
                px-3 py-2 rounded-lg 
                bg-[#0f0f12] border border-[#1c1d22]
                text-sm font-mono 
                focus:border-white outline-none
              "
            >
              <option value="">
                {loadingSuppliers ? "Loading suppliers..." : "Select Supplier"}
              </option>

              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} — {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* EXPECTED DATE FIELD */}
          <div className="flex flex-col gap-2 max-w-xs">
            <label className="text-[11px] font-mono tracking-widest text-gray-400 flex items-center gap-2">
              <Calendar size={14} className="opacity-70" />
              EXPECTED DELIVERY DATE
            </label>

            <input
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
              className="
                px-3 py-2 rounded-lg 
                bg-[#0f0f12] border border-[#1c1d22]
                text-sm font-mono 
                focus:border-white outline-none
              "
            />
          </div>

          {/* INFO TEXT */}
          <p className="text-xs text-gray-500 font-mono tracking-widest leading-relaxed">
            After creating the purchase order, you can add line items and begin
            the inbound flow from the PO detail page.
          </p>

          {/* SUBMIT BUTTON */}
          <div>
            <button
              type="submit"
              disabled={saving}
              className="
                px-4 py-2 rounded-lg bg-white text-black
                font-mono text-xs tracking-widest font-semibold
                hover:bg-gray-200 transition
                w-full md:w-auto
              "
            >
              {saving ? "CREATING..." : "CREATE PURCHASE ORDER"}
            </button>
          </div>

        </form>

      </Card>
    </DashboardShell>
  );
}
