# SOC 2 Type II — Controls Mapping

**Prepared by:** VENTEX Security Engineering  
**Version:** 1.0  
**Date:** April 2026  
**Framework:** AICPA Trust Services Criteria (2017)

---

## 1. Overview

This document maps VENTEX platform controls to the AICPA Trust Services Criteria (TSC) required for SOC 2 Type II certification. The mapping covers all five trust service categories: Security (Common Criteria), Availability, Processing Integrity, Confidentiality, and Privacy.

Each control is mapped to the specific TSC criterion it satisfies, along with the implementation evidence and testing approach for the auditor.

---

## 2. Security (Common Criteria)

### CC1 — Control Environment

| Criterion | Description | VENTEX Control | Evidence Location |
|-----------|-------------|---------------|-------------------|
| CC1.1 | Entity demonstrates commitment to integrity and ethical values | Code of conduct policy, security-first engineering culture | `docs/legal/` policies |
| CC1.2 | Board exercises oversight responsibility | aurovia LLC governance structure, quarterly security reviews | Board meeting minutes |
| CC1.3 | Management establishes structure and authority | Role-based access control with 7 defined roles | `drizzle/schema.ts` — users table role enum |
| CC1.4 | Entity demonstrates commitment to competence | Security training records, code review requirements | PR review logs, training records |
| CC1.5 | Entity enforces accountability | Immutable audit logging of all sensitive operations | `server/security/rbac.ts` — logAudit function |

### CC2 — Communication and Information

| Criterion | Description | VENTEX Control | Evidence Location |
|-----------|-------------|---------------|-------------------|
| CC2.1 | Entity obtains relevant information | Real-time monitoring via SSE, agent activity feeds | `server/routes/sseEvents.ts` |
| CC2.2 | Entity internally communicates information | Notification system, velocity feed, daily briefs | `server/notificationHelper.ts` |
| CC2.3 | Entity communicates with external parties | Security.txt, trust page, incident response contacts | `client/public/.well-known/security.txt` |

### CC3 — Risk Assessment

| Criterion | Description | VENTEX Control | Evidence Location |
|-----------|-------------|---------------|-------------------|
| CC3.1 | Entity specifies suitable objectives | Security whitepaper with defined objectives | `docs/security/ventex-security-whitepaper.md` |
| CC3.2 | Entity identifies and analyzes risks | STRIDE threat model, pen test readiness | `docs/security/threat-model.md` |
| CC3.3 | Entity considers potential for fraud | Multi-tenant isolation, AI safety controls | 37 TENANT_PATCHED markers, `server/aiSafety.ts` |
| CC3.4 | Entity identifies and assesses changes | Change management via audit logging | `auditLog` table in database |

### CC4 — Monitoring Activities

| Criterion | Description | VENTEX Control | Evidence Location |
|-----------|-------------|---------------|-------------------|
| CC4.1 | Entity selects and develops monitoring activities | Health endpoints, agent scheduler monitoring | `/api/health/*`, `server/agentScheduler.ts` |
| CC4.2 | Entity evaluates and communicates deficiencies | Automated security scanning, vulnerability management | `scripts/security-scan.sh` |

### CC5 — Control Activities

| Criterion | Description | VENTEX Control | Evidence Location |
|-----------|-------------|---------------|-------------------|
| CC5.1 | Entity selects control activities | Defense-in-depth security architecture | `docs/security/ventex-security-whitepaper.md` |
| CC5.2 | Entity deploys control activities through policies | Security headers, rate limiting, input validation | `server/_core/index.ts`, `server/security/rateLimit.ts` |
| CC5.3 | Entity deploys through technology | Automated controls in code (RBAC, tenant isolation, MFA) | All `server/routers/*.ts` files |

### CC6 — Logical and Physical Access Controls

| Criterion | Description | VENTEX Control | Evidence Location |
|-----------|-------------|---------------|-------------------|
| CC6.1 | Entity implements logical access security | OAuth 2.0, SAML 2.0, session management | `server/_core/oauth.ts`, `server/security/sso.ts` |
| CC6.2 | Entity registers and authorizes users | Invitation-based onboarding, SCIM provisioning | `server/routers/team.ts`, SCIM endpoints |
| CC6.3 | Entity manages access removal | SCIM deprovisioning with <60s session termination | `server/security/sso.ts` — terminateUserSessions |
| CC6.4 | Entity restricts physical access | Cloud-hosted infrastructure (TiDB Cloud, AWS) | Sub-processor agreements |
| CC6.5 | Entity protects against security threats | Rate limiting, IP allowlisting, MFA | `server/security/rateLimit.ts`, `server/security/ipAllowlist.ts` |
| CC6.6 | Entity manages credentials | Encrypted MFA secrets, hashed API keys, secure cookies | `server/security/encryption.ts`, `server/security/mfa.ts` |
| CC6.7 | Entity restricts data transmission | TLS enforced, HSTS with preload | Security headers in `server/_core/index.ts` |
| CC6.8 | Entity prevents unauthorized software | Dependency management via pnpm lockfile | `pnpm-lock.yaml` |

