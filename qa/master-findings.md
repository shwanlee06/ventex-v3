# VENTEX — Master Findings Register

**Date:** 2026-04-16
**Auditor:** VENTEX QA System
**Scope:** Phases 1 (Functional), 2 (Security & Tenant Isolation), 3 (Client-Readiness Simulation)
**Platform:** ventexdemo.manus.space | 280 procedures | 55 tables | 969 tests

---

## 1. Executive Summary

### Total Findings: 65

#### By Severity

| Severity | Count | Description |
|----------|-------|-------------|
| **P0 — Critical** | 1 | Blocks enterprise sales entirely |
| **P1 — High** | 10 | Must fix before any paying client signs |
| **P2 — Medium** | 25 | Should fix within 90 days |
| **P3 — Low / Info** | 29 | Nice-to-have improvements and informational notes |

#### By Category

| Category | P0 | P1 | P2 | P3 | Total |
|----------|----|----|----|----|-------|
| **Functional** (UI bugs, data display, navigation) | 0 | 3 | 8 | 12 | 23 |
| **Security** (IDOR, auth, encryption, injection) | 0 | 0 | 4 | 8 | 12 |
| **Trust / Compliance** (legal, regulatory, documentation) | 1 | 5 | 6 | 2 | 14 |
| **UX / Design** (client experience, operator workflow) | 0 | 0 | 5 | 5 | 10 |
| **Architecture / Continuity** (hosting, export, dependencies) | 0 | 2 | 2 | 2 | 6 |

#### By Surface Area

| Surface | P0 | P1 | P2 | P3 | Total |
|---------|----|----|----|----|-------|
| **Admin Dashboard** (operator-facing pages) | 0 | 2 | 7 | 9 | 18 |
| **Client Portal** (principal-facing pages) | 0 | 0 | 4 | 3 | 7 |
| **Public Pages** (landing, demo, trust, legal) | 1 | 4 | 4 | 3 | 12 |
| **Backend** (procedures, middleware, data layer) | 0 | 1 | 6 | 8 | 15 |
| **Cross-cutting** (affects multiple surfaces) | 0 | 3 | 4 | 6 | 13 |

---

## 2. Full Findings Register

### Legend

- **Severity:** P0 = Critical blocker, P1 = High (must-fix pre-launch), P2 = Medium (fix within 90 days), P3 = Low/Info
- **Category:** FUNC = Functional, SEC = Security, TRUST = Trust/Compliance, UX = UX/Design, ARCH = Architecture/Continuity
- **Surface:** ADMIN = Admin dashboard, CLIENT = Client portal, PUBLIC = Public pages, BACKEND = Server/API, CROSS = Cross-cutting
- **Effort:** S = Small (<30 min), M = Medium (1-4 hours), L = Large (1+ days), XL = Extra-large (1+ weeks)

---

### P0 — Critical (1 finding)

| ID | Severity | Category | Surface | Role | Tenant | Reproduction | Observed | Expected | Suggested Fix | Effort |
|----|----------|----------|---------|------|--------|--------------|----------|----------|---------------|--------|
| F3-010 | P0 | TRUST | CROSS | CTO persona | N/A | Send standard enterprise security questionnaire to Aurovia | 2 of 12 documents available (encryption details + partial access control). No SOC 2 engagement letter, no pentest report, no DPA, no SLA document, no BCP/DR, no incident response plan, no vendor risk assessment, no data residency statement, no cyber insurance evidence | All 12 documents available or scheduled with named providers and target dates | Create a "Security Package" with minimum 5 documents: (1) SOC 2 engagement letter with auditor + date, (2) pentest schedule, (3) DPA template, (4) SLA document, (5) BCP/DR summary. The controls exist — the gap is documentation. | XL |

---

### P1 — High (10 findings)

