# VENTEX Security Whitepaper

**Version:** 1.0
**Date:** April 16, 2026
**Author:** Aurovia LLC — Engineering & Security
**Classification:** Confidential — Share with Clients Under NDA

---

## Executive Summary

VENTEX is a velocity AI platform built by Aurovia LLC to accelerate venture holding operations. The platform processes sensitive financial, legal, and operational data on behalf of institutional clients. This whitepaper describes the security architecture, controls, and compliance posture of the VENTEX platform.

VENTEX is designed around four security principles: defense in depth, least privilege, tenant isolation, and transparency. Every layer of the stack — from authentication to AI output — enforces these principles through code-level controls, not just policy.

---

## 1. Architecture Overview

The VENTEX platform consists of the following components:

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Frontend | React 19, Tailwind CSS 4 | Single-page application |
| API Layer | Express 4, tRPC 11 | Type-safe RPC with batch transport |
| Database | TiDB Cloud (MySQL-compatible) | Structured data storage |
| File Storage | AWS S3 | Document and asset storage |
| AI Inference | Anthropic Claude | Agent operations, document intelligence |
| Authentication | Manus OAuth 2.0 | Identity provider |
| Email | Resend | Transactional notifications |

All components communicate over TLS 1.2 or higher. No unencrypted channels exist in the system.

---

## 2. Authentication and Session Management

VENTEX uses OAuth 2.0 via the Manus identity provider. The authentication flow is as follows:

1. The user is redirected to the Manus OAuth portal.
2. After successful authentication, an authorization code is returned.
3. The VENTEX server exchanges the code for an access token.
4. A signed JWT session cookie is set with `HttpOnly`, `Secure`, and `SameSite=Lax` attributes.
5. Subsequent requests include the session cookie, which is validated on every API call.

Session tokens are signed with HMAC-SHA256 using a server-side secret. Sessions expire after a configurable idle timeout (default: 30 minutes). Active session monitoring detects concurrent sessions and can enforce single-session policies.

---

## 3. Tenant Isolation

Tenant isolation is the most critical security control in the VENTEX platform. Every database query and mutation is scoped to the authenticated user's organization.

The isolation model operates at three levels:

**Procedure Level.** Every tRPC procedure that accesses tenant data calls `resolveOrgId()`, which extracts the organization ID from the authenticated user's session. This function is called at the top of every procedure, before any database query.

**Query Level.** All database queries include an `organizationId` filter. The Drizzle ORM query builder ensures that the filter is applied as a `WHERE` clause, not as application-level filtering.

**Validation Level.** For cross-entity operations (e.g., creating a distribution for a venture), the system verifies that the target entity belongs to the same organization. Helper functions like `getOrgVentureIds()` and `getOrgSpvIds()` provide pre-validated entity lists.

In April 2026, a comprehensive tenant isolation audit identified and remediated 37 procedures across 9 router files. Every mutation and sensitive query now verifies organization ownership before executing.

---

## 4. Role-Based Access Control

VENTEX implements a two-tier RBAC model:

| Role | Access Level | Capabilities |
|------|-------------|-------------|
| Operator (admin) | Full platform access | All CRUD operations, AI agent management, team management, settings |
| Client (user) | Read-only portal access | View assigned ventures, distributions, documents; no mutations |

The `isVentexTeam()` helper function enforces operator-only access at the procedure level. Client users access the platform through a dedicated portal (`/portal/:orgSlug`) that presents a curated, read-only view of their ventures.

Additional role-based controls:
- Admin procedures use `adminProcedure` middleware that rejects non-admin requests.
- Client portal procedures verify that the requesting user belongs to the target organization.
- File upload and deletion operations require operator privileges.

---

## 5. AI Agent Safety

VENTEX employs AI agents for operational automation (task generation, distribution monitoring, document intelligence). All AI operations are subject to the following safety controls:

**Human Approval Required.** Every AI-generated draft and action requires explicit human approval before execution. The `humanApprovalRequired` flag is set on all agent outputs by default.

**Confidence Scoring.** Each AI output includes a `confidenceScore` (0-100) computed from the agent type, data completeness, and output characteristics. Outputs below the agent-specific threshold (default: 70) are flagged for additional review.

**Disclaimers.** All AI-generated content includes a disclaimer stating that the output is an operational suggestion, not investment, legal, or tax advice. The disclaimer text varies based on the tenant's compliance mode.

