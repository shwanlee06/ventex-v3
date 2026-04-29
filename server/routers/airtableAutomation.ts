/**
 * Airtable Automation Router — Tier 3 Workflow Automations
 *
 * 1. Post-Meeting Auto-Logger: After logging a meeting, auto-creates interaction,
 *    updates investor pipeline stage, and creates follow-up tasks.
 *
 * 2. Investor Stage Change Triggers: When an investor moves stages, auto-creates
 *    signed document records, updates fundraise tracker, and notifies team.
 *
 * 3. Document Version Tracker: When a document is updated, auto-increments version
 *    and logs the change date.
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { notifyOwner } from "../_core/notification";
import {
  TABLES,
  createRecords,
  updateRecords,
  getRecord,
  getAllRecords,
  logInteraction,
  createPipelineTask,
  type MeetingFields,
  type InvestorFields,
  type InteractionFields,
  type PipelineTaskFields,
  type DocumentFields,
  type FundraiseFields,
} from "../airtable/client";

// ─── Helper: Stage progression map ─────────────────────────────
const STAGE_PROGRESSION: Record<string, string> = {
  "Identified": "Contacted",
  "Contacted": "Intro Call",
  "Intro Call": "Pitch Meeting",
  "Pitch Meeting": "Due Diligence",
  "Due Diligence": "Term Sheet",
  "Term Sheet": "Committed",
  "Committed": "Funded",
};

const MEETING_TO_STAGE: Record<string, string> = {
  "Intro Call": "Intro Call",
  "Pitch Meeting": "Pitch Meeting",
  "Follow-Up": "", // Don't auto-advance on follow-ups
  "Due Diligence Deep Dive": "Due Diligence",
  "Term Sheet Negotiation": "Term Sheet",
  "Closing Call": "Committed",
};

function addDays(date: Date, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export const airtableAutomationRouter = router({
  // ─── 1. Post-Meeting Auto-Logger ──────────────────────────────
  logMeeting: protectedProcedure
    .input(
      z.object({
        investorRecordId: z.string(),
        meetingType: z.enum([
          "Intro Call",
          "Pitch Meeting",
          "Follow-Up",
          "Due Diligence Deep Dive",
          "Term Sheet Negotiation",
          "Closing Call",
          "Investor Update",
          "Other",
        ]),
        title: z.string().min(1),
        dateTime: z.string(), // ISO date string
        location: z.string().optional(),
        attendees: z.string().optional(),
        notes: z.string().optional(),
        outcome: z.enum([
          "Very Positive",
          "Positive",
          "Neutral",
          "Negative",
          "Cancelled",
          "Rescheduled",
        ]),
        followUpRequired: z.boolean().default(true),
      })
    )
    .mutation(async ({ input }) => {
      const results: string[] = [];

      // 1a. Create the Meeting record
      const [meeting] = await createRecords<MeetingFields>(TABLES.MEETINGS, [
        {
          fields: {
            "Meeting Title": input.title,
            "Meeting Type": input.meetingType,
            "Date & Time": input.dateTime,
            "Location / Link": input.location,
            "Aurovia Attendees": input.attendees,
            "Meeting Notes": input.notes,
            "Outcome": input.outcome,
            "Follow-Up Required": input.followUpRequired,
            "Investor Pool": [input.investorRecordId],
          },
        },
      ]);
      results.push(`Meeting created: ${meeting.id}`);

      // 1b. Auto-create Interaction record
      const interaction = await logInteraction(input.investorRecordId, {
        title: `${input.meetingType}: ${input.title}`,
        type: "Meeting",
        direction: "Both",
        summary: input.notes || `${input.meetingType} with outcome: ${input.outcome}`,
        followUpRequired: input.followUpRequired,
        followUpDate: input.followUpRequired
          ? addDays(new Date(), input.outcome === "Very Positive" ? 3 : 7)
          : undefined,
        auroviaMembers: input.attendees,
      });
      results.push(`Interaction logged: ${interaction.id}`);

      // 1c. Auto-advance pipeline stage based on meeting type
      const newStage = MEETING_TO_STAGE[input.meetingType];
      if (newStage && input.outcome !== "Cancelled" && input.outcome !== "Negative") {
        const investor = await getRecord<InvestorFields>(
          TABLES.INVESTOR_POOL,
          input.investorRecordId
        );
        const currentStage = investor.fields["Pipeline Stage"] || "Identified";

        // Only advance forward, never backward
        const stageOrder = [
          "Identified", "Contacted", "Intro Call", "Pitch Meeting",
          "Due Diligence", "Term Sheet", "Committed", "Funded",
        ];
        const currentIdx = stageOrder.indexOf(currentStage);
        const newIdx = stageOrder.indexOf(newStage);

        if (newIdx > currentIdx) {
          await updateRecords<InvestorFields>(TABLES.INVESTOR_POOL, [
            {
              id: input.investorRecordId,
              fields: { "Pipeline Stage": newStage },
            },
          ]);
          results.push(`Pipeline stage advanced: ${currentStage} -> ${newStage}`);
        }
      }

      // 1d. If outcome is negative, move to Passed
      if (input.outcome === "Negative") {
        await updateRecords<InvestorFields>(TABLES.INVESTOR_POOL, [
          {
            id: input.investorRecordId,
            fields: { "Pipeline Stage": "Passed" },
          },
        ]);
        results.push("Investor moved to Passed");
      }

      // 1e. Auto-create follow-up task
      if (input.followUpRequired && input.outcome !== "Negative") {
        const followUpDays = input.outcome === "Very Positive" ? 3 : 7;
        const taskType =
          input.meetingType === "Pitch Meeting"
            ? "Send Deck"
            : input.meetingType === "Due Diligence Deep Dive"
            ? "Send Data Room"
            : "Follow-Up";

        const task = await createPipelineTask(input.investorRecordId, {
          title: `Follow up after ${input.meetingType} with ${input.title}`,
          type: taskType,
          dueDate: addDays(new Date(), followUpDays),
          description: `Outcome: ${input.outcome}. ${input.notes || ""}`.trim(),
        });

        // Link task to meeting
        await updateRecords<MeetingFields>(TABLES.MEETINGS, [
          {
            id: meeting.id,
            fields: { "Pipeline Tasks": [task.id] },
          },
        ]);
        results.push(`Follow-up task created: ${task.id} (due in ${followUpDays} days)`);
      }

      // 1f. Notify owner on very positive outcomes
      if (input.outcome === "Very Positive") {
        await notifyOwner({
          title: `Hot Lead: ${input.title}`,
          content: `${input.meetingType} outcome was Very Positive. Follow-up task created for ${addDays(new Date(), 3)}. Notes: ${input.notes || "N/A"}`,
        });
        results.push("Owner notified (hot lead)");
      }

      return { success: true, actions: results };
    }),

  // ─── 2. Investor Stage Change Triggers ────────────────────────
  changeInvestorStage: protectedProcedure
    .input(
      z.object({
        investorRecordId: z.string(),
        newStage: z.enum([
          "Identified",
          "Contacted",
          "Intro Call",
          "Pitch Meeting",
          "Due Diligence",
          "Term Sheet",
          "Committed",
          "Funded",
          "Passed",
          "Nurture",
        ]),
        notes: z.string().optional(),
        commitAmount: z.number().optional(), // For Committed/Funded stages
      })
    )
    .mutation(async ({ input }) => {
      const results: string[] = [];

      // Get current investor data
      const investor = await getRecord<InvestorFields>(
        TABLES.INVESTOR_POOL,
        input.investorRecordId
      );
      const oldStage = investor.fields["Pipeline Stage"] || "Identified";
      const investorName = investor.fields["Investor Name"] || "Unknown";

      // 2a. Update the pipeline stage
      await updateRecords<InvestorFields>(TABLES.INVESTOR_POOL, [
        {
          id: input.investorRecordId,
          fields: { "Pipeline Stage": input.newStage },
        },
      ]);
      results.push(`Stage changed: ${oldStage} -> ${input.newStage}`);

      // 2b. Log the stage change as an interaction
      await logInteraction(input.investorRecordId, {
        title: `Stage change: ${oldStage} -> ${input.newStage}`,
        type: "Note",
        direction: "Internal",
        summary: input.notes || `Pipeline stage updated from ${oldStage} to ${input.newStage}`,
      });
      results.push("Interaction logged for stage change");

      // 2c. Stage-specific triggers
      if (input.newStage === "Contacted") {
        // Create task to schedule intro call
        await createPipelineTask(input.investorRecordId, {
          title: `Schedule intro call with ${investorName}`,
          type: "Schedule Meeting",
          dueDate: addDays(new Date(), 5),
          description: "Investor has been contacted. Schedule an intro call within 5 business days.",
        });
        results.push("Task created: Schedule intro call");
      }

      if (input.newStage === "Due Diligence") {
        // Create task to send data room
        await createPipelineTask(input.investorRecordId, {
          title: `Send data room to ${investorName}`,
          type: "Send Data Room",
          dueDate: addDays(new Date(), 2),
          description: "Investor is in DD. Send the full data room package within 48 hours.",
        });
        results.push("Task created: Send data room");

        // Notify owner
        await notifyOwner({
          title: `DD Started: ${investorName}`,
          content: `${investorName} has entered Due Diligence. Data room task created.`,
        });
        results.push("Owner notified (DD started)");
      }

      if (input.newStage === "Term Sheet") {
        // Create task for legal review
        await createPipelineTask(input.investorRecordId, {
          title: `Review term sheet from ${investorName}`,
          type: "Legal Review",
          dueDate: addDays(new Date(), 3),
          description: "Term sheet received. Review with legal counsel within 3 days.",
        });
        results.push("Task created: Legal review");

        await notifyOwner({
          title: `Term Sheet: ${investorName}`,
          content: `${investorName} has sent a term sheet. Legal review task created.`,
        });
        results.push("Owner notified (term sheet)");
      }

      if (input.newStage === "Committed") {
        // Update Fundraise Tracker committed amount
        const rounds = await getAllRecords<FundraiseFields>(TABLES.FUNDRAISE_TRACKER, {
          filterByFormula: `AND({Round Stage} = "Active Fundraising", {Entity} = "VENTEX")`,
        });

        if (rounds.length > 0 && input.commitAmount) {
          const round = rounds[0];
          const currentCommitted = round.fields["Committed Amount (USD)"] || 0;
          await updateRecords<FundraiseFields>(TABLES.FUNDRAISE_TRACKER, [
            {
              id: round.id,
              fields: {
                "Committed Amount (USD)": currentCommitted + input.commitAmount,
              },
            },
          ]);
          results.push(`Fundraise tracker updated: +$${input.commitAmount.toLocaleString()}`);
        }

        // Create SAFE signing task
        await createPipelineTask(input.investorRecordId, {
          title: `Send SAFE to ${investorName} for signing`,
          type: "Send SAFE",
          dueDate: addDays(new Date(), 2),
          description: `${investorName} committed${input.commitAmount ? ` $${input.commitAmount.toLocaleString()}` : ""}. Send SAFE for execution.`,
        });
        results.push("Task created: Send SAFE");

        await notifyOwner({
          title: `Commitment: ${investorName}`,
          content: `${investorName} has committed${input.commitAmount ? ` $${input.commitAmount.toLocaleString()}` : ""}! SAFE signing task created.`,
        });
        results.push("Owner notified (commitment)");
      }

      if (input.newStage === "Funded") {
        // Update Fundraise Tracker received amount
        const rounds = await getAllRecords<FundraiseFields>(TABLES.FUNDRAISE_TRACKER, {
          filterByFormula: `AND({Round Stage} = "Active Fundraising", {Entity} = "VENTEX")`,
        });

        if (rounds.length > 0 && input.commitAmount) {
          const round = rounds[0];
          const currentReceived = round.fields["Received Amount (USD)"] || 0;
          await updateRecords<FundraiseFields>(TABLES.FUNDRAISE_TRACKER, [
            {
              id: round.id,
              fields: {
                "Received Amount (USD)": currentReceived + input.commitAmount,
              },
            },
          ]);
          results.push(`Fundraise tracker: received +$${input.commitAmount.toLocaleString()}`);
        }

        // Create Signed Documents record
        await createRecords(TABLES.SIGNED_DOCUMENTS, [
          {
            fields: {
              "Signed Document Name": `SAFE - ${investorName}`,
              "Document Name": `SAFE Agreement - ${investorName}`,
              "Signed Date": new Date().toISOString().split("T")[0],
              "Signer Name(s)": investorName,
              "Counterparty": investorName,
              "Document Type": "SAFE Agreement",
              "Status": "Signed",
              "Type of Project": "VENTEX",
              "Notes": input.notes || `Funded by ${investorName}`,
            },
          },
        ]);
        results.push("Signed document record created");

        await notifyOwner({
          title: `Funded: ${investorName}`,
          content: `${investorName} wire received${input.commitAmount ? ` ($${input.commitAmount.toLocaleString()})` : ""}! Signed document record created.`,
        });
        results.push("Owner notified (funded)");
      }

      if (input.newStage === "Passed") {
        // Log why they passed
        await logInteraction(input.investorRecordId, {
          title: `Investor passed`,
          type: "Note",
          direction: "Internal",
          summary: input.notes || "Investor passed on this round.",
        });
        results.push("Pass reason logged");
      }

      if (input.newStage === "Nurture") {
        // Create a future follow-up task (30 days out)
        await createPipelineTask(input.investorRecordId, {
          title: `Nurture check-in with ${investorName}`,
          type: "Follow-Up",
          dueDate: addDays(new Date(), 30),
          description: "Moved to nurture. Check in after 30 days with a progress update.",
        });
        results.push("Nurture follow-up task created (30 days)");
      }

      return { success: true, actions: results, oldStage, newStage: input.newStage };
    }),

  // ─── 3. Document Version Tracker ──────────────────────────────
  updateDocument: protectedProcedure
    .input(
      z.object({
        documentRecordId: z.string(),
        fileUrl: z.string().url().optional(),
        fileName: z.string().optional(),
        notes: z.string().optional(),
        status: z
          .enum([
            "Needs Revision",
            "Under Review",
            "Draft",
            "Sent to Investor",
            "Signed",
            "Final",
          ])
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      const results: string[] = [];

      // Get current document
      const doc = await getRecord<DocumentFields>(
        TABLES.AUROVIA_DOCUMENTS,
        input.documentRecordId
      );
      const currentVersion = doc.fields["Version"] || 1;
      const docName = doc.fields["Document Name"] || "Unknown";
      const newVersion = currentVersion + 1;

      // Build update fields
      const updateFields: Partial<DocumentFields> = {
        "Version": newVersion,
        "Last Updated": new Date().toISOString().split("T")[0],
      };

      if (input.fileUrl) {
        updateFields["File"] = [
          { url: input.fileUrl, filename: input.fileName || `${docName}_v${newVersion}` },
        ];
      }

      if (input.notes) {
        const existingNotes = doc.fields["Notes"] || "";
        updateFields["Notes"] = `[v${newVersion} - ${new Date().toISOString().split("T")[0]}] ${input.notes}\n${existingNotes}`;
      }

      if (input.status) {
        updateFields["Status"] = input.status;
      }

      await updateRecords<DocumentFields>(TABLES.AUROVIA_DOCUMENTS, [
        { id: input.documentRecordId, fields: updateFields },
      ]);
      results.push(`Version incremented: v${currentVersion} -> v${newVersion}`);

      // Notify on status changes to Final or Sent to Investor
      if (input.status === "Final" || input.status === "Sent to Investor") {
        await notifyOwner({
          title: `Document ${input.status}: ${docName}`,
          content: `${docName} has been marked as "${input.status}" (v${newVersion}).${input.notes ? ` Notes: ${input.notes}` : ""}`,
        });
        results.push(`Owner notified (${input.status})`);
      }

      return {
        success: true,
        actions: results,
        documentName: docName,
        oldVersion: currentVersion,
        newVersion,
      };
    }),

  // ─── Utility: Get pipeline summary ────────────────────────────
  getPipelineSummary: protectedProcedure.query(async () => {
    const all = await getAllRecords<InvestorFields>(TABLES.INVESTOR_POOL, {
      fields: [
        "Investor Name",
        "Pipeline Stage",
        "Priority",
        "Interest Level",
        "Last Contacted",
        "Contact Email",
        "Type",
      ],
    });

    const byStage: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    const byType: Record<string, number> = {};
    let withEmail = 0;
    let withoutEmail = 0;
    let contactedLast7Days = 0;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    for (const r of all) {
      const stage = r.fields["Pipeline Stage"] || "Unknown";
      const priority = r.fields["Priority"] || "Unknown";
      const type = r.fields["Type"] || "Unknown";
      byStage[stage] = (byStage[stage] || 0) + 1;
      byPriority[priority] = (byPriority[priority] || 0) + 1;
      byType[type] = (byType[type] || 0) + 1;

      if (r.fields["Contact Email"]) withEmail++;
      else withoutEmail++;

      if (r.fields["Last Contacted"]) {
        const lastContact = new Date(r.fields["Last Contacted"]);
        if (lastContact >= sevenDaysAgo) contactedLast7Days++;
      }
    }

    return {
      total: all.length,
      byStage,
      byPriority,
      byType,
      withEmail,
      withoutEmail,
      contactedLast7Days,
    };
  }),
});
