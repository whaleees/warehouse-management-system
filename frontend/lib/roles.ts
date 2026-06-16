"use client";

import { useEffect, useState } from "react";
import { getUser } from "./auth";

export type Role = "ADMIN" | "MANAGER" | "STAFF" | "VIEWER";

/**
 * Mirrors the backend role hierarchy (see backend `roles.hierarchy.ts`).
 *
 * Two domains:
 *   - System administration  -> ADMIN  (users + master/config data)
 *   - Business operations     -> MANAGER > STAFF > VIEWER
 *
 * ADMIN is intentionally NOT a business superset: it can view everything and
 * run the system, but cannot approve/cancel orders, ship, receive, or adjust
 * stock. Keep this table in sync with the backend.
 */
const GRANTS: Record<Role, Role[]> = {
  VIEWER: ["VIEWER"],
  STAFF: ["STAFF", "VIEWER"],
  MANAGER: ["MANAGER", "STAFF", "VIEWER"],
  ADMIN: ["ADMIN", "VIEWER"],
};

export type Capability =
  /** Create/edit/delete master & config data: products, suppliers, customers,
   *  sections, locations, users. (ADMIN) */
  | "manage:masterData"
  /** All operational business decisions: create/approve/cancel PO & SO,
   *  shipments, inventory adjustments, batches, manual movements. (MANAGER) */
  | "manage:business"
  /** Receiving execution: start inbound, add goods-receipt lines. (STAFF+) */
  | "receive:goods"
  /** Read-only access. (any authenticated role) */
  | "view";

function grantsFor(role?: Role | null): Role[] {
  if (!role) return [];
  return GRANTS[role] ?? [];
}

/** True if `role` (via its grants) may perform `cap`. */
export function can(role: Role | null | undefined, cap: Capability): boolean {
  const g = grantsFor(role);
  switch (cap) {
    case "view":
      return g.length > 0;
    case "receive:goods":
      return g.includes("STAFF");
    case "manage:business":
      return g.includes("MANAGER");
    case "manage:masterData":
      return g.includes("ADMIN");
    default:
      return false;
  }
}

/**
 * Client hook exposing the current user's role and a `can()` checker.
 * `role` is null until mounted (the JWT is read from localStorage), so gated
 * actions render only after hydration — avoids server/client mismatch.
 */
export function useRole() {
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    const user = getUser<{ role?: Role }>();
    setRole(user?.role ?? null);
  }, []);

  return {
    role,
    can: (cap: Capability) => can(role, cap),
  };
}
