/**
 * Email Service — Resend Integration
 * Sends transactional emails for agent-driven velocity mechanics.
 *
 * ORIGINAL (manual/action-flow):
 * 1. Task follow-up (to assignee — via client action modal)
 * 2. LP distribution notice (to LP investors — via client action modal)
 * 3. Client nudge (operator escalation)
 *
 * AUTO-TRIGGERS (no human approval needed):
 * Trigger 1: Task overdue > 3 days → email assignee directly
 * Trigger 2: Venture ready to advance → email client primary contact
 * Trigger 3: Stage advance confirmed → email client primary contact
 */

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "");

const FROM_ADDRESS = "ATLAS <contact@aurovia.co>";
const REPLY_TO = "slee72106@gmail.com"; // Operator: Shwan Lee


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


interface OverdueAutoEmailParams {
  to: string;
  assigneeName: string;
  taskTitle: string;
  ventureName: string;
  stage: string;
  daysOverdue: number;
  deadlineDate: string; // 48 hours from now
  actionUrl?: string;
}

interface ReadyToAdvanceEmailParams {
  to: string;
  contactName: string;
  ventureName: string;
  currentStage: string;
  nextStage: string;
  completedSteps: string[];
  actionUrl?: string;
}

interface StageAdvancedEmailParams {
  to: string;
  contactName: string;
  ventureName: string;
  previousStage: string;
  newStage: string;
  daysInPreviousStage: number;
  clientAvgDays?: number | null;
  nextBlockingSteps: string[];
  actionUrl?: string;
}


const BODY_STYLE = `font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; background: #fafafa; color: #1a1a1a; padding: 40px 20px; margin: 0; line-height: 1.6;`;
const CONTAINER_STYLE = `max-width: 560px; margin: 0 auto;`;
const HEADER_STYLE = `border-bottom: 1px solid #e5e5e5; padding-bottom: 12px; margin-bottom: 28px;`;
const HEADER_TEXT = `font-size: 11px; letter-spacing: 0.08em; color: #999; text-transform: uppercase;`;
const P_STYLE = `font-size: 15px; color: #333; margin: 0 0 16px; line-height: 1.6;`;
const CARD_STYLE = `background: #f5f5f5; border: 1px solid #e5e5e5; border-radius: 8px; padding: 20px; margin-bottom: 24px;`;
const LABEL_STYLE = `font-size: 12px; color: #999; margin-bottom: 2px;`;
const VALUE_STYLE = `font-size: 15px; font-weight: 500; color: #1a1a1a; margin-bottom: 12px;`;
const BUTTON_STYLE = `display: inline-block; background: #1a1a1a; color: #ffffff; padding: 12px 28px; border-radius: 6px; font-size: 14px; font-weight: 500; text-decoration: none;`;
const FOOTER_STYLE = `border-top: 1px solid #e5e5e5; margin-top: 32px; padding-top: 16px;`;
const FOOTER_TEXT = `font-size: 12px; color: #999; margin: 0;`;
const SIGNATURE = `ATLAS · Powered by Aurovia`;


function taskFollowUpHtml(params: TaskFollowUpParams): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="${BODY_STYLE}"><div style="${CONTAINER_STYLE}">
  <div style="${HEADER_STYLE}"><span style="${HEADER_TEXT}">${SIGNATURE}</span></div>
  <p style="${P_STYLE}">Hi ${params.assigneeName},</p>
  <div style="${CARD_STYLE}">
    <div style="${LABEL_STYLE}">Task</div>
    <div style="${VALUE_STYLE}">${params.taskTitle}</div>
    <div style="${LABEL_STYLE}">Venture</div>
    <div style="${VALUE_STYLE}">${params.ventureName}</div>
    ${params.dueDate ? `<div style="${LABEL_STYLE}">Due Date</div><div style="font-size: 14px; color: #d97706;">${params.dueDate}</div>` : ""}
  </div>
  <div style="background: #f0fdf4; border-left: 3px solid #22c55e; padding: 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
    <div style="font-size: 11px; letter-spacing: 0.06em; color: #16a34a; text-transform: uppercase; margin-bottom: 8px;">Agent Note</div>
    <p style="font-size: 14px; color: #333; margin: 0; line-height: 1.5;">${params.agentNote}</p>
  </div>
  ${params.actionUrl ? `<a href="${params.actionUrl}" style="${BUTTON_STYLE}">Take Action →</a>` : ""}
  <div style="${FOOTER_STYLE}"><p style="${FOOTER_TEXT}">${SIGNATURE}</p></div>
