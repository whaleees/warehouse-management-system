"use client";

import { useState } from "react";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/components/ui/toast";

interface LocationItem {
  id: string;
  code: string;
  type: string;
}

interface LocationModalProps {
  sectionId: string;
  /** When provided, the modal edits this location; otherwise it adds a new one. */
  location?: LocationItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function LocationModal({
  sectionId,
  location,
  onClose,
  onSuccess,
}: LocationModalProps) {
  const toast = useToast();
  const isEdit = Boolean(location);

  const [saving, setSaving] = useState(false);
  const [codeError, setCodeError] = useState<string | undefined>();
  const [form, setForm] = useState({
    code: location?.code ?? "",
    type: location?.type ?? "BIN",
  });

  function updateField(key: "code" | "type", value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.code.trim()) {
      setCodeError("Enter a location code.");
      return;
    }

    setSaving(true);

    try {
      if (isEdit && location) {
        await api(`/sections/${sectionId}/locations/${location.id}`, {
          method: "PATCH",
          body: JSON.stringify({ code: form.code, type: form.type }),
        });
        toast.success("Location updated.");
      } else {
        await api(`/sections/${sectionId}/locations`, {
          method: "POST",
          body: JSON.stringify({ code: form.code, type: form.type }),
        });
        toast.success("Location added.");
      }
      onSuccess();
    } catch (err) {
      console.error("Save location failed:", err);
      toast.error(
        err instanceof ApiError
          ? err.message
          : isEdit
            ? "Couldn't save your changes. Try again."
            : "Couldn't add the location. Check the details and try again.",
      );
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-md space-y-6">
        <div>
          <h1 className="text-lg font-semibold text-[var(--card-foreground)]">
            {isEdit ? "Edit location" : "Add a location"}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {isEdit
              ? "Update this location's code and type."
              : "Add a new storage location to this section."}
          </p>
        </div>

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

        <div className="flex flex-col gap-1.5">
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
            className="input-style"
          >
            <option value="BIN">Bin</option>
            <option value="SECTION">Section</option>
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} loading={saving}>
            {isEdit ? "Save changes" : "Create location"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
