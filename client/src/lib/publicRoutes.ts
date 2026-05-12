/**
 * Public routes that should NOT trigger auth queries or heartbeats.
 * Any page that an unauthenticated user can visit.
 */
const PUBLIC_PATHS = ["/privacy", "/terms", "/invite", "/accept-invite", "/sign-out"];

/**
 * Returns true if the current window.location.pathname is a public route.
 * The root "/" (login page) is always public.
 */
export function isPublicRoute(): boolean {
  if (typeof window === "undefined") return false;
  const path = window.location.pathname;
  if (path === "/") return true;
  return PUBLIC_PATHS.some(p => path === p || path.startsWith(p + "/"));
}