**Immutable Audit Trail.** Every approval, rejection, and execution of an AI output is logged to the `agent_approval_log` table. These records cannot be modified or deleted.

**No Training on Client Data.** Anthropic's enterprise agreement prohibits the use of API inputs and outputs for model training. VENTEX does not fine-tune or train models on client data.

---

## 6. Data Encryption

All data is encrypted in transit and at rest:

| Layer | Method | Key Management |
|-------|--------|---------------|
| Network | TLS 1.2+ | Certificate authority |
| Database | AES-256 TDE | TiDB Cloud managed |
| File Storage | AES-256 SSE-S3 | AWS KMS |
| Session Cookies | HMAC-SHA256 JWT | Application-managed secret |

Application-level encryption for sensitive fields (e.g., financial account numbers) is available via the `ENCRYPTION_MASTER_KEY` environment variable and AES-256-GCM.

---

## 7. Data Residency

Tenant administrators can select their preferred data residency region:

| Region | S3 Bucket | Database | AI Processing |
|--------|-----------|----------|--------------|
| United States | us-east-1 | us-east-1 | US (native) |
| European Union | eu-west-1 | eu-west-1 | US (cross-border flagged) |
| Asia-Pacific | ap-southeast-1 | ap-southeast-1 | US (cross-border flagged) |

When AI processing requires cross-border data transfer (e.g., EU tenant using US-based Anthropic API), the system logs a `[CROSS-BORDER TRANSFER]` event in the audit trail and requires explicit tenant consent on first use.

---

## 8. Audit Logging

VENTEX maintains comprehensive audit logs for all sensitive operations:

| Event Category | Examples | Retention |
|---------------|----------|-----------|
| Authentication | Login, logout, session creation | 7 years |
| Data Access | Venture view, SPV view, distribution view | 7 years |
| Data Mutation | Create, update, delete operations | 7 years |
| AI Operations | Agent execution, draft approval/rejection | 7 years |
| Access Control | Permission denied, role changes | 7 years |
| Cross-Border | Data transfer events | 7 years |

Audit logs are stored in the `audit_log` table and include: user ID, action, entity type, entity ID, details (JSON), IP address, user agent, result (success/denied/error), and timestamp.

---

## 9. Sub-Processor Management

VENTEX maintains a register of all third-party sub-processors that process client data. The current list includes:

1. **AWS** — File storage (SOC 2, ISO 27001, FedRAMP)
2. **TiDB Cloud** — Database (SOC 2, ISO 27001)
3. **Anthropic** — AI inference (SOC 2)
4. **Resend** — Email delivery (SOC 2)
5. **Manus** — Hosting and authentication (SOC 2 pending)

Data Processing Agreements (DPAs) are in place with all sub-processors. Clients are notified at least 30 calendar days before any new sub-processor is engaged.

---

## 10. Incident Response

Our incident response process follows the published Incident Response Policy:

| Severity | Response Time | Notification |
|----------|--------------|-------------|
| Critical (P0) | 1 hour | Immediate client notification |
| High (P1) | 4 hours | Within 24 hours |
| Medium (P2) | 24 hours | Weekly summary |
| Low (P3) | 72 hours | Monthly summary |

Breach notification is provided within 72 hours of confirmation, in compliance with GDPR Article 33.

---

## 11. Compliance Roadmap

| Milestone | Status | Target Date |
|-----------|--------|------------|
| SOC 2 Type II Readiness | Policies published, controls implemented | Complete |
| SOC 2 Type II Audit | Audit firm engagement | Q3 2026 |
| GDPR Compliance | DPA, sub-processor register, data residency | Complete |
| Tenant Isolation Audit | 37 procedures remediated | Complete |
| AI Safety Framework | Human approval, confidence scoring, audit trail | Complete |
| Penetration Test | Third-party assessment | Q3 2026 |
| ISO 27001 | ISMS design phase | 2027 |

---

## 12. Contact

For security inquiries, vulnerability reports, or compliance documentation requests:

**Email:** security@aurovia.com
**Security.txt:** https://ventexdemo.manus.space/.well-known/security.txt
**Trust Page:** https://ventexdemo.manus.space/trust

---

**`[LEGAL REVIEW REQUIRED]`** — This whitepaper requires review by qualified legal counsel and security leadership before distribution to clients. Specific claims about certifications, compliance status, and security controls must be validated.
