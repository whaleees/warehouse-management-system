"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

export interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Mount-time (and dependency-driven) data fetch wrapping the typed `api<T>`.
 * Returns the raw response; callers should apply any Array.isArray
 * normalization on `data` after it returns.
 */
export function useApi<T = any>(path: string, deps: any[] = []): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<T>(path);
      setData(res);
    } catch (err: any) {
      setError(err?.message ?? "Request failed");
      setData(null);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}
