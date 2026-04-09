/**
 * ATLAS — Spy-Ops Landing Page
 * Design: ose-engineering.fr inspired — pure black/white, monospace, military-ops feel
 * Fonts: IBM Plex Mono (body), Bebas Neue (display), Share Tech Mono (data)
 */
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { startSession, logAction } from "@/lib/operatorSession";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";

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
    active: 3,
    ventures: ["North Africa Development", "Oman Luxury Resort", "P430"],
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

/* FIX 10: Added McLean Virginia as 4th coordinate node */
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

/* cipher characters for the decode effect */
const CIPHER_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*!?<>{}[]=/+~^|";
const LINE_LENGTH = 36; // characters per cipher line

/* ACCESS_KEYS removed — authentication now handled by invite-only OAuth */


/* Single-line cipher decode hook — random chars resolve into target text */
function useSingleLineCipher(target: string, startDelay = 0, charDelay = 80) {
  const [display, setDisplay] = useState("");
  const [done, setDone] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), startDelay);
    return () => clearTimeout(t);
  }, [startDelay]);

  useEffect(() => {
    if (!started) return;
    const len = target.length;
    let resolved = 0;
    // Start with full random line
    setDisplay(
      Array.from({ length: len }, () =>
        CIPHER_CHARS[Math.floor(Math.random() * CIPHER_CHARS.length)]
      ).join("")
    );

    // Scramble interval — rapidly change unresolved chars
    const scrambleIv = setInterval(() => {
      setDisplay((prev) => {
        const arr = prev.split("");
        for (let i = resolved; i < len; i++) {
          arr[i] = CIPHER_CHARS[Math.floor(Math.random() * CIPHER_CHARS.length)];
        }
        return arr.join("");
      });
    }, 40);

    // Resolve one letter at a time
    const resolveIv = setInterval(() => {
      if (resolved >= len) {
        clearInterval(resolveIv);
        clearInterval(scrambleIv);
        setDisplay(target);
        setDone(true);
        return;
      }
      resolved++;
      setDisplay((prev) => {
        const arr = prev.split("");
        arr[resolved - 1] = target[resolved - 1];
        return arr.join("");
      });
    }, charDelay);

    return () => {
      clearInterval(scrambleIv);
      clearInterval(resolveIv);
    };
  }, [started, target, charDelay]);

  return { display, done, started };
}

