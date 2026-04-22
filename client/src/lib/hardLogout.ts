/**
 * hardLogout — nuclear sign-out that guarantees redirect to landing page.
 *
 * Root cause: SpyOps (the landing page at /) auto-redirects authenticated
 * users back to /dashboard. The httpOnly session cookie MUST be cleared
 * on the server BEFORE we redirect, otherwise the user bounces right back.
 *
 * Belt-and-suspenders: we also pass ?logged_out=1 so SpyOps can skip
 * auto-redirect even if the cookie clear races.
 */
export async function hardLogout(redirectTo: string = "/") {
  // 1. Set flags to suppress UNAUTHED redirect handler in main.tsx
  (window as any).__ventex_logging_out = true;
  try { sessionStorage.setItem("__ventex_logging_out", "1"); } catch {}

  // 2. Clear ALL localStorage auth state
  try {
    localStorage.removeItem("ventex_operator");
    localStorage.removeItem("ventex_demo_session");
    localStorage.removeItem("ventex_session_start");
    localStorage.removeItem("manus-runtime-user-info");
  } catch {}

  // 3. Clear client-accessible cookies
  try {
    document.cookie.split(";").forEach(c => {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
  } catch {}

  // 4. AWAIT the server logout to clear the httpOnly session cookie.
  //    Use the correct tRPC v11 httpBatchLink mutation format.
  try {
    await fetch("/api/trpc/auth.logout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ "0": { "json": null } }),
    });
  } catch {
    // If server logout fails, the ?logged_out=1 param will still prevent bounce-back
  }

  // 5. Redirect with ?logged_out=1 so SpyOps skips auto-redirect
  const separator = redirectTo.includes("?") ? "&" : "?";
  window.location.replace(redirectTo + separator + "logged_out=1");
}