### CC7 — System Operations

| Criterion | Description | VENTEX Control | Evidence Location |
|-----------|-------------|---------------|-------------------|
| CC7.1 | Entity detects and monitors anomalies | AI intelligence observations, smart alerts | `server/intelligence/`, `server/routers/intelligence.ts` |
| CC7.2 | Entity monitors system components | Health endpoints, SSE connection stats | `/api/health/*`, `/api/events/stats` |
| CC7.3 | Entity evaluates security events | Audit log with filtering, export, and retention | `server/routers/security.ts` — getAuditLog |
| CC7.4 | Entity responds to identified anomalies | Incident response plan with P1-P4 SLAs | `docs/security/incident-response-plan.md` |
| CC7.5 | Entity identifies and responds to incidents | IR playbook with containment procedures | `docs/security/incident-response-plan.md` |

### CC8 — Change Management

| Criterion | Description | VENTEX Control | Evidence Location |
|-----------|-------------|---------------|-------------------|
| CC8.1 | Entity manages changes to infrastructure | Version-controlled deployments, checkpoint system | Git history, checkpoint versions |

### CC9 — Risk Mitigation

| Criterion | Description | VENTEX Control | Evidence Location |
|-----------|-------------|---------------|-------------------|
| CC9.1 | Entity identifies and assesses vendor risk | Sub-processor inventory with DPA requirements | `docs/security/sub-processors.md` |
| CC9.2 | Entity assesses vendor compliance | Sub-processor compliance certifications tracked | `docs/security/sub-processors.md` |

---

## 3. Availability

| Criterion | Description | VENTEX Control | Evidence Location |
|-----------|-------------|---------------|-------------------|
| A1.1 | Entity maintains availability commitments | BCP/DR plan with RPO/RTO targets | `docs/security/bcp-dr-plan.md` |
| A1.2 | Entity authorizes, designs, and manages environmental protections | Cloud infrastructure with multi-AZ deployment | Sub-processor SLAs |
| A1.3 | Entity tests recovery plan procedures | Quarterly DR drills, monthly backup verification | BCP/DR testing schedule |

---

## 4. Processing Integrity

| Criterion | Description | VENTEX Control | Evidence Location |
|-----------|-------------|---------------|-------------------|
| PI1.1 | Entity obtains commitments about processing integrity | AI safety controls with confidence scoring | `server/aiSafety.ts` |
| PI1.2 | Entity implements policies for processing integrity | Human approval required for AI outputs, disclaimers | Agent approval queue procedures |
| PI1.3 | Entity monitors processing integrity | AI confidence thresholds, low-confidence review queue | `server/aiSafety.ts` — computeConfidenceScore |
| PI1.4 | Entity addresses processing integrity deviations | Agent rejection logging, immutable approval trail | `agent_approval_log` table |
| PI1.5 | Entity provides outputs completely and accurately | Distribution calculations verified, audit trail | `server/routers/distributions.ts` |

---

## 5. Confidentiality

| Criterion | Description | VENTEX Control | Evidence Location |
|-----------|-------------|---------------|-------------------|
| C1.1 | Entity identifies confidential information | Data classification in threat model | `docs/security/threat-model.md` — Section 4 |
| C1.2 | Entity disposes of confidential information | 90-day audit log retention, data purge procedures | `server/routers/security.ts` — purgeExpiredAuditLogs |

---

## 6. Privacy

| Criterion | Description | VENTEX Control | Evidence Location |
|-----------|-------------|---------------|-------------------|
| P1.1 | Entity provides notice about privacy practices | Privacy policy accessible from application | `/privacy` route |
| P2.1 | Entity communicates choices about data use | Data processing agreement template | `docs/legal/dpa-template.md` |
| P3.1 | Entity collects personal information consistently | Minimal data collection, purpose-limited | Schema design in `drizzle/schema.ts` |
| P4.1 | Entity limits use of personal information | Role-based access, tenant isolation | RBAC + tenant guards |
| P5.1 | Entity retains personal information | Data retention policy (90-day audit logs) | `docs/security/data-flow-diagram.md` |
| P6.1 | Entity disposes of personal information | Automated retention purge | `purgeExpiredAuditLogs` procedure |
| P7.1 | Entity discloses personal information | Sub-processor inventory | `docs/security/sub-processors.md` |
| P8.1 | Entity provides data subject access | Export data procedure | `security.exportData` tRPC procedure |

---

## 7. Auditor Guidance

For each control listed above, the auditor should:

1. **Inspect** the referenced evidence location to verify the control exists
2. **Test** the control by executing the described functionality in the staging environment
3. **Sample** audit log entries to verify controls operated effectively over the examination period
4. **Interview** the engineering team about control design rationale and exception handling

The platform provides automated evidence collection via the `security.getSecurityStatus` and `security.getAuditStats` tRPC procedures, which return real-time snapshots of security configuration and audit log statistics.
