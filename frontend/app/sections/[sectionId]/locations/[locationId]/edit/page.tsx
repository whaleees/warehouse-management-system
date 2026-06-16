"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/layout/dashboard-shell";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import LoadingState from "@/components/ui/loading-state";
import { api } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft } from "lucide-react";

export default function EditLocationPage() {
  const router = useRouter();
  const { sectionId, locationId } = useParams();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [codeError, setCodeError] = useState<string | undefined>();

  const [form, setForm] = useState({
    code: "",
    type: "BIN",
  });

  async function loadData() {
    try {
      const loc = await api(`/sections/${sectionId}/locations/${locationId}`);

      setForm({
        code: loc.code,
        type: loc.type,
      });
    } catch (err) {
      console.error("Failed loading location:", err);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!form.code.trim()) {
      setCodeError("Enter a location code.");
      return;
    }

    setSaving(true);

    try {
      await api(`/sections/${sectionId}/locations/${locationId}`, {
        method: "PATCH",
        body: JSON.stringify({
          code: form.code,
          type: form.type,
        }),
      });

      toast.success("Location updated.");
      router.push(`/sections/${sectionId}/locations/${locationId}`);
    } catch (err) {
      console.error("Location update failed:", err);
      toast.error("Couldn't save your changes. Try again.");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <DashboardShell>
        <LoadingState message="Loading location…" />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              router.push(`/sections/${sectionId}/locations/${locationId}`)
            }
            aria-label="Back to location"
          >
            <ArrowLeft size={18} />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-[var(--foreground)]">
              Edit location
            </h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Update this location's code and type.
            </p>
          </div>
        </div>

        <Card className="max-w-xl">
          <div className="space-y-6">
            <Input
              label="Code"
              placeholder="Location code"
              value={form.code}
              onChange={(e) => {
                updateField("code", e.target.value);
                if (codeError) setCodeError(undefined);
              }}
              error={codeError}
            />

            <div className="w-full space-y-1.5">
              <label
                htmlFor="location-type"
                className="block text-sm font-medium text-[var(--foreground)]"
              >
                Type
              </label>
              <select
                id="location-type"
                value={form.type}
                onChange={(e) => updateField("type", e.target.value)}
                className="min-h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm text-[var(--foreground)] transition-colors focus:border-[var(--ring)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              >
                <option value="BIN">Bin</option>
                <option value="SECTION">Section</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                router.push(`/sections/${sectionId}/locations/${locationId}`)
              }
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>
              Save changes
            </Button>
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}
