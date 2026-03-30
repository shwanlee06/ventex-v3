/**
 * Email Router — tRPC procedures for sending transactional emails via Resend
 * Wraps the existing emailService functions with proper input validation.
 *
 * Types: invitation | task_overdue | stage_advance | distribution_notice
 * From: atlas@aurovia.com
 */
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { isAtlasTeam } from "../security/rbac";
import {
  sendTaskFollowUp,
  sendOverdueAutoEmail,
  sendReadyToAdvanceEmail,
  sendStageAdvancedEmail,
  sendDistributionNotice,
  sendClientNudge,
} from "../emailService";
import { Resend } from "resend";

const FROM_ADDRESS = "ATLAS <atlas@aurovia.com>";
const REPLY_TO = "slee72106@gmail.com";

// ── Shared Styles for invitation email ──────────────────────────────────
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

function invitationEmailHtml(params: {
  recipientName: string;
  inviterName: string;
  orgName: string;
  role: string;
  inviteLink: string;
}): string {
  const roleLabel = params.role.charAt(0).toUpperCase() + params.role.slice(1);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="${BODY_STYLE}"><div style="${CONTAINER_STYLE}">
  <div style="${HEADER_STYLE}"><span style="${HEADER_TEXT}">${SIGNATURE}</span></div>
  <p style="${P_STYLE}">Hi ${params.recipientName},</p>
  <p style="${P_STYLE}">${params.inviterName} has added you to ${params.orgName}'s portfolio on ATLAS.</p>
  <div style="${CARD_STYLE}">
    <div style="${LABEL_STYLE}">Your Role</div>
    <div style="${VALUE_STYLE}">${roleLabel}</div>
    <div style="${LABEL_STYLE}">Organization</div>
    <div style="${VALUE_STYLE}">${params.orgName}</div>
  </div>
  <p style="margin: 24px 0;"><a href="${params.inviteLink}" style="${BUTTON_STYLE}">Set up your access →</a></p>
  <div style="${FOOTER_STYLE}"><p style="${FOOTER_TEXT}">${SIGNATURE}</p></div>
</div></body></html>`;
}

export const emailRouter = router({
  /**
   * email.send — Unified email sending mutation
   * Accepts: { to, subject, body, type }
   * Types: 'invitation' | 'task_overdue' | 'stage_advance' | 'distribution_notice'
   */
  send: protectedProcedure
    .input(
      z.object({
        to: z.union([z.string().email(), z.array(z.string().email())]),
        subject: z.string().min(1).max(500),
        body: z.string().optional(),
        type: z.enum(["invitation", "task_overdue", "stage_advance", "distribution_notice"]),
        // Additional context fields for template rendering
        context: z
          .object({
            // Invitation
            recipientName: z.string().optional(),
            inviterName: z.string().optional(),
            orgName: z.string().optional(),
            role: z.string().optional(),
            inviteLink: z.string().optional(),
            // Task overdue
            assigneeName: z.string().optional(),
            taskTitle: z.string().optional(),
            ventureName: z.string().optional(),
            stage: z.string().optional(),
            daysOverdue: z.number().optional(),
            deadlineDate: z.string().optional(),
            dueDate: z.string().optional(),
            agentNote: z.string().optional(),
            // Stage advance
            contactName: z.string().optional(),
            currentStage: z.string().optional(),
            nextStage: z.string().optional(),
            completedSteps: z.array(z.string()).optional(),
            previousStage: z.string().optional(),
            newStage: z.string().optional(),
            daysInPreviousStage: z.number().optional(),
            clientAvgDays: z.number().optional(),
            nextBlockingSteps: z.array(z.string()).optional(),
            // Distribution
            fundName: z.string().optional(),
            amount: z.string().optional(),
            currency: z.string().optional(),
            distributionDate: z.string().optional(),
            draftBody: z.string().optional(),
            // Generic
            actionUrl: z.string().optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Only ATLAS team can send emails
      if (!isAtlasTeam(ctx.user)) {
        return { success: false, error: "Unauthorized — ATLAS team only" };
      }

      const resend = new Resend(process.env.RESEND_API_KEY || "");
      if (!process.env.RESEND_API_KEY) {
        return { success: false, error: "RESEND_API_KEY not configured" };
      }

      const c = input.context || {};
      const toAddr = Array.isArray(input.to) ? input.to : [input.to];

      try {
        switch (input.type) {
          case "invitation": {
            // Use invitation template
            const html = invitationEmailHtml({
              recipientName: c.recipientName || "there",
              inviterName: c.inviterName || ctx.user.name || "ATLAS Admin",
              orgName: c.orgName || "ATLAS",
              role: c.role || "client",
              inviteLink: c.inviteLink || c.actionUrl || "",
            });
            const { data, error } = await resend.emails.send({
              from: FROM_ADDRESS,
              to: toAddr,
              replyTo: REPLY_TO,
              subject: input.subject || `You've been invited to ${c.orgName || "ATLAS"} on ATLAS`,
              html,
            });
            if (error) return { success: false, error: error.message };
            return { success: true, messageId: data?.id };
          }

          case "task_overdue": {
            const result = await sendOverdueAutoEmail({
              to: toAddr[0],
              assigneeName: c.assigneeName || "Team Member",
              taskTitle: c.taskTitle || input.subject,
              ventureName: c.ventureName || "",
              stage: c.stage || "",
              daysOverdue: c.daysOverdue || 0,
              deadlineDate: c.deadlineDate || "",
              actionUrl: c.actionUrl,
            });
            return result;
          }

          case "stage_advance": {
            // Use ready-to-advance or stage-advanced depending on context
            if (c.newStage && c.previousStage) {
              // Stage already advanced
              const result = await sendStageAdvancedEmail({
                to: toAddr[0],
                contactName: c.contactName || "there",
                ventureName: c.ventureName || "",
                previousStage: c.previousStage || "",
                newStage: c.newStage || "",
                daysInPreviousStage: c.daysInPreviousStage || 0,
                clientAvgDays: c.clientAvgDays,
                nextBlockingSteps: c.nextBlockingSteps || [],
                actionUrl: c.actionUrl,
              });
              return result;
            } else {
              // Ready to advance
              const result = await sendReadyToAdvanceEmail({
                to: toAddr[0],
                contactName: c.contactName || "there",
                ventureName: c.ventureName || "",
                currentStage: c.currentStage || "",
                nextStage: c.nextStage || "",
                completedSteps: c.completedSteps || [],
                actionUrl: c.actionUrl,
              });
              return result;
            }
          }

          case "distribution_notice": {
            const result = await sendDistributionNotice({
              to: toAddr,
              recipientName: c.recipientName || c.contactName || "Investor",
              fundName: c.fundName || "",
              amount: c.amount || "0",
              currency: c.currency,
              distributionDate: c.distributionDate,
              draftBody: c.draftBody || input.body || "",
              actionUrl: c.actionUrl,
            });
            return result;
          }

          default: {
            // Generic send with custom body
            const { data, error } = await resend.emails.send({
              from: FROM_ADDRESS,
              to: toAddr,
              replyTo: REPLY_TO,
              subject: input.subject,
              html: input.body || "",
            });
            if (error) return { success: false, error: error.message };
            return { success: true, messageId: data?.id };
          }
        }
      } catch (err: any) {
        console.error("[EmailRouter] Send failed:", err);
        return { success: false, error: err.message || "Email send failed" };
      }
    }),

  /**
   * email.sendTest — Send a test email to verify Resend configuration
   */
  sendTest: protectedProcedure
    .input(z.object({ to: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      if (!isAtlasTeam(ctx.user)) {
        return { success: false, error: "Unauthorized" };
      }
      const resend = new Resend(process.env.RESEND_API_KEY || "");
      if (!process.env.RESEND_API_KEY) {
        return { success: false, error: "RESEND_API_KEY not configured" };
      }
      try {
        const { data, error } = await resend.emails.send({
          from: FROM_ADDRESS,
          to: input.to,
          replyTo: REPLY_TO,
          subject: "ATLAS — Email Configuration Test",
          html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="${BODY_STYLE}"><div style="${CONTAINER_STYLE}">
  <div style="${HEADER_STYLE}"><span style="${HEADER_TEXT}">${SIGNATURE}</span></div>
  <p style="${P_STYLE}">This is a test email from ATLAS to confirm your Resend integration is working.</p>
  <p style="${P_STYLE}">Sent by: ${ctx.user.name || "ATLAS Admin"}</p>
  <p style="${P_STYLE}">Timestamp: ${new Date().toISOString()}</p>
  <div style="${FOOTER_STYLE}"><p style="${FOOTER_TEXT}">${SIGNATURE}</p></div>
</div></body></html>`,
        });
        if (error) return { success: false, error: error.message };
        return { success: true, messageId: data?.id };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }),
});
