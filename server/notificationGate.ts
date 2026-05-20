/**
 * Notification Gate — Checks user/org preferences before allowing email delivery.
 * 
 * This module sits between the email trigger points and the actual emailService.
 * It reads the user_preferences table to determine if a given notification category
 * is enabled for the target user/org before allowing the email to be sent.
 * 
 * Categories mapped to preference columns:
 * - "overdue"       → notifOverdue + emailNotifications
 * - "task"          → notifTaskComplete + emailNotifications
 * - "distribution"  → notifDistribution + emailNotifications
 * - "login"         → notifLogin + emailNotifications
 * - "nudge"         → emailNotifications (always on if email is enabled)
 * - "stage_advance" → emailNotifications (always on if email is enabled)
 */
import { getDb } from "./db";
import { userPreferences, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export type NotificationCategory = 
  | "overdue" 
  | "task" 
  | "distribution" 
  | "login" 
  | "nudge" 
  | "stage_advance"
  | "weekly";

interface GateResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Check if email delivery is allowed for a given recipient email and category.
 * Looks up the user by email, then checks their preferences.
 * 
 * If no user is found (external recipient), emails are always allowed.
 * If no preferences are saved, defaults to allowing emails.
 */
export async function checkEmailGate(
  recipientEmail: string,
  category: NotificationCategory
): Promise<GateResult> {
  const db = await getDb();
  if (!db) return { allowed: true, reason: "DB unavailable, allowing by default" };

  // Find user by email
  const userRows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, recipientEmail))
    .limit(1);

  if (userRows.length === 0) {
    // External recipient (LP investor, external contact) — always allow
    return { allowed: true, reason: "External recipient" };
  }

  const userId = userRows[0]!.id;

  // Get their preferences
  const prefRows = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);

  if (prefRows.length === 0) {
    // No preferences saved — use defaults (all enabled)
    return { allowed: true, reason: "No preferences saved, using defaults" };
  }

  const prefs = prefRows[0]!;

  // Master email toggle
  if (!prefs.emailNotifications) {
    return { allowed: false, reason: "Email notifications disabled by user" };
  }

  // Category-specific checks
  switch (category) {
    case "overdue":
      if (!prefs.notifOverdue) {
        return { allowed: false, reason: "Overdue notifications disabled" };
      }
      break;
    case "task":
      if (!prefs.notifTaskComplete) {
        return { allowed: false, reason: "Task notifications disabled" };
      }
      break;
    case "distribution":
      if (!prefs.notifDistribution) {
        return { allowed: false, reason: "Distribution notifications disabled" };
      }
      break;
    case "login":
      if (!prefs.notifLogin) {
        return { allowed: false, reason: "Login notifications disabled" };
      }
      break;
    case "weekly":
      if (!prefs.notifWeekly) {
        return { allowed: false, reason: "Weekly digest disabled" };
      }
      break;
    case "nudge":
    case "stage_advance":
      // These are always allowed if the master email toggle is on
      break;
  }

  return { allowed: true };
}

/**
 * Check if email delivery is allowed for a given org (checks the org owner's preferences).
 * Used by the escalation engine which sends to org.primaryContactEmail.
 */
export async function checkOrgEmailGate(
  organizationId: number,
  category: NotificationCategory
): Promise<GateResult> {
  const db = await getDb();
  if (!db) return { allowed: true, reason: "DB unavailable, allowing by default" };

  // Find the org owner/admin user
  const userRows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.organizationId, organizationId))
    .limit(1);

  if (userRows.length === 0) {
    return { allowed: true, reason: "No users in org, allowing by default" };
  }

  const userId = userRows[0]!.id;

  // Get their preferences
  const prefRows = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);

  if (prefRows.length === 0) {
    return { allowed: true, reason: "No preferences saved, using defaults" };
  }

  const prefs = prefRows[0]!;

  if (!prefs.emailNotifications) {
    return { allowed: false, reason: "Email notifications disabled for org" };
  }

  switch (category) {
    case "overdue":
      if (!prefs.notifOverdue) return { allowed: false, reason: "Overdue notifications disabled" };
      break;
    case "task":
      if (!prefs.notifTaskComplete) return { allowed: false, reason: "Task notifications disabled" };
      break;
    case "distribution":
      if (!prefs.notifDistribution) return { allowed: false, reason: "Distribution notifications disabled" };
      break;
    case "nudge":
    case "stage_advance":
      break;
  }

  return { allowed: true };
}
