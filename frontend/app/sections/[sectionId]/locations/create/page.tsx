"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/layout/dashboard-shell";
import Card from "@/components/ui/card";
import { api, ApiError } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";

export default function CreateLocationPage() {
  const router = useRouter();
  const { sectionId } = useParams();

  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    code: "",
    type: "BIN",
  });

  function updateField(key: string, value: any) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function saveLocation() {
    if (!form.code.trim()) {
      alert("Location code is required.");
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

      router.push(`/sections/${sectionId}`);
    } catch (err) {
      console.error("Create location failed:", err);
      alert(err instanceof ApiError ? err.message : "Failed to create location");
    }

    setLoading(false);
  }

  return (
    <DashboardShell>
      <div className="flex items-center gap-3 mb-8">
        <button
          className="p-2 hover:bg-[#1a1b1f] rounded-lg transition"
          onClick={() => router.push(`/sections/${sectionId}`)}
        >
          <ArrowLeft size={20} />
        </button>

        <h1 className="text-xl font-mono tracking-widest flex items-center gap-2">
          <Plus size={18} /> ADD LOCATION
        </h1>
      </div>

      <Card className="p-8 bg-[#111217] border border-[#1c1d22] rounded-xl max-w-lg">

        {/* CODE */}
        <div className="mb-6">
          <label className="block text-[11px] font-mono tracking-widest text-gray-400 mb-1">
            LOCATION CODE
          </label>
          <input
            type="text"
            className="
              w-full bg-[#0e0f12] border border-[#2a2c32]
              rounded-lg px-3 py-2 text-sm font-mono
            "
            placeholder="e.g. LOC-001-A"
            value={form.code}
            onChange={(e) => updateField("code", e.target.value)}
          />
        </div>

        {/* TYPE */}
        <div className="mb-6">
          <label className="block text-[11px] font-mono tracking-widest text-gray-400 mb-1">
            TYPE
          </label>
          <select
            className="
              w-full bg-[#0e0f12] border border-[#2a2c32]
              rounded-lg px-3 py-2 text-sm font-mono
            "
            value={form.type}
            onChange={(e) => updateField("type", e.target.value)}
          >
            <option value="BIN">BIN</option>
            <option value="SECTION">SECTION</option>
          </select>
        </div>

        {/* ACTION BUTTON */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={saveLocation}
            disabled={loading}
            className="
              px-5 py-2 rounded-lg bg-white text-black 
              font-mono text-xs tracking-widest font-semibold
              hover:bg-gray-200 transition
            "
          >
            {loading ? "SAVING..." : "CREATE LOCATION"}
          </button>
        </div>
      </Card>
    </DashboardShell>
  );
}
