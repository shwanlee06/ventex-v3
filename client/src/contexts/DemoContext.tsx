// ============================================================================
// DemoContext — Provides demo mode state across the app
// When isDemo=true, all mutations show a toast instead of executing
// ============================================================================

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { toast } from "sonner";

interface DemoContextValue {
  isDemo: boolean;
  setIsDemo: (v: boolean) => void;
  /** Call before any mutation — returns true if blocked (demo mode) */
  guardMutation: (label?: string) => boolean;
}

const DemoContext = createContext<DemoContextValue>({
  isDemo: false,
  setIsDemo: () => {},
  guardMutation: () => false,
});

export function DemoProvider({ children, initialDemo = false }: { children: ReactNode; initialDemo?: boolean }) {
  const [isDemo, setIsDemo] = useState(initialDemo);

  const guardMutation = useCallback((label?: string) => {
    if (!isDemo) return false;
    toast.info(label || "This action is disabled in demo mode", {
      description: "Sign in with an invitation to access full functionality.",
      duration: 3000,
    });
    return true; // blocked
  }, [isDemo]);

  return (
    <DemoContext.Provider value={{ isDemo, setIsDemo, guardMutation }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  return useContext(DemoContext);
}
