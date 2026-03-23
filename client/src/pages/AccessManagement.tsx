// ============================================================================
// Access Management — Organizations, Invitations, API Keys
// Closed-circle access control for Aurovia/ATLAS partnerships
// ============================================================================

import DashboardLayout from "@/components/DashboardLayout";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import {
  Building2,
  Mail,
  Key,
  Plus,
  Shield,
  Users,
  Copy,
  Ban,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Eye,
  Pencil,
  Trash2,
  Send,
  RefreshCw,
  ChevronRight,
  Globe,
} from "lucide-react";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";

type Tab = "organizations" | "invitations" | "apikeys";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "organizations", label: "Organizations", icon: <Building2 className="size-4" /> },
  { id: "invitations", label: "Invitations", icon: <Mail className="size-4" /> },
  { id: "apikeys", label: "API Keys", icon: <Key className="size-4" /> },
];

const ORG_TYPE_COLORS: Record<string, string> = {
  core: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  partner: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  client: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

const INVITE_STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode }> = {
  pending: { color: "bg-amber-500/10 text-amber-400", icon: <Clock className="size-3" /> },
  accepted: { color: "bg-emerald-500/10 text-emerald-400", icon: <CheckCircle2 className="size-3" /> },
  expired: { color: "bg-zinc-500/10 text-zinc-400", icon: <XCircle className="size-3" /> },
  revoked: { color: "bg-red-500/10 text-red-400", icon: <Ban className="size-3" /> },
};

const KEY_STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode }> = {
  active: { color: "bg-emerald-500/10 text-emerald-400", icon: <CheckCircle2 className="size-3" /> },
  revoked: { color: "bg-red-500/10 text-red-400", icon: <Ban className="size-3" /> },
};

export default function AccessManagement() {
  const [tab, setTab] = useState<Tab>("organizations");

  // ── Stats ──────────────────────────────────────────────────────────
  const stats = trpc.access.getStats.useQuery();

  const STAT_CARDS = [
    { label: "Organizations", value: stats.data?.organizations ?? 0, icon: <Building2 className="size-4" />, color: "text-blue-400" },
    { label: "Pending Invites", value: stats.data?.pendingInvitations ?? 0, icon: <Mail className="size-4" />, color: "text-amber-400" },
    { label: "Active API Keys", value: stats.data?.activeKeys ?? 0, icon: <Key className="size-4" />, color: "text-emerald-400" },
    { label: "Total Invitations", value: stats.data?.invitations ?? 0, icon: <Send className="size-4" />, color: "text-purple-400" },
  ];

  return (
    <DashboardLayout title="Access Management" subtitle="CLOSED-CIRCLE CONTROL">
      <div className="p-4 md:p-6 space-y-6 pb-24 md:pb-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {STAT_CARDS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className="bg-card border border-border rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-medium">{s.label}</span>
                <span className={cn("opacity-60", s.color)}>{s.icon}</span>
              </div>
              <span className="text-2xl font-semibold tracking-tight text-foreground font-mono">{s.value}</span>
            </motion.div>
          ))}
        </div>

        {/* Tab Bar */}
        <div className="flex gap-1 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap min-h-[44px]",
                tab === t.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent/50"
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === "organizations" && <OrganizationsTab />}
        {tab === "invitations" && <InvitationsTab />}
        {tab === "apikeys" && <ApiKeysTab />}
      </div>
    </DashboardLayout>
  );
}

// ════════════════════════════════════════════════════════════════════════
// Organizations Tab
// ════════════════════════════════════════════════════════════════════════

