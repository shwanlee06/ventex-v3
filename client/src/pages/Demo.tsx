// VENTEX Product Landing Page — matches reference site exactly
// Sections: Hero → Ticker → Stats → Platform → Intelligence → Velocity → Onboarding → Mandate → CTA → Footer

import { useEffect, useRef, useState, useMemo } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

/* ─── Scroll-triggered section wrapper ─── */
function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Animated counter ─── */
function CountUp({ value, suffix = "", prefix = "" }: { value: number; suffix?: string; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const duration = 1500;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setCount(Math.floor(progress * value));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [isInView, value]);

  return (
    <span ref={ref}>
      {prefix}{isInView ? count : 0}{suffix}
    </span>
  );
}

/* ─── Particle Globe (CSS-only approximation) ─── */
function ParticleGlobe() {
  const dots = useMemo(() => {
    const arr: { x: number; y: number; opacity: number; size: number; delay: number }[] = [];
    for (let i = 0; i < 200; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 180;
      const x = r * Math.sin(phi) * Math.cos(theta) + 220;
      const y = r * Math.sin(phi) * Math.sin(theta) + 220;
      arr.push({
        x,
        y,
        opacity: 0.15 + Math.random() * 0.6,
        size: 1 + Math.random() * 2,
        delay: Math.random() * 3,
      });
    }
    return arr;
  }, []);

  return (
    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[440px] h-[440px] opacity-30 pointer-events-none hidden lg:block">
      <svg viewBox="0 0 440 440" className="w-full h-full">
        {dots.map((d, i) => (
          <circle
            key={i}
            cx={d.x}
            cy={d.y}
            r={d.size}
            fill="#e2e2e2"
            opacity={d.opacity}
          >
            <animate
              attributeName="opacity"
              values={`${d.opacity};${d.opacity * 0.3};${d.opacity}`}
              dur={`${2 + d.delay}s`}
              repeatCount="indefinite"
            />
          </circle>
        ))}
        {/* Equator ring */}
        <ellipse cx="220" cy="220" rx="180" ry="40" fill="none" stroke="#e2e2e2" strokeWidth="0.5" opacity="0.1" />
        <ellipse cx="220" cy="220" rx="40" ry="180" fill="none" stroke="#e2e2e2" strokeWidth="0.5" opacity="0.08" />
      </svg>
    </div>
  );
}

/* ─── Scrolling Ticker ─── */
const TICKER_ITEMS = [
  "OPERATIONS DASHBOARD: ACTIVE",
  "47 HOLDINGS UNDER COMMAND",
  "ANOMALY DETECTION: NOMINAL",
  "BOARD PACK GENERATED — 90 MIN",
  "DUE DILIGENCE COMPRESSED: 4 HOURS",
  "INTELLIGENCE ENGINE: RUNNING",
  "SIGNAL STRENGTH: 99.7%",
  "PORTFOLIO AUDIT: AUTOMATED",
  "RISK SCORE: NOMINAL",
  "VENTEX COMMAND: ACTIVE",
  "OPERATIONAL VELOCITY: +340%",
  "SECURE ENCLAVE: ONLINE",
  "EXECUTIVE BRIEFING: DISPATCHED",
  "KPI SYNC: REAL-TIME",
];

