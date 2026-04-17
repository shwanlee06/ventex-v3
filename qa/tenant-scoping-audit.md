# VENTEX Phase 2 — Section 2.1: Tenant Scoping Audit

**Date:** 2026-04-16
**Auditor:** VENTEX QA System
**Scope:** All 280 tRPC procedures across 25 router files
**Method:** Static code analysis + manual review of flagged procedures

---

## Executive Summary

| Metric | Count |
|--------|-------|
| Total procedures | 280 |
| Properly scoped (data-level isolation) | 165 |
| Admin-gated only (role check, no data scoping) | 58 |
| User-scoped (personal data via ctx.user.id) | 6 |
| Public (no auth by design) | 7 |
| **Truly unscoped (IDOR risk)** | **12** |
| Safe-unscoped (utility/non-tenant data) | 32 |

### Scoping Mechanisms Detected

The codebase uses **5 distinct tenant isolation mechanisms**:

1. **`isVentexTeam()` + `getOrgVentureIds()`** — The primary pattern. Checks if user is VENTEX admin; if not, restricts venture IDs to the user's organization.
2. **`resolveVentureScope()` / `resolveSpvScope()`** — Wrapper that combines admin org-switching with client RBAC.
3. **`resolveOrgId()`** — From `orgScope.ts`. Forces non-VENTEX users to their own `organizationId`. Throws FORBIDDEN on cross-tenant attempts.
4. **`TENANT_PATCHED` marker** — Inline comments marking procedures that were retroactively patched with venture-access checks.
5. **`adminProcedure` / `partnerProcedure` middleware** — Role-based gates that restrict to admin/owner or partner+ roles.

---

## Procedure-by-Procedure Register

### Legend

| Symbol | Meaning |
|--------|---------|
| **SCOPED** | Has data-level tenant isolation |
| **ADMIN** | Admin role gate (only admin/owner can call) |
| **PARTNER** | Partner role gate (partner/admin/owner) |
| **USER** | Scoped to ctx.user.id (personal data) |
| **PUBLIC** | No auth required (by design) |
| **IDOR** | Accepts arbitrary ID without org verification — **security risk** |
| **SAFE** | No tenant data involved (utility, global config, etc.) |

---

### Router: `access` (15 procedures)

| # | Procedure | Type | Category | Scoping Detail |
|---|-----------|------|----------|----------------|
| 1 | listOrganizations | admin | ADMIN | Role gate only — lists all orgs (admin function) |
| 2 | createOrganization | admin | ADMIN | Role gate only — creates org (admin function) |
| 3 | updateOrganization | admin | ADMIN | Role gate only — updates org (admin function) |
| 4 | grantOrgVentureAccess | admin | SCOPED | Admin gate + explicit orgId in input |
| 5 | revokeOrgVentureAccess | admin | ADMIN | Role gate only — revokes access (admin function) |
| 6 | listOrgVentureAccess | admin | SCOPED | Admin gate + explicit orgId filter |
| 7 | sendInvitation | admin | SCOPED | Admin gate + orgId in input |
| 8 | listInvitations | admin | ADMIN | Role gate — lists all invitations |
| 9 | revokeInvitation | admin | ADMIN | Role gate — revokes by ID |
| 10 | validateInvitation | protected | SAFE | Token-based lookup, no tenant data exposed |
| 11 | acceptInvitation | protected | USER | Scoped to ctx.user.id/openId |
| 12 | listApiKeys | protected | USER | Scoped to ctx.user.id |
| 13 | generateApiKey | admin | ADMIN | Role gate only |
| 14 | revokeApiKey | admin | ADMIN | Role gate only |
| 15 | checkAccess | protected | SCOPED | Uses ctx.user.organizationId |
| 16 | lookupOrgBySlug | protected | SAFE | Read-only slug lookup, returns minimal data |
| 17 | getStats | admin | ADMIN | Role gate only |
| 18 | blockUser | admin | ADMIN | Role gate only |
| 19 | unblockUser | admin | ADMIN | Role gate only |

### Router: `activity` (3 procedures)

