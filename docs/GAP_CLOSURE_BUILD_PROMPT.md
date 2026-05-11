# VENTEX — GAP CLOSURE BUILD PROMPT

## CONTEXT
You are continuing work on VENTEX, the venture intelligence operations platform built by Aurovia LLC for UHNWI/SFO clients managing $10M–$10B+ AUM. The current build (live at www.ventex.us.com) has a working product architecture, 50+ database tables, four AI agents, role-based access, and a client portal. A third-party review identified gaps that block institutional client adoption and unicorn-trajectory growth. Your job is to close those gaps with the same standard you used to build the original system: no placeholders, no stubs, every button wired, every claim accurate.

## NON-NEGOTIABLE RULES FOR THIS WORK
1. Do not introduce or retain any text claiming "SOC 2 compliant," "SOC 2 certified," or equivalent. Replace with "SOC 2 Type II readiness in progress" wherever it appears in code, UI, marketing, or docs. We do not have a SOC 2 report yet.
2. Do not introduce or retain any AI output that goes to a client without an enforced human-approval step. AI drafts must require approval before send. AI recommendations on stage advances, distributions, or anything touching securities or money must carry a disclaimer and require human sign-off, logged in audit_log.
3. Every change must include tests. No feature is "done" without unit tests, integration tests, an authorization test that proves cross-tenant denial, and an audit_log entry verified by test.
4. When you encounter a gap that requires legal, accounting, or licensing input (regulatory classification, custody, money movement, tax forms), build the technical scaffolding behind a feature flag set to OFF and tag it `[LEGAL REVIEW REQUIRED]` in code comments and in your status report. Do not ship it enabled.
5. At the end of every work session, output a status report: what shipped, what tests pass, what is still stubbed or flagged for legal review, what is next.

---

## WORKSTREAM 1 — TENANT ISOLATION HARDENING (P0, BLOCKS EVERYTHING)
The current architecture relies on application-layer `WHERE organization_id = ?` filtering. One missing clause is a cross-tenant data leak — a company-ending event for a UHNWI platform.

Deliverables:
- Audit every tRPC procedure and DB helper. Produce `/docs/security/tenant-isolation-audit.md` listing every query and confirming organization scoping.
- Add a middleware guard in the tRPC server that rejects any DB query missing tenant context. The guard must throw, not warn. Include a unit test that proves it throws.
- For every tRPC procedure, add an authorization test using the pattern: create User_A in Org_A, create resource in Org_B, assert User_A receives 403/404 (never the resource). One test per endpoint. No exceptions.
- Evaluate migration path from MySQL/TiDB application-layer filtering to Postgres Row Level Security policies enforced at the DB layer. Produce `/docs/architecture/rls-migration-plan.md` with cost, risk, and timeline. Do not migrate yet — just produce the plan.
- Add a CI check that scans for new DB queries missing org scoping. Block merge on violation.

---

## WORKSTREAM 2 — ENTERPRISE AUTHENTICATION (P0, BLOCKS ENTERPRISE SALES)
Manus OAuth alone will not pass enterprise procurement. Add a real IdP layer.

Deliverables:
- Integrate WorkOS (preferred) or Auth0 as an abstraction over enterprise IdPs. Support SAML 2.0 SSO and OIDC for tenants who require it.
- Per-tenant IdP configuration in the admin console: tenant admin can upload IdP metadata, configure attribute mapping, and test the connection.
- SCIM 2.0 user provisioning and deprovisioning endpoints. When a tenant deprovisions a user via their IdP, that user's Ventex sessions must be terminated within 60 seconds and their access revoked. Test this end-to-end.
- Maintain Manus OAuth as the default for non-enterprise tenants. SSO is per-tenant configurable.
- Mandatory MFA for all admin/owner/manager roles. WebAuthn/passkeys preferred over TOTP. Existing TOTP support stays as a fallback.
- Session timeout: 15 min idle, 8 hr absolute, configurable per tenant within those ceilings.
- Add a tenant security settings page where tenant admins control: SSO config, MFA enforcement, session timeouts, IP allowlists, allowed authentication methods.

