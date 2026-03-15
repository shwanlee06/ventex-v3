// ============================================================================
// DashboardLayout — Swiss Instrument design
// Wraps sidebar + topbar + scrollable content area
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

      {/* Main content area — offset by sidebar width */}
      <div className="flex-1 flex flex-col md:ml-16 pb-14 md:pb-0">
        <Topbar title={title} subtitle={subtitle} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
