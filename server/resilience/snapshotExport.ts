/**
 * F3-034: Graceful Degradation — Static Snapshot Export
 *
 * Generates a static JSON/HTML snapshot of an organization's portfolio data
 * that can be served as a read-only fallback when the live system is unavailable.
 *
 * Use cases:
 * - Scheduled export (e.g., nightly) to S3 as a static fallback page
 * - On-demand export for clients who want offline access
 * - Email digest generation for critical notifications
 */

import { getDb } from "../db";
import {
  organizations,
  ventures,
  tasks,
  distributions,
  orgVentureAccess,
  teamMembers,
} from "../../drizzle/schema";
import { eq, and, inArray } from "drizzle-orm";

export interface PortfolioSnapshot {
  generatedAt: string;
  organization: {
    id: number;
    name: string;
    slug: string;
  };
  ventures: Array<{
    id: number;
    name: string;
    status: string;
    theme: string | null;
    location: string | null;
  }>;
  tasks: Array<{
    id: number;
    title: string;
    status: string;
    priority: string | null;
    dueDate: string | null;
  }>;
  distributions: Array<{
    id: number;
    amount: string;
    currency: string;
    status: string;
    scheduledDate: string | null;
  }>;
  summary: {
    totalVentures: number;
    openTasks: number;
    overdueTasks: number;
    pendingDistributions: number;
  };
}

/**
 * Generate a static portfolio snapshot for an organization.
 * This snapshot can be cached in S3 and served as a read-only fallback.
 */
export async function generatePortfolioSnapshot(
  organizationId: number
): Promise<PortfolioSnapshot> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Fetch organization
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  if (!org) {
    throw new Error(`Organization ${organizationId} not found`);
  }

  // Fetch venture IDs accessible to this org
  const accessRecords = await db
    .select({ ventureId: orgVentureAccess.ventureId })
    .from(orgVentureAccess)
    .where(eq(orgVentureAccess.organizationId, organizationId));

  const ventureIds = accessRecords.map((r) => r.ventureId);

  // Fetch ventures
  const orgVentures =
    ventureIds.length > 0
      ? await db
          .select()
          .from(ventures)
          .where(inArray(ventures.id, ventureIds))
      : [];

  // Fetch tasks for these ventures
  const orgTasks =
    ventureIds.length > 0
      ? await db
          .select()
          .from(tasks)
          .where(inArray(tasks.ventureId, ventureIds))
      : [];

  // Fetch distributions for this org
  const orgDistributions = await db
    .select()
    .from(distributions)
    .where(eq(distributions.organizationId, organizationId));

  const now = new Date();
  const overdueTasks = orgTasks.filter(
    (t) =>
      t.status !== "complete" &&
      t.dueDate &&
      new Date(t.dueDate) < now
  );

  const pendingDists = orgDistributions.filter(
    (d) => d.status === "scheduled" || d.status === "pending"
  );

  return {
    generatedAt: now.toISOString(),
    organization: {
      id: org.id,
      name: org.name,
      slug: org.slug,
    },
    ventures: orgVentures.map((v) => ({
      id: v.id,
      name: v.name,
      status: v.status || "Unknown",
      theme: v.sector,
      location: v.location,
    })),
    tasks: orgTasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status || "open",
      priority: t.priority,
      dueDate: t.dueDate ? new Date(t.dueDate).toISOString() : null,
    })),
    distributions: orgDistributions.map((d) => ({
      id: d.id,
      amount: String(d.amount),
      currency: d.currency || "USD",
      status: d.status || "pending",
      scheduledDate: d.distributionDate || null,
    })),
    summary: {
      totalVentures: orgVentures.length,
      openTasks: orgTasks.filter((t) => t.status !== "complete").length,
      overdueTasks: overdueTasks.length,
      pendingDistributions: pendingDists.length,
    },
  };
}

/**
 * Generate a plain-text email digest from a portfolio snapshot.
 * Can be sent via notification system as a fallback when the UI is unavailable.
 */
export function generateEmailDigest(snapshot: PortfolioSnapshot): {
  subject: string;
  body: string;
} {
  const { organization, summary, generatedAt } = snapshot;
  const date = new Date(generatedAt).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const subject = `${organization.name} — Portfolio Summary (${date})`;

  const lines = [
    `Portfolio Summary for ${organization.name}`,
    `Generated: ${date}`,
    "",
    "─── Overview ───",
    `  Ventures: ${summary.totalVentures}`,
    `  Open Tasks: ${summary.openTasks}`,
    `  Overdue Tasks: ${summary.overdueTasks}`,
    `  Pending Distributions: ${summary.pendingDistributions}`,
    "",
  ];

  if (summary.overdueTasks > 0) {
    lines.push("─── Overdue Tasks ───");
    snapshot.tasks
      .filter(
        (t) =>
          t.status !== "complete" &&
          t.dueDate &&
          new Date(t.dueDate) < new Date()
      )
      .forEach((t) => {
        lines.push(
          `  • ${t.title} (due ${new Date(t.dueDate!).toLocaleDateString()})`
        );
      });
    lines.push("");
  }

  if (summary.pendingDistributions > 0) {
    lines.push("─── Pending Distributions ───");
    snapshot.distributions
      .filter((d) => d.status === "scheduled" || d.status === "pending")
      .forEach((d) => {
        const dateStr = d.scheduledDate
          ? new Date(d.scheduledDate).toLocaleDateString()
          : "TBD";
        lines.push(`  • ${d.currency} ${d.amount} — scheduled ${dateStr}`);
      });
    lines.push("");
  }

  lines.push(
    "─── Ventures ───",
    ...snapshot.ventures.map(
      (v) => `  • ${v.name} [${v.status}] ${v.location || ""}`
    ),
    "",
    "This is an automated summary from VENTEX by Aurovia LLC.",
    "For full details, log in to your portal."
  );

  return { subject, body: lines.join("\n") };
}
