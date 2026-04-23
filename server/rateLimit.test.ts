import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Rate Limiting Tests ─────────────────────────────────────────────────────

describe("Rate Limiting — LLM", () => {
  it("llm.ts exports invokeLLM function", async () => {
    const mod = await import("./_core/llm");
    expect(typeof mod.invokeLLM).toBe("function");
  });

  it("llm.ts contains rate limiting code", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/_core/llm.ts", "utf-8");
    expect(content).toContain("waitForRateLimit");
    expect(content).toContain("LLM_RATE_LIMIT");
    expect(content).toContain("llmRequestTimestamps");
  });

  it("rate limiter is called before LLM fetch", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/_core/llm.ts", "utf-8");
    // Ensure waitForRateLimit is called inside invokeLLM
    const invokeFnStart = content.indexOf("export async function invokeLLM");
    const waitCall = content.indexOf("await waitForRateLimit()", invokeFnStart);
    expect(waitCall).toBeGreaterThan(invokeFnStart);
  });
});

describe("Rate Limiting — Email Service", () => {
  it("emailService.ts contains rate limiting code", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/emailService.ts", "utf-8");
    expect(content).toContain("waitForEmailRateLimit");
    expect(content).toContain("EMAIL_RATE_LIMIT");
    expect(content).toContain("checkDailyBudget");
    expect(content).toContain("DAILY_EMAIL_BUDGET");
  });

  it("all email functions have daily budget check", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/emailService.ts", "utf-8");
    
    const emailFunctions = [
      "sendTaskFollowUp",
      "sendDistributionNotice",
      "sendClientNudge",
      "sendOverdueAutoEmail",
      "sendReadyToAdvanceEmail",
      "sendStageAdvancedEmail",
    ];

    for (const fn of emailFunctions) {
      const fnStart = content.indexOf(`export async function ${fn}`);
      expect(fnStart).toBeGreaterThan(-1);
      
      // Find the next function or end of file
      const nextFnStart = content.indexOf("export async function", fnStart + 1);
      const fnBody = nextFnStart > -1 
        ? content.slice(fnStart, nextFnStart) 
        : content.slice(fnStart);
      
      expect(fnBody).toContain("checkDailyBudget()");
      expect(fnBody).toContain("waitForEmailRateLimit()");
    }
  });

  it("daily budget is set to 50 emails", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/emailService.ts", "utf-8");
    expect(content).toContain("DAILY_EMAIL_BUDGET = 50");
  });

  it("email rate limit is 2 per second", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/emailService.ts", "utf-8");
    expect(content).toContain("EMAIL_RATE_LIMIT = 2");
  });
});

describe("Rate Limiting — Escalation Engine", () => {
  it("escalation engine has overdue email cooldown", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/intelligence/escalationEngine.ts", "utf-8");
    expect(content).toContain("OVERDUE_EMAIL_COOLDOWN_DAYS");
    expect(content).toContain("MAX_OVERDUE_EMAILS_PER_SWEEP");
  });

  it("escalation engine caps overdue emails at 3 per sweep", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/intelligence/escalationEngine.ts", "utf-8");
    expect(content).toContain("MAX_OVERDUE_EMAILS_PER_SWEEP = 3");
  });

  it("escalation engine has 7-day cooldown for overdue emails", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/intelligence/escalationEngine.ts", "utf-8");
    expect(content).toContain("OVERDUE_EMAIL_COOLDOWN_DAYS = 7");
  });

  it("escalation engine records overdue_email events for cooldown tracking", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/intelligence/escalationEngine.ts", "utf-8");
    expect(content).toContain('eventType: "overdue_email"');
  });

  it("escalation engine checks for recent overdue_email before sending", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/intelligence/escalationEngine.ts", "utf-8");
    // Should query for recent overdue_email events
    expect(content).toContain("recentEscalationEmail");
    expect(content).toContain("Already emailed recently");
  });
});

describe("Rate Limiting — Agent Scheduler", () => {
  it("agent scheduler runs at 6-hour intervals", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/agentScheduler.ts", "utf-8");
    expect(content).toContain("6 * 60 * 60 * 1000");
    expect(content).toContain("6 hours");
  });
});
