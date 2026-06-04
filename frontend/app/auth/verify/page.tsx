"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import Button from "@/components/ui/button";
import CodeInput from "@/components/ui/code-input";
import { API_BASE_URL } from "@/lib/config";

function VerifyForm() {
  const router = useRouter();
  const search = useSearchParams();
  const email = search.get("email") ?? "";

  const [code, setCode] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setStatus("success");
      setTimeout(() => router.push("/auth/login"), 1200);
    } catch (err: any) {
      setStatus(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0b0c0f] px-4">

      <div className="w-full max-w-sm flex flex-col items-center text-center">

        {/* TITLE */}
        <h1 className="text-white text-xl font-semibold tracking-wide mb-2 font-mono">
          VERIFY EMAIL
        </h1>

        {/* SUBTITLE */}
        <p className="text-[11px] text-gray-400 tracking-wider font-mono mb-6">
          ENTER THE CODE SENT TO{" "}
          <span className="text-gray-300">{email}</span>
        </p>

        {/* STATUS MESSAGES */}
        {status && status !== "success" && (
          <div className="text-red-400 text-xs mb-4 bg-red-500/10 px-3 py-2 rounded border border-red-500/20 font-mono">
            {status}
          </div>
        )}

        {status === "success" && (
          <div className="text-green-400 text-xs mb-4 bg-green-500/10 px-3 py-2 rounded border border-green-500/20 font-mono">
            VERIFIED — REDIRECTING...
          </div>
        )}

        {/* CARD */}
        <div
          className="
            w-full bg-[#111215] border border-[#1e1f22]
            rounded-xl p-6 shadow-lg
          "
        >
          <form onSubmit={handleVerify} className="space-y-6">

            <CodeInput
              value={code}
              onChange={setCode}
              length={6}
            />

            {/* BUTTON */}
            <Button
              className="
                w-full py-2.5 rounded-lg
                bg-white text-black font-mono font-semibold tracking-wider
                hover:bg-gray-200 transition
              "
              disabled={loading || code.length < 6}
            >
              {loading ? "VERIFYING..." : "VERIFY"}
            </Button>
          </form>
        </div>

        {/* LOGIN LINK */}
        <p className="text-xs text-gray-500 mt-4 font-mono tracking-wide">
          ENTERED A WRONG EMAIL?{" "}
          <button
            className="text-white hover:underline"
            onClick={() => router.push("/auth/register")}
          >
            GO BACK
          </button>
        </p>

      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-[#0b0c0f] px-4" />
      }
    >
      <VerifyForm />
    </Suspense>
  );
}
