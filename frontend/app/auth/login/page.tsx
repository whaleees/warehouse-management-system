"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Input from "@/components/ui/input";
import Button from "@/components/ui/button";
import { API_BASE_URL, TOKEN_KEY } from "@/lib/config";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      localStorage.setItem(TOKEN_KEY, data.accessToken);

      router.push("/");
    } catch {
      setError(
        "We couldn't sign you in. Check your email and password, then try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[var(--background)] px-4">

      {/* Login card */}
      <div className="w-full max-w-sm flex flex-col items-center text-center">

        <h1 className="text-[var(--foreground)] text-2xl font-semibold mb-2">
          Welcome back
        </h1>

        <p className="text-sm text-[var(--muted-foreground)] mb-8">
          Sign in to continue
        </p>

        {error && (
          <div className="banner-base banner-error w-full mb-4 text-left">
            {error}
          </div>
        )}

        <div className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 shadow-lg">
          <form onSubmit={handleLogin} className="space-y-4 w-full text-left">

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
              placeholder="Your password"
              autoComplete="current-password"
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
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </div>

        <p className="text-sm text-[var(--muted-foreground)] mt-4">
          Don&apos;t have an account?{" "}
          <button
            type="button"
            className="text-[var(--primary)] font-medium hover:underline"
            onClick={() => router.push("/auth/register")}
          >
            Create one
          </button>
        </p>

      </div>
    </div>
  );
}
