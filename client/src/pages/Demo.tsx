// INVESTOR DEMO — Cinematic pitch experience matching the Atlas pitch deck
// 10 sections mirroring the 10-slide deck: Title → Problem → Agents →
// Built Not Mocked → Market → GTM → Traction → The Ask → Team → Close

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
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
function CountUpWhenVisible({ value, suffix = "", prefix = "" }: { value: number; suffix?: string; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  return (
    <span ref={ref}>
      {prefix}{isInView ? <AnimatedCounter value={value} duration={1500} /> : "0"}{suffix}
    </span>
  );
}

/* ─── Data ─── */
const AGENTS = [
  {
    name: "Overdue Agent",
    desc: "Scans every task across every venture. Sends follow-ups automatically. Every action logged in real time.",
    color: "#EF4444",
  },
  {
    name: "Velocity Agent",
    desc: "Detects stalled ventures. Advances stages automatically or surfaces a one-click approval when capital is involved.",
    color: "#22D3EE",
  },
  {
    name: "Distribution Sentinel",
    desc: "Monitors every upcoming distribution. Drafts LP notices. Nothing moves without principal confirmation.",
    color: "#F59E0B",
  },
  {
    name: "Orchestrator",
    desc: "Portfolio-wide intelligence. Cross-venture insights. Market signals by sector.",
    color: "#A78BFA",
  },
];

const PRODUCT_STATS = [
  { value: "5", label: "AI intelligence engines" },
  { value: "6", label: "sectors automated" },
  { value: "3", label: "continents, one platform" },
  { value: "<3mo", label: "concept to deployment" },
  { value: "750+", label: "automated test cases" },
  { value: "SOC 2", label: "compliant architecture" },
];

const GTM_STAGES = [
  {
    stage: "01",
    title: "Operational Discovery",
    duration: "2–3 weeks",
    desc: "Full workflow audit across all venture verticals. Task-automation roadmap with projected time savings. Non-refundable. Qualifies the client and creates urgency.",
    color: "#EF4444",
  },
  {
    stage: "02",
    title: "Task Automation Pilot",
    duration: "4–6 weeks",
    desc: "Live agents on real client data. Client measures their own ROI before committing to a full license.",
    color: "#F59E0B",
  },
  {
    stage: "03",
    title: "Full Platform License",
    duration: "Ongoing",
    desc: "All agents, all verticals, custom blueprints, client portal, managed services, 99.5% SLA.",
    color: "#22C55E",
  },
];

const USE_OF_FUNDS = [
  { label: "Engineers", pct: 25.6, color: "#22D3EE" },
  { label: "Team Stipends", pct: 20.9, color: "#5B8DBE" },
  { label: "Reserve", pct: 25.4, color: "#F59E0B" },
  { label: "Sales & GTM", pct: 10.7, color: "#22C55E" },
  { label: "Platform Infrastructure", pct: 4.7, color: "#A78BFA" },
  { label: "Legal & Compliance", pct: 4.6, color: "#EC4899" },
  { label: "Security Baseline", pct: 2.9, color: "#EF4444" },
  { label: "LOI / Client Legal", pct: 0.7, color: "#6B7280" },
];

const TEAM = [
  {
    name: "Shwan Lee",
    initials: "SL",
    role: "Founder & CEO",
    color: "#22D3EE",
    photo: "https://d2xsxph8kpxj0f.cloudfront.net/310519663421947072/TYkqBQavc4Sd5YvF3sSZqT/shwan-lee-new_e321fa79.webp",
    linkedin: "https://linkedin.com/in/shwanlee",
    bio: "Built ATLAS from the ground up — 5 AI intelligence engines, SOC 2-compliant architecture, and an enterprise-grade platform targeting a $6 trillion market. Shwan didn't study the problem in a classroom. He watched it happen firsthand inside a UHNWI holding company, saw the inefficiencies bleeding millions, and spent the next 90 days engineering the solution. Full-stack architect, systems thinker, and the driving force behind every component of ATLAS.",
    quote: "We didn't raise money to build the product. We built the product to raise money.",
    stats: [
      { label: "AI Engines", value: "5" },
      { label: "Sectors Automated", value: "6" },
      { label: "Build Time", value: "<90 days" },
    ],
  },
  {
    name: "Brian Chen",
    initials: "BC",
    role: "COO",
    color: "#A78BFA",
    photo: "https://d2xsxph8kpxj0f.cloudfront.net/310519663421947072/TYkqBQavc4Sd5YvF3sSZqT/brian-chen_b535f902.jpeg",
    linkedin: "https://linkedin.com/in/brianchen",
    bio: "Brian Chen is the operational backbone of Aurovia. As Co-Founder and COO, he architected the intelligence layer behind ATLAS’s autonomous AI agents — including the Mirofish predictive engine that forecasts venture outcomes before they happen. He runs day-to-day operations across all verticals and designed the systems that eliminate bottlenecks before anyone notices them. Equal parts operator and engineer, Brian turns complex multi-entity workflows into automated pipelines that scale.",
    quote: "The best operations are the ones nobody notices — because nothing breaks.",
    stats: [
      { label: "AI Agents Designed", value: "5" },
      { label: "Orgs Managed", value: "6" },
      { label: "Mirofish Engine", value: "Creator" },
    ],
  },
  {
    name: "Chris Phelps",
    initials: "CP",
    role: "CRO",
    color: "#22C55E",
    photo: "https://d2xsxph8kpxj0f.cloudfront.net/310519663421947072/TYkqBQavc4Sd5YvF3sSZqT/chris-phelps-bw_662a9642.jpg",
    linkedin: "https://linkedin.com/in/chrisphelps",
    bio: "Christopher Phelps is a self-taught revenue operator who built his sales foundation through hands-on experience rather than a traditional background. As Co-Founder and CRO of Aurovia, he leads go-to-market strategy and client acquisition for ATLAS, focused on family offices, UHNWI networks, and institutional channels. He owns the full revenue cycle from first outreach to closed deal and built the commercial playbook from the ground up.",
    quote: "Pipeline doesn't build itself. But with the right system, it gets close.",
    stats: [
      { label: "GTM Playbook", value: "Built" },
      { label: "Client Channels", value: "UHNWI" },
      { label: "Pipeline Status", value: "Active" },
    ],
  },
];

const POST_RAISE_HIRES = [
  {
    role: "Head of AI Engineering",
    why: "Scale the intelligence layer — production ML pipelines, agent orchestration, and model fine-tuning.",
    color: "#EF4444",
  },
  {
    role: "Senior Full-Stack Engineer",
    why: "Accelerate platform development — client portal, operator tools, and API infrastructure.",
    color: "#F59E0B",
  },
];

const HEADLINE_FONT = "'Bebas Neue', sans-serif";

export default function Demo() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="bg-black text-white min-h-screen" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>

      {/* ── Sticky nav bar ── */}
      <nav className={cn(
        "fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 transition-all duration-300",
        scrollY > 100 ? "bg-black/80 backdrop-blur-md border-b border-white/5" : "bg-transparent"
      )}>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold tracking-[0.2em]" style={{ fontFamily: HEADLINE_FONT }}>ATLAS</span>
          <span className="text-[9px] text-white/50 tracking-wider hidden sm:inline">INVESTOR DEMO</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/demo/dashboard"
            className="text-[11px] tracking-[0.1em] px-4 py-1.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-500/50 transition-colors"
          >
            LIVE DEMO →
          </Link>
          <Link
            href="/"
            className="text-[11px] tracking-[0.1em] px-3 py-1.5 border border-white/20 text-white/60 hover:text-white hover:border-white/40 transition-colors"
          >
            SIGN IN
          </Link>
        </div>
      </nav>

      {/* ═══ 1. HERO — Title Slide ═══ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
        {/* Parallax grid */}
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
          style={{ background: "radial-gradient(circle, #22D3EE 0%, transparent 70%)", filter: "blur(80px)" }}
        />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 text-center px-6 max-w-5xl"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/5 mb-8"
          >
            <span className="size-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[10px] tracking-[0.2em] text-cyan-400 uppercase">Pre-Seed Introduction · Presented by Shwan Lee</span>
          </motion.div>

          {/* ATLAS. */}
          <h1
            className="text-[clamp(60px,12vw,160px)] font-bold leading-[0.85] tracking-[-0.02em] mb-4"
            style={{ fontFamily: HEADLINE_FONT }}
          >
            ATLAS.
          </h1>

          <p className="text-sm text-white/60 tracking-[0.15em] uppercase mb-8">Powered by Aurovia LLC</p>

          {/* Tagline */}
          <p className="text-sm md:text-base text-white/70 max-w-2xl mx-auto leading-relaxed">
            ATLAS is an AI velocity platform that runs the operations of multi-vertical holding companies.
            Automating tasks, advancing deals, and compressing the time between venture stages so principals
            can run more with less.
          </p>

          {/* CTA row */}
          <div className="flex flex-col items-center gap-4 mt-10">
            <Link
              href="/demo/dashboard"
              className="inline-flex items-center gap-3 px-10 py-4 bg-white text-black text-sm font-bold tracking-[0.2em] hover:bg-white/90 transition-colors"
            >
              ENTER LIVE DEMO →
            </Link>
            <span className="text-[10px] text-white/40 tracking-[0.15em]">INTERACTIVE PROTOTYPE — NO LOGIN REQUIRED</span>
            <button
              onClick={() => document.getElementById("problem")?.scrollIntoView({ behavior: "smooth" })}
              className="inline-flex items-center gap-2 px-6 py-3 border border-white/20 text-white/60 text-xs tracking-[0.15em] hover:border-white/40 hover:text-white transition-colors mt-2"
            >
              OR READ THE FULL PITCH ↓
            </button>
          </div>
        </motion.div>

        {/* Contact bar */}
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-8 py-4 text-[10px] text-white/40 tracking-wide">
          <span>aurovia.co</span>
          <span>contact@aurovia.co</span>
          <a href="tel:+15714803261" className="hover:text-white/60 transition-colors">(571) 480-3261</a>
          <span>McLean, Virginia</span>
        </div>
      </section>

      {/* ═══ 2. THE PROBLEM ═══ */}
      <section id="problem" className="py-24 md:py-32 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <RevealSection>
            <div className="text-[10px] tracking-[0.3em] text-red-400/70 uppercase mb-4">The Problem</div>
            <h2
              className="text-[clamp(28px,5vw,64px)] font-bold leading-[0.95] mb-8"
              style={{ fontFamily: HEADLINE_FONT }}
            >
              THE PEOPLE RUNNING
              <br />
              $200M+ PORTFOLIOS
              <br />
              <span className="text-white/45">ARE STILL DOING IT</span>
              <br />
              <span className="text-white/45">ON SPREADSHEETS.</span>
            </h2>
          </RevealSection>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
            <RevealSection delay={0.1}>
              <div className="border border-white/8 rounded-lg p-6">
                <div className="text-[10px] tracking-[0.2em] text-white/50 uppercase mb-4">Market Reality</div>
                <p className="text-sm text-white/70 leading-relaxed">
                  10,000+ UHNWI holding companies manage multi-vertical portfolios across real estate, yachts,
                  energy, hospitality, oil & gas, and F&B — simultaneously.
                </p>
              </div>
            </RevealSection>

            <RevealSection delay={0.2}>
              <div className="border border-red-500/20 rounded-lg p-6 bg-red-500/[0.03]">
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-5xl font-bold text-red-400" style={{ fontFamily: HEADLINE_FONT }}>42%</span>
                  <span className="text-xs text-red-400/60">of them</span>
                </div>
                <p className="text-sm text-white/70 leading-relaxed">
                  coordinate operations on email chains and disconnected spreadsheets. Tasks go untracked.
                  Stages stall. Distributions get delayed. The operational infrastructure does not match the
                  scale of the portfolio.
                </p>
              </div>
            </RevealSection>
          </div>

          <RevealSection delay={0.3} className="mt-12">
            <div className="text-center">
              <p className="text-sm text-white/50 mb-2">No platform has been built to fix this.</p>
              <h3 className="text-[clamp(24px,4vw,48px)] font-bold" style={{ fontFamily: HEADLINE_FONT }}>
                UNTIL NOW.
              </h3>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ═══ 3. AGENTS ═══ */}
      <section className="py-24 md:py-32 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <RevealSection>
            <div className="text-[10px] tracking-[0.3em] text-cyan-400/70 uppercase mb-4">The Solution</div>
            <h2
              className="text-[clamp(28px,5vw,64px)] font-bold leading-[0.95] mb-4"
              style={{ fontFamily: HEADLINE_FONT }}
            >
              AGENTS EXECUTE.
              <br />
              <span className="text-white/45">THEY DON'T ESCALATE.</span>
            </h2>
          </RevealSection>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-12">
            {AGENTS.map((agent, i) => (
              <RevealSection key={agent.name} delay={i * 0.1}>
                <div className="border border-white/8 rounded-lg p-6 hover:border-white/15 transition-colors h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="size-2 rounded-full flex-shrink-0" style={{ backgroundColor: agent.color }} />
                    <span className="text-sm font-semibold text-white">{agent.name}</span>
                  </div>
                  <p className="text-[13px] text-white/60 leading-relaxed">{agent.desc}</p>
                </div>
              </RevealSection>
            ))}
          </div>

          <RevealSection delay={0.5} className="mt-10">
            <p className="text-center text-sm text-white/50 italic">Agents execute. They don't escalate.</p>
          </RevealSection>
        </div>
      </section>

      {/* ═══ 4. BUILT. NOT MOCKED. ═══ */}
      <section id="product" className="py-24 md:py-32 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <RevealSection>
            <div className="text-[10px] tracking-[0.3em] text-cyan-400/70 uppercase mb-4">The Product</div>
            <h2
              className="text-[clamp(28px,5vw,64px)] font-bold leading-[0.95] mb-8"
              style={{ fontFamily: HEADLINE_FONT }}
            >
              BUILT. NOT MOCKED.
            </h2>
          </RevealSection>

          <RevealSection delay={0.1}>
            <p className="text-sm text-white/70 max-w-3xl leading-relaxed mb-12">
              Two completely separate interfaces: a private-banking-grade Client Portal in plain English
              with no internal jargon, and an Operator Command Center with full visibility across all
              clients, ventures, and agent signals.
            </p>
          </RevealSection>

          {/* Product stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-12">
            {PRODUCT_STATS.map((s, i) => (
              <RevealSection key={s.label} delay={0.15 + i * 0.05}>
                <div className="border border-white/8 rounded-lg p-5 text-center">
                  <div className="text-2xl font-bold text-cyan-400 font-mono mb-1">{s.value}</div>
                  <div className="text-[11px] text-white/50">{s.label}</div>
                </div>
              </RevealSection>
            ))}
          </div>

          {/* Explore live product CTA */}
          <RevealSection delay={0.4}>
            <div className="text-center">
              <Link
                href="/demo/dashboard"
                className="inline-flex items-center gap-2 px-8 py-3.5 border border-white/20 text-white/80 text-xs tracking-[0.15em] hover:border-white/40 hover:text-white transition-colors"
              >
                VIEW LIVE PROTOTYPE →
              </Link>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ═══ 5. MARKET SIZE ═══ */}
      <section className="py-24 md:py-32 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <RevealSection>
            <div className="text-[10px] tracking-[0.3em] text-emerald-400/70 uppercase mb-4">Market Opportunity</div>
            <div className="flex items-baseline gap-3 mb-4">
              <h2
                className="text-[clamp(60px,10vw,120px)] font-bold leading-[0.85]"
                style={{ fontFamily: HEADLINE_FONT }}
              >
                $6T
              </h2>
              <span className="text-[clamp(18px,3vw,32px)] font-bold text-emerald-400" style={{ fontFamily: HEADLINE_FONT }}>
                IN AUM
              </span>
            </div>
          </RevealSection>

          <RevealSection delay={0.15}>
            <p className="text-sm text-white/70 max-w-2xl leading-relaxed mb-8">
              10,000+ global family offices and UHNWI holding companies manage $6 trillion across 3 to 8
              sectors simultaneously. Their operational stack is fragmented, vertical-specific, and entirely
              absent of AI-driven autonomous execution.
            </p>
          </RevealSection>

          <RevealSection delay={0.25}>
            <div className="border border-emerald-500/20 rounded-lg p-6 bg-emerald-500/[0.03] max-w-2xl">
              <p className="text-sm text-white/70 leading-relaxed">
                ATLAS does not compete with Masttro, Addepar, Voly, or AppFolio. It sits above all of them.
                <span className="text-emerald-400 font-medium"> No platform serves the autonomous execution layer today.</span>
              </p>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ═══ 6. GO-TO-MARKET ═══ */}
      <section className="py-24 md:py-32 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <RevealSection>
            <div className="text-[10px] tracking-[0.3em] text-red-400/70 uppercase mb-4">Go-to-Market</div>
            <h2
              className="text-[clamp(28px,5vw,56px)] font-bold leading-[0.95] mb-4"
              style={{ fontFamily: HEADLINE_FONT }}
            >
              <span className="text-red-400">ZERO BUYER RISK</span>
              <br />
              AT ENTRY.
            </h2>
          </RevealSection>

          {/* GTM pipeline */}
          <div className="mt-12 space-y-0">
            {/* Progress bar */}
            <RevealSection delay={0.1}>
              <div className="flex h-3 rounded-full overflow-hidden mb-8">
                {GTM_STAGES.map((s) => (
                  <div
                    key={s.stage}
                    className="h-full flex-1"
                    style={{ backgroundColor: s.color }}
                  />
                ))}
              </div>
            </RevealSection>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {GTM_STAGES.map((s, i) => (
                <RevealSection key={s.stage} delay={0.15 + i * 0.1}>
                  <div className="border border-white/8 rounded-lg p-6 h-full">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="text-[10px] font-mono text-white/50">{s.duration}</span>
                    </div>
                    <div className="text-sm font-semibold text-white mb-2">{s.title}</div>
                    <p className="text-[12px] text-white/60 leading-relaxed">{s.desc}</p>
                  </div>
                </RevealSection>
              ))}
            </div>
          </div>

          <RevealSection delay={0.5} className="mt-10">
            <p className="text-center text-[clamp(18px,3vw,32px)] font-bold text-emerald-400" style={{ fontFamily: HEADLINE_FONT }}>
              HIGH MARGIN ARR AT EXIT.
            </p>
          </RevealSection>
        </div>
      </section>

      {/* ═══ 7. DAY 0 → NOW ═══ */}
      <section className="py-24 md:py-32 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <RevealSection>
            <div className="text-[10px] tracking-[0.3em] text-cyan-400/70 uppercase mb-4">Day 0 → Now</div>
            <h2
              className="text-[clamp(24px,4vw,48px)] font-bold leading-[0.95] mb-2"
              style={{ fontFamily: HEADLINE_FONT }}
            >
              FROM ZERO
            </h2>
            <h2
              className="text-[clamp(24px,4vw,48px)] font-bold leading-[0.95] mb-2 text-cyan-400"
              style={{ fontFamily: HEADLINE_FONT }}
            >
              TO A FULL ENTERPRISE PLATFORM.
            </h2>
            <h2
              className="text-[clamp(24px,4vw,48px)] font-bold leading-[0.95] mb-8 text-white/45"
              style={{ fontFamily: HEADLINE_FONT }}
            >
              BUILT BY THREE PEOPLE.
            </h2>
          </RevealSection>

          {/* Timeline */}
          <div className="relative mt-12">
            {/* Vertical line */}
            <div className="absolute left-4 md:left-8 top-0 bottom-0 w-px bg-gradient-to-b from-red-500/40 via-amber-500/40 via-cyan-500/40 to-emerald-500/40" />

            {/* Day 0 */}
            <RevealSection delay={0.1}>
              <div className="relative pl-12 md:pl-20 pb-10">
                <div className="absolute left-2.5 md:left-6.5 top-1 size-3 rounded-full bg-red-500 border-2 border-black" />
                <div className="text-[10px] tracking-[0.2em] text-red-400/70 uppercase mb-2">Day 0 — The Problem</div>
                <div className="border border-white/8 rounded-lg p-5">
                  <p className="text-sm text-white/50 leading-relaxed">
                    Watched a UHNWI holding company coordinate 20+ ventures across 6 sectors on spreadsheets and email chains.
                    Tasks went untracked. Stages stalled for weeks. Distributions got delayed. No platform existed to fix it.
                    <span className="text-red-400 font-medium"> So we started building one.</span>
                  </p>
                </div>
              </div>
            </RevealSection>

            {/* Foundation */}
            <RevealSection delay={0.2}>
              <div className="relative pl-12 md:pl-20 pb-10">
                <div className="absolute left-2.5 md:left-6.5 top-1 size-3 rounded-full bg-amber-500 border-2 border-black" />
                <div className="text-[10px] tracking-[0.2em] text-amber-400/70 uppercase mb-2">Phase 1 — Foundation</div>
                <div className="border border-white/8 rounded-lg p-5">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-amber-400 font-mono">46</div>
                      <div className="text-[10px] text-white/50">DB tables</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-amber-400 font-mono">22</div>
                      <div className="text-[10px] text-white/50">API routers</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-amber-400 font-mono">32</div>
                      <div className="text-[10px] text-white/50">pages built</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-amber-400 font-mono">134</div>
                      <div className="text-[10px] text-white/50">React components</div>
                    </div>
                  </div>
                  <p className="text-sm text-white/70 leading-relaxed">
                    Built the full-stack architecture from scratch: multi-tenant database, role-based access control,
                    real-time SSE events, S3 file storage, encrypted data layer, and the operator command center
                    with venture management, SPV tracking, task automation, and distribution workflows.
                  </p>
                </div>
              </div>
            </RevealSection>

            {/* Intelligence Layer */}
            <RevealSection delay={0.3}>
              <div className="relative pl-12 md:pl-20 pb-10">
                <div className="absolute left-2.5 md:left-6.5 top-1 size-3 rounded-full bg-cyan-500 border-2 border-black" />
                <div className="text-[10px] tracking-[0.2em] text-cyan-400/70 uppercase mb-2">Phase 2 — Intelligence Layer</div>
                <div className="border border-white/8 rounded-lg p-5">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-cyan-400 font-mono">5</div>
                      <div className="text-[10px] text-white/50">AI engines</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-cyan-400 font-mono">4</div>
                      <div className="text-[10px] text-white/50">autonomous agents</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-cyan-400 font-mono">2h</div>
                      <div className="text-[10px] text-white/50">agent cycle</div>
                    </div>
                  </div>
                  <p className="text-sm text-white/70 leading-relaxed">
                    Deployed 5 intelligence engines: Predictive Engine (venture forecasting), Market Intelligence
                    (sector signals), Continuous Learning (outcome tracking), Escalation Engine (automated nudges),
                    and Realtime Triggers. Agents run autonomously every 2 hours — advancing deals, flagging overdue tasks,
                    drafting distribution notices, and detecting stalled ventures.
                  </p>
                </div>
              </div>
            </RevealSection>

            {/* Security & Scale */}
            <RevealSection delay={0.4}>
              <div className="relative pl-12 md:pl-20 pb-10">
                <div className="absolute left-2.5 md:left-6.5 top-1 size-3 rounded-full bg-violet-500 border-2 border-black" />
                <div className="text-[10px] tracking-[0.2em] text-violet-400/70 uppercase mb-2">Phase 3 — Enterprise Security</div>
                <div className="border border-white/8 rounded-lg p-5">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-violet-400 font-mono">15</div>
                      <div className="text-[10px] text-white/50">security modules</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-violet-400 font-mono">AES-256</div>
                      <div className="text-[10px] text-white/50">encryption</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-violet-400 font-mono">RBAC</div>
                      <div className="text-[10px] text-white/50">access control</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-violet-400 font-mono">MFA</div>
                      <div className="text-[10px] text-white/50">ready</div>
                    </div>
                  </div>
                  <p className="text-sm text-white/70 leading-relaxed">
                    Enterprise-grade security layer: AES-256 encrypted storage, role-based access control,
                    cross-tenant isolation, rate limiting, audit middleware, data retention policies,
                    session management with idle timeouts, and full audit trails.
                  </p>
                </div>
              </div>
            </RevealSection>

            {/* Now */}
            <RevealSection delay={0.5}>
              <div className="relative pl-12 md:pl-20">
                <div className="absolute left-2.5 md:left-6.5 top-1 size-3 rounded-full bg-emerald-500 border-2 border-black animate-pulse" />
                <div className="text-[10px] tracking-[0.2em] text-emerald-400/70 uppercase mb-2">Now — Live & Shipping</div>
                <div className="border border-emerald-500/20 rounded-lg p-5 bg-emerald-500/[0.03]">
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-emerald-400 font-mono">5</div>
                      <div className="text-[10px] text-white/50">AI engines</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-emerald-400 font-mono">6</div>
                      <div className="text-[10px] text-white/50">sectors</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-emerald-400 font-mono">750+</div>
                      <div className="text-[10px] text-white/50">tests passing</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-emerald-400 font-mono">SOC 2</div>
                      <div className="text-[10px] text-white/50">compliant</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-emerald-400 font-mono">3</div>
                      <div className="text-[10px] text-white/50">person team</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-emerald-400 font-mono">{"<3mo"}</div>
                      <div className="text-[10px] text-white/50">to deployment</div>
                    </div>
                  </div>
                  <p className="text-sm text-white/70 leading-relaxed">
                    Platform is fully functional and demo-ready. Client portal live. Operator command center live.
                    AI agents running autonomously. <span className="text-emerald-400 font-medium">1 active pilot client (Royalton Venture Holding)</span> — validating the full workflow end-to-end.
                    <span className="text-cyan-400 font-medium"> 90-day north star: convert pilot to a paid annual license
                    and sign 5 additional clients by Q4 2026.</span>
                  </p>
                </div>
              </div>
            </RevealSection>
          </div>

          <RevealSection delay={0.6} className="mt-10">
            <div className="border border-cyan-500/20 rounded-lg p-5 bg-cyan-500/[0.03] text-center">
              <p className="text-sm text-white/70">
                <span className="text-cyan-400 font-semibold">1 active pilot client</span> (Royalton Venture Holding) — platform being validated in production. Warm prospect conversations in progress.
              </p>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ═══ 8. THE ASK ═══ */}
      <section className="py-24 md:py-32 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <RevealSection>
            <div className="text-[10px] tracking-[0.3em] text-cyan-400/70 uppercase mb-4">The Ask</div>
            <h2
              className="text-[clamp(32px,6vw,80px)] font-bold leading-[0.85] mb-2"
              style={{ fontFamily: HEADLINE_FONT }}
            >
              $700,000.
            </h2>
            <h3
              className="text-[clamp(20px,3vw,40px)] font-bold leading-[0.95] mb-2 text-white/60"
              style={{ fontFamily: HEADLINE_FONT }}
            >
              THREE UNLOCKS.
            </h3>
            <h3
              className="text-[clamp(20px,3vw,40px)] font-bold leading-[0.95] mb-8 text-emerald-400"
              style={{ fontFamily: HEADLINE_FONT }}
            >
              SERIES A IN 18 MONTHS.
            </h3>
          </RevealSection>

          <RevealSection delay={0.1}>
            <p className="text-sm text-white/70 max-w-3xl leading-relaxed mb-12">
              This raise gives ATLAS 25+ months of runway to close 5–6 enterprise contracts, hire 2–4
              critical AI engineers, and reach a $4M ARR milestone — the threshold that unlocks our
              Series A at a $15M+ valuation. Every dollar is allocated with precision to generate
              maximum leverage.
            </p>
          </RevealSection>

          {/* Use of Funds */}
          <RevealSection delay={0.15}>
            <div className="border border-white/8 rounded-lg p-6 mb-8">
              <div className="text-[10px] tracking-[0.2em] text-white/50 uppercase mb-6">Use of Funds</div>

              {/* Visual bar */}
              <div className="flex h-4 rounded-full overflow-hidden mb-6 bg-white/5">
                {USE_OF_FUNDS.map((f) => (
                  <div
                    key={f.label}
                    className="h-full transition-all duration-700"
                    style={{ width: `${f.pct}%`, backgroundColor: f.color }}
                  />
                ))}
              </div>

              {/* Legend */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {USE_OF_FUNDS.map((f) => (
                  <div key={f.label} className="flex items-start gap-2">
                    <div className="size-2 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: f.color }} />
                    <div>
                      <div className="text-[11px] text-white/80 font-medium">{f.label}</div>
                      <div className="text-[10px] text-white/50 font-mono">{f.pct}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </RevealSection>

          {/* SAFE terms */}
          <RevealSection delay={0.25}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-white/8 rounded-lg p-5 text-center">
                <div className="text-2xl font-bold text-white font-mono mb-1">$700K</div>
                <div className="text-[11px] text-white/50">Round Size</div>
              </div>
              <div className="border border-white/8 rounded-lg p-5 text-center">
                <div className="text-2xl font-bold text-white font-mono mb-1">$4M</div>
                <div className="text-[11px] text-white/50">SAFE Cap</div>
              </div>
              <div className="border border-white/8 rounded-lg p-5 text-center">
                <div className="text-2xl font-bold text-white font-mono mb-1">25+</div>
                <div className="text-[11px] text-white/50">Months Runway</div>
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ═══ 9. TEAM ═══ */}
      <section className="py-24 md:py-32 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <RevealSection>
            <div className="text-[10px] tracking-[0.3em] text-cyan-400/70 uppercase mb-4">The Team</div>
            <h2
              className="text-[clamp(28px,5vw,56px)] font-bold leading-[0.95] mb-4"
              style={{ fontFamily: HEADLINE_FONT }}
            >
              MEET THE TEAM.
            </h2>
            <p className="text-sm text-white/50 italic max-w-2xl leading-relaxed mb-2">
              "Three operators who built the system they couldn't find anywhere else."
            </p>
            <p className="text-sm text-white/70 max-w-2xl leading-relaxed mb-12">
              We didn't raise money to build the product. We built the product to raise money.
              No outsourced code. No borrowed ideas. Every engine, every pipeline — built in-house in under 90 days.
            </p>
          </RevealSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TEAM.map((t, i) => (
              <RevealSection key={t.name} delay={i * 0.15}>
                <div className="group border border-white/8 rounded-lg overflow-hidden hover:border-white/20 transition-all duration-300">
                  {/* Team photo with hover stat overlay */}
                  <div className="aspect-square relative overflow-hidden" style={{ backgroundColor: `${t.color}08` }}>
                    <img
                      src={t.photo}
                      alt={t.name}
                      className="w-full h-full object-cover object-[center_20%] group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    {/* Hover stat overlay */}
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="flex flex-col items-center gap-4">
                        {t.stats.map((s) => (
                          <div key={s.label} className="text-center">
                            <div className="text-xl font-bold font-mono" style={{ color: t.color }}>{s.value}</div>
                            <div className="text-[9px] tracking-[0.15em] text-white/50 uppercase">{s.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  {/* Signature accent line */}
                  <div className="h-[2px] w-full" style={{ background: `linear-gradient(90deg, ${t.color}, ${t.color}00)` }} />
                  {/* Info */}
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-white">{t.name}</span>
                      <a href={t.linkedin} target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-white/70 transition-colors" title="LinkedIn">
                        <svg className="size-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                      </a>
                    </div>
                    <div className="text-[10px] tracking-wide mb-3" style={{ color: `${t.color}99` }}>{t.role}</div>
                    <p className="text-[11px] text-white/60 leading-relaxed mb-3">{t.bio}</p>
                    {/* Quote */}
                    <p className="text-[10px] italic text-white/40 leading-relaxed border-l-2 pl-3 mb-4" style={{ borderColor: `${t.color}40` }}>
                      "{t.quote}"
                    </p>
                    {/* Metric badges */}
                    <div className="flex flex-wrap gap-1.5">
                      {t.stats.map((s) => (
                        <span
                          key={s.label}
                          className="text-[9px] font-mono px-2 py-1 rounded-full border"
                          style={{ borderColor: `${t.color}25`, color: `${t.color}CC`, backgroundColor: `${t.color}08` }}
                        >
                          {s.value} {s.label !== "Creator" && s.label !== "Built" && s.label !== "Active" && s.label !== "UHNWI" ? s.label.toLowerCase() : s.label.toLowerCase()}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </RevealSection>
            ))}
          </div>

          {/* Post-Raise Hires */}
          <RevealSection delay={0.5} className="mt-12">
            <div className="border border-white/8 rounded-lg p-6">
              <div className="text-[10px] tracking-[0.2em] text-white/50 uppercase mb-6">Post-Raise Key Hires</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {POST_RAISE_HIRES.map((h) => (
                  <div key={h.role} className="flex items-start gap-3 p-4 border border-white/5 rounded-lg">
                    <div className="size-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: h.color }} />
                    <div>
                      <div className="text-sm font-semibold text-white mb-1">{h.role}</div>
                      <p className="text-[11px] text-white/60 leading-relaxed">{h.why}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-white/45 mt-4 text-center">
                Funded by the $700K raise — 25.6% allocated to engineering talent
              </p>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ═══ 10. CLOSING ═══ */}
      <section className="py-24 md:py-40 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <RevealSection>
            <h2
              className="text-[clamp(48px,10vw,140px)] font-bold leading-[0.85] mb-8"
              style={{ fontFamily: HEADLINE_FONT }}
            >
              THANK
              <br />
              YOU.
            </h2>
          </RevealSection>

          <RevealSection delay={0.2}>
            <p className="text-sm text-white/70 max-w-xl mx-auto leading-relaxed mb-12">
              The market is uncontested. The platform is live. The round is $700K, SAFE Cap $4,000,000.
              <span className="text-white font-medium"> The next call is yours to make.</span>
            </p>
          </RevealSection>

          <RevealSection delay={0.3}>
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <a
                  href="tel:+15714803261"
                  className="inline-flex items-center gap-2 px-10 py-4 bg-white text-black text-sm font-bold tracking-[0.2em] hover:bg-white/90 transition-colors"
                >
                  CALL US: (571) 480-3261 →
                </a>
                <Link
                  href="/demo/dashboard"
                  className="inline-flex items-center gap-2 px-10 py-4 border border-cyan-500/40 text-cyan-400 text-sm font-bold tracking-[0.2em] hover:border-cyan-500/80 hover:bg-cyan-500/5 transition-colors"
                >
                  ENTER LIVE DEMO →
                </Link>
              </div>
              <a
                href="mailto:contact@aurovia.co"
                className="text-[11px] text-white/50 tracking-[0.15em] hover:text-white/70 transition-colors"
              >
                OR EMAIL: contact@aurovia.co
              </a>
            </div>
          </RevealSection>

          <RevealSection delay={0.4} className="mt-8">
            <p className="text-[10px] text-white/40 tracking-wide">
              Presented By: Shwan Joung Hyo Lee
            </p>
          </RevealSection>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="py-12 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold tracking-[0.2em]" style={{ fontFamily: HEADLINE_FONT }}>
              ATLAS
            </span>
            <span className="text-[10px] text-white/45">Powered by Aurovia LLC</span>
          </div>
          <div className="flex items-center gap-6 text-[10px] text-white/45 tracking-wide">
            <span>aurovia.co</span>
            <a href="mailto:contact@aurovia.co" className="hover:text-white/70 transition-colors">contact@aurovia.co</a>
            <a href="tel:+15714803261" className="hover:text-white/70 transition-colors">(571) 480-3261</a>
            <span>McLean, Virginia</span>
            <span>© 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
