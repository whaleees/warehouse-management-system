import { BadgeColor } from "@/lib/types";

/**
 * Centralized status -> BadgeColor maps, derived from the inline
 * statusBadgeColor/statusColor helpers previously duplicated across pages.
 * Each helper falls back to "default" for unknown values, matching the
 * original switch `default` branches.
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

const ORDER_STATUS_COLORS: Record<OrderStatus, BadgeColor> = {
  DRAFT: "default",
  PENDING: "warning",
  PARTIALLY_RECEIVED: "warning",
  RECEIVED: "success",
  CANCELLED: "danger",
};

const GR_STATUS_COLORS: Record<GRStatus, BadgeColor> = {
  PENDING: "warning",
  RECEIVED: "success",
};

const SHIPMENT_STATUS_COLORS: Record<ShipmentStatus, BadgeColor> = {
  DRAFT: "default",
  IN_TRANSIT: "warning",
  DELIVERED: "success",
  CANCELLED: "danger",
};

const SALES_ORDER_STATUS_COLORS: Record<SalesOrderStatus, BadgeColor> = {
  DRAFT: "default",
  PENDING: "warning",
  PARTIALLY_SHIPPED: "warning",
  SHIPPED: "success",
  CANCELLED: "danger",
};

export const orderStatusColor = (status: OrderStatus): BadgeColor =>
  ORDER_STATUS_COLORS[status] ?? "default";

export const grStatusColor = (status: GRStatus): BadgeColor =>
  GR_STATUS_COLORS[status] ?? "default";

export const shipmentStatusColor = (status: ShipmentStatus): BadgeColor =>
  SHIPMENT_STATUS_COLORS[status] ?? "default";

export const salesOrderStatusColor = (status: SalesOrderStatus): BadgeColor =>
  SALES_ORDER_STATUS_COLORS[status] ?? "default";
