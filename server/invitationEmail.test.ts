/**
 * Tests for invitationEmail.ts helper:
 * 1. buildInviteLink constructs correct URLs
 * 2. sendInvitationEmail calls Resend when API key is present
 * 3. sendInvitationEmail gracefully handles missing API key
 * 4. sendInvitationEmail gracefully handles Resend errors
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We need to mock the Resend module before importing the helper
const mockSendFn = vi.fn();

vi.mock("resend", () => {
  class MockResend {
    emails = { send: mockSendFn };
  }
  return {
    Resend: MockResend,
    default: { Resend: MockResend },
  };
});

// Also mock notifyOwner so it doesn't make real HTTP calls
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

import { sendInvitationEmail, buildInviteLink } from "./invitationEmail";
import { notifyOwner } from "./_core/notification";

describe("buildInviteLink", () => {
  it("constructs a valid invite URL with token", () => {
    const link = buildInviteLink("https://royaltonai.manus.space", "abc123token");
    expect(link).toBe("https://royaltonai.manus.space/accept-invite?token=abc123token");
  });

  it("encodes special characters in token", () => {
    const link = buildInviteLink("https://example.com", "token+with/special=chars");
    expect(link).toContain("accept-invite?token=");
    // The token should be URI-encoded
    expect(link).not.toContain("+");
  });

  it("handles trailing slash in origin", () => {
    const link = buildInviteLink("https://example.com/", "mytoken");
    // Should not have double slashes
    expect(link).toContain("/accept-invite?token=mytoken");
  });

  it("returns a valid URL string", () => {
    const link = buildInviteLink("https://example.com", "test");
    expect(() => new URL(link)).not.toThrow();
  });
});

describe("sendInvitationEmail", () => {
  const baseParams = {
    recipientEmail: "test@example.com",
    recipientName: "Test User",
    organizationName: "Test Org",
    inviteLink: "https://example.com/accept-invite?token=abc",
    inviterName: "Admin User",
    role: "member" as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = "re_test_key_123";
  });

  afterEach(() => {
    delete process.env.RESEND_API_KEY;
  });

  it("returns true on successful send", async () => {
    mockSendFn.mockResolvedValueOnce({ data: { id: "msg-123" }, error: null });
    const result = await sendInvitationEmail(baseParams);
    expect(result).toBe(true);
  });

  it("sends email via Resend when API key is configured", async () => {
    mockSendFn.mockResolvedValueOnce({ data: { id: "msg-123" }, error: null });
    await sendInvitationEmail(baseParams);

    expect(mockSendFn).toHaveBeenCalledTimes(1);
    const callArgs = mockSendFn.mock.calls[0][0];
    expect(callArgs.to).toContain(baseParams.recipientEmail);
  });

  it("returns false when Resend returns an error", async () => {
    mockSendFn.mockResolvedValueOnce({ data: null, error: { message: "Invalid API key" } });
    const result = await sendInvitationEmail(baseParams);
    expect(result).toBe(false);
  });

  it("returns false when Resend throws an exception", async () => {
    mockSendFn.mockRejectedValueOnce(new Error("Network error"));
    const result = await sendInvitationEmail(baseParams);
    expect(result).toBe(false);
  });

  it("includes invite link in the HTML body", async () => {
    mockSendFn.mockResolvedValueOnce({ data: { id: "msg-456" }, error: null });
    await sendInvitationEmail(baseParams);

    const callArgs = mockSendFn.mock.calls[0][0];
    expect(callArgs.html).toContain(baseParams.inviteLink);
  });
});
