// Client Switcher — Command-palette-style overlay for VENTEX operators
// Shows client cards with health, overdue count, sectors, search/filter
// Triggered from Topbar or keyboard shortcut (Ctrl+K)

import { useState, useMemo, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import {
  Building2,
  Search,
  X,
  ArrowRight,
  Globe,
  AlertTriangle,
  CheckCircle2,
  Layers3,
  Users,
  TrendingUp,
} from "lucide-react";

interface ClientSwitcherProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getHealthColor(health: number): string {
  if (health >= 75) return "text-emerald-400";
  if (health >= 50) return "text-amber-400";
  return "text-red-400";
}

function getHealthBg(health: number): string {
  if (health >= 75) return "bg-emerald-500/10";
  if (health >= 50) return "bg-amber-500/10";
  return "bg-red-500/10";
}

function getHealthLabel(health: number): string {
  if (health >= 75) return "Healthy";
  if (health >= 50) return "At Risk";
  return "Critical";
}

export default function ClientSwitcher({ open, onOpenChange }: ClientSwitcherProps) {
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [, navigate] = useLocation();
  const { setActiveOrg } = useWorkspace();

  const { data: clients } = trpc.organizations.listWithMetrics.useQuery(undefined, {
    enabled: open,
  });

  // Filter clients by search
  const filtered = useMemo(() => {
    if (!clients) return [];
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.sectors.some((s: string) => s.toLowerCase().includes(q)) ||
        c.slug.toLowerCase().includes(q)
    );
  }, [clients, search]);

  // Reset selection when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  // Reset search when opened
  useEffect(() => {
    if (open) {
      setSearch("");
      setSelectedIndex(0);
    }
  }, [open]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length)); // +1 for Global View
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (selectedIndex === 0) {
          // Global View
          navigate("/dashboard");
          onOpenChange(false);
        } else {
          const client = filtered[selectedIndex - 1];
          if (client) {
            setActiveOrg({
              id: client.id,
              name: client.name,
              slug: client.slug,
              type: client.type as "core" | "partner" | "client",
              status: client.status as "active" | "suspended" | "archived",
              description: client.description,
              ventureCount: client.ventureCount,
            });
            navigate(`/clients/${client.slug}`);
            onOpenChange(false);
          }
        }
      } else if (e.key === "Escape") {
        onOpenChange(false);
      }
    },
    [filtered, selectedIndex, navigate, onOpenChange, setActiveOrg]
  );

  const handleSelectClient = (client: (typeof filtered)[0]) => {
    setActiveOrg({
      id: client.id,
      name: client.name,
      slug: client.slug,
      type: client.type as "core" | "partner" | "client",
      status: client.status as "active" | "suspended" | "archived",
      description: client.description,
      ventureCount: client.ventureCount,
    });
    navigate(`/clients/${client.slug}`);
    onOpenChange(false);
  };

  const handleGlobalView = () => {
    navigate("/dashboard");
    onOpenChange(false);
  };

  if (!open) return null;

  // Summary stats
  const totalClients = clients?.length ?? 0;
  const totalVentures = clients?.reduce((s, c) => s + c.ventureCount, 0) ?? 0;
  const totalOverdue = clients?.reduce((s, c) => s + c.overdueTasks, 0) ?? 0;
  const avgHealth = totalClients > 0
    ? Math.round((clients?.reduce((s, c) => s + c.avgHealth, 0) ?? 0) / totalClients)
    : 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-150"
        onClick={() => onOpenChange(false)}
      />

      {/* Panel */}
      <div
        className="fixed inset-x-0 top-0 z-50 flex items-start justify-center pt-[10vh]"
        onClick={() => onOpenChange(false)}
      >
        <div
          className="w-full max-w-[640px] bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-top-4 fade-in duration-200"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={handleKeyDown}
        >
          {/* Search header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <Search className="size-4 text-muted-foreground flex-shrink-0" />
            <input
              type="text"
              placeholder="Search clients by name or sector..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              autoFocus
            />
            <button
              onClick={() => onOpenChange(false)}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Summary bar */}
          <div className="flex items-center gap-4 px-4 py-2 border-b border-border bg-secondary/30">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Building2 className="size-3" />
              <span className="font-mono">{totalClients}</span>
              <span>clients</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Layers3 className="size-3" />
              <span className="font-mono">{totalVentures}</span>
              <span>ventures</span>
            </div>
            {totalOverdue > 0 && (
              <div className="flex items-center gap-1.5 text-[11px] text-amber-400">
                <AlertTriangle className="size-3" />
                <span className="font-mono">{totalOverdue}</span>
                <span>overdue</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground ml-auto">
              <TrendingUp className="size-3" />
              <span className="font-mono">{avgHealth}%</span>
              <span>avg health</span>
            </div>
          </div>

          {/* Results */}
          <div className="max-h-[400px] overflow-y-auto">
            {/* Global View option */}
            <button
              onClick={handleGlobalView}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-border",
                selectedIndex === 0
                  ? "bg-primary/10 text-foreground"
                  : "text-muted-foreground hover:bg-secondary/50"
              )}
            >
              <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10">
                <Globe className="size-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">Global View</div>
                <div className="text-[11px] text-muted-foreground">
                  Cross-client dashboard — all clients at a glance
                </div>
              </div>
              <ArrowRight className="size-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>

            {/* Client cards */}
            {filtered.map((client, i) => {
              const isSelected = selectedIndex === i + 1;
              return (
                <button
                  key={client.id}
                  onClick={() => handleSelectClient(client)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-border last:border-b-0",
                    isSelected
                      ? "bg-primary/10 text-foreground"
                      : "text-foreground hover:bg-secondary/50"
                  )}
                >
                  {/* Health indicator */}
                  <div
                    className={cn(
                      "flex items-center justify-center size-8 rounded-lg flex-shrink-0",
                      getHealthBg(client.avgHealth)
                    )}
                  >
                    {client.avgHealth >= 75 ? (
                      <CheckCircle2 className={cn("size-4", getHealthColor(client.avgHealth))} />
                    ) : client.avgHealth >= 50 ? (
                      <AlertTriangle className={cn("size-4", getHealthColor(client.avgHealth))} />
                    ) : (
                      <AlertTriangle className={cn("size-4", getHealthColor(client.avgHealth))} />
                    )}
                  </div>

                  {/* Client info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate capitalize">{client.name}</span>
                      {client.overdueTasks > 0 && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 flex-shrink-0">
                          {client.overdueTasks} overdue
                        </span>
                      )}
                      {client.status === "suspended" && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 flex-shrink-0">
                          suspended
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {/* Sectors */}
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        {client.sectors.slice(0, 3).map((s: string) => (
                          <span
                            key={s}
                            className="px-1.5 py-0.5 rounded bg-secondary text-[10px] font-mono"
                          >
                            {s}
                          </span>
                        ))}
                        {client.sectors.length > 3 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{client.sectors.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right stats */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="flex flex-col items-end">
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {client.ventureCount} ventures
                      </span>
                      <span className={cn("text-[11px] font-mono", getHealthColor(client.avgHealth))}>
                        {getHealthLabel(client.avgHealth)} · {client.avgHealth}%
                      </span>
                    </div>
                    <ArrowRight className="size-3.5 text-muted-foreground/30" />
                  </div>
                </button>
              );
            })}

            {/* Empty state */}
            {filtered.length === 0 && (
              <div className="px-4 py-8 text-center">
                <Building2 className="size-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {search ? `No clients matching "${search}"` : "No clients found"}
                </p>
              </div>
            )}
          </div>

          {/* Footer hint */}
          <div className="flex items-center gap-4 px-4 py-2 border-t border-border bg-secondary/20">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <kbd className="px-1 py-0.5 rounded bg-secondary border border-border font-mono text-[9px]">↑↓</kbd>
              <span>navigate</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <kbd className="px-1 py-0.5 rounded bg-secondary border border-border font-mono text-[9px]">↵</kbd>
              <span>select</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <kbd className="px-1 py-0.5 rounded bg-secondary border border-border font-mono text-[9px]">esc</kbd>
              <span>close</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