</div></body></html>`;
}

function distributionNoticeHtml(params: DistributionNoticeParams): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="${BODY_STYLE}"><div style="${CONTAINER_STYLE}">
  <div style="${HEADER_STYLE}"><span style="${HEADER_TEXT}">ATLAS</span></div>
  <p style="font-size: 18px; font-weight: 600; color: #1a1a1a; margin: 0 0 8px;">Distribution Notice</p>
  <p style="${P_STYLE}">Dear ${params.recipientName},</p>
  <div style="${CARD_STYLE}">
    <div style="${LABEL_STYLE}">Fund</div>
    <div style="${VALUE_STYLE}">${params.fundName}</div>
    <div style="${LABEL_STYLE}">Amount</div>
    <div style="font-size: 22px; font-weight: 600; color: #16a34a; font-variant-numeric: tabular-nums; margin-bottom: 12px;">${params.currency || "$"}${params.amount}</div>
    ${params.distributionDate ? `<div style="${LABEL_STYLE}">Distribution Date</div><div style="font-size: 14px; color: #333;">${params.distributionDate}</div>` : ""}
  </div>
  <div style="font-size: 14px; color: #333; line-height: 1.6; margin-bottom: 24px; white-space: pre-line;">${params.draftBody}</div>
  ${params.actionUrl ? `<a href="${params.actionUrl}" style="${BUTTON_STYLE}">View Details →</a>` : ""}
  <div style="${FOOTER_STYLE}"><p style="${FOOTER_TEXT}">ATLAS · Powered by Aurovia</p></div>
</div></body></html>`;
}

function clientNudgeHtml(params: ClientNudgeParams): string {
  const itemsList = params.topItems.map(item => `<li style="margin-bottom: 8px; font-size: 14px; color: #333;">${item}</li>`).join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="${BODY_STYLE}"><div style="${CONTAINER_STYLE}">
  <div style="${HEADER_STYLE}"><span style="${HEADER_TEXT}">${SIGNATURE}</span></div>
  <p style="font-size: 18px; font-weight: 600; color: #1a1a1a; margin: 0 0 8px;">Action Required — ${params.clientName}</p>
  <p style="${P_STYLE}">Hi ${params.contactName},</p>
  <p style="${P_STYLE}">You have <strong style="color: #d97706;">${params.unactionedCount} item${params.unactionedCount > 1 ? "s" : ""}</strong> awaiting your attention. These have been pending for over 48 hours.</p>
  <div style="${CARD_STYLE}">
    <div style="font-size: 11px; letter-spacing: 0.06em; color: #d97706; text-transform: uppercase; margin-bottom: 12px;">Pending Items</div>
    <ul style="margin: 0; padding-left: 16px;">${itemsList}</ul>
  </div>
  ${params.actionUrl ? `<a href="${params.actionUrl}" style="${BUTTON_STYLE}">View Dashboard →</a>` : ""}
  <div style="${FOOTER_STYLE}"><p style="${FOOTER_TEXT}">${SIGNATURE}</p></div>
</div></body></html>`;
}


/**
 * TRIGGER 1: Task overdue > 3 days — direct email to assignee
 * Plain, direct, professional. No marketing language.
 */
function overdueAutoEmailHtml(params: OverdueAutoEmailParams): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="${BODY_STYLE}"><div style="${CONTAINER_STYLE}">
  <div style="${HEADER_STYLE}"><span style="${HEADER_TEXT}">${SIGNATURE}</span></div>
  <p style="${P_STYLE}">Hi ${params.assigneeName},</p>
  <p style="${P_STYLE}">${params.taskTitle} on ${params.ventureName} is now <strong>${params.daysOverdue} days</strong> past its due date.</p>
  <p style="${P_STYLE}">This is a blocking item for ${params.ventureName}'s progress in ${params.stage}.</p>
  <p style="${P_STYLE}">Please update the status or reassign by <strong>${params.deadlineDate}</strong>.</p>
  ${params.actionUrl ? `<p style="margin: 24px 0;"><a href="${params.actionUrl}" style="${BUTTON_STYLE}">View Task in ATLAS →</a></p>` : ""}
  <div style="${FOOTER_STYLE}"><p style="${FOOTER_TEXT}">${SIGNATURE}</p></div>
</div></body></html>`;
}

