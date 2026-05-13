// Client Onboarding Wizard — Vision Spec v1 aligned
// Step 1: Client details (name, contact, phone, timezone, fiscal year, reporting cadence, AUM, sectors, tier)
// Step 2: Initial ventures (name, sector, location, stage, legalEntity, jurisdiction, nextMilestone, nextMilestoneDate)
// Step 3: Team invitations (name, email, role, escalationPriority, authorityLevel, timezone)
// Step 4: Agent configuration (toggles + thresholds)
// Step 5: Readiness checklist + "Launch Client" button

import DashboardLayout from "@/components/DashboardLayout";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { useState, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, User, Briefcase, Bot, Rocket,
  Plus, Trash2, ChevronRight, ChevronLeft,
  Check, Loader2, Mail, CheckCircle2, XCircle,
  Globe, DollarSign, Tag, Clock, Calendar,
  Shield, Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

const SECTORS = [
  "Real Estate", "Yacht", "F&B", "Entertainment", "Oil & Gas",
  "Technology", "Healthcare", "Finance", "Energy", "Others",
];

const TIERS = [
  { value: "poc", label: "POC", desc: "Proof of concept — limited features" },
  { value: "growth", label: "Growth", desc: "Full platform access" },
  { value: "enterprise", label: "Enterprise", desc: "Custom SLA + priority support" },
];

const STAGES = [
  "Sourcing", "Due Diligence", "Active", "Exiting", "Closed",
];

const TIMEZONES = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Phoenix", "America/Anchorage", "Pacific/Honolulu",
  "Europe/London", "Europe/Paris", "Europe/Berlin",
  "Asia/Dubai", "Asia/Singapore", "Asia/Tokyo",
  "Australia/Sydney",
];

const STEPS = [
  { id: 1, label: "Client Details", icon: Building2 },
  { id: 2, label: "Ventures", icon: Briefcase },
  { id: 3, label: "Team", icon: User },
  { id: 4, label: "Agents", icon: Bot },
  { id: 5, label: "Launch", icon: Rocket },
];

interface VentureEntry {
  name: string;
  sector: string;
  location: string;
  stage: string;
  legalEntity: string;
  jurisdiction: string;
  nextMilestone: string;
  nextMilestoneDate: string;
}

interface InviteEntry {
  name: string;
  email: string;
  role: "viewer" | "client" | "user" | "partner" | "manager" | "admin";
  escalationPriority: number;
  authorityLevel: string;
  timezone: string;
}

interface AgentConfig {
  velocityAgentEnabled: boolean;
  complianceAgentEnabled: boolean;
  dealFlowAgentEnabled: boolean;
  orchestratorEnabled: boolean;
  overdueDaysThreshold: number;
  distributionWarningDays: number;
  healthScoreAlertThreshold: number;
  pollingIntervalMinutes: number;
}

