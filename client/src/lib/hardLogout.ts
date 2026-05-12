/**
 * hardLogout — Reliable sign-out that navigates to the /sign-out page.
 * 
 * The /sign-out page handles the actual server-side cookie clear with a proper
 * awaited fetch call. This function just clears local state and redirects there.
 * 
 * Why navigate to /sign-out instead of doing it inline?
 * Because Radix dropdowns and other UI components can swallow events.
 * A window.location.href change is guaranteed to execute.
 */
export function hardLogout(redirectTo: string = "/") {
  // 1. Flag to suppress UNAUTHED handler during transition
  try { (window as any).__ventex_logging_out = true; } catch {}
  try { sessionStorage.setItem("__ventex_logging_out", "1"); } catch {}

  // 2. Clear localStorage immediately
  try {
    localStorage.removeItem("ventex_operator");
    localStorage.removeItem("ventex_demo_session");
    localStorage.removeItem("ventex_session_start");
    localStorage.removeItem("manus-runtime-user-info");
  } catch {}

  // 3. Navigate to the sign-out page which handles server-side cookie clear
  window.location.href = "/sign-out";
}
