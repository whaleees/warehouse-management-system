"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/layout/dashboard-shell";
import Card from "@/components/ui/card";
import { api } from "@/lib/api";
import { Plus, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SectionsPage() {
  const router = useRouter();
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadSections() {
    try {
      const res = await api("/sections");
      const baseList = Array.isArray(res.data) ? res.data : [];

      const withLocationCounts = await Promise.all(
        baseList.map(async (sec: any) => {
          try {
            const locRes = await api(`/sections/${sec.id}/locations`);
            return { ...sec, locationCount: locRes?.data?.length ?? 0 };
          } catch {
            return { ...sec, locationCount: 0 };
          }
        })
      );

      setSections(withLocationCounts);
    } catch (err) {
      console.error("Sections API error:", err);
      setSections([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadSections();
  }, []);

  return (
    <DashboardShell>
      <div className="space-y-8">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-mono tracking-widest">SECTIONS</h1>

          <button
            onClick={() => router.push("/sections/create")}
            className="
              px-4 py-2 rounded-lg bg-white text-black 
              font-mono text-xs tracking-widest font-semibold
              hover:bg-gray-200 transition flex items-center gap-2
            "
          >
            <Plus size={14} /> ADD SECTION
          </button>
        </div>

        {/* TABLE */}
        <Card className="p-0 bg-[#111217] border border-[#1c1d22] rounded-xl overflow-hidden">

          <table className="w-full text-sm font-mono tracking-wider">
            <thead className="bg-[#0e0f12] text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left text-[10px] tracking-widest">CODE</th>
                <th className="px-4 py-3 text-left text-[10px] tracking-widest">DESCRIPTION</th>
                <th className="px-4 py-3 text-right text-[10px] tracking-widest">LOCATIONS</th>
                <th className="px-4 py-3 text-right text-[10px] tracking-widest">ACTION</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-gray-500 text-xs">
                    LOADING SECTIONS...
                  </td>
                </tr>
              ) : sections.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-gray-500 text-xs">
                    NO SECTIONS FOUND.
                  </td>
                </tr>
              ) : (
                sections.map((sec) => (
                  <tr
                    key={sec.id}
                    className="
                      border-t border-[#1c1d22]
                      hover:bg-[#131419] transition cursor-pointer
                    "
                    onClick={() => router.push(`/sections/${sec.id}`)}
                  >
                    {/* CODE */}
                    <td className="px-4 py-3 text-white font-semibold">
                      {sec.code}
                    </td>

                    {/* DESCRIPTION */}
                    <td className="px-4 py-3 text-gray-300">
                      {sec.description || "—"}
                    </td>

                    {/* LOCATIONS (right aligned) */}
                    <td className="px-4 py-3 text-right font-semibold text-white">
                      {sec.locationCount}
                    </td>

                    {/* ACTION (icon right aligned) */}
                    <td className="px-4 py-3 text-right">
                      <ArrowRight
                        size={16}
                        className="text-gray-400 hover:text-white transition inline-block"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

        </Card>
      </div>
    </DashboardShell>
  );
}
