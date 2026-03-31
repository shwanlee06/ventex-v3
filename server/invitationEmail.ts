/**
 * Invitation Email Helper
 * Sends invitation emails directly to invitees via Resend.
 * Also notifies the project owner as a secondary alert.
 */

import { Resend } from "resend";
import { notifyOwner } from "./_core/notification";

const FROM_ADDRESS = "ATLAS <contact@aurovia.co>";
const REPLY_TO = "slee72106@gmail.com";

// ── Shared Styles ──────────────────────────────────────────────────────
const BODY_STYLE = `font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; background: #0a0a0a; color: #fafafa; padding: 40px 20px; margin: 0; line-height: 1.6;`;
const CONTAINER_STYLE = `max-width: 560px; margin: 0 auto;`;
const HEADER_STYLE = `border-bottom: 1px solid #333; padding-bottom: 12px; margin-bottom: 28px;`;
const HEADER_TEXT = `font-size: 11px; letter-spacing: 0.08em; color: #666; text-transform: uppercase;`;
const P_STYLE = `font-size: 15px; color: #ccc; margin: 0 0 16px; line-height: 1.6;`;
const CARD_STYLE = `background: #141414; border: 1px solid #333; border-radius: 8px; padding: 20px; margin-bottom: 24px;`;
const LABEL_STYLE = `font-size: 12px; color: #666; margin-bottom: 2px;`;
const VALUE_STYLE = `font-size: 15px; font-weight: 500; color: #fafafa; margin-bottom: 12px;`;
const BUTTON_STYLE = `display: inline-block; background: #fafafa; color: #0a0a0a; padding: 12px 28px; border-radius: 6px; font-size: 14px; font-weight: 600; text-decoration: none; letter-spacing: 0.02em;`;
const FOOTER_STYLE = `border-top: 1px solid #333; margin-top: 32px; padding-top: 16px;`;
const FOOTER_TEXT = `font-size: 12px; color: #666; margin: 0;`;
const SIGNATURE = `ATLAS · Powered by Aurovia`;

interface SendInvitationEmailParams {
  recipientEmail: string;
  recipientName: string;
  role: string;
  inviterName: string;
  inviteLink: string;
  organizationName?: string;
  expiresInDays?: number;
}

function buildInvitationHtml(params: {
  recipientName: string;
  inviterName: string;
  orgName: string;
  role: string;
  inviteLink: string;
  expiresInDays: number;
}): string {
  const roleLabel = params.role.charAt(0).toUpperCase() + params.role.slice(1);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="${BODY_STYLE}"><div style="${CONTAINER_STYLE}">
  <div style="${HEADER_STYLE}"><span style="${HEADER_TEXT}">${SIGNATURE}</span></div>
  <p style="${P_STYLE}">Hi ${params.recipientName},</p>
  <p style="${P_STYLE}"><strong style="color:#fafafa">${params.inviterName}</strong> has invited you to join <strong style="color:#fafafa">${params.orgName}</strong> on the ATLAS Venture Intelligence platform.</p>
  <div style="${CARD_STYLE}">
    <div style="${LABEL_STYLE}">Your Role</div>
    <div style="${VALUE_STYLE}">${roleLabel}</div>
    <div style="${LABEL_STYLE}">Organization</div>
    <div style="${VALUE_STYLE}">${params.orgName}</div>
    <div style="${LABEL_STYLE}">Expires</div>
    <div style="${VALUE_STYLE}">${params.expiresInDays} days</div>
  </div>
  <p style="margin: 24px 0; text-align: center;"><a href="${params.inviteLink}" style="${BUTTON_STYLE}">Accept Invitation →</a></p>
  <p style="${P_STYLE}; font-size: 13px; color: #666;">If the button doesn't work, copy and paste this link into your browser:</p>
  <p style="${P_STYLE}; font-size: 13px; color: #888; word-break: break-all;">${params.inviteLink}</p>
  <div style="${FOOTER_STYLE}"><p style="${FOOTER_TEXT}">${SIGNATURE}</p></div>
</div></body></html>`;
}

/**
 * Send an invitation email directly to the invitee via Resend.
 * Also sends a notification to the project owner as a secondary alert.
 */
export async function sendInvitationEmail(params: SendInvitationEmailParams): Promise<boolean> {
  const {
    recipientEmail,
    recipientName,
    role,
    inviterName,
    inviteLink,
    organizationName = "ATLAS",
    expiresInDays = 30,
  } = params;

  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);

  // 1. Send real email to the invitee via Resend
  let emailSent = false;
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const html = buildInvitationHtml({
        recipientName,
        inviterName,
        orgName: organizationName,
        role,
        inviteLink,
        expiresInDays,
      });

      const { data, error } = await resend.emails.send({
        from: FROM_ADDRESS,
        to: recipientEmail,
        replyTo: REPLY_TO,
        subject: `You've been invited to ${organizationName} on ATLAS`,
        html,
      });

      if (error) {
        console.error(`[InvitationEmail] Resend error for ${recipientEmail}:`, error.message);
      } else {
        emailSent = true;
        console.log(`[InvitationEmail] Email sent to ${recipientEmail} (id: ${data?.id})`);
      }
    } catch (err) {
      console.error(`[InvitationEmail] Failed to send email to ${recipientEmail}:`, err);
    }
  } else {
    console.warn(`[InvitationEmail] RESEND_API_KEY not configured — cannot send email to ${recipientEmail}`);
  }

  // 2. Also notify the project owner as a secondary alert
  try {
    const title = `New Invitation: ${recipientName} (${roleLabel})`;
    const content = [
      `**${inviterName}** invited **${recipientName}** (${recipientEmail}) to join as **${roleLabel}**.`,
      ``,
      emailSent
        ? `✅ Invitation email delivered to ${recipientEmail}`
        : `⚠️ Email delivery failed — share the link manually:`,
      ``,
      `**Invitation Link:** ${inviteLink}`,
    ].join("\n");

    await notifyOwner({ title, content });
  } catch (err) {
    // Non-critical — don't fail if owner notification fails
    console.error(`[InvitationEmail] Owner notification failed:`, err);
  }

  return emailSent;
}

/**
 * Build the invitation acceptance URL.
 * @param origin - The frontend origin (e.g., https://atlasventures.manus.space)
 * @param token - The invitation token
 */
export function buildInviteLink(origin: string, token: string): string {
  return `${origin}/accept-invite?token=${encodeURIComponent(token)}`;
}
