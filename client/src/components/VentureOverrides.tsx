// VentureOverrides — Layer 3 per-venture process step overrides
// Compact panel for the VentureDetail page
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { useState, useCallback } from "react";
import {
  Plus,
  Trash2,
  Settings2,
  Loader2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Props {
  ventureId: number;
}

const OVERRIDE_TYPES = [
  { value: "cadence", label: "Cadence", desc: "Change timeline" },
  { value: "contact", label: "Contact", desc: "Change owner" },
  { value: "escalation", label: "Escalation", desc: "Escalation rule" },
  { value: "skip", label: "Skip", desc: "Skip this step" },
  { value: "custom", label: "Custom", desc: "Custom override" },
];

export default function VentureOverrides({ ventureId }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  // Form state
  const [overrideType, setOverrideType] = useState("cadence");
  const [overrideField, setOverrideField] = useState("");
  const [overrideValue, setOverrideValue] = useState("");
  const [reason, setReason] = useState("");

  const utils = trpc.useUtils();

  // Get the effective blueprint for this venture (includes steps)
  const blueprintQ = trpc.blueprints.getBlueprintForVenture.useQuery(
    { ventureId },
    { staleTime: 60_000 }
  );

  // Get existing overrides
  const overridesQ = trpc.blueprints.listOverrides.useQuery(
    { ventureId },
    { staleTime: 30_000 }
  );

  const addOverride = trpc.blueprints.addOverride.useMutation({
    onSuccess: () => {
      toast.success("Override added");
      setShowAdd(false);
      setOverrideField("");
      setOverrideValue("");
      setReason("");
      utils.blueprints.listOverrides.invalidate({ ventureId });
      utils.blueprints.getBlueprintForVenture.invalidate({ ventureId });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const removeOverride = trpc.blueprints.removeOverride.useMutation({
    onSuccess: () => {
      toast.success("Override removed");
      utils.blueprints.listOverrides.invalidate({ ventureId });
      utils.blueprints.getBlueprintForVenture.invalidate({ ventureId });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const blueprint = blueprintQ.data;
  const overrides = overridesQ.data || [];

  const handleAdd = useCallback(() => {
    if (!blueprint?.template || !overrideValue.trim()) return;
    addOverride.mutate({
      ventureId,
      processTemplateId: blueprint.template.id,
      overrideType,
      overrideField: overrideField || undefined,
      overrideValue: overrideValue.trim(),
      reason: reason.trim() || undefined,
    });
  }, [ventureId, blueprint, overrideType, overrideField, overrideValue, reason, addOverride]);

  if (!blueprint?.template) return null;

  const layer = blueprint.blueprintLayer as string | null;
  const layerLabel =
    overrides.length > 0
      ? "Venture Override"
      : layer === "client_blueprint"
        ? "Client Blueprint"
        : "Sector Default";

  return (
    <div className="space-y-3">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left group"
      >
        {expanded ? (
          <ChevronDown className="size-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-3.5 text-muted-foreground" />
        )}
        <Settings2 className="size-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold text-foreground">Process Overrides</span>
        <Badge
          variant="secondary"
          className="text-[9px] px-1.5 py-0 ml-1"
        >
          {layerLabel}
        </Badge>
        {overrides.length > 0 && (
          <span className="text-[10px] font-mono text-primary ml-auto">
            {overrides.length} active
          </span>
        )}
      </button>

      {expanded && (
        <div className="space-y-2 ml-5">
          {/* Blueprint info */}
          <div className="text-[10px] text-muted-foreground">
            Using: <span className="font-medium text-foreground">{blueprint.template.blueprintName}</span>
            <span className="mx-1">·</span>
            {blueprint.steps?.length || 0} steps
          </div>

          {/* Existing overrides */}
          {overrides.length > 0 && (
            <div className="space-y-1">
              {overrides.map((ov: any) => {
                const typeInfo = OVERRIDE_TYPES.find((t) => t.value === ov.overrideType);
                return (
                  <div
                    key={ov.id}
                    className="flex items-center gap-2 py-1.5 px-2 rounded bg-accent/20 group/ov"
                  >
                    <Badge
                      variant="secondary"
                      className="text-[9px] px-1.5 py-0 flex-shrink-0"
                    >
                      {typeInfo?.label || ov.overrideType}
                    </Badge>
                    {ov.overrideField && (
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {ov.overrideField}:
                      </span>
                    )}
                    <span className="text-[10px] text-foreground truncate flex-1">
                      {ov.overrideValue}
                    </span>
                    {ov.reason && (
                      <span className="text-[9px] text-muted-foreground truncate max-w-[120px]">
                        ({ov.reason})
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 opacity-0 group-hover/ov:opacity-100 transition-opacity flex-shrink-0"
                      onClick={() => removeOverride.mutate({ overrideId: ov.id })}
                      disabled={removeOverride.isPending}
                    >
                      <Trash2 className="size-3 text-muted-foreground hover:text-red-400" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add override form */}
          {showAdd ? (
            <div className="space-y-2 p-3 rounded-lg border border-border bg-card">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Type</label>
                  <Select value={overrideType} onValueChange={setOverrideType}>
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OVERRIDE_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Field</label>
                  <Input
                    value={overrideField}
                    onChange={(e) => setOverrideField(e.target.value)}
                    placeholder="e.g. typicalDays"
                    className="h-7 text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Value</label>
                <Input
                  value={overrideValue}
                  onChange={(e) => setOverrideValue(e.target.value)}
                  placeholder="Override value"
                  className="h-7 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Reason (optional)</label>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why this override?"
                  className="h-7 text-xs"
                />
              </div>
              <div className="flex justify-end gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px]"
                  onClick={() => setShowAdd(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-6 text-[10px] gap-1"
                  onClick={handleAdd}
                  disabled={!overrideValue.trim() || addOverride.isPending}
                >
                  {addOverride.isPending ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Plus className="size-3" />
                  )}
                  Add
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[10px] gap-1 w-full"
              onClick={() => setShowAdd(true)}
            >
              <Plus className="size-3" />
              Add Override
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
