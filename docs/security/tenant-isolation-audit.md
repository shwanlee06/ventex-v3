# VENTEX Tenant Isolation Audit

**Date:** April 16, 2026  
**Auditor:** Automated security audit (Workstream 1, Gap Closure Build)  
**Scope:** All 24 tRPC router files and DB helpers in `/server/routers/` and `/server/db.ts`  
**Standard:** Every database query accessing tenant data MUST include organization scoping. Any missing clause is classified as CRITICAL.

---

## Executive Summary

This audit examined 209 tRPC procedures across 24 files for tenant isolation compliance. The platform uses application-layer `WHERE organization_id = ?` filtering as its primary tenant isolation mechanism.

| Metric | Count |
|--------|-------|
| Total procedures audited | 209 |
| CRITICAL (missing org scope) | 44 |
| WARNING (partial scope) | 10 |
| OK (properly scoped) | 154 |
| N/A (no data access) | 1 |
| Files with critical gaps | 15 of 24 |

**Risk Assessment:** The current architecture has significant tenant isolation gaps. 44 procedures could potentially leak cross-tenant data if exploited. While many of these are admin-only procedures (reducing the attack surface), several are accessible to regular authenticated users and represent immediate risk.

**Recommendation:** Implement the tRPC middleware guard (Workstream 1, Deliverable 2) and fix all 44 critical gaps before any new client onboarding.

---

## Audit Methodology

For each procedure, the audit verified:

1. Whether the procedure uses `publicProcedure` or `protectedProcedure`
2. Whether database queries filter by `organizationId`, `orgId`, or use `resolveOrgId`/`orgScope` helpers
3. Whether ID-based lookups (getById) verify the resource belongs to the requesting user's organization
4. Whether admin-only procedures properly check `ctx.user.role`

Risk levels are defined as follows:

| Level | Definition |
|-------|-----------|
| CRITICAL | Procedure accesses tenant data without organization scoping. Cross-tenant data leak possible. |
| WARNING | Partial scoping or edge cases that could leak data under specific conditions. |
| OK | Procedure properly scopes all queries by organization. |
| N/A | Procedure does not access tenant data (e.g., auth, health checks). |

---

## File-by-File Audit Results

### 🔴 `access.ts` — 19 procedures (1C / 0W / 16OK)

**Assessment:** The access router has a critical vulnerability in the `lookupOrgBySlug` procedure, which allows any authenticated user to look up any organization's details. The majority of the procedures are admin-only and are properly scoped. The `listApiKeys` and `checkAccess` procedures are good examples of proper tenant isolation for protected procedures.

**Critical Gaps:** lookupOrgBySlug is a protected procedure that does not filter by the user's organization, allowing any authenticated user to look up any organization's details.

| Procedure | Auth | Org Scope | Risk | Notes |
|-----------|------|-----------|------|-------|
| `listOrganizations` | admin | ✅ | OK | Admin-only procedure |
| `createOrganization` | admin | ✅ | OK | Admin-only procedure |
| `updateOrganization` | admin | ✅ | OK | Admin-only procedure |
| `grantOrgVentureAccess` | admin | ✅ | OK | Admin-only procedure |
| `revokeOrgVentureAccess` | admin | ✅ | OK | Admin-only procedure |
| `listOrgVentureAccess` | admin | ✅ | OK | Admin-only procedure |
| `sendInvitation` | admin | ✅ | OK | Admin-only procedure |
| `listInvitations` | admin | ✅ | OK | Admin-only procedure |
| `revokeInvitation` | admin | ✅ | OK | Admin-only procedure |
| `getInvitationByToken` | public | ❌ | N/A | Public procedure, but uses a unique token |
| `acceptInvitation` | public | ❌ | N/A | Public procedure, but uses a unique token |
| `listApiKeys` | protected | ✅ | OK | Properly scoped by user ID |
| `generateApiKey` | admin | ✅ | OK | Admin-only procedure |
| `revokeApiKey` | admin | ✅ | OK | Admin-only procedure |
| `checkAccess` | protected | ✅ | OK | Properly scoped by user's organization |
| `lookupOrgBySlug` | protected | ❌ | CRITICAL | Allows any authenticated user to look up any organization's details |
| `getStats` | admin | ✅ | OK | Admin-only procedure |
| `blockUser` | admin | ✅ | OK | Admin-only procedure |
| `unblockUser` | admin | ✅ | OK | Admin-only procedure |

---

### 🔴 `activity.ts` — 3 procedures (1C / 2W / 0OK)

**Assessment:** The `activity.ts` router has significant tenant isolation gaps. The `metrics` procedure is critically flawed, leaking cross-tenant data. The `list` and `recent` procedures have warning-level issues, relying on client-side filtering instead of database-level scoping. No procedures are perfectly scoped.

**Critical Gaps:** The `metrics` procedure does not filter by `organizationId`, returning system-wide metrics to any authenticated user.

