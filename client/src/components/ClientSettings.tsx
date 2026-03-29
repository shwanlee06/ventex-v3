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
import { Loader2, Save, User, Mail, DollarSign, Tag, Crown, CalendarDays, Shield, Bot, X, Plus } from "lucide-react";
import { Switch } from "@/components/ui/switch";

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
  const agentConfigQ = trpc.organizations.getAgentConfig?.useQuery?.(
    { organizationId: orgId },
    { enabled: !!orgId }
  );

  const updateOrg = trpc.organizations.update.useMutation({
    onSuccess: () => {
      toast.success("Client settings updated");
      utils.organizations.bySlug.invalidate({ slug: orgSlug });
      utils.organizations.listWithMetrics.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  // Form state
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [aumRange, setAumRange] = useState("");
  const [sectors, setSectors] = useState<string[]>([]);
  const [tier, setTier] = useState("poc");
  const [renewalDate, setRenewalDate] = useState("");
  const [newSector, setNewSector] = useState("");

  // Populate form when org data loads
  useEffect(() => {
    if (org) {
      setName(org.name || "");
      setContactName(org.primaryContactName || "");
      setContactEmail(org.primaryContactEmail || "");
      setAumRange(org.aumRange || "");
      setSectors(org.sectors || []);
      setTier(org.subscriptionTier || "poc");
      setRenewalDate(org.renewalDate || "");
    }
  }, [org]);

  // Track if form is dirty
  const isDirty = useMemo(() => {
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

  const handleSave = () => {
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

  const addSector = (sector: string) => {
    if (sector && !sectors.includes(sector)) {
      setSectors([...sectors, sector]);
    }
    setNewSector("");
  };

  const removeSector = (sector: string) => {
    setSectors(sectors.filter(s => s !== sector));
  };

  if (!org) return null;

  return (
    <div className="space-y-6">
      {/* Section: Client Information */}
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

      {/* Section: Financial & Tier */}
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

      {/* Section: Sectors */}
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

      {/* Section: Status & Access */}
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

      {/* Save button */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <span className={cn(
          "text-[11px] transition-opacity",
          isDirty ? "text-amber-400 opacity-100" : "text-muted-foreground opacity-0"
        )}>
          Unsaved changes
        </span>
        <Button
          onClick={handleSave}
          disabled={!isDirty || updateOrg.isPending}
          className="h-9 px-4 text-sm"
        >
          {updateOrg.isPending ? (
            <Loader2 className="size-4 animate-spin mr-1.5" />
          ) : (
            <Save className="size-4 mr-1.5" />
          )}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
