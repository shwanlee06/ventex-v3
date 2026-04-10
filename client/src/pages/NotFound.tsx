// 404 — ATLAS Branded Not Found Page
// Military-ops aesthetic matching the SpyOps login

import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Terminal } from "lucide-react";

const GLITCH_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*!?<>{}[]=/+~^|";

export default function NotFound() {
  const [, navigate] = useLocation();
  const [glitchText, setGlitchText] = useState("404");
  const [showContent, setShowContent] = useState(false);

  // Glitch effect on the 404 number
  useEffect(() => {
    let count = 0;
    const iv = setInterval(() => {
      count++;
      if (count > 15) {
        setGlitchText("404");
        clearInterval(iv);
        setShowContent(true);
        return;
      }
      setGlitchText(
        Array.from({ length: 3 }, () =>
          GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]
        ).join("")
      );
    }, 60);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center relative overflow-hidden">
      {/* Scanline overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(255,255,255,0.05) 1px, rgba(255,255,255,0.05) 2px)",
          backgroundSize: "100% 2px",
        }}
      />

      {/* Corner decorations */}
      <div className="absolute top-6 left-6 text-[10px] font-mono tracking-[0.2em] text-white/20">
        ATLAS // SECTOR NOT FOUND
      </div>
      <div className="absolute top-6 right-6 text-[10px] font-mono tracking-[0.2em] text-white/20">
        <Shield className="size-3 inline mr-1" />
        CLASSIFIED
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6">
        {/* 404 number with glitch */}
        <div
          className="font-mono text-[clamp(80px,15vw,160px)] font-bold leading-none tracking-[0.2em] mb-4"
          style={{
            fontFamily: "'Bebas Neue', 'Share Tech Mono', monospace",
            color: "rgba(255,255,255,0.08)",
            textShadow: "0 0 40px rgba(255,255,255,0.05)",
          }}
        >
          {glitchText}
        </div>

        {/* Error message */}
        <div
          className="flex flex-col items-center gap-4"
          style={{
            opacity: showContent ? 1 : 0,
            transform: showContent ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 0.6s ease, transform 0.6s ease",
          }}
        >
          <div className="flex items-center gap-2 text-red-400/80">
            <Terminal className="size-4" />
            <span className="text-xs font-mono tracking-[0.15em] uppercase">
              SECTOR NOT FOUND
            </span>
          </div>

          <div className="w-[min(400px,80vw)] h-px bg-white/10 my-2" />

          <p className="text-sm font-mono text-white/40 max-w-md leading-relaxed tracking-wide">
            The requested operational sector does not exist or has been
            reclassified. Verify your coordinates and try again.
          </p>

          <div className="flex items-center gap-3 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="font-mono text-xs tracking-[0.1em] border-white/15 text-white/70 hover:bg-white/5 hover:text-white"
            >
              <ArrowLeft className="size-3 mr-2" />
              RETURN TO BASE
            </Button>
          </div>

          {/* Coordinates */}
          <div className="mt-12 text-[10px] font-mono text-white/15 tracking-[0.2em]">
            ERR::ROUTE_NOT_FOUND // {new Date().toISOString().replace("T", " // ").slice(0, 24)}
          </div>
        </div>
      </div>
    </div>
  );
}
