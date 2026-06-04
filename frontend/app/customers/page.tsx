"use client";

import { useRouter } from "next/navigation";
import DashboardShell from "@/components/layout/dashboard-shell";
import Card from "@/components/ui/card";
import { Pencil, Trash2, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { API_BASE_URL } from "@/lib/config";
import { useApi } from "@/lib/use-api";

export default function CustomersPage() {
  const router = useRouter();
  const { data, loading, error, refetch } = useApi<any>("/customer");
  const customers = Array.isArray(data) ? data : [];

  async function deleteCustomer(id: string) {
    if (!confirm("Delete this customer?")) return;
    await api(`/customer/${id}`, { method: "DELETE" });
    refetch();
  }

  return (
    <DashboardShell>
      <div className="space-y-8">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-wide font-mono">
            CUSTOMERS
          </h1>

          <button
            onClick={() => router.push("/customers/create")}
            className="
              px-4 py-2 rounded-lg bg-white text-black
              font-mono text-xs tracking-widest font-semibold
              hover:bg-gray-200 transition flex items-center gap-2
            "
          >
            <Plus size={14} /> ADD CUSTOMER
          </button>
        </div>

        {/* CONTENT */}
        {loading ? (
          <p className="text-xs text-gray-500 font-mono tracking-wide">
            Loading customers...
          </p>
        ) : error ? (
          <p className="text-xs text-red-400 font-mono tracking-wide">
            {error}
          </p>
        ) : customers.length === 0 ? (
          <p className="text-xs text-gray-500 font-mono tracking-wide">
            No customers found.
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
            {customers.map((c) => (
              <Card
                key={c.id}
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
                  onClick={() => router.push(`/customers/${c.id}`)}
                >
                  {/* IMAGE */}
                  {c.imagePath ? (
                    <img
                      src={`${API_BASE_URL}${c.imagePath}`}
                      alt={c.name}
                      className="w-full h-32 object-cover rounded-lg mb-4"
                    />
                  ) : (
                    <div
                      className="
                        w-full h-32 bg-[#0d0e10] rounded-lg mb-4 
                        flex items-center justify-center text-gray-600 
                        text-xs font-mono tracking-wider
                      "
                    >
                      NO IMAGE
                    </div>
                  )}

                  {/* INFO */}
                  <div className="space-y-1">
                    <p className="font-semibold text-lg">{c.name}</p>

                    <p className="text-[10px] text-gray-400 font-mono tracking-wider">
                      CODE: {c.code}
                    </p>

                    {c.contact && (
                      <p className="text-[10px] text-gray-400 font-mono tracking-wider">
                        CONTACT: {c.contact}
                      </p>
                    )}

                    {c.phone && (
                      <p className="text-[10px] text-gray-400 font-mono tracking-wider">
                        PHONE: {c.phone}
                      </p>
                    )}

                    {c.email && (
                      <p className="text-[10px] text-gray-400 font-mono tracking-wider">
                        EMAIL: {c.email}
                      </p>
                    )}
                  </div>
                </div>

                {/* ACTIONS */}
                <div className="flex justify-end gap-4 mt-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/customers/${c.id}`);
                    }}
                    className="text-gray-300 hover:text-white transition"
                  >
                    <Pencil size={18} />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteCustomer(c.id);
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
