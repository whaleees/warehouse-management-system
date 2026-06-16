"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardShell from "@/components/layout/dashboard-shell";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import LoadingState from "@/components/ui/loading-state";
import { api } from "@/lib/api";
import { API_BASE_URL } from "@/lib/config";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";

export default function SupplierDetailPage() {
  const router = useRouter();
  const params = useParams();
  const supplierId = params?.id as string;
  const toast = useToast();
  const confirm = useConfirm();

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
    const ok = await confirm({
      title: `Delete ${supplier.name}?`,
      description: "This removes the supplier from your list. This can't be undone.",
      confirmLabel: "Delete supplier",
      tone: "danger",
      onConfirm: async () => {
        try {
          await api(`/supplier/${supplierId}`, { method: "DELETE" });
        } catch {
          throw new Error("Couldn't delete this supplier. Try again.");
        }
      },
    });

    if (ok) {
      toast.success(`${supplier.name} was deleted.`);
      router.push("/suppliers");
    }
  }

  useEffect(() => {
    loadSupplier();
  }, []);

  if (loading) {
    return (
      <DashboardShell>
        <LoadingState message="Loading supplier…" />
      </DashboardShell>
    );
  }

  if (!supplier) {
    return (
      <DashboardShell>
        <p className="text-sm text-[var(--danger-text)]">
          We couldn&apos;t find this supplier.
        </p>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg p-2 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--foreground)]"
              onClick={() => router.push("/suppliers")}
              aria-label="Back to suppliers"
            >
              <ArrowLeft size={18} />
            </button>

            <h1 className="text-2xl font-semibold text-[var(--foreground)]">
              {supplier.name}
            </h1>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              variant="primary"
              onClick={() => router.push(`/suppliers/${supplierId}/edit`)}
            >
              <Pencil size={16} /> Edit
            </Button>

            <Button variant="danger" onClick={deleteSupplier}>
              <Trash2 size={16} /> Delete
            </Button>
          </div>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">

          {/* Image */}
          <Card className="p-4">
            {supplier.imagePath ? (
              <img
                src={`${API_BASE_URL}${supplier.imagePath}`}
                alt={supplier.name}
                className="h-64 w-full rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-64 w-full items-center justify-center rounded-lg bg-[var(--muted)] text-sm text-[var(--muted-foreground)]">
                No image
              </div>
            )}
          </Card>

          {/* Details */}
          <Card className="p-8 lg:col-span-2">
            <h2 className="mb-6 text-lg font-semibold text-[var(--card-foreground)]">
              Details
            </h2>

            <div className="space-y-4 text-sm">
              <DetailItem label="Name" value={supplier.name} />
              <DetailItem label="Code" value={supplier.code} />
              {supplier.contact && (
                <DetailItem label="Contact person" value={supplier.contact} />
              )}
              {supplier.phone && (
                <DetailItem label="Phone" value={supplier.phone} />
              )}
              {supplier.email && (
                <DetailItem label="Email" value={supplier.email} />
              )}
              {supplier.address && (
                <DetailItem label="Address" value={supplier.address} />
              )}
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                <span className="text-[var(--muted-foreground)]">Status</span>
                <Badge color={supplier.isActive ? "success" : "default"}>
                  {supplier.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
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
    <div className="flex justify-between border-b border-[var(--border)] pb-2">
      <span className="text-[var(--muted-foreground)]">{label}</span>
      <span className="text-[var(--foreground)]">{value}</span>
    </div>
  );
}