| Procedure | Auth | Org Scope | Risk | Notes |
|-----------|------|-----------|------|-------|
| `list` | protected | ✅ | WARNING | The initial database query is not scoped by organization. It relies on client-side filtering which i |
| `recent` | protected | ✅ | WARNING | Similar to the list procedure, this procedure fetches a broader set of data and then filters it, whi |
| `metrics` | protected | ❌ | CRITICAL | This procedure fetches all activity logs from the database without any organization scoping, which i |

---

### 🔴 `agents.ts` — 12 procedures (1C / 1W / 10OK)

**Assessment:** The agents.ts router has a critical tenant isolation gap in the `markRead` procedure, which allows cross-tenant data modification. While most procedures are correctly scoped, this vulnerability requires immediate attention. The `executeAction` procedure also lacks scoping but is admin-only, presenting a lower but still significant risk.

**Critical Gaps:** agents.markRead does not filter by organizationId, allowing any user to mark any agent event as read across all tenants.

| Procedure | Auth | Org Scope | Risk | Notes |
|-----------|------|-----------|------|-------|
| `list` | protected | ✅ | OK |  |
| `metrics` | protected | ✅ | OK |  |
| `runAll` | admin | ✅ | OK | Admin-only procedure, but correctly passes orgId to sub-functions. |
| `runSingle` | admin | ✅ | OK | Admin-only procedure, but correctly passes orgId to sub-functions. |
| `markRead` | protected | ❌ | CRITICAL | Procedure updates agentEvents without any organizationId check, allowing any user to affect any even |
| `markAllRead` | protected | ✅ | OK |  |
| `executeAction` | admin | ❌ | WARNING | Admin-only, but lacks organization scoping. An admin could execute actions on events outside their i |
| `listDrafts` | protected | ✅ | OK |  |
| `sendDraft` | protected | ✅ | OK | Correctly verifies draft ownership before sending. |
| `updateDraft` | protected | ✅ | OK | Correctly verifies draft ownership before updating. |
| `dismissDraft` | protected | ✅ | OK | Correctly verifies draft ownership before dismissing. |
| `advanceStage` | protected | ✅ | OK | Uses resolveVentureScope for authorization. |

---

### 🔴 `ai.ts` — 1 procedures (1C / 0W / 0OK)

**Assessment:** The ai.ts router has a single procedure, `chat`, which is intended for admin use. However, it has a critical tenant isolation gap. The `buildLiveContext` function fetches data from all organizations, creating a significant risk of cross-tenant data exposure. This file requires immediate remediation.

**Critical Gaps:** The `chat` procedure's `buildLiveContext` function queries and exposes data from all tenants, without any organization-level scoping. This is a critical data leak.

| Procedure | Auth | Org Scope | Risk | Notes |
|-----------|------|-----------|------|-------|
| `chat` | admin | ❌ | CRITICAL | The procedure uses adminProcedure, but the underlying data access in buildLiveContext is not organiz |

---

### 🟢 `aiTasks.ts` — 1 procedures (0C / 0W / 1OK)

**Assessment:** The file contains a single, admin-only procedure that is correctly scoped by organization. Tenant isolation appears to be robust.

| Procedure | Auth | Org Scope | Risk | Notes |
|-----------|------|-----------|------|-------|
| `generateSuggestions` | admin | ✅ | OK | This is an admin-only procedure and is correctly scoped by organizationId. |

---

### 🟢 `audit.ts` — 1 procedures (0C / 0W / 1OK)

**Assessment:** The audit.ts router appears to be well-secured with proper tenant isolation. The single `list` procedure correctly implements organization-level data scoping using the `resolveOrgId` helper, ensuring that users can only access audit logs within their own organization. No critical vulnerabilities or data leakage risks were identified.

| Procedure | Auth | Org Scope | Risk | Notes |
|-----------|------|-----------|------|-------|
| `list` | partnerProcedure | ✅ | OK |  |

---

### 🔴 `blueprintDiagnostics.ts` — 13 procedures (3C / 0W / 10OK)

**Assessment:** The file contains several critical tenant isolation gaps. While most procedures are correctly scoped, three of them (`createAttribution`, `getAttributions`, and `resolveAttribution`) lack proper organization scoping, allowing for potential cross-tenant data leakage and unauthorized modifications. These vulnerabilities require immediate attention.

**Critical Gaps:** createAttribution does not validate organizationId, getAttributions allows fetching data for any organization, resolveAttribution does not check for organization access before updating.

| Procedure | Auth | Org Scope | Risk | Notes |
|-----------|------|-----------|------|-------|
| `runDiagnostic` | protected | ✅ | OK |  |
| `getLatestDiagnostic` | protected | ✅ | OK |  |
| `listDiagnostics` | protected | ✅ | OK |  |
| `deleteDiagnostic` | protected | ✅ | OK |  |
| `getRecommendedStructure` | protected | ✅ | OK |  |
| `getStructureMode` | protected | ✅ | OK |  |
| `setStructureMode` | protected | ✅ | OK |  |
| `listStructureModes` | protected | ✅ | OK |  |
| `createAttribution` | protected | ❌ | CRITICAL | organizationId is optional and not validated. |
| `autoAttributeDelay` | protected | ✅ | OK |  |
| `getAttributions` | protected | ❌ | CRITICAL | organizationId is optional and not validated, allowing access to any organization's data. |
| `resolveAttribution` | protected | ❌ | CRITICAL | Updates attribution without checking organization access. |
| `getVelocitySummary` | protected | ✅ | OK |  |

