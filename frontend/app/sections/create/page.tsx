"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/layout/dashboard-shell";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";
import { ArrowLeft, MapPin } from "lucide-react";

export default function CreateSectionPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim() || !code.trim()) {
      alert("Name and Code are required");
      return;
    }

    try {
      setSaving(true);
      await api("/sections", {
        method: "POST",
        body: JSON.stringify({ name, code }),
      });

      router.push("/sections");
    } catch (err) {
      console.error(err);
      alert(err instanceof ApiError ? err.message : "Failed to create section");
    }
    setSaving(false);
  }

  return (
    <DashboardShell>
      <div className="space-y-8">
        
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/sections")}
              className="p-2 hover:bg-[#1a1b1f] rounded-lg transition"
            >
              <ArrowLeft size={20} />
            </button>

            <h1 className="text-xl font-mono tracking-widest flex items-center gap-2">
              <MapPin size={18} /> CREATE SECTION
            </h1>
          </div>
        </div>

        {/* FORM CARD */}
        <Card className="p-6 bg-[#111217] border border-[#1c1d22] rounded-xl max-w-xl">

          <form onSubmit={submit} className="space-y-6">

            {/* Section Name */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-mono tracking-widest text-gray-400">
                SECTION NAME
              </label>
              <input
                type="text"
                placeholder="Frozen Storage"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="
                  bg-[#0d0e10] border border-[#23252e] rounded-lg 
                  px-3 py-2 text-sm text-white
                  focus:outline-none focus:border-gray-500
                "
              />
            </div>

            {/* Section Code */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-mono tracking-widest text-gray-400">
                SECTION CODE
              </label>
              <input
                type="text"
                placeholder="SEC-001"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="
                  bg-[#0d0e10] border border-[#23252e] rounded-lg 
                  px-3 py-2 text-sm text-white
                  focus:outline-none focus:border-gray-500
                "
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={saving}
              className="
                w-full px-4 py-2 rounded-lg bg-white text-black
                font-mono text-xs tracking-widest font-semibold
                hover:bg-gray-200 transition
              "
            >
              {saving ? "SAVING..." : "CREATE SECTION"}
            </button>

          </form>

        </Card>
      </div>
    </DashboardShell>
  );
}
