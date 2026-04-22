/**
 * hardLogout — nuclear sign-out that guarantees redirect to landing page.
 *
 * The problem: multiple async operations (tRPC mutation, query invalidation,
 * React Query error handlers, RequireAuth guards) all race during logout.
 * Any one of them can redirect to OAuth login or keep the user on /dashboard
 * before window.location.href = "/" fires.
 *
 * The solution: clear ALL auth state synchronously, set the logging-out flag,
 * fire the redirect IMMEDIATELY, then fire-and-forget the server logout.
 * The page is already navigating away — we don't care about the response.
 */
export function hardLogout(redirectTo: string = "/") {
  // 1. Set flags to suppress UNAUTHED redirect handler in main.tsx
  (window as any).__ventex_logging_out = true;
  sessionStorage.setItem("__ventex_logging_out", "1");

  // 2. Clear ALL localStorage auth state so RequireAuth doesn't bounce us back
  localStorage.removeItem("ventex_operator");
  localStorage.removeItem("ventex_demo_session");
  localStorage.removeItem("ventex_session_start");
  localStorage.removeItem("manus-runtime-user-info");

  // 3. Fire-and-forget the server logout (clear cookie) — don't await
  fetch("/api/trpc/auth.logout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({}),
  }).catch(() => {
    // Ignore — we're leaving the page anyway
  });

  // 4. Hard redirect NOW — before any React re-render or error handler can fire
  window.location.href = redirectTo;
}
