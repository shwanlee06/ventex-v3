// Dashboard Page — Role-based routing
// VENTEX team: Multi-client command center (all clients overview)
// Client users / Preview mode: Luxury UHNWI portal

import DashboardLayout from "@/components/DashboardLayout";
import LiveTicker from "@/components/LiveTicker";
import VentexDashboard from "@/components/VentexDashboard";
import ClientDashboard from "@/components/ClientDashboard";
import { useAuth } from "@/_core/hooks/useAuth";
import { usePreviewMode } from "@/contexts/PreviewMode";
import { useLocation } from "wouter";
import { isVentexTeam, isPartner } from "@/lib/ventex";
import PartnerDashboard from "@/components/PartnerDashboard";

export default function Home() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { isPreviewMode } = usePreviewMode();
  const isVentex = isVentexTeam(user) && !isPreviewMode;
  const isPartnerUser = isPartner(user) && !isPreviewMode;

  const subtitle = isVentex ? "VENTEX COMMAND CENTER" : isPartnerUser ? "Partner Portal" : "Client Portal";

  return (
    <DashboardLayout
      title="Dashboard"
      subtitle={subtitle}
    >
      {isVentex && <LiveTicker />}
      {isVentex ? (
        <VentexDashboard onNavigate={navigate} />
      ) : isPartnerUser ? (
        <PartnerDashboard onNavigate={navigate} />
      ) : (
        <ClientDashboard onNavigate={navigate} />
      )}
    </DashboardLayout>
  );
}
