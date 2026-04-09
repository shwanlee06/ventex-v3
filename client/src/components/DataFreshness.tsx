// ============================================================================
// DataFreshness — Shows "Updated Xm ago" with live pulse indicator
// ============================================================================

import { useEffect, useState } from "react";

interface DataFreshnessProps {
  updatedAt: number | Date | undefined; // timestamp or Date
  className?: string;
  prefix?: string;
}

function formatAgo(ts: number): string {
  const diff = Date.now() - ts;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function DataFreshness({ updatedAt, className = "", prefix = "Updated" }: DataFreshnessProps) {
  const [display, setDisplay] = useState("");

  useEffect(() => {
    if (!updatedAt) return;
    const ts = typeof updatedAt === "number" ? updatedAt : updatedAt.getTime();

    const update = () => setDisplay(formatAgo(ts));
    update();

    const iv = setInterval(update, 15000); // refresh every 15s
    return () => clearInterval(iv);
  }, [updatedAt]);

  if (!updatedAt || !display) return null;

  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground ${className}`}>
      <span className="size-1.5 rounded-full bg-emerald-400/60 animate-pulse" />
      {prefix} {display}
    </span>
  );
}
