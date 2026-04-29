// VENTEX Investor Pitch Deck — 10 sections mirroring the 10-slide deck:
// Title → Problem → Agents → Built Not Mocked → Market → GTM → Traction → The Ask → Team → Close

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
    color: "#00ff87",
  },
  {
    name: "Velocity Agent",
    desc: "Detects stalled ventures. Advances stages automatically or surfaces a one-click approval when capital is involved.",
    color: "#00cc6a",
  },
  {
    name: "Distribution Sentinel",
    desc: "Monitors every upcoming distribution. Drafts LP notices. Nothing moves without principal confirmation.",
    color: "#00ff87",
  },
  {
    name: "Orchestrator",
    desc: "Portfolio-wide intelligence. Cross-venture insights. Market signals by sector.",
    color: "#00cc6a",
  },
];

const PRODUCT_STATS = [
  { value: "5", label: "AI intelligence engines" },
  { value: "6", label: "sectors automated" },
  { value: "3", label: "continents, one platform" },
  { value: "<3mo", label: "concept to deployment" },
  { value: "1,000+", label: "automated test cases" },
  { value: "SOC 2", label: "readiness in progress" },
];

const GTM_STAGES = [
  {
    stage: "01",
    title: "Operational Discovery",
    duration: "2-3 weeks",
    desc: "Full workflow audit across all venture verticals. Task-automation roadmap with projected time savings. Non-refundable. Qualifies the client and creates urgency.",
    color: "#00ff87",
  },
  {
    stage: "02",
    title: "Task Automation Pilot",
    duration: "4-6 weeks",
    desc: "Live agents on real client data. Client measures their own ROI before committing to a full license.",
    color: "#00cc6a",
  },
  {
    stage: "03",
    title: "Full Platform License",
    duration: "Ongoing",
    desc: "All agents, all verticals, custom blueprints, client portal, managed services, targeting 99.5% uptime.",
    color: "#00ff87",
  },
];

// Strategic fund allocation grouped by purpose
const FUND_BUCKETS = [
  {
    bucket: "BUILD",
    bucketColor: "#00ff87",
    bucketDesc: "Product & Engineering",
    milestone: "Lead Eng + 2 devs M1-6, add 3rd dev after first revenue",
    items: [
      { label: "CTO (Durga Kar)", pct: 8.6, amount: "$60K", color: "#00ff87" },
      { label: "Lead Engineer", pct: 13.7, amount: "$96K", color: "#00cc6a" },
      { label: "Engineering Team (2→5 ramp)", pct: 17.1, amount: "$120K", color: "#00aa55" },
      { label: "Infrastructure & Cloud", pct: 5.1, amount: "$36K", color: "#009952" },
    ],
  },
  {
    bucket: "GROW",
    bucketColor: "#FFB800",
    bucketDesc: "Sales & Market Entry",
    milestone: "Convert pilot to paid, close 12-15 enterprise clients by Month 12",
    items: [
      { label: "Sales & Marketing", pct: 13.7, amount: "$96K", color: "#FFB800" },
      { label: "Travel & Events", pct: 2.6, amount: "$18K", color: "#FF9F43" },
    ],
  },
  {
    bucket: "SUSTAIN",
    bucketColor: "#8B8BFF",
    bucketDesc: "Team & Operations",
    milestone: "14+ months runway, retain core team through first revenue",
    items: [
      { label: "Founder Salaries", pct: 5.1, amount: "$36K", color: "#8B8BFF" },
      { label: "Legal & Financial Teams", pct: 13.7, amount: "$96K", color: "#7C7CCC" },
      { label: "Software & Insurance", pct: 3.1, amount: "$22K", color: "#54A0FF" },
      { label: "Contingency (2mo burn)", pct: 12.0, amount: "$84K", color: "#4040AA" },
    ],
  },
];

// Flat list for the bar chart
const USE_OF_FUNDS = FUND_BUCKETS.flatMap((b) => b.items);

const TIMELINE_MILESTONES = [
  { quarter: "M1-3", label: "Lead Eng + 2 devs, harden platform, C-Corp conversion", color: "#00ff87" },
  { quarter: "M4-6", label: "Convert pilot to paid + close first enterprise clients", color: "#FFB800" },
  { quarter: "M7-12", label: "Add 3rd dev, 12-15 clients, $1.5M+ ARR → Series A", color: "#8B8BFF" },
];

const TEAM = [
  {
    name: "Shwan Lee",
    initials: "SL",
    role: "Founder & CEO",
    color: "#00ff87",
    photo: "https://d2xsxph8kpxj0f.cloudfront.net/310519663421947072/TYkqBQavc4Sd5YvF3sSZqT/shwan-lee-new_e321fa79.webp",
    linkedin: "https://www.linkedin.com/in/shwan-lee-93b486356/",
    bio: "Built the entire VENTEX platform in under 90 days. 5 AI engines, enterprise-grade security, and a system targeting a $6 trillion market. Full-stack architect who saw the problem firsthand inside a UHNWI holding company.",
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
    color: "#00cc6a",
    photo: "https://d2xsxph8kpxj0f.cloudfront.net/310519663421947072/TYkqBQavc4Sd5YvF3sSZqT/brian-chen_b535f902.jpeg",
    linkedin: "https://www.linkedin.com/in/brian-chen-1a6aa2373/",
    bio: "Architected VENTEX's autonomous AI agents including the Mirofish predictive engine. Runs day-to-day operations across all verticals and turns complex multi-entity workflows into automated pipelines that scale.",
    quote: "The best operations are the ones nobody notices — because nothing breaks.",
    stats: [
      { label: "AI Agents Designed", value: "5" },
      { label: "Orgs Managed", value: "6" },
      { label: "Mirofish Engine", value: "Creator" },
    ],
  },
  {
    name: "Dr. Durga Kar",
    initials: "DK",
    role: "Chief Technology Officer",
    color: "#FFB800",
    photo: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663421947072/ZJKKPhytCgRkAyzU.jpg",
    linkedin: "https://www.linkedin.com/in/durga-kar/",
    bio: "22+ years scaling technology organizations across global markets at IG Group. Led engineering teams spanning multiple continents, processing millions of real-time transactions daily. PhD, Certified Team Topologies Advocate.",
    quote: "I don't just build technology - I focus on bringing people, processes, and AI together so teams can move faster and deliver impactful outcomes.",
    stats: [
      { label: "Experience", value: "22+ yrs" },
      { label: "Teams Led", value: "Global" },
      { label: "Focus", value: "AI + Scale" },
    ],
  },
  {
    name: "Chris Phelps",
    initials: "CP",
    role: "CRO",
    color: "#009952",
    photo: "https://d2xsxph8kpxj0f.cloudfront.net/310519663421947072/TYkqBQavc4Sd5YvF3sSZqT/chris-phelps-bw_662a9642.jpg",
    linkedin: "https://www.linkedin.com/in/christopher-phelps-090848230/",
    bio: "Leads go-to-market strategy and client acquisition for VENTEX. Focused on family offices, UHNWI networks, and institutional channels. Built the commercial playbook from the ground up.",
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
    role: "Engineering Team (2 devs → 3 devs)",
    why: "Led by Lead Engineer. Scale from 2 to 3 devs after first revenue - platform development, API infrastructure, agent orchestration, and multi-tenant architecture.",
    color: "#00ff87",
  },
  {
    role: "Financial & Legal Team",
    why: "Dedicated compliance, accounting, and legal counsel to support enterprise client contracts, SOC 2 certification, and investor reporting.",
    color: "#00cc6a",
  },
];

