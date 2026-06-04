"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

export type GRStatus = "PENDING" | "RECEIVED";

interface Product {
  id: string;
  name: string;
  sku: string;
  uom: string;
}

interface PurchaseOrderItem {
  id: string;
  quantity: number;
  product: Product;
  received?: number;
  remaining?: number;
}

interface Supplier {
  id: string;
  name: string;
  code: string;
}

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplier?: Supplier;
  items: PurchaseOrderItem[];
}

interface InboundLine {
  id: string;
  quantity: number;
  purchaseOrderItemId: string;
  product: Product;
  batch: {
    id: string;
    batchNumber: string;
    expiryDate?: string | null;
  };
  location: {
    id: string;
    code: string;
    section?: {
      id: string;
      code: string;
    };
  };
}

export interface InboundDetail {
  id: string;
  receiptNumber: string;
  status: GRStatus;
  receivedAt: string;
  createdAt: string;
  purchaseOrder: PurchaseOrder;
  lines: InboundLine[];
}

/**
 * Owns the server-side data for the inbound detail page: the goods receipt,
 * the available sections, and the locations for a chosen section. Form state
 * (selected item/batch/qty) stays in the component.
 */
export function useInboundDetail(id: string) {
  const [gr, setGr] = useState<InboundDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);

  const reload = useCallback(async () => {
    try {
      const data = await api(`/inbound/${id}`);
      setGr(data);
    } catch (err) {
      console.error("Load inbound failed:", err);
      setGr(null);
    }
    setLoading(false);
  }, [id]);

  const loadSections = useCallback(async () => {
    try {
      const data = await api("/sections?page=1&limit=999");
      setSections(data.data ?? []);
    } catch {
      setSections([]);
    }
  }, []);

  const loadLocations = useCallback(async (sectionId: string) => {
    try {
      const res = await api(`/sections/${sectionId}/locations?page=1&limit=999`);
      setLocations(res.data ?? []);
    } catch {
      setLocations([]);
    }
  }, []);

  useEffect(() => {
    reload();
    loadSections();
  }, [reload, loadSections]);

  return { gr, loading, sections, locations, setLocations, reload, loadLocations };
}