---

## WORKSTREAM 3 — AI AGENT SAFETY AND EVALUATION FRAMEWORK (P0)
Current agents generate drafts and recommendations. There is no evaluation framework, no enforced human-in-the-loop, no liability disclaimers. This is the single largest legal exposure in the product.

Deliverables:
- Add a `human_approval_required` flag to every agent output type. For Distribution Sentinel drafts, Velocity Agent stage-advance recommendations, and any client-facing communication, this flag must be TRUE and enforced server-side. Outputs cannot be sent or auto-applied without approval.
- Build an approval queue UI for operators showing pending AI outputs with: original signal, AI recommendation, confidence score, suggested action, approve/reject/edit buttons. Every approval logs actor, timestamp, original output, final output, and reason to audit_log.
- Add disclaimers to every AI-generated client-facing artifact: "AI-assisted output reviewed by [operator name] on [date]. Not investment, legal, or tax advice." Persist disclaimer text in the artifact itself.
- Build an AI evaluation framework:
  - Create an `agent_eval_dataset` table for golden examples (input + expected output + actual output + grader score).
  - Build a CLI command `npm run eval:agents` that runs each agent against the golden dataset and outputs precision, recall, and calibration metrics.
  - Wire the eval into CI as a non-blocking report. Fail CI only if accuracy drops more than 10% from the previous main branch baseline.
  - Add a human review queue for low-confidence outputs (configurable threshold per agent, default 0.7).
- Add a `confidence_score` field to every agent output. Display in operator UI. Suppress display in client UI.

---

## WORKSTREAM 4 — DATA RESIDENCY, SUB-PROCESSORS, AND CROSS-BORDER (P0 FOR EU/SWISS/GULF CLIENTS)
The current system likely routes data through US-based services (Anthropic API, AWS, Resend). For non-US institutional clients, this triggers GDPR Article 44 cross-border transfer requirements and Swiss/UAE/Singapore equivalents.

Deliverables:
- Produce `/docs/security/sub-processors.md` listing every third-party service that processes client data, with: vendor name, purpose, data categories processed, location of processing, DPA link, security certifications. Include at minimum: Manus, AWS (S3 region), TiDB host, Anthropic, Resend, WorkOS/Auth0.
- Produce `/docs/security/data-flow-diagram.md` (text or Mermaid) showing how client data moves through the system from ingestion to storage to AI processing to display.
- Add per-tenant data residency configuration: tenant admin selects US, EU, or APAC region. For EU-region tenants:
  - File storage routes to an EU S3 bucket (eu-west-1 or eu-central-1)
  - Database writes route to an EU-region DB instance (or schema, depending on architecture choice)
  - AI calls route to Anthropic's EU endpoint if/when available; otherwise log a `[CROSS-BORDER TRANSFER]` flag and require explicit tenant consent on first use
- Build a tenant-facing sub-processor change notification system: when Ventex adds a new sub-processor, email notice to tenant admins with 30-day objection window.
- Generate downloadable DPA template (`/legal/dpa-template.pdf`) — content marked `[LEGAL REVIEW REQUIRED]`, do not represent as final legal document.

---

## WORKSTREAM 5 — TRUST, SECURITY, AND COMPLIANCE PAGE (P0 FOR SALES)
Sales cannot close institutional deals without a credible public security posture page.

Deliverables:
- Build `/trust` page on the Ventex marketing site with the following sections, all populated with accurate current state:
  - Security overview (architecture, encryption in transit and at rest, MFA, SSO support)
  - Compliance status: list current state honestly. "SOC 2 Type II audit window targeted for [date]." If a Type I has been issued, link it. Do not claim what you do not have.
  - Sub-processor list (link to docs from Workstream 4)
  - Data residency options
  - Penetration testing posture: "Annual third-party penetration test, last conducted [date], summary available under NDA" — only after a test has actually been conducted; until then, "Inaugural penetration test scheduled for [date]"
  - Incident response: contact email, expected response time, breach notification commitment
  - Vulnerability disclosure: link to security.txt and a `security@aurovia.com` mailbox
  - Status page link
  - Downloadable security whitepaper (build a real one, 8–12 pages, factual)
