// ============================================================================
// StatusBadge — Swiss Instrument design
// Color-coded status badges: Automated (blue), Done (green), Pending (amber), Overdue (red)
// ============================================================================

import { cn } from "@/lib/utils";
import { STATUS_CONFIG, type TaskStatus } from "@/lib/data";

interface StatusBadgeProps {
  status: TaskStatus;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border",
        config.bg,
        className
      )}
    >
      <span className={cn("size-1.5 rounded-full", config.dot)} />
      {config.label}
    </span>
  );
}