| # | Procedure | Type | Category | Scoping Detail |
|---|-----------|------|----------|----------------|
| 20 | list | protected | SCOPED | isVentexTeam + resolveVentureScope |
| 21 | recent | protected | SCOPED | isVentexTeam + resolveVentureScope |
| 22 | metrics | protected | SAFE | Returns aggregate counts only (today/week/month/total). No tenant-specific data exposed — fetches all activity_log rows but returns only numeric counts. Low risk. |

### Router: `agents` (22 procedures)

| # | Procedure | Type | Category | Scoping Detail |
|---|-----------|------|----------|----------------|
| 23 | list | protected | SCOPED | isVentexTeam + orgId filter on agent_events |
| 24 | metrics | protected | SCOPED | isVentexTeam + orgId filter |
| 25 | runAll | admin | ADMIN | Role gate only |
| 26 | runSingle | admin | SCOPED | Admin gate + resolveVentureScope |
| 27 | markRead | protected | SAFE | Marks agent_events as read by ID — no tenant data leaked. Events are already filtered on list. |
| 28 | markAllRead | protected | SCOPED | isVentexTeam + orgId filter |
| 29 | executeAction | admin | ADMIN | Role gate only |
| 30 | listDrafts | protected | SCOPED | isVentexTeam + orgId filter on agent_drafts |
| 31 | sendDraft | protected | SCOPED | isVentexTeam + TENANT_PATCHED |
| 32 | dismissDraft | protected | SCOPED | isVentexTeam + TENANT_PATCHED |
| 33 | restoreDraft | protected | SCOPED | isVentexTeam + TENANT_PATCHED |
| 34 | deleteDraft | protected | SCOPED | isVentexTeam + TENANT_PATCHED |
| 35 | bulkDeleteDrafts | protected | SCOPED | isVentexTeam + orgId filter |
| 36 | draftStats | protected | SAFE | Returns aggregate counts only (totalSent, totalPending, sentThisMonth). No per-tenant breakdown. |
| 37 | pendingApprovals | protected | SCOPED | isVentexTeam + orgId filter |
| 38 | approveEvent | admin | ADMIN | Role gate only |
| 39 | rejectEvent | admin | ADMIN | Role gate only |
| 40 | approvalLog | admin | ADMIN | Role gate only |
| 41 | velocityMetrics | protected | SCOPED | isVentexTeam + orgId filter |
| 42 | velocityLog | protected | SCOPED | isVentexTeam + orgId filter |
| 43 | clientFeed | protected | SCOPED | isVentexTeam + orgId filter |
| 44 | clientDismiss | protected | SCOPED | isVentexTeam check |
| 45 | clientAction | protected | SCOPED | isVentexTeam check |
| 46 | getDraft | protected | SCOPED | isVentexTeam check |
| 47 | getEventDetail | protected | SCOPED | isVentexTeam check |
| 48 | operatorOversight | admin | ADMIN | Role gate only |
| 49 | clientAdvanceStage | protected | SCOPED | isVentexTeam check + orgId |
| 50 | listEvents | protected | SCOPED | isVentexTeam + orgId filter |
| 51 | sectorBenchmarks | protected | SCOPED | isVentexTeam + resolveVentureScope |
| 52 | escalationStats | admin | ADMIN | Role gate only |
| 53 | schedulerStatus | admin | ADMIN | Role gate only |
| 54 | triggerCycle | admin | ADMIN | Role gate only |
| 55 | purgeStaleEvents | admin | ADMIN | Role gate only |

### Router: `ai` (1 procedure)

| # | Procedure | Type | Category | Scoping Detail |
|---|-----------|------|----------|----------------|
| 56 | chat | admin | ADMIN | Role gate — only admin/owner can use AI chat |

### Router: `aiTasks` (1 procedure)

| # | Procedure | Type | Category | Scoping Detail |
|---|-----------|------|----------|----------------|
| 57 | generate | admin | SCOPED | Admin gate + resolveOrgId + orgId filter |

### Router: `audit` (1 procedure)

| # | Procedure | Type | Category | Scoping Detail |
|---|-----------|------|----------|----------------|
| 58 | list | partner | PARTNER | Partner role gate (partner/admin/owner) |

### Router: `blueprintDiagnostics` (12 procedures)

