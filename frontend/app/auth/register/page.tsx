"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Input from "@/components/ui/input";
import Button from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { API_BASE_URL } from "@/lib/config";

export default function RegisterPage() {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      toast.success("Account created. Check your email for a verification code.");
      router.push(`/auth/verify?email=${encodeURIComponent(email)}`);
    } catch {
      setError(
        "We couldn't create your account. This email may already be in use. Try a different one.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[var(--background)] px-4">

      {/* Register card */}
      <div className="w-full max-w-sm flex flex-col items-center text-center">

        <h1 className="text-[var(--foreground)] text-2xl font-semibold mb-2">
          Create account
        </h1>

        <p className="text-sm text-[var(--muted-foreground)] mb-8">
          Register to continue
        </p>

        {error && (
          <div className="banner-base banner-error w-full mb-4 text-left">
            {error}
          </div>
        )}

        <div className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 shadow-lg">
          <form onSubmit={handleRegister} className="space-y-4 w-full text-left">

            <Input
              label="Full name"
              placeholder="Jane Doe"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <Input
              type="email"
              label="Email"
              placeholder="you@company.com"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Input
              type="password"
              label="Password"
              placeholder="Create a password"
              hint="At least 8 characters."
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              loading={loading}
            >
              {loading ? "Creating account..." : "Create account"}
            </Button>
          </form>
        </div>

        <p className="text-sm text-[var(--muted-foreground)] mt-4">
          Already have an account?{" "}
          <button
            type="button"
            className="text-[var(--primary)] font-medium hover:underline"
            onClick={() => router.push("/auth/login")}
          >
            Sign in
          </button>
        </p>

      </div>
    </div>
  );
}
