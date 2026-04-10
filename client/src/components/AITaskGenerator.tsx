// AI Task Generator — Analyzes venture data and suggests intelligent tasks

import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Zap,
  Loader2,
  Brain,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Target,
  FileText,
  Shield,
  Calendar,
  Users,
  DollarSign,
  Layers3,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SuggestedTask {
  title: string;
  description: string;
  priority: "High" | "Medium" | "Low";
  dueInDays: number;
  ventureName: string;
  ventureId: number | null;
  category: string;
  reasoning: string;
  dueDate: string;
}

interface AITaskGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: number;
  organizationName: string;
  onTasksCreated?: () => void;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "follow-up": <Clock className="size-3.5" />,
  "risk-mitigation": <Shield className="size-3.5" />,
  "document-action": <FileText className="size-3.5" />,
  "meeting-action": <Users className="size-3.5" />,
  "milestone": <Target className="size-3.5" />,
  "health-intervention": <AlertTriangle className="size-3.5" />,
  "spv-progression": <Layers3 className="size-3.5" />,
  "distribution": <DollarSign className="size-3.5" />,
  "general": <Sparkles className="size-3.5" />,
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  "follow-up": { bg: "bg-blue-500/10", text: "text-blue-400" },
  "risk-mitigation": { bg: "bg-red-500/10", text: "text-red-400" },
  "document-action": { bg: "bg-purple-500/10", text: "text-purple-400" },
  "meeting-action": { bg: "bg-cyan-500/10", text: "text-cyan-400" },
  "milestone": { bg: "bg-emerald-500/10", text: "text-emerald-400" },
  "health-intervention": { bg: "bg-amber-500/10", text: "text-amber-400" },
  "spv-progression": { bg: "bg-indigo-500/10", text: "text-indigo-400" },
  "distribution": { bg: "bg-green-500/10", text: "text-green-400" },
  "general": { bg: "bg-secondary", text: "text-muted-foreground" },
};

const PRIORITY_COLORS: Record<string, string> = {
  High: "bg-red-500/10 text-red-400",
  Medium: "bg-amber-500/10 text-amber-400",
  Low: "bg-secondary text-muted-foreground",
};

