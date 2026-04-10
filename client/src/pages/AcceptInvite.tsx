// Accept Invite Page — Team Member Invitation Acceptance
// URL: /accept-invite?token=abc123...
// Validates token, shows invitation details, redirects to OAuth for sign-in
// After OAuth callback, the invitation is automatically accepted

import { useState, useEffect, useRef } from "react";
import { getLoginUrl } from "@/const";

/* ── Typewriter effect ── */
function useTypewriter(text: string, speed = 40, delay = 0) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    const timeout = setTimeout(() => {
      let i = 0;
      const interval = setInterval(() => {
        if (i < text.length) {
          setDisplayed(text.substring(0, i + 1));
          i++;
        } else {
          setDone(true);
          clearInterval(interval);
        }
      }, speed);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timeout);
  }, [text, speed, delay]);

  return { displayed, done };
}

/* ── Role badge colors ── */
const ROLE_STYLES: Record<string, { bg: string; border: string; text: string; label: string }> = {
  partner: { bg: "rgba(234,179,8,0.08)", border: "rgba(234,179,8,0.25)", text: "#eab308", label: "PARTNER" },
  admin: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", text: "#ef4444", label: "ADMINISTRATOR" },
  manager: { bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.25)", text: "#3b82f6", label: "MANAGER" },
  user: { bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.25)", text: "#10b981", label: "TEAM MEMBER" },
  viewer: { bg: "rgba(107,114,128,0.08)", border: "rgba(107,114,128,0.25)", text: "#6b7280", label: "VIEWER" },
  client: { bg: "rgba(168,85,247,0.08)", border: "rgba(168,85,247,0.25)", text: "#a855f7", label: "CLIENT" },
};

