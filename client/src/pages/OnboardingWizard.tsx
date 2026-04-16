// Client Onboarding Wizard — 5-step admin-only flow
// Step 1: Client details (name, contact, AUM, sectors, tier)
// Step 2: Initial ventures (add form + skip)
// Step 3: Team invitations (name, email, role + skip)
// Step 4: Agent configuration (toggles + thresholds)
// Step 5: Confirmation summary + "Launch Client" button

import DashboardLayout from "@/components/DashboardLayout";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, User, Briefcase, Bot, Rocket,
  Plus, Trash2, ChevronRight, ChevronLeft,
  Check, ArrowRight, Loader2, Mail,
  Globe, DollarSign, Tag,
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
}

interface InviteEntry {
  name: string;
  email: string;
  role: "viewer" | "client" | "user" | "partner" | "manager" | "admin";
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
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1 state
  const [clientName, setClientName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [description, setDescription] = useState("");
  const [aumRange, setAumRange] = useState("");
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [tier, setTier] = useState<"poc" | "growth" | "enterprise">("poc");

  // Step 2 state
  const [ventures, setVentures] = useState<VentureEntry[]>([]);
  const [newVenture, setNewVenture] = useState<VentureEntry>({ name: "", sector: "Others", location: "" });

  // Step 3 state
  const [invites, setInvites] = useState<InviteEntry[]>([]);
  const [newInvite, setNewInvite] = useState<InviteEntry>({ name: "", email: "", role: "client" });

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

  // Created org ID (after step 1 submit)
  const [createdOrgId, setCreatedOrgId] = useState<number | null>(null);

  // Mutations
  const createOrg = trpc.organizations.create.useMutation();
  const addVentures = trpc.organizations.addVentures.useMutation();
  const sendInvitations = trpc.organizations.sendInvitations.useMutation();
  const configureAgents = trpc.organizations.configureAgents.useMutation();
  const generateBlueprints = trpc.blueprints.generateStarterBlueprints.useMutation();
  const recalcHealth = trpc.blueprints.recalculateHealthScores.useMutation();

  const canProceed = useCallback(() => {
    if (step === 1) return clientName.trim().length > 0 && selectedSectors.length > 0;
    return true; // Steps 2-4 are optional (skip allowed)
  }, [step, clientName, selectedSectors]);

  const handleNext = useCallback(async () => {
    if (step === 1) {
      // Create org
      setIsSubmitting(true);
      try {
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
        });
        setCreatedOrgId(org.id);
        toast.success(`Client "${clientName}" created`);
        // Connection 1: Auto-generate starter blueprints for selected sectors
        if (selectedSectors.length > 0) {
          generateBlueprints.mutate(
            { organizationId: org.id, sectors: selectedSectors },
            {
              onSuccess: (results) => {
                if (results.length > 0) {
                  toast.success(`Generated ${results.length} starter blueprint${results.length > 1 ? "s" : ""}`, {
                    description: results.map(r => `${r.sector}: ${r.stepCount} steps`).join(", "),
                  });
                }
              },
              onError: () => {
                // Non-blocking — blueprints can be created later from the Blueprints tab
              },
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
  }, [step, clientName, description, contactName, contactEmail, aumRange, selectedSectors, tier, ventures, invites, agentConfig, createdOrgId, createOrg, addVentures, sendInvitations, configureAgents]);

  const runInitialDiagnostic = trpc.diagnostics.runDiagnostic.useMutation();

  const handleLaunch = useCallback(async () => {
    // Connection 4: Recalculate health scores on launch
    if (createdOrgId) {
      try {
        await recalcHealth.mutateAsync({ organizationId: createdOrgId });
      } catch { /* non-blocking */ }

      // Connection 5: Run initial structural diagnostic
      runInitialDiagnostic.mutate(
        { organizationId: createdOrgId },
        {
          onSuccess: () => {
            toast.success("Initial diagnostic complete", { description: "Structural health scores are now available." });
          },
          onError: () => { /* non-blocking — can be run later from Diagnostics tab */ },
        }
      );
    }
    toast.success(`${clientName} is now live!`, { description: "Client portal is ready for access." });
    navigate("/dashboard");
  }, [clientName, createdOrgId, navigate, recalcHealth, runInitialDiagnostic]);

  const addVentureEntry = () => {
    if (!newVenture.name.trim()) return;
    setVentures(prev => [...prev, { ...newVenture }]);
    setNewVenture({ name: "", sector: "Others", location: "" });
  };

  const removeVenture = (idx: number) => {
    setVentures(prev => prev.filter((_, i) => i !== idx));
  };

  const addInviteEntry = () => {
    if (!newInvite.name.trim() || !newInvite.email.trim()) return;
    setInvites(prev => [...prev, { ...newInvite }]);
    setNewInvite({ name: "", email: "", role: "client" });
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
                    Basic information about the new client organization.
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
                    <Label htmlFor="contactName">Primary Contact</Label>
                    <Input
                      id="contactName"
                      value={contactName}
                      onChange={e => setContactName(e.target.value)}
                      placeholder="Full name"
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="contactEmail">Contact Email</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      value={contactEmail}
                      onChange={e => setContactEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="mt-1.5"
                    />
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
                    Add ventures for this client. You can skip and add later.
                  </p>
                </div>

                {/* Add form */}
                <div className="bg-card border border-border rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Input
                      value={newVenture.name}
                      onChange={e => setNewVenture(p => ({ ...p, name: e.target.value }))}
                      placeholder="Venture name"
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
                    <div className="flex gap-2">
                      <Input
                        value={newVenture.location}
                        onChange={e => setNewVenture(p => ({ ...p, location: e.target.value }))}
                        placeholder="Location"
                      />
                      <Button size="icon" onClick={addVentureEntry} disabled={!newVenture.name.trim()}>
                        <Plus className="size-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* List */}
                {ventures.length > 0 && (
                  <div className="bg-card border border-border rounded-lg divide-y divide-border">
                    {ventures.map((v, i) => (
                      <div key={i} className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Briefcase className="size-4 text-muted-foreground" />
                          <div>
                            <span className="text-sm font-medium text-foreground">{v.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">{v.sector}</span>
                            {v.location && (
                              <span className="text-xs text-muted-foreground ml-2">· {v.location}</span>
                            )}
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
                    <p className="text-sm">No ventures added yet. You can skip this step.</p>
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
                    Invite team members to the client portal. They will receive an email with a secure link.
                  </p>
                </div>

                {/* Add form */}
                <div className="bg-card border border-border rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <Input
                      value={newInvite.name}
                      onChange={e => setNewInvite(p => ({ ...p, name: e.target.value }))}
                      placeholder="Full name"
                    />
                    <Input
                      type="email"
                      value={newInvite.email}
                      onChange={e => setNewInvite(p => ({ ...p, email: e.target.value }))}
                      placeholder="email@example.com"
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
                    <Button onClick={addInviteEntry} disabled={!newInvite.name.trim() || !newInvite.email.trim()}>
                      <Plus className="size-4 mr-1" /> Add
                    </Button>
                  </div>
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
                    <p className="text-sm">No invitations added yet. You can skip this step.</p>
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
                      { key: "velocityAgentEnabled" as const, label: "Velocity Agent", desc: "Monitors task completion rates, identifies bottlenecks, and calculates real-time velocity scores for each venture. Sends alerts when progress stalls." },
                      { key: "complianceAgentEnabled" as const, label: "Overdue Agent", desc: "Tracks every task deadline across all ventures. Escalates after 24h (warning) and 48h (critical). Auto-drafts follow-up emails to responsible parties." },
                      { key: "dealFlowAgentEnabled" as const, label: "Distribution Sentinel", desc: "Watches capital distribution schedules and investor payment timelines. Flags missed or late distributions before they become compliance issues." },
                      { key: "orchestratorEnabled" as const, label: "Orchestrator", desc: "The master coordinator. Synthesizes signals from all agents into executive briefs, prioritizes actions, and ensures nothing falls through the cracks." },
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

            {/* ── Step 5: Confirmation ────────────────────────────── */}
            {step === 5 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Launch Summary</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Review the configuration before launching the client portal.
                  </p>
                </div>

                <div className="bg-card border border-border rounded-lg p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center size-10 rounded-lg bg-primary/10">
                      <Building2 className="size-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">{clientName}</h3>
                      <p className="text-xs text-muted-foreground">
                        {tier.toUpperCase()} tier · {aumRange || "AUM not set"}
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

                  {contactName && (
                    <div className="pt-3 border-t border-border">
                      <p className="text-xs text-muted-foreground">
                        Primary contact: <span className="text-foreground capitalize">{contactName}</span>
                        {contactEmail && <span className="ml-1">({contactEmail})</span>}
                      </p>
                    </div>
                  )}

                  {selectedSectors.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedSectors.map(s => (
                        <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>
                      ))}
                    </div>
                  )}

                  {ventures.length > 0 && (
                    <div className="pt-3 border-t border-border">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Ventures</p>
                      <div className="space-y-1">
                        {ventures.map((v, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className="size-1 rounded-full bg-primary" />
                            <span className="text-foreground">{v.name}</span>
                            <span className="text-muted-foreground">{v.sector}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {invites.length > 0 && (
                    <div className="pt-3 border-t border-border">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Team Invitations</p>
                      <div className="space-y-1">
                        {invites.map((inv, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <Mail className="size-3 text-muted-foreground" />
                            <span className="text-foreground capitalize">{inv.name}</span>
                            <span className="text-muted-foreground">{inv.email}</span>
                            <Badge variant="outline" className="text-[9px]">{inv.role}</Badge>
                          </div>
                        ))}
                      </div>
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
