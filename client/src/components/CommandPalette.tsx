import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useEffect, useCallback, useState } from "react";
import {
  Layers3,
  Briefcase,
  Users,
  LayoutDashboard,
  DollarSign,
  Shield,
  ListChecks,
  CheckSquare,
} from "lucide-react";

const PAGES = [
  { name: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="size-4 text-muted-foreground" /> },
  { name: "Ventures", href: "/ventures", icon: <Layers3 className="size-4 text-muted-foreground" /> },
  { name: "SPVs & Deals", href: "/spvs", icon: <Briefcase className="size-4 text-muted-foreground" /> },
  { name: "Team & Contacts", href: "/team", icon: <Users className="size-4 text-muted-foreground" /> },
  { name: "Tasks", href: "/tasks", icon: <ListChecks className="size-4 text-muted-foreground" /> },
  { name: "Distributions", href: "/distributions", icon: <DollarSign className="size-4 text-muted-foreground" /> },
  { name: "Decisions", href: "/decisions", icon: <CheckSquare className="size-4 text-muted-foreground" /> },
  { name: "Settings", href: "/settings", icon: <Shield className="size-4 text-muted-foreground" /> },
];

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [, navigate] = useLocation();

  // Live data for search
  const venturesQ = trpc.ventures.list.useQuery(undefined, { enabled: open });
  const spvsQ = trpc.spvs.list.useQuery(undefined, { enabled: open });
  const teamQ = trpc.team.list.useQuery(undefined, { enabled: open });
  const tasksQ = trpc.tasks.list.useQuery(undefined, { enabled: open });

  const ventures = venturesQ.data || [];
  const spvsList = spvsQ.data || [];
  const team = teamQ.data || [];
  const tasks = tasksQ.data || [];

  const handleSelect = useCallback((href: string) => {
    onOpenChange(false);
    navigate(href);
  }, [onOpenChange, navigate]);

  // Global keyboard shortcut: Cmd+K / Ctrl+K / /
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        onOpenChange(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onOpenChange, open]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Search" description="Search ventures, SPVs, team, tasks, and pages">
      <CommandInput placeholder="Search clients, ventures, tasks" />
      <CommandList className="max-h-[400px]">
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Pages">
          {PAGES.map((page) => (
            <CommandItem key={page.href} onSelect={() => handleSelect(page.href)}>
              {page.icon}
              <span>{page.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Ventures">
          {ventures.map((v) => (
            <CommandItem key={v.id} onSelect={() => handleSelect(`/ventures/${v.slug}`)}>
              <Layers3 className="size-4 text-muted-foreground" />
              <span>{v.name}</span>
              <span className="ml-auto text-[10px] font-mono text-muted-foreground">{v.sector}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="SPVs & Deals">
          {spvsList.map((s) => (
            <CommandItem key={s.id} onSelect={() => handleSelect(`/spvs/${s.slug}`)}>
              <Briefcase className="size-4 text-muted-foreground" />
              <span>{s.name}</span>
              <span className="ml-auto text-[10px] font-mono text-muted-foreground">{s.sector}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Tasks">
          {tasks.slice(0, 15).map((t) => (
            <CommandItem key={t.id} onSelect={() => handleSelect("/tasks")}>
              <ListChecks className="size-4 text-muted-foreground" />
              <span>{t.title}</span>
              <span className="ml-auto text-[10px] font-mono text-muted-foreground">{t.status}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Team">
          {team.map((t) => (
            <CommandItem key={t.id} onSelect={() => handleSelect(`/team/${t.slug}`)}>
              <Users className="size-4 text-muted-foreground" />
              <span>{t.name}</span>
              <span className="ml-auto text-[10px] font-mono text-muted-foreground">{t.role}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
