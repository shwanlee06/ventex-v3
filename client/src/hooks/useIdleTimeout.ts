import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { isPublicRoute } from "@/lib/publicRoutes";
import { SESSION_IDLE_TIMEOUT_MS } from "@shared/const";
import { toast } from "sonner";

const ACTIVITY_EVENTS = ["mousedown", "keydown", "touchstart", "scroll", "mousemove"] as const;
const WARNING_BEFORE_MS = 2 * 60 * 1000; // Show warning 2 minutes before logout

/**
 * Auto-logs out users after 30 minutes of inactivity.
 * Shows a warning toast 2 minutes before the session expires.
 * Resets the timer on any user interaction.
 * Skipped on public routes (demo, login, legal, invite).
 */
export function useIdleTimeout() {
  const { isAuthenticated, logout } = useAuth();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasWarnedRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
      warningRef.current = null;
    }
    hasWarnedRef.current = false;
  }, []);

  const handleLogout = useCallback(async () => {
    clearTimers();
    // Clear local storage
    localStorage.removeItem("atlas_operator");
    localStorage.removeItem("atlas_demo_session");
    try {
      await logout();
    } catch {
      // Ignore errors during forced logout
    }
    // Redirect to login
    window.location.href = "/?expired=true";
  }, [logout, clearTimers]);

  const resetTimer = useCallback(() => {
    clearTimers();

    // Warning toast 2 minutes before expiry
    warningRef.current = setTimeout(() => {
      if (!hasWarnedRef.current) {
        hasWarnedRef.current = true;
        toast.warning("Session expiring soon", {
          description: "You'll be logged out in 2 minutes due to inactivity. Move your mouse or press a key to stay signed in.",
          duration: 10000,
        });
      }
    }, SESSION_IDLE_TIMEOUT_MS - WARNING_BEFORE_MS);

    // Actual logout
    timeoutRef.current = setTimeout(() => {
      handleLogout();
    }, SESSION_IDLE_TIMEOUT_MS);
  }, [clearTimers, handleLogout]);

  useEffect(() => {
    // Skip on public routes
    if (isPublicRoute()) return;
    if (!isAuthenticated) return;

    // Start the idle timer
    resetTimer();

    // Reset on any user activity
    const onActivity = () => {
      if (hasWarnedRef.current) {
        hasWarnedRef.current = false;
        toast.success("Session extended", { duration: 2000 });
      }
      resetTimer();
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
  }, [isAuthenticated, resetTimer, clearTimers]);
}
