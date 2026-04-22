import { useEffect } from "react";

/**
 * /sign-out page — the ONLY reliable way to sign out.
 *
 * This page:
 * 1. Clears all client-side auth state
 * 2. Calls the server to clear the httpOnly session cookie
 * 3. Redirects to the landing page with ?logged_out=1
 *
 * Why a dedicated page? Because Radix UI dropdown menu items
 * swallow click events in certain scenarios. A plain <a href="/sign-out">
 * link ALWAYS works — no React, no event handlers, no race conditions.
 */
export default function SignOut() {
  useEffect(() => {
    // 1. Suppress the UNAUTHED redirect handler
    try { (window as any).__ventex_logging_out = true; } catch {}
    try { sessionStorage.setItem("__ventex_logging_out", "1"); } catch {}

    // 2. Clear all localStorage auth state
    try {
      localStorage.removeItem("ventex_operator");
      localStorage.removeItem("ventex_demo_session");
      localStorage.removeItem("ventex_session_start");
      localStorage.removeItem("manus-runtime-user-info");
    } catch {}

    // 3. Clear client-accessible cookies
    try {
      document.cookie.split(";").forEach(c => {
        const name = c.split("=")[0].trim();
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
      });
    } catch {}

    // 4. Call server to clear httpOnly session cookie, then redirect
    fetch("/api/trpc/auth.logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ "0": { "json": null } }),
    })
      .catch(() => {}) // ignore errors
      .finally(() => {
        window.location.replace("/?logged_out=1");
      });
  }, []);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="text-xs font-mono tracking-[0.2em] text-muted-foreground uppercase">
          Signing out...
        </div>
        <div className="w-32 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent mx-auto animate-pulse" />
      </div>
    </div>
  );
}
