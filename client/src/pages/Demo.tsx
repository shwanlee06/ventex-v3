/**
 * VENTEX Prototype Demo — Public read-only showcase
 * Shows what the platform does with anonymized sample data.
 * No auth required. Matches the SpyOps visual language.
 */
import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  Layers3, Briefcase, ListChecks, DollarSign, Cpu, Shield, FileText,
  TrendingUp, Clock, CheckCircle2, AlertTriangle,
  Building2, Ship, UtensilsCrossed, Clapperboard, Fuel,
  Zap, Bot, BarChart3, Lock,
} from "lucide-react";

/* ─── Static demo data (anonymized) ─── */
const DEMO_METRICS = {
  ventures: 24,
  spvs: 10,
  tasksCompleted: 497,
  tasksOpen: 47,
  distributions: "$2.4M",
  sectors: 5,
  agentCycles: "1,247",
  uptime: "99.97%",
};

const DEMO_SECTORS = [
  { icon: Building2, name: "Real Estate", ventures: 7, active: 7, color: "#3b82f6" },
  { icon: Ship, name: "Yacht & Maritime", ventures: 3, active: 3, color: "#06b6d4" },
  { icon: UtensilsCrossed, name: "Hospitality & F&B", ventures: 3, active: 3, color: "#f59e0b" },
  { icon: Clapperboard, name: "Entertainment", ventures: 3, active: 3, color: "#a855f7" },
  { icon: Fuel, name: "Energy & Resources", ventures: 4, active: 3, color: "#ef4444" },
];

const DEMO_AGENT_FEED = [
  { agent: "Velocity Agent", action: "Stage advanced", detail: "Project Alpha moved to Active Ventures (12 days in Fundraising)", time: "2m ago", severity: "info" },
  { agent: "Overdue Agent", action: "Task escalated", detail: "Due diligence report overdue by 3 days — nudge email sent to assignee", time: "18m ago", severity: "warning" },
  { agent: "Distribution Sentinel", action: "Payment confirmed", detail: "Q2 distribution of $180K wired to 4 LP accounts", time: "1h ago", severity: "info" },
  { agent: "Orchestrator", action: "Daily briefing", detail: "Portfolio health: 87/100 — 2 ventures need attention, 1 compliance deadline approaching", time: "6h ago", severity: "info" },
  { agent: "Task Executor", action: "Research completed", detail: "Market analysis for Dubai Marina development auto-generated (4,200 words)", time: "8h ago", severity: "info" },
  { agent: "Velocity Agent", action: "Bottleneck detected", detail: "Project Gamma stuck in validation for 28 days — recommending escalation", time: "12h ago", severity: "critical" },
];

const DEMO_PIPELINE = [
  { stage: "In Validation", count: 4, color: "#f59e0b" },
  { stage: "In Fundraising", count: 6, color: "#3b82f6" },
  { stage: "Active Ventures", count: 12, color: "#10b981" },
  { stage: "Completed", count: 2, color: "#6b7280" },
];

const DEMO_CAPABILITIES = [
  {
    icon: Bot,
    title: "Autonomous AI Agents",
    desc: "4 specialized agents run every 30 minutes — detecting overdue tasks, advancing stages, monitoring distributions, and orchestrating cross-portfolio actions.",
    stat: "1,247 cycles executed",
  },
  {
    icon: Zap,
    title: "Proactive Task Execution",
    desc: "AI doesn't just monitor — it completes work. Research tasks, market analysis, due diligence drafts, and vendor evaluations are executed autonomously.",
    stat: "497 tasks auto-completed",
  },
  {
    icon: Shield,
    title: "Principal Confirmation Gate",
    desc: "8 action types are blocked until the principal explicitly approves. No distribution, communication, or contract executes without sign-off.",
    stat: "Zero unauthorized actions",
  },
  {
    icon: FileText,
    title: "Blueprint Extraction",
    desc: "Upload any business document — AI extracts structured process blueprints with stages, dependencies, ownership, and timelines. Sector-agnostic.",
    stat: "Any document → actionable process",
  },
  {
    icon: TrendingUp,
    title: "Predictive Intelligence",
    desc: "Stage forecasting, bottleneck detection, risk scoring, and portfolio health trajectory. The system learns from outcomes and improves over time.",
    stat: "87/100 portfolio health score",
  },
  {
    icon: Lock,
    title: "SOC 2 Grade Security",
    desc: "AES-256 encryption, 6-tier RBAC, full audit logging, passkey support, per-tenant session controls, and LLM output sanitization.",
    stat: "Enterprise-grade from day one",
  },
];

