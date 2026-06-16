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
  const [status, setStatus] = useState<"error" | "success" | null>(null);
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
    } catch {
      setStatus("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[var(--background)] px-4">

      <div className="w-full max-w-sm flex flex-col items-center text-center">

        <h1 className="text-[var(--foreground)] text-2xl font-semibold mb-2">
          Verify your email
        </h1>

        <p className="text-sm text-[var(--muted-foreground)] mb-6">
          Enter the 6-digit code we emailed to{" "}
          <span className="text-[var(--foreground)] font-medium">{email}</span>.
        </p>

        {status === "error" && (
          <div className="banner-base banner-error w-full mb-4 text-left">
            That code didn&apos;t match. Check the code in your email and try
            again.
          </div>
        )}

        {status === "success" && (
          <div className="banner-base banner-success w-full mb-4 text-left">
            Email verified. Taking you to sign in...
          </div>
        )}

        <div className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 shadow-lg">
          <form onSubmit={handleVerify} className="space-y-6">

            <CodeInput value={code} onChange={setCode} length={6} />

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              loading={loading}
              disabled={loading || code.length < 6}
            >
              {loading ? "Verifying..." : "Verify email"}
            </Button>
          </form>
        </div>

        <p className="text-sm text-[var(--muted-foreground)] mt-4">
          Used the wrong email?{" "}
          <button
            type="button"
            className="text-[var(--primary)] font-medium hover:underline"
            onClick={() => router.push("/auth/register")}
          >
            Go back
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
        <div className="min-h-screen w-full flex items-center justify-center bg-[var(--background)] px-4" />
      }
    >
      <VerifyForm />
    </Suspense>
  );
}