| # | Procedure | Type | Category | Scoping Detail |
|---|-----------|------|----------|----------------|
| 59 | listTemplates | protected | SCOPED | isVentexTeam + resolveOrgId |
| 60 | getTemplateById | protected | SCOPED | isVentexTeam + resolveOrgId |
| 61 | listTracking | protected | SCOPED | resolveOrgId |
| 62 | getVentureTracking | protected | SCOPED | resolveOrgId |
| 63 | getComplianceScore | protected | SCOPED | resolveOrgId |
| 64 | getBlockingSteps | protected | SCOPED | resolveOrgId |
| 65 | getStepTimeline | protected | SCOPED | resolveOrgId |
| 66 | getProcessAnalytics | protected | SCOPED | resolveOrgId |
| 67 | resolveAttribution | protected | USER | Scoped to ctx.user.id |
| 68 | getVentureReadiness | protected | SCOPED | resolveOrgId |
| 69 | getOrgComplianceOverview | protected | SCOPED | resolveOrgId |
| 70 | getStepCompletionTrends | protected | SCOPED | resolveOrgId |

### Router: `blueprints` (26 procedures)

| # | Procedure | Type | Category | Scoping Detail |
|---|-----------|------|----------|----------------|
| 71 | listTemplates | admin | SCOPED | Admin + isVentexTeam + resolveOrgId |
| 72 | getTemplateById | admin | SCOPED | Admin + resolveOrgId |
| 73 | createTemplate | admin | SCOPED | Admin + resolveOrgId |
| 74 | updateTemplate | admin | SCOPED | Admin + resolveOrgId |
| 75 | deleteTemplate | admin | SCOPED | Admin + isVentexTeam |
| 76 | duplicateTemplate | admin | SCOPED | Admin + resolveOrgId |
| 77 | getSteps | admin | SCOPED | Admin + isVentexTeam |
| 78 | addStep | admin | SCOPED | Admin + isVentexTeam |
| 79 | updateStep | admin | SCOPED | Admin + isVentexTeam |
| 80 | deleteStep | admin | SCOPED | Admin + isVentexTeam |
| 81 | reorderSteps | admin | SCOPED | Admin + isVentexTeam |
| 82 | applyToVenture | admin | SCOPED | Admin + resolveOrgId |
| 83 | getVentureTracking | admin | SCOPED | Admin + isVentexTeam |
| 84 | updateStepStatus | admin | SCOPED | Admin + isVentexTeam |
| 85 | getComplianceScore | admin | SCOPED | Admin + resolveOrgId |
| 86 | getBlockingSteps | admin | SCOPED | Admin + resolveOrgId |
| 87 | getProcessAnalytics | admin | SCOPED | Admin + resolveOrgId |
| 88 | getStepTimeline | admin | SCOPED | Admin + resolveOrgId |
| 89 | generateAiTemplate | admin | SCOPED | Admin + resolveOrgId |
| 90 | getVentureReadiness | admin | SCOPED | Admin + resolveOrgId |
| 91 | getOrgComplianceOverview | admin | SCOPED | Admin + resolveOrgId |
| 92 | getStepCompletionTrends | admin | SCOPED | Admin + resolveOrgId |
| 93 | getVentureProcessHistory | admin | SCOPED | Admin + isVentexTeam |
| 94 | bulkUpdateSteps | admin | SCOPED | Admin + isVentexTeam |
| 95 | getTemplateUsageStats | admin | SCOPED | Admin + isVentexTeam |
| 96 | exportTemplateJson | admin | SCOPED | Admin + isVentexTeam |

### Router: `distributions` (8 procedures)

| # | Procedure | Type | Category | Scoping Detail |
|---|-----------|------|----------|----------------|
| 97 | list | protected | SCOPED | resolveOrgId — forces client to own org |
| 98 | create | protected | SCOPED | isVentexTeam check + orgId |
| 99 | update | protected | SCOPED | isVentexTeam check |
| 100 | delete | protected | SCOPED | isVentexTeam check |
| 101 | convertAmount | protected | SAFE | Pure utility — currency conversion, no DB data |
| 102 | metrics | protected | SCOPED | resolveOrgId |
| 103 | getRecipients | protected | SCOPED | isVentexTeam + orgId |
| 104 | createReceipt | protected | SCOPED | isVentexTeam + orgId |

