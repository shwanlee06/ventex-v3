// ============================================================================
// Dashboard Page — Role-based routing
// ATLAS team: Multi-client command center (all clients overview)
// Client users / Preview mode: Luxury UHNWI portal
// ============================================================================

import DashboardLayout from "@/components/DashboardLayout";
import LiveTicker from "@/components/LiveTicker";
import AtlasDashboard from "@/components/AtlasDashboard";
import ClientDashboard from "@/components/ClientDashboard";
import { useAuth } from "@/_core/hooks/useAuth";
import { usePreviewMode } from "@/contexts/PreviewMode";
import { useLocation } from "wouter";
import { isAtlasTeam, isPartner } from "@/lib/atlas";
import PartnerDashboard from "@/components/PartnerDashboard";

export default function Home() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { isPreviewMode } = usePreviewMode();
  const isAtlas = isAtlasTeam(user) && !isPreviewMode;
  const isPartnerUser = isPartner(user) && !isPreviewMode;

  const subtitle = isAtlas ? "ATLAS COMMAND CENTER" : isPartnerUser ? "Partner Portal" : "Client Portal";

  return (
    <DashboardLayout
      title="Dashboard"
      subtitle={subtitle}
    >
      {isAtlas && <LiveTicker />}
      {isAtlas ? (
        <AtlasDashboard onNavigate={navigate} />
      ) : isPartnerUser ? (
        <PartnerDashboard onNavigate={navigate} />
      ) : (
        <ClientDashboard onNavigate={navigate} />
      )}
    </DashboardLayout>
  );
}
