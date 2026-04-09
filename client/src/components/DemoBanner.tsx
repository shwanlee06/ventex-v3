// ============================================================================
// DemoBanner — Persistent banner shown in demo mode
// Shows "You're viewing a demo" with CTA to request access
// ============================================================================

import { useDemo } from "@/contexts/DemoContext";
import { Eye, ArrowRight, X } from "lucide-react";
import { useState } from "react";

export default function DemoBanner() {
  const { isDemo } = useDemo();
  const [dismissed, setDismissed] = useState(false);

  if (!isDemo || dismissed) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-amber-500/90 via-amber-500/95 to-amber-600/90 backdrop-blur-sm text-black px-4 py-2 flex items-center justify-center gap-3 text-xs font-medium shadow-lg">
      <Eye className="size-3.5 flex-shrink-0" />
      <span className="tracking-wide">
        <span className="font-semibold">INVESTOR DEMO</span>
        <span className="mx-2 opacity-50">|</span>
        You're viewing a read-only demo of the ATLAS Velocity AI platform
      </span>
      <a
        href="mailto:jimmy@aurovia.co?subject=ATLAS%20Demo%20Access%20Request"
        className="inline-flex items-center gap-1 px-2.5 py-1 bg-black/15 hover:bg-black/25 rounded text-[11px] font-semibold transition-colors whitespace-nowrap"
      >
        Request Access <ArrowRight className="size-3" />
      </a>
      <button
        onClick={() => setDismissed(true)}
        className="ml-2 p-0.5 hover:bg-black/10 rounded transition-colors flex-shrink-0"
        aria-label="Dismiss"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
