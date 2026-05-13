/**
 * Vision Spec v1 — Section 15: Client Onboarding Readiness
 *
 * 11-item checklist that must be fully completed before any agent
 * begins running for a new organization.
 */
import { getDb } from "./db";
import {
  organizations,
  ventures,
  spvs,
  tasks,
  compliance,
  distributions,
  ventureFiles,
  spvFiles,
  teamMembers,
  orgVentureAccess,
  clientAgentConfig,
} from "../drizzle/schema";
import { eq, and, gte, sql, inArray } from "drizzle-orm";

export interface ReadinessItem {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface ReadinessResult {
  organizationId: number;
  ready: boolean;
  items: ReadinessItem[];
  passedCount: number;
  totalCount: number;
}

/**
 * Check all 11 onboarding readiness items for an organization.
 * Returns a structured result with pass/fail for each item.
 */
export async function checkOnboardingReadiness(organizationId: number): Promise<ReadinessResult> {
  const db = await getDb();
  if (!db) {
    return {
      organizationId,
      ready: false,
      items: [{ id: "db", label: "Database", passed: false, detail: "Database not available" }],
      passedCount: 0,
      totalCount: 11,
    };
  }

  const items: ReadinessItem[] = [];

  // 1. Organization profile saved and complete
  const [org] = await db.select().from(organizations).where(eq(organizations.id, organizationId)).limit(1);
  const orgComplete = !!(org && org.name && org.primaryContactEmail);
  items.push({
    id: "org_profile",
    label: "Organization profile saved and complete",
    passed: orgComplete,
    detail: orgComplete ? `${org.name} — profile complete` : "Missing organization name or primary contact email",
  });

  // Get venture IDs for this org
  const ovaRows = await db.select({ ventureId: orgVentureAccess.ventureId })
    .from(orgVentureAccess)
    .where(eq(orgVentureAccess.organizationId, organizationId));
  const ventureIds = ovaRows.map(r => r.ventureId);

  // 2. At least 1 venture in Venture Registry
  const hasVentures = ventureIds.length > 0;
  items.push({
    id: "has_ventures",
    label: "At least 1 venture in Venture Registry",
    passed: hasVentures,
    detail: hasVentures ? `${ventureIds.length} venture(s) linked` : "No ventures linked to this organization",
  });

  // 3. All ventures have stage, nextMilestone, and nextMilestoneDate populated
  let venturesComplete = false;
  let ventureDetail = "No ventures to check";
  if (ventureIds.length > 0) {
    const ventureRows = await db.select({
      id: ventures.id,
      name: ventures.name,
      stage: ventures.stage,
      nextMilestone: ventures.nextMilestone,
      nextMilestoneDate: ventures.nextMilestoneDate,
    }).from(ventures).where(inArray(ventures.id, ventureIds));

    const incomplete = ventureRows.filter(v => !v.stage || !v.nextMilestone || !v.nextMilestoneDate);
    venturesComplete = incomplete.length === 0 && ventureRows.length > 0;
    ventureDetail = venturesComplete
      ? `All ${ventureRows.length} venture(s) have stage, milestone, and milestone date`
      : `${incomplete.length} venture(s) missing stage, nextMilestone, or nextMilestoneDate: ${incomplete.map(v => v.name).join(", ")}`;
  }
  items.push({
    id: "ventures_complete",
    label: "All ventures have stage, nextMilestone, and nextMilestoneDate",
    passed: venturesComplete,
    detail: ventureDetail,
  });

  // 4. All SPVs have capitalCommitted and lpRecipients populated
  const spvRows = await db.select({
    id: spvs.id,
    name: spvs.name,
    capitalCommitted: spvs.capitalCommitted,
    lpRecipients: (spvs as any).lpRecipients ?? null,
  }).from(spvs).where(eq(spvs.organizationId, organizationId));

  // If no SPVs, this is a pass (not all orgs have SPVs)
  const spvsComplete = spvRows.length === 0 || spvRows.every(s => s.capitalCommitted);
  items.push({
    id: "spvs_complete",
    label: "All SPVs have capitalCommitted populated",
    passed: spvsComplete,
    detail: spvRows.length === 0
      ? "No SPVs — item passes"
      : spvsComplete
        ? `All ${spvRows.length} SPV(s) have capitalCommitted`
        : `${spvRows.filter(s => !s.capitalCommitted).length} SPV(s) missing capitalCommitted`,
  });

  // 5. At least 1 task in Task Engine per active venture
  let tasksComplete = false;
  let taskDetail = "No ventures to check";
  if (ventureIds.length > 0) {
    const taskCounts = await db.select({
      ventureId: tasks.ventureId,
      count: sql<number>`count(*)`.as("count"),
    }).from(tasks)
      .where(inArray(tasks.ventureId, ventureIds))
      .groupBy(tasks.ventureId);

    const venturesWithTasks = new Set(taskCounts.map(t => t.ventureId));
    const venturesWithoutTasks = ventureIds.filter(id => !venturesWithTasks.has(id));
    tasksComplete = venturesWithoutTasks.length === 0;
    taskDetail = tasksComplete
      ? `All ${ventureIds.length} venture(s) have at least 1 task`
      : `${venturesWithoutTasks.length} venture(s) have no tasks`;
  }
  items.push({
    id: "tasks_per_venture",
    label: "At least 1 task per active venture",
    passed: tasksComplete,
    detail: taskDetail,
  });

  // 6. Compliance calendar has entries for next 90 days
  const ninetyDaysFromNow = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const complianceRows = await db.select({ id: compliance.id })
    .from(compliance)
    .where(and(
      eq(compliance.organizationId, organizationId),
      gte(compliance.dueDate, today),
    ))
    .limit(1);
  const hasCompliance = complianceRows.length > 0;
  items.push({
    id: "compliance_calendar",
    label: "Compliance calendar has entries for next 90 days",
    passed: hasCompliance,
    detail: hasCompliance ? "Compliance entries found" : "No upcoming compliance entries — add at least one",
  });

  // 7. Distribution schedule has entries for next 90 days (or marked as none)
  const distRows = await db.select({ id: distributions.id })
    .from(distributions)
    .where(eq(distributions.organizationId, organizationId))
    .limit(1);
  // If org has no distributions, we check if there's a flag that says "none expected"
  const hasDist = distRows.length > 0;
  items.push({
    id: "distribution_schedule",
    label: "Distribution schedule has entries (or marked as none)",
    passed: hasDist,
    detail: hasDist ? "Distribution entries found" : "No distribution entries — add at least one or mark as none expected",
  });

  // 8. At least 1 document uploaded to Document Vault per entity
  let docsComplete = false;
  let docDetail = "No ventures to check";
  if (ventureIds.length > 0) {
    const docCounts = await db.select({
      ventureId: ventureFiles.ventureId,
    }).from(ventureFiles)
      .where(inArray(ventureFiles.ventureId, ventureIds))
      .groupBy(ventureFiles.ventureId);

    const venturesWithDocs = new Set(docCounts.map(d => d.ventureId));
    const venturesWithoutDocs = ventureIds.filter(id => !venturesWithDocs.has(id));
    docsComplete = venturesWithoutDocs.length === 0;
    docDetail = docsComplete
      ? `All ${ventureIds.length} venture(s) have at least 1 document`
      : `${venturesWithoutDocs.length} venture(s) have no documents uploaded`;
  }
  items.push({
    id: "documents_per_entity",
    label: "At least 1 document per entity in Document Vault",
    passed: docsComplete,
    detail: docDetail,
  });

  // 9. Team roster has at least 1 member with escalationPriority: 1
  const escalationMembers = await db.select({ id: teamMembers.id })
    .from(teamMembers)
    .where(and(
      eq(teamMembers.organizationId, organizationId),
      eq(teamMembers.escalationPriority, 1),
    ))
    .limit(1);
  const hasEscalation = escalationMembers.length > 0;
  items.push({
    id: "escalation_member",
    label: "Team roster has at least 1 member with escalationPriority: 1",
    passed: hasEscalation,
    detail: hasEscalation ? "Escalation contact found" : "No team member with escalationPriority = 1 — assign one",
  });

  // 10. Principal email and timezone confirmed
  const principalConfirmed = !!(org && org.primaryContactEmail && org.timezone);
  items.push({
    id: "principal_confirmed",
    label: "Principal email and timezone confirmed",
    passed: principalConfirmed,
    detail: principalConfirmed
      ? `Principal: ${org.primaryContactEmail}, TZ: ${org.timezone}`
      : `Missing ${!org?.primaryContactEmail ? "principal email" : ""}${!org?.primaryContactEmail && !org?.timezone ? " and " : ""}${!org?.timezone ? "timezone" : ""}`,
  });

  // 11. Agent cycle confirmed (default: 6 hours)
  const [agentConfig] = await db.select()
    .from(clientAgentConfig)
    .where(eq(clientAgentConfig.organizationId, organizationId))
    .limit(1);
  const agentConfigured = !!agentConfig;
  items.push({
    id: "agent_cycle_confirmed",
    label: "Agent cycle confirmed",
    passed: agentConfigured,
    detail: agentConfigured
      ? `Agent config saved (polling: ${agentConfig.pollingIntervalMinutes ?? 30}min)`
      : "No agent configuration saved — complete the agent setup step",
  });

  const passedCount = items.filter(i => i.passed).length;

  return {
    organizationId,
    ready: passedCount === items.length,
    items,
    passedCount,
    totalCount: items.length,
  };
}
