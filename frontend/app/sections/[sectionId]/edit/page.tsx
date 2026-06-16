"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardShell from "@/components/layout/dashboard-shell";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import LoadingState from "@/components/ui/loading-state";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft } from "lucide-react";

export default function EditSectionPage() {
  const router = useRouter();
  const params = useParams();
  const sectionId = params?.sectionId as string;
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [codeError, setCodeError] = useState<string | undefined>();

  const [form, setForm] = useState({
    code: "",
    description: "",
  });

  useEffect(() => {
    async function load() {
      try {
        const data = await api(`/sections/${sectionId}`);
        setForm({
          code: data.section?.code || data.code || "",
          description: data.section?.description || data.description || "",
        });
      } catch (err) {
        console.error("Failed loading section:", err);
      }
      setLoading(false);
    }
    load();
  }, [sectionId]);

  function updateField(key: string, val: string) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  async function save() {
    if (!form.code.trim()) {
      setCodeError("Enter a section code.");
      return;
    }

    setSaving(true);
    try {
      await api(`/sections/${sectionId}`, {
        method: "PATCH",
        body: JSON.stringify({
          code: form.code,
          description: form.description || null,
        }),
      });
      toast.success("Section updated.");
      router.push(`/sections/${sectionId}`);
    } catch (err) {
      console.error("Save section failed:", err);
      toast.error("Couldn't save your changes. Try again.");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <DashboardShell>
        <LoadingState message="Loading section…" />
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
            onClick={() => router.push(`/sections/${sectionId}`)}
            aria-label="Back to section"
          >
            <ArrowLeft size={18} />
          </Button>
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">
            Edit section
          </h1>
        </div>

        {/* Form card */}
        <Card className="max-w-xl">
          <div className="space-y-6">
            <Input
              label="Code"
              value={form.code}
              onChange={(e) => {
                updateField("code", e.target.value);
                if (codeError) setCodeError(undefined);
              }}
              error={codeError}
            />

            <div className="w-full space-y-1.5">
              <label
                htmlFor="section-description"
                className="block text-sm font-medium text-[var(--foreground)]"
              >
                Description
              </label>
              <textarea
                id="section-description"
                rows={3}
                className="min-h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] transition-colors focus:border-[var(--ring)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/sections/${sectionId}`)}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={save} loading={saving}>
              Save changes
            </Button>
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}
