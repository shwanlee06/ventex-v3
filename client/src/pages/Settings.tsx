// ============================================================================
// SPVs & Deals Page — Swiss Instrument design
// SPV table, distributions, meetings from Airtable
// ============================================================================

import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import {
  SPVS,
  DISTRIBUTIONS,
  MEETINGS,
  SPV_STAGE_CONFIG,
  DIST_STATUS_CONFIG,
  getThemeColor,
  formatCurrency,
  formatDate,
} from "@/lib/data";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { motion } from "framer-motion";
import {
  Briefcase,
  DollarSign,
  CalendarDays,
  FileText,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

export default function SettingsPage() {
  const activeSPVs = SPVS.filter(s => s.stage === "Active deal").length;
  const totalDistributed = DISTRIBUTIONS.reduce((sum, d) => sum + d.amount, 0);
  const paidDistributed = DISTRIBUTIONS.filter(d => d.status === "Paid").reduce((sum, d) => sum + d.amount, 0);

  return (
    <DashboardLayout title="SPVs & Deals" subtitle="DEAL PIPELINE & DISTRIBUTIONS">
      <div className="p-4 md:p-6 space-y-6">
        {/* Summary metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Total SPVs", value: SPVS.length, icon: <Briefcase className="size-4 text-blue-400" /> },
            { label: "Active Deals", value: activeSPVs, icon: <TrendingUp className="size-4 text-emerald-400" /> },
            { label: "Total Distributed", value: formatCurrency(totalDistributed), icon: <DollarSign className="size-4 text-primary" /> },
            { label: "Paid Out", value: formatCurrency(paidDistributed), icon: <TrendingDown className="size-4 text-amber-400" /> },
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

        {/* SPVs Table */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="bg-card border border-border rounded-lg overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">All SPVs & Deals</h2>
            <span className="text-[10px] font-mono text-muted-foreground">{SPVS.length} deals</span>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">SPV Name</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Sector</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Priority</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Stage</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SPVS.map((spv) => {
                const tc = getThemeColor(spv.theme);
                const sc = SPV_STAGE_CONFIG[spv.stage];
                return (
                  <TableRow key={spv.id}>
                    <TableCell>
                      <div>
                        <span className="text-xs text-foreground font-medium">{spv.name}</span>
                        {spv.currentStatus && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[200px]">{spv.currentStatus}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="size-2 rounded-full flex-shrink-0" style={{ backgroundColor: tc.color }} />
                        <span className="text-xs" style={{ color: tc.color }}>{spv.theme}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded",
                        spv.priority === "High" ? "bg-red-500/10 text-red-400" :
                        spv.priority === "Medium" ? "bg-amber-500/10 text-amber-400" :
                        "bg-secondary text-muted-foreground"
                      )}>
                        {spv.priority}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{spv.stage}</TableCell>
                    <TableCell>
                      {sc && <StatusBadge label={sc.label} bg={sc.bg} dot={sc.dot} />}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </motion.div>

        {/* Distributions Table */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="bg-card border border-border rounded-lg overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Distributions</h2>
            <span className="text-[10px] font-mono text-emerald-400">{formatCurrency(totalDistributed)} total</span>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Distribution</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Fund</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Date</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Amount</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Type</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {DISTRIBUTIONS.map((dist) => {
                const dc = DIST_STATUS_CONFIG[dist.status];
                return (
                  <TableRow key={dist.id}>
                    <TableCell>
                      <div>
                        <span className="text-xs text-foreground font-medium">{dist.name}</span>
                        {dist.notes && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[200px]">{dist.notes}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{dist.fund}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{formatDate(dist.date)}</TableCell>
                    <TableCell className="text-xs font-mono font-medium text-foreground">{formatCurrency(dist.amount)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{dist.type}</TableCell>
                    <TableCell>
                      {dc && <StatusBadge label={dc.label} bg={dc.bg} dot={dc.dot} />}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </motion.div>

        {/* Meetings */}
        {MEETINGS.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.3 }}
            className="bg-card border border-border rounded-lg"
          >
            <div className="px-4 py-3 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Recent Meetings</h2>
            </div>
            <div className="p-4 space-y-3">
              {MEETINGS.map((meeting) => (
                <div key={meeting.id} className="p-4 bg-secondary/30 rounded-md">
                  <div className="flex items-center gap-2 mb-2">
                    <CalendarDays className="size-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">{meeting.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3">{meeting.agenda}</p>
                  <div className="bg-background/50 rounded-md p-3 mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="size-3.5 text-muted-foreground" />
                      <span className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground font-medium">Meeting Summary</span>
                    </div>
                    <p className="text-xs text-foreground whitespace-pre-line leading-relaxed">{meeting.summary}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-[10px] text-muted-foreground">Attendees:</span>
                    {[...meeting.royaltonAttendees, ...meeting.attendees].map((a) => (
                      <span key={a} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-foreground">{a}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
