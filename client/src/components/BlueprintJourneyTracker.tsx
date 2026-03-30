// ============================================================================
// BlueprintJourneyTracker — Client portal journey tracker
// Shows the venture's progress through its process blueprint as a visual
// stage-by-stage timeline with step completion status
// ============================================================================
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Check, Circle, Clock, Shield, Loader2 } from "lucide-react";

interface Props {
  ventureId: number;
}

export default function BlueprintJourneyTracker({ ventureId }: Props) {
  const { data: tracking, isLoading } = trpc.blueprints.getVentureTracking.useQuery(
    { ventureId },
    { staleTime: 30_000 }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!tracking || tracking.length === 0) {
    return null; // No blueprint applied — don't show anything
  }

  // Group steps by stage
  const stageMap = new Map<string, typeof tracking>();
  for (const step of tracking) {
    const stageName = step.stageName;
    if (!stageMap.has(stageName)) stageMap.set(stageName, []);
    stageMap.get(stageName)!.push(step);
  }

  const stages = Array.from(stageMap.entries()).map(([stageName, steps]) => {
    const completed = steps.filter(s => s.status === "complete").length;
    const total = steps.length;
    const allComplete = completed === total;
    const hasInProgress = steps.some(s => s.status === "in_progress");

    return {
      stageName,
      steps,
      completed,
      total,
      allComplete,
      hasInProgress,
      status: allComplete ? "complete" as const : hasInProgress ? "in_progress" as const : completed > 0 ? "partial" as const : "pending" as const,
    };
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Process Journey</h3>
        <span className="text-[10px] font-mono text-muted-foreground">
          {tracking.filter(t => t.status === "complete").length}/{tracking.length} steps complete
        </span>
      </div>

      {/* Stage timeline */}
      <div className="relative">
        {stages.map((stage, i) => (
          <div key={stage.stageName} className="relative flex gap-3 pb-4 last:pb-0">
            {/* Timeline connector */}
            {i < stages.length - 1 && (
              <div className={cn(
                "absolute left-[11px] top-[22px] w-0.5 bottom-0",
                stage.allComplete ? "bg-emerald-400/40" : "bg-border"
              )} />
            )}

            {/* Stage indicator */}
            <div className="flex-shrink-0 mt-0.5">
              {stage.allComplete ? (
                <div className="size-[22px] rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Check className="size-3 text-emerald-400" />
                </div>
              ) : stage.hasInProgress ? (
                <div className="size-[22px] rounded-full bg-primary/20 flex items-center justify-center">
                  <Clock className="size-3 text-primary animate-pulse" />
                </div>
              ) : stage.status === "partial" ? (
                <div className="size-[22px] rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Circle className="size-3 text-amber-400" />
                </div>
              ) : (
                <div className="size-[22px] rounded-full bg-secondary flex items-center justify-center">
                  <Circle className="size-3 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Stage content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">{stage.stageName}</span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {stage.completed}/{stage.total}
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-1 bg-secondary rounded-full mt-1.5 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    stage.allComplete ? "bg-emerald-400" :
                    stage.hasInProgress ? "bg-primary" : "bg-amber-400"
                  )}
                  style={{ width: `${stage.total > 0 ? (stage.completed / stage.total) * 100 : 0}%` }}
                />
              </div>

              {/* Steps (expanded for active stages) */}
              {(stage.hasInProgress || stage.status === "partial") && (
                <div className="mt-2 space-y-1">
                  {stage.steps
                    .filter(s => s.status !== "complete")
                    .slice(0, 3)
                    .map((step) => (
                    <div key={step.id} className="flex items-center gap-2 text-[10px]">
                      {step.isBlocking ? (
                        <Shield className="size-2.5 text-amber-400 flex-shrink-0" />
                      ) : (
                        <Circle className="size-2.5 text-muted-foreground flex-shrink-0" />
                      )}
                      <span className={cn(
                        "truncate",
                        step.status === "in_progress" ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {step.stepName}
                      </span>
                      {step.whoOwns && (
                        <span className="text-[9px] text-muted-foreground ml-auto flex-shrink-0">
                          {step.whoOwns}
                        </span>
                      )}
                    </div>
                  ))}
                  {stage.steps.filter(s => s.status !== "complete").length > 3 && (
                    <span className="text-[9px] text-muted-foreground">
                      +{stage.steps.filter(s => s.status !== "complete").length - 3} more
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
