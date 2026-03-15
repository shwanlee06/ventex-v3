// ============================================================================
// Client Onboarding Page — Swiss Instrument design
// Step-by-step workflow tracker, visual step indicator, client cards
// ============================================================================

import DashboardLayout from "@/components/DashboardLayout";
import { cn } from "@/lib/utils";
import { CLIENTS, ONBOARDING_STEPS } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  UserPlus,
  CheckCircle2,
  Circle,
  ArrowRight,
  Activity,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <div className="flex items-center gap-1">
      {ONBOARDING_STEPS.map((step, i) => {
        const stepNum = i + 1;
        const isDone = stepNum < currentStep;
        const isActive = stepNum === currentStep;
        const isTodo = stepNum > currentStep;

        return (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "size-7 rounded-full flex items-center justify-center text-[10px] font-mono font-medium border transition-colors",
                  isDone && "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
                  isActive && "bg-primary/10 border-primary/30 text-primary",
                  isTodo && "bg-secondary border-border text-muted-foreground"
                )}
              >
                {isDone ? <CheckCircle2 className="size-3.5" /> : stepNum}
              </div>
              <span
                className={cn(
                  "text-[9px] mt-1 text-center max-w-[60px] leading-tight",
                  isDone && "text-emerald-400",
                  isActive && "text-primary font-medium",
                  isTodo && "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
            {i < ONBOARDING_STEPS.length - 1 && (
              <div
                className={cn(
                  "w-6 h-px mx-1 mb-4",
                  stepNum < currentStep ? "bg-emerald-500/30" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function OnboardPage() {
  const liveClients = CLIENTS.filter((c) => c.status === "live");
  const onboardingClients = CLIENTS.filter((c) => c.status === "onboarding");

  return (
    <DashboardLayout title="Client Onboarding" subtitle="INTAKE & PROVISIONING">
      <div className="p-4 md:p-6 space-y-6">
        {/* Start new client */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between"
        >
          <div>
            <h2 className="text-sm font-semibold text-foreground">Client Pipeline</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {CLIENTS.length} total clients — {liveClients.length} live, {onboardingClients.length} onboarding
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => toast("Feature coming soon", { description: "New client intake workflow will be available in the next release." })}
            className="gap-1.5"
          >
            <UserPlus className="size-3.5" />
            Start new client intake
          </Button>
        </motion.div>

        {/* Onboarding clients */}
        {onboardingClients.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-medium">
              Currently Onboarding
            </h3>
            {onboardingClients.map((client, i) => (
              <motion.div
                key={client.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05, duration: 0.3 }}
                className="bg-card border border-border rounded-lg p-5"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={client.avatarUrl}
                      alt={client.name}
                      className="size-10 rounded-lg object-cover"
                    />
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">{client.name}</h4>
                      <p className="text-[10px] font-mono text-muted-foreground">
                        Step {client.currentStep} of {client.totalSteps} — {ONBOARDING_STEPS[client.currentStep - 1]?.label}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Circle className="size-1.5 fill-current" />
                    Onboarding
                  </span>
                </div>

                <StepIndicator currentStep={client.currentStep} totalSteps={client.totalSteps} />

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-muted-foreground">Progress</span>
                    <span className="text-[10px] font-mono text-foreground">
                      {Math.round((client.currentStep / client.totalSteps) * 100)}%
                    </span>
                  </div>
                  <div className="h-1 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${(client.currentStep / client.totalSteps) * 100}%` }}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Live clients */}
        {liveClients.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-medium">
              Live Clients
            </h3>
            {liveClients.map((client, i) => (
              <motion.div
                key={client.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.05, duration: 0.3 }}
                className="bg-card border border-border rounded-lg p-5"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={client.avatarUrl}
                      alt={client.name}
                      className="size-10 rounded-lg object-cover"
                    />
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">{client.name}</h4>
                      <p className="text-[10px] font-mono text-muted-foreground">
                        All {client.totalSteps} steps completed
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="size-3" />
                    Live
                  </span>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="bg-secondary/30 rounded-md p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Activity className="size-3.5 text-blue-400" />
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Tasks/Week</span>
                    </div>
                    <span className="text-lg font-mono font-semibold text-foreground">{client.tasksPerWeek}</span>
                  </div>
                  <div className="bg-secondary/30 rounded-md p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="size-3.5 text-emerald-400" />
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Hours/Month</span>
                    </div>
                    <span className="text-lg font-mono font-semibold text-foreground">{client.hoursSavedPerMonth}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
