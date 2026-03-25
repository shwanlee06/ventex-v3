// ============================================================================
// People & Teams — Two clear sections:
// 1. ATLAS Team — Aurovia/ATLAS internal members (no org)
// 2. Client Contacts — grouped by client organization
// ============================================================================

import DashboardLayout from "@/components/DashboardLayout";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, UserCircle, Building2, Phone,
  Plus, MessageCircle, Send, ChevronDown, ChevronRight,
  Search, Trash2, Pencil, Loader2, Shield,
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
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

type Tab = "atlas" | "clients";

const MEMBER_TYPES = ["Internal", "External Partner", "Advisor"];
const FUNCTIONS = [
  "Finance & Capital", "Operations & Systems", "Operations",
  "Finance / Accounting", "People Ops / HR", "Investor Relations",
  "Legal", "Design", "Financial Modeling", "Strategy & Vision",
  "Technology", "Marketing", "Sales",
];

function MemberTypeBadge({ type }: { type: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    "Internal": { bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-400" },
    "External Partner": { bg: "bg-blue-500/10 border-blue-500/20", text: "text-blue-400" },
    "Advisor": { bg: "bg-amber-500/10 border-amber-500/20", text: "text-amber-400" },
  };
  const c = config[type] || config["Internal"];
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border", c.bg, c.text)}>
      {type}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = status === "Active" ? "bg-emerald-500/10 text-emerald-400" :
    status === "Advisor" ? "bg-amber-500/10 text-amber-400" :
    "bg-secondary text-muted-foreground";
  return <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", color)}>{status}</span>;
}

export default function OnboardPage() {
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<Tab>("atlas");
  const [search, setSearch] = useState("");
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
  const [newOrgId, setNewOrgId] = useState<string>("none"); // "none" = ATLAS internal

  // Data queries
  const atlasTeamQ = trpc.team.listInternal.useQuery();
  const clientContactsQ = trpc.team.listByOrganization.useQuery();
  const orgsQ = trpc.organizations.list.useQuery();
  const utils = trpc.useUtils();

  const createMember = trpc.team.create.useMutation({
    onSuccess: () => {
      toast.success("Member added");
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

  // Filter ATLAS team by search
  const atlasTeam = useMemo(() => {
    const members = atlasTeamQ.data || [];
    if (!search.trim()) return members;
    const q = search.toLowerCase();
    return members.filter(m =>
      m.name.toLowerCase().includes(q) ||
      m.role?.toLowerCase().includes(q) ||
      m.memberFunction?.toLowerCase().includes(q)
    );
  }, [atlasTeamQ.data, search]);

  // Group client contacts by org
  const clientContactsByOrg = useMemo(() => {
    const contacts = clientContactsQ.data || [];
    const q = search.toLowerCase();
    const filtered = q
      ? contacts.filter(c =>
          c.name.toLowerCase().includes(q) ||
          c.role?.toLowerCase().includes(q) ||
          c.orgName?.toLowerCase().includes(q)
        )
      : contacts;

    const grouped: Record<string, { orgName: string; orgSlug: string | null; orgId: number | null; members: typeof filtered }> = {};
    for (const c of filtered) {
      const key = c.orgName || "Unassigned";
      if (!grouped[key]) {
        grouped[key] = { orgName: key, orgSlug: c.orgSlug, orgId: c.organizationId, members: [] };
      }
      grouped[key].members.push(c);
    }
    return Object.values(grouped).sort((a, b) => a.orgName.localeCompare(b.orgName));
  }, [clientContactsQ.data, search]);

  const totalAtlas = atlasTeamQ.data?.length ?? 0;
  const totalClientContacts = clientContactsQ.data?.length ?? 0;
  const isLoading = atlasTeamQ.isLoading || clientContactsQ.isLoading;

  const TABS: { id: Tab; label: string; count: number; icon: React.ReactNode }[] = [
    { id: "atlas", label: "ATLAS Team", count: totalAtlas, icon: <Shield className="size-4" /> },
    { id: "clients", label: "Client Contacts", count: totalClientContacts, icon: <Building2 className="size-4" /> },
  ];

  return (
    <DashboardLayout title="People & Teams" subtitle="ATLAS TEAM & CLIENT CONTACTS">
      <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 pb-24 md:pb-6">
        {/* Summary metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {isLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />) : [
            { label: "ATLAS Members", value: totalAtlas, icon: <Shield className="size-4 text-primary" /> },
            { label: "Client Contacts", value: totalClientContacts, icon: <Building2 className="size-4 text-blue-400" /> },
            { label: "Client Orgs", value: clientContactsByOrg.length, icon: <Users className="size-4 text-emerald-400" /> },
            { label: "Total People", value: totalAtlas + totalClientContacts, icon: <UserCircle className="size-4 text-amber-400" /> },
          ].map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className="bg-card border border-border rounded-lg p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                {m.icon}
                <span className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-medium">{m.label}</span>
              </div>
              <span className="text-2xl font-mono font-semibold text-foreground">{m.value}</span>
            </motion.div>
          ))}
        </div>

        {/* Tab bar + search + add */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-1">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                  tab === t.id
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t.icon}
                <span>{t.label}</span>
                <span className={cn(
                  "text-[10px] font-mono px-1.5 py-0.5 rounded",
                  tab === t.id ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
                )}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search people..."
                className="h-8 text-xs pl-8"
              />
            </div>
            <Button size="sm" className="text-xs h-8 min-h-[32px] gap-1.5" onClick={() => {
              setNewOrgId(tab === "atlas" ? "none" : "none");
              setAddOpen(true);
            }}>
              <Plus className="size-3.5" />
              <span className="hidden sm:inline">Add {tab === "atlas" ? "Member" : "Contact"}</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        </div>

        {/* ATLAS Team Tab */}
        <AnimatePresence mode="wait">
          {tab === "atlas" && (
            <motion.div
              key="atlas"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="size-4 text-primary" />
                    <h2 className="text-sm font-semibold text-foreground">ATLAS / Aurovia Team</h2>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">{atlasTeam.length} members</span>
                </div>

                {isLoading ? (
                  <div className="p-6 space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded" />)}
                  </div>
                ) : atlasTeam.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="size-8 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">{search ? "No members match your search" : "No ATLAS team members yet"}</p>
                    <p className="text-xs mt-1">Add your first ATLAS team member to get started</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Name</TableHead>
                          <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Role</TableHead>
                          <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground hidden md:table-cell">Function</TableHead>
                          <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground hidden sm:table-cell">Type</TableHead>
                          <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Status</TableHead>
                          <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {atlasTeam.map((member) => (
                          <TableRow
                            key={member.id}
                            className="cursor-pointer hover:bg-accent/30 group"
                            onClick={() => setDrawerMember(member)}
                          >
                            <TableCell>
                              <div>
                                <span className="text-xs text-foreground font-medium">{member.name}</span>
                                {member.email && (
                                  <p className="text-[10px] text-muted-foreground mt-0.5">{member.email}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{member.role || "—"}</TableCell>
                            <TableCell className="text-xs text-muted-foreground hidden md:table-cell">{member.memberFunction || "—"}</TableCell>
                            <TableCell className="hidden sm:table-cell"><MemberTypeBadge type={member.type || "Internal"} /></TableCell>
                            <TableCell><StatusBadge status={member.status || "Active"} /></TableCell>
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
              </div>
            </motion.div>
          )}

          {/* Client Contacts Tab */}
          {tab === "clients" && (
            <motion.div
              key="clients"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-lg" />)}
                </div>
              ) : clientContactsByOrg.length === 0 ? (
                <div className="bg-card border border-border rounded-lg text-center py-12 text-muted-foreground">
                  <Building2 className="size-8 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">{search ? "No contacts match your search" : "No client contacts yet"}</p>
                  <p className="text-xs mt-1">Add contacts to your client organizations</p>
                </div>
              ) : (
                clientContactsByOrg.map((group) => (
                  <ClientOrgGroup
                    key={group.orgName}
                    orgName={group.orgName}
                    orgSlug={group.orgSlug}
                    members={group.members}
                    onMemberClick={setDrawerMember}
                    onDeleteClick={setDeleteConfirm}
                    onNavigate={navigate}
                  />
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Member Detail Drawer */}
      <Sheet open={!!drawerMember} onOpenChange={(open) => !open && setDrawerMember(null)}>
        <SheetContent side="right" className="w-[420px] sm:max-w-[420px] bg-card border-border p-0">
          {drawerMember && (
            <>
              <SheetHeader className="px-4 pt-4 pb-3 border-b border-border">
                <SheetTitle className="text-sm font-semibold">{drawerMember.name}</SheetTitle>
                <SheetDescription className="text-[10px] font-mono text-muted-foreground">
                  {drawerMember.role || "Member"} {drawerMember.memberFunction ? `· ${drawerMember.memberFunction}` : ""}
                </SheetDescription>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-140px)]">
                <div className="p-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1">Type</span>
                      <MemberTypeBadge type={drawerMember.type || "Internal"} />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1">Status</span>
                      <StatusBadge status={drawerMember.status || "Active"} />
                    </div>
                    {drawerMember.organizationId && (
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1">Client</span>
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">
                          {drawerMember.orgName || "Client"}
                        </span>
                      </div>
                    )}
                    {!drawerMember.organizationId && (
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1">Org</span>
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                          ATLAS
                        </span>
                      </div>
                    )}
                  </div>

                  {drawerMember.notes && (
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1">Notes</span>
                      <p className="text-xs text-foreground bg-secondary/30 rounded-md p-2">{drawerMember.notes}</p>
                    </div>
                  )}

                  {/* Contact methods */}
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-2">Contact</span>
                    <div className="space-y-2">
                      {drawerMember.email && (
                        <a href={`mailto:${drawerMember.email}`} className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition-colors">
                          <Phone className="size-3.5" />
                          <span>Email: {drawerMember.email}</span>
                        </a>
                      )}
                      {drawerMember.telegram && (
                        <a
                          href={`https://t.me/${drawerMember.telegram.replace("@", "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          <Send className="size-3.5" />
                          <span>Telegram: {drawerMember.telegram}</span>
                        </a>
                      )}
                      {drawerMember.whatsapp && (
                        <a
                          href={`https://wa.me/${drawerMember.whatsapp.replace(/[^0-9]/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                        >
                          <MessageCircle className="size-3.5" />
                          <span>WhatsApp: {drawerMember.whatsapp}</span>
                        </a>
                      )}
                      {drawerMember.phone && (
                        <a href={`tel:${drawerMember.phone}`} className="flex items-center gap-2 text-xs text-amber-400 hover:text-amber-300 transition-colors">
                          <Phone className="size-3.5" />
                          <span>Phone: {drawerMember.phone}</span>
                        </a>
                      )}
                      {!drawerMember.email && !drawerMember.telegram && !drawerMember.whatsapp && !drawerMember.phone && (
                        <p className="text-xs text-muted-foreground">No contact methods on file.</p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-border flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      className="text-xs gap-1.5"
                      onClick={() => setDeleteConfirm(drawerMember.id)}
                    >
                      <Trash2 className="size-3" />
                      Remove
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Add Member Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">Add {newOrgId === "none" ? "ATLAS Team Member" : "Client Contact"}</DialogTitle>
            <DialogDescription className="text-[10px] font-mono">
              {newOrgId === "none" ? "Add an Aurovia/ATLAS internal team member" : "Add a contact to a client organization"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs mb-1">Assign To</Label>
              <Select value={newOrgId} onValueChange={setNewOrgId}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">ATLAS / Aurovia (Internal)</SelectItem>
                  {(orgsQ.data || []).map(org => (
                    <SelectItem key={org.id} value={String(org.id)}>{org.name} (Client)</SelectItem>
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
            <Button size="sm" className="text-xs gap-1.5" onClick={handleAdd} disabled={createMember.isPending}>
              {createMember.isPending ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3.5" />}
              {createMember.isPending ? "Adding..." : "Add Member"}
            </Button>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setAddOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirm !== null} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this person and their venture assignments. This action cannot be undone.
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

// ════════════════════════════════════════════════════════════════════════
// Client Org Group — Collapsible section for each client's contacts
// ════════════════════════════════════════════════════════════════════════

function ClientOrgGroup({
  orgName,
  orgSlug,
  members,
  onMemberClick,
  onDeleteClick,
  onNavigate,
}: {
  orgName: string;
  orgSlug: string | null;
  members: any[];
  onMemberClick: (m: any) => void;
  onDeleteClick: (id: number) => void;
  onNavigate: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 border-b border-border flex items-center justify-between hover:bg-accent/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Building2 className="size-4 text-blue-400" />
          <h3 className="text-sm font-semibold text-foreground">{orgName}</h3>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">
            {members.length} {members.length === 1 ? "contact" : "contacts"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {orgSlug && (
            <span
              onClick={(e) => { e.stopPropagation(); onNavigate(`/clients/${orgSlug}`); }}
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              View Client →
            </span>
          )}
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="size-4 text-muted-foreground" />
          </motion.div>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Name</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Role</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground hidden md:table-cell">Function</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground hidden sm:table-cell">Type</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Status</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow
                      key={member.id}
                      className="cursor-pointer hover:bg-accent/30 group"
                      onClick={() => onMemberClick(member)}
                    >
                      <TableCell>
                        <div>
                          <span className="text-xs text-foreground font-medium">{member.name}</span>
                          {member.email && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">{member.email}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{member.role || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground hidden md:table-cell">{member.memberFunction || "—"}</TableCell>
                      <TableCell className="hidden sm:table-cell"><MemberTypeBadge type={member.type || "Internal"} /></TableCell>
                      <TableCell><StatusBadge status={member.status || "Active"} /></TableCell>
                      <TableCell>
                        <button
                          onClick={(e) => { e.stopPropagation(); onDeleteClick(member.id); }}
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
