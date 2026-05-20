import { Toaster } from "@/components/ui/sonner";
import CookieConsent from "@/components/CookieConsent";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect, useLocation } from "wouter";
import { useEffect } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { PreferencesSync } from "./components/PreferencesSync";
import { ThemeProvider } from "./contexts/ThemeContext";
import { PreviewModeProvider, usePreviewMode } from "./contexts/PreviewMode";
import { WorkspaceProvider, useWorkspace } from "./contexts/WorkspaceContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { isVentexTeam } from "@/lib/ventex";
import Home from "./pages/Home";
import Verticals from "./pages/Verticals";
import Onboard from "./pages/Onboard";
import SpvDeals from "./pages/Settings";
import Distributions from "./pages/Distributions";
import SpyOps from "./pages/SpyOps";
import Profile from "./pages/Profile";
import SettingsPage from "./pages/SettingsPage";
import VentureDetail from "./pages/VentureDetail";
import TasksPage from "./pages/TasksPage";
import TeamMemberDetail from "./pages/TeamMemberDetail";
import SpvDetail from "./pages/SpvDetail";
import InviteAccept from "./pages/InviteAccept";
import ClientDetail from "./pages/ClientDetail";
import AcceptInvite from "./pages/AcceptInvite";
import AgentsPage from "./pages/Agents";
import OnboardingWizard from "./pages/OnboardingWizard";
import ClientPortal from "./pages/ClientPortal";
import SignOut from "./pages/SignOut";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import TrustSecurity from "./pages/TrustSecurity";
import CsvImport from "./pages/CsvImport";
import Decisions from "./pages/Decisions";
import { AgentProvider } from "./contexts/AgentContext";
import { useHeartbeat } from "./hooks/useHeartbeat";
import { useIdleTimeout } from "./hooks/useIdleTimeout";
import { useNotificationBridge } from "./hooks/useNotificationBridge";

/* Auth guard - checks real OAuth session via useAuth hook.
   Falls back to localStorage for the SpyOps cinematic flow. */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const [, navigate] = useLocation();
  const { user, loading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (loading) return;
    const hasLocalSession = Boolean(localStorage.getItem("ventex_operator"));
    if (!isAuthenticated && !hasLocalSession) {
      navigate("/", { replace: true });
    }
    if (isAuthenticated && user && !localStorage.getItem("ventex_operator")) {
      localStorage.setItem("ventex_operator", user.name || "OPERATOR");
    }
  }, [loading, isAuthenticated, user, navigate]);

  if (loading) return null;

  const hasLocalSession = Boolean(localStorage.getItem("ventex_operator"));
  if (!isAuthenticated && !hasLocalSession) return null;

  return <>{children}</>;
}

/* VENTEX-only guard — redirects non-admin/owner users to dashboard.
   In preview mode, admin/owner users are treated as clients and get redirected too. */
function RequireVentex({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { isPreviewMode } = usePreviewMode();
  const [, navigate] = useLocation();

  const isVentex = isVentexTeam(user);
  const shouldBlock = !isVentex || isPreviewMode;

  useEffect(() => {
    if (loading) return;
    if (shouldBlock) {
      navigate("/dashboard", { replace: true });
    }
  }, [shouldBlock, loading, navigate]);

  if (loading) return null;
  if (shouldBlock) return null;

  return <>{children}</>;
}

/* Dashboard switcher — shows ClientPortal in preview mode, Home otherwise */
function DashboardSwitch() {
  const { isPreviewMode } = usePreviewMode();
  const { activeOrg } = useWorkspace();

  if (isPreviewMode && activeOrg?.slug) {
    return <ClientPortal orgSlug={activeOrg.slug} useDashboard />;
  }

  return <Home />;
}

function Router() {
  return (
    <Switch>
      {/* Login / landing */}
      <Route path="/" component={SpyOps} />

      {/* Client portal */}
      <Route path="/portal/:orgSlug">
        {(params: { orgSlug: string }) => <RequireAuth><ClientPortal orgSlug={params.orgSlug} /></RequireAuth>}
      </Route>
      <Route path="/portal">
        <Redirect to="/dashboard" />
      </Route>

      {/* Sign out */}
      <Route path="/sign-out" component={SignOut} />

      {/* Legal pages — public */}
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/terms" component={TermsOfService} />
      <Route path="/trust" component={TrustSecurity} />

      {/* Invite acceptance — public */}
      <Route path="/invite/:orgSlug/:token" component={InviteAccept} />
      <Route path="/accept-invite" component={AcceptInvite} />

      {/* ═══ Core pages — all authenticated users ═══ */}
      <Route path="/dashboard">
        <RequireAuth><DashboardSwitch /></RequireAuth>
      </Route>
      <Route path="/ventures/:slug">
        <RequireAuth><VentureDetail /></RequireAuth>
      </Route>
      <Route path="/ventures">
        <RequireAuth><Verticals /></RequireAuth>
      </Route>
      <Route path="/decisions">
        <RequireAuth><Decisions /></RequireAuth>
      </Route>
      <Route path="/distributions">
        <RequireAuth><Distributions /></RequireAuth>
      </Route>
      <Route path="/partner">
        <RequireAuth><Home /></RequireAuth>
      </Route>
      <Route path="/profile">
        <RequireAuth><Profile /></RequireAuth>
      </Route>

      {/* ═══ Admin pages — VENTEX team only ═══ */}
      <Route path="/clients/:slug">
        <RequireAuth><RequireVentex><ClientDetail /></RequireVentex></RequireAuth>
      </Route>
      <Route path="/spvs/:slug">
        <RequireAuth><SpvDetail /></RequireAuth>
      </Route>
      <Route path="/spvs">
        <RequireAuth><SpvDeals /></RequireAuth>
      </Route>
      <Route path="/tasks">
        <RequireAuth><TasksPage /></RequireAuth>
      </Route>
      <Route path="/team/:slug">
        <RequireAuth><RequireVentex><TeamMemberDetail /></RequireVentex></RequireAuth>
      </Route>
      <Route path="/team">
        <RequireAuth><RequireVentex><Onboard /></RequireVentex></RequireAuth>
      </Route>
      <Route path="/settings">
        <RequireAuth><RequireVentex><SettingsPage /></RequireVentex></RequireAuth>
      </Route>
      <Route path="/agents">
        <RequireAuth><RequireVentex><AgentsPage /></RequireVentex></RequireAuth>
      </Route>
      <Route path="/onboarding">
        <RequireAuth><RequireVentex><OnboardingWizard /></RequireVentex></RequireAuth>
      </Route>
      <Route path="/import">
        <RequireAuth><RequireVentex><CsvImport /></RequireVentex></RequireAuth>
      </Route>

      {/* 404 */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function HeartbeatProvider({ children }: { children: React.ReactNode }) {
  useHeartbeat();
  useIdleTimeout();
  useNotificationBridge();
  return <>{children}</>;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <PreviewModeProvider>
          <WorkspaceProvider>
            <AgentProvider>
            <TooltipProvider>
              <HeartbeatProvider>
                <PreferencesSync />
                <Toaster />
                <CookieConsent />
                <Router />
              </HeartbeatProvider>
            </TooltipProvider>
            </AgentProvider>
          </WorkspaceProvider>
        </PreviewModeProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