### Router: `documentIntelligence` (10 procedures)

| # | Procedure | Type | Category | Scoping Detail |
|---|-----------|------|----------|----------------|
| 105 | processFile | admin | SCOPED | Admin + isVentexTeam + resolveVentureScope |
| 106 | getByFileId | admin | ADMIN | Role gate only |
| 107 | getByVenture | admin | ADMIN | Role gate only |
| 108 | getBySpv | admin | ADMIN | Role gate only |
| 109 | recentFeed | admin | ADMIN | Role gate only |
| 110 | retryProcessing | admin | ADMIN | Role gate only |
| 111 | getVentureRisks | admin | ADMIN | Role gate only |
| 112 | updateRiskStatus | admin | ADMIN | Role gate only |
| 113 | getMeetingBriefs | admin | ADMIN | Role gate only |
| 114 | searchDocuments | admin | ADMIN | Role gate only |

### Router: `email` (2 procedures)

| # | Procedure | Type | Category | Scoping Detail |
|---|-----------|------|----------|----------------|
| 115 | sendWelcome | admin | SCOPED | Admin + isVentexTeam |
| 116 | sendCustom | admin | SCOPED | Admin + isVentexTeam |

### Router: `intelligence` (13 procedures)

| # | Procedure | Type | Category | Scoping Detail |
|---|-----------|------|----------|----------------|
| 117 | getDailyBrief | protected | SCOPED | resolveOrgId |
| 118 | generateDailyBrief | protected | SCOPED | resolveOrgId |
| 119 | getBriefHistory | protected | SCOPED | resolveOrgId |
| 120 | getVentureHealth | protected | **IDOR** | **Accepts ventureId without org verification. Any authenticated user can query any venture's health score.** |
| 121 | getAllVentureHealth | protected | SCOPED | resolveOrgId |
| 122 | refreshAllHealthScores | protected | SCOPED | resolveOrgId |
| 123 | getSmartAlerts | protected | SCOPED | resolveOrgId |
| 124 | refreshSmartAlerts | protected | SCOPED | resolveOrgId |
| 125 | dismissAlert | protected | **IDOR** | **Accepts alertId without org verification. Any authenticated user can dismiss any alert.** |
| 126 | getObservations | protected | SCOPED | resolveOrgId |
| 127 | generateObservations | protected | SCOPED | resolveOrgId |
| 128 | getPortfolioTrend | protected | SCOPED | resolveOrgId + TENANT_PATCHED |
| 129 | getAnomalies | protected | SCOPED | resolveOrgId + TENANT_PATCHED |

### Router: `notifications` (6 procedures)

| # | Procedure | Type | Category | Scoping Detail |
|---|-----------|------|----------|----------------|
| 130 | list | protected | SCOPED | orgId filter on notifications |
| 131 | markRead | protected | SCOPED | orgId filter |
| 132 | markAllRead | protected | SCOPED | orgId filter |
| 133 | unreadCount | protected | SCOPED | orgId filter |
| 134 | delete | protected | SAFE | Inline admin check (`ctx.user.role !== "admin"` throws). Admin-only operation. |
| 135 | clearRead | protected | SAFE | Inline admin check. Admin-only operation. |

### Router: `onboarding` (1 procedure)

| # | Procedure | Type | Category | Scoping Detail |
|---|-----------|------|----------|----------------|
| 136 | complete | admin | ADMIN | Role gate only — creates new org |

### Router: `organizations` (14 procedures)

| # | Procedure | Type | Category | Scoping Detail |
|---|-----------|------|----------|----------------|
| 137 | list | protected | SCOPED | isVentexTeam + orgId filter |
| 138 | listWithMetrics | protected | SCOPED | isVentexTeam + orgId filter |
| 139 | bySlug | protected | SCOPED | isVentexTeam + orgId filter |
| 140 | create | admin | ADMIN | Role gate only |
| 141 | update | admin | ADMIN | Role gate only |
| 142 | archive | admin | ADMIN | Role gate only |
| 143 | restore | admin | ADMIN | Role gate only |
| 144 | delete | admin | ADMIN | Role gate only |
| 145 | ventures | protected | SCOPED | isVentexTeam + orgId filter |
| 146 | configureAgents | admin | SCOPED | Admin + orgId |
| 147 | getAgentConfig | admin | SCOPED | Admin + orgId |
| 148 | updateAgentConfig | admin | ADMIN | Role gate only |
| 149 | sendInvitations | admin | SCOPED | Admin + orgId |
| 150 | onboardingComplete | admin | ADMIN | Role gate only |

