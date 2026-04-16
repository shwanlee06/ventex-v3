// DashboardLayout — Swiss Instrument design — Mobile-first responsive
// Mobile: full-width content + hamburger drawer nav
// Desktop: sidebar rail + topbar + scrollable content

import AppSidebar from "@/components/AppSidebar";
import Topbar from "@/components/Topbar";
import PageTransition from "@/components/PageTransition";
import { useSSEConnection } from "@/hooks/useSSE";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export default function DashboardLayout({ children, title, subtitle }: DashboardLayoutProps) {
  // Establish SSE connection for real-time updates
  const { connected } = useSSEConnection();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />

      {/* Main content area — flows naturally next to sidebar */}
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar title={title} subtitle={subtitle} />
        <main className="flex-1 overflow-y-auto overscroll-contain">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
