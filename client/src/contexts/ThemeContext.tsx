import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme?: () => void;
  switchable: boolean;
  compact: boolean;
  setCompact: (v: boolean) => void;
  autoRefresh: boolean;
  setAutoRefresh: (v: boolean) => void;
  /** Call after fetching user preferences from server to sync local state */
  syncFromServer: (prefs: { theme?: string; compactView?: boolean; autoRefresh?: boolean }) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  switchable?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme = "light",
  switchable = false,
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (switchable) {
      const stored = localStorage.getItem("ventex_theme");
      return (stored as Theme) || defaultTheme;
    }
    return defaultTheme;
  });

  const [compact, setCompactState] = useState<boolean>(() => {
    return localStorage.getItem("ventex_compact") === "true";
  });

  const [autoRefresh, setAutoRefreshState] = useState<boolean>(() => {
    const stored = localStorage.getItem("ventex_autorefresh");
    return stored === null ? true : stored === "true";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    if (switchable) {
      localStorage.setItem("ventex_theme", theme);
    }
  }, [theme, switchable]);

  useEffect(() => {
    const root = document.documentElement;
    if (compact) {
      root.classList.add("compact");
    } else {
      root.classList.remove("compact");
    }
    localStorage.setItem("ventex_compact", String(compact));
  }, [compact]);

  useEffect(() => {
    localStorage.setItem("ventex_autorefresh", String(autoRefresh));
  }, [autoRefresh]);

  const toggleTheme = switchable
    ? () => {
        setTheme(prev => (prev === "light" ? "dark" : "light"));
      }
    : undefined;

  const setCompact = (v: boolean) => setCompactState(v);
  const setAutoRefresh = (v: boolean) => setAutoRefreshState(v);

  const syncFromServer = useCallback((prefs: { theme?: string; compactView?: boolean; autoRefresh?: boolean }) => {
    if (prefs.theme === "light" || prefs.theme === "dark") {
      setTheme(prefs.theme);
    }
    if (typeof prefs.compactView === "boolean") {
      setCompactState(prefs.compactView);
    }
    if (typeof prefs.autoRefresh === "boolean") {
      setAutoRefreshState(prefs.autoRefresh);
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, switchable, compact, setCompact, autoRefresh, setAutoRefresh, syncFromServer }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