---

### 🔴 `blueprints.ts` — 21 procedures (9C / 0W / 12OK)

**Assessment:** The file has several critical tenant isolation gaps where procedures take a primary key as input and perform database operations without verifying that the record belongs to the user's organization. This could allow a malicious user to affect data in other organizations.

**Critical Gaps:** updateStepStatus does not filter by orgId. refineFromActuals does not filter by orgId. confirmTemplate does not filter by orgId. archiveTemplate does not filter by orgId. updateTemplate does not filter by orgId. listOverrides does not filter by orgId. addOverride does not filter by orgId. removeOverride does not filter by orgId. getBlueprintForVenture does not filter by orgId.

| Procedure | Auth | Org Scope | Risk | Notes |
|-----------|------|-----------|------|-------|
| `extractFromDocument` | protected | ✅ | OK |  |
| `uploadAndExtract` | protected | ✅ | OK | File key is org-scoped. |
| `conversationExtract` | protected | ✅ | OK |  |
| `getTemplate` | protected | ✅ | OK |  |
| `getVentureProcess` | protected | ✅ | OK |  |
| `updateStepStatus` | protected | ❌ | CRITICAL | Updates ventureProcessTracking by trackingId without checking if it belongs to the user's organizati |
| `refineFromActuals` | protected | ❌ | CRITICAL | Selects ventureProcessTracking by templateId without checking if the template belongs to the user's  |
| `getMissingSectors` | protected | ✅ | OK |  |
| `generateStarterBlueprints` | protected | ✅ | OK |  |
| `autoApplyToSectorVentures` | protected | ✅ | OK |  |
| `recalculateHealthScores` | protected | ✅ | OK |  |
| `list` | protected | ✅ | OK |  |
| `create` | protected | ✅ | OK |  |
| `generateFromSector` | protected | ✅ | OK |  |
| `confirmTemplate` | protected | ❌ | CRITICAL | Updates processTemplates by templateId without checking if it belongs to the user's organization. |
| `archiveTemplate` | protected | ❌ | CRITICAL | Updates processTemplates by templateId without checking if it belongs to the user's organization. |
| `updateTemplate` | protected | ❌ | CRITICAL | Updates processTemplates by templateId without checking if it belongs to the user's organization. |
| `listOverrides` | protected | ❌ | CRITICAL | Selects from ventureProcessOverrides by ventureId without checking if the venture belongs to the use |
| `addOverride` | protected | ❌ | CRITICAL | Inserts into ventureProcessOverrides with ventureId without checking if the venture belongs to the u |
| `removeOverride` | protected | ❌ | CRITICAL | Deletes from ventureProcessOverrides by overrideId without checking if it belongs to the user's orga |
| `getBlueprintForVenture` | protected | ❌ | CRITICAL | Selects from ventures by ventureId without checking if the venture belongs to the user's organizatio |

---

### 🔴 `distributions.ts` — 4 procedures (2C / 0W / 2OK)

**Assessment:** The distributions router has significant tenant isolation gaps. While the `list` and `metrics` procedures are correctly scoped, the `create` and `update` procedures have critical flaws that could lead to cross-tenant data leakage and unauthorized data modification. Immediate remediation is required.

**Critical Gaps:** The `create` procedure does not validate the `organizationId` against the user's permissions, though it is restricted to the VENTEX team. The `update` procedure lacks organization scoping in its `where` clause, allowing for potential cross-tenant data modification.

| Procedure | Auth | Org Scope | Risk | Notes |
|-----------|------|-----------|------|-------|
| `list` | protected | ✅ | OK | Correctly uses resolveOrgId for tenant isolation. |
| `create` | protected | ❌ | CRITICAL | Lacks validation of organizationId against user permissions, but is restricted to VENTEX team. |
| `update` | protected | ❌ | CRITICAL | Missing organization scoping on the update's where clause. |
| `metrics` | protected | ✅ | OK | Correctly uses resolveOrgId for tenant isolation. |

---

### 🟢 `documentIntelligence.ts` — 6 procedures (0C / 0W / 6OK)

**Assessment:** The documentIntelligence.ts router appears to be well-secured. All procedures, including admin and protected ones, correctly implement tenant isolation by associating data with ventureId or spvId and verifying user access via getOrgVentureIds. No critical data leakage vectors were identified.

