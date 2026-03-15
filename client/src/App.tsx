import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Agent from "./pages/Agent";
import Verticals from "./pages/Verticals";
import Onboard from "./pages/Onboard";
import Settings from "./pages/Settings";
import Distributions from "./pages/Distributions";
import SpyOps from "./pages/SpyOps";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/agent" component={Agent} />
      <Route path="/ventures" component={Verticals} />
      <Route path="/team" component={Onboard} />
      <Route path="/spvs" component={Settings} />
      <Route path="/distributions" component={Distributions} />
      <Route path="/landing" component={SpyOps} />
      <Route path="/settings" component={Settings} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