const HEADLINE_FONT = "'Space Grotesk', sans-serif";

export default function Demo() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="bg-[#050507] text-white min-h-screen" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>

      {/* ── Sticky nav bar ── */}
      <nav className={cn(
        "fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 transition-all duration-300",
        scrollY > 100 ? "bg-[#050507]/90 backdrop-blur-md border-b border-white/5" : "bg-transparent"
      )}>
        <div className="flex items-center gap-3">
          <img
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663421947072/TYkqBQavc4Sd5YvF3sSZqT/ventex-logo-mark_1f534165.png"
            alt="VENTEX"
            className="size-6 rounded object-cover"
          />
          <span className="text-sm font-bold tracking-[0.2em]" style={{ fontFamily: HEADLINE_FONT }}>VENTEX</span>
          <span className="text-[9px] text-white/50 tracking-wider hidden sm:inline">INVESTOR DEMO</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/demo/dashboard"
            className="text-[11px] tracking-[0.1em] px-4 py-1.5 bg-[#00ff87]/10 border border-[#00ff87]/30 text-[#00ff87] hover:bg-[#00ff87]/20 hover:border-[#00ff87]/50 transition-colors"
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

        {/* Gradient orb — green */}
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.06]"
          style={{ background: "radial-gradient(circle, #00ff87 0%, transparent 70%)", filter: "blur(80px)" }}
        />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 text-center px-6 max-w-5xl pb-16"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 border border-[#00ff87]/20 bg-[#00ff87]/5 mb-8"
          >
            <span className="size-1.5 bg-[#00ff87] animate-pulse" />
            <span className="text-[10px] tracking-[0.2em] text-[#00ff87] uppercase">Pre-Seed Introduction · Presented by Shwan Lee</span>
          </motion.div>

          {/* Logo + VENTEX. */}
          <motion.img
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663421947072/TYkqBQavc4Sd5YvF3sSZqT/ventex-logo-mark_1f534165.png"
            alt="VENTEX"
            className="w-16 h-16 md:w-20 md:h-20 rounded-xl object-cover mx-auto mb-6"
          />
          <h1
            className="text-[clamp(60px,12vw,160px)] font-bold leading-[0.85] tracking-[-0.02em] mb-4"
            style={{ fontFamily: HEADLINE_FONT }}
          >
            VENTEX.
          </h1>

          <p className="text-sm text-white/60 tracking-[0.15em] uppercase mb-8">Powered by Aurovia LLC</p>

          {/* Tagline */}
          <p className="text-sm md:text-base text-white/70 max-w-2xl mx-auto leading-relaxed">
            VENTEX is an AI velocity platform that runs the operations of multi-vertical holding companies.
            Automating tasks, advancing deals, and compressing the time between venture stages so principals
            can run more with less.
          </p>

          {/* CTA row */}
          <div className="flex flex-col items-center gap-4 mt-10">
            <Link
              href="/demo/dashboard"
              className="inline-flex items-center gap-3 px-10 py-4 bg-[#00ff87] text-[#050507] text-sm font-bold tracking-[0.2em] hover:bg-[#00ff87]/90 transition-colors"
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
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-8 py-6 text-[10px] text-white/40 tracking-wide">
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
            <div className="text-[10px] tracking-[0.3em] text-[#FF6B6B]/70 uppercase mb-4">The Problem</div>
            <h2
              className="text-[clamp(28px,5vw,64px)] font-bold leading-[0.95] mb-8"
              style={{ fontFamily: HEADLINE_FONT }}
            >
              THE PEOPLE RUNNING
              <br />
              <span className="text-[#FFB800]">$200M+</span> PORTFOLIOS
              <br />
              <span className="text-white/45">ARE STILL DOING IT</span>
              <br />
              <span className="text-white/45">ON SPREADSHEETS.</span>
            </h2>
          </RevealSection>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
            <RevealSection delay={0.1}>
              <div className="border border-white/8 p-6">
                <div className="text-[10px] tracking-[0.2em] text-white/50 uppercase mb-4">Market Reality</div>
                <p className="text-sm text-white/70 leading-relaxed">
                  10,000+ UHNWI holding companies manage multi-vertical portfolios across real estate, yachts,
                  energy, hospitality, oil & gas, and F&B — simultaneously.
                </p>
              </div>
            </RevealSection>

            <RevealSection delay={0.2}>
              <div className="border border-[#00ff87]/20 p-6 bg-[#00ff87]/[0.03]">
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-5xl font-bold text-[#00ff87]" style={{ fontFamily: HEADLINE_FONT }}>42%</span>
                  <span className="text-xs text-[#00ff87]/60">of them</span>
                </div>
                <p className="text-sm text-white/70 leading-relaxed">
                  coordinate operations on email chains and disconnected spreadsheets. Tasks go untracked.
                  Stages stall. Distributions get delayed. The operational infrastructure does not match the
                  scale of the portfolio.
                </p>
                <p className="text-[9px] text-white/30 mt-3 italic">
                  Source: Campden Wealth Global Family Office Report 2024 & internal survey of 50+ UHNWI holding companies
                </p>
              </div>
            </RevealSection>
          </div>

          <RevealSection delay={0.3} className="mt-12">
            <div className="text-center">
              <p className="text-sm text-[#FF6B6B]/70 mb-2">No platform has been built to fix this.</p>
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
            <div className="text-[10px] tracking-[0.3em] text-[#00ff87]/70 uppercase mb-4">The Solution</div>
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
                <div className="border border-white/8 p-6 hover:border-white/15 transition-colors h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="size-2 flex-shrink-0" style={{ backgroundColor: agent.color }} />
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
            <div className="text-[10px] tracking-[0.3em] text-[#00ff87]/70 uppercase mb-4">The Product</div>
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
                <div className="border border-white/8 p-5 text-center">
                  <div className="text-2xl font-bold text-[#00ff87] font-mono mb-1">{s.value}</div>
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

      {/* ═══ 5. MARKET SIZE — TAM/SAM/SOM ═══ */}
      <section id="market" className="py-24 md:py-32 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <RevealSection>
            <div className="text-[10px] tracking-[0.3em] text-[#FFB800]/70 uppercase mb-4">Market Opportunity</div>
            <div className="flex items-baseline gap-3 mb-4">
              <h2
                className="text-[clamp(60px,10vw,120px)] font-bold leading-[0.85]"
                style={{ fontFamily: HEADLINE_FONT }}
              >
                <span className="text-[#FFB800]">$6T</span>
              </h2>
              <span className="text-[clamp(18px,3vw,32px)] font-bold text-[#FFB800]/80" style={{ fontFamily: HEADLINE_FONT }}>
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

          {/* TAM / SAM / SOM */}
          <RevealSection delay={0.2}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
              <div className="border border-[#FFB800]/15 p-6 bg-[#FFB800]/[0.03]">
                <div className="text-[9px] tracking-[0.2em] text-[#FFB800]/50 uppercase mb-2">TAM — Total Addressable</div>
                <div className="text-3xl font-bold text-[#FFB800] font-mono mb-2">$1.2B</div>
                <p className="text-[11px] text-white/50 leading-relaxed">
                  10,000+ multi-vertical holding companies globally at $120K avg. annual platform spend
                </p>
              </div>
              <div className="border border-[#FFB800]/15 p-6 bg-[#FFB800]/[0.03]">
                <div className="text-[9px] tracking-[0.2em] text-[#FFB800]/50 uppercase mb-2">SAM — Serviceable Addressable</div>
                <div className="text-3xl font-bold text-[#FFB800] font-mono mb-2">$360M</div>
                <p className="text-[11px] text-white/50 leading-relaxed">
                  3,000 UHNWI holding companies in US, UK, UAE managing 5+ verticals with $50M+ AUM
                </p>
              </div>
              <div className="border border-[#FFB800]/15 p-6 bg-[#FFB800]/[0.03]">
                <div className="text-[9px] tracking-[0.2em] text-[#FFB800]/50 uppercase mb-2">SOM — Serviceable Obtainable</div>
                <div className="text-3xl font-bold text-[#FFB800] font-mono mb-2">$4.8M</div>
                <p className="text-[11px] text-white/50 leading-relaxed">
                  40 enterprise clients in 36 months at $120K ACV — conservative 1.3% penetration of SAM
                </p>
              </div>
            </div>
          </RevealSection>

          {/* Key Assumptions */}
          <RevealSection delay={0.25}>
            <div className="border border-white/8 p-5 mb-10">
              <div className="text-[9px] tracking-[0.2em] text-white/30 uppercase mb-3">Key Assumptions</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm font-bold text-[#FFB800] font-mono">$120K</div>
                  <div className="text-[10px] text-white/50">Avg. ACV per client</div>
                </div>
                <div>
                  <div className="text-sm font-bold text-[#FFB800] font-mono">85%</div>
                  <div className="text-[10px] text-white/50">Gross margin (software)</div>
                </div>
                <div>
                  <div className="text-sm font-bold text-[#FFB800] font-mono">4-6 mo</div>
                  <div className="text-[10px] text-white/50">Avg. sales cycle</div>
                </div>
                <div>
                  <div className="text-sm font-bold text-[#FFB800] font-mono">36 mo</div>
                  <div className="text-[10px] text-white/50">Avg. customer lifetime</div>
                </div>
              </div>
            </div>
          </RevealSection>

          {/* Competitive Moat */}
          <RevealSection delay={0.3}>
            <div className="border border-white/8 p-6 md:p-8">
              <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase mb-6">Why Not Incumbents?</div>
              
              {/* Comparison table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-[10px] tracking-[0.15em] text-white/40 uppercase py-3 pr-4 w-[180px]">Capability</th>
                      <th className="text-[10px] tracking-[0.15em] text-[#00ff87] uppercase py-3 px-3 text-center">VENTEX</th>
                      <th className="text-[10px] tracking-[0.15em] text-white/40 uppercase py-3 px-3 text-center">Masttro</th>
                      <th className="text-[10px] tracking-[0.15em] text-white/40 uppercase py-3 px-3 text-center">Addepar</th>
                      <th className="text-[10px] tracking-[0.15em] text-white/40 uppercase py-3 px-3 text-center">AppFolio</th>
                    </tr>
                  </thead>
                  <tbody className="text-[11px]">
                    {[
                      { cap: "Autonomous AI Agents", v: true, m: false, a: false, af: false },
                      { cap: "Multi-Vertical Ops", v: true, m: true, a: false, af: false },
                      { cap: "Task Automation", v: true, m: false, a: false, af: true },
                      { cap: "Distribution Mgmt", v: true, m: true, a: true, af: false },
                      { cap: "SPV / Deal Tracking", v: true, m: true, a: true, af: false },
                      { cap: "Client Portal", v: true, m: true, a: true, af: true },
                      { cap: "Predictive Intelligence", v: true, m: false, a: false, af: false },
                      { cap: "Cross-Sector Insights", v: true, m: false, a: false, af: false },
                    ].map((row) => (
                      <tr key={row.cap} className="border-b border-white/5">
                        <td className="py-2.5 pr-4 text-white/60">{row.cap}</td>
                        <td className="py-2.5 px-3 text-center">{row.v ? <span className="text-[#00ff87]">✓</span> : <span className="text-white/20">—</span>}</td>
                        <td className="py-2.5 px-3 text-center">{row.m ? <span className="text-white/40">✓</span> : <span className="text-white/20">—</span>}</td>
                        <td className="py-2.5 px-3 text-center">{row.a ? <span className="text-white/40">✓</span> : <span className="text-white/20">—</span>}</td>
                        <td className="py-2.5 px-3 text-center">{row.af ? <span className="text-white/40">✓</span> : <span className="text-white/20">—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 border-t border-white/8 pt-5">
                <div className="text-[10px] tracking-[0.2em] text-white/30 uppercase mb-3">The Moat</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-start gap-2">
                    <div className="size-1.5 mt-1.5 bg-[#00ff87] flex-shrink-0" />
                    <p className="text-[11px] text-white/60 leading-relaxed"><span className="text-[#00ff87] font-medium">Data Network Effects</span> — Every client's operational data trains better cross-sector intelligence. More clients = smarter agents for everyone.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="size-1.5 mt-1.5 bg-[#00ff87] flex-shrink-0" />
                    <p className="text-[11px] text-white/60 leading-relaxed"><span className="text-[#00ff87] font-medium">Switching Costs</span> — Once agents run your operations, replacing them means re-building every workflow. Churn is structurally low.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="size-1.5 mt-1.5 bg-[#00ff87] flex-shrink-0" />
                    <p className="text-[11px] text-white/60 leading-relaxed"><span className="text-[#00ff87] font-medium">Execution Layer</span> — Incumbents report. VENTEX executes. Adding an execution layer to a reporting tool is a full rebuild.</p>
                  </div>
                </div>
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ═══ 6. GO-TO-MARKET ═══ */}
      <section className="py-24 md:py-32 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <RevealSection>
            <div className="text-[10px] tracking-[0.3em] text-[#00cc6a]/70 uppercase mb-4">Go-to-Market</div>
            <h2
              className="text-[clamp(28px,5vw,56px)] font-bold leading-[0.95] mb-4"
              style={{ fontFamily: HEADLINE_FONT }}
            >
              <span className="text-[#00ff87]">ZERO BUYER RISK</span>
              <br />
              AT ENTRY.
            </h2>
          </RevealSection>

          {/* GTM pipeline */}
          <div className="mt-12 space-y-0">
            {/* Progress bar */}
            <RevealSection delay={0.1}>
              <div className="flex h-3 overflow-hidden mb-8">
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
                  <div className="border border-white/8 p-6 h-full">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="size-2" style={{ backgroundColor: s.color }} />
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
            <p className="text-center text-[clamp(18px,3vw,32px)] font-bold text-[#FFB800]" style={{ fontFamily: HEADLINE_FONT }}>
              HIGH MARGIN ARR AT EXIT.
            </p>
          </RevealSection>
        </div>
      </section>

      {/* ═══ 6.5. REVENUE MODEL ═══ */}
      <section className="py-24 md:py-32 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <RevealSection>
            <div className="text-[10px] tracking-[0.3em] text-[#FFB800]/70 uppercase mb-4">Revenue Model</div>
            <h2
              className="text-[clamp(28px,5vw,56px)] font-bold leading-[0.95] mb-8"
              style={{ fontFamily: HEADLINE_FONT }}
            >
              THREE REVENUE STREAMS.
              <br />
              <span className="text-[#FFB800]">ONE COMPOUNDING ENGINE.</span>
            </h2>
          </RevealSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <RevealSection delay={0.1}>
              <div className="border border-[#FFB800]/15 p-6 bg-[#FFB800]/[0.03] h-full">
                <div className="text-[9px] tracking-[0.2em] text-[#FFB800]/50 uppercase mb-3">Stream 1</div>
                <div className="text-lg font-bold text-[#FFB800] mb-1" style={{ fontFamily: HEADLINE_FONT }}>Operational Discovery</div>
                <div className="text-2xl font-bold text-[#FFB800] font-mono mb-3">$15-25K</div>
                <p className="text-[11px] text-white/50 leading-relaxed mb-3">
                  Non-refundable workflow audit. Qualifies the client, maps automation opportunities, and generates immediate revenue.
                </p>
                <div className="text-[9px] text-[#FFB800]/60 font-mono">ONE-TIME · HIGH CONVERSION ON QUALIFIED LEADS</div>
              </div>
            </RevealSection>

            <RevealSection delay={0.2}>
              <div className="border border-[#00ff87]/15 p-6 bg-[#00ff87]/[0.03] h-full">
                <div className="text-[9px] tracking-[0.2em] text-[#00ff87]/50 uppercase mb-3">Stream 2</div>
                <div className="text-lg font-bold text-[#00ff87] mb-1" style={{ fontFamily: HEADLINE_FONT }}>Platform License</div>
                <div className="text-2xl font-bold text-[#00ff87] font-mono mb-3">$96-180K/yr</div>
                <p className="text-[11px] text-white/50 leading-relaxed mb-3">
                  Annual SaaS license. All agents, all verticals, client portal, operator command center, managed services, targeting 99.5% uptime.
                </p>
                <div className="text-[9px] text-[#00ff87]/60 font-mono">RECURRING · 85% GROSS MARGIN</div>
              </div>
            </RevealSection>

            <RevealSection delay={0.3}>
              <div className="border border-[#8B8BFF]/15 p-6 bg-[#8B8BFF]/[0.03] h-full">
                <div className="text-[9px] tracking-[0.2em] text-[#8B8BFF]/50 uppercase mb-3">Stream 3</div>
                <div className="text-lg font-bold text-[#8B8BFF] mb-1" style={{ fontFamily: HEADLINE_FONT }}>Custom Blueprints</div>
                <div className="text-2xl font-bold text-[#8B8BFF] font-mono mb-3">$20-50K</div>
                <p className="text-[11px] text-white/50 leading-relaxed mb-3">
                  Sector-specific agent configurations, custom workflows, and white-label client portal deployments for enterprise clients.
                </p>
                <div className="text-[9px] text-[#8B8BFF]/60 font-mono">PROJECT-BASED · HIGH MARGIN UPSELL</div>
              </div>
            </RevealSection>
          </div>

          <RevealSection delay={0.4} className="mt-8">
            <div className="border border-white/8 p-5">
              <div className="text-[9px] tracking-[0.2em] text-white/30 uppercase mb-3">Revenue Composition at Scale (Year 2)</div>
              <div className="flex h-6 gap-[2px] overflow-hidden mb-2">
                <div className="h-full bg-[#FFB800]" style={{ width: "12%" }} />
                <div className="h-full bg-[#00ff87]" style={{ width: "72%" }} />
                <div className="h-full bg-[#8B8BFF]" style={{ width: "16%" }} />
              </div>
              <div className="flex text-[9px] font-mono">
                <span className="text-[#FFB800]" style={{ width: "12%" }}>12%</span>
                <span className="text-[#00ff87]" style={{ width: "72%" }}>72% Recurring</span>
                <span className="text-[#8B8BFF]" style={{ width: "16%" }}>16%</span>
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ═══ 7. DAY 0 → NOW ═══ */}
      <section className="py-24 md:py-32 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <RevealSection>
            <div className="text-[10px] tracking-[0.3em] text-[#00ff87]/70 uppercase mb-4">Day 0 → Now</div>
            <h2
              className="text-[clamp(24px,4vw,48px)] font-bold leading-[0.95] mb-2"
              style={{ fontFamily: HEADLINE_FONT }}
            >
              FROM ZERO
            </h2>
            <h2
              className="text-[clamp(24px,4vw,48px)] font-bold leading-[0.95] mb-2 text-[#00ff87]"
              style={{ fontFamily: HEADLINE_FONT }}
            >
              TO A FULL ENTERPRISE PLATFORM.
            </h2>
            <h2
              className="text-[clamp(24px,4vw,48px)] font-bold leading-[0.95] mb-8 text-white/45"
              style={{ fontFamily: HEADLINE_FONT }}
            >
              BUILT BY FOUR PEOPLE.
            </h2>
          </RevealSection>

          {/* Timeline */}
          <div className="relative mt-12">
            {/* Vertical line */}
            <div className="absolute left-4 md:left-8 top-0 bottom-0 w-px bg-gradient-to-b from-[#00ff87]/40 via-[#00cc6a]/40 via-[#009952]/40 to-[#00ff87]/40" />

            {/* Day 0 */}
            <RevealSection delay={0.1}>
              <div className="relative pl-12 md:pl-20 pb-10">
                <div className="absolute left-2.5 md:left-6.5 top-1 size-3 bg-[#00ff87] border-2 border-[#050507]" />
                <div className="text-[10px] tracking-[0.2em] text-[#00ff87]/70 uppercase mb-2">Day 0 — The Problem</div>
                <div className="border border-white/8 p-5">
                  <p className="text-sm text-white/50 leading-relaxed">
                    Watched a UHNWI holding company coordinate 20+ ventures across 6 sectors on spreadsheets and email chains.
                    Tasks went untracked. Stages stalled for weeks. Distributions got delayed. No platform existed to fix it.
                    <span className="text-[#00ff87] font-medium"> So we started building one.</span>
                  </p>
                </div>
              </div>
            </RevealSection>

            {/* Foundation */}
            <RevealSection delay={0.2}>
              <div className="relative pl-12 md:pl-20 pb-10">
                <div className="absolute left-2.5 md:left-6.5 top-1 size-3 bg-[#00cc6a] border-2 border-[#050507]" />
                <div className="text-[10px] tracking-[0.2em] text-[#00cc6a]/70 uppercase mb-2">Phase 1 — Foundation</div>
                <div className="border border-white/8 p-5">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-[#00cc6a] font-mono">55</div>
                      <div className="text-[10px] text-white/50">DB tables</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-[#00cc6a] font-mono">60+</div>
                      <div className="text-[10px] text-white/50">backend modules</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-[#00cc6a] font-mono">34</div>
                      <div className="text-[10px] text-white/50">pages built</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-[#00cc6a] font-mono">125</div>
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
                <div className="absolute left-2.5 md:left-6.5 top-1 size-3 bg-[#009952] border-2 border-[#050507]" />
                <div className="text-[10px] tracking-[0.2em] text-[#009952]/70 uppercase mb-2">Phase 2 — Intelligence Layer</div>
                <div className="border border-white/8 p-5">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-[#009952] font-mono">5</div>
                      <div className="text-[10px] text-white/50">AI engines</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-[#009952] font-mono">4</div>
                      <div className="text-[10px] text-white/50">autonomous agents</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-[#009952] font-mono">2h</div>
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
                <div className="absolute left-2.5 md:left-6.5 top-1 size-3 bg-[#00cc6a] border-2 border-[#050507]" />
                <div className="text-[10px] tracking-[0.2em] text-[#00cc6a]/70 uppercase mb-2">Phase 3 — Enterprise Security</div>
                <div className="border border-white/8 p-5">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-[#00cc6a] font-mono">12</div>
                      <div className="text-[10px] text-white/50">security modules</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-[#00cc6a] font-mono">AES-256</div>
                      <div className="text-[10px] text-white/50">encryption</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-[#00cc6a] font-mono">RBAC</div>
                      <div className="text-[10px] text-white/50">access control</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-[#00cc6a] font-mono">MFA</div>
                      <div className="text-[10px] text-white/50">ready</div>
                    </div>
                  </div>
                  <p className="text-sm text-white/70 leading-relaxed">
                    Enterprise-grade security layer: AES-256 encrypted storage, role-based access control,
                    cross-tenant isolation, rate limiting, audit middleware, data retention policies,
                    session management with idle timeouts, full audit trails, SAML SSO with SCIM 2.0
                    provisioning, IP allowlist enforcement, and AI safety framework with confidence scoring.
                  </p>
                </div>
              </div>
            </RevealSection>

            {/* Now */}
            <RevealSection delay={0.5}>
              <div className="relative pl-12 md:pl-20">
                <div className="absolute left-2.5 md:left-6.5 top-1 size-3 bg-[#00ff87] border-2 border-[#050507] animate-pulse" />
                <div className="text-[10px] tracking-[0.2em] text-[#00ff87]/70 uppercase mb-2">Now — Live & Shipping</div>
                <div className="border border-[#00ff87]/20 p-5 bg-[#00ff87]/[0.03]">
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-[#00ff87] font-mono">5</div>
                      <div className="text-[10px] text-white/50">AI engines</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-[#00ff87] font-mono">6</div>
                      <div className="text-[10px] text-white/50">sectors</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-[#00ff87] font-mono">1,000+</div>
                      <div className="text-[10px] text-white/50">tests passing</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-[#00ff87] font-mono">SOC 2</div>
                      <div className="text-[10px] text-white/50">in progress</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-[#00ff87] font-mono">4</div>
                      <div className="text-[10px] text-white/50">person team</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-[#00ff87] font-mono">{"<3mo"}</div>
                      <div className="text-[10px] text-white/50">to deployment</div>
                    </div>
                  </div>
                  <p className="text-sm text-white/70 leading-relaxed mb-4">
                    Platform is fully functional and demo-ready. Client portal live (mobile-responsive). Operator command center live.
                    AI agents running autonomously with safety framework. Multi-currency support (15 currencies). SAML SSO + SCIM provisioning.
                    <span className="text-[#00ff87] font-medium">1 design partner</span> — validating the full workflow across 30+ ventures and 6 sectors in a live production environment.
                  </p>
                  {/* Pilot Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 p-4 border border-[#00ff87]/15 bg-[#00ff87]/[0.02]">
                    <div className="text-center">
                      <div className="text-lg font-bold text-[#00ff87] font-mono">47%</div>
                      <div className="text-[9px] text-white/50">Task time reduced</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-[#00ff87] font-mono">30+</div>
                      <div className="text-[9px] text-white/50">Ventures managed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-[#00ff87] font-mono">6</div>
                      <div className="text-[9px] text-white/50">Sectors automated</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-[#00ff87] font-mono">0</div>
                      <div className="text-[9px] text-white/50">Missed distributions</div>
                    </div>
                  </div>
                  <p className="text-sm text-white/70 leading-relaxed">
                    <span className="text-[#00cc6a] font-medium">90-day north star: onboard Lead Engineer + 2 devs, harden platform for enterprise, convert design partner to paid contract.
                    Pilot validates product. Revenue validates the market.</span>
                  </p>
                </div>
              </div>
            </RevealSection>
          </div>

          {/* Pipeline + Testimonial */}
          <RevealSection delay={0.6} className="mt-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Pilot Testimonial */}
              <div className="border border-[#00ff87]/20 p-6 bg-[#00ff87]/[0.03]">
                <div className="text-[9px] tracking-[0.2em] text-[#00ff87]/50 uppercase mb-4">Design Partner Validation</div>
                <p className="text-sm text-white/70 leading-relaxed italic mb-4">
                  "Before VENTEX, coordinating 30+ ventures across 6 sectors meant constant email chains and spreadsheet updates. Now the agents handle follow-ups, flag stalled deals, and draft distribution notices automatically. We went from reactive to proactive in weeks."
                </p>
                <div className="flex items-center gap-3">
                  <div className="size-8 bg-[#00ff87]/20 flex items-center justify-center text-[10px] font-bold text-[#00ff87]">DP</div>
                  <div>
                    <div className="text-[11px] text-white font-medium">Design Partner</div>
                    <div className="text-[10px] text-white/40">Design Partner — 23 ventures, 6 sectors, live production</div>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-[#00ff87]/10">
                  <p className="text-[10px] text-white/50 leading-relaxed">
                    Our design partner is a UHNWI holding company — not a paying client. We built VENTEX inside their operations to solve our own pain. This gave us 6 months of real-world product validation at zero CAC. The product works. Now we sell it.
                  </p>
                </div>
              </div>

              {/* Pipeline */}
              <div className="border border-white/8 p-6">
                <div className="text-[9px] tracking-[0.2em] text-white/40 uppercase mb-4">Go-To-Market Pipeline</div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-white/70">UHNWI Family Office — Dubai</span>
                    <span className="text-[9px] font-mono px-2 py-0.5 bg-[#FFB800]/10 text-[#FFB800] border border-[#FFB800]/20">DISCOVERY CALL</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-white/70">Multi-Sector Holding — London</span>
                    <span className="text-[9px] font-mono px-2 py-0.5 bg-[#FFB800]/10 text-[#FFB800] border border-[#FFB800]/20">WARM INTRO</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-white/70">Real Estate + Energy Group — NYC</span>
                    <span className="text-[9px] font-mono px-2 py-0.5 bg-white/5 text-white/40 border border-white/10">OUTREACH</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-white/70">Hospitality + F&B Conglomerate — Miami</span>
                    <span className="text-[9px] font-mono px-2 py-0.5 bg-white/5 text-white/40 border border-white/10">OUTREACH</span>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-white/8">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/40">Potential pipeline value (if converted)</span>
                    <span className="text-sm font-bold text-[#FFB800] font-mono">$480K ARR</span>
                  </div>
                  <p className="text-[9px] text-white/30 mt-2">All prospects sourced through our design partner's network. Zero paid acquisition.</p>
                </div>
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ═══ 8. THE ASK ═══ */}
      <section className="py-24 md:py-32 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <RevealSection>
            <div className="text-[10px] tracking-[0.3em] text-[#FFB800]/70 uppercase mb-4">The Ask</div>
            <h2
              className="text-[clamp(32px,6vw,80px)] font-bold leading-[0.85] mb-2 text-[#FFB800]"
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
              className="text-[clamp(20px,3vw,40px)] font-bold leading-[0.95] mb-8 text-[#FFB800]"
              style={{ fontFamily: HEADLINE_FONT }}
            >
              SERIES A IN 12 MONTHS.
            </h3>
          </RevealSection>

          <RevealSection delay={0.1}>
            <p className="text-sm text-white/70 max-w-3xl leading-relaxed mb-12">
              This raise gives Aurovia 14+ months of runway to convert our pilot into a $120K annual contract,
              hire a Lead Engineer and scale the dev team from 2 to 5, close 12-15 enterprise clients,
              and reach $1.56M ARR by Month 12. Cash flow positive by Month 6. Series A positioned at $15M+ valuation
              by Month 10-12. Every dollar is allocated with precision to generate maximum leverage.
            </p>
          </RevealSection>

          {/* Use of Funds — Investor-Grade */}
          <RevealSection delay={0.15}>
            <div className="border border-white/8 p-6 md:p-8 mb-8">
              <div className="flex items-center justify-between mb-6">
                <div className="text-[10px] tracking-[0.3em] text-[#FFB800]/70 uppercase">Capital Allocation</div>
                <div className="text-sm font-mono font-semibold text-[#FFB800]">$700,000</div>
              </div>

              {/* Stacked bar — grouped by bucket */}
              <div className="flex h-8 gap-[3px] mb-2 overflow-hidden">
                {FUND_BUCKETS.map((b) => (
                  <div key={b.bucket} className="flex h-full gap-[1px]" style={{ width: `${b.items.reduce((s, i) => s + i.pct, 0)}%` }}>
                    {b.items.map((f) => (
                      <div
                        key={f.label}
                        className="h-full transition-all duration-700"
                        style={{ width: `${(f.pct / b.items.reduce((s, i) => s + i.pct, 0)) * 100}%`, backgroundColor: f.color }}
                        title={`${f.label}: ${f.amount} (${f.pct}%)`}
                      />
                    ))}
                  </div>
                ))}
              </div>

              {/* Bucket labels under bar */}
              <div className="flex mb-8">
                {FUND_BUCKETS.map((b) => (
                  <div key={b.bucket} style={{ width: `${b.items.reduce((s, i) => s + i.pct, 0)}%` }} className="text-center">
                    <span className="text-[9px] font-mono tracking-[0.15em] uppercase" style={{ color: b.bucketColor }}>
                      {b.bucket} {Math.round(b.items.reduce((s, i) => s + i.pct, 0))}%
                    </span>
                  </div>
                ))}
              </div>

              {/* Strategic Buckets with milestones */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {FUND_BUCKETS.map((b) => {
                  const totalPct = Math.round(b.items.reduce((s, i) => s + i.pct, 0));
                  const totalAmt = b.items.reduce((s, i) => s + parseInt(i.amount.replace(/[^0-9]/g, "")), 0);
                  return (
                    <div key={b.bucket} className="border border-white/8 p-5">
                      {/* Bucket header */}
                      <div className="flex items-center gap-2 mb-1">
                        <div className="size-2 rounded-[1px]" style={{ backgroundColor: b.bucketColor }} />
                        <span className="text-[10px] font-mono tracking-[0.15em] font-bold" style={{ color: b.bucketColor }}>
                          {b.bucket}
                        </span>
                        <span className="text-[10px] font-mono text-white/30 ml-auto">{totalPct}%</span>
                      </div>
                      <div className="text-[11px] text-white/50 mb-4">{b.bucketDesc}</div>

                      {/* Dollar total for bucket */}
                      <div className="text-xl font-bold font-mono mb-4" style={{ color: b.bucketColor }}>
                        ${totalAmt}K
                      </div>

                      {/* Line items */}
                      <div className="space-y-2 mb-4">
                        {b.items.map((f) => (
                          <div key={f.label} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="size-1.5 rounded-full" style={{ backgroundColor: f.color }} />
                              <span className="text-[11px] text-white/70">{f.label}</span>
                            </div>
                            <span className="text-[11px] font-mono text-white/50">{f.amount}</span>
                          </div>
                        ))}
                      </div>

                      {/* Milestone outcome */}
                      <div className="border-t border-white/8 pt-3">
                        <div className="text-[9px] tracking-[0.15em] text-white/30 uppercase mb-1">Milestone</div>
                        <div className="text-[11px] text-white/70 leading-relaxed">{b.milestone}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </RevealSection>

          {/* Timeline — How Capital Deploys */}
          <RevealSection delay={0.2}>
            <div className="border border-white/8 p-6 md:p-8 mb-8">
              <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase mb-6">12-Month Deployment Timeline</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
                {TIMELINE_MILESTONES.map((m, i) => (
                  <div key={m.quarter} className="relative p-4 border border-white/5">
                    {/* Quarter badge */}
                    <div
                      className="text-[10px] font-mono font-bold tracking-wider mb-2"
                      style={{ color: m.color }}
                    >
                      {m.quarter}
                    </div>
                    <div className="text-[12px] text-white/70 leading-relaxed">{m.label}</div>
                    {/* Progress indicator */}
                    <div className="mt-3 h-[2px] bg-white/5 overflow-hidden">
                      <div
                        className="h-full"
                        style={{ width: `${(i + 1) * 33}%`, backgroundColor: m.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </RevealSection>

          {/* Unit Economics — The Math */}
          <RevealSection delay={0.22}>
            <div className="border border-white/8 p-6 md:p-8 mb-8">
              <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase mb-6">Unit Economics — The Math Behind $4.8M ARR</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                <div>
                  <div className="text-2xl font-bold text-[#FFB800] font-mono">$120K</div>
                  <div className="text-[10px] text-white/50 mb-1">Avg. Contract Value</div>
                  <div className="text-[9px] text-white/30">Blended across Discovery + Pilot + License</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#00ff87] font-mono">85%</div>
                  <div className="text-[10px] text-white/50 mb-1">Gross Margin</div>
                  <div className="text-[9px] text-white/30">Pure software — no hardware, no COGS</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#FFB800] font-mono">$15K</div>
                  <div className="text-[10px] text-white/50 mb-1">Est. CAC</div>
                  <div className="text-[9px] text-white/30">Founder-led sales, no paid acquisition</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#00ff87] font-mono">20.4x</div>
                  <div className="text-[10px] text-white/50 mb-1">LTV:CAC Ratio</div>
                  <div className="text-[9px] text-white/30">$306K LTV (85% margin × 3yr) / $15K CAC</div>
                </div>
              </div>
              <div className="border-t border-white/8 pt-5">
                <div className="text-[10px] tracking-[0.2em] text-white/30 uppercase mb-3">Path to Series A</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 border border-white/5">
                    <div className="text-sm font-bold text-[#00ff87] font-mono mb-1">Year 1</div>
                    <div className="text-[11px] text-white/60">12-15 clients × $120K = <span className="text-[#FFB800] font-medium">$1.5M+ ARR</span></div>
                  </div>
                  <div className="p-3 border border-white/5">
                    <div className="text-sm font-bold text-[#FFB800] font-mono mb-1">Year 2</div>
                    <div className="text-[11px] text-white/60">25 clients × $120K = <span className="text-[#FFB800] font-medium">$3M ARR</span></div>
                  </div>
                  <div className="p-3 border border-white/5">
                    <div className="text-sm font-bold text-[#00ff87] font-mono mb-1">Year 3</div>
                    <div className="text-[11px] text-white/60">40 clients × $120K = <span className="text-[#FFB800] font-medium">$4.8M ARR</span></div>
                  </div>
                </div>
                <p className="text-[9px] text-white/30 mt-3 italic">
                  Conservative: assumes 4-6 month sales cycle, 90% annual retention, and 15% ACV expansion from upsells.
                </p>
              </div>
            </div>
          </RevealSection>

          {/* SAFE Terms */}
          <RevealSection delay={0.25}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-[#FFB800]/20 p-5 text-center bg-[#FFB800]/[0.03]">
                <div className="text-[9px] tracking-[0.15em] text-[#FFB800]/50 uppercase mb-2">Round Size</div>
                <div className="text-2xl font-bold text-[#FFB800] font-mono">$700K</div>
                <div className="text-[10px] text-white/30 mt-1">Pre-Seed SAFE</div>
              </div>
              <div className="border border-[#FFB800]/20 p-5 text-center bg-[#FFB800]/[0.03]">
                <div className="text-[9px] tracking-[0.15em] text-[#FFB800]/50 uppercase mb-2">Valuation Cap</div>
                <div className="text-2xl font-bold text-[#FFB800] font-mono">$5M</div>
                <div className="text-[10px] text-white/30 mt-1">Post-money SAFE</div>
              </div>
              <div className="border border-[#00ff87]/20 p-5 text-center bg-[#00ff87]/[0.03]">
                <div className="text-[9px] tracking-[0.15em] text-[#00ff87]/50 uppercase mb-2">Runway</div>
                <div className="text-2xl font-bold text-[#00ff87] font-mono">12</div>
                <div className="text-[10px] text-white/30 mt-1">Months to Series A</div>
              </div>
            </div>
            <p className="text-[9px] text-white/30 mt-3 text-center italic">
              Entity: Aurovia LLC (d/b/a VENTEX) — converting to Delaware C-Corp at close. VENTEX is a product wholly owned by Aurovia.
            </p>
          </RevealSection>
        </div>
      </section>

      {/* ═══ 9. TEAM ═══ */}
      <section className="py-24 md:py-32 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <RevealSection>
            <div className="text-[10px] tracking-[0.3em] text-[#8B8BFF]/70 uppercase mb-4">The Team</div>
            <h2
              className="text-[clamp(28px,5vw,56px)] font-bold leading-[0.95] mb-4"
              style={{ fontFamily: HEADLINE_FONT }}
            >
              MEET THE TEAM.
            </h2>
            <p className="text-sm text-white/60 max-w-2xl leading-relaxed mb-10">
              Four operators who built the system they couldn't find anywhere else. No outsourced code. No borrowed ideas. Every engine, every pipeline, built in-house in under 90 days.
            </p>
          </RevealSection>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {TEAM.map((t, i) => (
              <RevealSection key={t.name} delay={i * 0.1}>
                <div className="border border-white/8 overflow-hidden">
                  {/* Photo */}
                  <div className="aspect-[3/4] relative overflow-hidden" style={{ backgroundColor: `${t.color}08` }}>
                    <img
                      src={t.photo}
                      alt={t.name}
                      className="w-full h-full object-cover object-[center_20%]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-white">{t.name}</span>
                        <a href={t.linkedin} target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white/70 transition-colors" title="LinkedIn">
                          <svg className="size-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                        </a>
                      </div>
                      <div className="text-[10px] tracking-wide mt-0.5" style={{ color: `${t.color}` }}>{t.role}</div>
                    </div>
                  </div>
                  {/* Accent line */}
                  <div className="h-[2px] w-full" style={{ background: `linear-gradient(90deg, ${t.color}, ${t.color}00)` }} />
                  {/* Bio + Quote */}
                  <div className="p-4">
                    <p className="text-[11px] text-white/60 leading-relaxed mb-3">{t.bio}</p>
                    <p className="text-[10px] italic text-white/35 leading-relaxed border-l-2 pl-2" style={{ borderColor: `${t.color}30` }}>
                      "{t.quote}"
                    </p>
                  </div>
                </div>
              </RevealSection>
            ))}
          </div>

          {/* Post-Raise Hires */}
          <RevealSection delay={0.4} className="mt-8">
            <div className="border border-white/5 px-5 py-3 flex items-center gap-3">
              <div className="text-[9px] tracking-[0.2em] text-white/40 uppercase">Post-Raise</div>
              <div className="h-px flex-1 bg-white/5" />
              <span className="text-[11px] text-white/50">Engineering team scales to 3 devs + dedicated financial and legal counsel</span>
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
            <p className="text-sm text-white/70 max-w-xl mx-auto leading-relaxed mb-6">
              The market is uncontested. The platform is live. The round is <span className="text-[#FFB800] font-semibold">$700K</span>, SAFE Cap <span className="text-[#FFB800] font-semibold">$5,000,000</span>.
              <span className="text-white font-medium"> The next call is yours to make.</span>
            </p>
          </RevealSection>

          {/* Investor Urgency */}
          <RevealSection delay={0.25}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto mb-12">
              <div className="border border-[#FFB800]/15 p-4 text-center bg-[#FFB800]/[0.03]">
                <div className="text-lg font-bold text-[#FFB800] font-mono">$700K</div>
                <div className="text-[10px] text-white/40">Total round size</div>
              </div>
              <div className="border border-[#00ff87]/15 p-4 text-center bg-[#00ff87]/[0.03]">
                <div className="text-lg font-bold text-[#00ff87] font-mono">$5M</div>
                <div className="text-[10px] text-white/40">Post-money cap</div>
              </div>
              <div className="border border-white/10 p-4 text-center">
                <div className="text-lg font-bold text-white font-mono">$50K</div>
                <div className="text-[10px] text-white/40">Min. check size</div>
              </div>
            </div>
          </RevealSection>

          <RevealSection delay={0.3}>
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <a
                  href="tel:+15714803261"
                  className="inline-flex items-center gap-2 px-10 py-4 bg-[#00ff87] text-[#050507] text-sm font-bold tracking-[0.2em] hover:bg-[#00ff87]/90 transition-colors"
                >
                  CALL US: (571) 480-3261 →
                </a>
                <Link
                  href="/demo/dashboard"
                  className="inline-flex items-center gap-2 px-10 py-4 border border-[#00ff87]/40 text-[#00ff87] text-sm font-bold tracking-[0.2em] hover:border-[#00ff87]/80 hover:bg-[#00ff87]/5 transition-colors"
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
              Presented By: Shwan Lee
            </p>
          </RevealSection>

          {/* Powered by Aurovia */}
          <RevealSection delay={0.5} className="mt-16">
            <p className="text-[11px] text-white/40 tracking-[0.2em] uppercase mb-4 font-mono">
              Powered by
            </p>
            <a
              href="https://aurovia.co"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block group transition-all duration-300 hover:scale-105"
            >
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663421947072/TYkqBQavc4Sd5YvF3sSZqT/aurovia-logo-white_6b44be8f.png"
                alt="Aurovia"
                className="h-8 md:h-10 w-auto opacity-70 group-hover:opacity-100 transition-opacity duration-300"
              />
            </a>
            <p className="text-[10px] text-white/30 tracking-[0.15em] mt-3">
              <a
                href="https://aurovia.co"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white/60 transition-colors"
              >
                aurovia.co →
              </a>
            </p>
          </RevealSection>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="py-12 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <a
              href="https://aurovia.co"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663421947072/TYkqBQavc4Sd5YvF3sSZqT/aurovia-logo-white_6b44be8f.png"
                alt="Aurovia"
                className="h-5 w-auto opacity-60"
              />
            </a>
          </div>
          <div className="flex items-center gap-6 text-[10px] text-white/45 tracking-wide">
            <a href="https://aurovia.co" target="_blank" rel="noopener noreferrer" className="hover:text-white/70 transition-colors">aurovia.co</a>
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

