import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect, useLocation } from "wouter";
import { useEffect, useState } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { PreviewModeProvider, usePreviewMode } from "./contexts/PreviewMode";
import { WorkspaceProvider } from "./contexts/WorkspaceContext";
import { useAuth } from "@/_core/hooks/useAuth";
import CustomCursor from "./components/CustomCursor";
import { isVentexTeam } from "@/lib/ventex";
import Home from "./pages/Home";
import Agent from "./pages/Agent";
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
import ActivityLog from "./pages/ActivityLog";
import SecurityPage from "./pages/SecurityPage";
import AccessManagement from "./pages/AccessManagement";
import InviteAccept from "./pages/InviteAccept";
import ClientDetail from "./pages/ClientDetail";
import VentexTeam from "./pages/VentexTeam";
import AcceptInvite from "./pages/AcceptInvite";
import AgentsPage from "./pages/Agents";
import OnboardingWizard from "./pages/OnboardingWizard";
import BlueprintsPage from "./pages/Blueprints";
import ClientPortal from "./pages/ClientPortal";
import OversightPage from "./pages/Oversight";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import { AgentProvider } from "./contexts/AgentContext";
import { useHeartbeat } from "./hooks/useHeartbeat";
import { useIdleTimeout } from "./hooks/useIdleTimeout";
import { DemoProvider } from "./contexts/DemoContext";
import Demo from "./pages/Demo";
import DemoDashboard from "./pages/DemoDashboard";

/* Auth guard - checks real OAuth session via useAuth hook.
   Falls back to localStorage for the SpyOps cinematic flow. */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const [, navigate] = useLocation();
  const { user, loading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (loading) return;
    // Check real session first, then localStorage fallback
    const hasLocalSession = Boolean(localStorage.getItem("ventex_operator"));
    if (!isAuthenticated && !hasLocalSession) {
      navigate("/", { replace: true });
    }
    // If authenticated via OAuth but localStorage not set yet, set it
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

function Router() {
  return (
    <Switch>
      {/* Login / landing page is the root */}
      <Route path="/" component={SpyOps} />

      {/* Client portal — standalone client-facing view */}
      <Route path="/portal/:orgSlug" component={ClientPortal} />
      <Route path="/portal">
        <Redirect to="/dashboard" />
      </Route>

      {/* Investor demo — public, no auth, read-only */}
      <Route path="/demo/dashboard" component={DemoDashboard} />
      <Route path="/demo" component={Demo} />

      {/* Legal pages — public, no auth */}
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/terms" component={TermsOfService} />

      {/* Partner invite acceptance — public, no auth */}
      <Route path="/invite/:orgSlug/:token" component={InviteAccept} />

      {/* Team member invite acceptance — public, no auth */}
      <Route path="/accept-invite" component={AcceptInvite} />

      {/* Protected dashboard pages — available to all authenticated users */}
      <Route path="/dashboard">
        <RequireAuth><Home /></RequireAuth>
      </Route>
      <Route path="/clients/:slug">
        <RequireAuth><RequireVentex><ClientDetail /></RequireVentex></RequireAuth>
      </Route>
      <Route path="/ventures/:slug">
        <RequireAuth><VentureDetail /></RequireAuth>
      </Route>
      <Route path="/ventures">
        <RequireAuth><Verticals /></RequireAuth>
      </Route>
      <Route path="/tasks">
        <RequireAuth><TasksPage /></RequireAuth>
      </Route>
      <Route path="/spvs/:slug">
        <RequireAuth><SpvDetail /></RequireAuth>
      </Route>
      <Route path="/spvs">
        <RequireAuth><SpvDeals /></RequireAuth>
      </Route>
      <Route path="/distributions">
        <RequireAuth><Distributions /></RequireAuth>
      </Route>
      <Route path="/activity">
        <RequireAuth><ActivityLog /></RequireAuth>
      </Route>
      <Route path="/partner">
        <RequireAuth><Home /></RequireAuth>
      </Route>
      <Route path="/profile">
        <RequireAuth><Profile /></RequireAuth>
      </Route>

      {/* VENTEX team only pages — admin/owner access required (blocked in preview mode) */}
      <Route path="/agent">
        <RequireAuth><RequireVentex><Agent /></RequireVentex></RequireAuth>
      </Route>
      <Route path="/team/:slug">
        <RequireAuth><RequireVentex><TeamMemberDetail /></RequireVentex></RequireAuth>
      </Route>
      <Route path="/team">
        <RequireAuth><RequireVentex><Onboard /></RequireVentex></RequireAuth>
      </Route>
      <Route path="/ventex-team/:slug">
        <RequireAuth><RequireVentex><TeamMemberDetail /></RequireVentex></RequireAuth>
      </Route>
      <Route path="/ventex-team">
        <RequireAuth><RequireVentex><VentexTeam /></RequireVentex></RequireAuth>
      </Route>
      <Route path="/security">
        <RequireAuth><RequireVentex><SecurityPage /></RequireVentex></RequireAuth>
      </Route>
      <Route path="/access">
        <RequireAuth><RequireVentex><AccessManagement /></RequireVentex></RequireAuth>
      </Route>
      <Route path="/settings">
        <RequireAuth><RequireVentex><SettingsPage /></RequireVentex></RequireAuth>
      </Route>
      <Route path="/agents">
        <RequireAuth><RequireVentex><AgentsPage /></RequireVentex></RequireAuth>
      </Route>
      {/* Draft Center moved to client portal */}
      <Route path="/onboarding">
        <RequireAuth><RequireVentex><OnboardingWizard /></RequireVentex></RequireAuth>
      </Route>
      <Route path="/blueprints">
        <RequireAuth><RequireVentex><BlueprintsPage /></RequireVentex></RequireAuth>
      </Route>
      <Route path="/oversight">
        <RequireAuth><RequireVentex><OversightPage /></RequireVentex></RequireAuth>
      </Route>

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function HeartbeatProvider({ children }: { children: React.ReactNode }) {
  useHeartbeat();
  useIdleTimeout();
  return <>{children}</>;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <DemoProvider>
        <PreviewModeProvider>
          <WorkspaceProvider>
            <AgentProvider>
            <TooltipProvider>
              <HeartbeatProvider>
                <CustomCursor />
                <Toaster />
                <Router />
              </HeartbeatProvider>
            </TooltipProvider>
            </AgentProvider>
          </WorkspaceProvider>
        </PreviewModeProvider>
        </DemoProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
