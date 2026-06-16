"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/layout/dashboard-shell";
import Card from "@/components/ui/card";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Button from "@/components/ui/button";
import LoadingState from "@/components/ui/loading-state";
import EmptyState from "@/components/ui/empty-state";
import { api } from "@/lib/api";
import { API_BASE_URL } from "@/lib/config";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useRole } from "@/lib/roles";

export default function SuppliersPage() {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const { can } = useRole();
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

  async function deleteSupplier(id: string, name: string) {
    await confirm({
      title: `Delete ${name}?`,
      description: "This removes the supplier from your list. This can't be undone.",
      confirmLabel: "Delete supplier",
      tone: "danger",
      onConfirm: async () => {
        try {
          await api(`/supplier/${id}`, { method: "DELETE" });
        } catch {
          throw new Error("Couldn't delete this supplier. Try again.");
        }
      },
    }).then((ok) => {
      if (ok) {
        toast.success(`${name} was deleted.`);
        loadSuppliers();
      }
    });
  }

  useEffect(() => {
    loadSuppliers();
  }, []);

  return (
    <DashboardShell>
      <div className="space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--foreground)]">
              Suppliers
            </h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              The vendors you buy stock from.
            </p>
          </div>

          {can("manage:masterData") && (
            <Button
              variant="primary"
              onClick={() => router.push("/suppliers/create")}
            >
              <Plus size={16} /> Add supplier
            </Button>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <LoadingState message="Loading suppliers…" />
        ) : suppliers.length === 0 ? (
          <EmptyState message="No suppliers yet. Add your first supplier with the button above." />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {suppliers.map((s) => (
              <Card
                key={s.id}
                className="relative flex cursor-pointer flex-col justify-between transition-colors hover:bg-[var(--bg-hover)]"
              >
                {/* Clickable content */}
                <div
                  className="flex flex-grow flex-col"
                  onClick={() => router.push(`/suppliers/${s.id}`)}
                >
                  {/* Image */}
                  {s.imagePath ? (
                    <img
                      src={`${API_BASE_URL}${s.imagePath}`}
                      alt={s.name}
                      className="mb-4 h-36 w-full rounded-lg object-cover"
                    />
                  ) : (
                    <div className="mb-4 flex h-36 w-full items-center justify-center rounded-lg bg-[var(--muted)] text-sm text-[var(--muted-foreground)]">
                      No image
                    </div>
                  )}

                  {/* Info */}
                  <div className="space-y-1">
                    <p className="text-lg font-semibold text-[var(--foreground)]">
                      {s.name}
                    </p>

                    <p className="text-sm text-[var(--muted-foreground)]">
                      Code: {s.code}
                    </p>

                    {s.contact && (
                      <p className="text-sm text-[var(--muted-foreground)]">
                        Contact: {s.contact}
                      </p>
                    )}

                    {s.phone && (
                      <p className="text-sm text-[var(--muted-foreground)]">
                        Phone: {s.phone}
                      </p>
                    )}

                    {s.email && (
                      <p className="text-sm text-[var(--muted-foreground)]">
                        Email: {s.email}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 flex justify-end gap-2">
                  {can("manage:masterData") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/suppliers/${s.id}/edit`);
                      }}
                    >
                      <Pencil size={16} /> Edit
                    </Button>
                  )}

                  {can("manage:masterData") && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSupplier(s.id, s.name);
                      }}
                    >
                      <Trash2 size={16} /> Delete
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
