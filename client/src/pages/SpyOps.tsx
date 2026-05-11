/**
 * VENTEX — Spy-Ops Landing Page
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
    name: "Dubai Marina Development",
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
  // We need to query auth.me directly so we can detect when the user
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
    // Fallback to representative values when queries fail (unauthenticated visitors)
    const hasData = ventures.length > 0 || spvs.length > 0;
    return {
      ventures: hasData ? ventures.length : 54,
      spvs: hasData ? spvs.length : 12,
      tasksCompleted: hasData ? completedTasks : 847,
      sectors: hasData ? sectors : 6,
    };
  }, [venturesQ.data, spvsQ.data, tasksQ.data]);

  const dynamicReadouts = useMemo(() => [
    "// SYSTEM STATUS",
    "VENTEX CORE ........ [ONLINE]",
    "SEC LAYER ......... [ACTIVE]",
    `VENTURES TRACKED .. [${String(realStats.ventures).padStart(2, '0')}]`,
    `SPVs ACTIVE ....... [${String(realStats.spvs).padStart(2, '0')}]`,
    `TASKS COMPLETED ... [${realStats.tasksCompleted.toLocaleString()}]`,
    `SECTORS ........... [${String(realStats.sectors).padStart(2, '0')}]`,
  ], [realStats]);

  // SEO: Set document title for the landing page
  useEffect(() => {
    document.title = "VENTEX \u2014 Venture Intelligence Operations Platform";
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
        token_exchange_failed: "AUTHENTICATION FAILED — PLEASE TRY AGAIN",
        user_info_failed: "AUTHENTICATION FAILED — COULD NOT VERIFY IDENTITY",
        db_lookup_failed: "SERVICE ERROR — PLEASE TRY AGAIN IN A MOMENT",
        db_update_failed: "SERVICE ERROR — PLEASE TRY AGAIN IN A MOMENT",
        db_create_failed: "SERVICE ERROR — PLEASE TRY AGAIN IN A MOMENT",
        db_query_failed: "SERVICE ERROR — PLEASE TRY AGAIN IN A MOMENT",
        session_failed: "SESSION ERROR — PLEASE TRY AGAIN",
        unexpected: "UNEXPECTED ERROR — PLEASE TRY AGAIN",
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
    // If user just logged out, do NOT auto-redirect back to dashboard
    const params = new URLSearchParams(window.location.search);
    if (params.get("logged_out") === "1") {
      window.history.replaceState({}, "", "/");
      return;
    }
    if (isAuthenticated && user && flowPhase === "login") {
      const name = user.name || "OPERATOR";
      setOperatorName(name);
      localStorage.setItem("ventex_operator", name);
      startSession(name);
      setFlowPhase("welcome");
    }
  }, [authLoading, isAuthenticated, user, flowPhase]);

  /* Phase 1: VENTEX cipher decode */
  const ventexCipher = useSingleLineCipher("V E N T E X", 400, 120);

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
    if (flowPhase === "cipher" && ventexCipher.done) {
      const t = setTimeout(() => setFlowPhase("login"), 1200);
      return () => clearTimeout(t);
    }
  }, [flowPhase, ventexCipher.done]);

  /* Check for welcome param on login phase */
  useEffect(() => {
    if (flowPhase === "login") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("welcome") === "true" && isAuthenticated && user) {
        const name = user.name || "OPERATOR";
        setOperatorName(name);
        localStorage.setItem("ventex_operator", name);
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

  /* Login form state */
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const passwordRef = useRef<HTMLInputElement>(null);

  /* Handle email/password sign-in — routes through Manus OAuth with email hint */
  const handleEmailSignIn = () => {
    window.location.href = getLoginUrl("email");
  };

  /* Handle social sign-in (Google / Apple) */
  const handleSocialSignIn = (provider: "google" | "apple") => {
    window.location.href = getLoginUrl(provider);
  };

  /* Handle OAuth sign-in (fallback) */
  const handleSignIn = () => {
    window.location.href = getLoginUrl();
  };

  /* ─── scroll lock: no scrolling until user clicks a CTA ─── */
  const [scrollUnlocked, setScrollUnlocked] = useState(false);

  useEffect(() => {
    if (flowPhase !== "page" || scrollUnlocked) {
      document.body.style.overflow = (flowPhase !== "page") ? "hidden" : (scrollUnlocked ? "auto" : "hidden");
    } else {
      document.body.style.overflow = "hidden";
    }
    return () => { document.body.style.overflow = "auto"; };
  }, [flowPhase, scrollUnlocked]);

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
                  opacity: ventexCipher.done ? 0 : 1,
                  transition: "opacity 0.8s",
                }}
              >
                {ambientLines.map((line, i) => (
                  <div key={i} style={{ whiteSpace: "nowrap" }}>{line}</div>
                ))}
              </div>

              {/* Center: single line cipher resolving to VENTEX */}
              <div
                style={{
                  position: "relative",
                  zIndex: 2,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                {/* Logo mark */}
                <img
                  src="https://d2xsxph8kpxj0f.cloudfront.net/310519663421947072/TYkqBQavc4Sd5YvF3sSZqT/ventex-logo-mark_1f534165.png"
                  alt="VENTEX"
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 10,
                    objectFit: 'cover',
                    marginBottom: 20,
                    opacity: ventexCipher.done ? 1 : 0.3,
                    transition: 'opacity 0.8s ease',
                  }}
                />
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
                  {ventexCipher.display || "\u00A0"}
                  {ventexCipher.started && !ventexCipher.done && (
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
                    opacity: ventexCipher.done ? 1 : 0,
                    transform: ventexCipher.done ? "translateY(0)" : "translateY(8px)",
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
                  opacity: ventexCipher.done ? 1 : 0,
                  transition: "opacity 0.5s ease 0.3s",
                }}
              >
                N 40.712800 // W 074.006000 // EST NEW YORK
              </div>
            </>
          )}

          {/* ── PHASE 2: LOGIN — Reference-site hero style ── */}
          {flowPhase === "login" && (
            <div
              style={{
                position: "relative",
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                animation: "spyops-fadeIn 0.6s ease",
                overflow: "hidden",
              }}
            >

              {/* Particle Globe — right side */}
              <svg
                viewBox="0 0 440 440"
                className="spyops-login-globe"
                style={{
                  position: "absolute",
                  right: "-2%",
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 440,
                  height: 440,
                  opacity: 0.25,
                  pointerEvents: "none",
                }}
              >
                {Array.from({ length: 180 }, (_, i) => {
                  const theta = (i * 2.399963) % (Math.PI * 2);
                  const phi = Math.acos(1 - 2 * ((i + 0.5) / 180));
                  const r = 180;
                  const x = r * Math.sin(phi) * Math.cos(theta) + 220;
                  const y = r * Math.sin(phi) * Math.sin(theta) + 220;
                  const size = 1 + (i % 3) * 0.6;
                  const op = 0.15 + (i % 5) * 0.12;
                  return (
                    <circle key={i} cx={x} cy={y} r={size} fill="#e2e2e2" opacity={op}>
                      <animate
                        attributeName="opacity"
                        values={`${op};${op * 0.3};${op}`}
                        dur={`${2 + (i % 4)}s`}
                        repeatCount="indefinite"
                      />
                    </circle>
                  );
                })}
                <ellipse cx="220" cy="220" rx="180" ry="40" fill="none" stroke="#e2e2e2" strokeWidth="0.5" opacity="0.1" />
                <ellipse cx="220" cy="220" rx="40" ry="180" fill="none" stroke="#e2e2e2" strokeWidth="0.5" opacity="0.08" />
              </svg>

              {/* Grid overlay */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
                  backgroundSize: "80px 80px",
                  pointerEvents: "none",
                }}
              />

              {/* Left-aligned content */}
              <div
                style={{
                  position: "relative",
                  zIndex: 2,
                  maxWidth: 640,
                  padding: "0 6vw",
                }}
              >
                {/* Classified badge */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "4px 10px",
                      fontSize: 10,
                      fontFamily: "'IBM Plex Mono', monospace",
                      letterSpacing: "0.1em",
                      background: "rgba(0,255,135,0.08)",
                      color: "#00ff87",
                      border: "1px solid rgba(0,255,135,0.25)",
                    }}
                  >
                    <span style={{ color: "#00ff87" }}>■</span> CLASSIFIED
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontFamily: "'IBM Plex Mono', monospace",
                      letterSpacing: "0.1em",
                      color: "#666",
                    }}
                  >
                    OPERATION VENTEX — ACTIVE DEPLOYMENT
                  </span>
                </div>

                {/* Headline — Space Grotesk */}
                <h1
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: "clamp(48px, 8vw, 96px)",
                    letterSpacing: "-0.01em",
                    lineHeight: 0.95,
                    margin: 0,
                    marginBottom: 24,
                  }}
                >
                  <span style={{ color: "#666" }}>THE AI THAT</span>
                  <br />
                  <span style={{ color: "#fff" }}>ACCELERATES</span>
                  <br />
                  <span style={{ color: "#666" }}>VENTURE HOLDINGS</span>
                </h1>

                {/* Subtext */}
                <p
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 13,
                    color: "rgba(255,255,255,0.6)",
                    maxWidth: 400,
                    lineHeight: 1.8,
                    margin: 0,
                    marginBottom: 8,
                  }}
                >
                  <span style={{ color: "#fff", fontWeight: 500 }}>V</span>elocity{" "}
                  <span style={{ color: "#fff", fontWeight: 500 }}>EN</span>abled{" "}
                  <span style={{ color: "#fff", fontWeight: 500 }}>T</span>echnology for{" "}
                  <span style={{ color: "#fff", fontWeight: 500 }}>EX</span>ponential velocity.
                </p>
                <p
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 12,
                    color: "rgba(255,255,255,0.45)",
                    maxWidth: 400,
                    lineHeight: 1.7,
                    margin: 0,
                    marginBottom: 36,
                  }}
                >
                  The AI-powered operations dashboard built exclusively
                  for venture holding businesses. One command layer.
                  Every holding. Total control.
                </p>

                {/* OAuth error message */}
                {oauthError && (
                  <div
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 11,
                      color: "rgba(255,255,255,0.7)",
                      marginBottom: 24,
                      letterSpacing: "0.1em",
                      lineHeight: 1.8,
                      padding: "12px 20px",
                      border: "1px solid rgba(255,255,255,0.15)",
                      background: "rgba(255,255,255,0.03)",
                      maxWidth: 480,
                      animation: "spyops-fadeIn 0.5s ease",
                    }}
                  >
                    ✖ {oauthError}
                    <div style={{ fontSize: 9, color: "#666", marginTop: 8 }}>
                      CONTACT YOUR ORGANIZATION ADMIN FOR ACCESS
                    </div>
                  </div>
                )}

                {/* Login Form */}
                <div style={{ maxWidth: 400 }}>
                  {/* Email + Password fields */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                    <input
                      type="email"
                      placeholder="EMAIL ADDRESS"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && passwordRef.current?.focus()}
                      autoComplete="email"
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 12,
                        letterSpacing: "0.08em",
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.15)",
                        borderBottom: "none",
                        color: "#fff",
                        padding: "14px 16px",
                        outline: "none",
                        width: "100%",
                      }}
                    />
                    <input
                      ref={passwordRef}
                      type="password"
                      placeholder="PASSWORD"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleEmailSignIn()}
                      autoComplete="current-password"
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 12,
                        letterSpacing: "0.08em",
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.15)",
                        color: "#fff",
                        padding: "14px 16px",
                        outline: "none",
                        width: "100%",
                      }}
                    />
                  </div>

                  {/* Sign In button */}
                  <button
                    onClick={handleEmailSignIn}
                    disabled={authLoading}
                    className="spyops-btn-primary"
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 11,
                      letterSpacing: "0.12em",
                      background: authLoading ? "#333" : "#fff",
                      color: authLoading ? "#666" : "#000",
                      border: "none",
                      padding: "14px 0",
                      cursor: authLoading ? "wait" : "none",
                      width: "100%",
                      marginTop: 0,
                    }}
                  >
                    {authLoading ? "VERIFYING..." : "SIGN IN →"}
                  </button>

                  {/* Divider */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    margin: "20px 0",
                  }}>
                    <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
                    <span style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 9,
                      letterSpacing: "0.15em",
                      color: "#444",
                    }}>OR CONTINUE WITH</span>
                    <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
                  </div>

                  {/* Social sign-in buttons */}
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      onClick={() => handleSocialSignIn("google")}
                      disabled={authLoading}
                      style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 10,
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 10,
                        letterSpacing: "0.1em",
                        background: "transparent",
                        border: "1px solid rgba(255,255,255,0.15)",
                        color: "#999",
                        padding: "12px 0",
                        cursor: authLoading ? "wait" : "none",
                      }}
                      className="spyops-social-btn"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11.96 11.96 0 0 0 0 12c0 1.94.46 3.77 1.28 5.4l3.56-2.77-.01-.54z" fill="#FBBC05"/>
                        <path d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.09 14.97 0 12 0 7.7 0 3.99 2.47 2.18 6.07l3.66 2.84c.87-2.6 3.3-4.16 6.16-4.16z" fill="#EA4335"/>
                      </svg>
                      GOOGLE
                    </button>

                    <button
                      onClick={() => handleSocialSignIn("apple")}
                      disabled={authLoading}
                      style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 10,
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 10,
                        letterSpacing: "0.1em",
                        background: "transparent",
                        border: "1px solid rgba(255,255,255,0.15)",
                        color: "#999",
                        padding: "12px 0",
                        cursor: authLoading ? "wait" : "none",
                      }}
                      className="spyops-social-btn"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                      </svg>
                      APPLE
                    </button>
                  </div>
                </div>

                {/* Bottom classification */}
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 10,
                    color: "#333",
                    letterSpacing: "0.1em",
                    marginTop: 48,
                  }}
                >
                  DOC-VTX-2026-001 // EYES ONLY // VENTURE INTELLIGENCE DIVISION
                </div>
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
            VTX<span className="spyops-blink">_</span>
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
            VENTEX
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

      {/* ═══ SECTION 3 — HERO (Reference-site style) ═══ */}
      <section
        id="hero"
        style={{
          minHeight: "100vh",
          position: "relative",
          overflow: "hidden",
          paddingTop: 56,
        }}
      >
        {/* Particle Globe — right side */}
        <svg
          viewBox="0 0 600 600"
          className="spyops-hero-globe"
          style={{
            position: "absolute",
            right: "-5%",
            top: "50%",
            transform: "translateY(-50%)",
            width: "55vw",
            maxWidth: 700,
            height: "auto",
            opacity: 0.2,
            pointerEvents: "none",
          }}
        >
          {Array.from({ length: 240 }, (_, i) => {
            const theta = (i * 2.399963) % (Math.PI * 2);
            const phi = Math.acos(1 - 2 * ((i + 0.5) / 240));
            const r = 250;
            const x = r * Math.sin(phi) * Math.cos(theta) + 300;
            const y = r * Math.sin(phi) * Math.sin(theta) + 300;
            const size = 1.2 + (i % 3) * 0.5;
            const op = 0.2 + (i % 5) * 0.1;
            return (
              <circle key={i} cx={x} cy={y} r={size} fill="#e2e2e2" opacity={op}>
                <animate
                  attributeName="opacity"
                  values={`${op};${op * 0.25};${op}`}
                  dur={`${2.5 + (i % 4)}s`}
                  repeatCount="indefinite"
                />
              </circle>
            );
          })}
          <ellipse cx="300" cy="300" rx="250" ry="55" fill="none" stroke="#e2e2e2" strokeWidth="0.5" opacity="0.08" />
          <ellipse cx="300" cy="300" rx="55" ry="250" fill="none" stroke="#e2e2e2" strokeWidth="0.5" opacity="0.06" />
          <ellipse cx="300" cy="300" rx="250" ry="250" fill="none" stroke="#e2e2e2" strokeWidth="0.3" opacity="0.04" />
        </svg>

        {/* grid overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
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
            {/* Classified badge */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 48 }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 14px",
                  fontSize: 10,
                  fontFamily: "'IBM Plex Mono', monospace",
                  letterSpacing: "0.12em",
                  background: "rgba(0,255,135,0.08)",
                  color: "#00ff87",
                  border: "1px solid rgba(0,255,135,0.25)",
                }}
              >
                <span style={{ color: "#00ff87" }}>■</span> CLASSIFIED
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontFamily: "'IBM Plex Mono', monospace",
                  letterSpacing: "0.12em",
                  color: "#555",
                }}
              >
                OPERATION VENTEX — ACTIVE DEPLOYMENT
              </span>
            </div>

            <h1
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: "clamp(56px, 9vw, 130px)",
                letterSpacing: "-0.02em",
                lineHeight: 0.92,
                margin: 0,
              }}
            >
              <span style={{ color: "#666" }}>THE AI THAT</span>
              <br />
              <span style={{ color: "#fff" }}>ACCELERATES</span>
              <br />
              <span style={{ color: "#666" }}>VENTURE HOLDINGS</span>
            </h1>

            <p
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 14,
                color: "rgba(255,255,255,0.55)",
                maxWidth: 440,
                lineHeight: 1.8,
                marginTop: 36,
              }}
            >
              <span style={{ color: "#fff", fontWeight: 500 }}>V</span>elocity{" "}
              <span style={{ color: "#fff", fontWeight: 500 }}>EN</span>abled{" "}
              <span style={{ color: "#fff", fontWeight: 500 }}>T</span>echnology for{" "}
              <span style={{ color: "#fff", fontWeight: 500 }}>EX</span>ponential velocity.
              <br />
              <span style={{ color: "rgba(255,255,255,0.4)" }}>
                The AI-powered operations dashboard built exclusively
                for venture holding businesses. One command layer.
                Every holding. Total control.
              </span>
            </p>

            <div style={{ display: "flex", gap: 16, marginTop: 44, flexWrap: "wrap" }}>
              {/* ENTER COMMAND CENTER — auth-aware */}
              <button
                onClick={() => { setScrollUnlocked(true); isAuthenticated ? navigate("/dashboard") : handleSignIn(); }}
                className="spyops-btn-primary"
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  background: "#fff",
                  color: "#000",
                  border: "none",
                  padding: "16px 36px",
                  cursor: "none",
                }}
              >
                {isAuthenticated ? "ENTER COMMAND CENTER →" : "AUTHORIZED ACCESS →"}
              </button>

              {/* REQUEST ACCESS scrolls to contact/coordinates */}
              <button
                onClick={() => { setScrollUnlocked(true); setTimeout(() => scrollTo("coordinates"), 100); }}
                className="spyops-btn-secondary"
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  background: "transparent",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.3)",
                  padding: "16px 36px",
                  cursor: "none",
                }}
              >
                REQUEST ACCESS +
              </button>
            </div>

            {/* Bottom classification */}
            <div
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10,
                color: "#333",
                letterSpacing: "0.12em",
                marginTop: 64,
              }}
            >
              DOC-VTX-2026-001 // EYES ONLY // VENTURE INTELLIGENCE DIVISION
            </div>
          </div>
          {/* right readouts with left border */}
          <div
            className="spyops-hero-readouts"
            style={{
              position: "absolute",
              right: "8%",
              top: "50%",
              transform: "translateY(-50%)",
              borderLeft: "1px solid rgba(255,255,255,0.2)",
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
                  color: i === 0 ? "#555" : "rgba(255,255,255,0.7)",
                  textAlign: "right",
                }}
              >
                <TypewriterLine text={line} delay={i * 100} speed={20} />
              </div>
            ))}
          </div>
        </div>
        {/* Scroll indicator — bottom center — only shows when scroll is locked */}
        {!scrollUnlocked && (
          <div
            onClick={() => setScrollUnlocked(true)}
            style={{
              position: "absolute",
              bottom: 32,
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              cursor: "none",
            }}
            className="spyops-hover"
          >
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10,
                letterSpacing: "0.15em",
                color: "#555",
              }}
            >
              SCROLL
            </span>
            <div style={{ width: 1, height: 24, background: "#555" }} />
          </div>
        )}
        {/* bottom left */}
        <div
          style={{
            position: "absolute",
            bottom: 24,
            left: 24,
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10,
            color: "#444",
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
        style={{ padding: "120px 6vw", paddingBottom: 120 }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 56,
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
            gap: 1,
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
              <div style={{ fontSize: 28, marginBottom: 16, opacity: 0.9 }}>{s.icon}</div>
              <div
                style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 36,
                  letterSpacing: "0.1em",
                  marginBottom: 16,
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
      <Section id="methodology" style={{ padding: "120px 6vw", position: "relative", paddingBottom: 120 }}>
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
                fontSize: "clamp(52px, 7vw, 96px)",
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
                fontSize: 14,
                color: "rgba(255,255,255,0.65)",
                lineHeight: 1.85,
                marginTop: 32,
              }}
            >
              Built for holding companies operating across multiple venture
              verticals. VENTEX eliminates the operational drag that costs
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
                  padding: "24px 0",
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
        style={{ padding: "120px 6vw", borderTop: "1px solid #fff", paddingBottom: 120 }}
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
              fontSize: "clamp(52px, 8vw, 96px)",
              textAlign: "center",
              marginBottom: 56,
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
                padding: 28,
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
      <Section id="pipeline" style={{ padding: "120px 6vw", paddingBottom: 120 }}>
        <div
          style={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: 10,
            color: "#666",
            letterSpacing: "0.2em",
            marginBottom: 48,
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
                        padding: "14px 20px",
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
          padding: "120px 6vw",
          paddingBottom: 120,
        }}
      >
        <div
          style={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: 10,
            color: "#666",
            letterSpacing: "0.2em",
            marginBottom: 56,
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
            <div key={c.label} style={{ marginBottom: 32 }}>
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
            fontSize: "clamp(64px, 10vw, 140px)",
            color: "#fff",
            marginTop: 56,
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
            V E N T E X
          </div>
        </div>
      </Section>

      {/* ═══ SECTION 10 — FOOTER ═══ */}
      <footer
        id="footer"
        style={{
          borderTop: "1px solid #fff",
          padding: "64px 6vw",
          paddingBottom: 80,
        }}
      >
        <div
          className="spyops-footer-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 48,
          }}
        >
          {/* col 1 */}
          <div>
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663421947072/TYkqBQavc4Sd5YvF3sSZqT/ventex-logo-mark_1f534165.png"
              alt="VENTEX"
              style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover', marginBottom: 8 }}
            />
            <div
              style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: 10,
                color: "#888",
                lineHeight: 2,
              }}
            >
              VENTEX
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
              VENTEX CORE: [ONLINE]
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
              © 2026 VENTEX
              <br />
              POWERED BY AUROVIA LLC
              <br />
              MCLEAN, VIRGINIA
              <br />
              <a href="tel:+15714803261" style={{ color: '#888', textDecoration: 'none' }}>(571) 480-3261</a>
            </div>
            <div
              style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: 10,
                color: "#666",
                display: "flex",
                gap: 16,
                marginTop: 12,
              }}
            >
              <a href="/privacy" style={{ color: '#888', textDecoration: 'none' }}>PRIVACY</a>
              <a href="/terms" style={{ color: '#888', textDecoration: 'none' }}>TERMS</a>
              <a href="/trust" style={{ color: '#888', textDecoration: 'none' }}>TRUST & SECURITY</a>
            </div>
          </div>
        </div>
        {/* bottom bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 48,
            paddingTop: 24,
            borderTop: "1px solid rgba(255,255,255,0.15)",
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: 10,
            color: "#555",
          }}
        >
          <span>CLASSIFICATION: CONFIDENTIAL</span>
          <span>BUILD: VTX-2026.04.16</span>
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

        /* Social sign-in buttons */
        .spyops-social-btn:hover {
          background: rgba(255,255,255,0.08) !important;
          border-color: rgba(255,255,255,0.35) !important;
          color: #fff !important;
          transition: none !important;
        }

        /* Login form input focus */
        .spyops-root input[type="email"]:focus,
        .spyops-root input[type="password"]:focus {
          border-color: rgba(255,255,255,0.4) !important;
          background: rgba(255,255,255,0.07) !important;
        }

        /* FIX 13: sector card instant hover inversion — no transition */
        .spyops-sector-card {
          border: 1px solid #fff;
          padding: 36px;
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
