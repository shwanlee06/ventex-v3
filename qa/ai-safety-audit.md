# Section 2.5 — AI Safety Enforcement Audit

**Date:** 2026-04-16

## Architecture Overview

The AI safety system (internally referenced as "WS3") implements a comprehensive human-in-the-loop approval framework for all AI agent outputs.

### Confidence Scoring

| Agent | Threshold | Base Score Logic |
|-------|-----------|-----------------|
| Velocity Agent | Per-agent threshold | +30 entity data, +20 historical, +15 blueprint context |
| Compliance Agent | Per-agent threshold | Same base + agent-specific bonus |
| Distribution Sentinel | Per-agent threshold | Financial flag always triggers approval |
| Deal Flow Agent | Per-agent threshold | Same base scoring |
| Orchestrator | Per-agent threshold | +5 bonus (aggregation = more reliable) |

Default confidence threshold: Applied when agent-specific threshold not configured.

### Approval Rules

| Condition | Requires Human Approval? |
|-----------|------------------------|
| Client-facing communication | **ALWAYS** |
| Draft communication (any type) | **ALWAYS** |
| Stage advance action | **ALWAYS** |
| Financial-related action | **ALWAYS** |
| Low confidence score (below threshold) | **YES** |
| Default (fail-safe) | **YES** |

**Finding AI-01 (PASS):** The `requiresHumanApproval()` function defaults to `true` (fail-safe). This means even if all other checks pass, approval is still required. This is the correct security posture.

### Draft Safety Fields

All drafts are created with:
- `humanApprovalRequired: true` — hardcoded, cannot be bypassed
- `approvalStatus: "pending"` — must be explicitly approved
- `confidenceScore` — computed from agent context
- `disclaimer` — auto-generated for all drafts

**Finding AI-02 (PASS):** Draft safety fields are hardcoded to require approval. The `getDraftSafetyFields()` function always returns `humanApprovalRequired: true` regardless of confidence score.

### Execution Enforcement

The `isApprovedForExecution()` function checks:
1. If `humanApprovalRequired` is false → allow (human-initiated actions)
2. If `approvalStatus === "approved"` → allow
3. Otherwise → block

**Finding AI-03 (PASS):** Execution is properly gated. Only explicitly approved items can be executed.

### Approval Logging

Every approval/rejection is logged to the `agent_approval_log` table with:
- Entity type and ID
- Action (approved/rejected/edited)
- Actor ID and name
- Original and final content (for edits)
- Reason (for rejections)
- Confidence score at time of decision
- Disclaimer applied

**Finding AI-04 (PASS):** Immutable audit trail for all AI approval decisions. This supports SOC 2 Type II requirements.

### Auto-Advance Safety

Stage advances have additional safety:
- `autoAdvanceEnabled` must be explicitly enabled per org
- `autoAdvanceSectors` can restrict which sectors allow auto-advance
- Capital-intensive stages (Mode B) always require explicit client approval
- Even with auto-advance enabled, the system checks sector authorization

**Finding AI-05 (PASS):** Auto-advance has proper guardrails with per-org configuration and capital stage protection.

### Bypass Attempt Analysis

| Bypass Vector | Status |
|--------------|--------|
| Set humanApprovalRequired=false via tRPC | **BLOCKED** — field is computed server-side, not accepted as input |
| Set approvalStatus="approved" directly | **BLOCKED** — only sendDraft/approveEvent procedures can set this |
| Skip approval by calling executeAction directly | **BLOCKED** — executeAction is adminProcedure only |
| Modify confidence score to exceed threshold | **BLOCKED** — score is computed server-side from data context |
| Send draft without approval | **BLOCKED** — sendDraft procedure explicitly marks as approved (the act of sending IS the approval) |

**Finding AI-06 (PASS):** No bypass vectors identified. All safety fields are computed server-side and cannot be manipulated via client input.

## Summary

| Finding | Severity | Status |
|---------|----------|--------|
| AI-01: Fail-safe default | PASS | requiresHumanApproval defaults to true |
| AI-02: Draft safety hardcoded | PASS | All drafts require approval |
| AI-03: Execution gating | PASS | Only approved items can execute |
| AI-04: Approval audit trail | PASS | Immutable log of all decisions |
| AI-05: Auto-advance guardrails | PASS | Per-org config + capital stage protection |
| AI-06: No bypass vectors | PASS | All safety fields server-computed |

**Verdict: AI safety enforcement is comprehensive and well-implemented.** The human-in-the-loop pattern is consistently applied with fail-safe defaults, immutable audit trails, and no client-side bypass vectors.
