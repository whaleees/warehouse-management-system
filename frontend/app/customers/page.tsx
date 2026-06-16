"use client";

import { useRouter } from "next/navigation";
import DashboardShell from "@/components/layout/dashboard-shell";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import { Pencil, Trash2, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { API_BASE_URL } from "@/lib/config";
import { useApi } from "@/lib/use-api";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import LoadingState from "@/components/ui/loading-state";
import EmptyState from "@/components/ui/empty-state";
import ErrorState from "@/components/ui/error-state";
import { useRole } from "@/lib/roles";

export default function CustomersPage() {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const { can } = useRole();
  const { data, loading, error, refetch } = useApi<any>("/customer");
  const customers = Array.isArray(data) ? data : [];

  async function deleteCustomer(name: string, id: string) {
    const ok = await confirm({
      title: `Delete ${name}?`,
      description: "This removes the customer from your records. This can't be undone.",
      confirmLabel: "Delete customer",
      tone: "danger",
    });
    if (!ok) return;

    try {
      await api(`/customer/${id}`, { method: "DELETE" });
      toast.success("Customer deleted.");
      refetch();
    } catch {
      toast.error("Couldn't delete the customer. Try again.");
    }
  }

  return (
    <DashboardShell>
      <div className="space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">
            Customers
          </h1>

          {can("manage:masterData") && (
            <Button
              variant="primary"
              onClick={() => router.push("/customers/create")}
            >
              <Plus size={16} /> Add customer
            </Button>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <LoadingState message="Loading customers…" />
        ) : error ? (
          <ErrorState message="Couldn't load customers. Refresh the page to try again." />
        ) : customers.length === 0 ? (
          <EmptyState message="No customers yet. Use the Add customer button to create one." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {customers.map((c) => (
              <Card
                key={c.id}
                className="hover:bg-[var(--bg-hover)] transition-colors cursor-pointer flex flex-col justify-between"
              >
                {/* Clickable content */}
                <div
                  className="flex flex-col flex-grow"
                  onClick={() => router.push(`/customers/${c.id}`)}
                >
                  {/* Image */}
                  {c.imagePath ? (
                    <img
                      src={`${API_BASE_URL}${c.imagePath}`}
                      alt={c.name}
                      className="w-full h-32 object-cover rounded-lg mb-4"
                    />
                  ) : (
                    <div className="w-full h-32 bg-[var(--muted)] rounded-lg mb-4 flex items-center justify-center text-[var(--muted-foreground)] text-sm">
                      No image
                    </div>
                  )}

                  {/* Info */}
                  <div className="space-y-1">
                    <p className="font-semibold text-lg text-[var(--foreground)]">{c.name}</p>

                    <p className="text-sm text-[var(--muted-foreground)]">
                      Code: {c.code}
                    </p>

                    {c.contact && (
                      <p className="text-sm text-[var(--muted-foreground)]">
                        Contact: {c.contact}
                      </p>
                    )}

                    {c.phone && (
                      <p className="text-sm text-[var(--muted-foreground)]">
                        Phone: {c.phone}
                      </p>
                    )}

                    {c.email && (
                      <p className="text-sm text-[var(--muted-foreground)]">
                        Email: {c.email}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 mt-4">
                  {can("manage:masterData") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/customers/${c.id}/edit`);
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
                        deleteCustomer(c.name, c.id);
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
