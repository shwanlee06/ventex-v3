import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import { VENTURES, SPVS, TEAM } from "@/lib/data";
import { useLocation } from "wouter";
import { useEffect, useCallback } from "react";
import {
  Layers3,
  Briefcase,
  Users,
  LayoutDashboard,
  Bot,
  DollarSign,
  Shield,
} from "lucide-react";

const PAGES = [
  { name: "Dashboard", href: "/", icon: <LayoutDashboard className="size-4 text-muted-foreground" /> },
  { name: "AI Agent", href: "/agent", icon: <Bot className="size-4 text-muted-foreground" /> },
  { name: "Ventures", href: "/ventures", icon: <Layers3 className="size-4 text-muted-foreground" /> },
  { name: "SPVs & Deals", href: "/spvs", icon: <Briefcase className="size-4 text-muted-foreground" /> },
  { name: "Team & Contacts", href: "/team", icon: <Users className="size-4 text-muted-foreground" /> },
  { name: "Distributions", href: "/distributions", icon: <DollarSign className="size-4 text-muted-foreground" /> },
  { name: "Settings", href: "/settings", icon: <Shield className="size-4 text-muted-foreground" /> },
];

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [, navigate] = useLocation();

  const handleSelect = useCallback((href: string) => {
    onOpenChange(false);
    navigate(href);
  }, [onOpenChange, navigate]);

  // Global keyboard shortcut: /
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        onOpenChange(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onOpenChange]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Search" description="Search ventures, SPVs, team, and pages">
      <CommandInput placeholder="Search ventures, SPVs, team, pages..." />
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
          {VENTURES.map((v) => (
            <CommandItem key={v.id} onSelect={() => handleSelect("/ventures")}>
              <Layers3 className="size-4 text-muted-foreground" />
              <span>{v.name}</span>
              <span className="ml-auto text-[10px] font-mono text-muted-foreground">{v.theme}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="SPVs & Deals">
          {SPVS.map((s) => (
            <CommandItem key={s.id} onSelect={() => handleSelect("/spvs")}>
              <Briefcase className="size-4 text-muted-foreground" />
              <span>{s.name}</span>
              <span className="ml-auto text-[10px] font-mono text-muted-foreground">{s.theme}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Team">
          {TEAM.map((t) => (
            <CommandItem key={t.id} onSelect={() => handleSelect("/team")}>
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
