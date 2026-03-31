/**
 * ATLAS Team Detection — shared frontend helper
 * 
 * Determines if a user is part of the ATLAS internal team.
 * ATLAS team members see all clients and the full command center.
 * 
 * Rules:
 * - owner/admin/partner are always ATLAS team
 * - manager/user are ATLAS team if they have no client org (orgId null or 1 = ATLAS)
 * - client/viewer are never ATLAS team
 */
export function isAtlasTeam(user?: {
  role: string;
  organizationId?: number | null;
} | null): boolean {
  if (!user) return false;
  // owner/admin/partner are always ATLAS team regardless of org
  if (user.role === "owner" || user.role === "admin" || user.role === "partner") return true;
  // manager/user are ATLAS team if they have no client org (orgId null or 1 = ATLAS)
  if (user.role === "manager" || user.role === "user") {
    return !user.organizationId || user.organizationId === 1;
  }
  return false;
}
