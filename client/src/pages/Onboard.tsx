// ============================================================================
// Team & Contacts Page — Swiss Instrument design
// Team members, contacts, organizations from Airtable
// ============================================================================

import DashboardLayout from "@/components/DashboardLayout";
import { cn } from "@/lib/utils";
import { TEAM, CONTACTS, ORGANIZATIONS, LP_INVESTORS, type TeamMember, type Contact } from "@/lib/data";
import { motion } from "framer-motion";
import {
  Users,
  UserCircle,
  Building2,
  Briefcase,
  Phone,
  Globe,
  ExternalLink,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  const internalTeam = TEAM.filter(m => m.type === "Internal");
  const externalTeam = TEAM.filter(m => m.type !== "Internal");

  return (
    <DashboardLayout title="Team & Contacts" subtitle="PEOPLE & ORGANIZATIONS">
      <div className="p-4 md:p-6 space-y-6">
        {/* Summary metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Team Members", value: TEAM.length, icon: <Users className="size-4 text-blue-400" /> },
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

        {/* Team Members Table */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="bg-card border border-border rounded-lg overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Team Members</h2>
            <span className="text-[10px] font-mono text-muted-foreground">{TEAM.length} people</span>
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
              {TEAM.map((member: TeamMember) => (
                <TableRow key={member.id}>
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
                    <span className={cn(
                      "text-[10px] font-medium px-1.5 py-0.5 rounded",
                      member.status === "Active" ? "bg-emerald-500/10 text-emerald-400" :
                      member.status === "Advisor" ? "bg-amber-500/10 text-amber-400" :
                      "bg-secondary text-muted-foreground"
                    )}>
                      {member.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </motion.div>

        {/* Contacts Table */}
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
              {CONTACTS.map((contact: Contact) => (
                <TableRow key={contact.id}>
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
          {/* Organizations */}
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

          {/* LP Investors */}
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
    </DashboardLayout>
  );
}
