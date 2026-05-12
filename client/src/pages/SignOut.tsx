import { useEffect, useRef } from "react";

/**
 * /sign-out page — the ONLY reliable way to sign out.
 *
 * Strategy: Clear all client-side state, then navigate directly to
 * GET /api/logout which clears the httpOnly cookie and redirects to /.
 *
 * Why direct navigation instead of fetch()?
 * Because fetch() with credentials:"include" can fail to apply Set-Cookie
 * headers in certain proxy/cross-origin scenarios. A direct navigation
 * (window.location.href) is ALWAYS same-origin and the browser ALWAYS
 * applies Set-Cookie headers from navigation responses.
 */
export default function SignOut() {
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    // 1. Suppress the UNAUTHED redirect handler during transition
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
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" + window.location.hostname;
      });
    } catch {}

    // 4. Navigate directly to /api/logout — this is a GET request that:
    //    a) Clears the httpOnly session cookie via Set-Cookie header
    //    b) Redirects to /?logged_out=1
    //    Direct navigation guarantees the browser applies the Set-Cookie header.
    window.location.href = "/api/logout";
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
