// People — Condensed view for managing contacts across 30+ clients
// ATLAS section = just you (the operator)
// Client Contacts = unified searchable table with client filter

import DashboardLayout from "@/components/DashboardLayout";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, UserCircle, Building2, Phone,
  Plus, MessageCircle, Send, Search, Trash2,
  Loader2, Shield, Filter, ChevronDown,
  Mail, X,
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import LiveStatusDot from "@/components/LiveStatusDot";
import type { LiveStatus } from "@/components/LiveStatusDot";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

const MEMBER_TYPES = ["Internal", "External Partner", "Advisor"];
const FUNCTIONS = [
  "Finance & Capital", "Operations & Systems", "Operations",
  "Finance / Accounting", "People Ops / HR", "Investor Relations",
  "Legal", "Design", "Financial Modeling", "Strategy & Vision",
  "Technology", "Marketing", "Sales",
];

function TypeBadge({ type }: { type: string }) {
  const config: Record<string, string> = {
    "Internal": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    "External Partner": "bg-blue-500/10 text-blue-400 border-blue-500/20",
    "Advisor": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  };
  return (
    <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border", config[type] || config["Internal"])}>
      {type}
    </span>
  );
}

export default function OnboardPage() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [drawerMember, setDrawerMember] = useState<any>(null);

  // Add form state
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newFunc, setNewFunc] = useState("Operations");
  const [newType, setNewType] = useState("Internal");
  const [newNotes, setNewNotes] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newTelegram, setNewTelegram] = useState("");
  const [newWhatsapp, setNewWhatsapp] = useState("");
  const [newOrgId, setNewOrgId] = useState<string>("none");

  // Data queries
  const atlasTeamQ = trpc.team.listInternal.useQuery();
  const clientContactsQ = trpc.team.listByOrganization.useQuery();
  const orgsQ = trpc.organizations.list.useQuery();
  const liveStatusesQ = trpc.team.liveStatuses.useQuery(undefined, { refetchInterval: 30000 });
  const utils = trpc.useUtils();

  // Build a map of member id -> live status info
  const statusMap = useMemo(() => {
    const map = new Map<number, { liveStatus: LiveStatus; lastSeenAt: string | null; adminStatus: string | null }>();
    for (const s of liveStatusesQ.data || []) {
      map.set(s.id, { liveStatus: s.liveStatus as LiveStatus, lastSeenAt: s.lastSeenAt, adminStatus: s.adminStatus });
    }
    return map;
  }, [liveStatusesQ.data]);

  const createMember = trpc.team.create.useMutation({
    onSuccess: () => {
      toast.success("Contact added");
      setAddOpen(false);
      resetForm();
      utils.team.listInternal.invalidate();
      utils.team.listByOrganization.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMember = trpc.team.delete.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.name} removed`);
      setDeleteConfirm(null);
      setDrawerMember(null);
      utils.team.listInternal.invalidate();
      utils.team.listByOrganization.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  function resetForm() {
    setNewName(""); setNewRole(""); setNewFunc("Operations"); setNewType("Internal");
    setNewNotes(""); setNewEmail(""); setNewPhone(""); setNewTelegram(""); setNewWhatsapp("");
    setNewOrgId("none");
  }

  function handleAdd() {
    if (!newName.trim()) { toast.error("Name is required"); return; }
    if (newOrgId === "none") { toast.error("Please select a client"); return; }
    createMember.mutate({
      name: newName.trim(),
      role: newRole.trim() || undefined,
      memberFunction: newFunc,
      status: "Active",
      type: newType,
      organizationId: newOrgId === "none" ? null : parseInt(newOrgId),
      notes: newNotes.trim() || undefined,
      email: newEmail.trim() || undefined,
      phone: newPhone.trim() || undefined,
      telegram: newTelegram.trim() || undefined,
      whatsapp: newWhatsapp.trim() || undefined,
    });
  }

  // All client contacts, filtered
  const allContacts = useMemo(() => {
    const contacts = clientContactsQ.data || [];
    let filtered = contacts;

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.role?.toLowerCase().includes(q) ||
        c.orgName?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)
      );
    }

    // Client filter
    if (clientFilter !== "all") {
      filtered = filtered.filter(c => String(c.organizationId) === clientFilter);
    }

    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter(c => c.type === typeFilter);
    }

    return filtered;
  }, [clientContactsQ.data, search, clientFilter, typeFilter]);

  // Unique clients for the filter dropdown
  const clientOptions = useMemo(() => {
    const contacts = clientContactsQ.data || [];
    const map = new Map<string, string>();
    for (const c of contacts) {
      if (c.organizationId && c.orgName) {
        map.set(String(c.organizationId), c.orgName);
      }
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [clientContactsQ.data]);

  // Stats
  const atlasMembers = atlasTeamQ.data || [];
  const totalContacts = clientContactsQ.data?.length ?? 0;
  const uniqueClients = clientOptions.length;
  const isLoading = atlasTeamQ.isLoading || clientContactsQ.isLoading;

  const hasActiveFilters = clientFilter !== "all" || typeFilter !== "all" || search.trim() !== "";

  return (
    <DashboardLayout title="People" subtitle="CONTACTS & TEAM DIRECTORY">
      <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-5 pb-24 md:pb-6">

        {/* ── Your Profile (ATLAS Operator) ──────────────────────── */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="size-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">
                  {atlasMembers.length > 0 ? atlasMembers[0].name : "ATLAS Operator"}
                </span>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                  ATLAS
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {atlasMembers.length > 0 ? atlasMembers[0].role : "Founder & CEO"} · Managing {uniqueClients} client{uniqueClients !== 1 ? "s" : ""} · {totalContacts} contact{totalContacts !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>

        {/* ── Client Contacts Header ─────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Client Contacts</h2>
              <span className="text-[10px] font-mono text-muted-foreground">
                {allContacts.length}{hasActiveFilters ? ` of ${totalContacts}` : ""} contacts · {uniqueClients} clients
              </span>
            </div>
            <Button size="sm" className="text-xs h-8 gap-1.5" onClick={() => setAddOpen(true)}>
              <Plus className="size-3.5" />
              Add Contact
            </Button>
          </div>

          {/* Filters row */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, role, email..."
                className="h-8 text-xs pl-8"
              />
            </div>

            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="h-8 text-xs w-[180px]">
                <div className="flex items-center gap-1.5">
                  <Building2 className="size-3 text-muted-foreground" />
                  <SelectValue placeholder="All Clients" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {clientOptions.map(([id, name]) => (
                  <SelectItem key={id} value={id}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-8 text-xs w-[150px]">
                <div className="flex items-center gap-1.5">
                  <Filter className="size-3 text-muted-foreground" />
                  <SelectValue placeholder="All Types" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {MEMBER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground gap-1"
                onClick={() => { setSearch(""); setClientFilter("all"); setTypeFilter("all"); }}
              >
                <X className="size-3" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* ── Unified Contacts Table ─────────────────────────────── */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 rounded" />)}
            </div>
          ) : allContacts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="size-8 mx-auto mb-3 opacity-40" />
              <p className="text-sm">{hasActiveFilters ? "No contacts match your filters" : "No client contacts yet"}</p>
              <p className="text-xs mt-1">
                {hasActiveFilters ? "Try adjusting your search or filters" : "Add contacts to your client organizations"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Name</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Client</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground hidden md:table-cell">Role</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground hidden lg:table-cell">Function</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground hidden sm:table-cell">Type</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground hidden lg:table-cell">Contact</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground hidden md:table-cell">Status</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allContacts.map((member) => (
                    <TableRow
                      key={member.id}
                      className="cursor-pointer hover:bg-accent/30 group"
                      onClick={() => setDrawerMember(member)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="size-7 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] font-medium text-foreground">
                              {member.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <span className="text-xs font-medium text-foreground">{member.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 cursor-pointer hover:bg-blue-500/20 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (member.orgSlug) navigate(`/clients/${member.orgSlug}`);
                          }}
                        >
                          {member.orgName || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground hidden md:table-cell">
                        {member.role || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground hidden lg:table-cell">
                        {member.memberFunction || "—"}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <TypeBadge type={member.type || "Internal"} />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex items-center gap-1.5">
                          {member.email && (
                            <a
                              href={`mailto:${member.email}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-muted-foreground hover:text-blue-400 transition-colors"
                              title={member.email}
                            >
                              <Mail className="size-3.5" />
                            </a>
                          )}
                          {member.telegram && (
                            <a
                              href={`https://t.me/${member.telegram.replace("@", "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-muted-foreground hover:text-blue-400 transition-colors"
                              title={`Telegram: ${member.telegram}`}
                            >
                              <Send className="size-3.5" />
                            </a>
                          )}
                          {member.whatsapp && (
                            <a
                              href={`https://wa.me/${member.whatsapp.replace(/[^0-9]/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-muted-foreground hover:text-emerald-400 transition-colors"
                              title={`WhatsApp: ${member.whatsapp}`}
                            >
                              <MessageCircle className="size-3.5" />
                            </a>
                          )}
                          {member.phone && (
                            <a
                              href={`tel:${member.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-muted-foreground hover:text-amber-400 transition-colors"
                              title={member.phone}
                            >
                              <Phone className="size-3.5" />
                            </a>
                          )}
                          {!member.email && !member.telegram && !member.whatsapp && !member.phone && (
                            <span className="text-[10px] text-muted-foreground/50">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <LiveStatusDot
                          status={statusMap.get(member.id)?.liveStatus || "offline"}
                          lastSeenAt={statusMap.get(member.id)?.lastSeenAt}
                          showLabel
                        />
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirm(member.id); }}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-all p-1"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Results summary footer */}
          {allContacts.length > 0 && (
            <div className="px-4 py-2 border-t border-border flex items-center justify-between">
              <span className="text-[10px] font-mono text-muted-foreground">
                Showing {allContacts.length} of {totalContacts} contacts
              </span>
              {hasActiveFilters && (
                <span className="text-[10px] text-muted-foreground">
                  Filtered by: {clientFilter !== "all" ? clientOptions.find(([id]) => id === clientFilter)?.[1] : ""} {typeFilter !== "all" ? typeFilter : ""}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Member Detail Drawer ───────────────────────────────── */}
      <Sheet open={!!drawerMember} onOpenChange={(open) => !open && setDrawerMember(null)}>
        <SheetContent side="right" className="w-full sm:w-[400px] sm:max-w-[400px] bg-card border-border p-0">
          {drawerMember && (
            <>
              <SheetHeader className="px-4 pt-4 pb-3 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-secondary flex items-center justify-center">
                    <span className="text-sm font-medium text-foreground">
                      {drawerMember.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <SheetTitle className="text-sm font-semibold">{drawerMember.name}</SheetTitle>
                    <SheetDescription className="text-[10px] font-mono text-muted-foreground">
                      {drawerMember.role || "Contact"} {drawerMember.memberFunction ? `· ${drawerMember.memberFunction}` : ""}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-140px)]">
                <div className="p-4 space-y-4">
                  {/* Tags */}
                  <div className="flex flex-wrap gap-2">
                    <TypeBadge type={drawerMember.type || "Internal"} />
                    {drawerMember.orgName && (
                      <span
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 cursor-pointer hover:bg-blue-500/20 transition-colors"
                        onClick={() => {
                          if (drawerMember.orgSlug) {
                            setDrawerMember(null);
                            navigate(`/clients/${drawerMember.orgSlug}`);
                          }
                        }}
                      >
                        {drawerMember.orgName}
                      </span>
                    )}
                    <LiveStatusDot
                      status={statusMap.get(drawerMember.id)?.liveStatus || "offline"}
                      lastSeenAt={statusMap.get(drawerMember.id)?.lastSeenAt}
                      showLabel
                    />
                  </div>

                  {/* Notes */}
                  {drawerMember.notes && (
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1">Notes</span>
                      <p className="text-xs text-foreground bg-secondary/30 rounded-md p-2.5">{drawerMember.notes}</p>
                    </div>
                  )}

                  {/* Contact methods */}
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-2">Contact</span>
                    <div className="space-y-2">
                      {drawerMember.email && (
                        <a href={`mailto:${drawerMember.email}`} className="flex items-center gap-2.5 text-xs text-blue-400 hover:text-blue-300 transition-colors p-2 rounded-md hover:bg-secondary/30">
                          <Mail className="size-4 flex-shrink-0" />
                          <span>{drawerMember.email}</span>
                        </a>
                      )}
                      {drawerMember.telegram && (
                        <a href={`https://t.me/${drawerMember.telegram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-xs text-blue-400 hover:text-blue-300 transition-colors p-2 rounded-md hover:bg-secondary/30">
                          <Send className="size-4 flex-shrink-0" />
                          <span>Telegram: {drawerMember.telegram}</span>
                        </a>
                      )}
                      {drawerMember.whatsapp && (
                        <a href={`https://wa.me/${drawerMember.whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors p-2 rounded-md hover:bg-secondary/30">
                          <MessageCircle className="size-4 flex-shrink-0" />
                          <span>WhatsApp: {drawerMember.whatsapp}</span>
                        </a>
                      )}
                      {drawerMember.phone && (
                        <a href={`tel:${drawerMember.phone}`} className="flex items-center gap-2.5 text-xs text-amber-400 hover:text-amber-300 transition-colors p-2 rounded-md hover:bg-secondary/30">
                          <Phone className="size-4 flex-shrink-0" />
                          <span>{drawerMember.phone}</span>
                        </a>
                      )}
                      {!drawerMember.email && !drawerMember.telegram && !drawerMember.whatsapp && !drawerMember.phone && (
                        <p className="text-xs text-muted-foreground p-2">No contact methods on file.</p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-border">
                    <Button
                      variant="destructive"
                      size="sm"
                      className="text-xs gap-1.5"
                      onClick={() => setDeleteConfirm(drawerMember.id)}
                    >
                      <Trash2 className="size-3" />
                      Remove Contact
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Add Contact Dialog ─────────────────────────────────── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">Add Client Contact</DialogTitle>
            <DialogDescription className="text-[10px] font-mono">
              Add a contact to one of your client organizations
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs mb-1">Client *</Label>
              <Select value={newOrgId} onValueChange={setNewOrgId}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select a client..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" disabled>Select a client...</SelectItem>
                  {(orgsQ.data || []).map(org => (
                    <SelectItem key={org.id} value={String(org.id)}>{org.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1">Name *</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Full name" className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs mb-1">Role</Label>
              <Input value={newRole} onChange={(e) => setNewRole(e.target.value)} placeholder="e.g. Analyst, VP, Consultant" className="h-8 text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1">Function</Label>
                <Select value={newFunc} onValueChange={setNewFunc}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FUNCTIONS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1">Type</Label>
                <Select value={newType} onValueChange={setNewType}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MEMBER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1">Email</Label>
                <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="email@example.com" className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs mb-1">Phone</Label>
                <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="+1 555 000 0000" className="h-8 text-xs" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1">Telegram</Label>
                <Input value={newTelegram} onChange={(e) => setNewTelegram(e.target.value)} placeholder="@handle" className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs mb-1">WhatsApp</Label>
                <Input value={newWhatsapp} onChange={(e) => setNewWhatsapp(e.target.value)} placeholder="+1 555 000 0000" className="h-8 text-xs" />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1">Notes</Label>
              <Textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Optional notes..." className="text-xs min-h-[60px]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button size="sm" className="text-xs gap-1.5" onClick={handleAdd} disabled={createMember.isPending}>
              {createMember.isPending ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3.5" />}
              {createMember.isPending ? "Adding..." : "Add Contact"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ────────────────────────────────── */}
      <AlertDialog open={deleteConfirm !== null} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Contact</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this contact and their venture assignments. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteConfirm && deleteMember.mutate({ id: deleteConfirm })}
            >
              {deleteMember.isPending ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
