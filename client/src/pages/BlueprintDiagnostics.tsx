// Blueprint Diagnostics — Structural Health + Structure Mode + Velocity Attribution
// Three-panel architecture for diagnosing and optimizing client operating models

import DashboardLayout from "@/components/DashboardLayout";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Gauge,
  Loader2,
  RefreshCw,
  Shield,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
  GitBranch,
  Users,
  Building2,
  Scale,
  Timer,
  XCircle,
  Eye,
  Flag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useState, useMemo } from "react";

// ── Score ring component ─────────────────────────────────────────────
function ScoreRing({ score, size = 80, strokeWidth = 6, label, sublabel, color }: {
  score: number;
  size?: number;
  strokeWidth?: number;
  label: string;
  sublabel?: string;
  color: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-border/40"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-mono font-bold text-foreground">{score}</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-[11px] font-medium text-foreground">{label}</p>
        {sublabel && <p className="text-[10px] text-muted-foreground">{sublabel}</p>}
      </div>
    </div>
  );
}

// ── Severity badge ───────────────────────────────────────────────────
const SEVERITY_CONFIG: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  critical: { bg: "bg-red-500/10", text: "text-red-400", icon: <XCircle className="size-3" /> },
  high: { bg: "bg-orange-500/10", text: "text-orange-400", icon: <AlertTriangle className="size-3" /> },
  medium: { bg: "bg-amber-500/10", text: "text-amber-400", icon: <Flag className="size-3" /> },
  low: { bg: "bg-blue-500/10", text: "text-blue-400", icon: <Eye className="size-3" /> },
};

const CATEGORY_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  decision_chain: { label: "Decision Chain", icon: <GitBranch className="size-3.5" /> },
  role_overlap: { label: "Role Overlap", icon: <Users className="size-3.5" /> },
  missing_capability: { label: "Missing Capability", icon: <Target className="size-3.5" /> },
  compliance_gap: { label: "Compliance Gap", icon: <Shield className="size-3.5" /> },
  communication_bottleneck: { label: "Communication", icon: <Activity className="size-3.5" /> },
  resource_constraint: { label: "Resource Constraint", icon: <Building2 className="size-3.5" /> },
};

const DELAY_SOURCE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  client_structure: { label: "Client Structure", color: "text-amber-400 bg-amber-500/10", icon: <Building2 className="size-3.5" /> },
  client_approval: { label: "Client Approval", color: "text-amber-400 bg-amber-500/10", icon: <Building2 className="size-3.5" /> },
  ventex_processing: { label: "VENTEX Engine", color: "text-blue-400 bg-blue-500/10", icon: <Zap className="size-3.5" /> },
  ventex_engine: { label: "VENTEX Engine", color: "text-blue-400 bg-blue-500/10", icon: <Zap className="size-3.5" /> },
  external_dependency: { label: "External", color: "text-violet-400 bg-violet-500/10", icon: <Clock className="size-3.5" /> },
  regulatory: { label: "Regulatory", color: "text-violet-400 bg-violet-500/10", icon: <Shield className="size-3.5" /> },
  market_condition: { label: "Market", color: "text-violet-400 bg-violet-500/10", icon: <TrendingDown className="size-3.5" /> },
  shared_responsibility: { label: "Shared", color: "text-gray-400 bg-gray-500/10", icon: <Scale className="size-3.5" /> },
};

type DiagnosticTab = "health" | "structure" | "velocity";

