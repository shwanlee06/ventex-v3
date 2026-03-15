// ============================================================================
// Verticals Page — Swiss Instrument design
// Cross-vertical compliance tracker table, summary metrics
// Color-coded status badges, DM Mono for data
// ============================================================================

import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import {
  COMPLIANCE_ITEMS,
  VERTICALS,
  TASKS,
  VERTICAL_COLORS,
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
import { Layers3, CheckCircle2, Clock, AlertTriangle } from "lucide-react";

export default function VerticalsPage() {
  const totalTasks = TASKS.length;
  const activeVerticals = VERTICALS.length;
  const pendingActions = TASKS.filter((t) => t.status === "pending" || t.status === "overdue").length;

  const summaryMetrics = [
    { label: "Total Tasks", value: totalTasks, icon: <Layers3 className="size-4 text-blue-400" /> },
    { label: "Active Verticals", value: activeVerticals, icon: <CheckCircle2 className="size-4 text-emerald-400" /> },
    { label: "Pending Actions", value: pendingActions, icon: <Clock className="size-4 text-amber-400" /> },
    { label: "Overdue Items", value: COMPLIANCE_ITEMS.filter((c) => c.status === "overdue").length, icon: <AlertTriangle className="size-4 text-red-400" /> },
  ];

  return (
    <DashboardLayout title="Verticals" subtitle="CROSS-VERTICAL OPERATIONS">
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

        {/* Compliance Tracker Table */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="bg-card border border-border rounded-lg overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Compliance Tracker</h2>
            <span className="text-[10px] font-mono text-muted-foreground">{COMPLIANCE_ITEMS.length} items</span>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Vertical</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Item</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Due Date</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {COMPLIANCE_ITEMS.map((item, i) => {
                const vc = VERTICAL_COLORS[item.vertical];
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="size-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: vc.color }}
                        />
                        <span className="text-xs font-medium" style={{ color: vc.color }}>
                          {vc.label}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-foreground">{item.item}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {formatDate(item.dueDate)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={item.status} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </motion.div>

        {/* All Tasks by Vertical */}
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
                <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Vertical</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Due Date</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Assignee</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {TASKS.map((task) => {
                const vc = VERTICAL_COLORS[task.vertical];
                return (
                  <TableRow key={task.id}>
                    <TableCell className="text-xs text-foreground font-medium">{task.title}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="size-1.5 rounded-full" style={{ backgroundColor: vc.color }} />
                        <span className="text-xs text-muted-foreground">{vc.label}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {formatDate(task.dueDate)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{task.assignee}</TableCell>
                    <TableCell>
                      <StatusBadge status={task.status} />
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
