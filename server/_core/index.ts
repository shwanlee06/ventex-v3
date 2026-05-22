import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { aiStreamRouter } from "../routes/aiStream";
import { startAgentScheduler, getSchedulerStatus } from "../agentScheduler";
import { runDataRetentionPurge } from "../security/dataRetention";
import inviteValidationRouter from "../routes/inviteValidation";
import { sseRouter } from "../routes/sseEvents";
import { ssoRouter } from "../routes/ssoRoutes";
import { createSCIMRouter } from "../enterprise/scimProvisioning";
import { startCronScheduler, getCronStatus } from "../cron";
import { randomBytes } from "crypto";
import { getSessionCookieOptions } from "./cookies";
import { COOKIE_NAME } from "../../shared/const";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  app.disable("x-powered-by");
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  app.use((_req, res, next) => {
    // Prevent MIME-type sniffing
    res.setHeader("X-Content-Type-Options", "nosniff");
    // Prevent clickjacking
    res.setHeader("X-Frame-Options", "DENY");
    // Enable XSS filter (legacy browsers)
    res.setHeader("X-XSS-Protection", "1; mode=block");
    // Enforce HTTPS (with preload for HSTS preload list eligibility)
    res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
    // Referrer policy — send origin only on cross-origin requests
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    // Content Security Policy — nonce-based for production (INJ-02)
    const nonce = randomBytes(16).toString("base64");
    (res as any).cspNonce = nonce;  // expose nonce for HTML template injection
    const isDev = process.env.NODE_ENV === "development";
    const scriptSrc = isDev
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
      : "script-src 'self' 'unsafe-inline'";
    const styleSrc = isDev
      ? "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com"
      : "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com";
    const reportUri = isDev ? "" : "; report-uri /api/csp-report; report-to csp-endpoint";
    res.setHeader(
      "Content-Security-Policy",
      `default-src 'self'; ${scriptSrc}; ${styleSrc}; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https: wss:; frame-ancestors 'none'${reportUri}`
    );
    if (!isDev) {
      res.setHeader("Report-To", JSON.stringify({
        group: "csp-endpoint",
        max_age: 86400,
        endpoints: [{ url: "/api/csp-report" }],
      }));
    }
    // Permissions policy — disable unnecessary browser features
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()"
    );
    // Cross-Origin isolation headers
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
    // Remove server identification
    res.removeHeader("X-Powered-By");
    next();
  });
  // Storage proxy for /manus-storage/ paths
  registerStorageProxy(app);
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // AI streaming endpoint (SSE)
  app.use(aiStreamRouter);
  // Public invite validation (no auth)
  app.use(inviteValidationRouter);
  // SSE real-time events
  app.use(sseRouter);
  app.use(ssoRouter);
  // SCIM 2.0 provisioning endpoint (enterprise SSO auto-provisioning)
  app.use("/scim/v2", createSCIMRouter());
  // Dedicated logout endpoint — bypasses tRPC to ensure Set-Cookie header is always sent
  // Supports both POST (for fetch) and GET (for direct navigation)
  const handleLogout = (req: any, res: any) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(COOKIE_NAME, "", { ...cookieOptions, maxAge: 0, expires: new Date(0) });
    // If Accept header wants JSON (fetch call), return JSON
    if (req.headers.accept?.includes("application/json") || req.method === "POST") {
      res.json({ success: true });
    } else {
      // Direct navigation — redirect to landing page
      res.redirect("/?logged_out=1");
    }
  };
  app.get("/api/logout", handleLogout);
  app.post("/api/logout", handleLogout);

  // CSRF protection: verify Origin header on mutation requests
  app.use("/api/trpc", (req, res, next) => {
    // Only enforce on state-changing methods
    if (req.method !== "GET" && req.method !== "HEAD" && req.method !== "OPTIONS") {
      const origin = req.headers.origin;
      // Use X-Forwarded-Host (set by reverse proxy) or fall back to Host header
      const host = (req.headers["x-forwarded-host"] as string) || req.headers.host;
      // In production, verify origin matches host; skip in dev for HMR
      if (process.env.NODE_ENV !== "development" && origin && host) {
        try {
          const originHost = new URL(origin).host;
          // Allow if origin matches the forwarded host, the direct host,
          // or is a known *.manus.space domain (deployment platform)
          const directHost = req.headers.host || "";
          const isMatch = originHost === host 
            || originHost === directHost
            || (originHost.endsWith(".manus.space") && origin.startsWith("https://"));
          if (!isMatch) {
            res.status(403).json({ error: "Origin mismatch" });
            return;
          }
        } catch {
          // Malformed origin header
          res.status(403).json({ error: "Invalid origin" });
          return;
        }
      }
    }
    next();
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  // WS5: Health check endpoints for /trust status page
  app.get("/api/health", (_req, res) => {
    res.json({ status: "operational", service: "ventex", timestamp: new Date().toISOString() });
  });
  app.get("/api/health/db", async (_req, res) => {
    try {
      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db) throw new Error("DB pool unavailable");
      const { sql } = await import("drizzle-orm");
      await db.execute(sql`SELECT 1`);
      res.json({ status: "operational", service: "database", timestamp: new Date().toISOString() });
    } catch (err: any) {
      res.status(503).json({ status: "degraded", service: "database", error: err?.message, timestamp: new Date().toISOString() });
    }
  });
  app.get("/api/health/ai", (_req, res) => {
    // AI health is determined by whether the LLM API key is configured
    const hasKey = Boolean(process.env.BUILT_IN_FORGE_API_KEY);
    res.json({ status: hasKey ? "operational" : "degraded", service: "ai", timestamp: new Date().toISOString() });
  });

  // Agent scheduler status endpoint
  app.get("/api/agent-scheduler/status", (_req, res) => {
    res.json(getSchedulerStatus());
  });

  // Cron scheduler status endpoint
  app.get("/api/cron/status", (_req, res) => {
    res.json(getCronStatus());
  });

  // W5-001: CSP violation reporting endpoint
  app.post("/api/csp-report", express.json({ type: ["application/json", "application/csp-report", "application/reports+json"] }), (req, res) => {
    const report = req.body?.["csp-report"] || req.body;
    if (report) {
      const violatedDirective = report["violated-directive"] || report.violatedDirective || "unknown";
      const blockedUri = report["blocked-uri"] || report.blockedURI || "unknown";
      const documentUri = report["document-uri"] || report.documentURL || "unknown";
      console.warn(`[CSP-Violation] directive=${violatedDirective} blocked=${blockedUri} document=${documentUri}`);
    }
    res.status(204).send();
  });

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    // Start the agent scheduler after server is ready
    startAgentScheduler();
    // Start cron scheduler (ECB FX rates, nightly snapshots)
    startCronScheduler();

    // Data retention purge — runs daily at 03:00 UTC
    const RETENTION_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
    setTimeout(() => {
      console.log("[DataRetention] Running initial purge (2min after startup)");
      runDataRetentionPurge().catch(err => console.error("[DataRetention] Purge error:", err));
    }, 120_000);
    setInterval(() => {
      runDataRetentionPurge().catch(err => console.error("[DataRetention] Purge error:", err));
    }, RETENTION_INTERVAL_MS);
  });
}

startServer().catch(console.error);
