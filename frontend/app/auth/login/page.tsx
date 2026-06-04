"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Input from "@/components/ui/input";
import Button from "@/components/ui/button";
import { API_BASE_URL, TOKEN_KEY } from "@/lib/config";
import { Mail, Lock } from "lucide-react";

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
    } catch (err: any) {
      setError(err.message ?? "Failed to sign in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0b0c0f] px-4">
      
      {/* LOGIN WRAPPER - CARECHAIN STYLE */}
      <div className="w-full max-w-sm flex flex-col items-center text-center">

        {/* TITLE */}
        <h1 className="text-white text-xl font-semibold tracking-wide mb-2 font-mono">
          WELCOME BACK
        </h1>

        {/* SUBTITLE */}
        <p className="text-[11px] text-gray-400 tracking-wider font-mono mb-8">
          SIGN IN TO CONTINUE
        </p>

        {/* ERROR */}
        {error && (
          <div className="text-red-400 text-xs mb-4 bg-red-500/10 px-3 py-2 rounded border border-red-500/20 font-mono">
            {error}
          </div>
        )}

        {/* FORM CARD */}
        <div
          className="
            w-full bg-[#111215] border border-[#1e1f22]
            rounded-xl p-6 shadow-lg
          "
        >
          <form onSubmit={handleLogin} className="space-y-4 w-full">

            {/* EMAIL */}
            <div className="relative">
              <Mail
                size={16}
                className="absolute left-3 top-3 text-gray-500"
              />
              <Input
                type="email"
                placeholder="Email"
                className="pl-10 bg-[#0d0e10] border-[#26282d] font-mono"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* PASSWORD */}
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-3 top-3 text-gray-500"
              />
              <Input
                type="password"
                placeholder="Password"
                className="pl-10 bg-[#0d0e10] border-[#26282d] font-mono"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {/* BUTTON */}
            <Button
              type="submit"
              className="
                w-full py-2.5 rounded-lg
                bg-white text-black font-mono font-semibold tracking-wider
                hover:bg-gray-200 transition
              "
              disabled={loading}
            >
              {loading ? "SIGNING IN..." : "SIGN IN"}
            </Button>
          </form>
        </div>

        {/* REGISTER */}
        <p className="text-xs text-gray-500 mt-4 font-mono tracking-wide">
          DON'T HAVE AN ACCOUNT?{" "}
          <button
            className="text-white hover:underline"
            onClick={() => router.push("/auth/register")}
          >
            REGISTER
          </button>
        </p>

      </div>
    </div>
  );
}
