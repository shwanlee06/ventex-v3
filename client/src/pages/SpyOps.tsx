/**
 * ATLAS × ROYALTON INVESTMENTS — Spy-Ops Landing Page
 * Design: ose-engineering.fr inspired — pure black/white, monospace, military-ops feel
 * Fonts: IBM Plex Mono (body), Bebas Neue (display), Share Tech Mono (data)
 */
import { useEffect, useRef, useState, useCallback } from "react";

/* ─── helpers ─── */
function estNow() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
  );
}
function fmtClock(d: Date) {
  return d.toLocaleTimeString("en-US", {
    timeZone: "America/New_York",
    hour12: false,
  });
}
function isOnDuty(d: Date) {
  const day = d.getDay();
  const h = d.getHours();
  return day >= 1 && day <= 5 && h >= 9 && h < 18;
}

/* ─── data ─── */
const SECTORS = [
  {
    icon: "≋",
    name: "REAL ESTATE",
    count: 7,
    active: 7,
    ventures: ["Nammos Barcelona", "Nammos Lagonissi", "Muscat Bay"],
  },
  {
    icon: "⚓",
    name: "YACHT",
    count: 3,
    active: 3,
    ventures: ["Mar-a-Lago Yacht Club", "Azzam Yacht", "JV Yacht Nammos"],
  },
  {
    icon: "⌂",
    name: "HOSPITALITY",
    count: 3,
    active: 3,
    ventures: ["Berbara Lebanon", "Nammos Ibiza", "Nammos Lebanon"],
  },
  {
    icon: "◈",
    name: "ENTERTAINMENT",
    count: 3,
    active: 3,
    ventures: ["Berlin Malaysia", "KTL Dubai Casino", "Casino Malaysia"],
  },
  {
    icon: "⚡",
    name: "OTHERS",
    count: 4,
    active: 4,
    ventures: ["Kazzafi Daughter", "Shady Project", "P430"],
  },
];

const STEPS = [
  {
    num: "01",
    name: "OPERATIONAL DISCOVERY",
    desc: "Map every manual process across all venture verticals",
  },
  {
    num: "02",
    name: "AGENT CONFIGURATION",
    desc: "Deploy AI agents trained on your specific vertical workflows",
  },
  {
    num: "03",
    name: "TASK AUTOMATION",
    desc: "Agents handle vendor follow-ups, compliance, reporting autonomously",
  },
  {
    num: "04",
    name: "HUMAN APPROVAL",
    desc: "All destructive or sensitive actions require explicit principal sign-off",
  },
  {
    num: "05",
    name: "KPI MEASUREMENT",
    desc: "Track tasks eliminated, hours reclaimed, errors prevented weekly",
  },
];

const OFFICERS = [
  { name: "Jimmy Frangi", role: "Founder / Finance & Capital" },
  { name: "Anton Maghami", role: "VP Operations & Systems" },
  { name: "Jon Eichner", role: "COO / Operations" },
  { name: "Maher Abou Chakra", role: "Accounting / Finance" },
  { name: "Angie Samadi", role: "HR / People Operations" },
];

const SPVS = [
  {
    name: "Venezuela Mining Rights",
    sector: "Oil & Gas",
    priority: "HIGH",
    pChar: "◉",
    stage: "Active deal",
    status: "ACTIVE",
  },
  {
    name: "Azzam – Yacht",
    sector: "Yacht",
    priority: "MED",
    pChar: "◎",
    stage: "Active deal",
    status: "ACTIVE",
  },
  {
    name: "Crude Oil Deal",
    sector: "Oil & Gas",
    priority: "MED",
    pChar: "◎",
    stage: "In negotiation",
    status: "NEGOTIATING",
  },
  {
    name: "Shipping Deal",
    sector: "Others",
    priority: "LOW",
    pChar: "○",
    stage: "Active deal",
    status: "ACTIVE",
  },
  {
    name: "Chakra Yacht – Brokerage",
    sector: "Yacht",
    priority: "LOW",
    pChar: "○",
    stage: "Active deal",
    status: "ACTIVE",
  },
];