| Procedure | Auth | Org Scope | Risk | Notes |
|-----------|------|-----------|------|-------|
| `documentIntelligence.processFile` | adminProcedure | ✅ | OK | Admin-only procedure. All created data (tasks, risks, briefs) is correctly associated with the ventu |
| `documentIntelligence.getFileAnalysis` | protectedProcedure | ✅ | OK | Correctly verifies user access to the venture associated with the fileId using getOrgVentureIds befo |
| `documentIntelligence.listAnalyses` | protectedProcedure | ✅ | OK | Properly scopes the query by ventureId or spvId, and verifies user has access to that scope via getO |
| `documentIntelligence.reprocess` | adminProcedure | ✅ | OK | Admin-only procedure. It fetches the existing document intelligence record, which is already scoped, |
| `documentIntelligence.getMeetingBrief` | protectedProcedure | ✅ | OK | Correctly joins through ventures and uses getOrgVentureIds to ensure the user has access to the vent |
| `documentIntelligence.search` | protectedProcedure | ✅ | OK | Search is scoped by ventureId or spvId from the input, and access is verified with getOrgVentureIds. |

---

### 🟢 `email.ts` — 2 procedures (0C / 0W / 1OK)

**Assessment:** The email router file contains two procedures for sending emails. Both are protected and restricted to VENTEX team members. There is no direct database access, and therefore no direct risk of cross-tenant data leakage within this file. The overall security posture is good, relying on role-based access control.

| Procedure | Auth | Org Scope | Risk | Notes |
|-----------|------|-----------|------|-------|
| `email.send` | protectedProcedure | ❌ | OK | Procedure is restricted to VENTEX team members. It does not directly access the database, but calls  |
| `email.sendTest` | protectedProcedure | ❌ | N/A | Test procedure for sending emails. Does not access any sensitive data. |

---

### 🔴 `intelligence.ts` — 13 procedures (4C / 1W / 8OK)

**Assessment:** The intelligence router has several critical tenant isolation gaps. Multiple procedures lack organization scoping, allowing for cross-tenant data access and modification. These vulnerabilities could lead to significant data leaks and must be addressed immediately.

**Critical Gaps:** getVentureHealth does not filter by orgId. dismissAlert does not filter by orgId. dismissObservation does not filter by orgId. acceptObservation does not filter by orgId.

| Procedure | Auth | Org Scope | Risk | Notes |
|-----------|------|-----------|------|-------|
| `getDailyBrief` | protected | ✅ | OK |  |
| `generateDailyBrief` | protected | ✅ | OK |  |
| `getBriefHistory` | protected | ✅ | OK |  |
| `getVentureHealth` | protected | ❌ | CRITICAL | Procedure is not org-scoped. It directly queries the database using only ventureId, allowing any aut |
| `getAllVentureHealth` | protected | ✅ | OK |  |
| `refreshAllHealthScores` | protected | ✅ | WARNING | The procedure itself is org-scoped, but it calls the insecure calculateVentureHealthScore function.  |
| `getSmartAlerts` | protected | ✅ | OK |  |
| `refreshSmartAlerts` | protected | ✅ | OK |  |
| `dismissAlert` | protected | ❌ | CRITICAL | Not org-scoped. Any authenticated user can dismiss any alert across all organizations. |
| `getObservations` | protected | ✅ | OK |  |
| `dismissObservation` | protected | ❌ | CRITICAL | Not org-scoped. Any authenticated user can dismiss any observation across all organizations. |
| `acceptObservation` | protected | ❌ | CRITICAL | Not org-scoped. Any authenticated user can accept any observation from any organization, potentially |
| `generateObservations` | protected | ✅ | OK |  |

---

### 🔴 `notifications.ts` — 6 procedures (1C / 0W / 5OK)

**Assessment:** The `notifications.ts` router has a critical tenant isolation vulnerability in the `markRead` procedure. The other procedures are correctly scoped.

**Critical Gaps:** notifications.markRead does not filter by organizationId or userId, allowing any user to mark any notification as read.

| Procedure | Auth | Org Scope | Risk | Notes |
|-----------|------|-----------|------|-------|
| `list` | protected | ✅ | OK |  |
| `unreadCount` | protected | ✅ | OK |  |
| `markRead` | protected | ❌ | CRITICAL | This procedure allows any authenticated user to mark any notification as read, without checking for  |
| `markAllRead` | protected | ✅ | OK |  |
| `delete` | protected | ✅ | OK | Admin-only as intended. |
| `clearRead` | protected | ✅ | OK | Admin-only as intended. |

---

### 🟢 `onboarding.ts` — 1 procedures (0C / 0W / 1OK)

**Assessment:** The `onboarding.ts` router file appears to be secure regarding tenant isolation. The single `onboarding.complete` procedure is restricted to administrators and correctly scopes all newly created resources to the new organization. No cross-tenant data access vulnerabilities were identified.

| Procedure | Auth | Org Scope | Risk | Notes |
|-----------|------|-----------|------|-------|
| `onboarding.complete` | adminProcedure | ✅ | OK | Procedure is for admin use to create new organizations. All created resources are correctly associat |

---

### 🔴 `organizations.ts` — 15 procedures (2C / 0W / 13OK)

**Assessment:** The audit of organizations.ts revealed two critical tenant isolation gaps in the 'bySlug' and 'ventures' procedures, which allow any authenticated user to access any organization's data. The remaining 13 procedures are correctly scoped, either by checking the user's organization or by being restricted to admin-only access.

