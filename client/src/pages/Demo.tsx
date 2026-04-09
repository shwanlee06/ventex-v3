// ============================================================================
// INVESTOR DEMO — Cinematic pitch experience for $700K pre-seed
// Sections: Hero → Problem → Solution → Live Product → Metrics → Team → Ask
// Design: Matches SpyOps military-ops aesthetic, scroll-driven reveals
// ============================================================================

import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { motion, useInView } from "framer-motion";
import AnimatedCounter from "@/components/AnimatedCounter";
/* ─── Scroll-triggered section wrapper ─── */
function RevealSection({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Animated number that counts up when in view ─── */
function CountUpWhenVisible({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  return (
    <span ref={ref}>
      {isInView ? <AnimatedCounter value={value} duration={1500} /> : "0"}
      {suffix}
    </span>
  );
}

/* ─── Data ─── */
const SECTORS = [
  { icon: "≋", name: "Real Estate", count: 7, color: "#5B8DBE" },
  { icon: "⚓", name: "Yacht", count: 3, color: "#22D3EE" },
  { icon: "⌂", name: "Hospitality", count: 3, color: "#F59E0B" },
  { icon: "◈", name: "Entertainment", count: 3, color: "#A78BFA" },
  { icon: "⚡", name: "Oil & Gas", count: 2, color: "#EF4444" },
  { icon: "◇", name: "Others", count: 4, color: "#6B7280" },
];

const FEATURES = [
  {
    num: "01",
    title: "AI Agent Orchestration",
    desc: "Autonomous agents handle vendor follow-ups, compliance tracking, and reporting across all ventures simultaneously.",
    metric: "40+ hrs/week saved",
  },
  {
    num: "02",
    title: "Real-Time Velocity Tracking",
    desc: "Every venture, task, and SPV is tracked with AI-computed velocity scores. Bottlenecks surface instantly.",
    metric: "10x faster ops",
  },
  {
    num: "03",
    title: "Multi-Tenant Client Portal",
    desc: "UHNWI/HNWI clients get a white-labeled portal showing their portfolio, progress, and AI-generated updates.",
    metric: "30+ clients managed",
  },
  {
    num: "04",
    title: "Intelligent Document Processing",
    desc: "Contracts, term sheets, and compliance docs are analyzed by AI — extracting key terms and flagging risks.",
    metric: "90% faster review",
  },
];

const TEAM = [
  { name: "Jimmy Frangi", role: "Founder & CEO", focus: "Finance, Capital Markets, Strategy" },
  { name: "Anton Maghami", role: "VP Operations", focus: "Systems Architecture, AI Integration" },
  { name: "Jon Eichner", role: "COO", focus: "Operations, Venture Execution" },
  { name: "Maher Abou Chakra", role: "CFO", focus: "Accounting, Financial Controls" },
  { name: "Angie Samadi", role: "Head of People", focus: "HR, Team Operations" },
];

const USE_OF_FUNDS = [
  { label: "Engineering & AI", pct: 45, amount: "$315K", color: "#22D3EE" },
  { label: "Operations & Hiring", pct: 25, amount: "$175K", color: "#5B8DBE" },
  { label: "Infrastructure", pct: 15, amount: "$105K", color: "#A78BFA" },
  { label: "Legal & Compliance", pct: 10, amount: "$70K", color: "#F59E0B" },
  { label: "Reserve", pct: 5, amount: "$35K", color: "#6B7280" },
];

export default function Demo() {
  const [, navigate] = useLocation();
  const [scrollY, setScrollY] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);

  // Static stats for the investor demo — no auth required
  const stats = {
    ventures: 22,
    clients: 30,
    tasks: 200,
    completed: 150,
    sectors: 6,
    agents: 12,
    hoursWeek: 40,
  };

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="bg-black text-white min-h-screen" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>

      {/* ═══ HERO ═══ */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      >
        {/* Parallax grid background */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
            transform: `translateY(${scrollY * 0.15}px)`,
          }}
        />

        {/* Gradient orb */}
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.06]"
          style={{
            background: "radial-gradient(circle, #22D3EE 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 text-center px-6 max-w-4xl"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/5 mb-8"
          >
            <span className="size-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[10px] tracking-[0.2em] text-cyan-400 uppercase">Pre-Seed · $700K Raise</span>
          </motion.div>

          {/* Title */}
          <h1
            className="text-[clamp(32px,6vw,72px)] font-bold leading-[0.95] tracking-[-0.02em] mb-6"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
          >
            <span className="text-white">VELOCITY AI</span>
            <br />
            <span className="text-white/30">FOR VENTURE</span>
            <br />
            <span className="text-white/30">HOLDINGS</span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm md:text-base text-white/50 max-w-xl mx-auto leading-relaxed tracking-wide">
            ATLAS replaces the 40+ hours/week of manual operations that holding companies
            burn on managing multi-sector venture portfolios. AI agents handle the work.
            Principals make decisions.
          </p>

          {/* CTA row */}
          <div className="flex items-center justify-center gap-4 mt-10 flex-wrap">
            <a
              href="mailto:contact@aurovia.co?subject=ATLAS%20Investment%20Inquiry"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black text-xs font-semibold tracking-[0.15em] hover:bg-white/90 transition-colors"
            >
              SCHEDULE A CALL →
            </a>
            <button
              onClick={() => {
                document.getElementById("product")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="inline-flex items-center gap-2 px-6 py-3 border border-white/20 text-white/70 text-xs tracking-[0.15em] hover:border-white/40 hover:text-white transition-colors"
            >
              SEE THE PRODUCT ↓
            </button>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-[9px] tracking-[0.3em] text-white/20 uppercase">Scroll</span>
          <div className="w-px h-8 bg-gradient-to-b from-white/20 to-transparent" />
        </motion.div>
      </section>

      {/* ═══ THE PROBLEM ═══ */}
      <section className="py-24 md:py-32 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <RevealSection>
            <div className="text-[10px] tracking-[0.3em] text-red-400/70 uppercase mb-4">The Problem</div>
            <h2
              className="text-[clamp(24px,4vw,48px)] font-bold leading-[1.05] mb-8"
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            >
              MANAGING 20+ VENTURES
              <br />
              <span className="text-white/25">ACROSS 6 SECTORS</span>
              <br />
              <span className="text-white/25">IS OPERATIONALLY IMPOSSIBLE</span>
            </h2>
          </RevealSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            {[
              {
                stat: "40+",
                unit: "hrs/week",
                label: "burned on manual operations",
                detail: "Vendor follow-ups, compliance tracking, reporting, investor updates — all done by hand across every venture.",
              },
              {
                stat: "6",
                unit: "sectors",
                label: "each with different workflows",
                detail: "Real estate, yacht, hospitality, entertainment, oil & gas — each vertical has unique processes, vendors, and compliance requirements.",
              },
              {
                stat: "$2M+",
                unit: "/year",
                label: "in operational overhead",
                detail: "Hiring operations staff for each vertical doesn't scale. One missed deadline or compliance gap can cost more than the entire ops team.",
              },
            ].map((item, i) => (
              <RevealSection key={item.stat} delay={i * 0.1}>
                <div className="border border-white/8 rounded-lg p-6 hover:border-white/15 transition-colors h-full">
                  <div className="flex items-baseline gap-1 mb-1">
                    <span
                      className="text-3xl font-bold text-red-400"
                      style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                    >
                      {item.stat}
                    </span>
                    <span className="text-xs text-red-400/60">{item.unit}</span>
                  </div>
                  <div className="text-xs text-white/70 font-medium mb-3">{item.label}</div>
                  <p className="text-[11px] text-white/30 leading-relaxed">{item.detail}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ THE SOLUTION ═══ */}
      <section className="py-24 md:py-32 px-6 border-t border-white/5 bg-gradient-to-b from-black via-[#020a14] to-black">
        <div className="max-w-5xl mx-auto">
          <RevealSection>
            <div className="text-[10px] tracking-[0.3em] text-cyan-400/70 uppercase mb-4">The Solution</div>
            <h2
              className="text-[clamp(24px,4vw,48px)] font-bold leading-[1.05] mb-4"
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            >
              ATLAS VELOCITY AI
            </h2>
            <p className="text-sm text-white/40 max-w-2xl leading-relaxed">
              An AI-native operations platform purpose-built for venture holding companies.
              Autonomous agents execute operational tasks across all verticals while principals
              retain full control over strategic decisions.
            </p>
          </RevealSection>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-16">
            {FEATURES.map((f, i) => (
              <RevealSection key={f.num} delay={i * 0.1}>
                <div className="border border-white/8 rounded-lg p-6 hover:border-cyan-500/20 transition-colors group h-full">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-mono text-cyan-400/50 tracking-[0.2em]">{f.num}</span>
                    <span className="text-[10px] font-mono text-cyan-400/80 px-2 py-0.5 rounded-full border border-cyan-500/20 bg-cyan-500/5">
                      {f.metric}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-2 group-hover:text-cyan-300 transition-colors">
                    {f.title}
                  </h3>
                  <p className="text-[11px] text-white/35 leading-relaxed">{f.desc}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ LIVE PRODUCT ═══ */}
      <section id="product" className="py-24 md:py-32 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <RevealSection>
            <div className="text-[10px] tracking-[0.3em] text-emerald-400/70 uppercase mb-4">Live Product</div>
            <h2
              className="text-[clamp(24px,4vw,48px)] font-bold leading-[1.05] mb-4"
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            >
              NOT A MOCKUP.
              <br />
              <span className="text-white/25">A WORKING SYSTEM.</span>
            </h2>
            <p className="text-sm text-white/40 max-w-2xl leading-relaxed mb-12">
              ATLAS is already deployed and managing live venture operations for Royalton Venture Holding.
              Below is the actual production system.
            </p>
          </RevealSection>

          {/* Product screenshots / feature callouts */}
          <RevealSection delay={0.2}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  title: "Command Center",
                  desc: "Real-time dashboard showing all clients, ventures, velocity scores, and AI agent activity across the entire portfolio.",
                  tag: "ADMIN",
                },
                {
                  title: "AI Agent Console",
                  desc: "Natural language interface to the AI. Ask questions, trigger workflows, generate reports — the agent executes across all ventures.",
                  tag: "AI",
                },
                {
                  title: "Client Portal",
                  desc: "White-labeled portal for UHNWI/HNWI clients. They see their ventures, progress updates, and AI-generated intelligence — zero noise.",
                  tag: "CLIENT",
                },
                {
                  title: "SPV & Deal Tracker",
                  desc: "Track every SPV from negotiation to close. Priority scoring, document intelligence, and automated compliance checks.",
                  tag: "DEALS",
                },
                {
                  title: "Velocity Feed",
                  desc: "AI-curated feed of what matters. Actions needed, completed milestones, and items being monitored — updated in real-time via SSE.",
                  tag: "FEED",
                },
                {
                  title: "Team & Access Control",
                  desc: "Role-based access for admins, partners, managers, and clients. Invite flows, audit trails, and security controls built in.",
                  tag: "SECURITY",
                },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ delay: i * 0.08, duration: 0.5 }}
                  className="border border-white/8 rounded-lg p-5 hover:border-emerald-500/20 transition-all group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[9px] tracking-[0.2em] text-emerald-400/60 font-mono">{item.tag}</span>
                    <div className="size-1.5 rounded-full bg-emerald-400/40" />
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-2 group-hover:text-emerald-300 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-white/30 leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </RevealSection>

          {/* CTA to explore */}
          <RevealSection delay={0.3}>
            <div className="mt-10 text-center">
              <button
                onClick={() => {
                  // Set demo operator and navigate to dashboard
                  localStorage.setItem("atlas_operator", "DEMO_INVESTOR");
                  localStorage.setItem("atlas_demo_session", "true");
                  navigate("/dashboard");
                }}
                className="inline-flex items-center gap-2 px-8 py-3.5 border border-emerald-500/30 text-emerald-400 text-xs tracking-[0.15em] hover:bg-emerald-500/10 hover:border-emerald-500/50 transition-all"
              >
                EXPLORE THE LIVE DASHBOARD →
              </button>
              <p className="text-[10px] text-white/20 mt-3 tracking-wide">Read-only access · No login required</p>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ═══ SECTORS ═══ */}
      <section className="py-24 md:py-32 px-6 border-t border-white/5 bg-gradient-to-b from-black via-[#0a0514] to-black">
        <div className="max-w-5xl mx-auto">
          <RevealSection>
            <div className="text-[10px] tracking-[0.3em] text-violet-400/70 uppercase mb-4">Portfolio Coverage</div>
            <h2
              className="text-[clamp(24px,4vw,48px)] font-bold leading-[1.05] mb-12"
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            >
              6 SECTORS.
              <br />
              <span className="text-white/25">{stats.ventures} VENTURES.</span>
              <br />
              <span className="text-white/25">ONE PLATFORM.</span>
            </h2>
          </RevealSection>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {SECTORS.map((s, i) => (
              <RevealSection key={s.name} delay={i * 0.08}>
                <div className="border border-white/8 rounded-lg p-5 hover:border-white/15 transition-colors text-center">
                  <div className="text-2xl mb-2">{s.icon}</div>
                  <div className="text-xs font-semibold text-white tracking-wide">{s.name}</div>
                  <div className="text-[10px] text-white/30 mt-1 font-mono">
                    <span style={{ color: s.color }}>{s.count}</span> ventures
                  </div>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ METRICS ═══ */}
      <section className="py-24 md:py-32 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <RevealSection>
            <div className="text-[10px] tracking-[0.3em] text-amber-400/70 uppercase mb-4">Traction</div>
            <h2
              className="text-[clamp(24px,4vw,48px)] font-bold leading-[1.05] mb-16"
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            >
              ALREADY OPERATIONAL.
              <br />
              <span className="text-white/25">ALREADY DELIVERING.</span>
            </h2>
          </RevealSection>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: stats.ventures, label: "Ventures Managed", suffix: "" },
              { value: stats.clients, label: "Clients Served", suffix: "+" },
              { value: stats.completed, label: "Tasks Completed", suffix: "+" },
              { value: stats.hoursWeek, label: "Hours/Week Saved", suffix: "+" },
            ].map((m, i) => (
              <RevealSection key={m.label} delay={i * 0.1}>
                <div className="text-center">
                  <div
                    className="text-[clamp(32px,5vw,56px)] font-bold text-white"
                    style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                  >
                    <CountUpWhenVisible value={m.value} suffix={m.suffix} />
                  </div>
                  <div className="text-[11px] text-white/30 tracking-wide mt-1">{m.label}</div>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TEAM ═══ */}
      <section className="py-24 md:py-32 px-6 border-t border-white/5 bg-gradient-to-b from-black via-[#050a0f] to-black">
        <div className="max-w-5xl mx-auto">
          <RevealSection>
            <div className="text-[10px] tracking-[0.3em] text-blue-400/70 uppercase mb-4">Leadership</div>
            <h2
              className="text-[clamp(24px,4vw,48px)] font-bold leading-[1.05] mb-12"
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            >
              THE TEAM
            </h2>
          </RevealSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TEAM.map((t, i) => (
              <RevealSection key={t.name} delay={i * 0.08}>
                <div className="border border-white/8 rounded-lg p-5 hover:border-blue-500/20 transition-colors">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="size-10 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center text-sm font-bold text-blue-400">
                      {t.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">{t.name}</div>
                      <div className="text-[10px] text-blue-400/60 tracking-wide">{t.role}</div>
                    </div>
                  </div>
                  <p className="text-[11px] text-white/30 leading-relaxed">{t.focus}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ THE ASK ═══ */}
      <section className="py-24 md:py-32 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <RevealSection>
            <div className="text-[10px] tracking-[0.3em] text-cyan-400/70 uppercase mb-4">The Opportunity</div>
            <h2
              className="text-[clamp(24px,4vw,56px)] font-bold leading-[1.05] mb-4"
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            >
              $700K PRE-SEED
            </h2>
            <p className="text-sm text-white/40 max-w-2xl leading-relaxed mb-12">
              We're raising $700K to scale ATLAS from a single-client deployment to a
              multi-tenant platform serving holding companies globally. The product is built.
              The first client is live. We need capital to scale.
            </p>
          </RevealSection>

          {/* Use of Funds */}
          <RevealSection delay={0.15}>
            <div className="border border-white/8 rounded-lg p-6 mb-8">
              <div className="text-[10px] tracking-[0.2em] text-white/30 uppercase mb-6">Use of Funds</div>

              {/* Visual bar */}
              <div className="flex h-3 rounded-full overflow-hidden mb-6 bg-white/5">
                {USE_OF_FUNDS.map((f) => (
                  <div
                    key={f.label}
                    className="h-full transition-all duration-700"
                    style={{ width: `${f.pct}%`, backgroundColor: f.color }}
                  />
                ))}
              </div>

              {/* Legend */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {USE_OF_FUNDS.map((f) => (
                  <div key={f.label} className="flex items-start gap-2">
                    <div className="size-2 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: f.color }} />
                    <div>
                      <div className="text-[11px] text-white/70 font-medium">{f.label}</div>
                      <div className="text-[10px] text-white/30 font-mono">{f.amount} · {f.pct}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </RevealSection>

          {/* Key milestones */}
          <RevealSection delay={0.25}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
              {[
                { milestone: "Q2 2026", title: "Multi-Tenant Launch", desc: "Onboard 5 additional holding companies" },
                { milestone: "Q3 2026", title: "Agent Marketplace", desc: "Vertical-specific agent templates for rapid deployment" },
                { milestone: "Q4 2026", title: "Series A Ready", desc: "20+ clients, $500K ARR target, proven unit economics" },
              ].map((m, i) => (
                <div key={m.milestone} className="border border-white/8 rounded-lg p-5">
                  <div className="text-[10px] font-mono text-cyan-400/60 mb-2">{m.milestone}</div>
                  <div className="text-sm font-semibold text-white mb-1">{m.title}</div>
                  <p className="text-[11px] text-white/30">{m.desc}</p>
                </div>
              ))}
            </div>
          </RevealSection>

          {/* Final CTA */}
          <RevealSection delay={0.3}>
            <div className="text-center py-12 border border-white/8 rounded-lg bg-gradient-to-b from-cyan-500/[0.03] to-transparent">
              <h3
                className="text-[clamp(20px,3vw,36px)] font-bold mb-4"
                style={{ fontFamily: "'Bebas Neue', sans-serif" }}
              >
                LET'S BUILD THE FUTURE
                <br />
                <span className="text-cyan-400">OF VENTURE OPERATIONS</span>
              </h3>
              <p className="text-[11px] text-white/30 mb-8 max-w-md mx-auto">
                The product is live. The first client is operational. We're looking for
                investors who understand that AI will reshape how holding companies operate.
              </p>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <a
                  href="mailto:contact@aurovia.co?subject=ATLAS%20Investment%20Inquiry"
                  className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-black text-xs font-semibold tracking-[0.15em] hover:bg-white/90 transition-colors"
                >
                  SCHEDULE A CALL →
                </a>
                <button
                  onClick={() => {
                    localStorage.setItem("atlas_operator", "DEMO_INVESTOR");
                    localStorage.setItem("atlas_demo_session", "true");
                    navigate("/dashboard");
                  }}
                  className="inline-flex items-center gap-2 px-8 py-3.5 border border-white/20 text-white/70 text-xs tracking-[0.15em] hover:border-white/40 hover:text-white transition-colors"
                >
                  EXPLORE LIVE PRODUCT →
                </button>
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="py-12 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold tracking-[0.2em]" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
              ATLAS
            </span>
            <span className="text-[10px] text-white/20">Powered by Aurovia</span>
          </div>
          <div className="flex items-center gap-6 text-[10px] text-white/20 tracking-wide">
            <a href="mailto:contact@aurovia.co" className="hover:text-white/50 transition-colors">contact@aurovia.co</a>
            <span>© 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