const COORDS = [
  {
    label: "PRIMARY HQ",
    coord: "N 40.712800 · W 074.006000",
    city: "NEW YORK, NEW YORK — EST UTC-5",
  },
  {
    label: "SECONDARY NODE",
    coord: "N 33.888630 · E 035.495480",
    city: "BEIRUT, LEBANON — AST UTC+3",
  },
  {
    label: "TERTIARY NODE",
    coord: "N 23.424076 · E 053.847818",
    city: "ABU DHABI, UAE — GST UTC+4",
  },
  {
    label: "OPERATIONAL GRID",
    coord: "N 38.907192 · W 077.036871",
    city: "MCLEAN, VIRGINIA — EST UTC-5",
  },
];

const LOADER_MSGS = [
  "INITIALIZING SECURE CHANNEL_",
  "AUTHENTICATING OPERATOR_",
  "LOADING ASSET REGISTRY_",
  "ACCESS GRANTED_",
];

const HERO_READOUTS = [
  "// SYSTEM STATUS",
  "ATLAS CORE ........ [ONLINE]",
  "SEC LAYER ......... [ACTIVE]",
  "AGENT NODES ....... [247]",
  "VENTURES TRACKED .. [20]",
  "SPVs ACTIVE ....... [06]",
  "TASKS AUTOMATED ... [2,847]",
  "HRS RECLAIMED ..... [061]",
];

/* ─── Typewriter hook ─── */
function useTypewriter(text: string, speed = 30, trigger = true) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    if (!trigger) {
      setDisplayed("");
      return;
    }
    let i = 0;
    setDisplayed("");
    const iv = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(iv);
    }, speed);
    return () => clearInterval(iv);
  }, [text, speed, trigger]);
  return displayed;
}

/* ─── IntersectionObserver hook ─── */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

/* ─── TypewriterLine component ─── */
function TypewriterLine({
  text,
  delay = 0,
  speed = 30,
}: {
  text: string;
  delay?: number;
  speed?: number;
}) {
  const { ref, inView } = useInView(0.1);
  const [started, setStarted] = useState(false);
  useEffect(() => {
    if (!inView) return;
    const t = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(t);
  }, [inView, delay]);
  const displayed = useTypewriter(text, speed, started);
  return (
    <span ref={ref} style={{ fontFamily: "'Share Tech Mono', monospace" }}>
      {displayed}
      {started && displayed.length < text.length && (
        <span className="spyops-blink">_</span>
      )}
    </span>
  );
}