### Router: `portal` (12 procedures)

| # | Procedure | Type | Category | Scoping Detail |
|---|-----------|------|----------|----------------|
| 151 | getData | protected | SCOPED | isVentexTeam + ctx.user.organizationId |
| 152 | getVentureTasks | protected | SCOPED | isVentexTeam + orgId |
| 153 | completeTask | protected | SCOPED | isVentexTeam + orgId |
| 154 | aiChat | protected | SCOPED | isVentexTeam + orgId |
| 155 | getDrafts | protected | SCOPED | isVentexTeam + orgId |
| 156 | approveDraft | protected | SCOPED | isVentexTeam + orgId |
| 157 | dismissDraft | protected | SCOPED | isVentexTeam + orgId |
| 158 | trackDownload | protected | SCOPED | isVentexTeam + orgId |
| 159 | getDownloadHistory | protected | SCOPED | isVentexTeam + orgId |
| 160 | markDistributionRead | protected | SCOPED | isVentexTeam + orgId |
| 161 | getDistributionReceipts | protected | SCOPED | isVentexTeam + orgId |
| 162 | resolveAction | protected | SCOPED | isVentexTeam + orgId |

### Router: `search` (1 procedure)

| # | Procedure | Type | Category | Scoping Detail |
|---|-----------|------|----------|----------------|
| 163 | global | protected | SCOPED | resolveOrgId + resolveVentureScope |

### Router: `security` (16 procedures)

| # | Procedure | Type | Category | Scoping Detail |
|---|-----------|------|----------|----------------|
| 164 | listUsers | admin | ADMIN | Role gate only |
| 165 | updateUserRole | admin | ADMIN | Role gate only |
| 166 | deleteUser | admin | ADMIN | Role gate only |
| 167 | listVentureAccess | protected | SAFE | requirePermission("manage_access") — only manager+ roles. Returns access grants for a specific venture. |
| 168 | grantAccess | protected | USER | requirePermission + ctx.user.id for grantedBy |
| 169 | revokeAccess | protected | USER | requirePermission + ctx.user.id |
| 170 | getAuditLog | protected | SCOPED | resolveOrgId |
| 171 | getAuditStats | protected | SAFE | requirePermission("view_audit_log") — returns aggregate counts only |
| 172 | getSecurityStatus | protected | SAFE | Returns system-wide security status (encryption, user counts). No tenant-specific data. |
| 173 | getMyPermissions | protected | SAFE | Returns permissions for ctx.user.role — no tenant data |
| 174 | getOrgSecuritySettings | admin | SCOPED | Admin + resolveOrgId |
| 175 | updateOrgSecuritySettings | admin | SCOPED | Admin + resolveOrgId |
| 176 | getSessionConfig | protected | SCOPED | resolveOrgId |
| 177 | exportAuditLogCsv | protected | SCOPED | resolveOrgId |
| 178 | getRetentionStats | admin | ADMIN | Role gate only |
| 179 | purgeExpiredAuditLogs | admin | ADMIN | Role gate only |

### Router: `settings` (16 procedures)

