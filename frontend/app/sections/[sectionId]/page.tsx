"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardShell from "@/components/layout/dashboard-shell";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import LoadingState from "@/components/ui/loading-state";
import ErrorState from "@/components/ui/error-state";
import EmptyState from "@/components/ui/empty-state";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { ArrowLeft, Pencil, Trash2, Plus } from "lucide-react";
import LocationModal from "../location-modal";
import { useRole } from "@/lib/roles";

interface LocationItem {
  id: string;
  code: string;
  type: string;
}

export default function SectionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const sectionId = params?.sectionId as string;
  const toast = useToast();
  const confirm = useConfirm();
  const { can } = useRole();

  const [section, setSection] = useState<any>(null);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [loading, setLoading] = useState(true);

  // null = closed, "new" = add, object = edit that location.
  const [modal, setModal] = useState<"new" | LocationItem | null>(null);

  async function loadData() {
    try {
      const secRes = await api(`/sections/${sectionId}`);
      const sec = secRes.section ?? secRes;
      setSection(sec);

      const locRes = await api(`/sections/${sectionId}/locations?page=1&limit=999`);
      const locList = Array.isArray(locRes) ? locRes : locRes.data ?? [];
      setLocations(locList);
    } catch (err) {
      console.error("Section detail failed:", err);
    }
    setLoading(false);
  }

  async function deleteSection() {
    const ok = await confirm({
      title: "Delete this section?",
      description:
        "This permanently removes the section. It only works if the section has no locations. This can't be undone.",
      confirmLabel: "Delete section",
      tone: "danger",
      onConfirm: async () => {
        try {
          await api(`/sections/${sectionId}`, { method: "DELETE" });
        } catch {
          throw new Error(
            "Couldn't delete the section. Remove its locations first, then try again."
          );
        }
      },
    });

    if (ok) {
      toast.success("Section deleted.");
      router.push("/sections");
    }
  }

  async function deleteLocation(loc: LocationItem) {
    const ok = await confirm({
      title: "Delete this location?",
      description: (
        <>
          This permanently removes <strong>{loc.code}</strong> from the section.
          This can&apos;t be undone.
        </>
      ),
      confirmLabel: "Delete location",
      tone: "danger",
      onConfirm: async () => {
        try {
          await api(`/sections/${sectionId}/locations/${loc.id}`, {
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
      loadData();
    }
  }

  useEffect(() => {
    loadData();
  }, [sectionId]);

  if (loading) {
    return (
      <DashboardShell>
        <LoadingState message="Loading section…" />
      </DashboardShell>
    );
  }

  if (!section) {
    return (
      <DashboardShell>
        <ErrorState message="We couldn't find that section." />
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
              onClick={() => router.push("/sections")}
              aria-label="Back to sections"
            >
              <ArrowLeft size={18} />
            </Button>

            <div className="flex flex-col">
              <h1 className="text-2xl font-semibold text-[var(--foreground)]">
                {section.code}
              </h1>
              <span className="text-sm text-[var(--muted-foreground)]">
                {section.description || "No description"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {can("manage:masterData") && (
              <Button
                variant="outline"
                onClick={() => router.push(`/sections/${sectionId}/edit`)}
              >
                <Pencil size={16} /> Edit
              </Button>
            )}

            {can("manage:masterData") && (
              <Button variant="danger" onClick={deleteSection}>
                <Trash2 size={16} /> Delete
              </Button>
            )}
          </div>
        </div>

        {/* Details card */}
        <Card>
          <h2 className="mb-4 text-base font-semibold text-[var(--card-foreground)]">
            Section details
          </h2>

          <div className="space-y-4 text-sm">
            <DetailItem label="Code" value={section.code} />
            <DetailItem label="Description" value={section.description || "—"} />
            <DetailItem
              label="Total locations"
              value={String(locations.length)}
            />
          </div>
        </Card>

        {/* Locations header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            Locations
          </h2>

          {can("manage:masterData") && (
            <Button variant="primary" onClick={() => setModal("new")}>
              <Plus size={16} /> Add location
            </Button>
          )}
        </div>

        {/* Location table */}
        <Card className="overflow-hidden p-0">
          {locations.length === 0 ? (
            <div className="p-5">
              <EmptyState message="No locations yet. Add one with the Add location button above." />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-[var(--muted)] text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Location</th>
                  <th className="px-4 py-3 text-left font-medium">Type</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>

              <tbody>
                {locations.map((loc) => (
                  <tr
                    key={loc.id}
                    className="border-t border-[var(--border)] transition-colors hover:bg-[var(--bg-hover)]"
                  >
                    <td className="px-4 py-3 font-medium text-[var(--foreground)]">
                      {loc.code}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)]">
                      {loc.type}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {can("manage:masterData") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setModal(loc)}
                            aria-label={`Edit ${loc.code}`}
                          >
                            <Pencil size={15} /> Edit
                          </Button>
                        )}
                        {can("manage:masterData") && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteLocation(loc)}
                            aria-label={`Delete ${loc.code}`}
                            className="text-[var(--danger-text)] hover:bg-[var(--danger-bg)]"
                          >
                            <Trash2 size={15} /> Delete
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {modal && (
        <LocationModal
          sectionId={sectionId}
          location={modal === "new" ? null : modal}
          onClose={() => setModal(null)}
          onSuccess={() => {
            setModal(null);
            loadData();
          }}
        />
      )}
    </DashboardShell>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-[var(--border)] pb-2">
      <span className="text-[var(--muted-foreground)]">{label}</span>
      <span className="font-medium text-[var(--foreground)]">{value}</span>
    </div>
  );
}
