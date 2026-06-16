"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardShell from "@/components/layout/dashboard-shell";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import { api } from "@/lib/api";
import { API_BASE_URL } from "@/lib/config";
import LoadingState from "@/components/ui/loading-state";
import EmptyState from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const toast = useToast();
  const confirm = useConfirm();

  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function loadCustomer() {
    try {
      const data = await api(`/customer/${id}`);
      setCustomer(data);
    } catch (err) {
      console.error("Customer detail error:", err);
    }
    setLoading(false);
  }

  async function deleteCustomer() {
    const ok = await confirm({
      title: `Delete ${customer?.name ?? "this customer"}?`,
      description: "This removes the customer from your records. This can't be undone.",
      confirmLabel: "Delete customer",
      tone: "danger",
    });
    if (!ok) return;

    try {
      await api(`/customer/${id}`, { method: "DELETE" });
      toast.success("Customer deleted.");
      router.push("/customers");
    } catch {
      toast.error("Couldn't delete the customer. Try again.");
    }
  }

  useEffect(() => {
    loadCustomer();
  }, []);

  if (loading) {
    return (
      <DashboardShell>
        <LoadingState message="Loading customer…" />
      </DashboardShell>
    );
  }

  if (!customer) {
    return (
      <DashboardShell>
        <EmptyState message="We couldn't find that customer. It may have been deleted." />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="space-y-10">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              className="p-2 hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
              onClick={() => router.push("/customers")}
              aria-label="Back to customers"
            >
              <ArrowLeft size={20} className="text-[var(--muted-foreground)]" />
            </button>

            <h1 className="text-2xl font-semibold text-[var(--foreground)]">
              Customer details
            </h1>
          </div>

          <div className="flex gap-3">
            <Button
              variant="primary"
              onClick={() => router.push(`/customers/${id}/edit`)}
            >
              <Pencil size={16} /> Edit
            </Button>

            <Button variant="danger" onClick={deleteCustomer}>
              <Trash2 size={16} /> Delete
            </Button>
          </div>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

          {/* Image */}
          <Card className="p-4 flex items-center justify-center h-72">
            {customer.imagePath ? (
              <img
                src={`${API_BASE_URL}${customer.imagePath}`}
                alt={customer.name}
                className="w-full h-full object-cover rounded-xl"
              />
            ) : (
              <div className="w-full h-full rounded-xl bg-[var(--muted)] border border-[var(--border)] flex items-center justify-center">
                <span className="text-[var(--muted-foreground)] text-sm">No image</span>
              </div>
            )}
          </Card>

          {/* Details */}
          <Card className="p-8 lg:col-span-2">
            <h2 className="text-sm font-semibold text-[var(--muted-foreground)] mb-6">
              General information
            </h2>

            <div className="space-y-4 text-sm">
              <DetailRow label="Name" value={customer.name} />
              <DetailRow label="Code" value={customer.code} />
              <DetailRow label="Contact person" value={customer.contact ?? "-"} />
              <DetailRow label="Email" value={customer.email ?? "-"} />
              <DetailRow label="Phone" value={customer.phone ?? "-"} />
              <DetailRow label="Address" value={customer.address ?? "-"} />
            </div>
          </Card>

        </div>
      </div>
    </DashboardShell>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center border-b border-[var(--border)] pb-3">
      <span className="text-sm text-[var(--muted-foreground)]">
        {label}
      </span>
      <span className="font-semibold text-[var(--foreground)]">{value}</span>
    </div>
  );
}