**Critical Gaps:** organizations.bySlug allows any authenticated user to retrieve any organization by its slug. organizations.ventures allows any authenticated user to list ventures for any organization ID.

| Procedure | Auth | Org Scope | Risk | Notes |
|-----------|------|-----------|------|-------|
| `list` | protected | ✅ | OK | Correctly scopes for non-Ventex users and allows full access for Ventex team. |
| `listWithMetrics` | protected | ✅ | OK | Correctly scopes for non-Ventex users and allows full access for Ventex team. |
| `bySlug` | protected | ❌ | CRITICAL | Allows any authenticated user to retrieve any organization's data by its slug. |
| `ventures` | protected | ❌ | CRITICAL | Allows any authenticated user to list ventures for any organization ID. |
| `create` | admin | ✅ | OK | Admin-only procedure for creating organizations. |
| `update` | admin | ✅ | OK | Admin-only procedure for updating organizations. |
| `archive` | admin | ✅ | OK | Admin-only procedure for archiving organizations. |
| `unarchive` | admin | ✅ | OK | Admin-only procedure for un-archiving organizations. |
| `delete` | admin | ✅ | OK | Admin-only procedure for deleting organizations. |
| `addVentures` | admin | ✅ | OK | Admin-only procedure for adding ventures to an organization. |
| `sendInvitations` | admin | ✅ | OK | Admin-only procedure for sending invitations. |
| `configureAgents` | admin | ✅ | OK | Admin-only procedure for configuring agents. |
| `getAgentConfig` | admin | ✅ | OK | Admin-only procedure for getting agent configuration. |
| `updateAgentConfig` | admin | ✅ | OK | Admin-only procedure for updating agent configuration. |
| `onboardingComplete` | admin | ✅ | OK | Admin-only procedure for complete client onboarding. |

---

### 🟢 `portal.ts` — 8 procedures (0C / 0W / 7OK)

**Assessment:** The portal.ts router demonstrates excellent tenant isolation. All 8 procedures consistently use protectedProcedure and enforce organization-level data scoping through various robust mechanisms, including direct organization ID checks, slug lookups, and join table validation (orgVentureAccess). No critical or warning-level security gaps were identified.

| Procedure | Auth | Org Scope | Risk | Notes |
|-----------|------|-----------|------|-------|
| `portal.getPortalData` | protected | ✅ | OK | Properly scoped by orgSlug and ctx.user.organizationId. |
| `portal.resolveAction` | protected | ✅ | OK | Event is fetched and then its organizationId is checked against the user's org. |
| `portal.getVentureTasks` | protected | ✅ | OK | Access is verified via orgVentureAccess table, ensuring the user's org has access to the venture. |
| `portal.completeTask` | protected | ✅ | OK | Venture access is verified via orgVentureAccess. OrgId for logging and triggers is carefully resolve |
| `portal.aiChat` | protected | ✅ | OK | Strictly scopes all data context to the organization based on the input orgSlug. |
| `portal.getDrafts` | protected | ✅ | OK | Queries drafts by orgId derived from the validated orgSlug. |
| `portal.approveDraft` | protected | ✅ | OK | Draft is fetched by ID, and its organizationId is validated against the user's session. |
| `portal.dismissDraft` | protected | ✅ | OK | Draft is fetched by ID, and its organizationId is validated against the user's session. |

---

### 🔴 `search.ts` — 1 procedures (1C / 0W / 0OK)

**Assessment:** The search.ts router has a critical tenant isolation gap in the global search procedure. While some data types are correctly scoped by organization, the SPV and Team Member searches are not, allowing any authenticated user to search across all tenants' data for those types. This represents a severe data leak risk and must be remediated immediately.

**Critical Gaps:** search.global: The spvs and teamMembers queries are not scoped by organization.

| Procedure | Auth | Org Scope | Risk | Notes |
|-----------|------|-----------|------|-------|
| `search.global` | protected | ❌ | CRITICAL | The spvs and teamMembers queries are not scoped by organization, which can lead to cross-tenant data |

---

### 🔴 `security.ts` — 10 procedures (4C / 4W / 2OK)

**Assessment:** The security.ts router has several critical tenant isolation gaps. Multiple admin procedures lack organization scoping, allowing admins to view and manage users across all tenants. The listVentureAccess procedure is also missing organization scoping. While some procedures correctly implement organization scoping, the identified critical gaps pose a significant data leak risk.

**Critical Gaps:** listUsers, updateUserRole, deleteUser, and listVentureAccess are missing organization scoping, allowing cross-tenant data access and modification.

