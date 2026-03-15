// ============================================================================
// Team & Contacts Page — Swiss Instrument — FULLY INTERACTIVE
// Profile drawers, status toggles, Add Member form, clickable contacts
// ============================================================================

import DashboardLayout from "@/components/DashboardLayout";
import { cn } from "@/lib/utils";
import {
  TEAM, CONTACTS, ORGANIZATIONS, LP_INVESTORS,
  type TeamMember, type Contact,
} from "@/lib/data";
import { motion } from "framer-motion";
import {
  Users, UserCircle, Building2, Briefcase, Phone, Globe, ExternalLink,
  Plus, MessageCircle, Send, X,
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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_CYCLE: Record<string, string> = { Active: "Advisor", Advisor: "Contributor", Contributor: "Active" };
const MEMBER_TYPES = ["Internal", "External Partner", "Advisor"];
const FUNCTIONS = ["Finance & Capital", "Operations & Systems", "Operations", "Finance / Accounting", "People Ops / HR", "Investor Relations", "Legal", "Design", "Financial Modeling"];

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

export default function OnboardPage() {
  const [team, setTeam] = useState<TeamMember[]>([...TEAM]);
  const [drawerMember, setDrawerMember] = useState<TeamMember | null>(null);
  const [contactDrawer, setContactDrawer] = useState<Contact | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  // Add form
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newFunc, setNewFunc] = useState("Operations");
  const [newType, setNewType] = useState("Internal");
  const [newNotes, setNewNotes] = useState("");

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const internalTeam = team.filter(m => m.type === "Internal");

  const toggleStatus = useCallback((id: string) => {
    setTeam(prev => prev.map(m => {
      if (m.id !== id) return m;
      const next = STATUS_CYCLE[m.status] || "Active";
      toast.info(`${m.name} status changed to ${next}`);
      return { ...m, status: next };
    }));
  }, []);

  const handleAdd = useCallback(() => {
    if (!newName.trim()) { toast.error("Name is required"); return; }
    const nm: TeamMember = {
      id: `rec_new_${Date.now()}`,
      name: newName.trim(),
      role: newRole.trim() || "Member",
      function: newFunc,
      status: "Active",
      type: newType as TeamMember["type"],
      notes: newNotes.trim() || undefined,
    };
    setTeam(prev => [nm, ...prev]);
    setAddOpen(false);
    setNewName(""); setNewRole(""); setNewNotes("");
    toast.success(`${nm.name} added to team`);
  }, [newName, newRole, newFunc, newType, newNotes]);

  return (
    <DashboardLayout title="Team & Contacts" subtitle="PEOPLE & ORGANIZATIONS">
      <div className="p-4 md:p-6 space-y-6">
        {/* Summary metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />) : [
            { label: "Team Members", value: team.length, icon: <Users className="size-4 text-blue-400" /> },
            { label: "Internal", value: internalTeam.length, icon: <UserCircle className="size-4 text-emerald-400" /> },
            { label: "Contacts", value: CONTACTS.length, icon: <Phone className="size-4 text-amber-400" /> },
            { label: "Organizations", value: ORGANIZATIONS.length, icon: <Building2 className="size-4 text-primary" /> },
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

        {/* Add button */}
        <div className="flex justify-end">
          <Button size="sm" className="text-xs h-8" onClick={() => setAddOpen(true)}>
            <Plus className="size-3.5 mr-1" /> Add Member
          </Button>
        </div>

        {/* Team Members Table — clickable rows */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="bg-card border border-border rounded-lg overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Team Members</h2>
            <span className="text-[10px] font-mono text-muted-foreground">{team.length} people</span>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Name</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Role</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Function</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Type</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {team.map((member) => (
                <TableRow key={member.id} className="cursor-pointer hover:bg-accent/30" onClick={() => setDrawerMember(member)}>
                  <TableCell>
                    <div>
                      <span className="text-xs text-foreground font-medium">{member.name}</span>
                      {member.notes && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[200px]">{member.notes}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{member.role}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{member.function}</TableCell>
                  <TableCell><MemberTypeBadge type={member.type} /></TableCell>
                  <TableCell>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleStatus(member.id); }}
                      className={cn(
                        "text-[10px] font-medium px-1.5 py-0.5 rounded cursor-pointer hover:opacity-80 transition-opacity",
                        member.status === "Active" ? "bg-emerald-500/10 text-emerald-400" :
                        member.status === "Advisor" ? "bg-amber-500/10 text-amber-400" :
                        "bg-secondary text-muted-foreground"
                      )}
                    >
                      {member.status}
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </motion.div>

        {/* Contacts Table — clickable rows */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="bg-card border border-border rounded-lg overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Contacts</h2>
            <span className="text-[10px] font-mono text-muted-foreground">{CONTACTS.length} contacts</span>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Name</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Role</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Industries</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Geography</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {CONTACTS.map((contact) => (
                <TableRow key={contact.id} className="cursor-pointer hover:bg-accent/30" onClick={() => setContactDrawer(contact)}>
                  <TableCell className="text-xs text-foreground font-medium">{contact.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{contact.role || "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {contact.industries.map((ind) => (
                        <span key={ind} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{ind}</span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">{contact.geography || "—"}</TableCell>
                  <TableCell>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                      {contact.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </motion.div>

        {/* Organizations & LPs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.3 }}
            className="bg-card border border-border rounded-lg"
          >
            <div className="px-4 py-3 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Organizations</h2>
            </div>
            <div className="p-4 space-y-3">
              {ORGANIZATIONS.map((org) => (
                <div key={org.id} className="p-3 bg-secondary/30 rounded-md">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="size-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">{org.name}</span>
                    </div>
                    <a href={org.website} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                      <ExternalLink className="size-3.5" />
                    </a>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{org.description}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{org.type}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{org.geography}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{org.sector}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.3 }}
            className="bg-card border border-border rounded-lg"
          >
            <div className="px-4 py-3 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">LP Investors</h2>
            </div>
            <div className="p-4 space-y-3">
              {LP_INVESTORS.map((lp) => (
                <div key={lp.id} className="p-3 bg-secondary/30 rounded-md">
                  <div className="flex items-center gap-2 mb-2">
                    <Briefcase className="size-4 text-emerald-400" />
                    <span className="text-sm font-medium text-foreground">{lp.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{lp.type}</span>
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded", lp.status === "Active" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400")}>
                      {lp.status}
                    </span>
                  </div>
                  {lp.linkedVentures.length > 0 && (
                    <div className="mt-2">
                      <span className="text-[10px] text-muted-foreground">Linked: </span>
                      {lp.linkedVentures.map((v) => (
                        <span key={v} className="text-[10px] text-foreground">{v}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {LP_INVESTORS.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No LP investors recorded yet.</p>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Member Profile Drawer */}
      <Sheet open={!!drawerMember} onOpenChange={(open) => !open && setDrawerMember(null)}>
        <SheetContent side="right" className="w-[420px] sm:max-w-[420px] bg-card border-border p-0">
          {drawerMember && (() => {
            const live = team.find(m => m.id === drawerMember.id) || drawerMember;
            return (
              <>
                <SheetHeader className="px-4 pt-4 pb-3 border-b border-border">
                  <SheetTitle className="text-sm font-semibold">{live.name}</SheetTitle>
                  <SheetDescription className="text-[10px] font-mono text-muted-foreground">
                    {live.role} · {live.function}
                  </SheetDescription>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-140px)]">
                  <div className="p-4 space-y-4">
                    <div className="flex items-center gap-3">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1">Type</span>
                        <MemberTypeBadge type={live.type} />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1">Status</span>
                        <button
                          onClick={() => toggleStatus(live.id)}
                          className={cn(
                            "text-[10px] font-medium px-2 py-1 rounded cursor-pointer hover:opacity-80",
                            live.status === "Active" ? "bg-emerald-500/10 text-emerald-400" :
                            live.status === "Advisor" ? "bg-amber-500/10 text-amber-400" :
                            "bg-secondary text-muted-foreground"
                          )}
                        >
                          {live.status} (click to toggle)
                        </button>
                      </div>
                    </div>

                    {live.notes && (
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1">Notes</span>
                        <p className="text-xs text-foreground bg-secondary/30 rounded-md p-2">{live.notes}</p>
                      </div>
                    )}

                    {/* Contact methods */}
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-2">Contact</span>
                      <div className="space-y-2">
                        {live.telegram && (
                          <a
                            href={`https://t.me/${live.telegram.replace("@", "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            <Send className="size-3.5" />
                            <span>Telegram: {live.telegram}</span>
                          </a>
                        )}
                        {live.whatsapp && (
                          <a
                            href={`https://wa.me/${live.whatsapp.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                          >
                            <MessageCircle className="size-3.5" />
                            <span>WhatsApp: {live.whatsapp}</span>
                          </a>
                        )}
                        {!live.telegram && !live.whatsapp && (
                          <p className="text-xs text-muted-foreground">No contact methods on file.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* Contact Detail Drawer */}
      <Sheet open={!!contactDrawer} onOpenChange={(open) => !open && setContactDrawer(null)}>
        <SheetContent side="right" className="w-[420px] sm:max-w-[420px] bg-card border-border p-0">
          {contactDrawer && (
            <>
              <SheetHeader className="px-4 pt-4 pb-3 border-b border-border">
                <SheetTitle className="text-sm font-semibold">{contactDrawer.name}</SheetTitle>
                <SheetDescription className="text-[10px] font-mono text-muted-foreground">
                  {contactDrawer.role || "Contact"} {contactDrawer.geography ? `· ${contactDrawer.geography}` : ""}
                </SheetDescription>
              </SheetHeader>
              <div className="p-4 space-y-4">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1">Status</span>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">{contactDrawer.status}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-2">Industries</span>
                  <div className="flex flex-wrap gap-1">
                    {contactDrawer.industries.map((ind) => (
                      <span key={ind} className="text-[10px] px-2 py-1 rounded bg-secondary text-foreground">{ind}</span>
                    ))}
                  </div>
                </div>
                {contactDrawer.geography && (
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1">Geography</span>
                    <span className="text-xs font-mono text-foreground">{contactDrawer.geography}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Add Member Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Add Team Member</DialogTitle>
            <DialogDescription className="text-[10px] font-mono">Add a new member to the team</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs mb-1">Name</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Full name" className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs mb-1">Role</Label>
              <Input value={newRole} onChange={(e) => setNewRole(e.target.value)} placeholder="e.g. Analyst, VP" className="h-8 text-xs" />
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
            <div>
              <Label className="text-xs mb-1">Notes</Label>
              <Textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Optional notes..." className="text-xs min-h-[60px]" />
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" className="text-xs" onClick={handleAdd}>
              <Plus className="size-3.5 mr-1" /> Add Member
            </Button>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setAddOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
