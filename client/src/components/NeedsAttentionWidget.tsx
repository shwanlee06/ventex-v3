/**
 * Needs Attention Widget
 * 
 * Shows stale/dormant items that need operator attention.
 * Uses the lifecycle.staleDataSummary endpoint.
 * Displays on the VENTEX command center dashboard.
 */

import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Clock,
  Layers3,
  Briefcase,
  ListChecks,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface NeedsAttentionWidgetProps {
  onNavigate: (path: string) => void;
}

export default function NeedsAttentionWidget({ onNavigate }: NeedsAttentionWidgetProps) {
  const summaryQ = trpc.lifecycle.staleDataSummary.useQuery();
  const triggerSweep = trpc.lifecycle.triggerSweep.useMutation({
    onSuccess: (result) => {
      summaryQ.refetch();
      toast.success(`Lifecycle sweep complete: ${result.totalActions} actions taken`);
    },
    onError: (err) => toast.error(err.message),
  });

  const data = summaryQ.data;

  // Don't show if no stale data
  if (!data || data.totalNeedsAttention === 0) return null;

  const typeIcon = (type: string) => {
    switch (type) {
      case "venture": return <Layers3 className="size-3.5 text-purple-400" />;
      case "spv": return <Briefcase className="size-3.5 text-blue-400" />;
      case "task": return <ListChecks className="size-3.5 text-amber-400" />;
      default: return <Clock className="size-3.5 text-muted-foreground" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="bg-card border border-amber-500/20 rounded-lg overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-amber-500/5">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-amber-400" />
          <span className="text-sm font-semibold text-foreground">Needs Attention</span>
          <span className="text-[11px] font-mono bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded-full">
            {data.totalNeedsAttention}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={() => triggerSweep.mutate()}
          disabled={triggerSweep.isPending}
        >
          <RefreshCw className={cn("size-3", triggerSweep.isPending && "animate-spin")} />
          Run Sweep
        </Button>
      </div>

      {/* Summary badges */}
      <div className="flex items-center gap-4 px-4 py-2.5 border-b border-border">
        {data.dormantVentures > 0 && (
          <div className="flex items-center gap-1.5">
            <Layers3 className="size-3.5 text-purple-400" />
            <span className="text-xs text-muted-foreground">
              <span className="font-mono font-medium text-purple-400">{data.dormantVentures}</span> dormant ventures
            </span>
          </div>
        )}
        {data.staleTasks > 0 && (
          <div className="flex items-center gap-1.5">
            <ListChecks className="size-3.5 text-amber-400" />
            <span className="text-xs text-muted-foreground">
              <span className="font-mono font-medium text-amber-400">{data.staleTasks}</span> stale tasks
            </span>
          </div>
        )}
        {data.staleSpvs > 0 && (
          <div className="flex items-center gap-1.5">
            <Briefcase className="size-3.5 text-blue-400" />
            <span className="text-xs text-muted-foreground">
              <span className="font-mono font-medium text-blue-400">{data.staleSpvs}</span> stale SPVs
            </span>
          </div>
        )}
      </div>

      {/* Item list */}
      <div className="divide-y divide-border">
        {data.items.slice(0, 5).map((item, i) => (
          <div
            key={`${item.type}-${item.name}-${i}`}
            onClick={() => onNavigate(item.link)}
            className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-accent/30 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              {typeIcon(item.type)}
              <span className="text-xs font-medium text-foreground truncate max-w-[200px] sm:max-w-[300px]">
                {item.name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-muted-foreground">
                {item.daysSince}d inactive
              </span>
              <ChevronRight className="size-3 text-muted-foreground" />
            </div>
          </div>
        ))}
        {data.items.length > 5 && (
          <div className="px-4 py-2 text-center">
            <span className="text-[11px] text-muted-foreground font-mono">
              +{data.items.length - 5} more items need attention
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