function Ticker() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div className="w-full overflow-hidden border-y border-border py-3 bg-background">
      <div className="flex animate-ticker whitespace-nowrap">
        {items.map((item, i) => (
          <span
            key={i}
            className="mx-8 text-[11px] font-mono uppercase tracking-[0.12em] text-muted-foreground"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── Data ─── */
const PLATFORM_CAPABILITIES = [
  {
    code: "MOD-01",
    title: "PORTFOLIO COMMAND",
    desc: "One dashboard. Every holding. VENTEX gives principals a single operational command layer across the entire portfolio — live KPIs, risk flags, and performance deltas in real time.",
  },
  {
    code: "MOD-02",
    title: "VELOCITY ENGINE",
    desc: "Operational timelines compressed from months to hours. Due diligence in 4 hours. Board packs in 90 minutes. VENTEX runs at machine speed so your team does not have to.",
  },
  {
    code: "MOD-03",
    title: "SIGNAL INTELLIGENCE",
    desc: "10,000+ signals processed per second across market data, internal operations, and portfolio companies. Proprietary AI surfaces what matters before it becomes a crisis.",
  },
  {
    code: "MOD-04",
    title: "EXECUTIVE REPORTING",
    desc: "Auto-generated board packs, investor briefings, and executive summaries. Your principals walk into every meeting fully briefed — without a single analyst hour spent.",
  },
  {
    code: "MOD-05",
    title: "NATIVE INTEGRATION",
    desc: "VENTEX connects directly to your existing ERP, CRM, financial, and data platforms. Deployment in 24 hours. No rip-and-replace. No disruption to existing operations.",
  },
  {
    code: "MOD-06",
    title: "SOVEREIGN SECURITY",
    desc: "Zero-training policy. Your data never trains our models. Military-grade AES-256 encryption end-to-end. SOC 2 Type II certified. Full data sovereignty guaranteed.",
  },
];

const VELOCITY_METRICS = [
  { label: "DUE DILIGENCE", before: "3–6 weeks", ventex: "4 hours", reduction: "97% reduction" },
  { label: "BOARD REPORTING", before: "2 weeks", ventex: "90 minutes", reduction: "94% reduction" },
  { label: "ANOMALY DETECTION", before: "Days", ventex: "0.3 seconds", reduction: "99% reduction" },
  { label: "PORTFOLIO AUDIT", before: "1 month", ventex: "6 hours", reduction: "96% reduction" },
];

const ONBOARDING_STEPS = [
  { num: "01", title: "SECURE ONBOARDING", desc: "A dedicated VENTEX engineer configures your secure environment. Zero-trust authentication established." },
  { num: "02", title: "SYSTEM CONNECT", desc: "VENTEX integrates with your existing ERP, CRM, and financial infrastructure via encrypted API." },
  { num: "03", title: "INTELLIGENCE CALIBRATION", desc: "VENTEX learns your portfolio structure, KPIs, and reporting requirements. Models fine-tuned to your context." },
  { num: "04", title: "VELOCITY ENGAGED", desc: "Go live. Real-time intelligence, automated reports, and velocity metrics activate across your entire holding." },
];

const TERMINAL_LINES = [
  { text: ">> VENTEX.CORE v1.0.0 — INTELLIGENCE ENGINE INITIALIZED", color: "text-[#00ff87]" },
  { text: ">> Scanning 47 portfolio entities across 6 sectors...", color: "text-muted-foreground" },
  { text: ">> Signal ingestion: 10,247 data points/sec [NOMINAL]", color: "text-[#00ff87]" },
  { text: ">> ANOMALY DETECTED: Revenue variance +12.3% — Entity RVH-023", color: "text-red-400" },
  { text: ">> Auto-escalation triggered → Principal notification dispatched", color: "text-muted-foreground" },
  { text: ">> Board pack generation: Q1 2026 — ETA 87 minutes", color: "text-[#00ff87]" },
  { text: ">> Risk assessment complete: 3 flags, 0 critical", color: "text-muted-foreground" },
  { text: ">> Portfolio velocity score: 94.2% [ABOVE THRESHOLD]", color: "text-[#00ff87]" },
];

const MANDATE_STATS = [
  { label: "GLOBAL REACH", value: "40+", sub: "Countries with regional data sovereignty" },
  { label: "INSTITUTIONAL GRADE", value: "SOC 2", sub: "Type II certified. AES-256 end-to-end" },
  { label: "AI-FIRST", value: "100%", sub: "Purpose-built for AI velocity. Not retrofitted." },
  { label: "PROVEN OUTCOMES", value: "340%", sub: "Average capital efficiency improvement" },
];

/* ─── Terminal typing animation ─── */
function TerminalFeed() {
  const [visibleLines, setVisibleLines] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    const interval = setInterval(() => {
      setVisibleLines((prev) => {
        if (prev >= TERMINAL_LINES.length) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 600);
    return () => clearInterval(interval);
  }, [isInView]);

  return (
    <div ref={ref} className="border border-border bg-[#0a0a0c] p-0 font-mono text-xs">
      {/* macOS-style dots */}
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border">
        <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
        <span className="ml-4 text-[10px] text-muted-foreground uppercase tracking-[0.1em]">
          VENTEX.INTELLIGENCE — LIVE FEED
        </span>
        <span className="ml-auto text-[10px] text-[#00ff87] uppercase tracking-[0.1em]">
          ● LIVE
        </span>
      </div>
      <div className="p-4 space-y-1.5 min-h-[200px]">
        {TERMINAL_LINES.slice(0, visibleLines).map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className={cn("leading-relaxed", line.color)}
          >
            {line.text}
          </motion.div>
        ))}
        {visibleLines < TERMINAL_LINES.length && (
          <span className="inline-block w-2 h-4 bg-[#00ff87] animate-pulse" />
        )}
      </div>
    </div>
  );
}

/* ─── Section Label ─── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-8">
      <span className="text-muted-foreground">—</span>
      <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-muted-foreground">
        {children}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */
/* MAIN PAGE                                                              */
/* ═══════════════════════════════════════════════════════════════════════ */
export default function Demo() {
  return (
    <div className="min-h-screen bg-background text-foreground font-mono">
      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/98 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-foreground no-underline">
            <span className="text-[#00ff87] text-lg">✦</span>
            <span className="text-sm font-bold tracking-[0.15em] uppercase">VENTEX</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            {["PLATFORM", "INTELLIGENCE", "VELOCITY", "ABOUT"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-[11px] font-mono uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground transition-colors no-underline"
              >
                {item}
              </a>
            ))}
          </div>
          <a
            href="#access"
            className="text-[11px] font-mono uppercase tracking-[0.1em] border border-border px-4 py-2 text-foreground hover:bg-foreground/5 transition-colors no-underline flex items-center gap-2"
          >
            <span className="text-[10px]">🔒</span> REQUEST ACCESS
          </a>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center pt-14">
        <div className="max-w-7xl mx-auto px-6 w-full relative">
          <ParticleGlobe />

          <div className="relative z-10 max-w-3xl">
            {/* Classified badge */}
            <div className="flex items-center gap-3 mb-8">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.1em] bg-red-900/30 text-red-400 border border-red-900/50">
                <span className="text-red-400">■</span> CLASSIFIED
              </span>
              <span className="text-[11px] font-mono uppercase tracking-[0.1em] text-muted-foreground">
                OPERATION VENTEX — ACTIVE DEPLOYMENT
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[0.95] tracking-tight mb-8" style={{ fontFamily: "'Space Grotesk', 'IBM Plex Mono', sans-serif" }}>
              <span className="text-muted-foreground block">THE AI THAT</span>
              <span className="text-foreground block">ACCELERATES</span>
              <span className="text-muted-foreground block">VENTURE HOLDINGS</span>
            </h1>

            {/* Subtext */}
            <p className="text-sm text-muted-foreground leading-relaxed max-w-md mb-10">
              <span className="text-foreground font-medium">V</span>elocity{" "}
              <span className="text-foreground font-medium">EN</span>abled{" "}
              <span className="text-foreground font-medium">T</span>echnology for{" "}
              <span className="text-foreground font-medium">EX</span>ponential returns.
              <br />
              The AI-powered operations dashboard built exclusively
              <br />
              for venture holding businesses. One command layer.
              <br />
              Every holding. Total control.
            </p>

            {/* CTAs */}
            <div className="flex items-center gap-4">
              <a
                href="#access"
                className="inline-flex items-center gap-2 px-6 py-3 text-[11px] font-mono uppercase tracking-[0.1em] border border-foreground/30 text-foreground hover:bg-foreground/5 transition-colors no-underline"
              >
                REQUEST ACCESS →
              </a>
              <Link
                href="/demo-dashboard"
                className="text-[11px] font-mono uppercase tracking-[0.1em] text-muted-foreground hover:text-foreground transition-colors no-underline"
              >
                VIEW BRIEFING
              </Link>
            </div>
          </div>

          {/* Footer text */}
          <div className="absolute bottom-12 left-6 text-[10px] font-mono uppercase tracking-[0.1em] text-muted-foreground/50">
            DOC-VTX-2024-001 // EYES ONLY // VENTURE INTELLIGENCE DIVISION
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">SCROLL</span>
            <span className="w-px h-8 bg-muted-foreground/30" />
          </div>
        </div>
      </section>

      {/* ── TICKER ── */}
      <Ticker />

      {/* ── STATS ── */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border">
            {[
              { value: 297, suffix: "%", label: "OPERATIONAL VELOCITY GAIN", sub: "Average across integrated holding dashboards" },
              { value: 88, suffix: "%", label: "DUE DILIGENCE COMPRESSION", sub: "From weeks to hours via VENTEX operations engine" },
              { value: 37, suffix: "+", label: "COUNTRIES COVERED", sub: "Regional data sovereignty and compliance maintained" },
            ].map((stat, i) => (
              <Reveal key={stat.label} delay={i * 0.1}>
                <div className="bg-background p-8 lg:p-12">
                  <div className="text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-3" style={{ fontFamily: "'Space Grotesk', 'IBM Plex Mono', sans-serif" }}>
                    <CountUp value={stat.value} suffix={stat.suffix} />
                  </div>
                  <div className="text-[11px] font-mono uppercase tracking-[0.1em] text-muted-foreground mb-2">
                    {stat.label}
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground/60">
                    {stat.sub}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── PLATFORM CAPABILITIES ── */}
      <section id="platform" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <SectionLabel>PLATFORM CAPABILITIES</SectionLabel>

          <Reveal>
            <h2 className="text-4xl lg:text-5xl font-bold leading-[0.95] tracking-tight mb-16" style={{ fontFamily: "'Space Grotesk', 'IBM Plex Mono', sans-serif" }}>
              <span className="text-foreground block">THE OPERATIONS</span>
              <span className="text-foreground block">DASHBOARD FOR</span>
              <span className="text-muted-foreground block">VENTURE HOLDINGS</span>
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
            {PLATFORM_CAPABILITIES.map((cap, i) => (
              <Reveal key={cap.code} delay={i * 0.08}>
                <div className="bg-background p-6 lg:p-8 group hover:bg-card transition-colors h-full">
                  <div className="text-[11px] font-mono text-red-400/70 mb-4 tracking-[0.1em]">
                    &gt;&gt;{cap.code}
                  </div>
                  <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-foreground mb-3">
                    {cap.title}
                  </h3>
                  <p className="text-[12px] font-mono text-muted-foreground leading-relaxed">
                    {cap.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── INTELLIGENCE ── */}
      <section id="intelligence" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <SectionLabel>VENTEX.INTELLIGENCE — LIVE FEED</SectionLabel>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
            {/* Left */}
            <Reveal>
              <div>
                <h2 className="text-3xl lg:text-4xl font-bold leading-[1.1] tracking-tight mb-6" style={{ fontFamily: "'Space Grotesk', 'IBM Plex Mono', sans-serif" }}>
                  <span className="text-foreground block">VENTEX PROCESSES</span>
                  <span className="text-[#00ff87] block">10,000+ SIGNALS</span>
                  <span className="text-foreground block">PER SECOND</span>
                </h2>
                <p className="text-[12px] font-mono text-muted-foreground leading-relaxed mb-8 max-w-md">
                  VENTEX is the single operations dashboard your entire holding runs through. Every company, every KPI, every risk signal — unified under one command interface. Principals see everything. Analysts are freed. Decisions happen at machine speed.
                </p>
                <div className="border border-border p-4 inline-block">
                  <div className="text-[10px] font-mono uppercase tracking-[0.1em] text-muted-foreground mb-1">
                    REAL-TIME ANOMALY DETECTION
                  </div>
                  <div className="text-lg font-bold text-foreground">
                    0.3s <span className="text-[12px] font-normal text-muted-foreground">response</span>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Right — Terminal */}
            <Reveal delay={0.2}>
              <TerminalFeed />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── VELOCITY METRICS ── */}
      <section id="velocity" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <SectionLabel>VELOCITY METRICS</SectionLabel>

          <Reveal>
            <h2 className="text-4xl lg:text-5xl font-bold leading-[0.95] tracking-tight mb-16" style={{ fontFamily: "'Space Grotesk', 'IBM Plex Mono', sans-serif" }}>
              <span className="text-foreground block">WHAT TOOK MONTHS</span>
              <span className="text-muted-foreground block">NOW TAKES HOURS</span>
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border">
            {VELOCITY_METRICS.map((metric, i) => (
              <Reveal key={metric.label} delay={i * 0.1}>
                <div className="bg-background p-6 lg:p-8">
                  <div className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground mb-6">
                    {metric.label}
                  </div>
                  <div className="grid grid-cols-2 gap-8 mb-6">
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-[0.1em] text-muted-foreground/60 mb-2">BEFORE</div>
                      <div className="text-xl font-bold text-foreground">{metric.before}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-[0.1em] text-muted-foreground/60 mb-2">VENTEX</div>
                      <div className="text-xl font-bold text-foreground">{metric.ventex}</div>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-1 bg-border mb-2">
                    <motion.div
                      className="h-full bg-[#00ff87]"
                      initial={{ width: 0 }}
                      whileInView={{ width: "100%" }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.2, delay: 0.3 }}
                    />
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-[0.1em]">
                    {metric.reduction}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── ONBOARDING PROTOCOL ── */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <SectionLabel>ONBOARDING PROTOCOL</SectionLabel>

          <Reveal>
            <h2 className="text-4xl lg:text-5xl font-bold leading-[0.95] tracking-tight mb-16" style={{ fontFamily: "'Space Grotesk', 'IBM Plex Mono', sans-serif" }}>
              <span className="text-foreground block">OPERATIONAL IN</span>
              <span className="text-[#00ff87] block">24 HOURS</span>
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border">
            {ONBOARDING_STEPS.map((step, i) => (
              <Reveal key={step.num} delay={i * 0.1}>
                <div className="bg-background p-6 lg:p-8 h-full">
                  <div className="text-4xl font-bold text-muted-foreground/20 mb-4" style={{ fontFamily: "'Space Grotesk', 'IBM Plex Mono', sans-serif" }}>
                    {step.num}
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-foreground mb-3">
                    {step.title}
                  </h3>
                  <p className="text-[11px] font-mono text-muted-foreground leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── OUR MANDATE ── */}
      <section id="about" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <SectionLabel>OUR MANDATE</SectionLabel>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
            {/* Left */}
            <Reveal>
              <div>
                <h2 className="text-4xl lg:text-5xl font-bold leading-[0.95] tracking-tight mb-8" style={{ fontFamily: "'Space Grotesk', 'IBM Plex Mono', sans-serif" }}>
                  <span className="text-foreground block">VELOCITY MATTERS.</span>
                  <span className="text-muted-foreground block">INTELLIGENCE WINS.</span>
                </h2>
                <div className="space-y-4 mb-8">
                  <p className="text-[12px] font-mono text-muted-foreground leading-relaxed">
                    VENTEX was built by operators who understood that venture holding businesses were drowning in data but starving for intelligence. We built the platform we wished existed.
                  </p>
                  <p className="text-[12px] font-mono text-muted-foreground leading-relaxed">
                    This is not an analytics dashboard. It is a command-grade AI system that thinks, monitors, and acts at the speed your portfolio demands. Invisible like the wind. Felt in every result.
                  </p>
                </div>
                <a
                  href="#access"
                  className="inline-flex items-center gap-2 px-6 py-3 text-[11px] font-mono uppercase tracking-[0.1em] border border-[#00ff87]/30 text-[#00ff87] hover:bg-[#00ff87]/5 transition-colors no-underline"
                >
                  REQUEST BRIEFING →
                </a>
              </div>
            </Reveal>

            {/* Right — Stats grid */}
            <div className="grid grid-cols-2 gap-px bg-border">
              {MANDATE_STATS.map((stat, i) => (
                <Reveal key={stat.label} delay={i * 0.1}>
                  <div className="bg-background p-6">
                    <div className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground/60 mb-3">
                      {stat.label}
                    </div>
                    <div className="text-3xl font-bold text-foreground mb-2" style={{ fontFamily: "'Space Grotesk', 'IBM Plex Mono', sans-serif" }}>
                      {stat.value}
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground/60 leading-relaxed">
                      {stat.sub}
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section id="access" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="border border-border p-12 lg:p-20 text-center">
            <div className="flex justify-center mb-8">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.1em] border border-[#00ff87]/30 text-[#00ff87]">
                <span>■</span> RESTRICTED ACCESS
              </span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold leading-[0.95] tracking-tight mb-6" style={{ fontFamily: "'Space Grotesk', 'IBM Plex Mono', sans-serif" }}>
              <span className="text-foreground block">ACTIVATE VENTEX</span>
              <span className="text-foreground block">IN YOUR HOLDING</span>
            </h2>
            <p className="text-[12px] font-mono text-muted-foreground leading-relaxed max-w-lg mx-auto mb-10">
              Access is by inquiry only. A VENTEX intelligence officer will contact qualified principals within 48 hours. Full data sovereignty guaranteed.
            </p>
            <a
              href="mailto:contact@aurovia.com"
              className="inline-flex items-center gap-2 px-8 py-3 text-[11px] font-mono uppercase tracking-[0.1em] border border-foreground/30 text-foreground hover:bg-foreground/5 transition-colors no-underline"
            >
              SUBMIT INQUIRY →
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-border py-16">
        <div className="max-w-7xl mx-auto px-6">
          {/* Top */}
          <div className="flex items-center justify-between mb-12">
            <div className="text-[10px] font-mono uppercase tracking-[0.1em] text-muted-foreground/50">
              DOC-VTX-2024-001 // VENTURE INTELLIGENCE DIVISION // EYES ONLY
            </div>
          </div>

          {/* Main footer */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-12 mb-16">
            {/* Brand */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[#00ff87] text-lg">✦</span>
                <span className="text-sm font-bold tracking-[0.15em] uppercase text-foreground">VENTEX</span>
              </div>
              <p className="text-[11px] font-mono text-muted-foreground leading-relaxed mb-4">
                VENTEX is the AI-powered operations dashboard built exclusively for venture holding businesses. One command layer across every holding — live KPIs, risk intelligence, executive reporting, and portfolio surveillance. Invisible. Absolute.
              </p>
              <span className="inline-flex items-center gap-1.5 px-2 py-1 text-[9px] font-mono uppercase tracking-[0.1em] border border-red-900/50 text-red-400/70">
                ■ CLASSIFIED — EYES ONLY
              </span>
            </div>

            {/* Links */}
            {[
              {
                title: "PLATFORM",
                links: ["Portfolio Command", "Velocity Engine", "Signal Intelligence", "Security", "Contact"],
              },
              {
                title: "ACCESS",
                links: ["Request Access", "Enterprise Inquiry", "Partnership", "Due Diligence", "NDA Request", "Contact"],
              },
              {
                title: "COMPANY",
                links: ["About VENTEX", "Our Mission", "Security", "Privacy Policy", "Terms of Service", "Contact"],
              },
            ].map((col) => (
              <div key={col.title}>
                <div className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground mb-4">
                  {col.title}
                </div>
                <div className="space-y-2">
                  {col.links.map((link) => (
                    <a
                      key={link}
                      href="#"
                      className="block text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors no-underline"
                    >
                      {link}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom */}
          <div className="border-t border-border pt-6 flex flex-wrap items-center justify-between gap-4">
            <div className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-[0.1em]">
              © 2026 VENTEX — ALL RIGHTS RESERVED
            </div>
            <div className="flex items-center gap-6 text-[10px] font-mono text-muted-foreground/50 uppercase tracking-[0.1em]">
              <span>GLOBAL</span>
              <span>SOC2</span>
              <span>99.99% SLA</span>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-[10px] font-mono text-muted-foreground/30 uppercase tracking-[0.1em]">
            <span>VENTEX.CORE V1.0.0 — BUILD 2026</span>
            <span>POWERED BY <span className="text-muted-foreground/50">AUROVIA</span></span>
          </div>
        </div>
      </footer>

      {/* ── Ticker animation CSS ── */}
      <style>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-ticker {
          animation: ticker 40s linear infinite;
        }
      `}</style>
    </div>
  );
}
