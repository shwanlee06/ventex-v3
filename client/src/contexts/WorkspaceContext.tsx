import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { trpc } from "@/lib/trpc";

interface Organization {
  id: number;
  name: string;
  slug: string;
  type: "core" | "partner" | "client";
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
  const { data: orgs, isLoading, refetch } = trpc.organizations.list.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const [activeOrg, setActiveOrgState] = useState<Organization | null>(null);

  // Persist active org slug in localStorage
  useEffect(() => {
    if (!orgs || orgs.length === 0) return;

    const savedSlug = localStorage.getItem("atlas_active_org");
    const saved = orgs.find((o: Organization) => o.slug === savedSlug);

    if (saved) {
      setActiveOrgState(saved);
    } else {
      // Default to first client org
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
