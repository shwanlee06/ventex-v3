/**
 * hardLogout — nuclear sign-out that guarantees redirect to landing page.
 * Uses window.location.replace() to prevent back-button returning to dashboard.
 * All operations are synchronous — no awaiting, no React involvement.
 */
export function hardLogout(redirectTo: string = "/") {
  console.log("[HARD_LOGOUT] START — redirectTo:", redirectTo);

  // 1. Set flags to suppress UNAUTHED redirect handler in main.tsx
  try {
    (window as any).__ventex_logging_out = true;
    sessionStorage.setItem("__ventex_logging_out", "1");
    console.log("[HARD_LOGOUT] Flags set");
  } catch (e) {
    console.error("[HARD_LOGOUT] Flag error:", e);
  }

  // 2. Clear ALL localStorage auth state so RequireAuth doesn't bounce us back
  try {
    localStorage.removeItem("ventex_operator");
    localStorage.removeItem("ventex_demo_session");
    localStorage.removeItem("ventex_session_start");
    localStorage.removeItem("manus-runtime-user-info");
    console.log("[HARD_LOGOUT] localStorage cleared");
  } catch (e) {
    console.error("[HARD_LOGOUT] localStorage error:", e);
  }

  // 3. Clear the session cookie directly from the client side
  try {
    document.cookie = "session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "ventex_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    console.log("[HARD_LOGOUT] Cookies cleared");
  } catch (e) {
    console.error("[HARD_LOGOUT] Cookie error:", e);
  }

  // 4. Fire-and-forget the server logout (clear httpOnly cookie) — don't await
  try {
    fetch("/api/trpc/auth.logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({}),
    }).catch(() => {});
    console.log("[HARD_LOGOUT] Server logout fired");
  } catch (e) {
    console.error("[HARD_LOGOUT] Fetch error:", e);
  }

  // 5. Hard redirect NOW — use replace() so back button doesn't return to dashboard
  console.log("[HARD_LOGOUT] Redirecting NOW to:", redirectTo);
  window.location.replace(redirectTo);
}