export default function AcceptInvite() {
  // Extract token from query string
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token") || "";

  const [phase, setPhase] = useState<"loading" | "valid" | "error" | "redirecting">("loading");
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState("core");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("");
  const [invitedBy, setInvitedBy] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const hasValidated = useRef(false);

  // Validate the invitation via the public token endpoint
  useEffect(() => {
    if (hasValidated.current) return;
    hasValidated.current = true;

    if (!token) {
      setErrorMsg("No invitation token provided");
      setPhase("error");
      return;
    }

    async function validate() {
      try {
        const res = await fetch(`/api/invite/validate-token?token=${encodeURIComponent(token)}`);
        const data = await res.json();

        if (data.valid) {
          setOrgName(data.organizationName);
          setOrgType(data.organizationType || "core");
          setInviteEmail(data.email || "");
          setInviteRole(data.role || "");
          setInvitedBy(data.invitedByName || "");
          setPhase("valid");
        } else {
          setErrorMsg(data.reason || "Invalid or expired invitation");
          setPhase("error");
        }
      } catch {
        setErrorMsg("Unable to validate invitation. Please try again.");
        setPhase("error");
      }
    }

    validate();
  }, [token]);

  // Typewriter effects
  const atlasText = useTypewriter("A T L A S", 80, 200);
  const subtitleText = useTypewriter("ROYALTON VENTURE HOLDING", 30, 1200);
  const inviteText = useTypewriter(
    invitedBy
      ? `${invitedBy.toUpperCase()} HAS INVITED YOU TO JOIN`
      : "YOU HAVE BEEN INVITED TO JOIN",
    25,
    2000
  );

  const handleProceed = () => {
    // Store the invite token in sessionStorage so the OAuth callback can use it
    sessionStorage.setItem("atlas_invite_token", token);
    setPhase("redirecting");
    setTimeout(() => {
      window.location.href = getLoginUrl();
    }, 800);
  };

  const roleStyle = ROLE_STYLES[inviteRole] || ROLE_STYLES.user;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#000",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Share Tech Mono', 'JetBrains Mono', monospace",
        color: "#fff",
        padding: "24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background grid effect */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
          pointerEvents: "none",
        }}
      />

      {/* Scanline overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)",
          pointerEvents: "none",
          opacity: 0.4,
        }}
      />

      {/* Main content */}
      <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: "600px", width: "100%" }}>
        {/* ATLAS header */}
        <div
          style={{
            fontSize: "clamp(28px, 5vw, 42px)",
            fontWeight: 300,
            letterSpacing: "0.5em",
            marginBottom: 8,
            color: "#fff",
          }}
        >
          {atlasText.displayed}
          {!atlasText.done && <span style={{ opacity: 0.5 }}>|</span>}
        </div>

        <div
          style={{
            fontSize: "clamp(8px, 1.5vw, 11px)",
            letterSpacing: "0.35em",
            color: "#555",
            marginBottom: 48,
          }}
        >
          {subtitleText.displayed}
        </div>

        {/* Invite message */}
        <div
          style={{
            fontSize: "clamp(10px, 1.8vw, 13px)",
            letterSpacing: "0.2em",
            color: phase === "error" ? "#ff3333" : roleStyle.text,
            marginBottom: 32,
            minHeight: 20,
          }}
        >
          {phase === "loading" && (
            <span style={{ color: "#666" }}>VALIDATING INVITATION...</span>
          )}
          {phase === "valid" && inviteText.displayed}
          {phase === "error" && `✖ ${errorMsg.toUpperCase()}`}
          {phase === "redirecting" && (
            <span style={{ color: "#10b981" }}>REDIRECTING TO SECURE AUTHENTICATION...</span>
          )}
        </div>

        {/* Invitation card — shown when valid */}
        {phase === "valid" && inviteText.done && (
          <div
            style={{
              animation: "inviteFadeIn 0.6s ease",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 24,
            }}
          >
            {/* Invitation info card */}
            <div
              style={{
                background: roleStyle.bg,
                border: `1px solid ${roleStyle.border}`,
                borderRadius: 8,
                padding: "24px 32px",
                maxWidth: 440,
                width: "100%",
              }}
            >
              {/* Role badge */}
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: "0.3em",
                  color: roleStyle.text,
                  marginBottom: 12,
                  textTransform: "uppercase",
                }}
              >
                {roleStyle.label} ACCESS
              </div>

              {/* Organization name */}
              <div
                style={{
                  fontSize: "clamp(18px, 3vw, 24px)",
                  fontWeight: 600,
                  color: "#fff",
                  marginBottom: 16,
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {orgName}
              </div>

              {/* Details */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {inviteEmail && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                    <span style={{ color: "#666" }}>INVITED EMAIL</span>
                    <span style={{ color: "#aaa" }}>{inviteEmail}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                  <span style={{ color: "#666" }}>ASSIGNED ROLE</span>
                  <span style={{ color: roleStyle.text, textTransform: "uppercase" }}>{inviteRole}</span>
                </div>
                {invitedBy && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                    <span style={{ color: "#666" }}>INVITED BY</span>
                    <span style={{ color: "#aaa" }}>{invitedBy}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Proceed button */}
            <button
              onClick={handleProceed}
              style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: 13,
                letterSpacing: "0.25em",
                color: "#000",
                background: roleStyle.text,
                border: "none",
                padding: "14px 48px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                textTransform: "uppercase",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "0.85";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "1";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              ACCEPT & SIGN IN ▶
            </button>

            <div style={{ fontSize: 9, color: "#444", letterSpacing: "0.15em", marginTop: 8 }}>
              YOU WILL BE REDIRECTED TO SIGN IN WITH YOUR ACCOUNT
            </div>
          </div>
        )}

        {/* Error state */}
        {phase === "error" && (
          <div style={{ animation: "inviteFadeIn 0.6s ease" }}>
            <div
              style={{
                background: "rgba(255,51,51,0.05)",
                border: "1px solid rgba(255,51,51,0.2)",
                borderRadius: 8,
                padding: "20px 32px",
                maxWidth: 440,
                margin: "0 auto",
                marginBottom: 24,
              }}
            >
              <div style={{ fontSize: 11, color: "#ff3333", letterSpacing: "0.15em", lineHeight: 1.8 }}>
                THIS INVITATION LINK IS NO LONGER VALID.
                <br />
                PLEASE CONTACT YOUR ADMINISTRATOR FOR A NEW INVITATION.
              </div>
            </div>

            <button
              onClick={() => (window.location.href = "/")}
              style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: 11,
                letterSpacing: "0.2em",
                color: "#666",
                background: "transparent",
                border: "1px solid #333",
                padding: "10px 32px",
                cursor: "pointer",
              }}
            >
              RETURN TO MAIN
            </button>
          </div>
        )}

        {/* Redirecting spinner */}
        {phase === "redirecting" && (
          <div
            style={{
              width: 32,
              height: 32,
              border: "2px solid #333",
              borderTop: `2px solid ${roleStyle.text}`,
              borderRadius: "50%",
              animation: "inviteSpin 0.8s linear infinite",
              margin: "24px auto",
            }}
          />
        )}
      </div>

      {/* Bottom classification */}
      <div
        style={{
          position: "absolute",
          bottom: 24,
          fontSize: 9,
          letterSpacing: "0.2em",
          color: "#222",
          textAlign: "center",
        }}
      >
        CLASSIFICATION: CONFIDENTIAL // TEAM ACCESS PORTAL
      </div>

      <style>{`
        @keyframes inviteFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes inviteSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