const DEMO_TASKS_RECENT = [
  { title: "Regulatory compliance review — Dubai Marina", status: "complete", agent: true, venture: "Project Alpha" },
  { title: "Vendor evaluation for marina construction", status: "complete", agent: true, venture: "Project Alpha" },
  { title: "LP quarterly report draft", status: "complete", agent: true, venture: "Portfolio-wide" },
  { title: "Site assessment — Muscat development", status: "in_progress", agent: false, venture: "Project Beta" },
  { title: "Charter license renewal", status: "overdue", agent: false, venture: "Project Gamma" },
];

/* ─── Component ─── */
export default function Demo() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<"command" | "agents" | "portal">("command");
  const [clock, setClock] = useState("");
  const [agentPulse, setAgentPulse] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => {
      setClock(new Date().toLocaleTimeString("en-US", { timeZone: "America/New_York", hour12: false }));
      setAgentPulse(p => (p + 1) % 4);
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  const handleBack = useCallback(() => navigate("/"), [navigate]);

  return (
    <div
      style={{
        background: "#000",
        color: "#fff",
        minHeight: "100vh",
        fontFamily: "'IBM Plex Mono', monospace",
        overflow: "auto",
      }}
    >
      {/* ─── Top Nav ─── */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 56,
          background: "#000",
          borderBottom: "1px solid rgba(255,255,255,0.15)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 32px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 18, fontWeight: 500 }}>
            VTX<span style={{ opacity: 0.5 }}>_</span>
          </span>
          <span style={{ width: 1, height: 20, background: "#fff", display: "inline-block" }} />
          <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#888", letterSpacing: "0.2em" }}>
            PROTOTYPE
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#555" }}>
            {clock} EST
          </span>
          <button
            onClick={handleBack}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.3)",
              color: "#fff",
              padding: "6px 16px",
              fontSize: 10,
              letterSpacing: "0.12em",
              cursor: "pointer",
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            ← BACK
          </button>
        </div>
      </nav>

      {/* ─── Main Content ─── */}
      <div style={{ paddingTop: 56 }}>
        {/* Hero Stats Bar */}
        <div
          style={{
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            padding: "24px 32px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 24,
          }}
        >
          {[
            { label: "VENTURES", value: DEMO_METRICS.ventures, icon: Layers3 },
            { label: "SPVs", value: DEMO_METRICS.spvs, icon: Briefcase },
            { label: "TASKS DONE", value: DEMO_METRICS.tasksCompleted, icon: CheckCircle2 },
            { label: "OPEN TASKS", value: DEMO_METRICS.tasksOpen, icon: ListChecks },
            { label: "DISTRIBUTIONS", value: DEMO_METRICS.distributions, icon: DollarSign },
            { label: "AGENT CYCLES", value: DEMO_METRICS.agentCycles, icon: Cpu },
            { label: "UPTIME", value: DEMO_METRICS.uptime, icon: BarChart3 },
          ].map((m) => (
            <div key={m.label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <m.icon size={12} style={{ color: "#555" }} />
                <span style={{ fontSize: 9, letterSpacing: "0.1em", color: "#666" }}>{m.label}</span>
              </div>
              <span style={{ fontSize: 20, fontWeight: 600, fontFamily: "'Share Tech Mono', monospace" }}>
                {m.value}
              </span>
            </div>
          ))}
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: "flex",
            gap: 0,
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            padding: "0 32px",
          }}
        >
          {([
            { id: "command", label: "COMMAND CENTER" },
            { id: "agents", label: "AI AGENTS" },
            { id: "portal", label: "CLIENT PORTAL" },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: "transparent",
                border: "none",
                borderBottom: activeTab === tab.id ? "2px solid #fff" : "2px solid transparent",
                color: activeTab === tab.id ? "#fff" : "#555",
                padding: "16px 24px",
                fontSize: 11,
                letterSpacing: "0.12em",
                cursor: "pointer",
                fontFamily: "'IBM Plex Mono', monospace",
                transition: "all 0.2s",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ─── Tab Content ─── */}
        <div style={{ padding: "32px" }}>
          {activeTab === "command" && <CommandView />}
          {activeTab === "agents" && <AgentsView pulse={agentPulse} />}
          {activeTab === "portal" && <PortalView />}
        </div>

        {/* ─── Capabilities Grid ─── */}
        <div style={{ padding: "64px 32px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <h2 style={{ fontSize: 11, letterSpacing: "0.15em", color: "#666", marginBottom: 32 }}>
            PLATFORM CAPABILITIES
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
            {DEMO_CAPABILITIES.map((cap) => (
              <div
                key={cap.title}
                style={{
                  border: "1px solid rgba(255,255,255,0.1)",
                  padding: 24,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <cap.icon size={16} style={{ color: "#fff" }} />
                  <span style={{ fontSize: 12, fontWeight: 500 }}>{cap.title}</span>
                </div>
                <p style={{ fontSize: 11, color: "#888", lineHeight: 1.6, margin: 0 }}>{cap.desc}</p>
                <span style={{ fontSize: 10, color: "#555", fontFamily: "'Share Tech Mono', monospace" }}>
                  ▸ {cap.stat}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Footer CTA ─── */}
        <div
          style={{
            padding: "64px 32px",
            borderTop: "1px solid rgba(255,255,255,0.1)",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 11, color: "#666", letterSpacing: "0.1em", marginBottom: 24 }}>
            86,785 LINES OF CODE · 59 DATABASE TABLES · 321 API ENDPOINTS · 1,091 TEST CASES
          </p>
          <p style={{ fontSize: 13, color: "#999", maxWidth: 600, margin: "0 auto 32px", lineHeight: 1.6 }}>
            Built by aurovia LLC. Operational intelligence for venture holdings.
          </p>
          <button
            onClick={handleBack}
            style={{
              background: "#fff",
              color: "#000",
              border: "none",
              padding: "14px 32px",
              fontSize: 11,
              letterSpacing: "0.12em",
              cursor: "pointer",
              fontFamily: "'IBM Plex Mono', monospace",
              fontWeight: 500,
            }}
          >
            REQUEST ACCESS →
          </button>
        </div>

        {/* Bottom spacer */}
        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   COMMAND CENTER VIEW
   ═══════════════════════════════════════════════════════════════ */
function CommandView() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 32 }}>
      {/* Left — Sectors + Pipeline */}
      <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
        {/* Sectors */}
        <div>
          <h3 style={{ fontSize: 10, letterSpacing: "0.15em", color: "#666", marginBottom: 16 }}>
            VENTURE SECTORS
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            {DEMO_SECTORS.map((s) => (
              <div
                key={s.name}
                style={{
                  border: "1px solid rgba(255,255,255,0.1)",
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <s.icon size={14} style={{ color: s.color }} />
                  <span style={{ fontSize: 11, fontWeight: 500 }}>{s.name}</span>
                </div>
                <div style={{ display: "flex", gap: 16 }}>
                  <span style={{ fontSize: 10, color: "#888" }}>{s.ventures} ventures</span>
                  <span style={{ fontSize: 10, color: "#10b981" }}>{s.active} active</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pipeline */}
        <div>
          <h3 style={{ fontSize: 10, letterSpacing: "0.15em", color: "#666", marginBottom: 16 }}>
            VENTURE PIPELINE
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {DEMO_PIPELINE.map((p) => (
              <div key={p.stage} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 10, color: "#888", width: 120 }}>{p.stage}</span>
                <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 3 }}>
                  <div
                    style={{
                      width: `${(p.count / 24) * 100}%`,
                      height: "100%",
                      background: p.color,
                      borderRadius: 3,
                    }}
                  />
                </div>
                <span style={{ fontSize: 11, fontFamily: "'Share Tech Mono', monospace", width: 24, textAlign: "right" }}>
                  {p.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Tasks */}
        <div>
          <h3 style={{ fontSize: 10, letterSpacing: "0.15em", color: "#666", marginBottom: 16 }}>
            RECENT TASK ACTIVITY
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {DEMO_TASKS_RECENT.map((t, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                {t.status === "complete" ? (
                  <CheckCircle2 size={12} style={{ color: "#10b981", flexShrink: 0 }} />
                ) : t.status === "overdue" ? (
                  <AlertTriangle size={12} style={{ color: "#ef4444", flexShrink: 0 }} />
                ) : (
                  <Clock size={12} style={{ color: "#f59e0b", flexShrink: 0 }} />
                )}
                <span style={{ fontSize: 11, color: "#ccc", flex: 1 }}>{t.title}</span>
                {t.agent && (
                  <span style={{ fontSize: 9, color: "#06b6d4", background: "rgba(6,182,212,0.1)", padding: "2px 6px", borderRadius: 2 }}>
                    AI
                  </span>
                )}
                <span style={{ fontSize: 9, color: "#555" }}>{t.venture}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — SPVs + Quick Stats */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ border: "1px solid rgba(255,255,255,0.1)", padding: 20 }}>
          <h3 style={{ fontSize: 10, letterSpacing: "0.15em", color: "#666", marginBottom: 16 }}>
            ACTIVE SPVs & DEALS
          </h3>
          {[
            { name: "Marina Development SPV", stage: "Active deal", priority: "HIGH", sector: "Real Estate" },
            { name: "Yacht Charter JV", stage: "Active deal", priority: "MED", sector: "Yacht" },
            { name: "Energy Acquisition", stage: "In negotiation", priority: "HIGH", sector: "Energy" },
            { name: "Hospitality Fund I", stage: "Active deal", priority: "MED", sector: "F&B" },
          ].map((spv, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 0",
                borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.05)" : "none",
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: "#ccc" }}>{spv.name}</div>
                <div style={{ fontSize: 9, color: "#555" }}>{spv.sector} · {spv.stage}</div>
              </div>
              <span
                style={{
                  fontSize: 9,
                  padding: "2px 6px",
                  borderRadius: 2,
                  background: spv.priority === "HIGH" ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)",
                  color: spv.priority === "HIGH" ? "#ef4444" : "#f59e0b",
                }}
              >
                {spv.priority}
              </span>
            </div>
          ))}
        </div>

        <div style={{ border: "1px solid rgba(255,255,255,0.1)", padding: 20 }}>
          <h3 style={{ fontSize: 10, letterSpacing: "0.15em", color: "#666", marginBottom: 16 }}>
            SECURITY STATUS
          </h3>
          {[
            { label: "Encryption", value: "AES-256-GCM", status: "active" },
            { label: "RBAC", value: "6-tier enforced", status: "active" },
            { label: "Audit Log", value: "3,847 events", status: "active" },
            { label: "MFA", value: "Available", status: "active" },
            { label: "Data Residency", value: "US-East-1", status: "active" },
          ].map((s, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 0",
                borderBottom: i < 4 ? "1px solid rgba(255,255,255,0.05)" : "none",
              }}
            >
              <span style={{ fontSize: 10, color: "#888" }}>{s.label}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 10, color: "#ccc", fontFamily: "'Share Tech Mono', monospace" }}>{s.value}</span>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   AI AGENTS VIEW
   ═══════════════════════════════════════════════════════════════ */
function AgentsView({ pulse }: { pulse: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      {/* Agent Status Cards */}
      <div>
        <h3 style={{ fontSize: 10, letterSpacing: "0.15em", color: "#666", marginBottom: 16 }}>
          AUTONOMOUS AGENTS — RUNNING EVERY 30 MINUTES
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          {[
            { name: "Overdue Agent", desc: "Detects stalled tasks, sends nudges, escalates after 48h", signals: 23, status: "active" },
            { name: "Velocity Agent", desc: "Tracks stage transitions, identifies bottlenecks, advances stages", signals: 45, status: "active" },
            { name: "Distribution Sentinel", desc: "Monitors payment schedules, alerts on missed distributions", signals: 12, status: "active" },
            { name: "Orchestrator", desc: "Cross-references all signals, generates daily briefings", signals: 67, status: "active" },
          ].map((agent, i) => (
            <div
              key={agent.name}
              style={{
                border: "1px solid rgba(255,255,255,0.1)",
                padding: 20,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#10b981",
                  opacity: pulse === i ? 1 : 0.4,
                  transition: "opacity 0.3s",
                }}
              />
              <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 6 }}>{agent.name}</div>
              <p style={{ fontSize: 10, color: "#888", margin: "0 0 12px", lineHeight: 1.5 }}>{agent.desc}</p>
              <div style={{ display: "flex", gap: 16 }}>
                <span style={{ fontSize: 9, color: "#555" }}>
                  Signals: <span style={{ color: "#ccc", fontFamily: "'Share Tech Mono', monospace" }}>{agent.signals}</span>
                </span>
                <span style={{ fontSize: 9, color: "#10b981" }}>● ACTIVE</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Proactive Agents */}
      <div>
        <h3 style={{ fontSize: 10, letterSpacing: "0.15em", color: "#666", marginBottom: 16 }}>
          PROACTIVE EXECUTION ENGINES
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ border: "1px solid rgba(255,255,255,0.1)", padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Zap size={14} style={{ color: "#f59e0b" }} />
              <span style={{ fontSize: 11, fontWeight: 500 }}>Task Generator</span>
            </div>
            <p style={{ fontSize: 10, color: "#888", margin: "0 0 12px", lineHeight: 1.5 }}>
              Scans ventures with few open tasks. Uses LLM to identify what needs to happen next and creates actionable tasks with owners and deadlines.
            </p>
            <span style={{ fontSize: 9, color: "#555", fontFamily: "'Share Tech Mono', monospace" }}>
              Last run: 18 min ago · 3 tasks generated
            </span>
          </div>
          <div style={{ border: "1px solid rgba(255,255,255,0.1)", padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Bot size={14} style={{ color: "#06b6d4" }} />
              <span style={{ fontSize: 11, fontWeight: 500 }}>Autonomous Executor</span>
            </div>
            <p style={{ fontSize: 10, color: "#888", margin: "0 0 12px", lineHeight: 1.5 }}>
              Identifies tasks that can be completed autonomously (research, analysis, drafts). Executes work and marks tasks done with full audit trail.
            </p>
            <span style={{ fontSize: 9, color: "#555", fontFamily: "'Share Tech Mono', monospace" }}>
              Last run: 18 min ago · 2 tasks completed
            </span>
          </div>
        </div>
      </div>

      {/* Live Feed */}
      <div>
        <h3 style={{ fontSize: 10, letterSpacing: "0.15em", color: "#666", marginBottom: 16 }}>
          AGENT ACTIVITY FEED
        </h3>
        <div style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
          {DEMO_AGENT_FEED.map((item, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 12,
                padding: "14px 16px",
                borderBottom: i < DEMO_AGENT_FEED.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  marginTop: 5,
                  flexShrink: 0,
                  background:
                    item.severity === "critical" ? "#ef4444" :
                    item.severity === "warning" ? "#f59e0b" : "#10b981",
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: "#ccc" }}>
                    <span style={{ color: "#fff", fontWeight: 500 }}>{item.agent}</span> — {item.action}
                  </span>
                  <span style={{ fontSize: 9, color: "#555", fontFamily: "'Share Tech Mono', monospace" }}>{item.time}</span>
                </div>
                <p style={{ fontSize: 10, color: "#888", margin: 0, lineHeight: 1.4 }}>{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Intelligence Engines */}
      <div>
        <h3 style={{ fontSize: 10, letterSpacing: "0.15em", color: "#666", marginBottom: 16 }}>
          INTELLIGENCE ENGINES
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {[
            { name: "Predictive Engine", desc: "Stage forecasting & bottleneck detection", metric: "87% accuracy" },
            { name: "Market Intelligence", desc: "Sector signals & regulatory changes via LLM", metric: "5 sectors covered" },
            { name: "Continuous Learning", desc: "Outcome tracking & recommendation calibration", metric: "Learning from 1,247 cycles" },
          ].map((eng) => (
            <div key={eng.name} style={{ border: "1px solid rgba(255,255,255,0.1)", padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 6 }}>{eng.name}</div>
              <p style={{ fontSize: 10, color: "#888", margin: "0 0 8px", lineHeight: 1.4 }}>{eng.desc}</p>
              <span style={{ fontSize: 9, color: "#06b6d4", fontFamily: "'Share Tech Mono', monospace" }}>▸ {eng.metric}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CLIENT PORTAL VIEW
   ═══════════════════════════════════════════════════════════════ */
function PortalView() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <div style={{ padding: 24, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.02)" }}>
        <p style={{ fontSize: 11, color: "#888", margin: 0, lineHeight: 1.6 }}>
          The client portal provides a premium private-banking-grade experience. Zero operator language — only outcomes.
          Clients see their portfolio status, approve decisions, track distributions, and download documents.
          All complexity is hidden behind a clean, luxury interface.
        </p>
      </div>

      {/* What clients see */}
      <div>
        <h3 style={{ fontSize: 10, letterSpacing: "0.15em", color: "#666", marginBottom: 16 }}>
          CLIENT EXPERIENCE
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {[
            {
              title: "Velocity Feed",
              desc: "3 card types (amber/teal/gray) showing portfolio activity. Each card has an action: approve, acknowledge, or view details.",
              items: ["Stage advances", "Distribution notices", "Document ready", "Decision required"],
            },
            {
              title: "Decision Queue",
              desc: "Principal Confirmation Gate surfaces 8 action types that require explicit sign-off before execution.",
              items: ["LP communications", "Distribution releases", "Contract execution", "Compliance filings"],
            },
            {
              title: "Portfolio Overview",
              desc: "Clean sector breakdown with venture status. No operational jargon — just outcomes and next milestones.",
              items: ["Sector performance", "Venture health scores", "Next milestones", "Team contacts"],
            },
            {
              title: "Document Vault",
              desc: "Encrypted file access with download tracking. Read receipts confirm when principals view critical documents.",
              items: ["Quarterly reports", "Legal documents", "Meeting briefs", "Financial statements"],
            },
          ].map((section) => (
            <div
              key={section.title}
              style={{
                border: "1px solid rgba(255,255,255,0.1)",
                padding: 20,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 8 }}>{section.title}</div>
              <p style={{ fontSize: 10, color: "#888", margin: "0 0 12px", lineHeight: 1.5 }}>{section.desc}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {section.items.map((item) => (
                  <div key={item} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#555" }} />
                    <span style={{ fontSize: 10, color: "#666" }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Multi-tenant */}
      <div>
        <h3 style={{ fontSize: 10, letterSpacing: "0.15em", color: "#666", marginBottom: 16 }}>
          MULTI-TENANT ARCHITECTURE
        </h3>
        <div style={{ border: "1px solid rgba(255,255,255,0.1)", padding: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 24 }}>
            {[
              { label: "Data Isolation", value: "Row-level security per org" },
              { label: "Custom Branding", value: "Per-tenant portal theming" },
              { label: "Agent Config", value: "Per-client agent toggles & thresholds" },
              { label: "Security Policy", value: "Per-org MFA, session timeout, IP allowlist" },
              { label: "Onboarding", value: "5-step wizard: details → ventures → team → agents → launch" },
              { label: "Reporting", value: "Configurable cadence: weekly/biweekly/monthly/quarterly" },
            ].map((item) => (
              <div key={item.label}>
                <div style={{ fontSize: 10, color: "#666", marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontSize: 11, color: "#ccc" }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tech Stack */}
      <div>
        <h3 style={{ fontSize: 10, letterSpacing: "0.15em", color: "#666", marginBottom: 16 }}>
          TECHNOLOGY STACK
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          {[
            "React 19 + TypeScript",
            "tRPC 11 (type-safe API)",
            "Drizzle ORM + TiDB",
            "Claude / GPT (LLM)",
            "S3 (encrypted storage)",
            "SSE (real-time events)",
            "Resend (transactional email)",
            "WebAuthn (passkeys)",
            "AES-256-GCM (encryption)",
            "Vitest (1,091 tests)",
          ].map((tech) => (
            <div
              key={tech}
              style={{
                padding: "10px 14px",
                border: "1px solid rgba(255,255,255,0.08)",
                fontSize: 10,
                color: "#888",
                fontFamily: "'Share Tech Mono', monospace",
              }}
            >
              {tech}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
