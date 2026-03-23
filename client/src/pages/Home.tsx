// ============================================================================
// Dashboard Page — Role-based routing
// ATLAS team (owner/admin): Dense analytics command center
// Client users / Preview mode: Luxury UHNWI portal
// ============================================================================

import DashboardLayout from "@/components/DashboardLayout";
import AtlasDashboard from "@/components/AtlasDashboard";
import ClientDashboard from "@/components/ClientDashboard";
import { useAuth } from "@/_core/hooks/useAuth";
import { usePreviewMode } from "@/contexts/PreviewMode";
import { useLocation } from "wouter";

export default function Home() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { isPreviewMode } = usePreviewMode();
  const isAtlas = (user?.role === "owner" || user?.role === "admin") && !isPreviewMode;
  const dashboardSubtitle = isAtlas ? "ROYALTON PORTFOLIO · MANAGED BY ATLAS" : "Client Portal";

  return (
    <DashboardLayout title="Dashboard" subtitle={dashboardSubtitle}>
      {isAtlas ? (
        <AtlasDashboard onNavigate={navigate} />
      ) : (
        <ClientDashboard onNavigate={navigate} />
      )}
    </DashboardLayout>
  );
}