- Add `/.well-known/security.txt` per RFC 9116 with security contact and disclosure policy.
- Build a public status page (use Statuspage, Better Stack, or self-hosted) showing uptime for: app, API, database, AI agents, email delivery. Wire to real health checks, not manual updates.

---

## WORKSTREAM 6 — OBSERVABILITY AND SLA INFRASTRUCTURE (P1)
Audit logs alone are not observability. Institutional clients expect APM, error tracking, and an SLA.

Deliverables:
- Integrate Sentry for error tracking on frontend and backend. Tag events with tenant_id (hashed, never raw PII).
- Integrate OpenTelemetry tracing on the backend. Export to Datadog, Grafana Cloud, or Honeycomb (pick one and commit).
- Add structured JSON logging across the backend with correlation IDs propagated from frontend through tRPC to DB queries.
- Add health check endpoints: `/health`, `/health/db`, `/health/ai`, `/health/storage`, `/health/email`. Wire these to the public status page.
- Define and document an SLA: target 99.9% monthly uptime, response time SLOs per endpoint class. Write `/legal/sla.md` — mark `[LEGAL REVIEW REQUIRED]`.

---

## WORKSTREAM 7 — BUSINESS CONTINUITY AND BACKUP (P1)
Not addressed in current build. Required for institutional diligence.

Deliverables:
- Implement automated encrypted backups: database (daily full + hourly incremental, 30-day retention), file storage (S3 versioning + cross-region replication), audit logs (separate immutable bucket with object lock, 7-year retention).
- Build a tested restore procedure. Run a restore drill, document it in `/docs/ops/dr-test-[date].md`. Schedule monthly drills.
- Document RPO (target: 1 hour) and RTO (target: 4 hours) in `/docs/ops/bcp.md`.
- Build a per-tenant data export endpoint: tenant admin can request a full export of their data (ventures, tasks, distributions, files, audit log) as a downloadable zip. Required for GDPR portability and for client trust.
- Build a per-tenant data deletion endpoint: tenant admin can request deletion of all tenant data. Soft-delete with 30-day recovery window, then hard-delete with audit log retention only. Tag this `[LEGAL REVIEW REQUIRED]` because retention obligations may override.
- Document a key-person continuity plan in `/docs/ops/key-person.md`. Tag `[LEGAL REVIEW REQUIRED]` — this typically requires a source code escrow agreement (Iron Mountain, EscrowTech) which is a contracted service.

---

## WORKSTREAM 8 — SECURITY HARDENING AND CI GATES (P1)
Deliverables:
- Add Snyk or Dependabot for dependency scanning. Block merge on high/critical vulnerabilities.
- Add Semgrep or CodeQL for SAST. Block merge on high/critical findings.
- Add Trivy for container scanning if Docker is used.
- Add Gitleaks or TruffleHog for secret scanning. Block merge on detection.
- Move all secrets out of env files committed to repo. Use AWS Secrets Manager or HashiCorp Vault. Rotate quarterly.
- Enforce signed commits on the main branch.
- Require PR review (minimum one reviewer) and passing CI before merge.
- Document the change management process in `/docs/security/change-management.md`.

---

## WORKSTREAM 9 — REGULATORY POSTURE DOCUMENTATION (P0 — DOCS, NOT CODE)
You cannot build the regulatory answer, but you can build the scaffolding that makes the answer enforceable.

