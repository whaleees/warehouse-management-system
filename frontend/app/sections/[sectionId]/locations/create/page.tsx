"use client";

import { useState } from "react";
import DashboardShell from "@/components/layout/dashboard-shell";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import { api, ApiError } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft } from "lucide-react";

export default function CreateLocationPage() {
  const router = useRouter();
  const { sectionId } = useParams();
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [codeError, setCodeError] = useState<string | undefined>();

  const [form, setForm] = useState({
    code: "",
    type: "BIN",
  });

  function updateField(key: string, value: any) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function saveLocation() {
    if (!form.code.trim()) {
      setCodeError("Enter a location code.");
      return;
    }

    setLoading(true);

    try {
      await api(`/sections/${sectionId}/locations`, {
        method: "POST",
        body: JSON.stringify({
          code: form.code,
          type: form.type,
        }),
      });

      toast.success("Location added.");
      router.push(`/sections/${sectionId}`);
    } catch (err) {
      console.error("Create location failed:", err);
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Couldn't add the location. Check the details and try again."
      );
      setLoading(false);
    }
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
            Add a location
          </h1>
        </div>

        <Card className="max-w-lg">
          <div className="space-y-6">
            <Input
              label="Location code"
              placeholder="e.g. LOC-001-A"
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
                className="min-h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm text-[var(--foreground)] transition-colors focus:border-[var(--ring)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                value={form.type}
                onChange={(e) => updateField("type", e.target.value)}
              >
                <option value="BIN">Bin</option>
                <option value="SECTION">Section</option>
              </select>
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/sections/${sectionId}`)}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={saveLocation} loading={loading}>
              Create location
            </Button>
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}