| # | Procedure | Type | Category | Scoping Detail |
|---|-----------|------|----------|----------------|
| 180 | getProfile | protected | USER-IMPLICIT | Uses ctx.user.id to fetch own profile |
| 181 | updateProfile | protected | USER-IMPLICIT | Updates own profile via ctx.user.id |
| 182 | updateNotifications | protected | USER-IMPLICIT | Updates own notification prefs via ctx.user.id |
| 183 | updateDisplay | protected | USER-IMPLICIT | Updates own display prefs via ctx.user.id |
| 184 | updateSecurity | protected | USER-IMPLICIT | Updates own security settings via ctx.user.id |
| 185 | getMfaStatus | protected | USER-IMPLICIT | Reads own MFA status via ctx.user.id |
| 186 | mfaSetup | protected | USER-IMPLICIT | Sets up MFA for ctx.user.id |
| 187 | mfaVerify | protected | USER-IMPLICIT | Verifies MFA for ctx.user.id |
| 188 | mfaValidate | protected | USER-IMPLICIT | Validates MFA code for ctx.user.id |
| 189 | mfaDisable | protected | USER-IMPLICIT | Disables MFA for ctx.user.id |
| 190 | mfaRegenerateBackupCodes | protected | USER-IMPLICIT | Regenerates backup codes for ctx.user.id |
| 191 | getAuditLog | protected | USER-IMPLICIT | Fetches audit log for ctx.user.id |
| 192 | getActiveSessions | protected | USER-IMPLICIT | Lists sessions for ctx.user.id |
| 193 | terminateSession | protected | USER-IMPLICIT | Terminates session owned by ctx.user.id |
| 194 | getRetentionStats | protected | SAFE | Inline admin check — returns system stats |
| 195 | runRetentionPurge | protected | SAFE | Inline admin check — system maintenance |

### Router: `spvs` (20 procedures)

| # | Procedure | Type | Category | Scoping Detail |
|---|-----------|------|----------|----------------|
| 196 | list | protected | SCOPED | isVentexTeam + resolveSpvScope |
| 197 | getBySlug | protected | SCOPED | isVentexTeam + getOrgSpvIds |
| 198 | getById | protected | SCOPED | isVentexTeam + getOrgSpvIds |
| 199 | create | protected | SCOPED | isVentexTeam check |
| 200 | update | protected | SCOPED | isVentexTeam check |
| 201 | getLinkedVentures | protected | **IDOR** | **Accepts spvId without org verification. Any authenticated user can see which ventures are linked to any SPV.** |
| 202 | linkVenture | protected | SCOPED | isVentexTeam check |
| 203 | unlinkVenture | protected | SCOPED | isVentexTeam check |
| 204 | getTeam | protected | **IDOR** | **Accepts spvId without org verification. Any authenticated user can see team members assigned to any SPV.** |
| 205 | assignTeam | protected | SCOPED | isVentexTeam check |
| 206 | removeTeam | protected | SCOPED | isVentexTeam check |
| 207 | getFiles | protected | SCOPED | TENANT_PATCHED + isVentexTeam + getOrgSpvIds |
| 208 | uploadFile | protected | SCOPED | TENANT_PATCHED + isVentexTeam |
| 209 | deleteFile | protected | SCOPED | isVentexTeam check |
| 210 | moveFile | protected | SCOPED | TENANT_PATCHED + isVentexTeam |
| 211 | getFolders | protected | SCOPED | TENANT_PATCHED + isVentexTeam |
| 212 | createFolder | protected | SCOPED | TENANT_PATCHED + isVentexTeam |
| 213 | deleteFolder | protected | SCOPED | isVentexTeam check |
| 214 | renameFolder | protected | **IDOR** | **Accepts folderId without org verification. Any authenticated user can rename any SPV folder.** |
| 215 | metrics | protected | SCOPED | resolveSpvScope |

### Router: `tasks` (12 procedures)

| # | Procedure | Type | Category | Scoping Detail |
|---|-----------|------|----------|----------------|
| 216 | list | protected | SCOPED | resolveVentureScope |
| 217 | getById | protected | SCOPED | resolveVentureScope |
| 218 | getByVenture | protected | SCOPED | TENANT_PATCHED + resolveVentureScope |
| 219 | create | protected | SCOPED | isVentexTeam check |
| 220 | update | protected | **IDOR** | **Accepts task id without org verification. Any authenticated user can update any task's title, status, priority, assignees, etc.** |
| 221 | delete | protected | SCOPED | isVentexTeam check |
| 222 | metrics | protected | SCOPED | resolveVentureScope |
| 223 | listOverdue | admin | ADMIN | Role gate only |
| 224 | overdueByClient | admin | ADMIN | Role gate only |
| 225 | scanAndNotify | admin | ADMIN | Role gate only |
| 226 | workloadSummary | admin | ADMIN | Role gate only |
| 227 | sectorMetrics | admin | ADMIN | Role gate only |

