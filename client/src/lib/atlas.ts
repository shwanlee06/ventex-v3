/**
 * ATLAS Team Detection — shared frontend helper
 * 
 * Determines if a user is part of the ATLAS internal team.
 * ATLAS team members see all clients and the full command center.
 * 
 * Rules:
 * - owner/admin are ATLAS team (full Command Center access)
 * - partner is external (like a client with elevated access, NOT ATLAS internal)
 * - manager/user are ATLAS team if they have no client org (orgId null or 1 = ATLAS)
 * - client/viewer are never ATLAS team
 */
export function isAtlasTeam(user?: {
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
 * Partner Detection — partners have elevated access but are NOT ATLAS internal.
 * Partners can see all clients they're assigned to, plus their own ventures.
 */
export function isPartner(user?: {
  role: string;
  organizationId?: number | null;
} | null): boolean {
  if (!user) return false;
  return user.role === "partner";
}