function OrganizationsTab() {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"core" | "partner" | "client">("partner");
  const [newDesc, setNewDesc] = useState("");

  const orgs = trpc.access.listOrganizations.useQuery();
  const createOrg = trpc.access.createOrganization.useMutation({
    onSuccess: () => {
      toast.success("Organization created");
      orgs.refetch();
      setShowCreate(false);
      setNewName("");
      setNewDesc("");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateOrg = trpc.access.updateOrganization.useMutation({
    onSuccess: () => {
      toast.success("Organization updated");
      orgs.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Partner Organizations</h2>
        <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5 min-h-[36px]">
          <Plus className="size-3.5" />
          <span className="hidden sm:inline">Add Organization</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      {/* Org List */}
      <div className="space-y-3">
        {orgs.data?.map((org, i) => (
          <motion.div
            key={org.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-card border border-border rounded-lg p-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center size-10 rounded-lg bg-primary/10">
                  <Building2 className="size-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{org.name}</span>
                    <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded border", ORG_TYPE_COLORS[org.type])}>
                      {org.type.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[11px] text-muted-foreground">
                      <Users className="size-3 inline mr-1" />{org.memberCount} members
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      <Globe className="size-3 inline mr-1" />{org.ventureCount} ventures
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-[10px] font-medium px-2 py-1 rounded",
                  org.status === "active" ? "bg-emerald-500/10 text-emerald-400" :
                  org.status === "suspended" ? "bg-amber-500/10 text-amber-400" :
                  "bg-zinc-500/10 text-zinc-400"
                )}>
                  {org.status.toUpperCase()}
                </span>
                {org.status === "active" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs min-h-[36px]"
                    onClick={() => updateOrg.mutate({ id: org.id, status: "suspended" })}
                  >
                    Suspend
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs min-h-[36px]"
                    onClick={() => updateOrg.mutate({ id: org.id, status: "active" })}
                  >
                    Activate
                  </Button>
                )}
              </div>
            </div>
            {org.description && (
              <p className="text-xs text-muted-foreground mt-2 pl-[52px]">{org.description}</p>
            )}
          </motion.div>
        ))}

        {orgs.data?.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Building2 className="size-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No organizations yet</p>
            <p className="text-xs mt-1">Create your first partner organization to start inviting members</p>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Organization</DialogTitle>
            <DialogDescription>Add a new partner organization to the circle</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Name</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., Aurovia, ATLAS Capital"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Type</label>
              <Select value={newType} onValueChange={(v) => setNewType(v as typeof newType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="core">Core (Internal)</SelectItem>
                  <SelectItem value="partner">Partner</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Description (optional)</label>
              <Input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Brief description..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button
              onClick={() => createOrg.mutate({ name: newName, type: newType, description: newDesc || undefined })}
              disabled={!newName.trim() || createOrg.isPending}
            >
              {createOrg.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// Invitations Tab
// ════════════════════════════════════════════════════════════════════════

function InvitationsTab() {
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState("");
  const [orgId, setOrgId] = useState<string>("");
  const [role, setRole] = useState<string>("user");
  const [expiresInDays, setExpiresInDays] = useState(30);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);

  const invites = trpc.access.listInvitations.useQuery();
  const orgs = trpc.access.listOrganizations.useQuery();

  const sendInvite = trpc.access.sendInvitation.useMutation({
    onSuccess: (data) => {
      toast.success("Invitation sent");
      setGeneratedToken(data.token);
      invites.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const revokeInvite = trpc.access.revokeInvitation.useMutation({
    onSuccess: () => {
      toast.success("Invitation revoked");
      invites.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/?invite=${token}`;
    navigator.clipboard.writeText(link);
    toast.success("Invite link copied to clipboard");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Invitations</h2>
        <Button size="sm" onClick={() => { setShowInvite(true); setGeneratedToken(null); }} className="gap-1.5 min-h-[36px]">
          <Send className="size-3.5" />
          <span className="hidden sm:inline">Send Invitation</span>
          <span className="sm:hidden">Invite</span>
        </Button>
      </div>

      {/* Invitations List */}
      <div className="bg-card border border-border rounded-lg divide-y divide-border">
        {invites.data?.map((invite, i) => {
          const sc = INVITE_STATUS_CONFIG[invite.status] ?? INVITE_STATUS_CONFIG.pending;
          return (
            <motion.div
              key={invite.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-foreground">{invite.email}</span>
                  <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded flex items-center gap-1", sc.color)}>
                    {sc.icon}
                    {invite.status.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="text-[10px] text-muted-foreground">{invite.orgName ?? "Unknown Org"}</span>
                  <span className="text-[10px] text-muted-foreground">Role: {invite.role}</span>
                  <span className="text-[10px] text-muted-foreground">
                    By: {invite.invitedByName}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    Expires: {new Date(invite.expiresAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {invite.status === "pending" && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs min-h-[36px] gap-1"
                      onClick={() => copyInviteLink(invite.token)}
                    >
                      <Copy className="size-3" />
                      Copy Link
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs min-h-[36px] text-red-400 hover:text-red-300"
                      onClick={() => revokeInvite.mutate({ id: invite.id })}
                    >
                      Revoke
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          );
        })}

        {invites.data?.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Mail className="size-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No invitations sent yet</p>
            <p className="text-xs mt-1">Send an invitation to add someone to the circle</p>
          </div>
        )}
      </div>

      {/* Send Invitation Dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Send Invitation</DialogTitle>
            <DialogDescription>Invite a partner to access the Royalton System</DialogDescription>
          </DialogHeader>

          {generatedToken ? (
            <div className="space-y-4 py-2">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 text-center">
                <CheckCircle2 className="size-8 mx-auto mb-2 text-emerald-400" />
                <p className="text-sm font-medium text-emerald-400">Invitation Created</p>
                <p className="text-xs text-muted-foreground mt-1">Share this link with the invitee</p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground mb-1">Invitation Link</p>
                <code className="text-xs text-foreground break-all font-mono">
                  {window.location.origin}/?invite={generatedToken}
                </code>
              </div>
              <Button
                className="w-full gap-2"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/?invite=${generatedToken}`);
                  toast.success("Link copied!");
                }}
              >
                <Copy className="size-4" />
                Copy Invitation Link
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Email Address</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="partner@example.com"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Organization</label>
                  <Select value={orgId} onValueChange={setOrgId}>
                    <SelectTrigger><SelectValue placeholder="Select organization" /></SelectTrigger>
                    <SelectContent>
                      {orgs.data?.map((org) => (
                        <SelectItem key={org.id} value={String(org.id)}>{org.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Role</label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Viewer (Read-only)</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                      <SelectItem value="user">User (Standard)</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Expires In (days)</label>
                  <Select value={String(expiresInDays)} onValueChange={(v) => setExpiresInDays(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="60">60 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowInvite(false)}>Cancel</Button>
                <Button
                  onClick={() => sendInvite.mutate({
                    email,
                    organizationId: Number(orgId),
                    role: role as "viewer" | "client" | "user" | "manager" | "admin",
                    expiresInDays,
                  })}
                  disabled={!email.trim() || !orgId || sendInvite.isPending}
                >
                  {sendInvite.isPending ? "Sending..." : "Send Invitation"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// API Keys Tab
// ════════════════════════════════════════════════════════════════════════

function ApiKeysTab() {
  const keys = trpc.access.listApiKeys.useQuery();

  const revokeKey = trpc.access.revokeApiKey.useMutation({
    onSuccess: () => {
      toast.success("API key revoked");
      keys.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">API Keys</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">48-character keys are generated when invitations are accepted</p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="size-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-medium text-blue-400">API Key Security</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            API keys are shown only once when generated. Only the prefix (first 10 characters) is stored for identification.
            Keys are hashed with SHA-256 before storage.
          </p>
        </div>
      </div>

      {/* Keys List */}
      <div className="bg-card border border-border rounded-lg divide-y divide-border">
        {keys.data?.map((key, i) => {
          const sc = KEY_STATUS_CONFIG[key.status] ?? KEY_STATUS_CONFIG.active;
          return (
            <motion.div
              key={key.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <code className="text-xs font-mono text-foreground bg-secondary/50 px-1.5 py-0.5 rounded">
                    {key.keyPrefix}...
                  </code>
                  <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded flex items-center gap-1", sc.color)}>
                    {sc.icon}
                    {key.status.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="text-[10px] text-muted-foreground">{key.userName ?? "Unknown"}</span>
                  <span className="text-[10px] text-muted-foreground">{key.orgName ?? "No Org"}</span>
                  <span className="text-[10px] text-muted-foreground">{key.label}</span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    Created: {new Date(key.createdAt).toLocaleDateString()}
                  </span>
                  {key.lastUsedAt && (
                    <span className="text-[10px] font-mono text-muted-foreground">
                      Last used: {new Date(key.lastUsedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              {key.status === "active" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs min-h-[36px] text-red-400 hover:text-red-300"
                  onClick={() => revokeKey.mutate({ id: key.id })}
                >
                  <Ban className="size-3 mr-1" />
                  Revoke
                </Button>
              )}
            </motion.div>
          );
        })}

        {keys.data?.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Key className="size-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No API keys generated yet</p>
            <p className="text-xs mt-1">Keys are automatically created when invitations are accepted</p>
          </div>
        )}
      </div>
    </div>
  );
}
