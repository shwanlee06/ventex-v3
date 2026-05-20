/**
 * PreferencesSync — Syncs user display preferences from the server to ThemeContext on login.
 * This ensures that when a user logs in on a new device, their compact/autoRefresh settings
 * are applied immediately rather than relying solely on localStorage.
 */
import { useEffect, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";

export function PreferencesSync() {
  const { isAuthenticated } = useAuth();
  const { syncFromServer } = useTheme();
  const hasSynced = useRef(false);

  const { data: profile } = trpc.settings.getProfile.useQuery(undefined, {
    enabled: isAuthenticated && !hasSynced.current,
    staleTime: 60_000, // Don't refetch within 1 minute
  });

  useEffect(() => {
    if (profile?.preferences && !hasSynced.current) {
      syncFromServer({
        compactView: profile.preferences.compactView,
        autoRefresh: profile.preferences.autoRefresh,
      });
      hasSynced.current = true;
    }
  }, [profile, syncFromServer]);

  return null; // This is a side-effect-only component
}
