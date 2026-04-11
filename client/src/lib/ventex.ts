/**
 * VENTEX Team Detection — shared frontend helper
 * 
 * Determines if a user is part of the VENTEX internal team.
 * VENTEX team members see all clients and the full command center.
 * 
 * Rules:
 * - owner/admin are VENTEX team (full Command Center access)
 * - partner is external (like a client with elevated access, NOT VENTEX internal)
 * - manager/user are VENTEX team if they have no client org (orgId null or 1 = VENTEX)
 * - client/viewer are never VENTEX team
 */
export function isVentexTeam(user?: {
  role: string;
  organizationId?: number | null;
} | null): boolean {
  if (!user) return false;
  if (user.role === "owner" || user.role === "admin") return true;
  if (user.role === "manager" || user.role === "user") {
    return !user.organizationId || user.organizationId === 1;
  }
  return false;
}

/**
 * Partner Detection — partners have elevated access but are NOT VENTEX internal.
 * Partners can see all clients they're assigned to, plus their own ventures.
 */
export function isPartner(user?: {
  role: string;
  organizationId?: number | null;
} | null): boolean {
  if (!user) return false;
  return user.role === "partner";
}