export default function OnboardingWizard() {
  const [, navigate] = useLocation();

  // Parse query params for resume flow (from Add Client dialog)
  const urlParams = new URLSearchParams(window.location.search);
  const resumeOrgId = urlParams.get("orgId") ? Number(urlParams.get("orgId")) : null;
  const resumeStep = urlParams.get("step") ? Number(urlParams.get("step")) : null;

  const [step, setStep] = useState(resumeStep && resumeStep >= 2 && resumeStep <= 5 ? resumeStep : 1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [preloaded, setPreloaded] = useState(false);

  // Step 1 state
  const [clientName, setClientName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [principalPhone, setPrincipalPhone] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [fiscalYearEnd, setFiscalYearEnd] = useState("12-31");
  const [reportingCadence, setReportingCadence] = useState("monthly");
  const [description, setDescription] = useState("");
  const [aumRange, setAumRange] = useState("");
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [tier, setTier] = useState<"poc" | "growth" | "enterprise">("poc");

  // Step 2 state
  const [ventures, setVentures] = useState<VentureEntry[]>([]);
  const [newVenture, setNewVenture] = useState<VentureEntry>({
    name: "", sector: "Others", location: "", stage: "Sourcing",
    legalEntity: "", jurisdiction: "", nextMilestone: "", nextMilestoneDate: "",
  });

  // Step 3 state
  const [invites, setInvites] = useState<InviteEntry[]>([]);
  const [newInvite, setNewInvite] = useState<InviteEntry>({
    name: "", email: "", role: "client", escalationPriority: 0,
    authorityLevel: "standard", timezone: "America/New_York",
  });

  // Step 4 state
  const [agentConfig, setAgentConfig] = useState<AgentConfig>({
    velocityAgentEnabled: true,
    complianceAgentEnabled: true,
    dealFlowAgentEnabled: true,
    orchestratorEnabled: true,
    overdueDaysThreshold: 7,
    distributionWarningDays: 14,
    healthScoreAlertThreshold: 30,
    pollingIntervalMinutes: 30,
  });

  // Created org ID (after step 1 submit, or from resume)
  const [createdOrgId, setCreatedOrgId] = useState<number | null>(resumeOrgId);

  // Pre-load org data when resuming from Add Client dialog
  const orgQuery = trpc.organizations.getById.useQuery(
    { id: resumeOrgId! },
    { enabled: !!resumeOrgId && !preloaded }
  );

  useEffect(() => {
    if (orgQuery.data && !preloaded) {
      const org = orgQuery.data;
      setClientName(org.name);
      setContactName(org.primaryContactName || "");
      setContactEmail(org.primaryContactEmail || "");
      setPrincipalPhone((org as any).principalPhone || "");
      setTimezone((org as any).timezone || "America/New_York");
      setFiscalYearEnd((org as any).fiscalYearEnd || "12-31");
      setReportingCadence((org as any).reportingCadence || "monthly");
      setDescription(org.description || "");
      setAumRange(org.aumRange || "");
      setSelectedSectors(org.sectors || []);
      setTier((org.subscriptionTier as "poc" | "growth" | "enterprise") || "poc");
      setPreloaded(true);
    }
  }, [orgQuery.data, preloaded]);

  // Readiness check for Step 5
  const readinessQuery = trpc.onboarding.readiness.useQuery(
    { organizationId: createdOrgId! },
    { enabled: step === 5 && !!createdOrgId, refetchOnWindowFocus: false }
  );

  // Mutations
  const createOrg = trpc.organizations.create.useMutation();
  const addVentures = trpc.organizations.addVentures.useMutation();
  const sendInvitations = trpc.organizations.sendInvitations.useMutation();
  const configureAgents = trpc.organizations.configureAgents.useMutation();
  const generateBlueprints = trpc.blueprints.generateStarterBlueprints.useMutation();
  const recalcHealth = trpc.blueprints.recalculateHealthScores.useMutation();

  const canProceed = useCallback(() => {
    if (step === 1) return clientName.trim().length > 0 && contactEmail.trim().length > 0 && selectedSectors.length > 0;
    if (step === 2) return true; // ventures optional but encouraged
    return true;
  }, [step, clientName, contactEmail, selectedSectors]);

  const updateOrg = trpc.organizations.update.useMutation();

  const handleNext = useCallback(async () => {
    if (step === 1) {
      setIsSubmitting(true);
      try {
        let orgId = createdOrgId;

        if (orgId) {
          // Resume flow: org already exists, update it with any changes
          await updateOrg.mutateAsync({
            id: orgId,
            name: clientName,
            description: description || undefined,
            primaryContactName: contactName || undefined,
            primaryContactEmail: contactEmail || undefined,
            aumRange: aumRange || undefined,
            sectors: selectedSectors.length > 0 ? selectedSectors : undefined,
            subscriptionTier: tier,
            principalPhone: principalPhone || undefined,
            timezone: timezone || undefined,
            fiscalYearEnd: fiscalYearEnd || undefined,
            reportingCadence: reportingCadence || undefined,
          });
          toast.success(`Client "${clientName}" updated`);
        } else {
          // Fresh flow: create new org
          const slug = clientName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
          const org = await createOrg.mutateAsync({
            name: clientName,
            slug,
            description: description || undefined,
            primaryContactName: contactName || undefined,
            primaryContactEmail: contactEmail || undefined,
            aumRange: aumRange || undefined,
            sectors: selectedSectors.length > 0 ? selectedSectors : undefined,
            subscriptionTier: tier,
            principalPhone: principalPhone || undefined,
            timezone: timezone || undefined,
            fiscalYearEnd: fiscalYearEnd || undefined,
            reportingCadence: reportingCadence || undefined,
          });
          orgId = org.id;
          setCreatedOrgId(org.id);
          toast.success(`Client "${clientName}" created`);
        }
        // Auto-generate starter blueprints for selected sectors
        if (selectedSectors.length > 0) {
          generateBlueprints.mutate(
            { organizationId: orgId!, sectors: selectedSectors },
            {
              onSuccess: (results) => {
                if (results.length > 0) {
                  toast.success(`Generated ${results.length} starter blueprint${results.length > 1 ? "s" : ""}`, {
                    description: results.map(r => `${r.sector}: ${r.stepCount} steps`).join(", "),
                  });
                }
              },
              onError: () => {},
            }
          );
        }
        setStep(2);
      } catch (e: any) {
        toast.error(e.message || "Failed to create client");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (step === 2 && ventures.length > 0 && createdOrgId) {
      setIsSubmitting(true);
      try {
        await addVentures.mutateAsync({
          organizationId: createdOrgId,
          ventures: ventures.map(v => ({
            name: v.name,
            sector: v.sector,
            location: v.location || undefined,
            stage: v.stage || undefined,
            legalEntity: v.legalEntity || undefined,
            jurisdiction: v.jurisdiction || undefined,
            nextMilestone: v.nextMilestone || undefined,
            nextMilestoneDate: v.nextMilestoneDate || undefined,
          })),
        });
        toast.success(`${ventures.length} venture(s) added`);
      } catch (e: any) {
        toast.error(e.message || "Failed to add ventures");
      } finally {
        setIsSubmitting(false);
      }
    }

    if (step === 3 && invites.length > 0 && createdOrgId) {
      setIsSubmitting(true);
      try {
        await sendInvitations.mutateAsync({
          organizationId: createdOrgId,
          invites,
        });
        toast.success(`${invites.length} invitation(s) queued`);
      } catch (e: any) {
        toast.error(e.message || "Failed to send invitations");
      } finally {
        setIsSubmitting(false);
      }
    }

    if (step === 4 && createdOrgId) {
      setIsSubmitting(true);
      try {
        await configureAgents.mutateAsync({
          organizationId: createdOrgId,
          ...agentConfig,
        });
        toast.success("Agent configuration saved");
      } catch (e: any) {
        toast.error(e.message || "Failed to configure agents");
      } finally {
        setIsSubmitting(false);
      }
    }

    if (step < 5) setStep(step + 1);
  }, [step, clientName, description, contactName, contactEmail, principalPhone, timezone, fiscalYearEnd, reportingCadence, aumRange, selectedSectors, tier, ventures, invites, agentConfig, createdOrgId, createOrg, updateOrg, addVentures, sendInvitations, configureAgents]);

  const runInitialDiagnostic = trpc.diagnostics.runDiagnostic.useMutation();

  const handleLaunch = useCallback(async () => {
    if (createdOrgId) {
      try {
        await recalcHealth.mutateAsync({ organizationId: createdOrgId });
      } catch { /* non-blocking */ }

      runInitialDiagnostic.mutate(
        { organizationId: createdOrgId },
        {
          onSuccess: () => {
            toast.success("Initial diagnostic complete", { description: "Structural health scores are now available." });
          },
          onError: () => {},
        }
      );
    }
    toast.success(`${clientName} is now live!`, { description: "Client portal is ready for access." });
    navigate("/dashboard");
  }, [clientName, createdOrgId, navigate, recalcHealth, runInitialDiagnostic]);

  const addVentureEntry = () => {
    if (!newVenture.name.trim()) return;
    setVentures(prev => [...prev, { ...newVenture }]);
    setNewVenture({
      name: "", sector: "Others", location: "", stage: "Sourcing",
      legalEntity: "", jurisdiction: "", nextMilestone: "", nextMilestoneDate: "",
    });
  };

  const removeVenture = (idx: number) => {
    setVentures(prev => prev.filter((_, i) => i !== idx));
  };

  const addInviteEntry = () => {
    if (!newInvite.name.trim() || !newInvite.email.trim()) return;
    setInvites(prev => [...prev, { ...newInvite }]);
    setNewInvite({ name: "", email: "", role: "client", escalationPriority: 0, authorityLevel: "standard", timezone: "America/New_York" });
  };

  const removeInvite = (idx: number) => {
    setInvites(prev => prev.filter((_, i) => i !== idx));
  };

  const toggleSector = (s: string) => {
    setSelectedSectors(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  };

  return (
    <DashboardLayout title="Client Onboarding">
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const isActive = step === s.id;
              const isDone = step > s.id;
              return (
                <div key={s.id} className="flex items-center gap-2">
                  <div className={cn(
                    "flex items-center justify-center size-8 rounded-full border-2 transition-all",
                    isDone ? "bg-primary border-primary text-primary-foreground" :
                    isActive ? "border-primary text-primary bg-primary/10" :
                    "border-border text-muted-foreground"
                  )}>
                    {isDone ? <Check className="size-4" /> : <Icon className="size-4" />}
                  </div>
                  <span className={cn(
                    "text-xs font-medium hidden sm:inline",
                    isActive ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {s.label}
                  </span>
                  {i < STEPS.length - 1 && (
                    <div className={cn(
                      "w-8 md:w-16 h-px mx-1",
                      isDone ? "bg-primary" : "bg-border"
                    )} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* ── Step 1: Client Details ──────────────────────────── */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Client Details</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Organization profile, principal contact, and reporting preferences.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="clientName">Organization Name *</Label>
                    <Input
                      id="clientName"
                      value={clientName}
                      onChange={e => setClientName(e.target.value)}
                      placeholder="e.g. Meridian Capital Group"
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="contactName">Principal Name *</Label>
                    <Input
                      id="contactName"
                      value={contactName}
                      onChange={e => setContactName(e.target.value)}
                      placeholder="Full name"
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="contactEmail">Principal Email *</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      value={contactEmail}
                      onChange={e => setContactEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="principalPhone">Principal Phone</Label>
                    <Input
                      id="principalPhone"
                      type="tel"
                      value={principalPhone}
                      onChange={e => setPrincipalPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label>Timezone *</Label>
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMEZONES.map(tz => (
                          <SelectItem key={tz} value={tz}>{tz.replace(/_/g, " ")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Fiscal Year End</Label>
                    <Select value={fiscalYearEnd} onValueChange={setFiscalYearEnd}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="03-31">March 31</SelectItem>
                        <SelectItem value="06-30">June 30</SelectItem>
                        <SelectItem value="09-30">September 30</SelectItem>
                        <SelectItem value="12-31">December 31</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Reporting Cadence</Label>
                    <Select value={reportingCadence} onValueChange={setReportingCadence}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="biweekly">Biweekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Brief description of the client..."
                      className="mt-1.5"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="aum">AUM Range</Label>
                    <Select value={aumRange} onValueChange={setAumRange}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Select range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="<1M">Under $1M</SelectItem>
                        <SelectItem value="1M-10M">$1M – $10M</SelectItem>
                        <SelectItem value="10M-50M">$10M – $50M</SelectItem>
                        <SelectItem value="50M-100M">$50M – $100M</SelectItem>
                        <SelectItem value="100M+">$100M+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Subscription Tier</Label>
                    <div className="flex gap-2 mt-1.5">
                      {TIERS.map(t => (
                        <button
                          key={t.value}
                          onClick={() => setTier(t.value as typeof tier)}
                          className={cn(
                            "flex-1 rounded-md border p-3 text-left transition-all",
                            tier === t.value
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/30"
                          )}
                        >
                          <span className="text-xs font-semibold text-foreground">{t.label}</span>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{t.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <Label>Sectors *</Label>
                    <p className="text-[10px] text-muted-foreground mb-1.5">Select at least one sector to generate starter blueprints</p>
                    <div className="flex flex-wrap gap-2">
                      {SECTORS.map(s => (
                        <Badge
                          key={s}
                          variant={selectedSectors.includes(s) ? "default" : "outline"}
                          className="cursor-pointer transition-all"
                          onClick={() => toggleSector(s)}
                        >
                          {s}
                        </Badge>
                      ))}
                    </div>
                    {selectedSectors.length === 0 && (
                      <p className="text-[10px] text-amber-400 mt-1.5">At least one sector is required</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 2: Ventures ────────────────────────────────── */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Initial Ventures</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add ventures with stage, legal entity, and milestone data. Each venture needs a stage and next milestone for agent activation.
                  </p>
                </div>

                {/* Add form */}
                <div className="bg-card border border-border rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      value={newVenture.name}
                      onChange={e => setNewVenture(p => ({ ...p, name: e.target.value }))}
                      placeholder="Venture name *"
                    />
                    <Select
                      value={newVenture.sector}
                      onValueChange={v => setNewVenture(p => ({ ...p, sector: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SECTORS.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={newVenture.location}
                      onChange={e => setNewVenture(p => ({ ...p, location: e.target.value }))}
                      placeholder="Location (e.g. Dubai, UAE)"
                    />
                    <Select
                      value={newVenture.stage}
                      onValueChange={v => setNewVenture(p => ({ ...p, stage: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Stage" />
                      </SelectTrigger>
                      <SelectContent>
                        {STAGES.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={newVenture.legalEntity}
                      onChange={e => setNewVenture(p => ({ ...p, legalEntity: e.target.value }))}
                      placeholder="Legal entity name"
                    />
                    <Input
                      value={newVenture.jurisdiction}
                      onChange={e => setNewVenture(p => ({ ...p, jurisdiction: e.target.value }))}
                      placeholder="Jurisdiction (e.g. Delaware, Cayman)"
                    />
                    <Input
                      value={newVenture.nextMilestone}
                      onChange={e => setNewVenture(p => ({ ...p, nextMilestone: e.target.value }))}
                      placeholder="Next milestone description"
                    />
                    <Input
                      type="date"
                      value={newVenture.nextMilestoneDate}
                      onChange={e => setNewVenture(p => ({ ...p, nextMilestoneDate: e.target.value }))}
                      placeholder="Milestone date"
                    />
                  </div>
                  <Button onClick={addVentureEntry} disabled={!newVenture.name.trim()} className="w-full">
                    <Plus className="size-4 mr-1" /> Add Venture
                  </Button>
                </div>

                {/* List */}
                {ventures.length > 0 && (
                  <div className="bg-card border border-border rounded-lg divide-y divide-border">
                    {ventures.map((v, i) => (
                      <div key={i} className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Briefcase className="size-4 text-muted-foreground flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground">{v.name}</span>
                              <Badge variant="outline" className="text-[10px]">{v.stage}</Badge>
                              <span className="text-xs text-muted-foreground">{v.sector}</span>
                            </div>
                            <div className="flex items-center gap-3 mt-0.5">
                              {v.location && <span className="text-[10px] text-muted-foreground">{v.location}</span>}
                              {v.legalEntity && <span className="text-[10px] text-muted-foreground">· {v.legalEntity}</span>}
                              {v.nextMilestone && <span className="text-[10px] text-muted-foreground">· {v.nextMilestone}</span>}
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeVenture(i)}>
                          <Trash2 className="size-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {ventures.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Briefcase className="size-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No ventures added yet.</p>
                    <p className="text-xs mt-1">At least 1 venture is required for agent activation.</p>
                  </div>
                )}
              </div>
            )}

            {/* ── Step 3: Team Invitations ────────────────────────── */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Team Invitations</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Invite team members. At least one member must have Escalation Priority = 1 for agent activation.
                  </p>
                </div>

                {/* Add form */}
                <div className="bg-card border border-border rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      value={newInvite.name}
                      onChange={e => setNewInvite(p => ({ ...p, name: e.target.value }))}
                      placeholder="Full name *"
                    />
                    <Input
                      type="email"
                      value={newInvite.email}
                      onChange={e => setNewInvite(p => ({ ...p, email: e.target.value }))}
                      placeholder="email@example.com *"
                    />
                    <Select
                      value={newInvite.role}
                      onValueChange={v => setNewInvite(p => ({ ...p, role: v as InviteEntry["role"] }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">Viewer</SelectItem>
                        <SelectItem value="client">Client</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={String(newInvite.escalationPriority)}
                      onValueChange={v => setNewInvite(p => ({ ...p, escalationPriority: Number(v) }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Escalation Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">No escalation</SelectItem>
                        <SelectItem value="1">Priority 1 (first contact)</SelectItem>
                        <SelectItem value="2">Priority 2 (backup)</SelectItem>
                        <SelectItem value="3">Priority 3 (tertiary)</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={newInvite.authorityLevel}
                      onValueChange={v => setNewInvite(p => ({ ...p, authorityLevel: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Authority Level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="elevated">Elevated</SelectItem>
                        <SelectItem value="full">Full Authority</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={newInvite.timezone}
                      onValueChange={v => setNewInvite(p => ({ ...p, timezone: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMEZONES.map(tz => (
                          <SelectItem key={tz} value={tz}>{tz.replace(/_/g, " ")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={addInviteEntry} disabled={!newInvite.name.trim() || !newInvite.email.trim()} className="w-full">
                    <Plus className="size-4 mr-1" /> Add Team Member
                  </Button>
                </div>

                {/* List */}
                {invites.length > 0 && (
                  <div className="bg-card border border-border rounded-lg divide-y divide-border">
                    {invites.map((inv, i) => (
                      <div key={i} className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Mail className="size-4 text-muted-foreground" />
                          <div>
                            <span className="text-sm font-medium text-foreground capitalize">{inv.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">{inv.email}</span>
                          </div>
                          <Badge variant="outline" className="text-[10px]">{inv.role}</Badge>
                          {inv.escalationPriority > 0 && (
                            <Badge variant="default" className="text-[10px] bg-amber-500/20 text-amber-400 border-amber-500/30">
                              ESC {inv.escalationPriority}
                            </Badge>
                          )}
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeInvite(i)}>
                          <Trash2 className="size-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {invites.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <User className="size-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No invitations added yet.</p>
                    <p className="text-xs mt-1">At least one member with Escalation Priority 1 is required.</p>
                  </div>
                )}
              </div>
            )}

            {/* ── Step 4: Agent Configuration ─────────────────────── */}
            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Agent Configuration</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Configure which AI agents are active and their thresholds for this client.
                  </p>
                </div>

                <div className="bg-card border border-border rounded-lg p-4 space-y-5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Agent Toggles</h3>
                  <div className="space-y-3">
                    {[
                      { key: "velocityAgentEnabled" as const, label: "Velocity Agent", desc: "Monitors venture stage progression. Flags stalls at 30d (Sourcing), 60d (DD), 90d (Exiting). Never advances Exiting/Closed without Principal confirmation." },
                      { key: "complianceAgentEnabled" as const, label: "Overdue Agent", desc: "Tracks every task deadline. Escalates: 24h warning → 48h critical → 72h Principal alert. Handles blocked tasks with immediate escalation." },
                      { key: "dealFlowAgentEnabled" as const, label: "Distribution Sentinel", desc: "Monitors distribution timelines: 30d draft notice → 14d LP recipients → 7d wire instructions → 3d Principal confirmation → 0d execute." },
                      { key: "orchestratorEnabled" as const, label: "Orchestrator", desc: "Synthesizes all agent signals into weekly executive briefings. Detects cross-venture risks and generates portfolio-level insights." },
                    ].map(agent => (
                      <div key={agent.key} className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium text-foreground">{agent.label}</span>
                          <p className="text-xs text-muted-foreground">{agent.desc}</p>
                        </div>
                        <Switch
                          checked={agentConfig[agent.key]}
                          onCheckedChange={v => setAgentConfig(p => ({ ...p, [agent.key]: v }))}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-card border border-border rounded-lg p-4 space-y-5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Thresholds</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm">Overdue Days Threshold</Label>
                        <span className="text-xs font-mono text-muted-foreground">{agentConfig.overdueDaysThreshold} days</span>
                      </div>
                      <Slider
                        value={[agentConfig.overdueDaysThreshold]}
                        onValueChange={([v]) => setAgentConfig(p => ({ ...p, overdueDaysThreshold: v }))}
                        min={1} max={30} step={1}
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm">Distribution Warning Days</Label>
                        <span className="text-xs font-mono text-muted-foreground">{agentConfig.distributionWarningDays} days</span>
                      </div>
                      <Slider
                        value={[agentConfig.distributionWarningDays]}
                        onValueChange={([v]) => setAgentConfig(p => ({ ...p, distributionWarningDays: v }))}
                        min={1} max={60} step={1}
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm">Health Score Alert Threshold</Label>
                        <span className="text-xs font-mono text-muted-foreground">{agentConfig.healthScoreAlertThreshold}%</span>
                      </div>
                      <Slider
                        value={[agentConfig.healthScoreAlertThreshold]}
                        onValueChange={([v]) => setAgentConfig(p => ({ ...p, healthScoreAlertThreshold: v }))}
                        min={0} max={100} step={5}
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm">Polling Interval</Label>
                        <span className="text-xs font-mono text-muted-foreground">{agentConfig.pollingIntervalMinutes} min</span>
                      </div>
                      <Slider
                        value={[agentConfig.pollingIntervalMinutes]}
                        onValueChange={([v]) => setAgentConfig(p => ({ ...p, pollingIntervalMinutes: v }))}
                        min={5} max={120} step={5}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 5: Readiness Checklist + Launch ────────────── */}
            {step === 5 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Launch Readiness</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    All 11 items must pass before agents can activate for this client.
                  </p>
                </div>

                {/* Summary card */}
                <div className="bg-card border border-border rounded-lg p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center size-10 rounded-lg bg-primary/10">
                      <Building2 className="size-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">{clientName}</h3>
                      <p className="text-xs text-muted-foreground">
                        {tier.toUpperCase()} tier · {aumRange || "AUM not set"} · {timezone}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-border">
                    <div className="text-center">
                      <span className="text-xl font-semibold font-mono text-foreground">{ventures.length}</span>
                      <p className="text-[10px] text-muted-foreground">Ventures</p>
                    </div>
                    <div className="text-center">
                      <span className="text-xl font-semibold font-mono text-foreground">{invites.length}</span>
                      <p className="text-[10px] text-muted-foreground">Invitations</p>
                    </div>
                    <div className="text-center">
                      <span className="text-xl font-semibold font-mono text-foreground">{selectedSectors.length}</span>
                      <p className="text-[10px] text-muted-foreground">Sectors</p>
                    </div>
                    <div className="text-center">
                      <span className="text-xl font-semibold font-mono text-foreground">
                        {Object.values(agentConfig).filter(v => v === true).length}
                      </span>
                      <p className="text-[10px] text-muted-foreground">Active Agents</p>
                    </div>
                  </div>
                </div>

                {/* Readiness checklist */}
                <div className="bg-card border border-border rounded-lg p-5 space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-foreground">Onboarding Readiness Checklist</h3>
                    {readinessQuery.data && (
                      <Badge
                        variant={readinessQuery.data.ready ? "default" : "outline"}
                        className={cn(
                          "text-xs",
                          readinessQuery.data.ready
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                        )}
                      >
                        {readinessQuery.data.passedCount}/{readinessQuery.data.totalCount} passed
                      </Badge>
                    )}
                  </div>

                  {readinessQuery.isLoading && (
                    <div className="flex items-center gap-2 py-4 justify-center text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      <span className="text-sm">Checking readiness...</span>
                    </div>
                  )}

                  {readinessQuery.data && readinessQuery.data.items.map(item => (
                    <div key={item.id} className="flex items-start gap-3 py-2">
                      {item.passed ? (
                        <CheckCircle2 className="size-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                      ) : (
                        <XCircle className="size-4 text-amber-400 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <span className={cn(
                          "text-sm font-medium",
                          item.passed ? "text-foreground" : "text-amber-400"
                        )}>
                          {item.label}
                        </span>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.detail}</p>
                      </div>
                    </div>
                  ))}

                  {readinessQuery.data && !readinessQuery.data.ready && (
                    <div className="pt-3 border-t border-border">
                      <p className="text-xs text-amber-400">
                        Some items are incomplete. You can still launch, but agents will not activate until all items pass.
                        You can complete missing items from the client detail pages after launch.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-8 pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={() => step > 1 && setStep(step - 1)}
            disabled={step === 1}
          >
            <ChevronLeft className="size-4 mr-1" /> Back
          </Button>

          <div className="flex items-center gap-2">
            {step >= 2 && step <= 4 && (
              <Button
                variant="ghost"
                onClick={() => setStep(step + 1)}
                className="text-muted-foreground"
              >
                Skip
              </Button>
            )}

            {step < 5 ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed() || isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="size-4 mr-1 animate-spin" />
                ) : (
                  <ChevronRight className="size-4 mr-1" />
                )}
                {step === 1 ? "Create & Continue" : "Next"}
              </Button>
            ) : (
              <Button
                onClick={handleLaunch}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Rocket className="size-4 mr-1" /> Launch Client
              </Button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
