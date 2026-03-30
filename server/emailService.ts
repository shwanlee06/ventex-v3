/**
 * Email Service — Resend Integration
 * Sends transactional emails for agent-driven client actions.
 *
 * Email types:
 * 1. Task follow-up (to assignee)
 * 2. LP distribution notice (to LP investors)
 * 3. Client nudge (operator escalation)
 */

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "");

const FROM_ADDRESS = "ATLAS Velocity <onboarding@resend.dev>";
const REPLY_TO = "atlas@royaltonventures.com";

// ── Types ────────────────────────────────────────────────────────────────

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface TaskFollowUpParams {
  to: string;
  assigneeName: string;
  taskTitle: string;
  ventureName: string;
  dueDate?: string;
  agentNote: string;
  actionUrl?: string;
}

interface DistributionNoticeParams {
  to: string | string[];
  recipientName: string;
  fundName: string;
  amount: string;
  currency?: string;
  distributionDate?: string;
  draftBody: string;
  actionUrl?: string;
}

interface ClientNudgeParams {
  to: string;
  clientName: string;
  contactName: string;
  unactionedCount: number;
  topItems: string[];
  actionUrl?: string;
}

// ── Email Templates ──────────────────────────────────────────────────────

function taskFollowUpHtml(params: TaskFollowUpParams): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0a; color: #e5e5e5; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto;">
    <div style="border-bottom: 1px solid #262626; padding-bottom: 16px; margin-bottom: 24px;">
      <span style="font-size: 11px; letter-spacing: 0.08em; color: #737373; text-transform: uppercase;">ATLAS Velocity</span>
    </div>
    <h2 style="font-size: 18px; font-weight: 600; color: #f5f5f5; margin: 0 0 8px;">Task Follow-Up Required</h2>
    <p style="font-size: 14px; color: #a3a3a3; margin: 0 0 24px;">Hi ${params.assigneeName},</p>
    <div style="background: #171717; border: 1px solid #262626; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <div style="font-size: 13px; color: #737373; margin-bottom: 4px;">Task</div>
      <div style="font-size: 15px; font-weight: 500; color: #f5f5f5; margin-bottom: 12px;">${params.taskTitle}</div>
      <div style="font-size: 13px; color: #737373; margin-bottom: 4px;">Venture</div>
      <div style="font-size: 14px; color: #d4d4d4; margin-bottom: 12px;">${params.ventureName}</div>
      ${params.dueDate ? `<div style="font-size: 13px; color: #737373; margin-bottom: 4px;">Due Date</div><div style="font-size: 14px; color: #f59e0b;">${params.dueDate}</div>` : ""}
    </div>
    <div style="background: #0d1f1a; border-left: 3px solid #14b8a6; padding: 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
      <div style="font-size: 11px; letter-spacing: 0.06em; color: #14b8a6; text-transform: uppercase; margin-bottom: 8px;">Agent Note</div>
      <p style="font-size: 14px; color: #d4d4d4; margin: 0; line-height: 1.5;">${params.agentNote}</p>
    </div>
    ${params.actionUrl ? `<a href="${params.actionUrl}" style="display: inline-block; background: #14b8a6; color: #0a0a0a; padding: 10px 24px; border-radius: 6px; font-size: 14px; font-weight: 500; text-decoration: none;">Take Action</a>` : ""}
    <div style="border-top: 1px solid #262626; margin-top: 32px; padding-top: 16px;">
      <p style="font-size: 12px; color: #525252; margin: 0;">Sent by ATLAS Velocity AI on behalf of Royalton Venture Holding</p>
    </div>
  </div>
</body>
</html>`;
}

function distributionNoticeHtml(params: DistributionNoticeParams): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0a; color: #e5e5e5; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto;">
    <div style="border-bottom: 1px solid #262626; padding-bottom: 16px; margin-bottom: 24px;">
      <span style="font-size: 11px; letter-spacing: 0.08em; color: #737373; text-transform: uppercase;">Royalton Venture Holding</span>
    </div>
    <h2 style="font-size: 18px; font-weight: 600; color: #f5f5f5; margin: 0 0 8px;">Distribution Notice</h2>
    <p style="font-size: 14px; color: #a3a3a3; margin: 0 0 24px;">Dear ${params.recipientName},</p>
    <div style="background: #171717; border: 1px solid #262626; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <div style="font-size: 13px; color: #737373; margin-bottom: 4px;">Fund</div>
      <div style="font-size: 15px; font-weight: 500; color: #f5f5f5; margin-bottom: 12px;">${params.fundName}</div>
      <div style="font-size: 13px; color: #737373; margin-bottom: 4px;">Amount</div>
      <div style="font-size: 20px; font-weight: 600; color: #14b8a6; font-variant-numeric: tabular-nums; margin-bottom: 12px;">${params.currency || "$"}${params.amount}</div>
      ${params.distributionDate ? `<div style="font-size: 13px; color: #737373; margin-bottom: 4px;">Distribution Date</div><div style="font-size: 14px; color: #d4d4d4;">${params.distributionDate}</div>` : ""}
    </div>
    <div style="font-size: 14px; color: #d4d4d4; line-height: 1.6; margin-bottom: 24px; white-space: pre-line;">${params.draftBody}</div>
    ${params.actionUrl ? `<a href="${params.actionUrl}" style="display: inline-block; background: #14b8a6; color: #0a0a0a; padding: 10px 24px; border-radius: 6px; font-size: 14px; font-weight: 500; text-decoration: none;">View Details</a>` : ""}
    <div style="border-top: 1px solid #262626; margin-top: 32px; padding-top: 16px;">
      <p style="font-size: 12px; color: #525252; margin: 0;">This is an automated distribution notice from Royalton Venture Holding.</p>
    </div>
  </div>
</body>
</html>`;
}

