// ============================================================================
// Client Settings Panel — Inline settings for /clients/:slug
// Editable fields: name, contact, AUM, sectors, tier, status, agent config
// ============================================================================

import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save, User, Mail, DollarSign, Tag, Crown, CalendarDays, Shield, Bot, X, Plus, Zap, Clock, AlertTriangle, ArrowRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";

const SECTOR_OPTIONS = [
  "Real Estate", "Yacht", "F&B", "Entertainment", "Oil & Gas",
  "Technology", "Healthcare", "Finance", "Hospitality", "Others",
];

const AUM_RANGES = [
  { value: "<$100M", label: "Under $100M" },
  { value: "$100M-$500M", label: "$100M – $500M" },
  { value: "$500M+", label: "$500M+" },
  { value: "$1B+", label: "$1B+" },
];

const TIERS = [
  { value: "poc", label: "POC", desc: "Proof of concept" },
  { value: "growth", label: "Growth", desc: "Active client" },
  { value: "enterprise", label: "Enterprise", desc: "Premium tier" },
];

interface ClientSettingsProps {
  orgId: number;
  orgSlug: string;
}

export default function ClientSettings({ orgId, orgSlug }: ClientSettingsProps) {
  const utils = trpc.useUtils();
  const orgQ = trpc.organizations.bySlug.useQuery({ slug: orgSlug });
  const org = orgQ.data;

  // Agent config
  const agentConfigQ = trpc.organizations.getAgentConfig.useQuery(
    { organizationId: orgId },
    { enabled: !!orgId }
  );
  const agentConfig = agentConfigQ.data;

  const updateAgentConfig = trpc.organizations.updateAgentConfig.useMutation({
    onSuccess: () => {
      toast.success("Agent configuration updated");
      agentConfigQ.refetch();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateOrg = trpc.organizations.update.useMutation({
    onSuccess: () => {
      toast.success("Client settings updated");
      utils.organizations.bySlug.invalidate({ slug: orgSlug });
      utils.organizations.listWithMetrics.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Form state — Client Info
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [aumRange, setAumRange] = useState("");
  const [sectors, setSectors] = useState<string[]>([]);
  const [tier, setTier] = useState("poc");
  const [renewalDate, setRenewalDate] = useState("");
  const [newSector, setNewSector] = useState("");

  // Form state — Agent Config
  const [velocityEnabled, setVelocityEnabled] = useState(true);
  const [complianceEnabled, setComplianceEnabled] = useState(true);
  const [dealFlowEnabled, setDealFlowEnabled] = useState(true);
  const [orchestratorEnabled, setOrchestratorEnabled] = useState(true);
  const [autoAdvanceEnabled, setAutoAdvanceEnabled] = useState(false);
  const [autoAdvanceSectors, setAutoAdvanceSectors] = useState<string[]>([]);
  const [overdueDays, setOverdueDays] = useState(7);
  const [distributionWarningDays, setDistributionWarningDays] = useState(14);
  const [healthAlertThreshold, setHealthAlertThreshold] = useState(30);
  const [pollingInterval, setPollingInterval] = useState(30);

  // Populate form when org data loads
  useEffect(() => {
    if (org) {
      setName(org.name || "");
      setContactName(org.primaryContactName || "");
      setContactEmail(org.primaryContactEmail || "");
      setAumRange(org.aumRange || "");
      // Defensive: sectors may come as JSON string from DB
      const rawSectors = org.sectors;
      if (Array.isArray(rawSectors)) {
        setSectors(rawSectors);
      } else if (typeof rawSectors === "string") {
        try { setSectors(JSON.parse(rawSectors)); } catch { setSectors([]); }
      } else {
        setSectors([]);
      }
      setTier(org.subscriptionTier || "poc");
      setRenewalDate(org.renewalDate || "");
    }
  }, [org]);

  // Populate agent config form
  useEffect(() => {
    if (agentConfig) {
      setVelocityEnabled(agentConfig.velocityAgentEnabled ?? true);
      setComplianceEnabled(agentConfig.complianceAgentEnabled ?? true);
      setDealFlowEnabled(agentConfig.dealFlowAgentEnabled ?? true);
      setOrchestratorEnabled(agentConfig.orchestratorEnabled ?? true);
      setAutoAdvanceEnabled(agentConfig.autoAdvanceEnabled ?? false);
      // Defensive: autoAdvanceSectors may come as JSON string from DB
      const rawAAS = agentConfig.autoAdvanceSectors;
      if (Array.isArray(rawAAS)) {
        setAutoAdvanceSectors(rawAAS);
      } else if (typeof rawAAS === "string") {
        try { setAutoAdvanceSectors(JSON.parse(rawAAS)); } catch { setAutoAdvanceSectors([]); }
      } else {
        setAutoAdvanceSectors([]);
      }
      setOverdueDays(agentConfig.overdueDaysThreshold ?? 7);
      setDistributionWarningDays(agentConfig.distributionWarningDays ?? 14);
      setHealthAlertThreshold(agentConfig.healthScoreAlertThreshold ?? 30);
      setPollingInterval(agentConfig.pollingIntervalMinutes ?? 30);
    }
  }, [agentConfig]);

  // Track if org form is dirty
  const isOrgDirty = useMemo(() => {
    if (!org) return false;
    return (
      name !== (org.name || "") ||
      contactName !== (org.primaryContactName || "") ||
      contactEmail !== (org.primaryContactEmail || "") ||
      aumRange !== (org.aumRange || "") ||
      JSON.stringify(sectors) !== JSON.stringify(org.sectors || []) ||
      tier !== (org.subscriptionTier || "poc") ||
      renewalDate !== (org.renewalDate || "")
    );
  }, [org, name, contactName, contactEmail, aumRange, sectors, tier, renewalDate]);

  // Track if agent config is dirty
  const isAgentDirty = useMemo(() => {
    if (!agentConfig) return true; // no config yet = always dirty
    return (
      velocityEnabled !== (agentConfig.velocityAgentEnabled ?? true) ||
      complianceEnabled !== (agentConfig.complianceAgentEnabled ?? true) ||
      dealFlowEnabled !== (agentConfig.dealFlowAgentEnabled ?? true) ||
      orchestratorEnabled !== (agentConfig.orchestratorEnabled ?? true) ||
      autoAdvanceEnabled !== (agentConfig.autoAdvanceEnabled ?? false) ||
      JSON.stringify(autoAdvanceSectors) !== JSON.stringify(agentConfig.autoAdvanceSectors || []) ||
      overdueDays !== (agentConfig.overdueDaysThreshold ?? 7) ||
      distributionWarningDays !== (agentConfig.distributionWarningDays ?? 14) ||
      healthAlertThreshold !== (agentConfig.healthScoreAlertThreshold ?? 30) ||
      pollingInterval !== (agentConfig.pollingIntervalMinutes ?? 30)
    );
  }, [agentConfig, velocityEnabled, complianceEnabled, dealFlowEnabled, orchestratorEnabled, autoAdvanceEnabled, autoAdvanceSectors, overdueDays, distributionWarningDays, healthAlertThreshold, pollingInterval]);

  const handleSaveOrg = () => {
    if (!orgId) return;
    updateOrg.mutate({
      id: orgId,
      name: name.trim() || undefined,
      primaryContactName: contactName.trim() || undefined,
      primaryContactEmail: contactEmail.trim() || undefined,
      aumRange: aumRange || undefined,
      sectors: sectors.length > 0 ? sectors : undefined,
      subscriptionTier: tier as "poc" | "growth" | "enterprise",
      renewalDate: renewalDate || undefined,
    });
  };

  const handleSaveAgentConfig = () => {
    if (!orgId) return;
    updateAgentConfig.mutate({
      organizationId: orgId,
      velocityAgentEnabled: velocityEnabled,
      complianceAgentEnabled: complianceEnabled,
      dealFlowAgentEnabled: dealFlowEnabled,
      orchestratorEnabled: orchestratorEnabled,
      autoAdvanceEnabled: autoAdvanceEnabled,
      autoAdvanceSectors: autoAdvanceSectors,
      overdueDaysThreshold: overdueDays,
      distributionWarningDays: distributionWarningDays,
      healthScoreAlertThreshold: healthAlertThreshold,
      pollingIntervalMinutes: pollingInterval,
    });
  };

  const addSector = (sector: string) => {
    if (sector && !sectors.includes(sector)) {
      setSectors([...sectors, sector]);
    }
    setNewSector("");
  };

  const removeSector = (sector: string) => {
    setSectors(sectors.filter(s => s !== sector));
  };

  const addAutoAdvanceSector = (sector: string) => {
    if (sector && !autoAdvanceSectors.includes(sector)) {
      setAutoAdvanceSectors([...autoAdvanceSectors, sector]);
    }
  };

  const removeAutoAdvanceSector = (sector: string) => {
    setAutoAdvanceSectors(autoAdvanceSectors.filter(s => s !== sector));
  };

  if (!org) return null;

  return (
    <div className="space-y-8">
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* Section: Client Information                                     */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <User className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Client Information</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
              Organization Name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Client name"
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
              Slug
            </label>
            <Input
              value={org.slug}
              disabled
              className="h-9 text-sm opacity-50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1.5">
              <Mail className="size-3" /> Primary Contact Name
            </label>
            <Input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Contact name"
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1.5">
              <Mail className="size-3" /> Primary Contact Email
            </label>
            <Input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="contact@example.com"
              className="h-9 text-sm"
            />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* Section: Financial & Tier                                       */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <DollarSign className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Financial & Subscription</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
              AUM Range
            </label>
            <Select value={aumRange} onValueChange={setAumRange}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                {AUM_RANGES.map(r => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1.5">
              <Crown className="size-3" /> Subscription Tier
            </label>
            <Select value={tier} onValueChange={setTier}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIERS.map(t => (
                  <SelectItem key={t.value} value={t.value}>
                    <div className="flex items-center gap-2">
                      <span>{t.label}</span>
                      <span className="text-[10px] text-muted-foreground">{t.desc}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1.5">
              <CalendarDays className="size-3" /> Renewal Date
            </label>
            <Input
              type="date"
              value={renewalDate}
              onChange={(e) => setRenewalDate(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* Section: Sectors                                                */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <Tag className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Sectors</h3>
        </div>

        <div className="flex flex-wrap gap-2">
          {sectors.map(s => (
            <span
              key={s}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-secondary text-xs text-foreground"
            >
              {s}
              <button
                onClick={() => removeSector(s)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Select value={newSector} onValueChange={(v) => addSector(v)}>
            <SelectTrigger className="h-8 text-xs w-48">
              <SelectValue placeholder="Add sector..." />
            </SelectTrigger>
            <SelectContent>
              {SECTOR_OPTIONS.filter(s => !sectors.includes(s)).map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* Section: Status & Access                                        */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <Shield className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Status & Access</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Current Status</span>
              <span className={cn(
                "text-[11px] font-mono px-2 py-0.5 rounded",
                org.status === "active" ? "bg-emerald-500/10 text-emerald-400" :
                org.status === "suspended" ? "bg-amber-500/10 text-amber-400" :
                "bg-red-500/10 text-red-400"
              )}>
                {org.status}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {org.status === "active" ? "Client has full access to their portal and ventures." :
               org.status === "suspended" ? "Client portal access is temporarily disabled." :
               "Client is archived and hidden from active views."}
            </p>
          </div>

          <div className="bg-card border border-border rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Created</span>
              <span className="text-[11px] font-mono text-muted-foreground">
                {new Date(org.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Last Updated</span>
              <span className="text-[11px] font-mono text-muted-foreground">
                {new Date(org.updatedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Save Client Info button */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <span className={cn(
          "text-[11px] transition-opacity",
          isOrgDirty ? "text-amber-400 opacity-100" : "text-muted-foreground opacity-0"
        )}>
          Unsaved changes
        </span>
        <Button
          onClick={handleSaveOrg}
          disabled={!isOrgDirty || updateOrg.isPending}
          className="h-9 px-4 text-sm"
        >
          {updateOrg.isPending ? (
            <Loader2 className="size-4 animate-spin mr-1.5" />
          ) : (
            <Save className="size-4 mr-1.5" />
          )}
          Save Client Info
        </Button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* Section: Velocity Agent Configuration                           */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="space-y-5 pt-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <Bot className="size-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Velocity Agent Configuration</h3>
          <span className="text-[10px] font-mono text-muted-foreground ml-auto">
            per-client AI settings
          </span>
        </div>

        {agentConfigQ.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
          </div>
        ) : (
          <>
            {/* Agent Toggles */}
            <div className="space-y-3">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Active Agents
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center justify-between bg-card border border-border rounded-lg p-3">
                  <div className="flex items-center gap-2.5">
                    <Zap className="size-4 text-blue-400" />
                    <div>
                      <span className="text-sm text-foreground">Velocity Agent</span>
                      <p className="text-[10px] text-muted-foreground">Detects stage readiness, recommends advances</p>
                    </div>
                  </div>
                  <Switch
                    checked={velocityEnabled}
                    onCheckedChange={setVelocityEnabled}
                  />
                </div>

                <div className="flex items-center justify-between bg-card border border-border rounded-lg p-3">
                  <div className="flex items-center gap-2.5">
                    <Shield className="size-4 text-emerald-400" />
                    <div>
                      <span className="text-sm text-foreground">Compliance Agent</span>
                      <p className="text-[10px] text-muted-foreground">Monitors regulatory and compliance tasks</p>
                    </div>
                  </div>
                  <Switch
                    checked={complianceEnabled}
                    onCheckedChange={setComplianceEnabled}
                  />
                </div>

                <div className="flex items-center justify-between bg-card border border-border rounded-lg p-3">
                  <div className="flex items-center gap-2.5">
                    <ArrowRight className="size-4 text-purple-400" />
                    <div>
                      <span className="text-sm text-foreground">Deal Flow Agent</span>
                      <p className="text-[10px] text-muted-foreground">Tracks deal pipeline and SPV progress</p>
                    </div>
                  </div>
                  <Switch
                    checked={dealFlowEnabled}
                    onCheckedChange={setDealFlowEnabled}
                  />
                </div>

                <div className="flex items-center justify-between bg-card border border-border rounded-lg p-3">
                  <div className="flex items-center gap-2.5">
                    <Bot className="size-4 text-amber-400" />
                    <div>
                      <span className="text-sm text-foreground">Orchestrator</span>
                      <p className="text-[10px] text-muted-foreground">Coordinates all agents, runs 6h cycles</p>
                    </div>
                  </div>
                  <Switch
                    checked={orchestratorEnabled}
                    onCheckedChange={setOrchestratorEnabled}
                  />
                </div>
              </div>
            </div>

            {/* Auto-Advance Configuration */}
            <div className="space-y-3">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Auto-Advance Configuration
              </h4>

              <div className="bg-card border border-border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Zap className="size-4 text-primary" />
                    <div>
                      <span className="text-sm font-medium text-foreground">Auto-Advance Enabled</span>
                      <p className="text-[10px] text-muted-foreground">
                        When enabled, ventures in pre-authorized sectors advance stages automatically without ATLAS approval
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={autoAdvanceEnabled}
                    onCheckedChange={setAutoAdvanceEnabled}
                  />
                </div>

                {autoAdvanceEnabled && (
                  <div className="space-y-3 pl-6 border-l-2 border-primary/20">
                    <div className="space-y-2">
                      <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                        Pre-Authorized Sectors
                      </label>
                      <p className="text-[10px] text-muted-foreground">
                        Only ventures in these sectors will auto-advance. Leave empty to require manual approval for all sectors.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {autoAdvanceSectors.map(s => (
                          <span
                            key={s}
                            className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-xs text-primary border border-primary/20"
                          >
                            {s}
                            <button
                              onClick={() => removeAutoAdvanceSector(s)}
                              className="text-primary/60 hover:text-primary transition-colors"
                            >
                              <X className="size-3" />
                            </button>
                          </span>
                        ))}
                        {autoAdvanceSectors.length === 0 && (
                          <span className="text-[11px] text-amber-400">
                            No sectors selected — all sectors require manual approval
                          </span>
                        )}
                      </div>
                      <Select value="" onValueChange={(v) => addAutoAdvanceSector(v)}>
                        <SelectTrigger className="h-8 text-xs w-56">
                          <SelectValue placeholder="Add sector for auto-advance..." />
                        </SelectTrigger>
                        <SelectContent>
                          {SECTOR_OPTIONS.filter(s => !autoAdvanceSectors.includes(s)).map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Thresholds & Timing */}
            <div className="space-y-3">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Thresholds & Timing
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-card border border-border rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="size-3.5 text-muted-foreground" />
                    <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                      Overdue Threshold (days)
                    </label>
                  </div>
                  <Input
                    type="number"
                    min={1}
                    max={90}
                    value={overdueDays}
                    onChange={(e) => setOverdueDays(parseInt(e.target.value) || 7)}
                    className="h-9 text-sm font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Tasks overdue by this many days trigger escalation alerts
                  </p>
                </div>

                <div className="bg-card border border-border rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <DollarSign className="size-3.5 text-muted-foreground" />
                    <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                      Distribution Warning (days)
                    </label>
                  </div>
                  <Input
                    type="number"
                    min={1}
                    max={90}
                    value={distributionWarningDays}
                    onChange={(e) => setDistributionWarningDays(parseInt(e.target.value) || 14)}
                    className="h-9 text-sm font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Warn when distributions are due within this many days
                  </p>
                </div>

                <div className="bg-card border border-border rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="size-3.5 text-muted-foreground" />
                    <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                      Health Score Alert Threshold
                    </label>
                  </div>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={healthAlertThreshold}
                    onChange={(e) => setHealthAlertThreshold(parseInt(e.target.value) || 30)}
                    className="h-9 text-sm font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Alert when any venture's health score drops below this value
                  </p>
                </div>

                <div className="bg-card border border-border rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="size-3.5 text-muted-foreground" />
                    <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                      Agent Polling Interval (minutes)
                    </label>
                  </div>
                  <Input
                    type="number"
                    min={5}
                    max={1440}
                    value={pollingInterval}
                    onChange={(e) => setPollingInterval(parseInt(e.target.value) || 30)}
                    className="h-9 text-sm font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    How often agents check this client's ventures (5 min – 24 hrs)
                  </p>
                </div>
              </div>
            </div>

            {/* Save Agent Config button */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <span className={cn(
                "text-[11px] transition-opacity",
                isAgentDirty ? "text-amber-400 opacity-100" : "text-muted-foreground opacity-0"
              )}>
                Unsaved agent changes
              </span>
              <Button
                onClick={handleSaveAgentConfig}
                disabled={!isAgentDirty || updateAgentConfig.isPending}
                className="h-9 px-4 text-sm"
              >
                {updateAgentConfig.isPending ? (
                  <Loader2 className="size-4 animate-spin mr-1.5" />
                ) : (
                  <Bot className="size-4 mr-1.5" />
                )}
                Save Agent Config
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
