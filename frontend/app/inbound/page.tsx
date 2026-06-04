"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import DashboardShell from "@/components/layout/dashboard-shell";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { grStatusColor } from "@/lib/status";
import { Truck, ArrowRight } from "lucide-react";

type GRStatus = "PENDING" | "RECEIVED";

interface InboundRow {
  id: string;
  receiptNumber: string;
  status: GRStatus;
  receivedAt: string;
  purchaseOrder?: {
    id: string;
    orderNumber: string;
    supplier?: {
      id: string;
      name: string;
      code: string;
    };
  };
}

export default function InboundListPage() {
  const router = useRouter();

  const [rows, setRows] = useState<InboundRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadInbound() {
    try {
      const res = await api("/inbound");
      const list: InboundRow[] = Array.isArray(res)
        ? res
        : Array.isArray(res.data)
        ? res.data
        : [];

      setRows(list);
    } catch (err) {
      console.error("Inbound list API error:", err);
      setRows([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadInbound();
  }, []);

  return (
    <DashboardShell>
      <div className="space-y-8">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Truck size={20} />

            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Inbound
              </h1>
              <p className="text-xs text-[var(--text-muted)]">
                List of Goods Receipts created from Purchase Orders.
              </p>
            </div>
          </div>

          {/* WHITE XSTOCK BUTTON */}
          <button
            onClick={() => router.push("/purchase-orders")}
            className="
              bg-white text-black 
              px-4 py-2 rounded-lg 
              font-mono text-xs tracking-widest font-semibold
              hover:bg-gray-200 transition
            "
          >
            GO TO PURCHASE ORDERS
          </button>
        </div>

        {/* TABLE */}
        <Card
          className="
            bg-[#0e0f12] border border-[#1c1d22]
            rounded-xl overflow-hidden p-0
          "
        >
          <table className="w-full text-sm font-mono tracking-wide">
            <thead className="bg-[#111217] text-gray-500 text-[11px] uppercase">
              <tr>
                <th className="px-4 py-3 text-left">GRN</th>
                <th className="px-4 py-3 text-left">Purchase Order</th>
                <th className="px-4 py-3 text-left">Supplier</th>
                <th className="px-4 py-3 text-left">Received At</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>

            <tbody>
              {/* LOADING */}
              {loading && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-gray-500 text-xs"
                  >
                    LOADING INBOUND...
                  </td>
                </tr>
              )}

              {/* EMPTY */}
              {!loading && rows.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-gray-500 text-xs"
                  >
                    NO INBOUND FOUND.
                  </td>
                </tr>
              )}

              {/* ROWS */}
              {!loading &&
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="
                      border-t border-[#1c1d22]
                      hover:bg-[#15161b] transition cursor-pointer
                    "
                    onClick={() => router.push(`/inbound/${row.id}`)}
                  >
                    <td className="px-4 py-3 font-semibold">
                      {row.receiptNumber}
                    </td>

                    <td className="px-4 py-3 text-gray-300">
                      {row.purchaseOrder?.orderNumber ?? "—"}
                    </td>

                    <td className="px-4 py-3 text-gray-400">
                      {row.purchaseOrder?.supplier?.name ?? "—"}
                    </td>

                    <td className="px-4 py-3 text-gray-400">
                      {formatDate(row.receivedAt)}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <Badge color={grStatusColor(row.status)}>
                        {row.status}
                      </Badge>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <ArrowRight size={14} className="opacity-70" />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </Card>

      </div>
    </DashboardShell>
  );
}