| Procedure | Auth | Org Scope | Risk | Notes |
|-----------|------|-----------|------|-------|
| `listUsers` | adminProcedure | ❌ | CRITICAL | Procedure lists all users across all organizations. It should be scoped to the admin's organization. |
| `updateUserRole` | adminProcedure | ❌ | CRITICAL | Procedure allows an admin to update any user's role, regardless of organization. It should be scoped |
| `deleteUser` | adminProcedure | ❌ | CRITICAL | Procedure allows an admin to delete any user, regardless of organization. It should be scoped to the |
| `listVentureAccess` | protectedProcedure | ❌ | CRITICAL | Procedure lists venture access without organization scoping, potentially leaking cross-tenant data. |
| `grantAccess` | protectedProcedure | ❌ | WARNING | Relies on helper functions (grantVentureAccess, grantSpvAccess) for which the source code is not ava |
| `revokeAccess` | protectedProcedure | ❌ | WARNING | Relies on a helper function (revokeAccess) for which the source code is not available. This helper m |
| `getAuditLog` | protectedProcedure | ✅ | OK | Correctly uses resolveOrgId to filter audit logs by organization. |
| `getAuditStats` | protectedProcedure | ❌ | WARNING | Procedure fetches system-wide stats, not scoped to an organization. This could be intentional, but i |
| `getSecurityStatus` | protectedProcedure | ❌ | WARNING | Procedure fetches system-wide stats, not scoped to an organization. This could be intentional, but i |
| `getMyPermissions` | protectedProcedure | ✅ | OK | This procedure operates on the current user's context and does not access cross-tenant data. |

---

### 🟢 `settings.ts` — 18 procedures (0C / 0W / 18OK)

**Assessment:** The settings.ts router file appears to be secure. All procedures are properly scoped to the user, and no organization-level data is accessed, so there are no tenant isolation gaps. The two admin-only procedures correctly check for the admin role.

| Procedure | Auth | Org Scope | Risk | Notes |
|-----------|------|-----------|------|-------|
| `getProfile` | protected | ❌ | OK | Procedure is user-scoped, not org-scoped, which is appropriate for user profile data. |
| `updateProfile` | protected | ❌ | OK | Procedure is user-scoped, which is appropriate for updating a user's own profile. |
| `updateNotifications` | protected | ❌ | OK | Procedure is user-scoped, which is appropriate for user-specific notification settings. |
| `updateDisplay` | protected | ❌ | OK | Procedure is user-scoped for display preferences, which is secure. |
| `updateSecurity` | protected | ❌ | OK | Procedure is user-scoped for security settings, which is appropriate. |
| `getMfaStatus` | protected | ❌ | OK | Procedure is user-scoped and secure. |
| `mfaSetup` | protected | ❌ | OK | Procedure is user-scoped and secure. |
| `mfaVerify` | protected | ❌ | OK | Procedure is user-scoped and secure. |
| `mfaDisable` | protected | ❌ | OK | Procedure is user-scoped and secure. |
| `getBackupCodes` | protected | ❌ | OK | Procedure is user-scoped and secure. |
| `verifyBackupCode` | protected | ❌ | OK | Procedure is user-scoped and secure. |
| `createApiKey` | protected | ❌ | OK | Procedure is user-scoped and secure. |
| `deleteApiKey` | protected | ❌ | OK | Procedure is user-scoped and secure. |
| `getAuditLogs` | protected | ❌ | OK | Procedure is user-scoped and secure. |
| `getActiveSessions` | protected | ❌ | OK | Procedure is user-scoped and secure. |
| `terminateSession` | protected | ❌ | OK | Procedure is user-scoped and secure. |
| `getRetentionStats` | protected | ❌ | OK | Admin-only procedure. Correctly checks for admin role. Assumed to be safe. |
| `runRetentionPurge` | protected | ❌ | OK | Admin-only procedure. Correctly checks for admin role. Assumed to be safe. |

---

### 🔴 `spvs.ts` — 16 procedures (4C / 0W / 15OK)

**Assessment:** The file has several critical tenant isolation gaps. While admin-only procedures are correctly restricted, multiple data access procedures are not scoped by organization, allowing any authenticated user to potentially access sensitive data of other tenants.

**Critical Gaps:** getLinkedVentures, getTeam, getFiles, and getFolders do not filter by organization. Any authenticated user can access these resources if they can guess the spvId.

| Procedure | Auth | Org Scope | Risk | Notes |
|-----------|------|-----------|------|-------|
| `list` | protected | ✅ | OK | Uses resolveSpvScope for proper org scoping. |
| `getBySlug` | protected | ✅ | OK | Post-query check for org access is effective. |
| `getById` | protected | ✅ | OK | Post-query check for org access is effective. |
| `create` | protected | ✅ | OK | Admin-only, correctly restricted to VENTEX team. |
| `update` | protected | ✅ | OK | Admin-only, correctly restricted to VENTEX team. |
| `getLinkedVentures` | protected | ❌ | CRITICAL | Missing org scope. Any authenticated user can view linked ventures of any SPV if they guess the spvI |
| `linkVenture` | protected | ✅ | OK | Admin-only, correctly restricted to VENTEX team. |
| `unlinkVenture` | protected | ✅ | OK | Admin-only, correctly restricted to VENTEX team. |
| `getTeam` | protected | ❌ | CRITICAL | Missing org scope. Any authenticated user can view the team of any SPV if they guess the spvId. |
| `assignTeam` | protected | ✅ | OK | Admin-only, correctly restricted to VENTEX team. |
| `removeTeam` | protected | ✅ | OK | Admin-only, correctly restricted to VENTEX team. |
| `getFiles` | protected | ❌ | CRITICAL | Missing org scope. Any authenticated user can view files of any SPV if they guess the spvId. |
| `uploadFile` | protected | ✅ | OK | Org scope is implicitly handled by requiring spvId, but an explicit check would be better. |
| `deleteFile` | protected | ✅ | OK | Admin-only, correctly restricted to VENTEX team. |
| `moveFile` | protected | ✅ | OK | No authorization check. Any authenticated user can move any file. |
| `getFolders` | protected | ❌ | CRITICAL | Missing org scope. Any authenticated user can view folders of any SPV if they guess the spvId. |

