// ============================================================================
// Topbar — Swiss Instrument design
// Persistent top bar with search, notifications, user avatar
// ============================================================================

import { cn } from "@/lib/utils";
import { Bell, Search } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface TopbarProps {
  title: string;
  subtitle?: string;
}

export default function Topbar({ title, subtitle }: TopbarProps) {
  return (
    <header className="h-14 border-b border-border bg-background/80 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex flex-col">
        <h1 className="text-sm font-semibold tracking-tight text-foreground leading-tight">{title}</h1>
        {subtitle && (
          <p className="text-[11px] text-muted-foreground font-mono tracking-wide">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <button className="flex items-center gap-2 h-8 px-3 rounded-md bg-secondary/50 text-muted-foreground text-xs hover:bg-secondary transition-colors">
          <Search className="size-3.5" />
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden sm:inline text-[10px] font-mono bg-background/50 px-1.5 py-0.5 rounded border border-border">
            /
          </kbd>
        </button>

        {/* Notifications */}
        <button className="relative flex items-center justify-center size-8 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
          <Bell className="size-4" />
          <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-red-500" />
        </button>

        {/* User */}
        <div className="flex items-center gap-2 pl-3 border-l border-border">
          <Avatar className="size-7">
            <AvatarFallback className="bg-primary/20 text-primary text-[10px] font-semibold">
              AT
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:flex flex-col">
            <span className="text-xs font-medium text-foreground leading-tight">ATLAS Admin</span>
            <span className="text-[10px] text-muted-foreground font-mono">ops@atlas.vc</span>
          </div>
        </div>
      </div>
    </header>
  );
}
