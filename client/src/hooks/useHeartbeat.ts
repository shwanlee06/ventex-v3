import { useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { isPublicRoute } from "@/lib/publicRoutes";

const HEARTBEAT_INTERVAL_MS = 30_000; // 30 seconds — real-time presence
const ACTIVITY_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes — go idle quickly
const ACTIVITY_EVENTS = ["mousedown", "keydown", "touchstart", "scroll", "mousemove", "pointerdown"] as const;
const THROTTLE_MS = 10_000; // Throttle activity tracking to 10s for responsiveness

/**
 * Sends a heartbeat to the server every 30 seconds while the user is:
 *   1. Authenticated
 *   2. The tab/window is visible (not hidden/minimized)
 *   3. The user has interacted with the page within the last 2 minutes
 *   4. NOT on a public route (demo, login, legal, invite)
 *
 * This ensures live status reflects genuine activity, not just an idle open tab.
 */
export function useHeartbeat() {
  const { isAuthenticated } = useAuth();
  const heartbeat = trpc.team.heartbeat.useMutation();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const lastThrottledRef = useRef<number>(0);

  // Track user activity — throttled to avoid excessive updates
  const onActivity = useCallback(() => {
    const now = Date.now();
    if (now - lastThrottledRef.current > THROTTLE_MS) {
      lastActivityRef.current = now;
      lastThrottledRef.current = now;
    }
  }, []);

  // Determine if user is genuinely active: tab visible + recent interaction
  const isUserActive = useCallback(() => {
    if (document.hidden) return false;
    const timeSinceActivity = Date.now() - lastActivityRef.current;
    return timeSinceActivity < ACTIVITY_TIMEOUT_MS;
  }, []);

  useEffect(() => {
    // Skip heartbeat entirely on public routes
    if (isPublicRoute()) return;

    if (!isAuthenticated) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Register activity listeners
    for (const event of ACTIVITY_EVENTS) {
      document.addEventListener(event, onActivity, { passive: true });
    }

    // Mark initial activity
    lastActivityRef.current = Date.now();
    lastThrottledRef.current = Date.now();

    // Send immediately on mount/login (user just opened the page = active)
    heartbeat.mutate();

    // Then every 2 minutes, but ONLY if user is genuinely active
    intervalRef.current = setInterval(() => {
      if (isUserActive()) {
        heartbeat.mutate();
      }
      // If not active, skip the heartbeat — lastSeenAt will go stale
    }, HEARTBEAT_INTERVAL_MS);

    // Also send heartbeat when tab becomes visible again (if user was recently active)
    const onVisibilityChange = () => {
      if (!document.hidden) {
        // Tab just became visible — mark activity and send heartbeat
        lastActivityRef.current = Date.now();
        lastThrottledRef.current = Date.now();
        heartbeat.mutate();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      for (const event of ACTIVITY_EVENTS) {
        document.removeEventListener(event, onActivity);
      }
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps
}
