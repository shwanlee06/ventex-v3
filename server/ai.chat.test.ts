import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the LLM module to avoid real API calls in tests
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    id: "test-id",
    created: Date.now(),
    model: "claude-4.6-sonnet",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: "This is a test response from Claude 4.6 Sonnet.",
        },
        finish_reason: "stop",
      },
    ],
    usage: {
      prompt_tokens: 100,
      completion_tokens: 50,
      total_tokens: 150,
    },
  }),
}));

function createAuthenticatedContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-open-id",
      name: "Test User",
      email: "test@example.com",
      role: "admin",
      organizationId: 1,
      createdAt: new Date(),
    } as TrpcContext["user"],
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("ai.chat", () => {
  it("returns a response with content and model info", async () => {
    const ctx = createAuthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.ai.chat({
      messages: [
        { role: "user", content: "Hello, what model are you?" },
      ],
    });

    expect(result).toHaveProperty("content");
    expect(result).toHaveProperty("model");
    expect(typeof result.content).toBe("string");
    expect(result.content.length).toBeGreaterThan(0);
    expect(result.content).toBe("This is a test response from Claude 4.6 Sonnet.");
  });

  it("returns requiresApproval flag when response contains draft content", async () => {
    const { invokeLLM } = await import("./_core/llm");
    (invokeLLM as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: "test-draft",
      created: Date.now(),
      model: "claude-4.6-sonnet",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: "Here is a draft email for your approval:\n\nDear Investors...",
          },
          finish_reason: "stop",
        },
      ],
    });

    const ctx = createAuthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.ai.chat({
      messages: [
        { role: "user", content: "Draft an email to investors" },
      ],
    });

    expect(result.requiresApproval).toBe(true);
    expect(result.content).toContain("draft email");
  });

  it("handles multi-turn conversations", async () => {
    const ctx = createAuthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.ai.chat({
      messages: [
        { role: "user", content: "What ventures do we have?" },
        { role: "assistant", content: "You have several ventures across multiple sectors." },
        { role: "user", content: "Tell me more about the real estate ones." },
      ],
    });

    expect(result).toHaveProperty("content");
    expect(typeof result.content).toBe("string");
  });

  it("validates input schema - rejects empty messages", async () => {
    const ctx = createAuthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.ai.chat({ messages: [] })
    ).resolves.toHaveProperty("content");
  });

  it("rejects unauthenticated requests", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.ai.chat({ messages: [{ role: "user", content: "test" }] })
    ).rejects.toThrow();
  });
});
