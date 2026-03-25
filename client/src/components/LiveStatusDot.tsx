import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type LiveStatus = "online" | "away" | "offline" | "on_leave" | "deactivated";

const STATUS_CONFIG: Record<LiveStatus, { color: string; pulse: boolean; label: string }> = {
  online: { color: "bg-emerald-400", pulse: true, label: "Online" },
  away: { color: "bg-amber-400", pulse: false, label: "Away" },
  offline: { color: "bg-zinc-500", pulse: false, label: "Offline" },
  on_leave: { color: "bg-blue-400", pulse: false, label: "On Leave" },
  deactivated: { color: "bg-red-400", pulse: false, label: "Deactivated" },
};

function formatLastSeen(lastSeenAt: string | null): string {
  if (!lastSeenAt) return "Never seen";
  const diff = Date.now() - new Date(lastSeenAt).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface LiveStatusDotProps {
  status: LiveStatus;
  lastSeenAt?: string | null;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export default function LiveStatusDot({
  status,
  lastSeenAt,
  size = "sm",
  showLabel = false,
  className,
}: LiveStatusDotProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.offline;
  const sizeClasses = {
    sm: "size-2",
    md: "size-2.5",
    lg: "size-3",
  };

  const dot = (
    <span className={cn("relative inline-flex", className)}>
      <span className={cn("rounded-full", config.color, sizeClasses[size])} />
      {config.pulse && (
        <span className={cn(
          "absolute inset-0 rounded-full animate-ping opacity-40",
          config.color,
          sizeClasses[size],
        )} />
      )}
    </span>
  );

  if (showLabel) {
    return (
      <span className="inline-flex items-center gap-1.5">
        {dot}
        <span className="text-[10px] font-mono text-muted-foreground">
          {config.label}
          {lastSeenAt && status !== "online" && ` · ${formatLastSeen(lastSeenAt)}`}
        </span>
      </span>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{dot}</TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        <p className="font-medium">{config.label}</p>
        {lastSeenAt && <p className="text-muted-foreground">{formatLastSeen(lastSeenAt)}</p>}
      </TooltipContent>
    </Tooltip>
  );
}

export { formatLastSeen, STATUS_CONFIG };
export type { LiveStatus };
