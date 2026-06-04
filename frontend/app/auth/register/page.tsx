"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Input from "@/components/ui/input";
import Button from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/config";
import { User, Mail, Lock } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
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

      router.push(`/auth/verify?email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      setError(err.message ?? "Failed to register");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0b0c0f] px-4">

      {/* REGISTER WRAPPER - CARECHAIN STYLE */}
      <div className="w-full max-w-sm flex flex-col items-center text-center">

        {/* TITLE */}
        <h1 className="text-white text-xl font-semibold tracking-wide mb-2 font-mono">
          CREATE ACCOUNT
        </h1>

        {/* SUBTITLE */}
        <p className="text-[11px] text-gray-400 tracking-wider font-mono mb-8">
          REGISTER TO CONTINUE
        </p>

        {/* ERROR BOX */}
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
          <form onSubmit={handleRegister} className="space-y-4 w-full">

            {/* FULL NAME */}
            <div className="relative">
              <User size={16} className="absolute left-3 top-3 text-gray-500" />
              <Input
                placeholder="Full Name"
                className="pl-10 bg-[#0d0e10] border-[#26282d] font-mono"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* EMAIL */}
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-3 text-gray-500" />
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
              <Lock size={16} className="absolute left-3 top-3 text-gray-500" />
              <Input
                type="password"
                placeholder="Password"
                className="pl-10 bg-[#0d0e10] border-[#26282d] font-mono"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {/* SUBMIT BUTTON */}
            <Button
              type="submit"
              className="
                w-full py-2.5 rounded-lg
                bg-white text-black font-mono font-semibold tracking-wider
                hover:bg-gray-200 transition
              "
              disabled={loading}
            >
              {loading ? "CREATING..." : "CONTINUE"}
            </Button>
          </form>
        </div>

        {/* LOGIN LINK */}
        <p className="text-xs text-gray-500 mt-4 font-mono tracking-wide">
          ALREADY HAVE AN ACCOUNT?{" "}
          <button
            className="text-white hover:underline"
            onClick={() => router.push("/auth/login")}
          >
            LOGIN
          </button>
        </p>

      </div>
    </div>
  );
}
