/**
 * Tests for invitationEmail.ts helper:
 * 1. buildInviteLink constructs correct URLs
 * 2. sendInvitationEmail calls Resend when API key is present
 * 3. sendInvitationEmail gracefully handles missing API key
 * 4. sendInvitationEmail gracefully handles Resend errors
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We need to mock the Resend module before importing the helper
vi.mock("resend", () => {
  const sendFn = vi.fn();
  return {
    Resend: vi.fn().mockImplementation(() => ({
      emails: { send: sendFn },
    })),
    __mockSendFn: sendFn,
  };
});

// Also mock notifyOwner so it doesn't make real HTTP calls
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

import { sendInvitationEmail, buildInviteLink } from "./invitationEmail";
import { Resend } from "resend";
import { notifyOwner } from "./_core/notification";

// Access the mock send function
const mockSendFn = (await import("resend") as any).__mockSendFn;

describe("buildInviteLink", () => {
  it("constructs a valid invite URL with token", () => {
    const link = buildInviteLink("https://royaltonai.manus.space", "abc123token");
    expect(link).toBe("https://royaltonai.manus.space/accept-invite?token=abc123token");
  });

  it("encodes special characters in token", () => {
    const link = buildInviteLink("https://example.com", "token+with/special=chars");
    expect(link).toContain("/accept-invite?token=");
    expect(link).toContain(encodeURIComponent("token+with/special=chars"));
  });

  it("works with different origins", () => {
    const link = buildInviteLink("http://localhost:3000", "mytoken");
    expect(link).toBe("http://localhost:3000/accept-invite?token=mytoken");
  });
});

describe("sendInvitationEmail", () => {
  const baseParams = {
    recipientEmail: "invitee@example.com",
    recipientName: "Test User",
    role: "partner",
    inviterName: "Admin User",
    inviteLink: "https://example.com/accept-invite?token=abc123",
    organizationName: "Test Org",
    expiresInDays: 30,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore RESEND_API_KEY if it was modified
  });

  it("sends email via Resend when API key is configured", async () => {
    const origKey = process.env.RESEND_API_KEY;
    process.env.RESEND_API_KEY = "re_test_key_123";

    mockSendFn.mockResolvedValueOnce({
      data: { id: "msg_test_123" },
      error: null,
    });

    const result = await sendInvitationEmail(baseParams);

    expect(result).toBe(true);
    expect(mockSendFn).toHaveBeenCalledTimes(1);

    const callArgs = mockSendFn.mock.calls[0][0];
    expect(callArgs.to).toBe("invitee@example.com");
    expect(callArgs.from).toContain("ATLAS");
    expect(callArgs.subject).toContain("Test Org");
    expect(callArgs.html).toContain("Test User");
    expect(callArgs.html).toContain("Admin User");
    expect(callArgs.html).toContain("Test Org");
    expect(callArgs.html).toContain("Partner"); // capitalized role

    // Also notifies owner
    expect(notifyOwner).toHaveBeenCalledTimes(1);

    process.env.RESEND_API_KEY = origKey;
  });

  it("returns false when RESEND_API_KEY is not configured", async () => {
    const origKey = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;

    const result = await sendInvitationEmail(baseParams);

    expect(result).toBe(false);
    expect(mockSendFn).not.toHaveBeenCalled();

    // Still notifies owner with fallback message
    expect(notifyOwner).toHaveBeenCalledTimes(1);

    process.env.RESEND_API_KEY = origKey;
  });

  it("returns false when Resend returns an error", async () => {
    const origKey = process.env.RESEND_API_KEY;
    process.env.RESEND_API_KEY = "re_test_key_123";

    mockSendFn.mockResolvedValueOnce({
      data: null,
      error: { message: "Invalid API key" },
    });

    const result = await sendInvitationEmail(baseParams);

    expect(result).toBe(false);
    expect(mockSendFn).toHaveBeenCalledTimes(1);

    process.env.RESEND_API_KEY = origKey;
  });

  it("returns false when Resend throws an exception", async () => {
    const origKey = process.env.RESEND_API_KEY;
    process.env.RESEND_API_KEY = "re_test_key_123";

    mockSendFn.mockRejectedValueOnce(new Error("Network error"));

    const result = await sendInvitationEmail(baseParams);

    expect(result).toBe(false);
    expect(mockSendFn).toHaveBeenCalledTimes(1);

    process.env.RESEND_API_KEY = origKey;
  });

  it("uses default organization name when not provided", async () => {
    const origKey = process.env.RESEND_API_KEY;
    process.env.RESEND_API_KEY = "re_test_key_123";

    mockSendFn.mockResolvedValueOnce({
      data: { id: "msg_test_456" },
      error: null,
    });

    const result = await sendInvitationEmail({
      recipientEmail: "user@example.com",
      recipientName: "User",
      role: "user",
      inviterName: "Admin",
      inviteLink: "https://example.com/accept-invite?token=xyz",
      // No organizationName — should default
    });

    expect(result).toBe(true);
    const callArgs = mockSendFn.mock.calls[0][0];
    expect(callArgs.subject).toContain("ATLAS");

    process.env.RESEND_API_KEY = origKey;
  });

  it("includes invite link in the HTML body", async () => {
    const origKey = process.env.RESEND_API_KEY;
    process.env.RESEND_API_KEY = "re_test_key_123";

    mockSendFn.mockResolvedValueOnce({
      data: { id: "msg_test_789" },
      error: null,
    });

    await sendInvitationEmail(baseParams);

    const callArgs = mockSendFn.mock.calls[0][0];
    expect(callArgs.html).toContain(baseParams.inviteLink);

    process.env.RESEND_API_KEY = origKey;
  });
});
