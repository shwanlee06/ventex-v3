// ============================================================================
// Blueprints Page — Process Blueprint Management
// Lists process templates per organization, with generate + create actions
// ============================================================================
import DashboardLayout from "@/components/DashboardLayout";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Layers3,
  Plus,
  Sparkles,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useState, useMemo } from "react";

const SECTORS = [
  "Real Estate",
  "Yacht",
  "F&B",
  "Entertainment",
  "Oil & Gas",
  "Others",
];

const CONFIDENCE_STYLES: Record<string, { bg: string; text: string }> = {
  High: { bg: "bg-emerald-500/10", text: "text-emerald-400" },
  Medium: { bg: "bg-amber-500/10", text: "text-amber-400" },
  Low: { bg: "bg-red-500/10", text: "text-red-400" },
};

export default function BlueprintsPage() {
  const { organizations, activeOrg, activeOrgId } = useWorkspace();
  const [selectedOrgId, setSelectedOrgId] = useState<number | undefined>(activeOrgId);
  const [showGenerate, setShowGenerate] = useState(false);
  const [generateSector, setGenerateSector] = useState("Real Estate");
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createSector, setCreateSector] = useState("Real Estate");

  const orgId = selectedOrgId || activeOrgId;

  // Fetch blueprints for selected org
  const {
    data: blueprints,
    isLoading,
    refetch,
  } = trpc.blueprints.list.useQuery(
    { organizationId: orgId! },
    { enabled: !!orgId }
  );

  const generateMutation = trpc.blueprints.generateFromSector.useMutation({
    onSuccess: () => {
      toast.success("Blueprints generated successfully");
      setShowGenerate(false);
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to generate blueprints");
    },
  });

  const createMutation = trpc.blueprints.create.useMutation({
    onSuccess: () => {
      toast.success("Blueprint created");
      setShowCreate(false);
      setCreateName("");
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create blueprint");
    },
  });

  const handleGenerate = () => {
    if (!orgId) return;
    generateMutation.mutate({
      organizationId: orgId,
      sector: generateSector,
    });
  };

  const handleCreate = () => {
    if (!orgId || !createName.trim()) return;
    createMutation.mutate({
      organizationId: orgId,
      name: createName.trim(),
      sector: createSector,
    });
  };

  const activeOrgs = useMemo(
    () => organizations.filter((o) => o.status === "active"),
    [organizations]
  );

  return (
    <DashboardLayout title="Blueprints" subtitle="PROCESS TEMPLATES">
      <div className="p-4 md:p-6 space-y-6">
        {/* Header bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-primary/10">
              <Layers3 className="size-5 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-foreground">
                Process Blueprints
              </h1>
              <p className="text-xs text-muted-foreground">
                Standardized workflows for venture lifecycle management
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Org selector */}
            {activeOrgs.length > 1 && (
              <Select
                value={String(orgId || "")}
                onValueChange={(v) => setSelectedOrgId(Number(v))}
              >
                <SelectTrigger className="h-8 w-[180px] text-xs">
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {activeOrgs.map((org) => (
                    <SelectItem key={org.id} value={String(org.id)}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => setShowGenerate(true)}
              disabled={!orgId}
            >
              <Sparkles className="size-3.5" />
              Generate
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => setShowCreate(true)}
              disabled={!orgId}
            >
              <Plus className="size-3.5" />
              Create
            </Button>
          </div>
        </div>

        {/* No org selected */}
        {!orgId && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Layers3 className="size-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-sm font-medium text-foreground mb-1">
              Select a client
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              Choose a client organization to view and manage their process
              blueprints.
            </p>
          </div>
        )}

        {/* Loading state */}
        {orgId && isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-lg" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {orgId && !isLoading && (!blueprints || blueprints.length === 0) && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex items-center justify-center size-16 rounded-2xl bg-primary/5 mb-4">
              <FileText className="size-8 text-muted-foreground/40" />
            </div>
            <h3 className="text-sm font-medium text-foreground mb-1">
              No blueprints yet
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mb-4">
              Generate blueprints from a sector template or create a custom one
              to define the standard process for this client's ventures.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1.5"
                onClick={() => setShowGenerate(true)}
              >
                <Sparkles className="size-3.5" />
                Generate from Sector
              </Button>
              <Button
                size="sm"
                className="text-xs gap-1.5"
                onClick={() => setShowCreate(true)}
              >
                <Plus className="size-3.5" />
                Create Manually
              </Button>
            </div>
          </div>
        )}

        {/* Blueprint cards */}
        {orgId && !isLoading && blueprints && blueprints.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {blueprints.map((bp, i) => {
              const conf = CONFIDENCE_STYLES[bp.confidence || "Medium"] || CONFIDENCE_STYLES.Medium;
              return (
                <motion.div
                  key={bp.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                  className="bg-card border border-border rounded-lg p-4 hover:border-primary/30 transition-all group cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center size-8 rounded-md bg-primary/10">
                        <Layers3 className="size-4 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-foreground line-clamp-1">
                          {bp.blueprintName}
                        </h3>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {bp.sector}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px] px-1.5 py-0",
                          conf.bg,
                          conf.text
                        )}
                      >
                        {bp.confidence || "Medium"} confidence
                      </Badge>
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0"
                      >
                        {bp.source || "document"}
                      </Badge>
                    </div>

                    {bp.sourceDocumentName && (
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <FileText className="size-3" />
                        <span className="truncate">{bp.sourceDocumentName}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 pt-3 border-t border-border">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <RefreshCw className="size-3" />
                      <span>{bp.refinementCount} refinements</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Clock className="size-3" />
                      <span>
                        {new Date(bp.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Generate from Sector Dialog */}
      <Dialog open={showGenerate} onOpenChange={setShowGenerate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              Generate Blueprints
            </DialogTitle>
            <DialogDescription className="text-xs">
              Use AI to generate standard process blueprints based on the
              selected sector. This creates a template with typical stages and
              steps.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">
                Sector
              </label>
              <Select
                value={generateSector}
                onValueChange={setGenerateSector}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SECTORS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGenerate(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={handleGenerate}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5" />
              )}
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Blueprint Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Create Blueprint</DialogTitle>
            <DialogDescription className="text-xs">
              Create a new process blueprint manually. You can add stages and
              steps after creation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">
                Blueprint Name
              </label>
              <Input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="e.g. Real Estate Acquisition Process"
                className="h-9 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">
                Sector
              </label>
              <Select value={createSector} onValueChange={setCreateSector}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SECTORS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={handleCreate}
              disabled={createMutation.isPending || !createName.trim()}
            >
              {createMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Plus className="size-3.5" />
              )}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
