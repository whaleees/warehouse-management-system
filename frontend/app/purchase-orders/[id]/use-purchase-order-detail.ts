"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

export type OrderStatus =
  | "DRAFT"
  | "PENDING"
  | "PARTIALLY_RECEIVED"
  | "RECEIVED"
  | "CANCELLED";

interface Product {
  id: string;
  name: string;
  sku: string;
  uom: string;
}

interface PurchaseOrderItem {
  id: string;
  quantity: number;
  unitPrice: string;
  product: Product;
  receiptLines?: Array<{
    quantity: number;
  }>;
}

interface GoodsReceipt {
  id: string;
  receiptNumber: string;
  status: "PENDING" | "RECEIVED";
  receivedAt: string;
}

interface Supplier {
  id: string;
  code: string;
  name: string;
}

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  orderDate: string;
  expectedDate?: string;
  supplier: Supplier;
  items: PurchaseOrderItem[];
  goodsReceipts: GoodsReceipt[];
}

/**
 * Owns the purchase order detail data plus the derived line/quantity/amount
 * totals. Mutating actions live in the component and call `reload`.
 */
export function usePurchaseOrderDetail(id: string) {
  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const data = await api(`/purchase-order/${id}`);
      setPo(data);
    } catch (err) {
      console.error("Load PO failed:", err);
      setPo(null);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    reload();
  }, [reload]);

  const totals = useMemo(() => {
    if (!po) return { lineCount: 0, totalQty: 0, totalAmount: 0 };
    const lineCount = po.items?.length ?? 0;
    let totalQty = 0;
    let totalAmount = 0;
    po.items.forEach((it) => {
      totalQty += it.quantity;
      const price = Number(it.unitPrice ?? 0);
      totalAmount += it.quantity * price;
    });
    return { lineCount, totalQty, totalAmount };
  }, [po]);

  return { po, loading, totals, reload };
}
