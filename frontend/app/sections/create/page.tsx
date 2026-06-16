"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/layout/dashboard-shell";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft } from "lucide-react";

export default function CreateSectionPage() {
  const router = useRouter();
  const toast = useToast();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; code?: string }>({});

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    const nextErrors: { name?: string; code?: string } = {};
    if (!name.trim()) nextErrors.name = "Enter a section name.";
    if (!code.trim()) nextErrors.code = "Enter a section code.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      setSaving(true);
      await api("/sections", {
        method: "POST",
        body: JSON.stringify({ name, code }),
      });

      toast.success("Section created.");
      router.push("/sections");
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Couldn't create the section. Check the details and try again."
      );
      setSaving(false);
    }
  }

  return (
    <DashboardShell>
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/sections")}
          aria-label="Back to sections"
        >
          <ArrowLeft size={18} />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">
            Add a section
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Group your warehouse storage into sections like aisles or zones.
          </p>
        </div>
      </div>

      {/* Form card */}
      <Card className="space-y-8 p-8">
        <form onSubmit={submit} className="space-y-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Input
              label="Section name"
              placeholder="Frozen storage"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((p) => ({ ...p, name: undefined }));
              }}
              error={errors.name}
            />

            <Input
              label="Section code"
              placeholder="SEC-001"
              hint="A short code staff use to refer to this section."
              value={code}
              onChange={(e) => {
                // Codes are conventionally uppercase (SEC-001, SUP-APP).
                setCode(e.target.value.toUpperCase());
                if (errors.code) setErrors((p) => ({ ...p, code: undefined }));
              }}
              error={errors.code}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/sections")}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              Create section
            </Button>
          </div>
        </form>
      </Card>
    </DashboardShell>
  );
}