export default function BlueprintDiagnosticsPage() {
  const { organizations, activeOrgId } = useWorkspace();
  const [selectedOrgId, setSelectedOrgId] = useState<number | undefined>(activeOrgId);
  const [activeTab, setActiveTab] = useState<DiagnosticTab>("health");
  const [expandedFlag, setExpandedFlag] = useState<string | null>(null);

  const orgId = selectedOrgId || activeOrgId;

  const activeOrgs = useMemo(
    () => organizations.filter((o) => o.status === "active"),
    [organizations]
  );

  // ── Queries ──────────────────────────────────────────────────────────
  const {
    data: diagnostic,
    isLoading: diagLoading,
  } = trpc.diagnostics.getCurrentDiagnostic.useQuery(
    { organizationId: orgId! },
    { enabled: !!orgId }
  );

  const {
    data: history,
  } = trpc.diagnostics.getDiagnosticHistory.useQuery(
    { organizationId: orgId! },
    { enabled: !!orgId }
  );

  const {
    data: structureModes,
  } = trpc.diagnostics.listStructureModes.useQuery(
    { organizationId: orgId! },
    { enabled: !!orgId }
  );

  const {
    data: velocitySummary,
  } = trpc.diagnostics.getVelocitySummary.useQuery(
    { organizationId: orgId! },
    { enabled: !!orgId }
  );

  const {
    data: attributions,
  } = trpc.diagnostics.getAttributions.useQuery(
    { organizationId: orgId! },
    { enabled: !!orgId }
  );

  const utils = trpc.useUtils();

  // ── Mutations ────────────────────────────────────────────────────────
  const runDiagnosticMutation = trpc.diagnostics.runDiagnostic.useMutation({
    onSuccess: () => {
      toast.success("Structural diagnostic complete");
      utils.diagnostics.getCurrentDiagnostic.invalidate({ organizationId: orgId! });
      utils.diagnostics.getDiagnosticHistory.invalidate({ organizationId: orgId! });
    },
    onError: (err) => toast.error(err.message || "Diagnostic failed"),
  });

  const setStructureModeMutation = trpc.diagnostics.setStructureMode.useMutation({
    onSuccess: () => {
      toast.success("Structure mode updated");
      utils.diagnostics.listStructureModes.invalidate({ organizationId: orgId! });
    },
    onError: (err) => toast.error(err.message || "Failed to update structure mode"),
  });

  const resolveAttributionMutation = trpc.diagnostics.resolveAttribution.useMutation({
    onSuccess: () => {
      toast.success("Attribution resolved");
      utils.diagnostics.getAttributions.invalidate({ organizationId: orgId! });
      utils.diagnostics.getVelocitySummary.invalidate({ organizationId: orgId! });
    },
    onError: (err) => toast.error(err.message),
  });

  // ── Score color helper ───────────────────────────────────────────────
  const scoreColor = (score: number) => {
    if (score >= 75) return "#22c55e"; // green
    if (score >= 50) return "#f59e0b"; // amber
    if (score >= 25) return "#f97316"; // orange
    return "#ef4444"; // red
  };

  const scoreLabel = (score: number) => {
    if (score >= 75) return "Strong";
    if (score >= 50) return "Moderate";
    if (score >= 25) return "Weak";
    return "Critical";
  };

  return (
    <DashboardLayout title="Diagnostics" subtitle="BLUEPRINT ENGINE">
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-primary/10">
              <Gauge className="size-5 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-foreground">
                Blueprint Diagnostics
              </h1>
              <p className="text-xs text-muted-foreground">
                Structural health scoring, operating model optimization, and velocity attribution
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeOrgs.length > 1 && (
              <Select
                value={String(orgId || "")}
                onValueChange={(v) => setSelectedOrgId(Number(v))}
              >
                <SelectTrigger className="h-8 w-[180px] text-xs">
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {activeOrgs.map((org) => (
                    <SelectItem key={org.id} value={String(org.id)}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Tab bar */}
        {orgId && (
          <div className="flex items-center gap-1 border-b border-border pb-px">
            {[
              { key: "health" as DiagnosticTab, label: "Structural Health", icon: <BarChart3 className="size-3.5" /> },
              { key: "structure" as DiagnosticTab, label: "Operating Model", icon: <GitBranch className="size-3.5" /> },
              { key: "velocity" as DiagnosticTab, label: "Velocity Attribution", icon: <Timer className="size-3.5" /> },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px",
                  activeTab === tab.key
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* No org selected */}
        {!orgId && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Gauge className="size-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-sm font-medium text-foreground mb-1">Select a client</h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              Choose a client organization to run structural diagnostics and view velocity attribution.
            </p>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 1: STRUCTURAL HEALTH
           ══════════════════════════════════════════════════════════════════ */}
        {orgId && activeTab === "health" && (
          <div className="space-y-6">
            {/* Run Diagnostic CTA */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Structural Health Score</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  AI-powered analysis of the client's organizational readiness for venture velocity
                </p>
              </div>
              <Button
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => orgId && runDiagnosticMutation.mutate({ organizationId: orgId })}
                disabled={runDiagnosticMutation.isPending}
              >
                {runDiagnosticMutation.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="size-3.5" />
                )}
                {diagnostic ? "Re-analyze" : "Run Diagnostic"}
              </Button>
            </div>

            {/* Loading */}
            {diagLoading && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-lg" />
                ))}
              </div>
            )}

            {/* No diagnostic yet */}
            {!diagLoading && !diagnostic && (
              <div className="flex flex-col items-center justify-center py-16 text-center bg-card border border-border rounded-lg">
                <div className="flex items-center justify-center size-16 rounded-2xl bg-primary/5 mb-4">
                  <BarChart3 className="size-8 text-muted-foreground/40" />
                </div>
                <h3 className="text-sm font-medium text-foreground mb-1">No diagnostic data</h3>
                <p className="text-xs text-muted-foreground max-w-sm mb-4">
                  Run a structural diagnostic to analyze this client's organizational readiness.
                  The AI will score decision velocity, ownership clarity, communication density,
                  capital readiness, and execution capacity.
                </p>
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => orgId && runDiagnosticMutation.mutate({ organizationId: orgId })}
                  disabled={runDiagnosticMutation.isPending}
                >
                  {runDiagnosticMutation.isPending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="size-3.5" />
                  )}
                  Run First Diagnostic
                </Button>
              </div>
            )}

            {/* Diagnostic Results */}
            {!diagLoading && diagnostic && (
              <>
                {/* Overall Score Banner */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card border border-border rounded-lg p-6"
                >
                  <div className="flex flex-col md:flex-row items-center gap-8">
                    {/* Overall score */}
                    <div className="flex flex-col items-center">
                      <ScoreRing
                        score={diagnostic.overallScore}
                        size={120}
                        strokeWidth={8}
                        label="Overall Readiness"
                        sublabel={scoreLabel(diagnostic.overallScore)}
                        color={scoreColor(diagnostic.overallScore)}
                      />
                    </div>

                    {/* Individual scores */}
                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
                      <ScoreRing score={diagnostic.decisionVelocity} label="Decision Velocity" sublabel="Approval speed" color={scoreColor(diagnostic.decisionVelocity)} />
                      <ScoreRing score={diagnostic.ownershipClarity} label="Ownership Clarity" sublabel="Role mapping" color={scoreColor(diagnostic.ownershipClarity)} />
                      <ScoreRing score={diagnostic.communicationDensity} label="Communication" sublabel="Stakeholder lean" color={scoreColor(diagnostic.communicationDensity)} />
                      <ScoreRing score={diagnostic.capitalReadiness} label="Capital Readiness" sublabel="Legal + banking" color={scoreColor(diagnostic.capitalReadiness)} />
                      <ScoreRing score={diagnostic.executionCapacity} label="Execution Capacity" sublabel="Team bandwidth" color={scoreColor(diagnostic.executionCapacity)} />
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
                    <span className="text-[10px] font-mono text-muted-foreground">
                      v{diagnostic.version} · {new Date(diagnostic.calculatedAt).toLocaleDateString()}
                    </span>
                    {history && history.length > 1 && (
                      <span className="text-[10px] text-muted-foreground">
                        {history.length} analyses on record
                      </span>
                    )}
                  </div>
                </motion.div>

                {/* Friction Flags */}
                {diagnostic.frictionFlags && (diagnostic.frictionFlags as any[]).length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <ShieldAlert className="size-4 text-amber-400" />
                        Friction Flags
                      </h3>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {(diagnostic.frictionFlags as any[]).length} identified
                      </span>
                    </div>

                    <div className="space-y-2">
                      {(diagnostic.frictionFlags as any[]).map((flag: any, i: number) => {
                        const sev = SEVERITY_CONFIG[flag.severity] || SEVERITY_CONFIG.medium;
                        const cat = CATEGORY_LABELS[flag.category] || { label: flag.category.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()), icon: <Flag className="size-3.5" /> };
                        const isExpanded = expandedFlag === flag.id;

                        return (
                          <motion.div
                            key={flag.id || i}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="bg-card border border-border rounded-lg overflow-hidden"
                          >
                            <div
                              onClick={() => setExpandedFlag(isExpanded ? null : flag.id)}
                              className="p-3 flex items-center gap-3 cursor-pointer hover:bg-accent/30 transition-colors"
                            >
                              <ChevronRight className={cn("size-3.5 text-muted-foreground transition-transform flex-shrink-0", isExpanded && "rotate-90")} />
                              <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0 gap-0.5", sev.bg, sev.text)}>
                                {sev.icon}
                                {flag.severity}
                              </Badge>
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-0.5 bg-secondary text-muted-foreground">
                                {cat.icon}
                                {cat.label}
                              </Badge>
                              <span className="text-xs font-medium text-foreground flex-1 truncate">{flag.title}</span>
                              {flag.estimatedDelayDays > 0 && (
                                <span className="text-[10px] font-mono text-muted-foreground flex-shrink-0">
                                  +{flag.estimatedDelayDays}d delay
                                </span>
                              )}
                            </div>

                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="border-t border-border"
                                >
                                  <div className="p-4 space-y-3">
                                    <p className="text-xs text-muted-foreground leading-relaxed">{flag.description}</p>
                                    <div className="bg-primary/5 rounded-md p-3">
                                      <p className="text-[11px] font-medium text-foreground mb-1">Recommendation</p>
                                      <p className="text-xs text-muted-foreground leading-relaxed">{flag.recommendation}</p>
                                    </div>
                                    {flag.affectedStages && flag.affectedStages.length > 0 && (
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-[10px] text-muted-foreground">Affects:</span>
                                        {flag.affectedStages.map((stage: string) => (
                                          <Badge key={stage} variant="secondary" className="text-[10px] px-1.5 py-0">
                                            {stage}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* History trend */}
                {history && history.length > 1 && (
                  <div className="bg-card border border-border rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-foreground mb-3">Score History</h3>
                    <div className="flex items-end gap-2 h-24">
                      {history.slice(0, 10).reverse().map((h: any, i: number) => {
                        const height = Math.max(8, (h.overallScore / 100) * 96);
                        return (
                          <TooltipProvider key={h.id}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className="flex-1 rounded-t transition-all hover:opacity-80"
                                  style={{
                                    height: `${height}px`,
                                    backgroundColor: scoreColor(h.overallScore),
                                    opacity: 0.3 + (i / 10) * 0.7,
                                  }}
                                />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">v{h.version}: {h.overallScore}/100</p>
                                <p className="text-[10px] text-muted-foreground">{new Date(h.calculatedAt).toLocaleDateString()}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 2: OPERATING MODEL (Structure Mode)
           ══════════════════════════════════════════════════════════════════ */}
        {orgId && activeTab === "structure" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Operating Model Configuration</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Choose between VENTEX's proven operating model or the client's custom structure.
                AI flags friction points when custom structure is selected.
              </p>
            </div>

            {/* Mode cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* VENTEX Recommended */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "bg-card border rounded-lg p-5 cursor-pointer transition-all",
                  structureModes?.some((m: any) => m.mode === "recommended")
                    ? "border-primary ring-1 ring-primary/20"
                    : "border-border hover:border-primary/30"
                )}
                onClick={() => orgId && setStructureModeMutation.mutate({ organizationId: orgId, sector: "general", mode: "recommended" })}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center justify-center size-10 rounded-lg bg-primary/10">
                    <Zap className="size-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">VENTEX Recommended</h3>
                    <p className="text-[11px] text-muted-foreground">Proven operating model</p>
                  </div>
                  {structureModes?.some((m: any) => m.mode === "recommended") && (
                    <Badge className="ml-auto bg-primary/10 text-primary text-[10px]">Active</Badge>
                  )}
                </div>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2"><CheckCircle2 className="size-3 text-emerald-400 flex-shrink-0" /> Optimized decision chains (2-step max)</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="size-3 text-emerald-400 flex-shrink-0" /> Clear single-owner per stage</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="size-3 text-emerald-400 flex-shrink-0" /> Lean stakeholder communication</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="size-3 text-emerald-400 flex-shrink-0" /> Pre-validated compliance checkpoints</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="size-3 text-emerald-400 flex-shrink-0" /> Parallel execution where possible</li>
                </ul>
              </motion.div>

              {/* Client Custom */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className={cn(
                  "bg-card border rounded-lg p-5 cursor-pointer transition-all",
                  structureModes?.some((m: any) => m.mode === "custom")
                    ? "border-amber-500 ring-1 ring-amber-500/20"
                    : "border-border hover:border-amber-500/30"
                )}
                onClick={() => orgId && setStructureModeMutation.mutate({ organizationId: orgId, sector: "general", mode: "custom" })}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center justify-center size-10 rounded-lg bg-amber-500/10">
                    <Building2 className="size-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Client Custom</h3>
                    <p className="text-[11px] text-muted-foreground">Their existing structure</p>
                  </div>
                  {structureModes?.some((m: any) => m.mode === "custom") && (
                    <Badge className="ml-auto bg-amber-500/10 text-amber-400 text-[10px]">Active</Badge>
                  )}
                </div>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2"><AlertTriangle className="size-3 text-amber-400 flex-shrink-0" /> Client's existing approval chains</li>
                  <li className="flex items-center gap-2"><AlertTriangle className="size-3 text-amber-400 flex-shrink-0" /> Their role assignments (may overlap)</li>
                  <li className="flex items-center gap-2"><AlertTriangle className="size-3 text-amber-400 flex-shrink-0" /> Custom communication protocols</li>
                  <li className="flex items-center gap-2"><AlertTriangle className="size-3 text-amber-400 flex-shrink-0" /> AI monitors for structural friction</li>
                  <li className="flex items-center gap-2"><AlertTriangle className="size-3 text-amber-400 flex-shrink-0" /> Delays attributed to structure, not engine</li>
                </ul>
              </motion.div>
            </div>

            {/* Hybrid mode */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={cn(
                "bg-card border rounded-lg p-5 cursor-pointer transition-all",
                structureModes?.some((m: any) => m.mode === "hybrid")
                  ? "border-emerald-500 ring-1 ring-emerald-500/20"
                  : "border-border hover:border-emerald-500/30"
              )}
              onClick={() => orgId && setStructureModeMutation.mutate({ organizationId: orgId, sector: "general", mode: "hybrid" })}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-500/10">
                  <Scale className="size-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Hybrid Model</h3>
                  <p className="text-[11px] text-muted-foreground">VENTEX backbone + client customizations</p>
                </div>
                {structureModes?.some((m: any) => m.mode === "hybrid") && (
                  <Badge className="ml-auto bg-emerald-500/10 text-emerald-400 text-[10px]">Active</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Uses VENTEX's proven operating model as the foundation, with targeted customizations
                where the client's structure adds value. AI continuously monitors hybrid points for friction
                and suggests optimizations. Best for clients transitioning from legacy processes.
              </p>
            </motion.div>

            {/* Active friction warnings when custom mode is selected */}
            {structureModes?.some((m: any) => m.mode !== "recommended") && diagnostic?.frictionFlags && (diagnostic.frictionFlags as any[]).length > 0 && (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="size-4 text-amber-400" />
                  <span className="text-xs font-semibold text-amber-400">Structure Risk Warning</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  The current client structure has {(diagnostic.frictionFlags as any[]).length} identified friction points
                  that may slow venture velocity. Consider switching to VENTEX Recommended or running a new diagnostic.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(diagnostic.frictionFlags as any[]).slice(0, 5).map((flag: any, i: number) => {
                    const sev = SEVERITY_CONFIG[flag.severity] || SEVERITY_CONFIG.medium;
                    return (
                      <Badge key={i} variant="secondary" className={cn("text-[10px] px-1.5 py-0 gap-0.5", sev.bg, sev.text)}>
                        {flag.title}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 3: VELOCITY ATTRIBUTION
           ══════════════════════════════════════════════════════════════════ */}
        {orgId && activeTab === "velocity" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Velocity Attribution</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                When tasks stall, the system attributes the delay source — protecting VENTEX's reputation
                and giving clients visibility into their own bottlenecks.
              </p>
            </div>

            {/* Summary cards */}
            {velocitySummary && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="size-4 text-amber-400" />
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Client Structure</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-mono font-semibold text-foreground">{(velocitySummary.bySource?.client_structure?.count || 0) + (velocitySummary.bySource?.client_approval?.count || 0)}</span>
                    <span className="text-[10px] text-muted-foreground">delays</span>
                  </div>
                  <span className="text-[10px] font-mono text-amber-400">{velocitySummary.clientDelayDays || 0} total days</span>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-card border border-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="size-4 text-blue-400" />
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground">VENTEX Engine</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-mono font-semibold text-foreground">{velocitySummary.bySource?.ventex_processing?.count || velocitySummary.bySource?.ventex_engine?.count || 0}</span>
                    <span className="text-[10px] text-muted-foreground">delays</span>
                  </div>
                  <span className="text-[10px] font-mono text-blue-400">{velocitySummary.ventexDelayDays || 0} total days</span>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card border border-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="size-4 text-violet-400" />
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground">External</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-mono font-semibold text-foreground">{(velocitySummary.bySource?.external_dependency?.count || 0) + (velocitySummary.bySource?.regulatory?.count || 0) + (velocitySummary.bySource?.market_condition?.count || 0)}</span>
                    <span className="text-[10px] text-muted-foreground">delays</span>
                  </div>
                  <span className="text-[10px] font-mono text-violet-400">{velocitySummary.externalDelayDays || 0} total days</span>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-card border border-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="size-4 text-emerald-400" />
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground">VENTEX Efficiency</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-mono font-semibold text-foreground">
                      {100 - (velocitySummary.ventexResponsibilityPct || 0)}%
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400">
                    of delays are non-VENTEX
                  </span>
                </motion.div>
              </div>
            )}

            {/* Attribution list */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Recent Attributions</h3>

              {(!attributions || attributions.length === 0) && (
                <div className="flex flex-col items-center justify-center py-12 text-center bg-card border border-border rounded-lg">
                  <Timer className="size-10 text-muted-foreground/30 mb-3" />
                  <h3 className="text-sm font-medium text-foreground mb-1">No attributions yet</h3>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    When tasks are delayed, the AI engine will automatically attribute the delay source.
                    Attributions appear here as they're created.
                  </p>
                </div>
              )}

              {attributions && attributions.length > 0 && (
                <div className="space-y-2">
                  {attributions.map((attr: any, i: number) => {
                    const source = DELAY_SOURCE_CONFIG[attr.delaySource] || DELAY_SOURCE_CONFIG.shared_responsibility;
                    return (
                      <motion.div
                        key={attr.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="bg-card border border-border rounded-lg p-3"
                      >
                        <div className="flex items-start gap-3">
                          <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0.5 gap-0.5 flex-shrink-0 mt-0.5", source.color)}>
                            {source.icon}
                            {source.label}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground">{attr.description || "Task delayed"}</p>
                            {attr.blockedBy && (
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                Blocked by: {attr.blockedBy}
                              </p>
                            )}
                            {attr.recommendation && (
                              <p className="text-[11px] text-primary/80 mt-1">{attr.recommendation}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {attr.delayDays > 0 && (
                              <span className="text-[10px] font-mono text-muted-foreground">
                                +{attr.delayDays}d
                              </span>
                            )}
                            {!attr.resolvedAt && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-[10px] px-2"
                                onClick={() => resolveAttributionMutation.mutate({ id: attr.id, resolution: "Resolved" })}
                              >
                                Resolve
                              </Button>
                            )}
                            {attr.resolvedAt && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-emerald-500/10 text-emerald-400">
                                <CheckCircle2 className="size-3" />
                                Resolved
                              </Badge>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