function clientNudgeHtml(params: ClientNudgeParams): string {
  const itemsList = params.topItems.map(item => `<li style="margin-bottom: 8px; font-size: 14px; color: #d4d4d4;">${item}</li>`).join("");
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0a; color: #e5e5e5; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto;">
    <div style="border-bottom: 1px solid #262626; padding-bottom: 16px; margin-bottom: 24px;">
      <span style="font-size: 11px; letter-spacing: 0.08em; color: #737373; text-transform: uppercase;">ATLAS Velocity</span>
    </div>
    <h2 style="font-size: 18px; font-weight: 600; color: #f5f5f5; margin: 0 0 8px;">Action Required — ${params.clientName}</h2>
    <p style="font-size: 14px; color: #a3a3a3; margin: 0 0 24px;">Hi ${params.contactName},</p>
    <p style="font-size: 14px; color: #d4d4d4; line-height: 1.5; margin-bottom: 16px;">
      You have <strong style="color: #f59e0b;">${params.unactionedCount} item${params.unactionedCount > 1 ? "s" : ""}</strong> awaiting your attention in the Royalton System. These have been pending for over 48 hours.
    </p>
    <div style="background: #171717; border: 1px solid #262626; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <div style="font-size: 11px; letter-spacing: 0.06em; color: #f59e0b; text-transform: uppercase; margin-bottom: 12px;">Pending Items</div>
      <ul style="margin: 0; padding-left: 16px;">${itemsList}</ul>
    </div>
    ${params.actionUrl ? `<a href="${params.actionUrl}" style="display: inline-block; background: #14b8a6; color: #0a0a0a; padding: 10px 24px; border-radius: 6px; font-size: 14px; font-weight: 500; text-decoration: none;">View Dashboard</a>` : ""}
    <div style="border-top: 1px solid #262626; margin-top: 32px; padding-top: 16px;">
      <p style="font-size: 12px; color: #525252; margin: 0;">Sent by ATLAS on behalf of Royalton Venture Holding</p>
    </div>
  </div>
</body>
</html>`;
}

// ── Send Functions ───────────────────────────────────────────────────────

/**
 * Send a task follow-up email to an assignee
 */
export async function sendTaskFollowUp(params: TaskFollowUpParams): Promise<EmailResult> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[EmailService] RESEND_API_KEY not configured — skipping email");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: params.to,
      replyTo: REPLY_TO,
      subject: `Follow-Up: ${params.taskTitle} — ${params.ventureName}`,
      html: taskFollowUpHtml(params),
    });

    if (error) {
      console.error("[EmailService] Task follow-up failed:", error);
      return { success: false, error: error.message };
    }

    console.log(`[EmailService] Task follow-up sent to ${params.to}: ${data?.id}`);
    return { success: true, messageId: data?.id };
  } catch (err: any) {
    console.error("[EmailService] Task follow-up error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Send an LP distribution notice
 */
export async function sendDistributionNotice(params: DistributionNoticeParams): Promise<EmailResult> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[EmailService] RESEND_API_KEY not configured — skipping email");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: Array.isArray(params.to) ? params.to : [params.to],
      replyTo: REPLY_TO,
      subject: `Distribution Notice: ${params.fundName} — ${params.currency || "$"}${params.amount}`,
      html: distributionNoticeHtml(params),
    });

    if (error) {
      console.error("[EmailService] Distribution notice failed:", error);
      return { success: false, error: error.message };
    }

    console.log(`[EmailService] Distribution notice sent: ${data?.id}`);
    return { success: true, messageId: data?.id };
  } catch (err: any) {
    console.error("[EmailService] Distribution notice error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Send a client nudge email (operator escalation for unactioned items)
 */
export async function sendClientNudge(params: ClientNudgeParams): Promise<EmailResult> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[EmailService] RESEND_API_KEY not configured — skipping email");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: params.to,
      replyTo: REPLY_TO,
      subject: `Action Required: ${params.unactionedCount} pending item${params.unactionedCount > 1 ? "s" : ""} — ${params.clientName}`,
      html: clientNudgeHtml(params),
    });

    if (error) {
      console.error("[EmailService] Client nudge failed:", error);
      return { success: false, error: error.message };
    }

    console.log(`[EmailService] Client nudge sent to ${params.to}: ${data?.id}`);
    return { success: true, messageId: data?.id };
  } catch (err: any) {
    console.error("[EmailService] Client nudge error:", err);
    return { success: false, error: err.message };
  }
}
