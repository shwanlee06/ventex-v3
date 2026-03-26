// ============================================================================
// ATLAS Team — Dedicated page for internal ATLAS/Aurovia team members
// Shows all internal operators, their roles, functions, venture assignments,
// contact info, and status — separate from client contacts
// ============================================================================

import DashboardLayout from "@/components/DashboardLayout";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { motion } from "framer-motion";
import {
  Shield, Users, Search, Plus, Trash2,
  Loader2, Mail, Phone, MessageCircle, Send,
  Briefcase, MapPin, ChevronRight, X, Copy, Check, Link2,
  Linkedin, Edit2, UserCircle, Camera, ArrowUp, ArrowDown, GripVertical,
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
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import LiveStatusDot from "@/components/LiveStatusDot";
import type { LiveStatus } from "@/components/LiveStatusDot";
import { useState, useMemo, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

const FUNCTIONS = [
  "Strategy & Vision", "Finance & Capital", "Operations & Systems",
  "Operations", "Finance / Accounting", "People Ops / HR",
  "Investor Relations", "Legal", "Design", "Financial Modeling",
  "Technology", "Marketing", "Sales",
];

// Removed static StatusDot — now using LiveStatusDot component

export default function AtlasTeam() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [drawerMember, setDrawerMember] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);

  // Form state
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newFunc, setNewFunc] = useState("Operations");
  const [newNotes, setNewNotes] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newTelegram, setNewTelegram] = useState("");
  const [newWhatsapp, setNewWhatsapp] = useState("");
  const [newLinkedin, setNewLinkedin] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newSystemRole, setNewSystemRole] = useState<string>("partner");
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editFunc, setEditFunc] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editTelegram, setEditTelegram] = useState("");
  const [editWhatsapp, setEditWhatsapp] = useState("");
  const [editLinkedin, setEditLinkedin] = useState("");
  const [editLocation, setEditLocation] = useState("");

  // Data queries
  const atlasTeamQ = trpc.team.listInternal.useQuery();
  const ventureAssignmentsQ = trpc.team.ventureAssignments.useQuery();
  const liveStatusesQ = trpc.team.liveStatuses.useQuery(undefined, { refetchInterval: 30000 }); // poll every 30s
  const utils = trpc.useUtils();

  const uploadAvatar = trpc.team.uploadAvatar.useMutation({
    onSuccess: (data) => {
      toast.success("Avatar uploaded");
      utils.team.listInternal.invalidate();
      if (drawerMember) {
        setDrawerMember({ ...drawerMember, avatarUrl: data.avatarUrl });
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const reorderMembers = trpc.team.reorder.useMutation({
    onSuccess: () => {
      utils.team.listInternal.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const resendInvitation = trpc.team.resendInvitation.useMutation({
    onSuccess: () => {
      toast.success("Invitation resent");
      utils.team.listInternal.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !drawerMember) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadAvatar.mutate({
        memberId: drawerMember.id,
        base64,
        mimeType: file.type,
        filename: file.name,
      });
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  }, [drawerMember, uploadAvatar]);

  const handleMoveUp = useCallback((memberId: number) => {
    const all = atlasTeamQ.data || [];
    const idx = all.findIndex(m => m.id === memberId);
    if (idx <= 0) return;
    const items = all.map((m, i) => ({ id: m.id, sortOrder: i * 10 }));
    // Swap
    const temp = items[idx].sortOrder;
    items[idx].sortOrder = items[idx - 1].sortOrder;
    items[idx - 1].sortOrder = temp;
    reorderMembers.mutate({ items });
  }, [atlasTeamQ.data, reorderMembers]);

  const handleMoveDown = useCallback((memberId: number) => {
    const all = atlasTeamQ.data || [];
    const idx = all.findIndex(m => m.id === memberId);
    if (idx < 0 || idx >= all.length - 1) return;
    const items = all.map((m, i) => ({ id: m.id, sortOrder: i * 10 }));
    // Swap
    const temp = items[idx].sortOrder;
    items[idx].sortOrder = items[idx + 1].sortOrder;
    items[idx + 1].sortOrder = temp;
    reorderMembers.mutate({ items });
  }, [atlasTeamQ.data, reorderMembers]);

  const setAdminStatus = trpc.team.setAdminStatus.useMutation({
    onSuccess: () => {
      toast.success("Status updated");
      utils.team.liveStatuses.invalidate();
      utils.team.listInternal.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  // Build a map of member id -> live status info
  const statusMap = useMemo(() => {
    const map = new Map<number, { liveStatus: LiveStatus; lastSeenAt: string | null; adminStatus: string | null }>();
    for (const s of liveStatusesQ.data || []) {
      map.set(s.id, { liveStatus: s.liveStatus as LiveStatus, lastSeenAt: s.lastSeenAt, adminStatus: s.adminStatus });
    }
    return map;
  }, [liveStatusesQ.data]);

  const createMember = trpc.team.create.useMutation({
    onSuccess: (data) => {
      if (data.inviteToken) {
        const link = `${window.location.origin}/accept-invite?token=${encodeURIComponent(data.inviteToken)}`;
        setLastInviteLink(link);
        setLinkCopied(false);
        toast.success("ATLAS member added — invitation link ready to share");
      } else {
        toast.success("ATLAS member added");
        setAddOpen(false);
        resetForm();
      }
      utils.team.listInternal.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMember = trpc.team.update.useMutation({
    onSuccess: () => {
      toast.success("Member updated");
      setEditMode(false);
      utils.team.listInternal.invalidate();
      // Refresh drawer data
      if (drawerMember) {
        const updated = atlasTeamQ.data?.find(m => m.id === drawerMember.id);
        if (updated) setDrawerMember(updated);
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMember = trpc.team.delete.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.name} removed`);
      setDeleteConfirm(null);
      setDrawerMember(null);
      utils.team.listInternal.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  function resetForm() {
    setNewName(""); setNewRole(""); setNewFunc("Operations");
    setNewNotes(""); setNewEmail(""); setNewPhone("");
    setNewTelegram(""); setNewWhatsapp(""); setNewLinkedin(""); setNewLocation("");
    setNewSystemRole("partner");
  }

  function handleAdd() {
    if (!newName.trim()) { toast.error("Name is required"); return; }
    createMember.mutate({
      name: newName.trim(),
      role: newRole.trim() || undefined,
      memberFunction: newFunc,
      status: "Active",
      type: "Internal",
      organizationId: null, // ATLAS internal = null org
      notes: newNotes.trim() || undefined,
      email: newEmail.trim() || undefined,
      phone: newPhone.trim() || undefined,
      telegram: newTelegram.trim() || undefined,
      whatsapp: newWhatsapp.trim() || undefined,
      linkedin: newLinkedin.trim() || undefined,
      location: newLocation.trim() || undefined,
      systemRole: newEmail.trim() ? (newSystemRole as any) : undefined,
      origin: window.location.origin,
    });
  }

  function handleEdit() {
    if (!drawerMember) return;
    updateMember.mutate({
      id: drawerMember.id,
      name: editName.trim() || undefined,
      role: editRole.trim() || undefined,
      memberFunction: editFunc || undefined,
      notes: editNotes.trim() || undefined,
      email: editEmail.trim() || undefined,
      phone: editPhone.trim() || undefined,
      telegram: editTelegram.trim() || undefined,
      whatsapp: editWhatsapp.trim() || undefined,
      linkedin: editLinkedin.trim() || undefined,
      location: editLocation.trim() || undefined,
    });
  }

  function openEditMode(member: any) {
    setEditName(member.name || "");
    setEditRole(member.role || "");
    setEditFunc(member.memberFunction || "");
    setEditNotes(member.notes || "");
    setEditEmail(member.email || "");
    setEditPhone(member.phone || "");
    setEditTelegram(member.telegram || "");
    setEditWhatsapp(member.whatsapp || "");
    setEditLinkedin(member.linkedin || "");
    setEditLocation(member.location || "");
    setEditMode(true);
  }

  // Get venture assignments per member
  const memberVentures = useMemo(() => {
    const assignments = ventureAssignmentsQ.data || [];
    const map = new Map<number, { ventureName: string; responsibility: string | null; ventureId: number }[]>();
    for (const a of assignments) {
      if (!map.has(a.memberId)) map.set(a.memberId, []);
      map.get(a.memberId)!.push({
        ventureName: a.ventureName || "Unknown",
        responsibility: a.responsibility,
        ventureId: a.ventureId,
      });
    }
    return map;
  }, [ventureAssignmentsQ.data]);

  // Filter members
  const members = useMemo(() => {
    const all = atlasTeamQ.data || [];
    // Filter out test data
    const real = all.filter(m => !m.name.startsWith("Test "));
    if (!search.trim()) return real;
    const q = search.toLowerCase();
    return real.filter(m =>
      m.name.toLowerCase().includes(q) ||
      m.role?.toLowerCase().includes(q) ||
      m.memberFunction?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q)
    );
  }, [atlasTeamQ.data, search]);

  const isLoading = atlasTeamQ.isLoading;

  return (
    <DashboardLayout title="ATLAS Team" subtitle="INTERNAL TEAM DIRECTORY">
      <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-5 pb-24 md:pb-6">

        {/* ── Stats Bar ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)
          ) : (
            <>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="bg-card border border-border rounded-lg p-3"
              >
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Total Members</span>
                <div className="text-xl font-semibold text-foreground font-mono mt-1">{members.length}</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-card border border-border rounded-lg p-3"
              >
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Online Now</span>
                <div className="text-xl font-semibold text-emerald-400 font-mono mt-1">
                  {members.filter(m => statusMap.get(m.id)?.liveStatus === "online").length}
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-card border border-border rounded-lg p-3"
              >
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Functions</span>
                <div className="text-xl font-semibold text-foreground font-mono mt-1">
                  {new Set(members.map(m => m.memberFunction).filter(Boolean)).size}
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-card border border-border rounded-lg p-3"
              >
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Venture Assignments</span>
                <div className="text-xl font-semibold text-blue-400 font-mono mt-1">
                  {ventureAssignmentsQ.data?.filter(a => members.some(m => m.id === a.memberId)).length || 0}
                </div>
              </motion.div>
            </>
          )}
        </div>

        {/* ── Header + Actions ───────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">ATLAS Members</h2>
            <span className="text-[10px] font-mono text-muted-foreground">
              {members.length} member{members.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial sm:w-[220px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search members..."
                className="h-8 text-xs pl-8"
              />
            </div>
            <Button size="sm" className="text-xs h-8 gap-1.5" onClick={() => setAddOpen(true)}>
              <Plus className="size-3.5" />
              Add Member
            </Button>
          </div>
        </div>

        {/* ── Members Table ──────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 rounded" />)}
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Shield className="size-8 mx-auto mb-3 opacity-40" />
              <p className="text-sm">{search ? "No members match your search" : "No ATLAS team members yet"}</p>
              <p className="text-xs mt-1">Add internal team members to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Member</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Role</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground hidden md:table-cell">Function</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground hidden lg:table-cell">Ventures</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground hidden sm:table-cell">Contact</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground hidden md:table-cell">Status</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member, i) => {
                    const ventures = memberVentures.get(member.id) || [];
                    return (
                      <motion.tr
                        key={member.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="cursor-pointer hover:bg-accent/30 group border-b border-border last:border-0"
                        onClick={() => { setDrawerMember(member); setEditMode(false); }}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            {member.avatarUrl ? (
                              <img
                                src={member.avatarUrl}
                                alt={member.name}
                                className="size-8 rounded-full object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <span className="text-[11px] font-semibold text-primary">
                                  {member.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-medium text-foreground">{member.name}</span>
                                {member.invitationStatus === "pending" && (
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-amber-500/30 text-amber-400 bg-amber-500/10">Invited</Badge>
                                )}
                                {member.invitationStatus === "accepted" && (
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-emerald-500/30 text-emerald-400 bg-emerald-500/10">Active</Badge>
                                )}
                                {member.invitationStatus === "expired" && (
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-red-500/30 text-red-400 bg-red-500/10">Expired</Badge>
                                )}
                                {member.systemRole && (
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-primary/30 text-primary/70">{member.systemRole}</Badge>
                                )}
                              </div>
                              {member.location && (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                  <MapPin className="size-2.5" />{member.location}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-foreground font-medium">
                          {member.role || "—"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                            {member.memberFunction || "—"}
                          </span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {ventures.length > 0 ? (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] font-mono text-blue-400">{ventures.length}</span>
                              <span className="text-[10px] text-muted-foreground">venture{ventures.length !== 1 ? "s" : ""}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex items-center gap-1.5">
                            {member.email && (
                              <a href={`mailto:${member.email}`} onClick={e => e.stopPropagation()} className="text-muted-foreground hover:text-foreground transition-colors">
                                <Mail className="size-3.5" />
                              </a>
                            )}
                            {member.phone && (
                              <a href={`tel:${member.phone}`} onClick={e => e.stopPropagation()} className="text-muted-foreground hover:text-foreground transition-colors">
                                <Phone className="size-3.5" />
                              </a>
                            )}
                            {member.telegram && (
                              <a href={`https://t.me/${member.telegram}`} target="_blank" rel="noopener" onClick={e => e.stopPropagation()} className="text-muted-foreground hover:text-foreground transition-colors">
                                <Send className="size-3.5" />
                              </a>
                            )}
                            {member.whatsapp && (
                              <a href={`https://wa.me/${member.whatsapp}`} target="_blank" rel="noopener" onClick={e => e.stopPropagation()} className="text-muted-foreground hover:text-foreground transition-colors">
                                <MessageCircle className="size-3.5" />
                              </a>
                            )}
                            {!member.email && !member.phone && !member.telegram && !member.whatsapp && (
                              <span className="text-[10px] text-muted-foreground">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center gap-1.5">
                            <LiveStatusDot
                              status={statusMap.get(member.id)?.liveStatus || "offline"}
                              lastSeenAt={statusMap.get(member.id)?.lastSeenAt}
                              showLabel
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <ChevronRight className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* ── Member Detail Drawer ─────────────────────────────────── */}
      <Sheet open={!!drawerMember} onOpenChange={(open) => { if (!open) { setDrawerMember(null); setEditMode(false); } }}>
        <SheetContent className="w-full sm:max-w-md bg-card border-border overflow-y-auto">
          <SheetHeader className="pb-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative group/avatar">
                  {drawerMember?.avatarUrl ? (
                    <img
                      src={drawerMember.avatarUrl}
                      alt={drawerMember.name}
                      className="size-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-semibold text-primary">
                        {drawerMember?.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer"
                    title="Upload photo"
                  >
                    {uploadAvatar.isPending ? (
                      <Loader2 className="size-4 text-white animate-spin" />
                    ) : (
                      <Camera className="size-4 text-white" />
                    )}
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                </div>
                <div>
                  <SheetTitle className="text-sm font-semibold text-foreground">{drawerMember?.name}</SheetTitle>
                  <SheetDescription className="text-xs text-muted-foreground">
                    {drawerMember?.role || "ATLAS Member"} · {drawerMember?.memberFunction || "—"}
                  </SheetDescription>
                </div>
              </div>
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={(e) => { e.stopPropagation(); if (drawerMember) handleMoveUp(drawerMember.id); }}
                  className="p-1 rounded hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
                  title="Move up"
                >
                  <ArrowUp className="size-3.5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); if (drawerMember) handleMoveDown(drawerMember.id); }}
                  className="p-1 rounded hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
                  title="Move down"
                >
                  <ArrowDown className="size-3.5" />
                </button>
              </div>
            </div>
          </SheetHeader>

          {drawerMember && !editMode && (
            <div className="py-4 space-y-4">
              {/* Quick actions */}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="text-xs h-8 gap-1.5 flex-1" onClick={() => openEditMode(drawerMember)}>
                  <Edit2 className="size-3" />
                  Edit
                </Button>
                {drawerMember.email && drawerMember.invitationStatus !== "accepted" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-8 gap-1.5 text-primary hover:text-primary/80 border-primary/20"
                    onClick={() => resendInvitation.mutate({ memberId: drawerMember.id, origin: window.location.origin })}
                    disabled={resendInvitation.isPending}
                  >
                    {resendInvitation.isPending ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}
                    {drawerMember.invitationStatus === "pending" ? "Resend" : "Invite"}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 gap-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 border-red-500/20"
                  onClick={() => setDeleteConfirm(drawerMember.id)}
                >
                  <Trash2 className="size-3" />
                  Remove
                </Button>
              </div>

              {/* Invitation Status */}
              {drawerMember.invitationStatus && (
                <div className={cn(
                  "rounded-lg p-3 border",
                  drawerMember.invitationStatus === "pending" && "bg-amber-500/5 border-amber-500/20",
                  drawerMember.invitationStatus === "accepted" && "bg-emerald-500/5 border-emerald-500/20",
                  drawerMember.invitationStatus === "expired" && "bg-red-500/5 border-red-500/20",
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Send className={cn(
                        "size-3.5",
                        drawerMember.invitationStatus === "pending" && "text-amber-400",
                        drawerMember.invitationStatus === "accepted" && "text-emerald-400",
                        drawerMember.invitationStatus === "expired" && "text-red-400",
                      )} />
                      <span className="text-xs font-medium text-foreground">
                        {drawerMember.invitationStatus === "pending" && "Invitation Pending"}
                        {drawerMember.invitationStatus === "accepted" && "Invitation Accepted"}
                        {drawerMember.invitationStatus === "expired" && "Invitation Expired"}
                      </span>
                    </div>
                    {drawerMember.systemRole && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-primary/30 text-primary/70">
                        {drawerMember.systemRole}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {drawerMember.invitationStatus === "pending" && `Waiting for ${drawerMember.email} to accept`}
                    {drawerMember.invitationStatus === "accepted" && `${drawerMember.email} has system access`}
                    {drawerMember.invitationStatus === "expired" && `Invitation to ${drawerMember.email} has expired — resend to renew`}
                  </p>
                  {drawerMember.invitationStatus === "pending" && drawerMember.invitationId && (
                    <div className="mt-2 pt-2 border-t border-amber-500/10">
                      <p className="text-[10px] text-muted-foreground mb-1.5">Share this link with {drawerMember.name}:</p>
                      <div className="flex items-center gap-1.5">
                        <Input
                          readOnly
                          value={`${window.location.origin}/accept-invite?token=pending`}
                          className="h-6 text-[9px] font-mono bg-background/50 flex-1"
                          onClick={(e) => {
                            // Fetch the actual token when clicked
                            (e.target as HTMLInputElement).select();
                          }}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-1.5 text-[9px] gap-1 shrink-0"
                          onClick={() => {
                            // Use the resend mutation which returns a new token
                            resendInvitation.mutate(
                              { memberId: drawerMember.id, origin: window.location.origin },
                              {
                                onSuccess: (data: any) => {
                                  if (data.inviteToken) {
                                    const link = `${window.location.origin}/accept-invite?token=${encodeURIComponent(data.inviteToken)}`;
                                    navigator.clipboard.writeText(link);
                                    toast.success("Fresh invite link copied to clipboard");
                                  }
                                },
                              }
                            );
                          }}
                        >
                          <Copy className="size-2.5" />
                          Copy Link
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Status */}
              <div className="bg-secondary/30 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <LiveStatusDot
                    status={statusMap.get(drawerMember.id)?.liveStatus || "offline"}
                    lastSeenAt={statusMap.get(drawerMember.id)?.lastSeenAt}
                    size="md"
                    showLabel
                  />
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                    ATLAS Internal
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">Admin Status:</span>
                  <Select
                    value={statusMap.get(drawerMember.id)?.adminStatus || "active"}
                    onValueChange={(val) => setAdminStatus.mutate({ id: drawerMember.id, adminStatus: val as "active" | "on_leave" | "deactivated" })}
                  >
                    <SelectTrigger className="h-6 text-[10px] w-[120px] border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="on_leave">On Leave</SelectItem>
                      <SelectItem value="deactivated">Deactivated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {drawerMember.location && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="size-3" />{drawerMember.location}
                  </div>
                )}
              </div>

              {/* Contact Info */}
              <div>
                <h4 className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Contact</h4>
                <div className="space-y-2">
                  {drawerMember.email && (
                    <a href={`mailto:${drawerMember.email}`} className="flex items-center gap-2 text-xs text-foreground hover:text-primary transition-colors">
                      <Mail className="size-3.5 text-muted-foreground" />{drawerMember.email}
                    </a>
                  )}
                  {drawerMember.phone && (
                    <a href={`tel:${drawerMember.phone}`} className="flex items-center gap-2 text-xs text-foreground hover:text-primary transition-colors">
                      <Phone className="size-3.5 text-muted-foreground" />{drawerMember.phone}
                    </a>
                  )}
                  {drawerMember.telegram && (
                    <a href={`https://t.me/${drawerMember.telegram}`} target="_blank" rel="noopener" className="flex items-center gap-2 text-xs text-foreground hover:text-primary transition-colors">
                      <Send className="size-3.5 text-muted-foreground" />@{drawerMember.telegram}
                    </a>
                  )}
                  {drawerMember.whatsapp && (
                    <a href={`https://wa.me/${drawerMember.whatsapp}`} target="_blank" rel="noopener" className="flex items-center gap-2 text-xs text-foreground hover:text-primary transition-colors">
                      <MessageCircle className="size-3.5 text-muted-foreground" />{drawerMember.whatsapp}
                    </a>
                  )}
                  {drawerMember.linkedin && (
                    <a href={drawerMember.linkedin} target="_blank" rel="noopener" className="flex items-center gap-2 text-xs text-foreground hover:text-primary transition-colors">
                      <Linkedin className="size-3.5 text-muted-foreground" />LinkedIn
                    </a>
                  )}
                  {!drawerMember.email && !drawerMember.phone && !drawerMember.telegram && !drawerMember.whatsapp && !drawerMember.linkedin && (
                    <p className="text-xs text-muted-foreground">No contact info on file</p>
                  )}
                </div>
              </div>

              {/* Venture Assignments */}
              <div>
                <h4 className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Venture Assignments</h4>
                {(memberVentures.get(drawerMember.id) || []).length > 0 ? (
                  <div className="space-y-1.5">
                    {(memberVentures.get(drawerMember.id) || []).map((v, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between bg-secondary/30 rounded-md px-3 py-2 cursor-pointer hover:bg-secondary/50 transition-colors"
                        onClick={() => navigate(`/ventures/${v.ventureId}`)}
                      >
                        <div className="flex items-center gap-2">
                          <Briefcase className="size-3 text-blue-400" />
                          <span className="text-xs font-medium text-foreground">{v.ventureName}</span>
                        </div>
                        {v.responsibility && (
                          <span className="text-[10px] text-muted-foreground">{v.responsibility}</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Not assigned to any ventures</p>
                )}
              </div>

              {/* Notes */}
              {drawerMember.notes && (
                <div>
                  <h4 className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Notes</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{drawerMember.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Edit Mode */}
          {drawerMember && editMode && (
            <div className="py-4 space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Name</Label>
                <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-8 text-xs mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Role / Title</Label>
                <Input value={editRole} onChange={e => setEditRole(e.target.value)} className="h-8 text-xs mt-1" placeholder="e.g. VP Operations" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Function</Label>
                <Select value={editFunc} onValueChange={setEditFunc}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FUNCTIONS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Location</Label>
                <Input value={editLocation} onChange={e => setEditLocation(e.target.value)} className="h-8 text-xs mt-1" placeholder="e.g. New York" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <Input value={editEmail} onChange={e => setEditEmail(e.target.value)} className="h-8 text-xs mt-1" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Phone</Label>
                  <Input value={editPhone} onChange={e => setEditPhone(e.target.value)} className="h-8 text-xs mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Telegram</Label>
                  <Input value={editTelegram} onChange={e => setEditTelegram(e.target.value)} className="h-8 text-xs mt-1" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">WhatsApp</Label>
                  <Input value={editWhatsapp} onChange={e => setEditWhatsapp(e.target.value)} className="h-8 text-xs mt-1" />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">LinkedIn</Label>
                <Input value={editLinkedin} onChange={e => setEditLinkedin(e.target.value)} className="h-8 text-xs mt-1" placeholder="https://linkedin.com/in/..." />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Notes</Label>
                <Textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} className="text-xs mt-1 min-h-[60px]" />
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" className="text-xs h-8 flex-1" onClick={handleEdit} disabled={updateMember.isPending}>
                  {updateMember.isPending ? <Loader2 className="size-3 animate-spin mr-1" /> : null}
                  Save Changes
                </Button>
                <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => setEditMode(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Add Member Dialog ────────────────────────────────────── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Add ATLAS Member</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Add a new internal team member to ATLAS
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs text-muted-foreground">Name *</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} className="h-8 text-xs mt-1" placeholder="Full name" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Role / Title</Label>
                <Input value={newRole} onChange={e => setNewRole(e.target.value)} className="h-8 text-xs mt-1" placeholder="e.g. VP Operations" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Function</Label>
                <Select value={newFunc} onValueChange={setNewFunc}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FUNCTIONS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Location</Label>
              <Input value={newLocation} onChange={e => setNewLocation(e.target.value)} className="h-8 text-xs mt-1" placeholder="e.g. New York" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Email</Label>
                <Input value={newEmail} onChange={e => setNewEmail(e.target.value)} className="h-8 text-xs mt-1" placeholder="name@company.com" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Phone</Label>
                <Input value={newPhone} onChange={e => setNewPhone(e.target.value)} className="h-8 text-xs mt-1" />
              </div>
            </div>
            {newEmail.trim() && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Send className="size-3 text-primary" />
                  <span className="text-[11px] font-medium text-primary">Invitation will be sent to {newEmail.trim()}</span>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">System Access Role</Label>
                  <Select value={newSystemRole} onValueChange={setNewSystemRole}>
                    <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="partner">Partner</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground mt-1">This sets the access level when they accept the invitation</p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Telegram</Label>
                <Input value={newTelegram} onChange={e => setNewTelegram(e.target.value)} className="h-8 text-xs mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">WhatsApp</Label>
                <Input value={newWhatsapp} onChange={e => setNewWhatsapp(e.target.value)} className="h-8 text-xs mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">LinkedIn</Label>
              <Input value={newLinkedin} onChange={e => setNewLinkedin(e.target.value)} className="h-8 text-xs mt-1" placeholder="https://linkedin.com/in/..." />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Notes</Label>
              <Textarea value={newNotes} onChange={e => setNewNotes(e.target.value)} className="text-xs mt-1 min-h-[60px]" placeholder="Internal notes..." />
            </div>
          </div>
          {/* ── Invite Link Display (shown after successful creation) ── */}
          {lastInviteLink && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Link2 className="size-3.5 text-emerald-400" />
                <span className="text-[11px] font-semibold text-emerald-400">Invitation Link Ready</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Copy this link and send it to the invitee so they can accept and create their account.</p>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={lastInviteLink}
                  className="h-7 text-[10px] font-mono bg-background/50 flex-1"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-[10px] gap-1 shrink-0"
                  onClick={() => {
                    navigator.clipboard.writeText(lastInviteLink);
                    setLinkCopied(true);
                    toast.success("Invite link copied to clipboard");
                    setTimeout(() => setLinkCopied(false), 2000);
                  }}
                >
                  {linkCopied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                  {linkCopied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            {lastInviteLink ? (
              <Button size="sm" className="text-xs h-8" onClick={() => { setAddOpen(false); resetForm(); setLastInviteLink(null); }}>
                Done
              </Button>
            ) : (
              <>
                <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => setAddOpen(false)}>Cancel</Button>
                <Button size="sm" className="text-xs h-8 gap-1.5" onClick={handleAdd} disabled={createMember.isPending}>
                  {createMember.isPending ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
                  Add Member
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ──────────────────────────────────── */}
      <AlertDialog open={deleteConfirm !== null} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This will remove this member from the ATLAS team and all venture assignments. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs h-8">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="text-xs h-8 bg-red-600 hover:bg-red-700"
              onClick={() => { if (deleteConfirm) deleteMember.mutate({ id: deleteConfirm }); }}
            >
              {deleteMember.isPending ? <Loader2 className="size-3 animate-spin mr-1" /> : null}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