// HERO_READOUTS removed — dynamicReadouts (computed from live DB data) is used instead

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
  const [, navigate] = useLocation();
  // useAuth() skips the auth query on public routes (/ is public).
  // We need to query auth.me directly so we can detect when the user
  // returns from OAuth with a valid session cookie.
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const user = meQuery.data ?? null;
  const isAuthenticated = Boolean(meQuery.data);
  const authLoading = meQuery.isLoading;

  // Fetch real stats for the hero readouts (public queries)
  const venturesQ = trpc.ventures.list.useQuery(undefined, { retry: false, staleTime: 60000 });
  const spvsQ = trpc.spvs.list.useQuery(undefined, { retry: false, staleTime: 60000 });
  const tasksQ = trpc.tasks.list.useQuery(undefined, { retry: false, staleTime: 60000 });

  const realStats = useMemo(() => {
    const ventures = venturesQ.data || [];
    const spvs = spvsQ.data || [];
    const tasks = tasksQ.data || [];
    const completedTasks = tasks.filter(t => t.status === "complete").length;
    const sectors = new Set(ventures.map(v => v.sector)).size;
    return {
      ventures: ventures.length,
      spvs: spvs.length,
      tasksCompleted: completedTasks,
      sectors,
    };
  }, [venturesQ.data, spvsQ.data, tasksQ.data]);

  const dynamicReadouts = useMemo(() => [
    "// SYSTEM STATUS",
    "ATLAS CORE ........ [ONLINE]",
    "SEC LAYER ......... [ACTIVE]",
    `VENTURES TRACKED .. [${String(realStats.ventures).padStart(2, '0')}]`,
    `SPVs ACTIVE ....... [${String(realStats.spvs).padStart(2, '0')}]`,
    `TASKS COMPLETED ... [${realStats.tasksCompleted.toLocaleString()}]`,
    `SECTORS ........... [${String(realStats.sectors).padStart(2, '0')}]`,
  ], [realStats]);

  // SEO: Set document title for the landing page
  useEffect(() => {
    document.title = "ATLAS \u2014 Venture Intelligence Operations Platform";
  }, []);

  /* ─── 4-phase flow: cipher → login → welcome → transition ─── */
  type FlowPhase = "cipher" | "login" | "welcome" | "transition" | "page";
  const [flowPhase, setFlowPhase] = useState<FlowPhase>("cipher");
  const [operatorName, setOperatorName] = useState("");

  /* ─── OAuth error/welcome URL parameter handling ─── */
  const [oauthError, setOauthError] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    const welcome = params.get("welcome");
    const expired = params.get("expired");
    if (expired === "true") {
      toast.info("SESSION EXPIRED — Please sign in again", {
        description: "You were logged out due to inactivity. This is a security measure.",
        duration: 8000,
      });
      window.history.replaceState({}, "", "/");
    }
    if (error) {
      const errorMessages: Record<string, string> = {
        no_invitation: "ACCESS DENIED — NO INVITATION FOUND FOR THIS ACCOUNT",
        blocked: "ACCESS DENIED — YOUR ACCOUNT HAS BEEN BLOCKED",
        suspended: "ACCESS DENIED — YOUR ACCOUNT HAS BEEN SUSPENDED",
        invitation_expired: "ACCESS DENIED — YOUR INVITATION HAS EXPIRED",
      };
      setOauthError(errorMessages[error] || "ACCESS DENIED — AUTHENTICATION FAILED");
      // Clean URL
      window.history.replaceState({}, "", "/");
    }
    if (welcome === "true") {
      // New invited user — skip to welcome then dashboard
      window.history.replaceState({}, "", "/");
    }
  }, []);

  /* ─── If already authenticated, skip login and go to welcome/dashboard ─── */
  useEffect(() => {
    if (authLoading) return;
    if (isAuthenticated && user && flowPhase === "login") {
      const name = user.name || "OPERATOR";
      setOperatorName(name);
      localStorage.setItem("atlas_operator", name);
      startSession(name);
      setFlowPhase("welcome");
    }
  }, [authLoading, isAuthenticated, user, flowPhase]);

  /* Phase 1: ATLAS cipher decode */
  const atlasCipher = useSingleLineCipher("A T L A S", 400, 120);

  /* Ambient random lines behind the cipher */
  const [ambientLines, setAmbientLines] = useState<string[]>([]);
  useEffect(() => {
    if (flowPhase !== "cipher") return;
    const generateLine = () =>
      Array.from({ length: LINE_LENGTH }, () =>
        CIPHER_CHARS[Math.floor(Math.random() * CIPHER_CHARS.length)]
      ).join("");
    // Initialize 14 lines
    setAmbientLines(Array.from({ length: 14 }, generateLine));
    const iv = setInterval(() => {
      setAmbientLines((prev) =>
        prev.map(() => generateLine())
      );
    }, 60);
    return () => clearInterval(iv);
  }, [flowPhase]);

  /* Auto-advance from cipher to login after decode completes */
  useEffect(() => {
    if (flowPhase === "cipher" && atlasCipher.done) {
      const t = setTimeout(() => setFlowPhase("login"), 1200);
      return () => clearTimeout(t);
    }
  }, [flowPhase, atlasCipher.done]);

  /* Check for welcome param on login phase */
  useEffect(() => {
    if (flowPhase === "login") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("welcome") === "true" && isAuthenticated && user) {
        const name = user.name || "OPERATOR";
        setOperatorName(name);
        localStorage.setItem("atlas_operator", name);
        startSession(name);
        setFlowPhase("welcome");
      }
    }
  }, [flowPhase, isAuthenticated, user]);

  /* Phase 3: Welcome cipher decode */
  const welcomeTarget = operatorName ? `WELCOME, ${operatorName.toUpperCase()}` : "";
  const welcomeCipher = useSingleLineCipher(
    welcomeTarget,
    300,
    140
  );

  /* Auto-advance from welcome to transition after decode completes */
  useEffect(() => {
    if (flowPhase === "welcome" && welcomeCipher.done) {
      const t = setTimeout(() => setFlowPhase("transition"), 3000);
      return () => clearTimeout(t);
    }
  }, [flowPhase, welcomeCipher.done]);

  /* Phase 4: Navigate to dashboard immediately */
  useEffect(() => {
    if (flowPhase === "transition") {
      navigate("/dashboard");
    }
  }, [flowPhase, navigate]);

  /* Handle OAuth sign-in */
  const handleSignIn = () => {
    window.location.href = getLoginUrl();
  };

  /* ─── page state (after transition) ─── */
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

  /* ─── scroll tracking (FIX 8: drives nav progress bar) ─── */
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

  /* FIX 16: smooth scroll for nav links — wired to actual section IDs */
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
        scrollBehavior: "smooth",
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

      {/* ═══ FULL-SCREEN FLOW: CIPHER → LOGIN → WELCOME → TRANSITION ═══ */}
      {flowPhase !== "page" && (
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
            overflow: "hidden",
            opacity: 1,
          }}
        >
          {/* ── PHASE 1: CIPHER DECODE ── */}
          {flowPhase === "cipher" && (
            <>
              {/* Ambient random lines */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: 11,
                  lineHeight: 2.2,
                  letterSpacing: "0.3em",
                  color: "rgba(255,255,255,0.06)",
                  pointerEvents: "none",
                  opacity: atlasCipher.done ? 0 : 1,
                  transition: "opacity 0.8s",
                }}
              >
                {ambientLines.map((line, i) => (
                  <div key={i} style={{ whiteSpace: "nowrap" }}>{line}</div>
                ))}
              </div>

              {/* Center: single line cipher resolving to ATLAS */}
              <div
                style={{
                  position: "relative",
                  zIndex: 2,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    fontFamily: "'Share Tech Mono', monospace",
                    fontSize: "clamp(18px, 3vw, 32px)",
                    letterSpacing: "0.5em",
                    color: "#fff",
                    minHeight: 40,
                    textAlign: "center",
                  }}
                >
                  {atlasCipher.display || "\u00A0"}
                  {atlasCipher.started && !atlasCipher.done && (
                    <span className="spyops-blink" style={{ marginLeft: 2 }}>_</span>
                  )}
                </div>

                {/* Subtitle after decode */}
                <div
                  style={{
                    fontFamily: "'Share Tech Mono', monospace",
                    fontSize: 10,
                    letterSpacing: "0.4em",
                    color: "#444",
                    marginTop: 20,
                    opacity: atlasCipher.done ? 1 : 0,
                    transform: atlasCipher.done ? "translateY(0)" : "translateY(8px)",
                    transition: "opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s",
                    textAlign: "center",
                  }}
                >
                  VENTURE INTELLIGENCE OPERATIONS
                </div>
              </div>

              {/* Bottom coordinates */}
              <div
                style={{
                  position: "absolute",
                  bottom: 40,
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: 10,
                  color: "#222",
                  textAlign: "center",
                  opacity: atlasCipher.done ? 1 : 0,
                  transition: "opacity 0.5s ease 0.3s",
                }}
              >
                N 40.712800 // W 074.006000 // EST NEW YORK
              </div>
            </>
          )}

          {/* ── PHASE 2: LOGIN ── */}
          {flowPhase === "login" && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 0,
                animation: "spyops-fadeIn 0.6s ease",
              }}
            >
              {/* ATLAS */}
              <div
                style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: "clamp(28px, 5vw, 48px)",
                  letterSpacing: "0.3em",
                  color: "#fff",
                  marginBottom: 8,
                  textAlign: "center",
                }}
              >
                A T L A S
              </div>

              {/* VENTURE INTELLIGENCE OPERATIONS */}
              <div
                style={{
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: 10,
                  letterSpacing: "0.3em",
                  color: "#555",
                  marginBottom: 48,
                  textAlign: "center",
                }}
              >
                ENGINEERED BY ATLAS
              </div>

              {/* Status indicator */}
              <div
                style={{
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: 10,
                  letterSpacing: "0.2em",
                  color: "#666",
                  marginBottom: 12,
                  textAlign: "center",
                }}
              >
                {authLoading ? "VERIFYING CREDENTIALS..." : "SECURE AUTHENTICATION REQUIRED"}
              </div>

              {/* Divider line */}
              <div
                style={{
                  width: "min(560px, 85vw)",
                  height: 1,
                  background: "#333",
                  marginBottom: 48,
                }}
              />

              {/* Sign-in button */}
              <button
                onClick={handleSignIn}
                disabled={authLoading}
                className="spyops-btn-primary"
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11,
                  letterSpacing: "0.15em",
                  background: authLoading ? "#333" : "#fff",
                  color: authLoading ? "#666" : "#000",
                  border: "none",
                  padding: "14px 40px",
                  cursor: authLoading ? "wait" : "none",
                  transition: "background 0.3s, color 0.3s",
                }}
              >
                {authLoading ? "VERIFYING..." : "SIGN IN ▶"}
              </button>

              {/* OAuth error message */}
              {oauthError && (
                <div
                  style={{
                    fontFamily: "'Share Tech Mono', monospace",
                    fontSize: 11,
                    color: "#ff3333",
                    marginTop: 32,
                    letterSpacing: "0.15em",
                    textAlign: "center",
                    lineHeight: 1.8,
                    padding: "12px 24px",
                    border: "1px solid rgba(255,51,51,0.3)",
                    background: "rgba(255,51,51,0.05)",
                    maxWidth: "min(560px, 85vw)",
                    animation: "spyops-fadeIn 0.5s ease",
                  }}
                >
                  ✖ {oauthError}
                  <div style={{ fontSize: 9, color: "#666", marginTop: 8 }}>
                    CONTACT YOUR ORGANIZATION ADMIN FOR ACCESS
                  </div>
                </div>
              )}

              {/* Demo link */}
              <div
                style={{
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: 10,
                  color: "#444",
                  marginTop: 32,
                  textAlign: "center",
                }}
              >
                <span
                  onClick={() => navigate("/demo")}
                  style={{
                    color: "rgba(34,211,238,0.5)",
                    cursor: "none",
                    borderBottom: "1px solid rgba(34,211,238,0.2)",
                    paddingBottom: 1,
                    transition: "color 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(34,211,238,0.8)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(34,211,238,0.5)")}
                >
                  OR VIEW INVESTOR DEMO
                </span>
              </div>

              {/* Bottom hint */}
              <div
                style={{
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: 10,
                  color: "#333",
                  marginTop: 32,
                  textAlign: "center",
                  lineHeight: 1.8,
                }}
              >
                CLASSIFICATION: CONFIDENTIAL // AUTHORIZED PERSONNEL ONLY
              </div>
            </div>
          )}

          {/* ── PHASE 3: WELCOME ── */}
          {flowPhase === "welcome" && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                animation: "spyops-fadeIn 0.4s ease",
              }}
            >
              <div
                style={{
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: "clamp(16px, 2.5vw, 28px)",
                  letterSpacing: "0.4em",
                  color: "#fff",
                  minHeight: 40,
                  textAlign: "center",
                }}
              >
                {welcomeCipher.display || "\u00A0"}
                {welcomeCipher.started && !welcomeCipher.done && (
                  <span className="spyops-blink" style={{ marginLeft: 2 }}>_</span>
                )}
              </div>
              <div
                style={{
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: 10,
                  letterSpacing: "0.3em",
                  color: "#444",
                  marginTop: 16,
                  opacity: welcomeCipher.done ? 1 : 0,
                  transition: "opacity 0.5s ease 0.2s",
                }}
              >
                INITIALIZING COMMAND CENTER...
              </div>
            </div>
          )}

          {/* ── PHASE 4: TRANSITION (just fading out) ── */}
          {flowPhase === "transition" && (
            <div
              style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: 10,
                letterSpacing: "0.3em",
                color: "#666",
              }}
            >
              LOADING OPERATIONAL DASHBOARD...
            </div>
          )}
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
          borderBottom: "1px solid rgba(255,255,255,0.15)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
        }}
      >
        {/* FIX 8: scroll progress bar overlay */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: `${scrollPct}%`,
            height: 2,
            background: "#fff",
            zIndex: 1,
            transition: "width 0.05s linear",
          }}
        />
        {/* left — FIX 7: blinking underscore cursor */}
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
            ATLAS
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
        {/* right — FIX 16: nav links wired to section IDs */}
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
        {/* FIX 5: giant ATL background — larger, more visible, bleeding off right edge */}
        <div
          className="spyops-drift"
          style={{
            position: "absolute",
            top: "50%",
            right: "-10%",
            transform: "translateY(-50%)",
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: "55vw",
            color: "rgba(255,255,255,0.045)",
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
              {/* ENTER COMMAND CENTER — auth-aware */}
              <button
                onClick={() => isAuthenticated ? navigate("/dashboard") : handleSignIn()}
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
                {isAuthenticated ? "ENTER COMMAND CENTER ▶" : "SIGN IN ▶"}
              </button>
              {/* INVESTOR DEMO — no auth required */}
              <button
                onClick={() => navigate("/demo")}
                className="spyops-btn-secondary"
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11,
                  letterSpacing: "0.15em",
                  background: "transparent",
                  color: "#22d3ee",
                  border: "1px solid rgba(34,211,238,0.4)",
                  padding: "12px 24px",
                  cursor: "none",
                }}
              >
                VIEW DEMO ◉
              </button>
              {/* FIX 15: REQUEST ACCESS scrolls to contact/coordinates */}
              <button
                onClick={() => scrollTo("coordinates")}
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
          {/* FIX 6: right readouts with left border */}
          <div
            className="spyops-hero-readouts"
            style={{
              position: "absolute",
              right: "8%",
              top: "50%",
              transform: "translateY(-50%)",
              borderLeft: "1px solid rgba(255,255,255,0.4)",
              paddingLeft: 16,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {dynamicReadouts.map((line, i) => (
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
        <span>{estNow().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
        <span>{clock} EST</span>
        <span className="spyops-statusbar-center">
          {`SECTORS: ${realStats.sectors} · VENTURES: ${realStats.ventures} · TASKS: ${realStats.tasksCompleted}`}
        </span>
        <span>SYS: NOMINAL</span>
        {/* FIX 17: white blinking ■ SECURE indicator */}
        <span>
          <span className="spyops-blink" style={{ color: "#ffffff" }}>
            ■
          </span>{" "}
          SECURE
        </span>
      </div>

      {/* ═══ SECTION 5 — VENTURE SECTORS ═══ */}
      {/* FIX 1: removed excessive paddingBottom to eliminate blank gap */}
      <Section
        id="sectors"
        style={{ padding: "80px 6vw", paddingBottom: 80 }}
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
      <Section id="methodology" style={{ padding: "80px 6vw", position: "relative", paddingBottom: 80 }}>
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
      {/* FIX 3: removed excessive paddingBottom to eliminate blank gap */}
      <Section
        id="command"
        style={{ padding: "80px 6vw", borderTop: "1px solid #fff", paddingBottom: 80 }}
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
          {/* FIX 2: Officer cards now show name, role, status, and time */}
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
                  fontWeight: 500,
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
      <Section id="pipeline" style={{ padding: "80px 6vw", paddingBottom: 80 }}>
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
        {/* Desktop table */}
        <div className="spyops-table-desktop">
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
              {/* FIX 12: SPV table rows with hover inversion */}
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
        </div>
        {/* FIX 18: Mobile stacked cards for SPV pipeline */}
        <div className="spyops-table-mobile">
          {SPVS.map((s) => (
            <div
              key={s.name}
              style={{
                border: "1px solid rgba(255,255,255,0.2)",
                padding: 16,
                marginBottom: 8,
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 12,
              }}
            >
              <div style={{ fontWeight: 500, marginBottom: 8, color: "#fff" }}>{s.name}</div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: "#666", fontFamily: "'Share Tech Mono', monospace", fontSize: 10 }}>SECTOR</span>
                <span style={{ color: "#888" }}>{s.sector}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: "#666", fontFamily: "'Share Tech Mono', monospace", fontSize: 10 }}>PRIORITY</span>
                <span>{s.pChar} {s.priority}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: "#666", fontFamily: "'Share Tech Mono', monospace", fontSize: 10 }}>STAGE</span>
                <span style={{ color: "#888" }}>{s.stage}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#666", fontFamily: "'Share Tech Mono', monospace", fontSize: 10 }}>STATUS</span>
                <span
                  style={{
                    border: "1px solid #fff",
                    padding: "2px 8px",
                    fontSize: 10,
                    fontFamily: "'Share Tech Mono', monospace",
                    background: s.status === "NEGOTIATING" ? "#fff" : "transparent",
                    color: s.status === "NEGOTIATING" ? "#000" : "#fff",
                  }}
                >
                  [{s.status}]
                </span>
              </div>
            </div>
          ))}
        </div>
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
          paddingBottom: 80,
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
          {/* FIX 9: TypewriterLine with staggered delays for each coordinate */}
          {/* FIX 10: All 4 coordinate nodes rendered */}
          {COORDS.map((c, i) => (
            <div key={c.label} style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, color: "#888" }}>
                <TypewriterLine text={c.label} delay={i * 200} speed={25} />
              </div>
              <div style={{ fontSize: 14, color: "#fff" }}>
                <TypewriterLine
                  text={c.coord}
                  delay={i * 200 + 100}
                  speed={25}
                />
              </div>
              <div style={{ fontSize: 11, color: "#666" }}>
                <TypewriterLine
                  text={c.city}
                  delay={i * 200 + 200}
                  speed={20}
                />
              </div>
            </div>
          ))}
        </div>
        {/* FIX 11: live clock with explicit Bebas Neue font */}
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
            A T L A S
          </div>
        </div>
      </Section>

      {/* ═══ SECTION 10 — FOOTER ═══ */}
      <footer
        id="footer"
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
              ATLAS
              <br />
              POWERED BY AUROVIA
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
            {[
              { label: "Operations", id: "hero" },
              { label: "Sectors", id: "sectors" },
              { label: "Command", id: "command" },
              { label: "Contact", id: "coordinates" },
            ].map((l) => (
              <div
                key={l.label}
                onClick={() => scrollTo(l.id)}
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11,
                  color: "#888",
                  marginBottom: 8,
                  cursor: "none",
                }}
                className="spyops-hover"
              >
                {l.label}
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
              © 2026 ATLAS
              <br />
              POWERED BY AUROVIA LLC
              <br />
              MCLEAN, VIRGINIA
              <br />
              <a href="tel:+15714803261" style={{ color: '#888', textDecoration: 'none' }}>(571) 480-3261</a>
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
          <span>BUILD: ATL-2026.03.15</span>
        </div>
      </footer>

      {/* ═══ STYLES ═══ */}
      <style>{`
        html { scroll-behavior: smooth; }
        .spyops-root * { box-sizing: border-box; }
        .spyops-root ::selection { background: #fff; color: #000; }

        @keyframes spyops-fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes spyops-shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }

        .spyops-root input::placeholder {
          color: #333;
          font-family: 'Share Tech Mono', monospace;
          letter-spacing: 0.08em;
        }

        /* FIX 7: blinking cursor animation */
        @keyframes spyops-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .spyops-blink {
          animation: spyops-blink 1s step-end infinite;
        }

        /* Throbbing underscore — smooth pulse */
        @keyframes spyops-throb {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.15; }
        }
        .spyops-throb {
          animation: spyops-throb 1.2s ease-in-out infinite;
        }

        @keyframes spyops-drift {
          0% { transform: translateY(-50%) translateX(0); }
          100% { transform: translateY(-50%) translateX(-30px); }
        }
        .spyops-drift {
          animation: spyops-drift 20s linear infinite alternate;
        }

        /* FIX 13: nav links instant hover — no transition */
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

        /* FIX 13: sector card instant hover inversion — no transition */
        .spyops-sector-card {
          border: 1px solid #fff;
          padding: 28px;
          background: #000;
          color: #fff;
          position: relative;
          cursor: none;
          transition: none !important;
        }
        .spyops-sector-card:hover {
          background: #fff !important;
          color: #000 !important;
          transition: none !important;
        }
        .spyops-sector-card:hover .spyops-sector-btn {
          border-color: #000 !important;
          color: #000 !important;
        }

        /* FIX 12: SPV table row instant hover inversion */
        .spyops-table-row {
          cursor: none;
          transition: none !important;
        }
        .spyops-table-row:hover td {
          background: #fff !important;
          color: #000 !important;
          transition: none !important;
        }
        .spyops-table-row:hover td span {
          border-color: #000 !important;
          color: #000 !important;
          background: transparent !important;
        }

        .spyops-hover:hover {
          color: #fff !important;
        }

        /* FIX 18: Mobile table toggle */
        .spyops-table-mobile { display: none; }
        .spyops-table-desktop { display: block; }

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
          /* FIX 18: sector cards stack on mobile */
          .spyops-sector-card {
            min-width: 0 !important;
          }
          /* FIX 18: SPV table converts to stacked cards on mobile */
          .spyops-table-desktop { display: none !important; }
          .spyops-table-mobile { display: block !important; }
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