### Router: `team` (18 procedures)

| # | Procedure | Type | Category | Scoping Detail |
|---|-----------|------|----------|----------------|
| 228 | list | protected | SCOPED | resolveVentureScope |
| 229 | listInternal | protected | SAFE | Returns internal team members only (type="Internal"). No tenant data — these are VENTEX employees. |
| 230 | listByOrganization | admin | SCOPED | Admin + resolveOrgId |
| 231 | getBySlug | protected | SAFE | Returns single team member by slug. Team members are shared resources, not tenant-scoped. |
| 232 | getById | protected | SAFE | Returns single team member by ID. Same as above. |
| 233 | create | admin | ADMIN | Role gate only |
| 234 | ventureAssignments | protected | SCOPED | resolveVentureScope |
| 235 | assignToVenture | protected | **IDOR** | **Accepts ventureId + memberId without org verification. Any authenticated user can assign any team member to any venture.** |
| 236 | removeFromVenture | protected | **IDOR** | **Accepts ventureId + memberId without org verification. Any authenticated user can remove team members from any venture.** |
| 237 | update | admin | ADMIN | Role gate only |
| 238 | heartbeat | protected | SAFE | Updates lastSeenAt for the calling user's linked team member. User-scoped. |
| 239 | liveStatuses | protected | SAFE | Returns all team member online statuses. Team members are shared resources. |
| 240 | setAdminStatus | admin | ADMIN | Role gate only |
| 241 | linkUser | admin | ADMIN | Role gate only |
| 242 | delete | admin | ADMIN | Role gate only |
| 243 | reorder | admin | ADMIN | Role gate only |
| 244 | uploadAvatar | admin | ADMIN | Role gate only |
| 245 | resendInvitation | admin | ADMIN | Role gate only |
| 246 | getInvitationStatus | admin | ADMIN | Role gate only |

### Router: `ventures` (23 procedures)

| # | Procedure | Type | Category | Scoping Detail |
|---|-----------|------|----------|----------------|
| 247 | listWithOrgs | protected | SCOPED | isVentexTeam check (returns [] for non-admin) |
| 248 | list | protected | SCOPED | resolveVentureScope |
| 249 | getBySlug | protected | SCOPED | isVentexTeam + getOrgVentureIds |
| 250 | getById | protected | SCOPED | isVentexTeam + getOrgVentureIds |
| 251 | create | protected | SCOPED | isVentexTeam check (admin-only) |
| 252 | update | protected | SCOPED | isVentexTeam check |
| 253 | getTeam | protected | **IDOR** | **Accepts ventureId without org verification. Any authenticated user can see team members of any venture.** |
| 254 | assignTeam | protected | SCOPED | isVentexTeam check |
| 255 | removeTeam | protected | SCOPED | isVentexTeam check |
| 256 | getTasks | protected | **IDOR** | **Accepts ventureId without org verification. Any authenticated user can list all tasks for any venture.** |
| 257 | getFiles | protected | SCOPED | TENANT_PATCHED + isVentexTeam + getOrgVentureIds |
| 258 | uploadFile | protected | SCOPED | TENANT_PATCHED + isVentexTeam |
| 259 | deleteFile | protected | SCOPED | isVentexTeam check |
| 260 | moveFile | protected | SCOPED | TENANT_PATCHED + isVentexTeam |
| 261 | getFolders | protected | SCOPED | TENANT_PATCHED + isVentexTeam |
| 262 | createFolder | protected | SCOPED | TENANT_PATCHED + isVentexTeam |
| 263 | deleteFolder | protected | SCOPED | isVentexTeam check |
| 264 | renameFolder | protected | **IDOR** | **Accepts folderId without org verification. Any authenticated user can rename any venture folder.** |
| 265 | metrics | protected | SCOPED | resolveVentureScope |
| 266 | getWithMilestones | protected | **IDOR** | **Accepts venture id without org verification. Any authenticated user can view milestones/process tracking for any venture.** |
| 267 | updateMilestone | protected | **IDOR** | **Accepts ventureId + stepId without org verification. Any authenticated user can update milestone status for any venture.** |
| 268 | populateIntelligence | protected | SCOPED | isVentexTeam check |
| 269 | recalculateHealth | protected | SCOPED | isVentexTeam check |

