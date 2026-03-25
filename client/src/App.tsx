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
import { useHeartbeat } from "./hooks/useHeartbeat";

/* Auth guard — redirects to login if no operator in localStorage */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const [, navigate] = useLocation();
  const [checked, setChecked] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const op = localStorage.getItem("atlas_operator");
    if (op) {
      setAuthed(true);
    } else {
      navigate("/", { replace: true });
    }
    setChecked(true);
  }, [navigate]);

  if (!checked) return null;
  if (!authed) return null;
  return <>{children}</>;
}

/* ATLAS-only guard — redirects non-admin/owner users to dashboard.
   In preview mode, admin/owner users are treated as clients and get redirected too. */
function RequireAtlas({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { isPreviewMode } = usePreviewMode();
  const [, navigate] = useLocation();

  const isAtlas = user && (user.role === "owner" || user.role === "admin");
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

      {/* Partner invite acceptance — public, no auth */}
      <Route path="/invite/:orgSlug/:token" component={InviteAccept} />

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

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function HeartbeatProvider({ children }: { children: React.ReactNode }) {
  useHeartbeat();
  return <>{children}</>;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <PreviewModeProvider>
          <WorkspaceProvider>
            <TooltipProvider>
              <HeartbeatProvider>
                <Toaster />
                <Router />
              </HeartbeatProvider>
            </TooltipProvider>
          </WorkspaceProvider>
        </PreviewModeProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
