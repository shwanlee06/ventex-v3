// ============================================================================
// Seed Script — Meridian Capital Group (Real Estate Demo Client)
// Creates a full realistic client with ventures, tasks, SPVs, distributions,
// team members, activity log, and org-venture access.
// ============================================================================
import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import { eq, and } from "drizzle-orm";
import * as schema from "./drizzle/schema.ts";

const db = drizzle(process.env.DATABASE_URL);

// ── Helpers ─────────────────────────────────────────────────────────────────
function slug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
function daysAgo(n) {
  return new Date(Date.now() - n * 86400000).toISOString().split("T")[0];
}
function daysFromNow(n) {
  return new Date(Date.now() + n * 86400000).toISOString().split("T")[0];
}
function ts(daysOffset) {
  return new Date(Date.now() + daysOffset * 86400000);
}

async function main() {
  console.log("🏗️  Seeding Meridian Capital Group — Real Estate Demo Client...\n");

  // ── 1. Create Organization ──────────────────────────────────────────────
  const [existingOrg] = await db.select().from(schema.organizations).where(eq(schema.organizations.slug, "meridian-capital-group")).limit(1);
  let orgId;
  if (existingOrg) {
    orgId = existingOrg.id;
    console.log(`  ✓ Organization already exists (id=${orgId}), updating...`);
    await db.update(schema.organizations).set({
      sectors: JSON.stringify(["Real Estate"]),
      aumRange: "$100M-$500M",
      primaryContactName: "James Harrington",
      primaryContactEmail: "james@meridiancap.com",
      subscriptionTier: "growth",
      description: "UHNWI family office specializing in premium real estate acquisitions across Europe and the Middle East. Portfolio includes luxury residential developments, commercial towers, and mixed-use waterfront projects.",
    }).where(eq(schema.organizations.id, orgId));
  } else {
    const [result] = await db.insert(schema.organizations).values({
      name: "Meridian Capital Group",
      slug: "meridian-capital-group",
      type: "client",
      status: "active",
      description: "UHNWI family office specializing in premium real estate acquisitions across Europe and the Middle East. Portfolio includes luxury residential developments, commercial towers, and mixed-use waterfront projects.",
      primaryContactName: "James Harrington",
      primaryContactEmail: "james@meridiancap.com",
      aumRange: "$100M-$500M",
      sectors: JSON.stringify(["Real Estate"]),
      subscriptionTier: "growth",
    });
    orgId = result.insertId;
    console.log(`  ✓ Organization created (id=${orgId})`);
  }

  // ── 2. Create Team Members ──────────────────────────────────────────────
  const teamData = [
    { name: "James Harrington", role: "Managing Director", memberFunction: "Investment Lead", email: "james@meridiancap.com", phone: "+44 7700 900123", location: "London, UK", type: "Client", systemRole: "user" },
    { name: "Sofia Al-Rashid", role: "Head of Acquisitions", memberFunction: "Deal Sourcing", email: "sofia@meridiancap.com", phone: "+971 50 123 4567", location: "Dubai, UAE", type: "Client", systemRole: "user" },
    { name: "Marcus Lindberg", role: "Legal Counsel", memberFunction: "Legal & Compliance", email: "marcus@meridiancap.com", phone: "+46 70 123 4567", location: "Stockholm, Sweden", type: "Client", systemRole: "user" },
    { name: "Elena Petrova", role: "Financial Controller", memberFunction: "Finance", email: "elena@meridiancap.com", phone: "+44 7700 900456", location: "London, UK", type: "Client", systemRole: "user" },
    { name: "Tariq Mansour", role: "Project Manager", memberFunction: "Operations", email: "tariq@meridiancap.com", phone: "+971 55 987 6543", location: "Abu Dhabi, UAE", type: "Client", systemRole: "user" },
    { name: "Charlotte Dubois", role: "Asset Manager", memberFunction: "Portfolio Management", email: "charlotte@meridiancap.com", phone: "+33 6 12 34 56 78", location: "Paris, France", type: "Client", systemRole: "user" },
  ];

  const memberIds = [];
  for (const m of teamData) {
    const memberSlug = slug(`${m.name}-meridian-${Date.now()}`);
    const [existing] = await db.select().from(schema.teamMembers).where(and(eq(schema.teamMembers.email, m.email), eq(schema.teamMembers.organizationId, orgId))).limit(1);
    if (existing) {
      memberIds.push(existing.id);
      console.log(`  ✓ Team member "${m.name}" already exists (id=${existing.id})`);
    } else {
      const [result] = await db.insert(schema.teamMembers).values({
        ...m,
        organizationId: orgId,
        status: "Active",
        slug: memberSlug,
      });
      memberIds.push(result.insertId);
      console.log(`  ✓ Team member "${m.name}" created (id=${result.insertId})`);
    }
  }

  // ── 3. Create Ventures (6 Real Estate projects at various stages) ──────
  const ventureData = [
    {
      name: "Marina Bay Residences",
      sector: "Real Estate",
      location: "Dubai Marina, UAE",
      stage: "Completed",
      status: "Completed",
      description: "Luxury 42-floor residential tower with 180 premium apartments, rooftop infinity pool, and private marina berths. Fully sold out, final handover completed.",
      currentStatus: "Project fully completed. All 180 units handed over to buyers. Final accounts settled. ROI of 34% achieved over 28-month cycle. Post-completion warranty period active until Q2 2027.",
      nextStep: "Final warranty inspections and project close-out documentation",
      nextMilestone: "Project close-out report due 15 May 2026",
      priority: "Low",
      healthScore: 95,
    },
    {
      name: "Kensington Square Development",
      sector: "Real Estate",
      location: "London, UK",
      stage: "Active Ventures",
      status: "In progress",
      description: "Mixed-use development: 24 luxury apartments above ground-floor retail in prime Kensington. Construction 65% complete, pre-sales at 78%.",
      currentStatus: "Construction progressing on schedule. Structural work on floors 4-6 underway. 19 of 24 units pre-sold. Retail tenant negotiations in final stages with two premium brands.",
      nextStep: "Complete structural work on upper floors and finalize retail lease agreements",
      nextMilestone: "Topping out ceremony scheduled for 20 June 2026",
      priority: "High",
      healthScore: 78,
    },
    {
      name: "Palm Jumeirah Villa Portfolio",
      sector: "Real Estate",
      location: "Palm Jumeirah, Dubai",
      stage: "Active Ventures",
      status: "In progress",
      description: "Acquisition and renovation of 5 beachfront villas on Palm Jumeirah for luxury short-term rental portfolio. 3 villas renovated, 2 in progress.",
      currentStatus: "3 of 5 villas fully renovated and generating rental income (avg $45K/month combined). Villa 4 renovation 40% complete. Villa 5 permits approved, contractor mobilizing.",
      nextStep: "Complete Villa 4 interior fit-out and begin Villa 5 demolition works",
      nextMilestone: "Villa 4 completion target: 30 July 2026",
      priority: "High",
      healthScore: 72,
    },
    {
      name: "Stockholm Waterfront Office Tower",
      sector: "Real Estate",
      location: "Stockholm, Sweden",
      stage: "In Fundraising",
      status: "In progress",
      description: "Class-A 18-story office tower on Stockholm waterfront. Targeting BREEAM Excellent certification. Anchor tenant secured (Nordic tech company, 40% of NLA).",
      currentStatus: "Anchor tenant LOI signed for 40% of net lettable area. Environmental impact assessment approved. Fundraising at 62% of target ($85M of $137M). Two co-investors in advanced DD.",
      nextStep: "Close remaining $52M fundraising gap and finalize co-investor terms",
      nextMilestone: "Financial close targeted for 15 August 2026",
      priority: "Critical",
      healthScore: 58,
    },
    {
      name: "Côte d'Azur Boutique Hotel",
      sector: "Real Estate",
      location: "Nice, France",
      stage: "In Validation",
      status: "In progress",
      description: "Conversion of historic 1920s villa into 28-room boutique hotel with Michelin-star restaurant. Due diligence phase — structural survey and heritage permits pending.",
      currentStatus: "Property under exclusive option agreement (expires 30 June 2026). Structural survey completed — minor remediation needed. Heritage commission review scheduled for 22 April. Market study shows 82% projected occupancy.",
      nextStep: "Obtain heritage commission approval and complete financial model",
      nextMilestone: "Heritage commission decision expected 22 April 2026",
      priority: "Medium",
      healthScore: 45,
    },
    {
      name: "Abu Dhabi Commercial District",
      sector: "Real Estate",
      location: "Abu Dhabi, UAE",
      stage: "In Validation",
      status: "In progress",
      description: "Mixed-use commercial complex: 3 office buildings + retail podium in new Abu Dhabi financial district. Early feasibility stage with government land allocation pending.",
      currentStatus: "Government land allocation application submitted. Preliminary masterplan approved by municipality. Feasibility study shows IRR of 18-22%. Environmental baseline study in progress.",
      nextStep: "Secure government land allocation and complete environmental baseline",
      nextMilestone: "Land allocation decision expected May 2026",
      priority: "Medium",
      healthScore: 38,
    },
  ];

  const ventureIds = [];
  for (const v of ventureData) {
    const ventureSlug = slug(`${v.name}-${Date.now()}`);
    const [existing] = await db.select().from(schema.ventures).where(eq(schema.ventures.name, v.name)).limit(1);
    if (existing) {
      ventureIds.push(existing.id);
      // Update with latest data
      await db.update(schema.ventures).set({
        ...v,
        slug: existing.slug,
      }).where(eq(schema.ventures.id, existing.id));
      console.log(`  ✓ Venture "${v.name}" updated (id=${existing.id})`);
    } else {
      const [result] = await db.insert(schema.ventures).values({
        ...v,
        slug: ventureSlug,
      });
      ventureIds.push(result.insertId);
      console.log(`  ✓ Venture "${v.name}" created (id=${result.insertId})`);
    }
  }

  // ── 4. Create Org-Venture Access ────────────────────────────────────────
  for (const vid of ventureIds) {
    const [existing] = await db.select().from(schema.orgVentureAccess).where(and(eq(schema.orgVentureAccess.organizationId, orgId), eq(schema.orgVentureAccess.ventureId, vid))).limit(1);
    if (!existing) {
      await db.insert(schema.orgVentureAccess).values({
        organizationId: orgId,
        ventureId: vid,
        permission: "full",
      });
    }
  }
  console.log(`  ✓ Org-venture access created for ${ventureIds.length} ventures`);

  // ── 5. Assign Team to Ventures ──────────────────────────────────────────
  const ventureTeamAssignments = [
    // Marina Bay (Completed) — full team was involved
    { ventureIdx: 0, memberIdx: 0, responsibility: "Investment Oversight" },
    { ventureIdx: 0, memberIdx: 1, responsibility: "Acquisition Lead" },
    { ventureIdx: 0, memberIdx: 3, responsibility: "Financial Reporting" },
    { ventureIdx: 0, memberIdx: 5, responsibility: "Asset Management" },
    // Kensington Square (Active) — construction phase team
    { ventureIdx: 1, memberIdx: 0, responsibility: "Investment Oversight" },
    { ventureIdx: 1, memberIdx: 2, responsibility: "Legal & Planning Approvals" },
    { ventureIdx: 1, memberIdx: 3, responsibility: "Budget Control" },
    { ventureIdx: 1, memberIdx: 4, responsibility: "Construction Management" },
    // Palm Jumeirah (Active) — renovation team
    { ventureIdx: 2, memberIdx: 1, responsibility: "Acquisition & Renovation Lead" },
    { ventureIdx: 2, memberIdx: 4, responsibility: "Project Management" },
    { ventureIdx: 2, memberIdx: 5, responsibility: "Rental Portfolio Management" },
    // Stockholm (Fundraising) — deal team
    { ventureIdx: 3, memberIdx: 0, responsibility: "Lead Investor Relations" },
    { ventureIdx: 3, memberIdx: 1, responsibility: "Co-Investor Sourcing" },
    { ventureIdx: 3, memberIdx: 2, responsibility: "Legal Structuring" },
    { ventureIdx: 3, memberIdx: 3, responsibility: "Financial Modeling" },
    // Côte d'Azur (Validation) — DD team
    { ventureIdx: 4, memberIdx: 0, responsibility: "Investment Decision" },
    { ventureIdx: 4, memberIdx: 1, responsibility: "Due Diligence Lead" },
    { ventureIdx: 4, memberIdx: 2, responsibility: "Heritage & Zoning Review" },
    { ventureIdx: 4, memberIdx: 5, responsibility: "Hospitality Market Analysis" },
    // Abu Dhabi (Validation) — early stage
    { ventureIdx: 5, memberIdx: 0, responsibility: "Strategic Oversight" },
    { ventureIdx: 5, memberIdx: 1, responsibility: "Government Relations" },
    { ventureIdx: 5, memberIdx: 4, responsibility: "Feasibility Coordination" },
  ];

  for (const a of ventureTeamAssignments) {
    const vid = ventureIds[a.ventureIdx];
    const mid = memberIds[a.memberIdx];
    const [existing] = await db.select().from(schema.ventureTeam).where(and(eq(schema.ventureTeam.ventureId, vid), eq(schema.ventureTeam.memberId, mid))).limit(1);
    if (!existing) {
      await db.insert(schema.ventureTeam).values({ ventureId: vid, memberId: mid, responsibility: a.responsibility });
    }
  }
  console.log(`  ✓ ${ventureTeamAssignments.length} venture-team assignments created`);

  // ── 6. Create Tasks ─────────────────────────────────────────────────────
  const taskData = [
    // Marina Bay (Completed) — all tasks done
    { title: "Final warranty inspection — Building A", ventureIdx: 0, assigneeIdx: [4], dueDate: daysFromNow(30), priority: "Low", status: "open" },
    { title: "Close-out report and final accounts", ventureIdx: 0, assigneeIdx: [3], dueDate: daysFromNow(45), priority: "Low", status: "open" },
    { title: "Investor return distribution — final tranche", ventureIdx: 0, assigneeIdx: [3, 0], dueDate: daysFromNow(15), priority: "Medium", status: "in_progress" },

    // Kensington Square (Active) — mix of statuses
    { title: "Structural completion floors 4-6", ventureIdx: 1, assigneeIdx: [4], dueDate: daysFromNow(21), priority: "Critical", status: "in_progress" },
    { title: "Retail lease — Burberry final terms", ventureIdx: 1, assigneeIdx: [2, 0], dueDate: daysFromNow(14), priority: "High", status: "in_progress" },
    { title: "Retail lease — Dior LOI review", ventureIdx: 1, assigneeIdx: [2], dueDate: daysFromNow(28), priority: "High", status: "open" },
    { title: "MEP installation schedule approval", ventureIdx: 1, assigneeIdx: [4], dueDate: daysAgo(3), priority: "High", status: "open", description: "Overdue — contractor submitted revised schedule, needs review" },
    { title: "Pre-sale unit 22 — exchange contracts", ventureIdx: 1, assigneeIdx: [2, 3], dueDate: daysFromNow(7), priority: "Medium", status: "in_progress" },
    { title: "Planning authority — Phase 2 amendment", ventureIdx: 1, assigneeIdx: [2], dueDate: daysAgo(7), priority: "Critical", status: "open", description: "Overdue — awaiting council response to amendment application" },
    { title: "Monthly construction progress report", ventureIdx: 1, assigneeIdx: [4], dueDate: daysFromNow(5), priority: "Medium", status: "open" },
    { title: "Fire safety certificate application", ventureIdx: 1, assigneeIdx: [4, 2], dueDate: daysFromNow(35), priority: "High", status: "open" },

    // Palm Jumeirah (Active) — renovation tasks
    { title: "Villa 4 — kitchen and bathroom fit-out", ventureIdx: 2, assigneeIdx: [4], dueDate: daysFromNow(42), priority: "High", status: "in_progress" },
    { title: "Villa 5 — demolition permit execution", ventureIdx: 2, assigneeIdx: [4, 1], dueDate: daysFromNow(10), priority: "Critical", status: "in_progress" },
    { title: "Rental management contract — Villas 1-3", ventureIdx: 2, assigneeIdx: [5], dueDate: daysAgo(5), priority: "High", status: "open", description: "Overdue — final contract review with property management company" },
    { title: "Insurance renewal — all 5 properties", ventureIdx: 2, assigneeIdx: [3], dueDate: daysFromNow(20), priority: "Medium", status: "open" },
    { title: "Q1 2026 rental income reconciliation", ventureIdx: 2, assigneeIdx: [3], dueDate: daysAgo(2), priority: "Medium", status: "open", description: "Overdue — awaiting bank statements for March" },
    { title: "Villa 4 — landscaping and pool design", ventureIdx: 2, assigneeIdx: [4], dueDate: daysFromNow(55), priority: "Low", status: "open" },

    // Stockholm (Fundraising) — investor tasks
    { title: "Co-investor DD package — Nordea Wealth", ventureIdx: 3, assigneeIdx: [0, 3], dueDate: daysFromNow(10), priority: "Critical", status: "in_progress" },
    { title: "Co-investor DD package — SEB Private", ventureIdx: 3, assigneeIdx: [0, 3], dueDate: daysFromNow(14), priority: "Critical", status: "in_progress" },
    { title: "SPV legal structure — Swedish AB setup", ventureIdx: 3, assigneeIdx: [2], dueDate: daysFromNow(21), priority: "High", status: "open" },
    { title: "BREEAM pre-assessment report", ventureIdx: 3, assigneeIdx: [4], dueDate: daysAgo(10), priority: "High", status: "open", description: "Overdue — sustainability consultant delayed" },
    { title: "Anchor tenant lease — final negotiation", ventureIdx: 3, assigneeIdx: [2, 1], dueDate: daysFromNow(30), priority: "Critical", status: "in_progress" },
    { title: "Construction cost estimate — QS review", ventureIdx: 3, assigneeIdx: [3, 4], dueDate: daysFromNow(18), priority: "High", status: "open" },
    { title: "Environmental impact mitigation plan", ventureIdx: 3, assigneeIdx: [4], dueDate: daysFromNow(25), priority: "Medium", status: "open" },

    // Côte d'Azur (Validation) — DD tasks
    { title: "Heritage commission submission package", ventureIdx: 4, assigneeIdx: [2, 1], dueDate: daysFromNow(5), priority: "Critical", status: "in_progress" },
    { title: "Structural remediation cost estimate", ventureIdx: 4, assigneeIdx: [4], dueDate: daysFromNow(14), priority: "High", status: "open" },
    { title: "Hospitality market study — final report", ventureIdx: 4, assigneeIdx: [5], dueDate: daysFromNow(10), priority: "High", status: "in_progress" },
    { title: "Financial model — base, bull, bear cases", ventureIdx: 4, assigneeIdx: [3], dueDate: daysFromNow(18), priority: "High", status: "open" },
    { title: "Michelin chef partnership — LOI draft", ventureIdx: 4, assigneeIdx: [0, 5], dueDate: daysFromNow(30), priority: "Medium", status: "open" },
    { title: "Option agreement extension negotiation", ventureIdx: 4, assigneeIdx: [2], dueDate: daysFromNow(45), priority: "Medium", status: "open" },

    // Abu Dhabi (Validation) — early stage
    { title: "Government land allocation — follow up", ventureIdx: 5, assigneeIdx: [1], dueDate: daysFromNow(7), priority: "Critical", status: "in_progress" },
    { title: "Environmental baseline study — Phase 1", ventureIdx: 5, assigneeIdx: [4], dueDate: daysFromNow(21), priority: "High", status: "in_progress" },
    { title: "Preliminary masterplan — architect review", ventureIdx: 5, assigneeIdx: [4, 0], dueDate: daysFromNow(14), priority: "High", status: "open" },
    { title: "Market demand analysis — office space", ventureIdx: 5, assigneeIdx: [5], dueDate: daysFromNow(28), priority: "Medium", status: "open" },
    { title: "Infrastructure cost assessment", ventureIdx: 5, assigneeIdx: [3, 4], dueDate: daysFromNow(35), priority: "Medium", status: "open" },
  ];

  const taskIds = [];
  for (const t of taskData) {
    const assigneeIdsList = t.assigneeIdx.map(i => memberIds[i]);
    const assigneeNamesList = t.assigneeIdx.map(i => teamData[i].name);
    const [result] = await db.insert(schema.tasks).values({
      title: t.title,
      organizationId: orgId,
      ventureId: ventureIds[t.ventureIdx],
      ventureLink: ventureData[t.ventureIdx].name,
      assigneeIds: assigneeIdsList,
      assigneeNames: assigneeNamesList,
      dueDate: t.dueDate,
      priority: t.priority,
      status: t.status,
      description: t.description || null,
    });
    taskIds.push(result.insertId);
  }
  console.log(`  ✓ ${taskData.length} tasks created`);

  // ── 7. Create SPVs ─────────────────────────────────────────────────────
  const spvData = [
    {
      name: "MCG Marina Bay SPV Ltd",
      sector: "Real Estate",
      priority: "Low",
      stage: "Completed",
      notes: "Final distributions complete. Entity to be wound down after warranty period.",
      currentStatus: "All investor returns distributed. Final audit completed. Entity dissolution scheduled for Q3 2026.",
      nextStep: "File dissolution documents after warranty period ends",
      ventureIdx: 0,
    },
    {
      name: "MCG Kensington Holdings Ltd",
      sector: "Real Estate",
      priority: "High",
      stage: "Active deal",
      notes: "Construction phase SPV. £42M committed capital, £38M drawn.",
      currentStatus: "Construction financing fully drawn. Pre-sale deposits held in escrow. Next capital call not expected.",
      nextStep: "Monitor construction milestones and pre-sale completions",
      ventureIdx: 1,
    },
    {
      name: "MCG Palm Portfolio LLC",
      sector: "Real Estate",
      priority: "High",
      stage: "Active deal",
      notes: "Portfolio SPV holding 5 Palm Jumeirah villas. AED 65M total investment.",
      currentStatus: "3 villas generating rental income. 2 under renovation. Monthly cash flow positive on operational units.",
      nextStep: "Complete Villa 4 renovation and begin Villa 5 works",
      ventureIdx: 2,
    },
    {
      name: "MCG Stockholm Waterfront AB",
      sector: "Real Estate",
      priority: "Critical",
      stage: "In negotiation",
      notes: "Swedish AB structure for office tower. Fundraising 62% complete.",
      currentStatus: "SPV incorporated. Anchor tenant LOI executed. Two co-investors in advanced due diligence. $52M fundraising gap remaining.",
      nextStep: "Close co-investor commitments and achieve financial close",
      ventureIdx: 3,
    },
    {
      name: "MCG Côte d'Azur SCI",
      sector: "Real Estate",
      priority: "Medium",
      stage: "In negotiation",
      notes: "French SCI structure for boutique hotel conversion. Subject to heritage approval.",
      currentStatus: "SPV structure defined. Option agreement in place. Heritage commission review pending.",
      nextStep: "Await heritage commission decision before proceeding with capital deployment",
      ventureIdx: 4,
    },
  ];

  const spvIds = [];
  for (const s of spvData) {
    const spvSlug = slug(`${s.name}-${Date.now()}`);
    const [result] = await db.insert(schema.spvs).values({
      name: s.name,
      organizationId: orgId,
      sector: s.sector,
      priority: s.priority,
      stage: s.stage,
      notes: s.notes,
      currentStatus: s.currentStatus,
      nextStep: s.nextStep,
      slug: spvSlug,
    });
    spvIds.push(result.insertId);
    console.log(`  ✓ SPV "${s.name}" created (id=${result.insertId})`);

    // Link SPV to venture
    await db.insert(schema.spvVentures).values({
      spvId: result.insertId,
      ventureId: ventureIds[s.ventureIdx],
    });
  }

  // Assign team to SPVs
  const spvTeamAssignments = [
    { spvIdx: 0, memberIdx: 0, responsibility: "Investment Committee" },
    { spvIdx: 0, memberIdx: 3, responsibility: "Financial Reporting" },
    { spvIdx: 1, memberIdx: 0, responsibility: "Board Director" },
    { spvIdx: 1, memberIdx: 2, responsibility: "Legal Counsel" },
    { spvIdx: 1, memberIdx: 3, responsibility: "CFO" },
    { spvIdx: 2, memberIdx: 1, responsibility: "Managing Partner" },
    { spvIdx: 2, memberIdx: 5, responsibility: "Asset Manager" },
    { spvIdx: 3, memberIdx: 0, responsibility: "Lead Sponsor" },
    { spvIdx: 3, memberIdx: 2, responsibility: "Legal Structuring" },
    { spvIdx: 3, memberIdx: 3, responsibility: "Financial Controller" },
    { spvIdx: 4, memberIdx: 0, responsibility: "Investment Lead" },
    { spvIdx: 4, memberIdx: 2, responsibility: "Legal & Heritage" },
  ];

  for (const a of spvTeamAssignments) {
    await db.insert(schema.spvTeam).values({
      spvId: spvIds[a.spvIdx],
      memberId: memberIds[a.memberIdx],
      responsibility: a.responsibility,
    });
  }
  console.log(`  ✓ ${spvTeamAssignments.length} SPV-team assignments created`);

  // ── 8. Create Distributions ─────────────────────────────────────────────
  const distData = [
    // Marina Bay — completed distributions
    { name: "Marina Bay — Final Return Distribution", fund: "MCG Marina Bay SPV Ltd", amount: 2_850_000, type: "Capital Return", status: "Paid", method: "Wire Transfer", distributionDate: daysAgo(15), notes: "Final tranche. Total ROI: 34% over 28 months." },
    { name: "Marina Bay — Q4 2025 Rental Income", fund: "MCG Marina Bay SPV Ltd", amount: 420_000, type: "Income", status: "Paid", method: "Wire Transfer", distributionDate: daysAgo(90), notes: "Final rental income distribution before handover completion." },
    { name: "Marina Bay — Q3 2025 Rental Income", fund: "MCG Marina Bay SPV Ltd", amount: 385_000, type: "Income", status: "Paid", method: "Wire Transfer", distributionDate: daysAgo(180), notes: "Quarterly rental income from pre-sold units." },

    // Kensington — scheduled
    { name: "Kensington — Pre-Sale Deposit Release #3", fund: "MCG Kensington Holdings Ltd", amount: 1_200_000, type: "Capital Return", status: "Scheduled", method: "Wire Transfer", distributionDate: daysFromNow(30), notes: "Third tranche of pre-sale deposits upon structural completion." },

    // Palm Jumeirah — ongoing rental income
    { name: "Palm Jumeirah — Q1 2026 Rental Income", fund: "MCG Palm Portfolio LLC", amount: 135_000, type: "Income", status: "Paid", method: "Wire Transfer", distributionDate: daysAgo(8), notes: "Rental income from 3 operational villas (Jan-Mar 2026)." },
    { name: "Palm Jumeirah — Q2 2026 Rental Income", fund: "MCG Palm Portfolio LLC", amount: 145_000, type: "Income", status: "Scheduled", method: "Wire Transfer", distributionDate: daysFromNow(82), notes: "Projected rental income. Expected increase from peak season." },

    // Stockholm — future
    { name: "Stockholm — Capital Call #1 (Co-Investors)", fund: "MCG Stockholm Waterfront AB", amount: 52_000_000, type: "Capital Call", status: "Pending", method: "Wire Transfer", distributionDate: daysFromNow(60), notes: "Pending financial close. Subject to co-investor commitments." },
  ];

  for (const d of distData) {
    await db.insert(schema.distributions).values({
      ...d,
      organizationId: orgId,
      currency: "USD",
    });
  }
  console.log(`  ✓ ${distData.length} distributions created`);

  // ── 9. Create Activity Log ──────────────────────────────────────────────
  const activityData = [
    { entityType: "venture", entityName: "Marina Bay Residences", action: "Stage advanced to Completed", detail: "All 180 units handed over. Final accounts settled. ROI: 34%.", userName: "James Harrington", daysAgo: 15 },
    { entityType: "distribution", entityName: "Marina Bay — Final Return Distribution", action: "Distribution paid", detail: "$2,850,000 final return distribution wired to investors.", userName: "Elena Petrova", daysAgo: 15 },
    { entityType: "venture", entityName: "Kensington Square Development", action: "Construction milestone reached", detail: "Structural completion floors 1-3 achieved. On schedule.", userName: "Tariq Mansour", daysAgo: 7 },
    { entityType: "task", entityName: "Retail lease — Burberry final terms", action: "Task updated", detail: "Burberry confirmed interest. Final lease terms under negotiation.", userName: "Marcus Lindberg", daysAgo: 5 },
    { entityType: "venture", entityName: "Palm Jumeirah Villa Portfolio", action: "Renovation progress update", detail: "Villa 4 kitchen demolition complete. Plumbing rough-in started.", userName: "Tariq Mansour", daysAgo: 4 },
    { entityType: "spv", entityName: "MCG Stockholm Waterfront AB", action: "Co-investor meeting", detail: "Nordea Wealth Management completed site visit. Positive feedback.", userName: "James Harrington", daysAgo: 3 },
    { entityType: "task", entityName: "Heritage commission submission package", action: "Task created", detail: "Heritage submission package being prepared for 22 April deadline.", userName: "Sofia Al-Rashid", daysAgo: 2 },
    { entityType: "venture", entityName: "Abu Dhabi Commercial District", action: "Government meeting", detail: "Met with Abu Dhabi Investment Office. Land allocation on track for May.", userName: "Sofia Al-Rashid", daysAgo: 2 },
    { entityType: "distribution", entityName: "Palm Jumeirah — Q1 2026 Rental Income", action: "Distribution paid", detail: "$135,000 Q1 rental income distributed from 3 operational villas.", userName: "Elena Petrova", daysAgo: 8 },
    { entityType: "venture", entityName: "Côte d'Azur Boutique Hotel", action: "Due diligence update", detail: "Structural survey completed. Minor remediation estimated at €180K.", userName: "Tariq Mansour", daysAgo: 6 },
    { entityType: "task", entityName: "BREEAM pre-assessment report", action: "Task flagged overdue", detail: "Sustainability consultant delayed by 10 days. Escalated to project manager.", userName: "ATLAS System", daysAgo: 1 },
    { entityType: "venture", entityName: "Stockholm Waterfront Office Tower", action: "Fundraising update", detail: "SEB Private Banking expressed interest in $20M co-investment. DD package sent.", userName: "James Harrington", daysAgo: 1 },
    { entityType: "task", entityName: "Government land allocation — follow up", action: "Task in progress", detail: "Follow-up meeting scheduled with Abu Dhabi government for next week.", userName: "Sofia Al-Rashid", daysAgo: 0 },
    { entityType: "venture", entityName: "Kensington Square Development", action: "Pre-sale update", detail: "Unit 22 buyer confirmed. Exchange of contracts scheduled for next week.", userName: "Marcus Lindberg", daysAgo: 0 },
  ];

  for (const a of activityData) {
    await db.insert(schema.activityLog).values({
      entityType: a.entityType,
      entityName: a.entityName,
      action: a.action,
      detail: a.detail,
      userName: a.userName,
      sector: "Real Estate",
      activitySource: a.userName === "ATLAS System" ? "system" : "client_business",
      organizationId: orgId,
      createdAt: ts(-a.daysAgo),
    });
  }
  console.log(`  ✓ ${activityData.length} activity log entries created`);

  // ── 10. Create Client Agent Config ──────────────────────────────────────
  const [existingConfig] = await db.select().from(schema.clientAgentConfig).where(eq(schema.clientAgentConfig.organizationId, orgId)).limit(1);
  if (!existingConfig) {
    await db.insert(schema.clientAgentConfig).values({
      organizationId: orgId,
      velocityAgentEnabled: true,
      complianceAgentEnabled: true,
      dealFlowAgentEnabled: true,
      orchestratorEnabled: true,
      overdueDaysThreshold: 5,
      distributionWarningDays: 14,
      healthScoreAlertThreshold: 40,
      autoAdvanceEnabled: false,
      autoAdvanceSectors: JSON.stringify(["Real Estate"]),
      pollingIntervalMinutes: 15,
    });
    console.log(`  ✓ Client agent config created`);
  }

  // ── Summary ─────────────────────────────────────────────────────────────
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  ✅ MERIDIAN CAPITAL GROUP — SEED COMPLETE                  ║
╠══════════════════════════════════════════════════════════════╣
║  Organization ID: ${String(orgId).padEnd(40)}║
║  Ventures:        ${String(ventureIds.length).padEnd(40)}║
║  Team Members:    ${String(memberIds.length).padEnd(40)}║
║  Tasks:           ${String(taskData.length).padEnd(40)}║
║  SPVs:            ${String(spvIds.length).padEnd(40)}║
║  Distributions:   ${String(distData.length).padEnd(40)}║
║  Activity Logs:   ${String(activityData.length).padEnd(40)}║
╠══════════════════════════════════════════════════════════════╣
║  Venture Stages:                                            ║
║    Completed:     Marina Bay Residences                     ║
║    Active:        Kensington Square, Palm Jumeirah           ║
║    Fundraising:   Stockholm Waterfront                       ║
║    Validation:    Côte d'Azur, Abu Dhabi                     ║
╠══════════════════════════════════════════════════════════════╣
║  Overdue Tasks:   5 (across 4 ventures)                     ║
║  In Progress:     10                                        ║
║  Open:            19                                        ║
╚══════════════════════════════════════════════════════════════╝
`);

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
