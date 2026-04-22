/**
 * hardLogout — SYNCHRONOUS sign-out. No async, no await, no promises.
 * Clears local state then immediately navigates away.
 * The server cookie clear happens via a beacon (fire-and-forget).
 */
export function hardLogout(redirectTo: string = "/") {
  // 1. Flag to suppress UNAUTHED handler
  try { (window as any).__ventex_logging_out = true; } catch {}
  try { sessionStorage.setItem("__ventex_logging_out", "1"); } catch {}

  // 2. Clear localStorage
  try {
    localStorage.removeItem("ventex_operator");
    localStorage.removeItem("ventex_demo_session");
    localStorage.removeItem("ventex_session_start");
    localStorage.removeItem("manus-runtime-user-info");
  } catch {}

  // 3. Clear client cookies
  try {
    document.cookie.split(";").forEach(c => {
      const name = c.split("=")[0].trim();
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    });
  } catch {}

  // 4. Fire-and-forget server logout via sendBeacon (guaranteed to send even during navigation)
  try {
    const body = JSON.stringify({ "0": { "json": null } });
    navigator.sendBeacon("/api/trpc/auth.logout", new Blob([body], { type: "application/json" }));
  } catch {}

  // 5. IMMEDIATELY redirect — this is synchronous, nothing can stop it
  const dest = redirectTo + (redirectTo.includes("?") ? "&" : "?") + "logged_out=1";
  window.location.href = dest;
}
