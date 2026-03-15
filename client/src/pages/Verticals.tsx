// ============================================================================
// Ventures Page — Swiss Instrument design
// All ventures table, tasks table, real Airtable data
// ============================================================================

import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";
import {
  VENTURES,
  TASKS,
  STATUS_CONFIG,
  getThemeColor,
  getTaskStatusFromDate,
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
import { Layers3, ListChecks, MapPin, AlertTriangle } from "lucide-react";

export default function VerticalsPage() {
  const activeVentures = VENTURES.filter(v => v.status === "In progress").length;
  const openTasks = TASKS.filter(t => t.status === "open").length;
  const overdueTasks = TASKS.filter(t => getTaskStatusFromDate(t) === "overdue").length;

  const summaryMetrics = [
    { label: "Total Ventures", value: VENTURES.length, icon: <Layers3 className="size-4 text-blue-400" /> },
    { label: "Active Ventures", value: activeVentures, icon: <MapPin className="size-4 text-emerald-400" /> },
    { label: "Open Tasks", value: openTasks, icon: <ListChecks className="size-4 text-amber-400" /> },
    { label: "Overdue Tasks", value: overdueTasks, icon: <AlertTriangle className="size-4 text-red-400" /> },
  ];

  return (
    <DashboardLayout title="Ventures" subtitle="PORTFOLIO OVERVIEW">
      <div className="p-4 md:p-6 space-y-6">
        {/* Summary metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {summaryMetrics.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className="bg-card border border-border rounded-lg p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                {m.icon}
                <span className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-medium">
                  {m.label}
                </span>
              </div>
              <span className="text-2xl font-mono font-semibold text-foreground">{m.value}</span>
            </motion.div>
          ))}
        </div>

        {/* Ventures Table */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="bg-card border border-border rounded-lg overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">All Ventures</h2>
            <span className="text-[10px] font-mono text-muted-foreground">{VENTURES.length} ventures</span>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Venture</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Sector</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Location</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Stage</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {VENTURES.filter(v => v.name !== "Unknown Venture").map((venture) => {
                const tc = getThemeColor(venture.theme);
                const stageLabel = venture.stage?.trim() || "Unknown";
                const isActive = venture.status === "In progress";
                const isCompleted = venture.status === "Completed";
                const isOnHold = venture.status === "On-Hold";
                return (
                  <TableRow key={venture.id}>
                    <TableCell>
                      <div>
                        <span className="text-xs text-foreground font-medium">{venture.name}</span>
                        {venture.currentStatus && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[200px]">{venture.currentStatus}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="size-2 rounded-full flex-shrink-0" style={{ backgroundColor: tc.color }} />
                        <span className="text-xs font-medium" style={{ color: tc.color }}>{venture.theme}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{venture.location}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{stageLabel}</TableCell>
                    <TableCell>
                      <StatusBadge
                        label={venture.status}
                        bg={isActive ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : isCompleted ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : isOnHold ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-secondary text-muted-foreground border-border"}
                        dot={isActive ? "bg-emerald-400" : isCompleted ? "bg-blue-400" : isOnHold ? "bg-amber-400" : "bg-muted-foreground"}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </motion.div>

        {/* All Tasks */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="bg-card border border-border rounded-lg overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">All Tasks</h2>
            <span className="text-[10px] font-mono text-muted-foreground">{TASKS.length} tasks</span>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Task</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Due Date</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Priority</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Assignees</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {TASKS.map((task) => {
                const resolvedStatus = getTaskStatusFromDate(task);
                const sc = STATUS_CONFIG[resolvedStatus];
                return (
                  <TableRow key={task.id}>
                    <TableCell>
                      <div>
                        <span className="text-xs text-foreground font-medium">{task.title}</span>
                        {task.ventureLink && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">{task.ventureLink}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {formatDate(task.dueDate)}
                    </TableCell>
                    <TableCell>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${task.priority === "High" ? "bg-red-500/10 text-red-400" : task.priority === "Medium" ? "bg-amber-500/10 text-amber-400" : "bg-secondary text-muted-foreground"}`}>
                        {task.priority}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {task.assignees.length > 0 ? task.assignees.join(", ") : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge label={sc.label} bg={sc.bg} dot={sc.dot} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