export default function AITaskGenerator({
  open,
  onOpenChange,
  organizationId,
  organizationName,
  onTasksCreated,
}: AITaskGeneratorProps) {
  const [suggestions, setSuggestions] = useState<SuggestedTask[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [phase, setPhase] = useState<"idle" | "analyzing" | "review" | "creating" | "done">("idle");
  const [ventureCount, setVentureCount] = useState(0);

  const generateMutation = trpc.aiTasks.generateSuggestions.useMutation();
  const approveMutation = trpc.aiTasks.approveAndCreate.useMutation();

  const handleGenerate = useCallback(async () => {
    setPhase("analyzing");
    setSuggestions([]);
    setSelectedIds(new Set());
    setExpandedIds(new Set());

    try {
      const result = await generateMutation.mutateAsync({ organizationId });
      setSuggestions(result.suggestions);
      setVentureCount(result.ventureCount);

      // Auto-select all high priority tasks, and medium priority
      const autoSelect = new Set<number>();
      result.suggestions.forEach((s: SuggestedTask, i: number) => {
        if (s.priority === "High" || s.priority === "Medium") {
          autoSelect.add(i);
        }
      });
      setSelectedIds(autoSelect);
      setPhase("review");

      if (result.suggestions.length === 0) {
        toast.info("No new tasks needed — this client's ventures are well-managed!");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to generate task suggestions");
      setPhase("idle");
    }
  }, [organizationId, generateMutation]);

  const handleApprove = useCallback(async () => {
    const selected = Array.from(selectedIds).map(i => suggestions[i]).filter(Boolean);
    if (selected.length === 0) {
      toast.error("Select at least one task to create");
      return;
    }

    setPhase("creating");
    try {
      const result = await approveMutation.mutateAsync({
        organizationId,
        tasks: selected.map(s => ({
          title: s.title,
          description: s.description,
          priority: s.priority,
          ventureId: s.ventureId,
          dueDate: s.dueDate,
          assigneeNames: [],
        })),
      });
      setPhase("done");
      toast.success(`${result.count} tasks created successfully`);
      onTasksCreated?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to create tasks");
      setPhase("review");
    }
  }, [selectedIds, suggestions, organizationId, approveMutation, onTasksCreated]);

  const toggleSelect = (idx: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleExpand = (idx: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(suggestions.map((_, i) => i)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const selectedCount = selectedIds.size;

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setPhase("idle");
      setSuggestions([]);
      setSelectedIds(new Set());
      setExpandedIds(new Set());
    }
    onOpenChange(open);
  };

  const categorySummary = suggestions.reduce((acc, s) => {
    acc[s.category] = (acc[s.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10">
              <Brain className="size-4 text-primary" />
            </div>
            AI Task Intelligence
          </DialogTitle>
          <DialogDescription>
            {phase === "idle" && `Analyze ${organizationName}'s venture data to generate intelligent task recommendations.`}
            {phase === "analyzing" && `Analyzing venture data for ${organizationName}...`}
            {phase === "review" && `${suggestions.length} task${suggestions.length !== 1 ? "s" : ""} suggested from ${ventureCount} venture${ventureCount !== 1 ? "s" : ""}. Review and approve.`}
            {phase === "creating" && "Creating approved tasks..."}
            {phase === "done" && "Tasks created successfully!"}
          </DialogDescription>
        </DialogHeader>

        {/* ── Idle: Start button ──────────────────────────────────── */}
        {phase === "idle" && (
          <div className="flex-1 flex flex-col items-center justify-center py-12 gap-6">
            <div className="relative">
              <div className="size-20 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center">
                <Sparkles className="size-8 text-primary" />
              </div>
              <div className="absolute -top-1 -right-1 size-5 rounded-full bg-primary flex items-center justify-center">
                <Zap className="size-3 text-primary-foreground" />
              </div>
            </div>
            <div className="text-center space-y-2 max-w-sm">
              <p className="text-sm text-foreground font-medium">
                Velocity AI Task Engine
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                AI will analyze all ventures, SPVs, risks, documents, meeting notes, and observations
                for <strong>{organizationName}</strong> to determine what tasks need to be created.
              </p>
            </div>
            <Button onClick={handleGenerate} size="lg" className="gap-2">
              <Brain className="size-4" />
              Analyze & Generate Tasks
            </Button>
          </div>
        )}

        {/* ── Analyzing: Loading state ────────────────────────────── */}
        {phase === "analyzing" && (
          <div className="flex-1 flex flex-col items-center justify-center py-12 gap-6">
            <div className="relative">
              <div className="size-20 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center animate-pulse">
                <Brain className="size-8 text-primary" />
              </div>
              <Loader2 className="absolute -top-2 -right-2 size-6 text-primary animate-spin" />
            </div>
            <div className="text-center space-y-3 max-w-sm">
              <p className="text-sm text-foreground font-medium">Analyzing Venture Data...</p>
              <div className="space-y-2">
                {[
                  "Exporting venture portfolio data",
                  "Scanning risks and overdue items",
                  "Processing document intelligence",
                  "Reviewing meeting action items",
                  "Generating task recommendations",
                ].map((step, i) => (
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.8, duration: 0.3 }}
                    className="flex items-center gap-2 text-xs text-muted-foreground"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: i * 0.8 + 0.5, duration: 0.2 }}
                    >
                      <CheckCircle2 className="size-3 text-emerald-400" />
                    </motion.div>
                    {step}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Review: Task suggestions ────────────────────────────── */}
        {phase === "review" && suggestions.length > 0 && (
          <>
            {/* Category summary pills */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {Object.entries(categorySummary).map(([cat, count]) => {
                const colors = CATEGORY_COLORS[cat] || CATEGORY_COLORS.general;
                return (
                  <span
                    key={cat}
                    className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium", colors.bg, colors.text)}
                  >
                    {CATEGORY_ICONS[cat] || CATEGORY_ICONS.general}
                    {cat.replace(/-/g, " ")}
                    <span className="font-mono opacity-70">{count}</span>
                  </span>
                );
              })}
            </div>

            {/* Select controls */}
            <div className="flex items-center justify-between py-2 border-b border-border">
              <div className="flex items-center gap-3">
                <button onClick={selectAll} className="text-[11px] text-primary hover:underline">
                  Select all
                </button>
                <button onClick={deselectAll} className="text-[11px] text-muted-foreground hover:underline">
                  Deselect all
                </button>
              </div>
              <span className="text-[11px] font-mono text-muted-foreground">
                {selectedCount}/{suggestions.length} selected
              </span>
            </div>

            {/* Task list */}
            <ScrollArea className="flex-1 -mx-6 px-6" style={{ maxHeight: "45vh" }}>
              <div className="space-y-2 py-2">
                <AnimatePresence>
                  {suggestions.map((task, idx) => {
                    const isSelected = selectedIds.has(idx);
                    const isExpanded = expandedIds.has(idx);
                    const catColors = CATEGORY_COLORS[task.category] || CATEGORY_COLORS.general;

                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03, duration: 0.2 }}
                        className={cn(
                          "border rounded-lg transition-all",
                          isSelected
                            ? "border-primary/30 bg-primary/5"
                            : "border-border bg-card hover:border-border/80"
                        )}
                      >
                        {/* Main row */}
                        <div className="flex items-start gap-3 p-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelect(idx)}
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-foreground">{task.title}</span>
                              <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", PRIORITY_COLORS[task.priority])}>
                                {task.priority}
                              </span>
                              <span className={cn("inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full", catColors.bg, catColors.text)}>
                                {CATEGORY_ICONS[task.category]}
                                {task.category.replace(/-/g, " ")}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                                <Layers3 className="size-3" />
                                {task.ventureName}
                              </span>
                              <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                                <Calendar className="size-3" />
                                Due {task.dueDate}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => toggleExpand(idx)}
                            className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                          >
                            {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                          </button>
                        </div>

                        {/* Expanded reasoning */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="px-3 pb-3 pt-0 ml-9">
                                <div className="bg-secondary/50 rounded-md p-3">
                                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1 font-medium">
                                    AI Reasoning
                                  </p>
                                  <p className="text-xs text-foreground leading-relaxed">
                                    {task.reasoning}
                                  </p>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </>
        )}

        {/* ── Review: No suggestions ──────────────────────────────── */}
        {phase === "review" && suggestions.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center py-12 gap-4">
            <CheckCircle2 className="size-12 text-emerald-400" />
            <div className="text-center space-y-2">
              <p className="text-sm font-medium text-foreground">All Clear</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                No new tasks needed for {organizationName}. All ventures are well-tracked
                with no outstanding action items.
              </p>
            </div>
          </div>
        )}

        {/* ── Creating: Progress ──────────────────────────────────── */}
        {phase === "creating" && (
          <div className="flex-1 flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="size-10 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Creating {selectedCount} tasks...</p>
          </div>
        )}

        {/* ── Done: Success ───────────────────────────────────────── */}
        {phase === "done" && (
          <div className="flex-1 flex flex-col items-center justify-center py-12 gap-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
            >
              <CheckCircle2 className="size-14 text-emerald-400" />
            </motion.div>
            <div className="text-center space-y-2">
              <p className="text-sm font-medium text-foreground">Tasks Created</p>
              <p className="text-xs text-muted-foreground">
                {selectedCount} intelligent tasks have been created for {organizationName}.
                They are now visible in the task management view.
              </p>
            </div>
          </div>
        )}

        {/* ── Footer ──────────────────────────────────────────────── */}
        <DialogFooter className="gap-2">
          {phase === "review" && suggestions.length > 0 && (
            <>
              <Button variant="outline" onClick={() => setPhase("idle")}>
                Re-analyze
              </Button>
              <Button
                onClick={handleApprove}
                disabled={selectedCount === 0}
                className="gap-1.5"
              >
                <Zap className="size-4" />
                Create {selectedCount} Task{selectedCount !== 1 ? "s" : ""}
              </Button>
            </>
          )}
          {phase === "review" && suggestions.length === 0 && (
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Close
            </Button>
          )}
          {phase === "done" && (
            <Button onClick={() => handleOpenChange(false)}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
