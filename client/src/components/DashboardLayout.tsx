// ============================================================================
// DashboardLayout — Swiss Instrument design — Mobile-first responsive
// Mobile: full-width content + hamburger drawer nav
// Desktop: sidebar rail + topbar + scrollable content
// ============================================================================

import AppSidebar from "@/components/AppSidebar";
import Topbar from "@/components/Topbar";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export default function DashboardLayout({ children, title, subtitle }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />

      {/* Main content area — offset by sidebar width on desktop, full-width on mobile */}
      <div className="flex-1 flex flex-col md:ml-16">
        <Topbar title={title} subtitle={subtitle} />
        <main className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </main>
      </div>
    </div>
  );
}