/* ─── Section wrapper with reveal ─── */
function Section({
  children,
  id,
  className = "",
  style,
}: {
  children: React.ReactNode;
  id?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { ref, inView } = useInView(0.08);
  return (
    <section
      ref={ref}
      id={id}
      className={className}
      style={{
        ...style,
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(30px)",
        transition: "opacity 0.6s ease, transform 0.6s ease",
      }}
    >
      {children}
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function SpyOps() {
  /* ─── state ─── */
  const [loading, setLoading] = useState(true);
  const [loaderStep, setLoaderStep] = useState(0); // 0-4
  const [loaderMsg, setLoaderMsg] = useState(0);
  const [loaderBar, setLoaderBar] = useState(0);
  const [clock, setClock] = useState(fmtClock(estNow()));
  const [scrollY, setScrollY] = useState(0);
  const [scrollPct, setScrollPct] = useState(0);
  const [duty, setDuty] = useState(isOnDuty(estNow()));
  const [officerTime, setOfficerTime] = useState(fmtClock(estNow()));

  /* cursor */
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
  const [ringPos, setRingPos] = useState({ x: -100, y: -100 });
  const [cursorHover, setCursorHover] = useState(false);
  const ringRef = useRef({ x: -100, y: -100 });

  /* ─── loader sequence ─── */
  useEffect(() => {
    const t1 = setTimeout(() => setLoaderStep(1), 300);
    const t2 = setTimeout(() => setLoaderStep(2), 900);
    const t3 = setTimeout(() => setLoaderStep(3), 1100);
    const t4 = setTimeout(() => setLoaderStep(4), 1600);
    // progress bar: 1600ms start, 1800ms duration
    let barStart: number;
    let barFrame: number;
    const t5 = setTimeout(() => {
      barStart = performance.now();
      const animate = (now: number) => {
        const pct = Math.min(1, (now - barStart) / 1800);
        setLoaderBar(pct * 100);
        if (pct < 1) barFrame = requestAnimationFrame(animate);
      };
      barFrame = requestAnimationFrame(animate);
    }, 1600);
    const t6 = setTimeout(() => setLoading(false), 3500);
    return () => {
      [t1, t2, t3, t4, t5, t6].forEach(clearTimeout);
      if (barFrame) cancelAnimationFrame(barFrame);
    };
  }, []);

  /* loader message cycling */
  useEffect(() => {
    if (loaderStep < 4) return;
    let i = 0;
    const iv = setInterval(() => {
      i++;
      if (i < LOADER_MSGS.length) setLoaderMsg(i);
      else clearInterval(iv);
    }, 600);
    return () => clearInterval(iv);
  }, [loaderStep]);

  /* ─── live clock ─── */
  useEffect(() => {
    const iv = setInterval(() => {
      const now = estNow();
      setClock(fmtClock(now));
      setOfficerTime(fmtClock(now));
      setDuty(isOnDuty(now));
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  /* ─── scroll tracking ─── */
  useEffect(() => {
    const handler = () => {
      setScrollY(Math.round(window.scrollY));
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      setScrollPct(docH > 0 ? (window.scrollY / docH) * 100 : 0);
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  /* ─── custom cursor ─── */
  const handleMouseMove = useCallback((e: MouseEvent) => {
    setCursorPos({ x: e.clientX, y: e.clientY });
    ringRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    // ring follows with lag
    const iv = setInterval(() => {
      setRingPos((prev) => ({
        x: prev.x + (ringRef.current.x - prev.x) * 0.15,
        y: prev.y + (ringRef.current.y - prev.y) * 0.15,
      }));
    }, 16);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      clearInterval(iv);
    };
  }, [handleMouseMove]);

  /* hover detection for interactive elements */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      const interactive =
        t.closest("a") ||
        t.closest("button") ||
        t.closest("[role='button']") ||
        t.closest(".spyops-hover");
      setCursorHover(!!interactive);
    };
    window.addEventListener("mouseover", handler);
    return () => window.removeEventListener("mouseover", handler);
  }, []);

  /* smooth scroll for nav links */
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  /* ─── RENDER ─── */
  return (
    <div
      className="spyops-root"
      style={{
        background: "#000",
        color: "#fff",
        fontFamily: "'IBM Plex Mono', monospace",
        cursor: "none",
        minHeight: "100vh",
        overflowX: "hidden",
      }}
    >
      {/* ─── CUSTOM CURSOR ─── */}
      <div
        className="spyops-cursor-inner"
        style={{
          position: "fixed",
          left: cursorPos.x - (cursorHover ? 8 : 6),
          top: cursorPos.y - (cursorHover ? 8 : 6),
          width: cursorHover ? 16 : 12,
          height: cursorHover ? 16 : 12,
          border: "1px solid #fff",
          background: cursorHover ? "rgba(255,255,255,0.2)" : "transparent",
          pointerEvents: "none",
          zIndex: 99999,
          transition: "width 0.1s, height 0.1s, background 0.1s",
        }}
      />
      <div
        className="spyops-cursor-outer"
        style={{
          position: "fixed",
          left: ringPos.x - 18,
          top: ringPos.y - 18,
          width: 36,
          height: 36,
          border: "1px solid rgba(255,255,255,0.3)",
          pointerEvents: "none",
          zIndex: 99998,
        }}
      />

      {/* ═══ SECTION 1 — LOADING SCREEN ═══ */}
      {loading && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "#000",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            cursor: "none",
          }}
        >
          <div
            style={{
              opacity: loaderStep >= 1 ? 1 : 0,
              transition: "opacity 0.5s",
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: "clamp(36px, 6vw, 60px)",
              letterSpacing: "0.3em",
              color: "#fff",
              textAlign: "center",
            }}
          >
            ROYALTON INVESTMENTS
          </div>
          <div
            style={{
              opacity: loaderStep >= 2 ? 1 : 0,
              transition: "opacity 0.5s",
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: 11,
              color: "#555",
              letterSpacing: "0.3em",
              marginTop: 16,
              textAlign: "center",
            }}
          >
            ENGINEERED BY
          </div>
          <div
            style={{
              opacity: loaderStep >= 3 ? 1 : 0,
              transition: "opacity 0.5s",
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: 13,
              color: "#888",
              letterSpacing: "0.5em",
              marginTop: 8,
              textAlign: "center",
            }}
          >
            ATLAS
          </div>
          {/* progress bar */}
          <div
            style={{
              marginTop: 32,
              width: 280,
              height: 1,
              background: "#222",
              opacity: loaderStep >= 4 ? 1 : 0,
              transition: "opacity 0.3s",
            }}
          >
            <div
              style={{
                width: `${loaderBar}%`,
                height: "100%",
                background: "#fff",
              }}
            />
          </div>
          {/* status text */}
          <div
            style={{
              marginTop: 12,
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: 10,
              color: "#555",
              opacity: loaderStep >= 4 ? 1 : 0,
              transition: "opacity 0.3s",
              textAlign: "center",
            }}
          >
            {LOADER_MSGS[loaderMsg]}
          </div>
          {/* coordinates */}
          <div
            style={{
              position: "absolute",
              bottom: 40,
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: 10,
              color: "#444",
              textAlign: "center",
            }}
          >
            N 40.712800 // W 074.006000 // EST NEW YORK
          </div>
        </div>
      )}

      {/* ═══ SECTION 2 — FIXED NAVIGATION BAR ═══ */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 52,
          background: "#000",
          borderBottom: "1px solid #fff",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
        }}
      >
        {/* scroll progress overlay */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: `${scrollPct}%`,
            height: 1,
            background: "#fff",
            zIndex: 1,
          }}
        />
        {/* left */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 18,
              fontWeight: 500,
              color: "#fff",
            }}
          >
            ATL<span className="spyops-blink">_</span>
          </span>
          <span
            style={{
              width: 1,
              height: 20,
              background: "#fff",
              display: "inline-block",
            }}
          />
          <span
            style={{
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: 10,
              color: "#888",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
          >
            ROYALTON INVESTMENTS
          </span>
        </div>
        {/* center */}
        <div
          className="spyops-nav-center"
          style={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: 10,
            color: "#666",
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          OPERATIONAL INTELLIGENCE. VENTURE COMMAND.
        </div>
        {/* right */}
        <div style={{ display: "flex", gap: 4 }}>
          {[
            { label: "OPERATIONS", id: "hero" },
            { label: "SECTORS", id: "sectors" },
            { label: "COMMAND", id: "command" },
            { label: "CONTACT", id: "coordinates" },
          ].map((l) => (
            <button
              key={l.id}
              onClick={() => scrollTo(l.id)}
              className="spyops-nav-link"
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "#fff",
                background: "transparent",
                border: "none",
                padding: "6px 10px",
                cursor: "none",
              }}
            >
              [{l.label}]
            </button>
          ))}
        </div>
      </nav>

      {/* ═══ SECTION 3 — HERO ═══ */}
      <section
        id="hero"
        style={{
          minHeight: "100vh",
          position: "relative",
          overflow: "hidden",
          paddingTop: 52,
        }}
      >
        {/* giant ATL background */}
        <div
          className="spyops-drift"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: "40vw",
            color: "rgba(255,255,255,0.03)",
            lineHeight: 1,
            pointerEvents: "none",
            userSelect: "none",
            whiteSpace: "nowrap",
          }}
        >
          ATL
        </div>
        {/* grid overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
            backgroundSize: "100px 100px",
            pointerEvents: "none",
          }}
        />
        {/* foreground content */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            minHeight: "calc(100vh - 52px)",
            padding: "0 6vw",
          }}
        >
          <div style={{ maxWidth: 700 }}>
            <div
              style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: 10,
                color: "#666",
                letterSpacing: "0.2em",
                marginBottom: 24,
              }}
            >
              // MISSION BRIEF — REF: ATL-2026-001
            </div>
            <h1
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: "clamp(72px, 12vw, 180px)",
                letterSpacing: "0.05em",
                lineHeight: 0.9,
                margin: 0,
                color: "#fff",
              }}
            >
              VENTURE
              <br />
              INTELLIGENCE
              <br />
              OPERATIONS
            </h1>
            <div
              style={{
                width: 120,
                height: 1,
                background: "#fff",
                marginTop: 32,
              }}
            />
            <p
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 13,
                color: "rgba(255,255,255,0.7)",
                maxWidth: 480,
                lineHeight: 1.8,
                marginTop: 24,
              }}
            >
              AI-powered venture task automation for UHNWI holding companies.
              Real-time operational intelligence across every sector. One command
              center. Zero drag.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 32, flexWrap: "wrap" }}>
              <button
                className="spyops-btn-primary"
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11,
                  letterSpacing: "0.15em",
                  background: "#fff",
                  color: "#000",
                  border: "none",
                  padding: "12px 24px",
                  cursor: "none",
                }}
              >
                ENTER COMMAND CENTER ▶
              </button>
              <button
                className="spyops-btn-secondary"
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11,
                  letterSpacing: "0.15em",
                  background: "transparent",
                  color: "#fff",
                  border: "1px solid #fff",
                  padding: "12px 24px",
                  cursor: "none",
                }}
              >
                REQUEST ACCESS +
              </button>
            </div>
          </div>
          {/* right readouts */}
          <div
            className="spyops-hero-readouts"
            style={{
              position: "absolute",
              right: "8%",
              top: "50%",
              transform: "translateY(-50%)",
              borderLeft: "1px solid #fff",
              paddingLeft: 16,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {HERO_READOUTS.map((line, i) => (
              <div
                key={i}
                style={{
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: 10,
                  color: i === 0 ? "#666" : "#fff",
                  textAlign: "right",
                }}
              >
                <TypewriterLine text={line} delay={i * 100} speed={20} />
              </div>
            ))}
          </div>
        </div>
        {/* bottom right */}
        <div
          style={{
            position: "absolute",
            bottom: 24,
            right: 24,
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: 10,
            color: "#666",
          }}
        >
          <span className="spyops-blink">[SCROLL TO INITIALIZE ↓]</span>
        </div>
        {/* bottom left */}
        <div
          style={{
            position: "absolute",
            bottom: 24,
            left: 24,
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: 10,
            color: "#666",
          }}
        >
          N 40.712800 · W 074.006000
        </div>
      </section>

      {/* ═══ SECTION 4 — GLOBAL STATUS BAR ═══ */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: 28,
          background: "#000",
          borderTop: "1px solid #fff",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: 10,
          color: "#666",
        }}
      >
        <span>14/03/2026</span>
        <span>{clock} EST</span>
        <span className="spyops-statusbar-center">
          LOAD: 0.12s · WEIGHT: 0.08MB · SECTOR: 5 · VENTURES: 20
        </span>
        <span>Y: {scrollY}PX</span>
        <span>
          <span className="spyops-blink" style={{ color: "#fff" }}>
            ■
          </span>{" "}
          SECURE
        </span>
      </div>

      {/* ═══ SECTION 5 — VENTURE SECTORS ═══ */}
      <Section
        id="sectors"
        style={{ padding: "80px 6vw", paddingBottom: 108 }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 40,
          }}
        >
          <span
            style={{
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: 10,
              color: "#666",
              letterSpacing: "0.2em",
            }}
          >
            // SECTOR REGISTRY — 05 ACTIVE
          </span>
          <button
            className="spyops-nav-link"
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10,
              color: "#fff",
              background: "transparent",
              border: "none",
              letterSpacing: "0.15em",
              cursor: "none",
            }}
          >
            [VIEW ALL VENTURES +]
          </button>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 0,
          }}
        >
          {SECTORS.map((s) => (
            <div key={s.name} className="spyops-sector-card">
              <div
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  fontSize: 12,
                  opacity: 0.4,
                }}
              >
                +
              </div>
              <div style={{ fontSize: 24, marginBottom: 12 }}>{s.icon}</div>
              <div
                style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 32,
                  letterSpacing: "0.1em",
                  marginBottom: 12,
                }}
              >
                {s.name}_
              </div>
              <div
                style={{
                  width: "100%",
                  height: 1,
                  background: "currentColor",
                  opacity: 0.3,
                  marginBottom: 12,
                }}
              />
              <div
                style={{
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: 11,
                  opacity: 0.6,
                  marginBottom: 12,
                }}
              >
                {String(s.count).padStart(2, "0")} VENTURES ·{" "}
                {String(s.active).padStart(2, "0")} ACTIVE
              </div>
              {s.ventures.map((v) => (
                <div
                  key={v}
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 12,
                    opacity: 0.6,
                    marginBottom: 4,
                  }}
                >
                  → {v}
                </div>
              ))}
              <button
                className="spyops-sector-btn"
                style={{
                  marginTop: 16,
                  width: "100%",
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 10,
                  border: "1px solid currentColor",
                  background: "transparent",
                  color: "inherit",
                  padding: "8px 0",
                  cursor: "none",
                  letterSpacing: "0.15em",
                }}
              >
                [EXPLORE SECTOR +]
              </button>
            </div>
          ))}
        </div>
      </Section>

      {/* ═══ SECTION 6 — METHODOLOGY ═══ */}
      <Section id="methodology" style={{ padding: "80px 6vw", position: "relative", paddingBottom: 108 }}>
        {/* faint background number */}
        <div
          style={{
            position: "absolute",
            top: 40,
            right: 40,
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: "20vw",
            color: "rgba(255,255,255,0.03)",
            lineHeight: 1,
            pointerEvents: "none",
          }}
        >
          05
        </div>
        <div
          className="spyops-method-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "40% 55%",
            gap: "5%",
            position: "relative",
            zIndex: 2,
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: "clamp(48px, 6vw, 80px)",
                lineHeight: 1,
                margin: 0,
                letterSpacing: "0.05em",
              }}
            >
              A STRUCTURED
              <br />
              AND PROVEN
              <br />
              METHOD_
            </h2>
            <p
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 13,
                color: "rgba(255,255,255,0.7)",
                lineHeight: 1.8,
                marginTop: 24,
              }}
            >
              Built for holding companies operating across multiple venture
              verticals. ATLAS eliminates the operational drag that costs
              principals 30–40 hours per week.
            </p>
          </div>
          <div>
            {STEPS.map((s, i) => (
              <div
                key={s.num}
                style={{
                  borderBottom:
                    i < STEPS.length - 1 ? "1px solid #fff" : "none",
                  padding: "20px 0",
                }}
              >
                <div
                  style={{
                    fontFamily: "'Share Tech Mono', monospace",
                    fontSize: 10,
                    color: "#666",
                    marginBottom: 6,
                  }}
                >
                  {s.num}
                </div>
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 14,
                    color: "#fff",
                    fontWeight: 500,
                    marginBottom: 4,
                  }}
                >
                  {s.name}
                </div>
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 11,
                    color: "#888",
                  }}
                >
                  {s.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══ SECTION 7 — OFFICER HOURS ═══ */}
      <Section
        id="command"
        style={{ padding: "80px 6vw", borderTop: "1px solid #fff", paddingBottom: 108 }}
      >
        <div
          style={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: 10,
            color: "#666",
            letterSpacing: "0.2em",
            marginBottom: 16,
          }}
        >
          // OFFICER HOURS — EASTERN STANDARD TIME
        </div>
        <div
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: "clamp(48px, 8vw, 80px)",
            textAlign: "center",
            marginBottom: 40,
            letterSpacing: "0.1em",
          }}
        >
          COMMAND CENTER
        </div>
        <div
          className="spyops-officers-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 0,
          }}
        >
          {OFFICERS.map((o) => (
            <div
              key={o.name}
              style={{
                border: "1px solid #fff",
                padding: 20,
                background: "#000",
              }}
            >
              <div
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 13,
                  color: "#fff",
                  marginBottom: 4,
                }}
              >
                {o.name}
              </div>
              <div
                style={{
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: 10,
                  color: "#888",
                  marginBottom: 12,
                }}
              >
                {o.role}
              </div>
              <div
                style={{
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: 11,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {duty ? (
                  <>
                    <span className="spyops-blink" style={{ color: "#fff" }}>
                      ■
                    </span>
                    <span style={{ color: "#fff" }}>ON DUTY</span>
                  </>
                ) : (
                  <>
                    <span style={{ color: "#555" }}>□</span>
                    <span style={{ color: "#555" }}>OFF DUTY</span>
                  </>
                )}
              </div>
              <div
                style={{
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: 10,
                  color: "#666",
                  marginTop: 8,
                }}
              >
                {officerTime} EST
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ═══ SECTION 8 — SPV PIPELINE ═══ */}
      <Section id="pipeline" style={{ padding: "80px 6vw", paddingBottom: 108 }}>
        <div
          style={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: 10,
            color: "#666",
            letterSpacing: "0.2em",
            marginBottom: 32,
          }}
        >
          // ACTIVE DEAL PIPELINE
        </div>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 12,
          }}
        >
          <thead>
            <tr>
              {["SPV NAME", "SECTOR", "PRIORITY", "STAGE", "STATUS"].map(
                (h) => (
                  <th
                    key={h}
                    style={{
                      fontFamily: "'Share Tech Mono', monospace",
                      fontSize: 10,
                      color: "#666",
                      textTransform: "uppercase",
                      textAlign: "left",
                      padding: "12px 16px",
                      borderBottom: "1px solid #fff",
                      borderTop: "1px solid #fff",
                      fontWeight: 400,
                      letterSpacing: "0.1em",
                    }}
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {SPVS.map((s) => (
              <tr key={s.name} className="spyops-table-row">
                <td
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid rgba(255,255,255,0.15)",
                  }}
                >
                  {s.name}
                </td>
                <td
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid rgba(255,255,255,0.15)",
                    color: "#888",
                  }}
                >
                  {s.sector}
                </td>
                <td
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid rgba(255,255,255,0.15)",
                    color:
                      s.priority === "HIGH"
                        ? "#fff"
                        : s.priority === "MED"
                        ? "#888"
                        : "#555",
                  }}
                >
                  {s.pChar} {s.priority}
                </td>
                <td
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid rgba(255,255,255,0.15)",
                    color: "#888",
                  }}
                >
                  {s.stage}
                </td>
                <td
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid rgba(255,255,255,0.15)",
                  }}
                >
                  <span
                    style={{
                      border: "1px solid #fff",
                      padding: "2px 8px",
                      fontSize: 10,
                      fontFamily: "'Share Tech Mono', monospace",
                      background:
                        s.status === "NEGOTIATING" ? "#fff" : "transparent",
                      color: s.status === "NEGOTIATING" ? "#000" : "#fff",
                    }}
                  >
                    [{s.status}]
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* ═══ SECTION 9 — CLASSIFIED COORDINATES ═══ */}
      <Section
        id="coordinates"
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px 6vw",
          paddingBottom: 108,
        }}
      >
        <div
          style={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: 10,
            color: "#666",
            letterSpacing: "0.2em",
            marginBottom: 40,
          }}
        >
          // TERMINAL COORDINATES — CLASSIFIED
        </div>
        <div
          style={{
            textAlign: "center",
            lineHeight: 2.2,
            fontFamily: "'Share Tech Mono', monospace",
          }}
        >
          {COORDS.map((c, i) => (
            <div key={c.label} style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, color: "#888" }}>
                <TypewriterLine text={c.label} delay={i * 600} speed={40} />
              </div>
              <div style={{ fontSize: 14, color: "#fff" }}>
                <TypewriterLine
                  text={c.coord}
                  delay={i * 600 + 200}
                  speed={25}
                />
              </div>
              <div style={{ fontSize: 11, color: "#666" }}>
                <TypewriterLine
                  text={c.city}
                  delay={i * 600 + 400}
                  speed={20}
                />
              </div>
            </div>
          ))}
        </div>
        {/* live clock */}
        <div
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: "clamp(60px, 10vw, 120px)",
            color: "#fff",
            marginTop: 40,
          }}
        >
          {clock}
        </div>
        <div
          style={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: 11,
            color: "#666",
            marginTop: 8,
          }}
        >
          EASTERN STANDARD TIME · NEW YORK
        </div>
        {/* bottom rule */}
        <div
          style={{
            width: "100%",
            marginTop: 60,
            borderTop: "1px solid #fff",
            paddingTop: 20,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 18,
              color: "#fff",
              letterSpacing: "0.4em",
            }}
          >
            ROYALTON INVESTMENTS × ATLAS
          </div>
        </div>
      </Section>

      {/* ═══ SECTION 10 — FOOTER ═══ */}
      <footer
        style={{
          borderTop: "1px solid #fff",
          padding: "40px 6vw",
          paddingBottom: 68,
        }}
      >
        <div
          className="spyops-footer-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 32,
          }}
        >
          {/* col 1 */}
          <div>
            <div
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 18,
                fontWeight: 500,
                marginBottom: 8,
              }}
            >
              ATL_
            </div>
            <div
              style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: 10,
                color: "#888",
                lineHeight: 2,
              }}
            >
              ROYALTON INVESTMENTS
              <br />
              ENGINEERED BY ATLAS
            </div>
          </div>
          {/* col 2 */}
          <div>
            <div
              style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: 10,
                color: "#666",
                marginBottom: 12,
                letterSpacing: "0.2em",
              }}
            >
              NAVIGATION
            </div>
            {["Operations", "Sectors", "Command", "Contact"].map((l) => (
              <div
                key={l}
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11,
                  color: "#888",
                  marginBottom: 8,
                  cursor: "none",
                }}
              >
                {l}
              </div>
            ))}
          </div>
          {/* col 3 */}
          <div>
            <div
              style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: 10,
                color: "#666",
                marginBottom: 12,
                letterSpacing: "0.2em",
              }}
            >
              SYSTEM STATUS
            </div>
            <div
              style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: 11,
                color: "#888",
                lineHeight: 2,
              }}
            >
              ATLAS CORE: [ONLINE]
              <br />
              ENCRYPTION: [AES-256]
              <br />
              SOC 2: [IN PROGRESS]
            </div>
          </div>
          {/* col 4 */}
          <div>
            <div
              style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: 10,
                color: "#888",
                lineHeight: 2,
              }}
            >
              © 2026 ROYALTON INVESTMENTS
              <br />
              POWERED BY ATLAS / AUROVIA LLC
              <br />
              MCLEAN, VIRGINIA
            </div>
          </div>
        </div>
        {/* bottom bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 32,
            paddingTop: 16,
            borderTop: "1px solid rgba(255,255,255,0.15)",
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: 10,
            color: "#555",
          }}
        >
          <span>CLASSIFICATION: CONFIDENTIAL</span>
          <span>BUILD: ATL-2026.03.14</span>
        </div>
      </footer>

      {/* ═══ STYLES ═══ */}
      <style>{`
        .spyops-root * { box-sizing: border-box; }
        .spyops-root ::selection { background: #fff; color: #000; }

        @keyframes spyops-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .spyops-blink {
          animation: spyops-blink 1.2s step-end infinite;
        }

        @keyframes spyops-drift {
          0% { transform: translate(-50%, -50%) translateY(0); }
          100% { transform: translate(-50%, -50%) translateY(-30px); }
        }
        .spyops-drift {
          animation: spyops-drift 20s linear infinite alternate;
        }

        .spyops-nav-link:hover {
          background: #fff !important;
          color: #000 !important;
          transition: none !important;
        }

        .spyops-btn-primary:hover {
          background: #000 !important;
          color: #fff !important;
          outline: 1px solid #fff;
          transition: none !important;
        }
        .spyops-btn-secondary:hover {
          background: #fff !important;
          color: #000 !important;
          transition: none !important;
        }

        .spyops-sector-card {
          border: 1px solid #fff;
          padding: 28px;
          background: #000;
          color: #fff;
          position: relative;
          cursor: none;
        }
        .spyops-sector-card:hover {
          background: #fff !important;
          color: #000 !important;
        }
        .spyops-sector-card:hover .spyops-sector-btn {
          border-color: #000 !important;
          color: #000 !important;
        }

        .spyops-table-row {
          cursor: none;
        }
        .spyops-table-row:hover td {
          background: #fff !important;
          color: #000 !important;
        }
        .spyops-table-row:hover td span {
          border-color: #000 !important;
          color: #000 !important;
          background: transparent !important;
        }

        /* responsive */
        @media (max-width: 768px) {
          .spyops-nav-center { display: none !important; }
          .spyops-hero-readouts { display: none !important; }
          .spyops-method-grid {
            grid-template-columns: 1fr !important;
            gap: 40px !important;
          }
          .spyops-footer-grid {
            grid-template-columns: 1fr 1fr !important;
          }
          .spyops-statusbar-center { display: none !important; }
          .spyops-officers-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 480px) {
          .spyops-footer-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
