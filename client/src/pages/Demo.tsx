// ============================================================================
// Demo Page — Investor read-only access to the ATLAS dashboard
// No login required. Shows the full admin dashboard with demo banner.
// Mutations are blocked via DemoContext.
// ============================================================================

import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import AtlasDashboard from "@/components/AtlasDashboard";
import DemoBanner from "@/components/DemoBanner";
import { useDemo } from "@/contexts/DemoContext";
import { toast } from "sonner";

export default function Demo() {
  const { setIsDemo } = useDemo();
  const [, navigate] = useLocation();
  const [ready, setReady] = useState(false);

  // Enable demo mode on mount, disable on unmount
  useEffect(() => {
    setIsDemo(true);
    // Set a fake operator so RequireAuth doesn't block
    if (!localStorage.getItem("atlas_operator")) {
      localStorage.setItem("atlas_operator", "DEMO_INVESTOR");
      localStorage.setItem("atlas_demo_session", "true");
    }
    setReady(true);

    return () => {
      setIsDemo(false);
      // Clean up demo session if it was set by us
      if (localStorage.getItem("atlas_demo_session") === "true") {
        localStorage.removeItem("atlas_operator");
        localStorage.removeItem("atlas_demo_session");
      }
    };
  }, [setIsDemo]);

  const handleNavigate = (path: string) => {
    // In demo mode, keep navigation within the demo context
    toast.info("Navigation is limited in demo mode", {
      description: "Request access to explore the full platform.",
      duration: 2000,
    });
  };

  if (!ready) return null;

  return (
    <>
      <DemoBanner />
      <div className="pt-10"> {/* offset for the demo banner */}
        <DashboardLayout
          title="Dashboard"
          subtitle="ATLAS VELOCITY AI — INVESTOR DEMO"
        >
          <div className="p-4 md:p-6">
            <AtlasDashboard onNavigate={handleNavigate} />
          </div>
        </DashboardLayout>
      </div>
    </>
  );
}