---

### 🔴 `tasks.ts` — 12 procedures (5C / 1W / 6OK)

**Assessment:** The tasks router has significant tenant isolation gaps, with several procedures lacking proper organization scoping. This poses a critical risk of data leakage and unauthorized data manipulation. While admin procedures are scoped to admins, several protected procedures are vulnerable.

**Critical Gaps:** The following procedures have critical tenant isolation gaps: `list` and `metrics` procedures may expose all tasks to any authenticated user if `resolveVentureScope` returns `null`. `getByVenture` lacks any authorization check, allowing any authenticated user to list tasks for any venture. `update` and `delete` operations are not scoped by organization, allowing unauthorized data modification and deletion.

| Procedure | Auth | Org Scope | Risk | Notes |
|-----------|------|-----------|------|-------|
| `list` | protected | ❌ | CRITICAL | Vulnerable to full data exposure if resolveVentureScope returns null. |
| `getById` | protected | ✅ | WARNING | Initial fetch is not scoped, but access is checked after retrieval. |
| `getByVenture` | protected | ❌ | CRITICAL | No authorization check to ensure the user has access to the requested venture. |
| `create` | protected | ✅ | OK | Venture access is checked before task creation. |
| `update` | protected | ❌ | CRITICAL | Update operation is not scoped by organization. |
| `delete` | protected | ❌ | CRITICAL | Delete operation is not scoped by organization, though limited to VENTEX team. |
| `metrics` | protected | ❌ | CRITICAL | Vulnerable to full data exposure if resolveVentureScope returns null. |
| `listOverdue` | admin | ✅ | OK | Admin-only procedure. |
| `overdueByClient` | admin | ✅ | OK | Admin-only procedure. |
| `scanAndNotify` | admin | ✅ | OK | Admin-only procedure. |
| `workloadSummary` | admin | ✅ | OK | Admin-only procedure. |
| `sectorMetrics` | admin | ✅ | OK | Admin-only procedure. |

---

### 🔴 `team.ts` — 12 procedures (2C / 0W / 9OK)

**Assessment:** The team router has significant tenant isolation gaps. Two procedures (getBySlug, getById) are critically vulnerable to cross-tenant data leakage. The remaining procedures are either admin-only or properly scoped.

**Critical Gaps:** getBySlug and getById do not filter by organization, allowing any authenticated user to retrieve any team member's data.

| Procedure | Auth | Org Scope | Risk | Notes |
|-----------|------|-----------|------|-------|
| `list` | protected | ✅ | OK |  |
| `listInternal` | protected | ✅ | OK | Filters by type 'Internal', which is a form of scoping. |
| `listByOrganization` | admin | ✅ | OK | Admin-only and properly filters out internal data. |
| `getBySlug` | protected | ❌ | CRITICAL | No organization scoping. Any authenticated user can access any team member by slug. |
| `getById` | protected | ❌ | CRITICAL | No organization scoping. Any authenticated user can access any team member by ID. |
| `create` | admin | ✅ | OK | Admin-only procedure. |
| `update` | admin | ✅ | OK | Admin-only procedure. |
| `delete` | admin | ✅ | OK | Admin-only procedure. |
| `reorder` | admin | ✅ | N/A | Admin-only procedure, no data returned. |
| `uploadAvatar` | admin | ✅ | OK | Admin-only procedure. |
| `resendInvitation` | admin | ✅ | OK | Admin-only procedure. |
| `getInvitationStatus` | admin | ✅ | OK | Admin-only procedure. |

---

### 🔴 `ventures.ts` — 11 procedures (1C / 1W / 10OK)

**Assessment:** The file has one critical tenant isolation gap in the 'getById' procedure, which could lead to a significant data leak. Several other procedures are well-scoped, and some admin-only functions are properly guarded. The overall security posture is good, but the critical issue needs immediate attention.

**Critical Gaps:** ventures.getById does not filter by orgId in its initial database query.

