# SOC 2 Type II — Readiness Checklist

**Date:** April 2026  
**Status:** Pre-Audit

---

## Technical Controls

| # | Control | Status | Evidence |
|---|---------|--------|----------|
| 1 | Role-based access control (7 roles) | Implemented | `drizzle/schema.ts`, `server/_core/trpc.ts` |
| 2 | Multi-factor authentication (TOTP) | Implemented | `server/security/mfa.ts` |
| 3 | Per-org MFA enforcement option | Implemented | `organizations.enforceMfa` field |
| 4 | Session management (idle + absolute timeout) | Implemented | `useIdleTimeout.ts`, `SESSION_ABSOLUTE_TIMEOUT_MS` |
| 5 | IP allowlist enforcement | Implemented | `server/security/ipAllowlist.ts` |
| 6 | Immutable audit logging | Implemented | `server/security/rbac.ts` — logAudit |
| 7 | Audit log export (CSV) | Implemented | `security.exportAuditLogCsv` |
| 8 | Audit log retention (90-day purge) | Implemented | `security.purgeExpiredAuditLogs` |
| 9 | Encryption at rest (MFA secrets) | Implemented | `server/security/encryption.ts` — AES-256-GCM |
| 10 | Encryption in transit (TLS/HSTS) | Implemented | HSTS with preload directive |
| 11 | Rate limiting (8 categories) | Implemented | `server/security/rateLimit.ts` |
| 12 | Input validation (Zod schemas) | Implemented | All tRPC procedures |
| 13 | Security headers (CSP, CORP, COOP) | Implemented | `server/_core/index.ts` |
| 14 | Multi-tenant isolation (37 guards) | Implemented | 9 router files with TENANT_PATCHED |
| 15 | SAML 2.0 SSO | Implemented | `server/security/sso.ts` |
| 16 | SCIM 2.0 provisioning | Implemented | `server/routes/ssoRoutes.ts` |
| 17 | AI safety controls | Implemented | `server/aiSafety.ts` |
| 18 | Health monitoring endpoints | Implemented | `/api/health/*` |
| 19 | Data export capability | Implemented | `security.exportData` |
| 20 | Automated security scanning | Implemented | `scripts/security-scan.sh` |

## Documentation

| # | Document | Status | Location |
|---|----------|--------|----------|
| 1 | Security whitepaper | Complete | `docs/security/ventex-security-whitepaper.md` |
| 2 | Incident response plan | Complete | `docs/security/incident-response-plan.md` |
| 3 | BCP/DR plan | Complete | `docs/security/bcp-dr-plan.md` |
| 4 | Sub-processor inventory | Complete | `docs/security/sub-processors.md` |
| 5 | Data flow diagram | Complete | `docs/security/data-flow-diagram.md` |
| 6 | Threat model (STRIDE) | Complete | `docs/security/threat-model.md` |
| 7 | Pen test readiness report | Complete | `docs/security/pentest-readiness.md` |
| 8 | Pen test engagement package | Complete | `docs/security/pentest-engagement-package.md` |
| 9 | Asset inventory | Complete | `docs/security/asset-inventory.md` |
| 10 | DPA template | Complete | `docs/legal/dpa-template.md` |
| 11 | Regulatory questions | Complete | `docs/legal/regulatory-questions.md` |
| 12 | Cyber insurance requirements | Complete | `docs/legal/cyber-insurance-requirements.md` |
| 13 | Indemnification clauses | Complete | `docs/legal/indemnification-clauses.md` |
| 14 | SOC 2 controls mapping | Complete | `docs/compliance/soc2-controls-mapping.md` |
| 15 | Evidence collection guide | Complete | `docs/compliance/evidence-collection-guide.md` |
| 16 | Privacy policy | Complete | `/privacy` route |
| 17 | Terms of service | Complete | `/terms` route |

## Pre-Audit Actions Required

| # | Action | Owner | Status |
|---|--------|-------|--------|
| 1 | Select SOC 2 audit partner (Vanta/Drata/Secureframe) | aurovia LLC | Pending |
| 2 | Complete third-party penetration test | aurovia LLC | Pending |
| 3 | Obtain cyber liability insurance | aurovia LLC | Pending |
| 4 | Establish formal change management process | Engineering | Pending |
| 5 | Conduct first IR drill and document results | Security | Pending |
| 6 | Conduct first DR drill and document results | Engineering | Pending |
| 7 | Collect signed DPAs from all sub-processors | Legal | Pending |
| 8 | Begin 3-month evidence collection period | All | Pending |