/**
 * TRIGGER 2: Venture ready to advance — email client primary contact
 * Shows completed blocking steps with checkmarks.
 */
function readyToAdvanceEmailHtml(params: ReadyToAdvanceEmailParams): string {
  const stepsList = params.completedSteps
    .map(step => `<div style="font-size: 14px; color: #333; padding: 6px 0;"><span style="color: #16a34a; margin-right: 8px;">✓</span>${step}</div>`)
    .join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="${BODY_STYLE}"><div style="${CONTAINER_STYLE}">
  <div style="${HEADER_STYLE}"><span style="${HEADER_TEXT}">${SIGNATURE}</span></div>
  <p style="${P_STYLE}">Hi ${params.contactName},</p>
  <p style="${P_STYLE}">${params.ventureName} has completed all required ${params.currentStage} steps and is ready to move to ${params.nextStage}.</p>
  <div style="${CARD_STYLE}">${stepsList}</div>
  ${params.actionUrl ? `<p style="margin: 24px 0;"><a href="${params.actionUrl}" style="${BUTTON_STYLE}">Advance Stage in ATLAS →</a></p>` : ""}
  <div style="${FOOTER_STYLE}"><p style="${FOOTER_TEXT}">${SIGNATURE}</p></div>
</div></body></html>`;
}

/**
 * TRIGGER 3: Stage advance confirmed — email client primary contact
 * Shows time in stage, benchmark comparison, and next steps.
 */
function stageAdvancedEmailHtml(params: StageAdvancedEmailParams): string {
  const benchmarkLine = params.clientAvgDays
    ? `<p style="${P_STYLE}">Your average: ${params.clientAvgDays} days</p>`
    : "";

  const nextStepsList = params.nextBlockingSteps.length > 0
    ? params.nextBlockingSteps.map(step => `<div style="font-size: 14px; color: #333; padding: 4px 0;">· ${step}</div>`).join("")
    : `<div style="font-size: 14px; color: #999; padding: 4px 0;">No blocking steps defined yet</div>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="${BODY_STYLE}"><div style="${CONTAINER_STYLE}">
  <div style="${HEADER_STYLE}"><span style="${HEADER_TEXT}">${SIGNATURE}</span></div>
  <p style="${P_STYLE}">Hi ${params.contactName},</p>
  <p style="${P_STYLE}">ATLAS has advanced ${params.ventureName} from ${params.previousStage} to <strong>${params.newStage}</strong>.</p>
  <div style="${CARD_STYLE}">
    <div style="${LABEL_STYLE}">Time in ${params.previousStage}</div>
    <div style="font-size: 22px; font-weight: 600; color: #1a1a1a; margin-bottom: 8px;">${params.daysInPreviousStage} days</div>
    ${benchmarkLine}
  </div>
  <div style="margin-bottom: 24px;">
    <div style="font-size: 12px; color: #999; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px;">Next Steps</div>
    ${nextStepsList}
  </div>
  ${params.actionUrl ? `<p style="margin: 24px 0;"><a href="${params.actionUrl}" style="${BUTTON_STYLE}">View Venture →</a></p>` : ""}
  <div style="${FOOTER_STYLE}"><p style="${FOOTER_TEXT}">${SIGNATURE}</p></div>
</div></body></html>`;
}


export async function sendTaskFollowUp(params: TaskFollowUpParams): Promise<EmailResult> {
  if (!process.env.RESEND_API_KEY) {
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
    return { success: true, messageId: data?.id };
  } catch (err: any) {
    console.error("[EmailService] Task follow-up error:", err);
    return { success: false, error: err.message };
  }
}

export async function sendDistributionNotice(params: DistributionNoticeParams): Promise<EmailResult> {
  if (!process.env.RESEND_API_KEY) {
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
    return { success: true, messageId: data?.id };
  } catch (err: any) {
    console.error("[EmailService] Distribution notice error:", err);
    return { success: false, error: err.message };
  }
}

export async function sendClientNudge(params: ClientNudgeParams): Promise<EmailResult> {
  if (!process.env.RESEND_API_KEY) {
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
    return { success: true, messageId: data?.id };
  } catch (err: any) {
    console.error("[EmailService] Client nudge error:", err);
    return { success: false, error: err.message };
  }
}


/**
 * TRIGGER 1: Send overdue task email directly to assignee
 * Fires when task is > 3 days overdue, with 7-day cooldown
 */
export async function sendOverdueAutoEmail(params: OverdueAutoEmailParams): Promise<EmailResult> {
  if (!process.env.RESEND_API_KEY) {
    return { success: false, error: "RESEND_API_KEY not configured" };
  }
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: params.to,
      replyTo: REPLY_TO,
      subject: `Action needed: ${params.taskTitle} — ${params.ventureName}`,
      html: overdueAutoEmailHtml(params),
    });
    if (error) {
      console.error("[EmailService] Overdue auto-email failed:", error);
      return { success: false, error: error.message };
    }
    return { success: true, messageId: data?.id };
  } catch (err: any) {
    console.error("[EmailService] Overdue auto-email error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * TRIGGER 2: Send "ready to advance" email to client primary contact
 * Fires when all blocking milestones are complete
 */
export async function sendReadyToAdvanceEmail(params: ReadyToAdvanceEmailParams): Promise<EmailResult> {
  if (!process.env.RESEND_API_KEY) {
    return { success: false, error: "RESEND_API_KEY not configured" };
  }
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: params.to,
      replyTo: REPLY_TO,
      subject: `${params.ventureName} is ready to advance to ${params.nextStage}`,
      html: readyToAdvanceEmailHtml(params),
    });
    if (error) {
      console.error("[EmailService] Ready-to-advance email failed:", error);
      return { success: false, error: error.message };
    }
    return { success: true, messageId: data?.id };
  } catch (err: any) {
    console.error("[EmailService] Ready-to-advance email error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * TRIGGER 3: Send "stage advanced" confirmation email to client primary contact
 * Fires on every stage advance (auto or manual)
 */
export async function sendStageAdvancedEmail(params: StageAdvancedEmailParams): Promise<EmailResult> {
  if (!process.env.RESEND_API_KEY) {
    return { success: false, error: "RESEND_API_KEY not configured" };
  }
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: params.to,
      replyTo: REPLY_TO,
      subject: `${params.ventureName} has advanced to ${params.newStage}`,
      html: stageAdvancedEmailHtml(params),
    });
    if (error) {
      console.error("[EmailService] Stage-advanced email failed:", error);
      return { success: false, error: error.message };
    }
    return { success: true, messageId: data?.id };
  } catch (err: any) {
    console.error("[EmailService] Stage-advanced email error:", err);
    return { success: false, error: err.message };
  }
}
