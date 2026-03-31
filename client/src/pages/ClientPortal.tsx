// ============================================================================
// Client Portal — /portal/:orgSlug
// Premium, outcome-focused. Zero operator language.
// Three sections: This Week · Your Portfolio · Coming Up
// ============================================================================

import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { useRoute, useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import {
  CalendarDays,
  Briefcase,
  ArrowRight,
  Clock,
  CheckCircle2,
  ChevronRight,
  Building2,
  Ship,
  UtensilsCrossed,
  Clapperboard,
  Fuel,
  Package,
  AlertCircle,
  Loader2,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

// ── Sector icons ──────────────────────────────────────────────────────
const SECTOR_ICONS: Record<string, React.ReactNode> = {
  "Real Estate": <Building2 className="size-4" />,
  Yacht: <Ship className="size-4" />,
  "F&B": <UtensilsCrossed className="size-4" />,
  Entertainment: <Clapperboard className="size-4" />,
  "Oil & Gas": <Fuel className="size-4" />,
  Others: <Package className="size-4" />,
};

// ── Stage progress ────────────────────────────────────────────────────
const STAGES = ["Under Review", "Fundraising", "Active", "Completed"];

function StageIndicator({ stage }: { stage: string }) {
  const idx = STAGES.indexOf(stage);
  return (
    <div className="flex items-center gap-1">
      {STAGES.map((s, i) => (
        <div
          key={s}
          className={cn(
            "h-1 rounded-full flex-1 transition-all",
            i < idx
              ? "bg-emerald-500"
              : i === idx
                ? "bg-primary"
                : "bg-secondary/40"
          )}
          style={{ minWidth: 16 }}
        />
      ))}
    </div>
  );
}

// ── Format date for display ───────────────────────────────────────────
function friendlyDate(d: Date | string | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  return formatDistanceToNow(date, { addSuffix: true });
}

function formatDueDate(d: string | undefined): string {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Main Component ────────────────────────────────────────────────────
export default function ClientPortal() {
  const [, params] = useRoute("/portal/:orgSlug");
  const orgSlug = params?.orgSlug || "";
  const { user, loading: authLoading, logout } = useAuth();
  const [, navigate] = useLocation();

  const { data, isLoading, error } = trpc.portal.getData.useQuery(
    { orgSlug },
    { enabled: !!orgSlug && !!user, retry: false }
  );

  // ── Auth check ──────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-xl font-semibold text-foreground">
            Sign in to continue
          </h1>
          <p className="text-sm text-muted-foreground">
            Access your portfolio and updates
          </p>
          <Button asChild>
            <a href={getLoginUrl()}>Sign In</a>
          </Button>
        </div>
      </div>
    );
  }

  // ── Loading state ───────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-40 mb-10" />
          <div className="space-y-6">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="size-8 text-destructive mx-auto" />
          <h1 className="text-xl font-semibold text-foreground">
            Unable to load portal
          </h1>
          <p className="text-sm text-muted-foreground max-w-md">
            {error.message === "You do not have access to this portal"
              ? "You don't have permission to view this portal."
              : "Something went wrong. Please try again later."}
          </p>
          <Button variant="outline" onClick={() => navigate("/")}>
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { orgName, isOperatorPreview, thisWeek, portfolio, comingUp } = data;

  return (
    <div className="min-h-screen bg-background">
      {/* Operator preview banner */}
      {isOperatorPreview && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center">
          <span className="text-xs font-medium text-amber-400">
            Operator Preview Mode
          </span>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground tracking-tight">
              {orgName}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Managed by ATLAS
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:block">
              {user.name || user.email}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => logout()}
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* ── Section 1: This Week ─────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays className="size-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              This Week
            </h2>
          </div>

          {thisWeek.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No updates this week. We'll notify you when there's something
                new.
              </p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl divide-y divide-border">
              {thisWeek.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.2 }}
                  className="p-4 flex items-start gap-3"
                >
                  <div
                    className={cn(
                      "size-1.5 rounded-full mt-2 flex-shrink-0",
                      item.requiresAction
                        ? "bg-amber-400"
                        : "bg-emerald-400"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground leading-relaxed">
                      {item.summary}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      {item.entityName && (
                        <span className="text-[11px] text-muted-foreground">
                          {item.entityName}
                        </span>
                      )}
                      <span className="text-[11px] text-muted-foreground/60">
                        {friendlyDate(item.date ?? undefined)}
                      </span>
                    </div>
                  </div>
                  {item.requiresAction && item.actionLabel && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs flex-shrink-0"
                    >
                      {item.actionLabel}
                      <ArrowRight className="size-3 ml-1" />
                    </Button>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </motion.section>

        {/* ── Section 2: Your Portfolio ────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Briefcase className="size-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Your Portfolio
            </h2>
            {portfolio.length > 0 && (
              <span className="text-[11px] text-muted-foreground ml-auto">
                {portfolio.length} venture{portfolio.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {portfolio.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Your portfolio is being set up. We'll have your ventures ready
                shortly.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {portfolio.map((v, i) => (
                <motion.div
                  key={v.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.04, duration: 0.25 }}
                  className="bg-card border border-border rounded-xl p-4 hover:border-primary/20 transition-colors group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {SECTOR_ICONS[v.sector] || (
                          <Package className="size-4" />
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {v.sector}
                      </span>
                    </div>
                    <ChevronRight className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  <h3 className="text-sm font-medium text-foreground mb-1">
                    {v.name}
                  </h3>

                  <p className="text-xs text-muted-foreground mb-3">
                    {v.statusLine}
                  </p>

                  <div className="space-y-1.5">
                    <StageIndicator stage={v.stage} />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground/60">
                        {v.stage}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.section>

        {/* ── Section 3: Coming Up ─────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Clock className="size-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Coming Up
            </h2>
          </div>

          {comingUp.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Nothing upcoming right now. We'll let you know when something
                needs your attention.
              </p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl divide-y divide-border">
              {comingUp.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + i * 0.04, duration: 0.2 }}
                  className="p-4 flex items-center gap-3"
                >
                  <CheckCircle2 className="size-4 text-muted-foreground/40 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{item.title}</p>
                  </div>
                  {item.dueDate && (
                    <span className="text-[11px] text-muted-foreground flex-shrink-0">
                      {formatDueDate(item.dueDate)}
                    </span>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </motion.section>

        {/* Footer */}
        <div className="pt-8 pb-12 text-center">
          <p className="text-[11px] text-muted-foreground/40">
            Managed by ATLAS · Powered by Aurovia
          </p>
        </div>
      </main>
    </div>
  );
}
