import { useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

const HEARTBEAT_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Sends a heartbeat to the server every 2 minutes while the user is authenticated.
 * This updates lastSeenAt on the team member record for live status tracking.
 * Should be called once at the app root level.
 */
export function useHeartbeat() {
  const { isAuthenticated } = useAuth();
  const heartbeat = trpc.team.heartbeat.useMutation();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Send immediately on mount/login
    heartbeat.mutate();

    // Then every 2 minutes
    intervalRef.current = setInterval(() => {
      heartbeat.mutate();
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps
}
