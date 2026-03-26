/**
 * Invitation Email Helper
 * Sends invitation emails to team members via the Manus notification service.
 * The notification goes to the project owner, who can then forward or the system
 * can be configured to send directly.
 */

import { notifyOwner } from "./_core/notification";

interface SendInvitationEmailParams {
  recipientEmail: string;
  recipientName: string;
  role: string;
  inviterName: string;
  inviteLink: string;
  organizationName?: string;
  expiresInDays?: number;
}

/**
 * Send an invitation email notification.
 * Uses the Manus notification service to alert the owner about the invitation.
 * The notification includes the invite link that can be forwarded to the invitee.
 */
export async function sendInvitationEmail(params: SendInvitationEmailParams): Promise<boolean> {
  const {
    recipientEmail,
    recipientName,
    role,
    inviterName,
    inviteLink,
    organizationName = "ATLAS / Royalton",
    expiresInDays = 30,
  } = params;

  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);

  const title = `New Invitation: ${recipientName} (${roleLabel})`;

  const content = [
    `**${inviterName}** has invited **${recipientName}** to join the Royalton System as a **${roleLabel}**.`,
    ``,
    `**Details:**`,
    `- **Name:** ${recipientName}`,
    `- **Email:** ${recipientEmail}`,
    `- **Role:** ${roleLabel}`,
    `- **Organization:** ${organizationName}`,
    `- **Expires:** ${expiresInDays} days`,
    ``,
    `**Invitation Link:**`,
    `${inviteLink}`,
    ``,
    `Forward this link to ${recipientName} so they can accept the invitation and set up their account.`,
  ].join("\n");

  try {
    const sent = await notifyOwner({ title, content });
    if (sent) {
      console.log(`[InvitationEmail] Notification sent for ${recipientEmail}`);
    } else {
      console.warn(`[InvitationEmail] Notification service unavailable for ${recipientEmail}`);
    }
    return sent;
  } catch (err) {
    console.error(`[InvitationEmail] Failed to send notification for ${recipientEmail}:`, err);
    return false;
  }
}

/**
 * Build the invitation acceptance URL.
 * @param origin - The frontend origin (e.g., https://royaltonai.manus.space)
 * @param token - The invitation token
 */
export function buildInviteLink(origin: string, token: string): string {
  return `${origin}/accept-invite?token=${encodeURIComponent(token)}`;
}
