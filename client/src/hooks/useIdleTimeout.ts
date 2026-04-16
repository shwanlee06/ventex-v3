import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { isPublicRoute } from "@/lib/publicRoutes";
import { SESSION_IDLE_TIMEOUT_MS, SESSION_ABSOLUTE_TIMEOUT_MS } from "@shared/const";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const ACTIVITY_EVENTS = ["mousedown", "keydown", "touchstart", "scroll", "mousemove"] as const;
const WARNING_BEFORE_MS = 2 * 60 * 1000; // Show warning 2 minutes before logout
const SESSION_START_KEY = "ventex_session_start";

/**
 * Auto-logs out users after idle timeout OR absolute timeout.
 * Idle timeout: configurable per org (default 30 min, max 30 min).
 * Absolute timeout: configurable per org (default 8 hr, max 8 hr).
 * Shows a warning toast 2 minutes before the session expires.
 * Resets idle timer on any user interaction.
 * Skipped on public routes (demo, login, legal, invite).
 */
export function useIdleTimeout() {
  const { isAuthenticated, logout } = useAuth();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const absoluteRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasWarnedRef = useRef(false);

  // Fetch org-level session config (falls back to defaults if unavailable)
  const { data: sessionConfig } = trpc.security.getSessionConfig.useQuery(undefined, {
    enabled: isAuthenticated && !isPublicRoute(),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: false,
  });

  const idleTimeoutMs = sessionConfig
    ? sessionConfig.idleTimeoutMinutes * 60 * 1000
    : SESSION_IDLE_TIMEOUT_MS;

  const absoluteTimeoutMs = sessionConfig
    ? sessionConfig.absoluteTimeoutHours * 60 * 60 * 1000
    : SESSION_ABSOLUTE_TIMEOUT_MS;

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
      warningRef.current = null;
    }
    if (absoluteRef.current) {
      clearTimeout(absoluteRef.current);
      absoluteRef.current = null;
    }
    hasWarnedRef.current = false;
  }, []);

  const handleLogout = useCallback(async (reason: "idle" | "absolute" = "idle") => {
    clearTimers();
    localStorage.removeItem("ventex_operator");
    localStorage.removeItem("ventex_demo_session");
    localStorage.removeItem(SESSION_START_KEY);
    try {
      await logout();
    } catch {
      // Ignore errors during forced logout
    }
    const param = reason === "absolute" ? "session_expired" : "expired";
    window.location.href = `/?${param}=true`;
  }, [logout, clearTimers]);

  const resetIdleTimer = useCallback(() => {
    // Clear idle timers only (not absolute)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
      warningRef.current = null;
    }
    hasWarnedRef.current = false;

    // Warning toast 2 minutes before idle expiry
    warningRef.current = setTimeout(() => {
      if (!hasWarnedRef.current) {
        hasWarnedRef.current = true;
        toast.warning("Session expiring soon", {
          description: "You'll be logged out in 2 minutes due to inactivity. Move your mouse or press a key to stay signed in.",
          duration: 10000,
        });
      }
    }, idleTimeoutMs - WARNING_BEFORE_MS);

    // Actual idle logout
    timeoutRef.current = setTimeout(() => {
      handleLogout("idle");
    }, idleTimeoutMs);
  }, [idleTimeoutMs, handleLogout]);

  useEffect(() => {
    if (isPublicRoute()) return;
    if (!isAuthenticated) return;

    // Track session start for absolute timeout
    if (!localStorage.getItem(SESSION_START_KEY)) {
      localStorage.setItem(SESSION_START_KEY, Date.now().toString());
    }

    // Start idle timer
    resetIdleTimer();

    // Start absolute timeout
    const sessionStart = parseInt(localStorage.getItem(SESSION_START_KEY) || Date.now().toString(), 10);
    const elapsed = Date.now() - sessionStart;
    const remaining = absoluteTimeoutMs - elapsed;

    if (remaining <= 0) {
      // Session already expired
      handleLogout("absolute");
      return;
    }

    absoluteRef.current = setTimeout(() => {
      toast.error("Session expired", {
        description: "Your session has reached the maximum duration. Please log in again.",
        duration: 5000,
      });
      handleLogout("absolute");
    }, remaining);

    // Reset idle timer on any user activity
    const onActivity = () => {
      if (hasWarnedRef.current) {
        hasWarnedRef.current = false;
        toast.success("Session extended", { duration: 2000 });
      }
      resetIdleTimer();
    };

    for (const event of ACTIVITY_EVENTS) {
      document.addEventListener(event, onActivity, { passive: true });
    }

    return () => {
      clearTimers();
      for (const event of ACTIVITY_EVENTS) {
        document.removeEventListener(event, onActivity);
      }
    };
  }, [isAuthenticated, resetIdleTimer, clearTimers, absoluteTimeoutMs, handleLogout]);
}
