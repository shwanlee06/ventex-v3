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
import { isAtlasTeam } from "@/lib/atlas";
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
import AtlasTeam from "./pages/AtlasTeam";
import AcceptInvite from "./pages/AcceptInvite";
import AgentsPage from "./pages/Agents";
import DraftsPage from "./pages/Drafts";
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
    const hasLocalSession = Boolean(localStorage.getItem("atlas_operator"));
    if (!isAuthenticated && !hasLocalSession) {
      navigate("/", { replace: true });
    }
    // If authenticated via OAuth but localStorage not set yet, set it
    if (isAuthenticated && user && !localStorage.getItem("atlas_operator")) {
      localStorage.setItem("atlas_operator", user.name || "OPERATOR");
    }
  }, [loading, isAuthenticated, user, navigate]);

  if (loading) return null;

  const hasLocalSession = Boolean(localStorage.getItem("atlas_operator"));
  if (!isAuthenticated && !hasLocalSession) return null;

  return <>{children}</>;
}

/* ATLAS-only guard — redirects non-admin/owner users to dashboard.
   In preview mode, admin/owner users are treated as clients and get redirected too. */
function RequireAtlas({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { isPreviewMode } = usePreviewMode();
  const [, navigate] = useLocation();

  const isAtlas = isAtlasTeam(user);
  const shouldBlock = !isAtlas || isPreviewMode;

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
        <RequireAuth><RequireAtlas><ClientDetail /></RequireAtlas></RequireAuth>
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

      {/* ATLAS team only pages — admin/owner access required (blocked in preview mode) */}
      <Route path="/agent">
        <RequireAuth><RequireAtlas><Agent /></RequireAtlas></RequireAuth>
      </Route>
      <Route path="/team/:slug">
        <RequireAuth><RequireAtlas><TeamMemberDetail /></RequireAtlas></RequireAuth>
      </Route>
      <Route path="/team">
        <RequireAuth><RequireAtlas><Onboard /></RequireAtlas></RequireAuth>
      </Route>
      <Route path="/atlas-team/:slug">
        <RequireAuth><RequireAtlas><TeamMemberDetail /></RequireAtlas></RequireAuth>
      </Route>
      <Route path="/atlas-team">
        <RequireAuth><RequireAtlas><AtlasTeam /></RequireAtlas></RequireAuth>
      </Route>
      <Route path="/security">
        <RequireAuth><RequireAtlas><SecurityPage /></RequireAtlas></RequireAuth>
      </Route>
      <Route path="/access">
        <RequireAuth><RequireAtlas><AccessManagement /></RequireAtlas></RequireAuth>
      </Route>
      <Route path="/settings">
        <RequireAuth><RequireAtlas><SettingsPage /></RequireAtlas></RequireAuth>
      </Route>
      <Route path="/agents">
        <RequireAuth><RequireAtlas><AgentsPage /></RequireAtlas></RequireAuth>
      </Route>
      <Route path="/drafts">
        <RequireAuth><DraftsPage /></RequireAuth>
      </Route>
      <Route path="/onboarding">
        <RequireAuth><RequireAtlas><OnboardingWizard /></RequireAtlas></RequireAuth>
      </Route>
      <Route path="/blueprints">
        <RequireAuth><RequireAtlas><BlueprintsPage /></RequireAtlas></RequireAuth>
      </Route>
      <Route path="/oversight">
        <RequireAuth><RequireAtlas><OversightPage /></RequireAtlas></RequireAuth>
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
