// ============================================================================
// Dashboard Page — Role-based routing
// ATLAS team (owner/admin): Multi-client command center (all clients overview)
// Client users / Preview mode: Luxury UHNWI portal
// ============================================================================

import DashboardLayout from "@/components/DashboardLayout";
import LiveTicker from "@/components/LiveTicker";
import AtlasDashboard from "@/components/AtlasDashboard";
import ClientDashboard from "@/components/ClientDashboard";
import { useAuth } from "@/_core/hooks/useAuth";
import { usePreviewMode } from "@/contexts/PreviewMode";
import { useLocation } from "wouter";

export default function Home() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { isPreviewMode } = usePreviewMode();
  const isAtlas = (user?.role === "owner" || user?.role === "admin" || user?.role === "partner") && !isPreviewMode;

  return (
    <DashboardLayout
      title="Dashboard"
      subtitle={isAtlas ? "ATLAS COMMAND CENTER" : "Client Portal"}
    >
      {isAtlas && <LiveTicker />}
      {isAtlas ? (
        <AtlasDashboard onNavigate={navigate} />
      ) : (
        <ClientDashboard onNavigate={navigate} />
      )}
    </DashboardLayout>
  );
}