| ID | Severity | Category | Surface | Role | Tenant | Reproduction | Observed | Expected | Suggested Fix | Effort |
|----|----------|----------|---------|------|--------|--------------|----------|----------|---------------|--------|
| F3-002 | P1 | TRUST | PUBLIC | GC persona | N/A | View landing page tagline | "Velocity ENabled Technology for EXponential returns" — the word "returns" in a financial context implies investment performance. SEC Rule 206(4)-1 red flag. | No language implying investment returns | Change to "EXponential velocity" or "EXponential operational efficiency." Remove "returns" from all marketing materials. | S |
| F3-003 | P1 | TRUST | PUBLIC | CTO/GC | N/A | View landing page SPV pipeline section | "Venezuela Mining Rights" visible on public page. Venezuela is under OFAC sanctions. Associating any client brand near sanctioned-jurisdiction data is a compliance risk. | No sanctioned-jurisdiction references in public-facing demo data | Replace "Venezuela Mining Rights" with a non-sanctioned jurisdiction (e.g., "Dubai Marina Development") in all public demo data. | S |
| F-005 | P1 | FUNC | ADMIN | Admin | Multi-tenant | Navigate to /ventures, scroll to "Unassigned" section | QA-Meridian Tower Dubai appears in BOTH Meridian Holdings AND Unassigned sections. Ventures with org_venture_access should not appear in Unassigned. | Ventures assigned to an org via org_venture_access should NOT appear in the Unassigned bucket | Add a filter to the Unassigned query: exclude ventures that have any org_venture_access record. | M |
| F-009 | P1 | FUNC | ADMIN | Admin | Multi-currency | Navigate to /spvs, view distributions table | JPY 8,000,000 distribution displays as "$8.0M" — all amounts rendered with USD symbol regardless of actual currency field | Display native currency symbol: ¥8,000,000 or JPY 8.0M | Read the `currency` field from the distribution record and use `Intl.NumberFormat` with the correct currency code for display. | M |
| F-015 | P1 | FUNC | ADMIN | Admin | Cross-org | Navigate to /distributions | Page header says "Showing distributions for Royalton Venture Holding" — only shows one org's distributions. QA-seeded Meridian and Volkov distributions are invisible. | Admin should see ALL client distributions or have a client context switcher | Add a client filter dropdown to the Distributions page (same pattern as Ventures page client filter). | M |
| F3-016 | P1 | TRUST | CROSS | GC persona | N/A | GC regulatory diligence review | Three items flagged as "must fix before signing": (1) "exponential returns" language, (2) sanctioned jurisdiction in public data, (3) no DPA template | All three resolved | (1) Change tagline — S, (2) Sanitize demo data — S, (3) Create DPA template — L (legal work) | M |
| F3-027 | P1 | ARCH | BACKEND | CTO persona | Multi-entity | Evaluate trust structure modeling | No trust/holding company hierarchy model. Ventures and SPVs are flat — no parent-child relationships. A $2B SFO with 3 trusts, 2 holding companies, and 40+ entities cannot model their structure. | Entity hierarchy with parent-child relationships (trust → holding co → operating entity → venture) | Add an `entityHierarchy` table with parentId/childId/entityType/level fields. Extend the venture and SPV models to support parent entity references. | XL |
| F3-028 | P1 | ARCH | BACKEND | CTO persona | Compliance | Evaluate sanctions screening capability | No sanctions screening. The compliance agent flag exists but actual OFAC/EU screening logic is a placeholder. | Integration with sanctions screening API (e.g., Dow Jones, Refinitiv) with automated PEP/sanctions checks | Build sanctions screening module: integrate external API, add screening on entity creation/update, store screening results, alert on matches. | XL |
| F3-031 | P1 | ARCH | CROSS | CTO persona | N/A | Ask "where does our data live?" | Hosting chain: Client → Aurovia → Manus → unknown cloud provider. No SLA from Manus to Aurovia. If Manus goes down, VENTEX goes down. | Documented hosting chain with SLAs at each level, or self-hosted infrastructure | Document the full hosting chain. Negotiate SLA with Manus. Provide clients with a hosting architecture diagram and uptime commitments. | L |
| F3-032 | P1 | ARCH | BACKEND | CTO persona | GDPR | Ask "can we export our data?" | No comprehensive "download all my data" function. Only CSV export of client table and per-client venture export exist. | Full data export API: JSON/CSV archive of all org data (ventures, tasks, SPVs, distributions, documents, communications, audit logs) | Build a `/api/export/org/:id` endpoint that generates a ZIP archive with all org data in structured JSON/CSV format. | XL |

