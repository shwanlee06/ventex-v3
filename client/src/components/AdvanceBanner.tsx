// AdvanceBanner — Client portal banner for Mode B one-click stage advance
// Shows when a venture has completed all tasks and is ready to advance.
// Green gradient banner with venture name, stage info, and advance button.

import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, CheckCircle2, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useState } from "react";

interface ReadyVenture {
  eventId: number;
  ventureId: number;
  ventureName: string;
  currentStage: string;
  nextStage: string;
  daysInStage: number;
  completedTasks: number;
  isCapitalStage: boolean;
}

interface AdvanceBannerProps {
  readyVentures: ReadyVenture[];
  onAdvanced?: () => void;
}

export default function AdvanceBanner({ readyVentures, onAdvanced }: AdvanceBannerProps) {
  const [advancingId, setAdvancingId] = useState<number | null>(null);
  const [advancedIds, setAdvancedIds] = useState<Set<number>>(new Set());

  const utils = trpc.useUtils();
  const advanceMutation = trpc.agents.clientAdvanceStage.useMutation({
    onSuccess: (data, variables) => {
      setAdvancedIds(prev => {
        const next = new Set(Array.from(prev));
        next.add(variables.ventureId);
        return next;
      });
      setAdvancingId(null);
      toast.success(`${data.ventureName} advanced to ${data.toStage}`);
      // Invalidate relevant queries
      utils.agents.clientFeed.invalidate();
      utils.agents.velocityMetrics.invalidate();
      utils.agents.velocityLog.invalidate();
      onAdvanced?.();
    },
    onError: (error) => {
      setAdvancingId(null);
      toast.error(error.message || "Failed to advance status");
    },
  });

  const handleAdvance = (venture: ReadyVenture) => {
    setAdvancingId(venture.ventureId);
    advanceMutation.mutate({
      ventureId: venture.ventureId,
      eventId: venture.eventId,
    });
  };

  const visibleVentures = readyVentures.filter(v => !advancedIds.has(v.ventureId));

  if (visibleVentures.length === 0) return null;

  return (
    <div className="space-y-3">
      <AnimatePresence mode="popLayout">
        {visibleVentures.map((venture) => (
          <motion.div
            key={venture.ventureId}
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="relative overflow-hidden rounded-xl border border-emerald-500/20"
          >
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-emerald-500/8 to-blue-500/5" />

            <div className="relative p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              {/* Icon + Content row */}
              <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                <div className="flex items-center justify-center size-10 rounded-xl bg-emerald-500/10 flex-shrink-0">
                  <Zap className="size-5 text-emerald-400" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium text-foreground truncate">
                      {venture.ventureName}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full flex-shrink-0">
                      Ready
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] text-muted-foreground flex-wrap">
                    <span className="font-mono">{venture.currentStage}</span>
                    <ArrowRight className="size-3 text-emerald-400" />
                    <span className="font-mono font-medium text-foreground">{venture.nextStage}</span>
                    <span className="hidden sm:inline text-muted-foreground/50">·</span>
                    <span className="hidden sm:inline">{venture.completedTasks} tasks completed</span>
                    <span className="hidden sm:inline text-muted-foreground/50">·</span>
                    <span className="hidden sm:inline">{venture.daysInStage}d in status</span>
                  </div>
                </div>
              </div>

              {/* Action button */}
              <Button
                size="sm"
                onClick={() => handleAdvance(venture)}
                disabled={advancingId === venture.ventureId}
                className={cn(
                  "w-full sm:w-auto min-h-[44px] sm:min-h-0 h-auto sm:h-9 gap-1.5 flex-shrink-0 text-xs font-medium touch-manipulation active:scale-[0.97]",
                  venture.isCapitalStage
                    ? "bg-amber-500 hover:bg-amber-600 text-white"
                    : "bg-emerald-500 hover:bg-emerald-600 text-white"
                )}
              >
                {advancingId === venture.ventureId ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Advancing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-3.5" />
                    {venture.isCapitalStage ? "Review & Advance" : "Advance Status"}
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