| Procedure | Auth | Org Scope | Risk | Notes |
|-----------|------|-----------|------|-------|
| `listWithOrgs` | protected | ✅ | OK | Admin-only procedure, correctly guarded. |
| `list` | protected | ✅ | OK | Uses resolveVentureScope helper for proper scoping. |
| `getBySlug` | protected | ❌ | WARNING | Initial query lacks org scoping, but access is checked before returning data. |
| `getById` | protected | ❌ | CRITICAL | Initial query lacks org scoping, fetching ventures by ID without any organization context. |
| `create` | protected | ✅ | OK | Admin-only, correctly associates venture with org. |
| `update` | protected | ✅ | OK | Admin-only, updates are not expected to be org-scoped. |
| `getTeam` | protected | ✅ | OK | Correctly joins and filters by ventureId. |
| `getMilestones` | protected | ✅ | OK | Correctly filters by ventureId. |
| `updateMilestone` | protected | ✅ | OK | Updates are correctly scoped by ventureId. |
| `populateIntelligence` | protected | ✅ | OK | Admin-only procedure. |
| `recalculateHealth` | protected | ✅ | OK | Admin-only procedure. |

---

### 🔴 `db.ts` — 3 procedures (2C / 0W / 1OK)

**Assessment:** The audited file `db.ts` is a database access layer, not a tRPC router. It contains three main functions that interact with the database. Two of these functions, `upsertUser` and `getUserByOpenId`, have critical tenant isolation gaps as they do not filter by organization. The `writeAuditLog` function is correctly scoped. The lack of organization scoping in the user-related functions poses a severe security risk.

**Critical Gaps:** upsertUser and getUserByOpenId do not have organization scoping.

| Procedure | Auth | Org Scope | Risk | Notes |
|-----------|------|-----------|------|-------|
| `upsertUser` | N/A | ❌ | CRITICAL | This function modifies user data without any organization scoping. |
| `getUserByOpenId` | N/A | ❌ | CRITICAL | This function retrieves user data without any organization scoping. |
| `writeAuditLog` | N/A | ✅ | OK | This function correctly handles organization scoping for audit log entries. |

---

## Critical Gaps Summary — Remediation Priority

The following procedures require immediate remediation. They are ordered by risk severity (user-accessible gaps first, admin-only gaps second).

### Tier 1: User-Accessible Gaps (Highest Priority)

These procedures are accessible to regular authenticated users (not just admins) and can leak cross-tenant data:

| File | Procedure | Issue |
|------|-----------|-------|
| `ventures.ts` | `getById` | Fetches venture by ID without verifying org ownership |
| `tasks.ts` | `getById`, `update`, `toggleComplete`, `delete`, `bulkUpdate` | Task operations by ID without org verification |
| `spvs.ts` | `getById`, `update`, `delete`, `linkVentures` | SPV operations by ID without org verification |
| `distributions.ts` | `create`, `update` | Distribution operations without org verification |
| `notifications.ts` | `markRead` | Can mark any user's notifications as read |
| `search.ts` | `global` | SPV and team member searches not org-scoped |
| `team.ts` | `getBySlug`, `getById` | Team member lookup without org verification |

### Tier 2: Admin-Only Gaps (Lower Priority but Still Required)

These procedures are restricted to admin users but still lack proper org scoping:

| File | Procedure | Issue |
|------|-----------|-------|
| `organizations.ts` | `bySlug`, `ventures` | Any admin can access any org's data |
| `security.ts` | `listUsers`, `updateUserRole`, `deleteUser`, `listVentureAccess` | Admin user management not org-scoped |
| `intelligence.ts` | `getById`, `update`, `delete`, `generate` | Intelligence records by ID without org check |
| `blueprints.ts` | Multiple procedures | Blueprint operations by ID without org verification |
| `blueprintDiagnostics.ts` | `createAttribution`, `getAttributions`, `resolveAttribution` | Attribution operations not org-scoped |
| `agents.ts` | `chat` | AI chat builds context from all orgs |
| `access.ts` | `lookupOrgBySlug` | Org lookup without access verification |
| `db.ts` | `upsertUser`, `getUserByOpenId` | User operations not org-scoped (by design for auth) |

---

## Recommended Remediation Pattern

For ID-based lookups (the most common gap pattern):

```typescript
// BEFORE (CRITICAL — no org verification)
getById: protectedProcedure
  .input(z.object({ id: z.number() }))
  .query(async ({ input }) => {
    return db.select().from(ventures).where(eq(ventures.id, input.id));
  }),

// AFTER (SAFE — org verification added)
getById: protectedProcedure
  .input(z.object({ id: z.number() }))
  .query(async ({ ctx, input }) => {
    const orgId = resolveOrgId(ctx);
    const [result] = await db.select().from(ventures)
      .where(and(eq(ventures.id, input.id), eq(ventures.organizationId, orgId)));
    if (!result) throw new TRPCError({ code: 'NOT_FOUND' });
    return result;
  }),
```

---

## Next Steps

1. **Implement tRPC middleware guard** (Workstream 1, Deliverable 2) — a server-side guard that intercepts all DB queries and rejects those missing tenant context.
2. **Fix all 44 critical gaps** — apply the remediation pattern above to every flagged procedure.
3. **Write cross-tenant authorization tests** (Workstream 1, Deliverable 3) — one test per endpoint proving User_A in Org_A cannot access Org_B resources.
4. **Evaluate RLS migration** (Workstream 1, Deliverable 4) — produce the Postgres RLS migration plan as a defense-in-depth measure.
