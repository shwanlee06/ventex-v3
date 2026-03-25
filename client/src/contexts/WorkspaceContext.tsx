import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { trpc } from "@/lib/trpc";

interface Organization {
  id: number;
  name: string;
  slug: string;
  type: "core" | "partner" | "client";
  status: "active" | "suspended" | "archived";
  description: string | null;
  ventureCount: number;
}

interface WorkspaceContextValue {
  organizations: Organization[];
  activeOrg: Organization | null;
  activeOrgId: number | undefined;
  setActiveOrg: (org: Organization) => void;
  refetchOrgs: () => void;
  isLoading: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextValue>({
  organizations: [],
  activeOrg: null,
  activeOrgId: undefined,
  setActiveOrg: () => {},
  refetchOrgs: () => {},
  isLoading: true,
});

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  // NOTE: Do NOT set refetchOnWindowFocus: false — we need invalidation from
  // the dashboard (utils.organizations.list.invalidate()) to trigger a refetch
  // so the sidebar client list updates after archive/delete.
  const { data: orgs, isLoading, refetch } = trpc.organizations.list.useQuery(undefined, {
    retry: false,
  });

  const [activeOrg, setActiveOrgState] = useState<Organization | null>(null);

  // Persist active org slug in localStorage
  // Re-runs whenever orgs data changes (including after invalidation)
  useEffect(() => {
    if (!orgs) return;

    if (orgs.length === 0) {
      // All orgs removed/archived — clear active
      setActiveOrgState(null);
      return;
    }

    const savedSlug = localStorage.getItem("atlas_active_org");
    const saved = orgs.find((o: Organization) => o.slug === savedSlug);

    if (saved) {
      // Update reference with fresh data (e.g., updated ventureCount)
      setActiveOrgState(saved);
    } else {
      // Saved org was archived/deleted — default to first available
      setActiveOrgState(orgs[0]);
      localStorage.setItem("atlas_active_org", orgs[0].slug);
    }
  }, [orgs]);

  const setActiveOrg = (org: Organization) => {
    setActiveOrgState(org);
    localStorage.setItem("atlas_active_org", org.slug);
  };

  const refetchOrgs = () => {
    refetch();
  };

  return (
    <WorkspaceContext.Provider
      value={{
        organizations: (orgs as Organization[]) || [],
        activeOrg,
        activeOrgId: activeOrg?.id,
        setActiveOrg,
        refetchOrgs,
        isLoading,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  return useContext(WorkspaceContext);
}
