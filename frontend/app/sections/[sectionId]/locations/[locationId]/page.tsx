"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/layout/dashboard-shell";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import LoadingState from "@/components/ui/loading-state";
import ErrorState from "@/components/ui/error-state";
import EmptyState from "@/components/ui/empty-state";
import { api } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { ArrowLeft, Pencil, Trash2, Boxes } from "lucide-react";

export default function LocationDetailPage() {
  const router = useRouter();
  const { sectionId, locationId } = useParams();
  const toast = useToast();
  const confirm = useConfirm();

  const [location, setLocation] = useState<any>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadLocation() {
    try {
      const res = await api(`/sections/${sectionId}/locations/${locationId}`);
      setLocation(res);
    } catch (err) {
      console.error("Location fetch failed:", err);
    }
  }

  async function loadInventory() {
    try {
      const all = await api("/inventory");

      const filtered = all.filter(
        (inv: any) => inv.location?.id === locationId
      );

      setInventory(filtered);
    } catch (err) {
      console.error("Inventory filter failed:", err);
      setInventory([]);
    }
  }

  async function deleteLocation() {
    const ok = await confirm({
      title: "Delete this location?",
      description:
        "This permanently removes the location from the section. This can't be undone.",
      confirmLabel: "Delete location",
      tone: "danger",
      onConfirm: async () => {
        try {
          await api(`/sections/${sectionId}/locations/${locationId}`, {
            method: "DELETE",
          });
        } catch {
          throw new Error(
            "Couldn't delete the location. Make sure no stock is stored here, then try again."
          );
        }
      },
    });

    if (ok) {
      toast.success("Location deleted.");
      router.push(`/sections/${sectionId}`);
    }
  }

  useEffect(() => {
    Promise.all([loadLocation(), loadInventory()]).finally(() =>
      setLoading(false)
    );
  }, []);

  if (loading) {
    return (
      <DashboardShell>
        <LoadingState message="Loading location…" />
      </DashboardShell>
    );
  }

  if (!location) {
    return (
      <DashboardShell>
        <ErrorState message="We couldn't find that location." />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/sections/${sectionId}`)}
              aria-label="Back to section"
            >
              <ArrowLeft size={18} />
            </Button>

            <h1 className="text-2xl font-semibold text-[var(--foreground)]">
              {location.code}
            </h1>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() =>
                router.push(
                  `/sections/${sectionId}/locations/${locationId}/edit`
                )
              }
            >
              <Pencil size={16} /> Edit
            </Button>

            <Button variant="danger" onClick={deleteLocation}>
              <Trash2 size={16} /> Delete
            </Button>
          </div>
        </div>

        {/* Details card */}
        <Card>
          <h2 className="mb-4 text-base font-semibold text-[var(--card-foreground)]">
            Location details
          </h2>

          <div className="space-y-4 text-sm">
            <Detail label="Code" value={location.code} />
            <Detail label="Type" value={location.type} />
          </div>
        </Card>

        {/* Inventory list */}
        <Card>
          <div className="mb-4 flex items-center gap-3">
            <Boxes className="h-5 w-5 text-[var(--primary)]" />
            <h2 className="text-base font-semibold text-[var(--card-foreground)]">
              Products stored here
            </h2>
          </div>

          {inventory.length === 0 ? (
            <EmptyState message="No products are stored in this location yet." />
          ) : (
            <div className="overflow-hidden rounded-lg border border-[var(--border)]">
              <table className="w-full text-sm">
                <thead className="bg-[var(--muted)] text-[var(--muted-foreground)]">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Product</th>
                    <th className="px-4 py-3 text-left font-medium">Batch</th>
                    <th className="px-4 py-3 text-right font-medium">
                      Quantity
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      Reserved
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {inventory.map((inv) => (
                    <tr
                      key={inv.id}
                      className="border-t border-[var(--border)] transition-colors hover:bg-[var(--bg-hover)]"
                    >
                      <td className="px-4 py-3 text-[var(--foreground)]">
                        {inv.product?.name}
                      </td>
                      <td className="px-4 py-3 text-[var(--muted-foreground)]">
                        {inv.batch?.code ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-[var(--foreground)]">
                        {inv.quantity} {inv.product?.uom}
                      </td>
                      <td className="px-4 py-3 text-right text-[var(--muted-foreground)]">
                        {inv.reservedQty}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </DashboardShell>
  );
}

function Detail({ label, value }: any) {
  return (
    <div className="flex justify-between border-b border-[var(--border)] pb-2">
      <span className="text-[var(--muted-foreground)]">{label}</span>
      <span className="font-medium text-[var(--foreground)]">{value}</span>
    </div>
  );
}
