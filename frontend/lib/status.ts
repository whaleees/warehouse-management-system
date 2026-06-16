import { BadgeColor } from "@/lib/types";

/**
 * Centralized status metadata. Each status maps to a plain-English label, a
 * short hint ("what do I do now"), and a BadgeColor. Pages should render the
 * human label via <StatusBadge>, not the raw enum.
 */

export type OrderStatus =
  | "DRAFT"
  | "PENDING"
  | "PARTIALLY_RECEIVED"
  | "RECEIVED"
  | "CANCELLED";

export type GRStatus = "PENDING" | "RECEIVED";

export type ShipmentStatus = "DRAFT" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED";

export type SalesOrderStatus =
  | "DRAFT"
  | "PENDING"
  | "PARTIALLY_SHIPPED"
  | "SHIPPED"
  | "CANCELLED";

export type StatusKind = "order" | "gr" | "shipment" | "salesOrder";

export interface StatusMeta {
  label: string;
  hint: string;
  color: BadgeColor;
}

const ORDER_STATUS: Record<OrderStatus, StatusMeta> = {
  DRAFT: {
    label: "Draft",
    hint: "Not submitted yet. You can still edit the items.",
    color: "default",
  },
  PENDING: {
    label: "Awaiting approval",
    hint: "Submitted and waiting for a manager to approve.",
    color: "warning",
  },
  PARTIALLY_RECEIVED: {
    label: "Partly received",
    hint: "Some items have arrived; more are still expected.",
    color: "warning",
  },
  RECEIVED: {
    label: "Received",
    hint: "All items have arrived and been added to stock.",
    color: "success",
  },
  CANCELLED: {
    label: "Cancelled",
    hint: "This order was cancelled and won't be fulfilled.",
    color: "danger",
  },
};

const GR_STATUS: Record<GRStatus, StatusMeta> = {
  PENDING: {
    label: "Awaiting check-in",
    hint: "Items received but not yet added to stock.",
    color: "warning",
  },
  RECEIVED: {
    label: "Checked in",
    hint: "Items have been finalized and added to stock.",
    color: "success",
  },
};

const SHIPMENT_STATUS: Record<ShipmentStatus, StatusMeta> = {
  DRAFT: {
    label: "Draft",
    hint: "Being prepared. Not shipped yet.",
    color: "default",
  },
  IN_TRANSIT: {
    label: "In transit",
    hint: "On the way to the customer.",
    color: "warning",
  },
  DELIVERED: {
    label: "Delivered",
    hint: "Received by the customer.",
    color: "success",
  },
  CANCELLED: {
    label: "Cancelled",
    hint: "This shipment was cancelled.",
    color: "danger",
  },
};

const SALES_ORDER_STATUS: Record<SalesOrderStatus, StatusMeta> = {
  DRAFT: {
    label: "Draft",
    hint: "Not submitted yet. You can still edit the items.",
    color: "default",
  },
  PENDING: {
    label: "Awaiting approval",
    hint: "Submitted and waiting for approval.",
    color: "warning",
  },
  PARTIALLY_SHIPPED: {
    label: "Partly shipped",
    hint: "Some items have shipped; more are still to go.",
    color: "warning",
  },
  SHIPPED: {
    label: "Shipped",
    hint: "All items have shipped to the customer.",
    color: "success",
  },
  CANCELLED: {
    label: "Cancelled",
    hint: "This order was cancelled.",
    color: "danger",
  },
};

const MAPS: Record<StatusKind, Record<string, StatusMeta>> = {
  order: ORDER_STATUS,
  gr: GR_STATUS,
  shipment: SHIPMENT_STATUS,
  salesOrder: SALES_ORDER_STATUS,
};

/** Turn an unknown enum like PARTIALLY_RECEIVED into "Partly received". */
function humanize(status: string): string {
  const s = status.replace(/_/g, " ").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Full metadata for a status; falls back gracefully for unknown values. */
export function statusMeta(kind: StatusKind, status?: string | null): StatusMeta {
  if (!status) return { label: "—", hint: "", color: "default" };
  return (
    MAPS[kind][status] ?? {
      label: humanize(status),
      hint: "",
      color: "default",
    }
  );
}

// --- Back-compat color helpers (still used by some pages) -------------------

export const orderStatusColor = (status: OrderStatus): BadgeColor =>
  statusMeta("order", status).color;

export const grStatusColor = (status: GRStatus): BadgeColor =>
  statusMeta("gr", status).color;

export const shipmentStatusColor = (status: ShipmentStatus): BadgeColor =>
  statusMeta("shipment", status).color;

export const salesOrderStatusColor = (status: SalesOrderStatus): BadgeColor =>
  statusMeta("salesOrder", status).color;
