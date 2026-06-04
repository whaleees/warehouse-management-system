"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/layout/dashboard-shell";
import Card from "@/components/ui/card";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Button from "@/components/ui/button";
import { api } from "@/lib/api";
import { API_BASE_URL } from "@/lib/config";

export default function SuppliersPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadSuppliers() {
    try {
      const data = await api("/supplier");
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Supplier API error:", err);
      setSuppliers([]);
    }
    setLoading(false);
  }

  async function deleteSupplier(id: string) {
    if (!confirm("Delete this supplier?")) return;
    await api(`/supplier/${id}`, { method: "DELETE" });
    loadSuppliers();
  }

  useEffect(() => {
    loadSuppliers();
  }, []);

  return (
    <DashboardShell>
      <div className="space-y-8">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-wide font-mono">
            SUPPLIERS
          </h1>

          <button
            onClick={() => router.push("/suppliers/create")}
            className="
              px-4 py-2 rounded-lg bg-white text-black
              font-mono text-xs tracking-widest font-semibold
              hover:bg-gray-200 transition
              flex items-center gap-2
            "
          >
            <Plus size={14} /> ADD SUPPLIER
          </button>
        </div>

        {/* CONTENT */}
        {loading ? (
          <p className="text-xs text-gray-500 font-mono tracking-wide">
            Loading suppliers...
          </p>
        ) : suppliers.length === 0 ? (
          <p className="text-xs text-gray-500 font-mono tracking-wide">
            No suppliers found.
          </p>
        ) : (
          <div
            className="
              grid 
              grid-cols-1 
              sm:grid-cols-2 
              lg:grid-cols-3 
              xl:grid-cols-4 
              gap-6
            "
          >
            {suppliers.map((s) => (
              <Card
                key={s.id}
                className="
                  p-5 bg-[#111217] border border-[#1c1d22] rounded-xl 
                  hover:border-gray-500 hover:bg-[#15161b]
                  transition-all cursor-pointer relative
                  flex flex-col justify-between shadow-md
                "
              >
                {/* CLICKABLE CONTENT */}
                <div
                  className="flex flex-col flex-grow"
                  onClick={() => router.push(`/suppliers/${s.id}`)}
                >
                  {/* IMAGE */}
                  {s.imagePath ? (
                    <img
                      src={`${API_BASE_URL}${s.imagePath}`}
                      alt={s.name}
                      className="w-full h-36 object-cover rounded-lg mb-4"
                    />
                  ) : (
                    <div
                      className="
                        w-full h-36 bg-[#0d0e10] rounded-lg mb-4 
                        flex items-center justify-center 
                        text-gray-600 text-xs font-mono tracking-wide
                      "
                    >
                      NO IMAGE
                    </div>
                  )}

                  {/* INFO */}
                  <div>
                    <p className="font-semibold text-lg mb-1">{s.name}</p>

                    <p className="text-[10px] text-gray-400 font-mono tracking-wider">
                      CODE: {s.code}
                    </p>

                    {s.contact && (
                      <p className="text-[10px] text-gray-400 font-mono tracking-wider">
                        CONTACT: {s.contact}
                      </p>
                    )}

                    {s.phone && (
                      <p className="text-[10px] text-gray-400 font-mono tracking-wider">
                        PHONE: {s.phone}
                      </p>
                    )}

                    {s.email && (
                      <p className="text-[10px] text-gray-400 font-mono tracking-wider">
                        EMAIL: {s.email}
                      </p>
                    )}
                  </div>
                </div>

                {/* ACTIONS */}
                <div className="flex justify-end gap-4 mt-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/suppliers/${s.id}`);
                    }}
                    className="text-gray-300 hover:text-white transition"
                  >
                    <Pencil size={18} />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSupplier(s.id);
                    }}
                    className="text-red-400 hover:text-red-300 transition"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
