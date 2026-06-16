"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/layout/dashboard-shell";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import LoadingState from "@/components/ui/loading-state";
import EmptyState from "@/components/ui/empty-state";
import { api } from "@/lib/api";
import { Plus, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRole } from "@/lib/roles";

export default function SectionsPage() {
  const router = useRouter();
  const { can } = useRole();
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--foreground)]">
              Sections
            </h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Areas of your warehouse and the storage locations inside them.
            </p>
          </div>

          {can("manage:masterData") && (
            <Button
              variant="primary"
              onClick={() => router.push("/sections/create")}
            >
              <Plus size={16} /> Add section
            </Button>
          )}
        </div>

        {/* Table */}
        <Card className="overflow-hidden p-0">
          {loading ? (
            <div className="p-5">
              <LoadingState message="Loading sections…" />
            </div>
          ) : sections.length === 0 ? (
            <div className="p-5">
              <EmptyState message="No sections yet. Add one with the Add section button above." />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-[var(--muted)] text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Section</th>
                  <th className="px-4 py-3 text-left font-medium">
                    Description
                  </th>
                  <th className="px-4 py-3 text-right font-medium">Locations</th>
                  <th className="px-4 py-3 text-right font-medium">Open</th>
                </tr>
              </thead>

              <tbody>
                {sections.map((sec) => (
                  <tr
                    key={sec.id}
                    className="cursor-pointer border-t border-[var(--border)] transition-colors hover:bg-[var(--bg-hover)]"
                    onClick={() => router.push(`/sections/${sec.id}`)}
                  >
                    <td className="px-4 py-3 font-medium text-[var(--foreground)]">
                      {sec.code}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)]">
                      {sec.description || "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-[var(--foreground)]">
                      {sec.locationCount}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ArrowRight
                        size={16}
                        className="inline-block text-[var(--muted-foreground)]"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </DashboardShell>
  );
}
