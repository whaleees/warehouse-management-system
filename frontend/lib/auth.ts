"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TOKEN_KEY, TOKEN_PAYLOAD_KEY } from "./config";

export const getToken = () =>
  typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;

/** Decodes the JWT payload from the stored access token, or null if absent/invalid. */
export function getUser<T = any>(): T | null {
  const token = getToken();
  if (!token) return null;

  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    return JSON.parse(atob(payload)) as T;
  } catch {
    return null;
  }
}

export const logout = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_PAYLOAD_KEY);
    window.location.href = "/auth/login";
  }
};

export function useAuthGuard() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/auth/login");
    } else {
      setReady(true);
    }
  }, [router]);

  return ready;
}