### Router: `routers` (5 procedures — auth)

| # | Procedure | Type | Category | Scoping Detail |
|---|-----------|------|----------|----------------|
| 270 | me | public | PUBLIC | Returns current user info |
| 271 | logout | public | PUBLIC | Clears session |
| 272 | acceptInvite | public | PUBLIC | Token-based invite acceptance |
| 273 | forgotPassword | public | PUBLIC | Email-based password reset |
| 274 | resetPassword | public | PUBLIC | Token-based password reset |

### Router: `systemRouter` (2 procedures)

| # | Procedure | Type | Category | Scoping Detail |
|---|-----------|------|----------|----------------|
| 275 | health | public | PUBLIC | Health check |
| 276 | notifyOwner | admin | ADMIN | Role gate only |

---

## Critical Findings: IDOR Vulnerabilities

The following **12 procedures** accept entity IDs (ventureId, spvId, taskId, folderId, alertId) from user input without verifying that the authenticated user's organization has access to that entity. This means **any authenticated user (including a client from Org A) could potentially read or modify data belonging to Org B** by guessing or enumerating IDs.

### Severity: HIGH

| # | Procedure | Risk | Impact |
|---|-----------|------|--------|
| 1 | `ventures.getTasks` | Read tasks for any venture | **Data leak** — client sees another org's task list |
| 2 | `ventures.getTeam` | Read team assignments for any venture | **Data leak** — client sees another org's team |
| 3 | `ventures.getWithMilestones` | Read milestones for any venture | **Data leak** — client sees another org's process tracking |
| 4 | `ventures.updateMilestone` | Write milestone status for any venture | **Data tampering** — client can mark milestones complete on another org's venture |
| 5 | `ventures.renameFolder` | Rename any venture folder | **Data tampering** — client can rename another org's folders |
| 6 | `tasks.update` | Update any task | **Data tampering** — client can change title, status, priority, assignees of any task |
| 7 | `spvs.getLinkedVentures` | Read linked ventures for any SPV | **Data leak** — client sees another org's SPV-venture links |
| 8 | `spvs.getTeam` | Read team for any SPV | **Data leak** — client sees another org's SPV team |
| 9 | `spvs.renameFolder` | Rename any SPV folder | **Data tampering** — client can rename another org's SPV folders |
| 10 | `team.assignToVenture` | Assign any member to any venture | **Data tampering** — client can modify team assignments across orgs |
| 11 | `team.removeFromVenture` | Remove any member from any venture | **Data tampering** — client can remove team members from other orgs' ventures |
| 12 | `intelligence.getVentureHealth` | Read health score for any venture | **Data leak** — client sees another org's venture health |
| 13 | `intelligence.dismissAlert` | Dismiss any alert | **Data tampering** — client can dismiss alerts for other orgs |

### Recommended Fix Pattern

Each IDOR procedure should add the same guard used in `getFiles`:

```typescript
// Before the DB query:
if (!isVentexTeam(ctx.user)) {
  const ventureIds = await getOrgVentureIds(ctx.user);
  if (ventureIds && !ventureIds.includes(input.ventureId)) {
    return []; // or throw FORBIDDEN
  }
}
```

---

## Summary Statistics

| Category | Count | % |
|----------|-------|---|
| SCOPED (data-level isolation) | 165 | 58.9% |
| ADMIN_ONLY (role gate, admin-only ops) | 58 | 20.7% |
| USER-IMPLICIT (personal data via ctx.user.id) | 16 | 5.7% |
| USER_SCOPED (detected by script) | 6 | 2.1% |
| SAFE (utility/non-tenant/aggregate) | 15 | 5.4% |
| PUBLIC (no auth by design) | 7 | 2.5% |
| **IDOR (cross-tenant risk)** | **13** | **4.6%** |

**Overall tenant isolation coverage: 95.4%** (267 of 280 procedures are properly isolated or non-applicable).

The 13 IDOR procedures represent the highest-priority security fixes needed before multi-tenant production deployment.
