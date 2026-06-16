import { UserRole } from '@prisma/client';

/**
 * Effective role inheritance for authorization.
 *
 * Roles are NOT a single linear hierarchy. There are two distinct domains:
 *
 *   - System administration  ->  ADMIN
 *       Owns users and master/configuration data (products, suppliers,
 *       customers, warehouse sections & locations). Does NOT make operational
 *       business decisions.
 *
 *   - Business operations     ->  MANAGER > STAFF > VIEWER
 *       MANAGER has full control of operations (creating/approving/cancelling
 *       orders, shipping, receiving, stock adjustments) and inherits everything
 *       STAFF and VIEWER can do. STAFF handles execution work (receiving) and
 *       inherits VIEWER. VIEWER is read-only.
 *
 * ADMIN is deliberately NOT a superset of MANAGER — a system administrator does
 * not approve or cancel orders. Both ADMIN and MANAGER can VIEW everything via
 * the shared VIEWER grant.
 *
 * To authorize an endpoint, annotate it with the *minimum* role required
 * (e.g. `@Roles(UserRole.MANAGER)`); any role whose grants include that role
 * passes.
 */
export const ROLE_GRANTS: Record<UserRole, UserRole[]> = {
  [UserRole.VIEWER]: [UserRole.VIEWER],
  [UserRole.STAFF]: [UserRole.STAFF, UserRole.VIEWER],
  [UserRole.MANAGER]: [UserRole.MANAGER, UserRole.STAFF, UserRole.VIEWER],
  [UserRole.ADMIN]: [UserRole.ADMIN, UserRole.VIEWER],
};

/**
 * True if `role` (via its grants) satisfies at least one of the `required`
 * roles for an endpoint.
 */
export function roleSatisfies(
  role: UserRole | undefined,
  required: UserRole[],
): boolean {
  if (!role) return false;
  const granted = ROLE_GRANTS[role] ?? [role];
  return required.some((r) => granted.includes(r));
}