Deliverables:
- Produce `/docs/legal/regulatory-questions.md` — a structured list of questions for outside counsel covering:
  - Is Ventex a technology vendor only, or does any feature constitute investment advice / broker-dealer activity / RIA activity?
  - Custody analysis: do any features (distribution tracking, capital calls) trigger Advisers Act Rule 206(4)-2 custody implications?
  - Money movement: does the platform ever move funds, or only display them? If only display, what disclaimers and architectural separations enforce that?
  - Securities communications: do AI-generated LP notices or distribution communications constitute securities offerings, advertisements, or solicitations under SEC/FINRA rules?
  - Cross-border: for non-US clients, what local registrations apply (FCA in UK, FINMA in Switzerland, MAS in Singapore, ADGM/DIFC in UAE)?
  - Data: GDPR controller vs. processor analysis per tenant relationship.
  - AI: state-level AI regulation (Colorado AI Act, NYC AEDT, EU AI Act risk classification).
- Add code-level enforcement of the answers:
  - A `ComplianceMode` config per tenant: `technology_vendor_only` (default) suppresses any UI that could be construed as recommendation. AI outputs in this mode are labeled "Operational Suggestion" not "Recommendation."
  - A feature flag `enables_money_movement` defaulting OFF and tagged `[LEGAL REVIEW REQUIRED]`.
  - A feature flag `enables_securities_communications` defaulting OFF and tagged `[LEGAL REVIEW REQUIRED]`.

---

## WORKSTREAM 10 — WHITE-LABEL INFRASTRUCTURE (P1)
Current claim is "white-label ready." Make it true.

Deliverables:
- Custom domain support: each tenant can configure `app.theirfirm.com` via CNAME. Automate Let's Encrypt cert provisioning.
- Branding config per tenant: logo, primary color, accent color, favicon, login page background, email sender name, email sender domain (with SPF/DKIM/DMARC setup wizard).
- Custom email templates per tenant: editable templates for invitation, password reset, task reminder, distribution notice.
- Tenant legal entity in contracts: tenant admin uploads their MSA/SaaS agreement template; new users see the tenant's terms, not Ventex's, on first login (where the tenant is the contracting party with the end user).
- Document the white-label deployment runbook in `/docs/ops/white-label-onboarding.md`.

---

## WORKSTREAM 11 — INTEGRATION ARCHITECTURE (P1)
Current build has no fund admin, accounting, or tax integration. Institutional clients require these.

Deliverables:
- Build a pluggable integration adapter pattern under `/server/integrations/` with adapters for:
  - Accounting: QuickBooks Online, NetSuite, Sage Intacct (start with QBO)
  - Fund admin export: CSV/JSON export in formats compatible with Juniper Square, Carta, Allvue (start with a generic export, not a live API integration)
  - Tax: K-1 / 1099 data export to a tax preparer-friendly format
  - Custodian/aggregator read-only feed: Addepar, Black Diamond (defer; document interface only)
- Build the QBO integration end-to-end: OAuth connect, account mapping, distribution sync. One real integration is worth more than five stubs.

---

## WORKSTREAM 12 — PRICING, BILLING, AND CONTRACT INFRASTRUCTURE (P2)
Current tiers (poc, growth, enterprise) are names without economics or enforcement.

Deliverables:
- Define per-tier feature gates in code: which workstream features are enabled per tier. Document in `/docs/product/tier-matrix.md`.
- Build a usage metering system: count active ventures, active users, AI agent runs, document storage GB, per tenant. Display in admin console.
- Integrate Stripe for self-serve tiers (poc, growth) with invoice-based fallback for enterprise.
- Build an MSA/Order Form generation flow for enterprise tier — generates a PDF from a tenant configuration. Tag `[LEGAL REVIEW REQUIRED]`.

---

## EXECUTION ORDER
Execute in this order. Do not start a workstream until the prior P0 workstreams are complete and tested.

P0 (start immediately, in parallel where possible):
- Workstream 1 (Tenant Isolation)
- Workstream 3 (AI Safety)
- Workstream 4 (Data Residency)
- Workstream 5 (Trust Page)
- Workstream 9 (Regulatory Docs)

P0/P1 transition:
- Workstream 2 (Enterprise Auth)

P1:
- Workstream 6 (Observability)
- Workstream 7 (BCP/Backup)
- Workstream 8 (Security CI Gates)
- Workstream 10 (White-Label)
- Workstream 11 (Integrations)

P2:
- Workstream 12 (Pricing/Billing)
