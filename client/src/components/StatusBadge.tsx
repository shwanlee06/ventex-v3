// ============================================================================
// StatusBadge — Swiss Instrument design
// Flexible status badge that works with multiple status config maps
// ============================================================================

import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  label: string;
  color?: string;
  bg?: string;
  dot?: string;
  className?: string;
}

export default function StatusBadge({ label, color, bg, dot, className }: StatusBadgeProps) {
  // Default styling if no config provided
  const defaultBg = "bg-secondary text-muted-foreground border-border";
  const defaultDot = "bg-muted-foreground";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border",
        bg || defaultBg,
        className
      )}
    >
      <span className={cn("size-1.5 rounded-full", dot || defaultDot)} />
      {label}
    </span>
  );
}