---

### P2 — Medium (25 findings)

| ID | Severity | Category | Surface | Role | Tenant | Reproduction | Observed | Expected | Suggested Fix | Effort |
|----|----------|----------|---------|------|--------|--------------|----------|----------|---------------|--------|
| F-001 | P2 | FUNC | ADMIN | Admin | Meridian | Navigate to /clients/meridian-holdings, view Team Attribution | Sarah Chen's systemRole is "manager" but displays as "Client" in Team Attribution | Should show "Manager" badge for manager-role users | Map systemRole values to display labels correctly in the Team Attribution component | S |
| F-003 | P2 | FUNC | ADMIN | Admin | Meridian | Navigate to /clients/meridian-holdings, view Distributions panel | $50,000 cancelled distribution may be counted as "upcoming" | Cancelled distributions should be excluded from upcoming totals | Add `status !== 'cancelled'` filter to the upcoming distributions query | S |
| F-007 | P2 | FUNC | ADMIN | Admin | Apex/Meridian | Navigate to /ventures, view Apex Partners section | Task count shows "Tasks 14, Overdue 3" for Apex — but Apex has 0 own tasks. Numbers inherited from Meridian ventures that Apex can view. | Task counts should reflect the org's own tasks, not inherited from viewed ventures | Scope task counts to org-owned ventures only, or label as "visible tasks" vs "owned tasks" | M |
| F-008 | P2 | FUNC | ADMIN | Admin | Any | Navigate to /spvs, find an SPV with "Pipeline" stage | QA-Meridian Growth Fund shows no stage badge — Pipeline stage has no badge config | All stages should render a badge | Add Pipeline to the SPV_STAGE_CONFIG with appropriate color/label | S |
| F-010 | P2 | FUNC | ADMIN | Admin | Multi-currency | Navigate to /spvs, view distributions | AED 500,000 distribution displays as "$500K" instead of AED 500K | Display native currency symbol | Same fix as F-009: use `Intl.NumberFormat` with correct currency code | S |
| F-014 | P2 | FUNC | ADMIN | Admin | Multi-org | Navigate to /tasks (global view) | QA tasks don't show client/org context — no indication which client a task belongs to | Each task should show its parent org/client name in the global tasks view | Add org name chip/tag to task cards in the global tasks view | M |
| F-016 | P2 | FUNC | ADMIN | Admin | Any | Navigate to /distributions | No client context switcher on Distributions page | Should have a client filter dropdown like the Ventures page | Add client filter dropdown component to Distributions page | M |
| F-017 | P2 | FUNC | ADMIN | Admin | Any | Navigate to /agents, view Overdue Agent | Overdue Agent says "All tasks are on schedule" but dashboard shows 11 overdue. Orchestrator correctly flagged the discrepancy. | Overdue Agent signal should reflect current overdue count | Re-run Overdue Agent to refresh its signal, or add staleness indicator to agent signals | M |
| F-018 | P2 | FUNC | ADMIN | Admin | Any | Navigate to /agents, compare header count to agent sums | Header says "105 signals" but 4 agents sum to 99 (11+66+11+11). 6 signals unaccounted. | Signal counts should be consistent | Verify signal count query matches the sum of per-agent counts | S |
| F-022 | P2 | FUNC | ADMIN | Admin | Any | View team page header | "Managing 4 clients" but dashboard shows 5 clients | Client count should be consistent across pages | Align the team page client count query with the dashboard client count | S |
| F-024 | P2 | FUNC | ADMIN | Admin | Meridian | Navigate to /access, view Organizations tab | Meridian shows "0 members" but 3 team members were seeded | Member count should reflect team_members records, not just OAuth-accepted users | Count team_members records per org, not just users with accepted sessions | S |
| F-026 | P2 | FUNC | ADMIN | Admin | Royalton | Navigate to /access, view Organizations tab | Royalton shows "33 ventures" but Ventures page shows 21 under Royalton | Venture count should be consistent | Align the access page venture count query with the ventures page grouping logic | S |
| F-027 | P2 | FUNC | ADMIN | Admin | Admin user | Navigate to /profile | Portfolio Summary shows dashes (—) for Ventures, Tasks, Distributions | Should show aggregate counts for admin, or "N/A — System Administrator" label | Either aggregate across all clients or display "System Administrator — no personal portfolio" | S |
| F3-001 | P2 | TRUST | PUBLIC | CTO persona | N/A | View landing page, check SOC 2 claim | "SOC 2: [IN PROGRESS]" with no named auditor or timeline | "SOC 2: [IN PROGRESS] — [Auditor Name], target Q3 2026" | Add auditor name and target date once engagement is signed | S |
| F3-005 | P2 | TRUST | PUBLIC | CTO persona | N/A | Navigate to /trust without logging in | /trust redirects to login. CTO cannot view security claims without authenticating. | Trust & Security page should be publicly accessible | Move /trust route outside the auth guard | S |
| F3-008 | P2 | TRUST | PUBLIC | CTO persona | N/A | View /demo pitch deck, check claims | "100% CLOSE RATE ON QUALIFIED LEADS" — technically true if N=1, but misleading | Add context: "100% close rate on N qualified leads" or remove | Add qualifying context or soften language | S |
| F3-009 | P2 | TRUST | PUBLIC | CTO persona | N/A | View /demo pitch deck, check SLA claim | "99.5% SLA" claimed but no SLA document exists. Infrastructure is Manus-hosted — Aurovia doesn't control hosting SLA. | SLA claim backed by signed document and infrastructure guarantees | Create SLA document or soften claim to "targeting 99.5% uptime" | S |
| F3-011 | P2 | TRUST | PUBLIC | GC persona | N/A | View landing page as EU visitor | No cookie consent banner on public pages. No documented GDPR data subject rights workflow. | Cookie consent banner + documented GDPR workflow | Add cookie consent banner (e.g., Cookiebot). Document data subject rights process. | M |
| F3-012 | P2 | TRUST | PUBLIC | GC persona | N/A | Evaluate AI transparency documentation | No AI transparency documentation, no model card, no explanation of how AI decisions are made | AI transparency page or documentation | Create AI transparency document: what models are used, what decisions they make, human-in-the-loop process, data scope. | L |
| F3-013 | P2 | TRUST | CROSS | GC persona | N/A | Ask "who is liable if AI makes an error?" | No documented liability framework for AI agent errors | Liability clause in ToS + insurance documentation | Add AI liability section to Terms of Service. Obtain E&O insurance. | L |
| F3-015 | P2 | TRUST | PUBLIC | GC persona | N/A | Review Terms of Service for IP clause | No IP ownership clause for AI-generated work product | Clear IP assignment clause in ToS | Add clause: "All AI-generated content created within your account is your intellectual property." | M |
| F3-019 | P2 | UX | CLIENT | Principal | Any | View client portal, ask "who is working on my ventures?" | No team/staff visibility in client portal | Team members and their assignments visible in client portal | Add "Your Team" section to client portal showing assigned team members and their current focus | M |
| F3-020 | P2 | UX | CLIENT | Principal | Any | View client portal, look for support contact | No help/support contact visible in client portal | Support phone/email/chat visible in portal footer or header | Add support contact to portal footer or a "Need Help?" floating button | S |
| F3-022 | P2 | UX | ADMIN | Operator | Any | View dashboard client table | "AI Empty Test" and "AI Test Client" visible in production dashboard — test artifacts cluttering operator view | Test/demo clients should be hidden or archived | Archive test clients, or add a "hide test clients" toggle | S |
| AH-02 | P2 | SEC | BACKEND | Any | Any | Inspect cookie settings | `sameSite: "none"` on all cookies — increases CSRF surface | `sameSite: "lax"` or Origin header verification on state-changing requests | Add Origin header verification middleware for mutations, or switch to sameSite=lax if OAuth flow permits | M |
| INJ-02 | P2 | SEC | BACKEND | Any | Any | Inspect CSP header | CSP allows `'unsafe-inline'` and `'unsafe-eval'` for scripts — weakens XSS protection | Nonce-based CSP for production | Implement nonce-based CSP: generate per-request nonce, inject into script tags and CSP header | L |
| INJ-05 | P2 | SEC | BACKEND | Any | Any | Upload a file with arbitrary fileType string | File upload accepts any `fileType` string without validation against allowlist | Allowlist of permitted MIME types | Add MIME type allowlist validation in the upload mutation (e.g., image/*, application/pdf, text/*) | S |
| F3-025 | P2 | FUNC | CROSS | Admin/Client | Multi-currency | View any distribution with non-USD currency | All amounts display with $ symbol regardless of actual currency (duplicate of F-009/F-010) | Native currency display | Same fix as F-009 | S |
| F3-030 | P2 | ARCH | BACKEND | CTO persona | Multi-jurisdiction | Ask about data residency | No data residency controls. All data in single Manus-hosted TiDB instance. | Data residency documentation and controls for EU/UAE/US | Document current data residency. Add data residency section to trust page. Long-term: multi-region support. | L |

---

### P3 — Low and Info (29 findings)

| ID | Severity | Category | Surface | Role | Tenant | Reproduction | Observed | Expected | Suggested Fix | Effort |
|----|----------|----------|---------|------|--------|--------------|----------|----------|---------------|--------|
| F-002 | P3 | FUNC | ADMIN | Admin | Meridian | View Team Attribution on client detail | Team members show "0 ventures" — venture-team assignments not seeded | Correct for data state — display is accurate | Seed venture-team assignments in QA data, or add "No assignments yet" label | S |
| F-004 | P3 | FUNC | ADMIN | Admin | Apex/Meridian | Navigate to /ventures, view Apex Partners | Apex shows Meridian ventures it has view access to — technically correct but potentially confusing | Label as "Shared ventures" or add "(view only)" tag | Add "(shared)" or "(view only)" badge to ventures accessed via org_venture_access | S |
| F-006 | P3 | FUNC | ADMIN | Admin | Any | Navigate to /ventures, view Unassigned section | 37 unassigned ventures from previous development iterations | Clean up test data for production | Delete or archive orphaned test ventures | M |
| F-011 | P3 | FUNC | ADMIN | Admin | Any | Navigate to /spvs, view distributions table | Cancelled distribution appears in table with "Cancelled" badge | Correct behavior — shown for audit trail | No fix needed — this is correct | S |
| F-012 | P3 | FUNC | ADMIN | Admin | Any | Navigate to /tasks | Duplicate "AI Generated: Review Q2 financials" appears twice | Should be deduplicated or show unique identifiers | Add deduplication logic to AI task generation, or add unique suffixes | S |
| F-013 | P3 | FUNC | ADMIN | Admin | Any | Navigate to /tasks | Duplicate "AI Generated: Follow up on permit renewal" appears twice | Same as F-012 | Same fix as F-012 | S |
| F-020 | P3 | FUNC | ADMIN | Admin | Any | Navigate to /oversight | All 105 events show as unactioned — no bulk action capability | Bulk "Mark Resolved" button for multiple events | Add select-all checkbox and bulk action toolbar | M |
| F-021 | P3 | FUNC | ADMIN | Admin | Meridian | Navigate to /team, view Sarah Chen | Sarah Chen shows "Client" type despite "manager" systemRole | Consistent with F-001 — role display mapping issue | Same fix as F-001 | S |
| F-029 | P3 | FUNC | ADMIN | Admin | Meridian | Navigate to /clients/meridian-holdings, view Team Attribution | All 3 members show "0 assignments" — venture-team links not created | Correct for data state | Seed venture-team assignments or improve empty state messaging | S |
| F-030 | P3 | FUNC | ADMIN | Admin | Any | Navigate to /ai | /ai returns 404 — AI Concierge is at /agent | Sidebar link should point to correct route | Verify sidebar link points to /agent (may already be correct — /ai was manual navigation) | S |
| F3-004 | P3 | UX | PUBLIC | Any | N/A | View landing page counters | "VENTURES TRACKED: [0_" and "SPVs ACTIVE: [0_" show zeros | Show real aggregate counts or remove counters | Either connect to live aggregate query or remove the counters | S |
| F3-006 | P3 | UX | PUBLIC | CTO persona | N/A | View login page | "Powered by Manus" branding visible — creates trust chain question | White-label login or explain Manus relationship | Add "Infrastructure by Manus" explanation in trust page, or white-label the login | M |
| F3-007 | P3 | TRUST | PUBLIC | CTO persona | N/A | View /demo pitch deck statistics | "42% coordinate on email chains" — source is Campden Wealth + "internal survey of 50+" | Verifiable sources preferred | The Campden Wealth citation is credible. "Internal survey" is acceptable for pitch deck. | S |
| F3-014 | P3 | TRUST | PUBLIC | GC persona | N/A | Navigate to /terms without logging in | Terms of Service requires authentication to view | ToS should be publicly accessible | Move /terms route outside auth guard | S |
| F3-017 | P3 | UX | CLIENT | Principal | Any | View client portal action cards | Task names show "QA-" prefix from test data | Clean task names in production | Data quality issue — remove QA prefix from production data | S |
| F3-018 | P3 | UX | CLIENT | Principal | Any | View client portal action cards | "View Tasks" button text is operator language | "Review" or "See Details" for client-facing language | Change button label to "Review" | S |
| F3-021 | P3 | UX | CLIENT | Principal | Any | Try to return to dashboard by clicking logo | No logo-click-to-home behavior | Logo click returns to dashboard | Add onClick handler to logo/brand element in client portal | S |
| F3-023 | P3 | UX | ADMIN | Operator | Multi-client | Try to complete tasks across multiple clients | No batch actions across clients — must navigate per-client | Cross-client batch task management | Add multi-select and batch action toolbar to global tasks view | L |
| F3-024 | P3 | UX | ADMIN | Operator | Multi-client | Open dashboard in the morning | No AI morning briefing — operator must visually scan | AI-generated morning summary | Add "Morning Briefing" card to dashboard with AI-generated summary of today's priorities | L |
| F3-026 | P3 | FUNC | BACKEND | Admin | Multi-currency | Check FX rate management | No automatic FX rate fetching — rates must be manually entered | Automated FX rate integration (ECB/forex API) | Add scheduled FX rate fetch from ECB or similar free API | M |
| F3-029 | P3 | FUNC | BACKEND | Any | Any | Check distribution amount precision | Bigint stores whole numbers only — fractional amounts truncated | Support fractional amounts (cents/pence) | Store amounts in minor currency units (cents) and divide by 100 for display | M |
| F3-033 | P3 | ARCH | BACKEND | CTO persona | N/A | Evaluate Manus dependency | Codebase has hard dependencies on Manus platform (OAuth, LLM, storage, notifications, hosting) | Documented "Manus exit plan" with replacement instructions | Create a dependency map document showing each Manus service and its open-source/commercial replacement | M |
| F3-034 | P3 | ARCH | CROSS | CTO persona | N/A | Ask "what happens if VENTEX goes down?" | No graceful degradation — clients lose all visibility instantly | Read-only fallback or email-based notification backup | Implement static snapshot export or email digest fallback for critical notifications | L |
| F3-035 | P3 | ARCH | CROSS | CTO persona | N/A | Ask about transition/migration plan | No documented transition plan or migration tooling | Documented migration process | Create transition guide: export data → import to alternative → verify integrity | M |
| PE-01 | P3 | SEC | BACKEND | Any | Any | Review RBAC dual identity | `user` and `manager` roles have dual identity based on organizationId | Documented behavior | Add RBAC documentation explaining dual-identity roles | S |
| PE-06 | P3 | SEC | BACKEND | Any | Any | Review inline role checks | 4 procedures use inline role checks instead of middleware | Use `requirePermission()` or `adminProcedure` consistently | Migrate inline checks to middleware-based pattern | S |
| INJ-04 | P3 | SEC | BACKEND | Any | Any | Evaluate LLM output validation | No server-side validation of LLM output — prompt injection could extract system prompt | Output validation layer | Add output sanitization: check LLM response doesn't contain system prompt fragments or cross-tenant data | M |
| INJ-06 | P3 | SEC | BACKEND | Any | Any | Upload file with special characters in filename | `sanitizeFilename()` exists but not called in upload mutation | Call sanitizeFilename on all uploads | Add `sanitizeFilename(input.filename)` call in the upload mutation | S |
| RL-02 | P3 | SEC | BACKEND | Any | Any | Evaluate rate limiting architecture | Rate limiting is in-memory only — not shared across instances | Redis-backed rate limiting for horizontal scaling | Replace Map-based rate limiter with Redis-backed implementation | M |
| AL-01 | P3 | SEC | BACKEND | Admin | Any | Check audit log deletion capability | Admin can delete audit logs via `security.clearAuditLog` | Soft-delete or append-only with archival | Change to soft-delete (mark as archived) instead of hard delete, or require dual-admin approval | M |
| AH-01 | P3 | SEC | BACKEND | Admin | Any | Check MFA enforcement | MFA available but optional — no enforcement for admin/owner roles | Mandatory MFA for privileged roles | Add MFA enforcement flag per role level in RBAC config | M |
| AH-05 | P3 | SEC | BACKEND | Any | Any | Same as RL-02 | In-memory rate limiting not shared across instances | Redis-backed rate limiting | Same fix as RL-02 | M |
| AH-07 | P3 | SEC | BACKEND | Any | Any | Evaluate enterprise provisioning | No SCIM provisioning endpoint | SCIM support for enterprise SSO | Build SCIM 2.0 endpoint for user provisioning/deprovisioning | XL |
| DP-04 | P3 | SEC | BACKEND | Any | Any | Check database TLS | Database TLS depends on Manus platform configuration | Verified TLS for database connections | Verify DATABASE_URL includes SSL parameters | S |
| DP-05 | P3 | SEC | BACKEND | Any | Any | Check S3 bucket access | S3 bucket is public by design — sensitive docs accessible via URL | Presigned URLs for sensitive documents | Use `storageGet()` with expiring presigned URLs for sensitive files | M |

---

## 3. Dependencies

The following findings have blocking or enabling relationships:

| Blocker | Blocked By | Relationship |
|---------|------------|--------------|
| F-009 (JPY as USD) | — | Blocks F-010, F3-025 (same root cause: currency display) |
| F-010 (AED as USD) | F-009 | Same fix resolves both |
| F3-025 (multi-currency display) | F-009 | Same fix resolves all three |
| F-015 (distributions single-org) | — | Blocks F-016 (no client switcher is a subset of this) |
| F-016 (no client switcher on distributions) | F-015 | Resolved together |
| F-001 (role display mapping) | — | Blocks F-021 (same root cause) |
| F-021 (Sarah Chen role display) | F-001 | Same fix resolves both |
| F-012 (duplicate AI task) | — | Related to F-013 (same deduplication issue) |
| F-013 (duplicate AI task) | F-012 | Same fix resolves both |
| F3-002 (exponential returns) | — | Part of F3-016 (GC aggregate finding) |
| F3-003 (Venezuela demo data) | — | Part of F3-016 (GC aggregate finding) |
| F3-010 (security package) | — | Enables F3-031 (hosting chain documentation is part of the package) |
| F3-032 (data export API) | — | Enables F3-035 (transition plan depends on export capability) |
| F3-027 (trust structures) | — | Independent — XL effort, can be deferred |
| F3-028 (sanctions screening) | — | Independent — XL effort, can be deferred |
| RL-02 (in-memory rate limiting) | — | Same fix as AH-05 (duplicate finding) |
| AH-05 (in-memory rate limiting) | RL-02 | Same fix resolves both |

### Dependency Chain: Currency Display
```
F-009 → F-010 → F3-025 (single fix in Intl.NumberFormat resolves all three)
```

### Dependency Chain: Distributions Page
```
F-015 → F-016 (adding client filter resolves both)
```

### Dependency Chain: Compliance Documentation
```
F3-002 + F3-003 → F3-016 (GC aggregate)
F3-010 → F3-031 (security package includes hosting documentation)
F3-032 → F3-035 (export API enables transition plan)
```

---

## 4. Quick Wins (P2/P3, <30 minutes each)

The following 24 findings can be resolved in a single batch cleanup pass. Estimated total: ~6-8 hours.

### Batch A: Copy & Config Fixes (< 5 min each)

| ID | Fix | Est. |
|----|-----|------|
| F3-002 | Change "EXponential returns" to "EXponential velocity" in landing page | 5 min |
| F3-003 | Replace "Venezuela Mining Rights" with "Dubai Marina Development" in demo data | 5 min |
| F-008 | Add "Pipeline" to SPV_STAGE_CONFIG with gray/neutral badge | 5 min |
| F3-001 | Update SOC 2 status text once auditor is engaged | 5 min |
| F3-008 | Soften "100% CLOSE RATE" to include qualifying context | 5 min |
| F3-009 | Change "99.5% SLA" to "targeting 99.5% uptime" until SLA document exists | 5 min |
| F3-004 | Remove or connect landing page venture/SPV counters | 5 min |
| F3-018 | Change "View Tasks" to "Review" in client portal action cards | 5 min |
| F3-022 | Archive "AI Empty Test" and "AI Test Client" organizations | 5 min |

### Batch B: Display Logic Fixes (10-20 min each)

| ID | Fix | Est. |
|----|-----|------|
| F-001 / F-021 | Fix systemRole → display label mapping in Team Attribution | 15 min |
| F-003 | Add `status !== 'cancelled'` filter to upcoming distributions query | 10 min |
| F-010 | Fix AED currency display (resolved by F-009 fix) | 0 min (free) |
| F3-025 | Fix multi-currency display (resolved by F-009 fix) | 0 min (free) |
| F-018 | Fix signal count mismatch in agents header | 15 min |
| F-022 | Align team page client count with dashboard count | 10 min |
| F-024 | Count team_members records (not just OAuth users) for org member count | 15 min |
| F-026 | Align access page venture count with ventures page grouping | 10 min |
| F-027 | Show "System Administrator" label instead of dashes in admin profile | 10 min |

### Batch C: Route & Access Fixes (5-15 min each)

| ID | Fix | Est. |
|----|-----|------|
| F3-005 | Move /trust route outside auth guard | 10 min |
| F3-014 | Move /terms route outside auth guard | 5 min |
| F3-021 | Add onClick to logo in client portal sidebar | 5 min |
| F3-020 | Add support contact to client portal footer | 15 min |
| INJ-05 | Add MIME type allowlist to file upload mutation | 15 min |
| INJ-06 | Call `sanitizeFilename()` in upload mutation | 5 min |

### Batch D: Security Quick Fixes (10-15 min each)

| ID | Fix | Est. |
|----|-----|------|
| PE-01 | Add RBAC dual-identity documentation comment | 10 min |
| PE-06 | Migrate 4 inline role checks to middleware pattern | 15 min |
| DP-04 | Verify DATABASE_URL includes SSL parameters | 10 min |

---

**End of Master Findings Register**

*This document consolidates all findings from Phases 1, 2, and 3 of the VENTEX Comprehensive Test Battery. No fixes have been applied. Awaiting fix plan instruction.*
