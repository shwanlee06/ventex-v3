import { useTheme } from "@/contexts/ThemeContext";

/**
 * Returns the refetchInterval value based on the user's auto-refresh preference.
 * When auto-refresh is disabled, returns `false` to stop polling.
 * When enabled, returns the provided interval (default 30000ms).
 */
export function useAutoRefresh(intervalMs: number = 30_000): number | false {
  const { autoRefresh } = useTheme();
  return autoRefresh ? intervalMs : false;
}
