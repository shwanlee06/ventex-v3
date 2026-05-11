# VENTEX Security Whitepaper

**Version:** 2.0
**Date:** May 11, 2026
**Author:** Aurovia LLC — Engineering & Security
**Classification:** Confidential — Share with Clients Under NDA

---

## Executive Summary

VENTEX is a velocity AI platform built by Aurovia LLC to accelerate venture holding operations. The platform processes sensitive financial, legal, and operational data on behalf of institutional clients managing portfolios exceeding $1B in assets under management. This whitepaper describes the security architecture, controls, and compliance posture of the VENTEX platform.

VENTEX is designed around five security principles: defense in depth, least privilege, tenant isolation, transparency, and zero-trust authentication. Every layer of the stack — from authentication to AI output — enforces these principles through code-level controls, not just policy.

---

## 1. Architecture Overview

The VENTEX platform consists of the following components:

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Frontend | React 19, Tailwind CSS 4 | Single-page application |
| API Layer | Express 4, tRPC 11 | Type-safe RPC with batch transport |
| Database | TiDB Cloud (MySQL-compatible) | Structured data storage |
| File Storage | AWS S3 (hardened) | Document and asset storage with encryption |
| AI Inference | Anthropic Claude | Agent operations, document intelligence |
| Authentication | Manus OAuth 2.0 + WebAuthn | Multi-factor identity provider |
| Email | Resend | Transactional notifications |
| SSO | SAML 2.0 + SCIM 2.0 | Enterprise identity federation |

All components communicate over TLS 1.3 (preferred) or TLS 1.2 minimum. No unencrypted channels exist in the system. HTTP Strict Transport Security (HSTS) is enforced with a max-age of 2 years including subdomains and preload.

---

## 2. Authentication and Session Management

VENTEX implements a multi-layered authentication system supporting multiple credential types:

### 2.1 Authentication Methods

| Method | Type | Phishing Resistant | Implementation |
|--------|------|-------------------|----------------|
| OAuth 2.0 | Federated | Depends on IdP | Manus OAuth portal |
| Passkeys (WebAuthn/FIDO2) | Passwordless | Yes | Platform authenticators + security keys |
| SAML 2.0 SSO | Enterprise federated | Depends on IdP | WorkOS-compatible SAML flow |
| Google Sign-In | Social OAuth | No | Via Manus OAuth |
| Apple Sign-In | Social OAuth | No | Via Manus OAuth |
| TOTP MFA | Second factor | No | RFC 6238 compliant |

### 2.2 Passkey/WebAuthn Implementation

VENTEX supports FIDO2/WebAuthn passkeys as a phishing-resistant authentication method:

- Users can register multiple passkeys (Touch ID, Face ID, Windows Hello, YubiKey)
- Discoverable credentials enable usernameless login
- Signature counter validation detects credential cloning
- Backed-up credential tracking (iCloud Keychain, Google Password Manager)
- Challenge expiry enforced at 5 minutes

### 2.3 Session Security

Session tokens are signed with HMAC-SHA256 using a server-side secret. The session management system enforces:

| Control | Default | Configurable |
|---------|---------|-------------|
| Idle timeout | 30 minutes | Per-organization (max 30 min) |
| Absolute timeout | 8 hours | Per-organization (max 8 hr) |
| Concurrent sessions | 5 per user | Per-organization |
| Cookie attributes | HttpOnly, Secure, SameSite=Strict | No |
| Session renewal | 5 min before expiry | No |

All users, including administrators, are required to re-authenticate after session expiry. There are no permanent sessions.

### 2.4 Brute-Force Protection

Progressive lockout protects against credential stuffing:

- 5 failed attempts trigger initial lockout (15 minutes)
- Lockout duration doubles with each subsequent lockout
- Maximum lockout: 4 hours
- Counter resets after 60 minutes of inactivity
- All lockout events are logged and trigger security alerts

---

## 3. Tenant Isolation

Tenant isolation is the most critical security control in the VENTEX platform. Every database query and mutation is scoped to the authenticated user's organization.

The isolation model operates at three levels:

**Procedure Level.** Every tRPC procedure that accesses tenant data calls `resolveOrgId()`, which extracts the organization ID from the authenticated user's session. This function is called at the top of every procedure, before any database query.

**Query Level.** All database queries include an `organizationId` filter. The Drizzle ORM query builder ensures that the filter is applied as a `WHERE` clause, not as application-level filtering.

**Validation Level.** For cross-entity operations (e.g., creating a distribution for a venture), the system verifies that the target entity belongs to the same organization. Helper functions like `getOrgVentureIds()` and `getOrgSpvIds()` provide pre-validated entity lists.

A comprehensive tenant isolation audit in April 2026 identified and remediated 37 procedures across 9 router files. Every mutation and sensitive query now verifies organization ownership before executing.

---

## 4. Role-Based Access Control

VENTEX implements a multi-tier RBAC model:

| Role | Access Level | Capabilities |
|------|-------------|-------------|
| Owner | Full platform access | All operations + billing + org management |
| Admin | Administrative access | All CRUD, AI agent management, team management, settings |
| Manager | Operational access | Venture management, task assignment, reporting |
| Partner | Collaborative access | Assigned ventures, limited mutations |
| Client | Portal access | View assigned ventures, distributions, documents |
| Viewer | Read-only access | View-only, no mutations |

Additional role-based controls:
- Admin procedures use `adminProcedure` middleware that rejects non-admin requests
- Client portal procedures verify that the requesting user belongs to the target organization
- File upload and deletion operations require operator privileges
- MFA can be enforced per-organization for admin/owner/manager roles

---

## 5. File Storage Security (S3 Hardening)

VENTEX implements enterprise-grade file storage security:

### 5.1 Upload Controls

| Control | Implementation |
|---------|---------------|
| File type validation | MIME type + extension whitelist |
| Blocked extensions | .exe, .bat, .cmd, .js, .php, .ps1, etc. |
| Size limits | 100 MB general, 10 MB images, 50 MB documents |
| Integrity verification | SHA-256 checksum on upload |
| Non-enumerable keys | Random suffix prevents path guessing |

### 5.2 Access Controls

- Presigned URLs with 15-minute TTL for downloads
- 5-minute TTL for upload URLs
- Organization-scoped file keys (`org-{id}/...`)
- Cross-tenant access attempts are logged and denied
- All file access events recorded in audit trail

### 5.3 Encryption

| Layer | Method |
|-------|--------|
| In transit | TLS 1.3 |
| At rest | AES-256 SSE-S3 |
| Application-level | AES-256-GCM for sensitive fields |

### 5.4 Security Headers for Downloads

All file download responses include:
- `Content-Disposition: attachment` (forces download, prevents XSS)
- `X-Content-Type-Options: nosniff`
- `Cache-Control: private, no-cache, no-store, must-revalidate`

---

## 6. AI Agent Safety

VENTEX employs AI agents for operational automation (task generation, distribution monitoring, document intelligence). All AI operations are subject to the following safety controls:

**Human Approval Required.** Every AI-generated draft and action requires explicit human approval before execution. The `humanApprovalRequired` flag is set on all agent outputs by default.

**Confidence Scoring.** Each AI output includes a `confidenceScore` (0-100) computed from the agent type, data completeness, and output characteristics. Outputs below the agent-specific threshold (default: 70) are flagged for additional review.

**Disclaimers.** All AI-generated content includes a disclaimer stating that the output is an operational suggestion, not investment, legal, or tax advice.

**Immutable Audit Trail.** Every approval, rejection, and execution of an AI output is logged to the `agent_approval_log` table. These records cannot be modified or deleted.

**No Training on Client Data.** Anthropic's enterprise agreement prohibits the use of API inputs and outputs for model training. VENTEX does not fine-tune or train models on client data.

---

## 7. Enterprise Security Controls

### 7.1 Security Headers

All HTTP responses include:

| Header | Value |
|--------|-------|
| Strict-Transport-Security | max-age=63072000; includeSubDomains; preload |
| Content-Security-Policy | Restrictive policy (see implementation) |
| X-Content-Type-Options | nosniff |
| X-Frame-Options | DENY |
| Referrer-Policy | strict-origin-when-cross-origin |
| Permissions-Policy | camera=(), microphone=(), geolocation=(), payment=() |

### 7.2 IP Allowlisting

Organizations can configure CIDR-based IP allowlists. When enabled, requests from non-allowlisted IPs are rejected at the middleware level before reaching any business logic.

### 7.3 Rate Limiting

Endpoint-specific rate limiting protects against abuse:

| Endpoint Category | Limit | Window |
|-------------------|-------|--------|
| Authentication | 5 attempts | 15 minutes |
| API mutations | 100 requests | 1 minute |
| File uploads | 20 requests | 1 minute |
| AI operations | 30 requests | 1 minute |

### 7.4 CSRF Protection

All state-changing operations require a valid CSRF token. The token is bound to the user's session and validated on every mutation request.

### 7.5 Request Signing

API-to-API communication uses HMAC-SHA256 request signing with timestamp validation (5-minute tolerance) to prevent replay attacks.

---

## 8. Data Encryption

All data is encrypted in transit and at rest:

| Layer | Method | Key Management |
|-------|--------|---------------|
| Network | TLS 1.3 (preferred), TLS 1.2 minimum | Certificate authority |
| Database | AES-256 TDE | TiDB Cloud managed |
| File Storage | AES-256 SSE-S3 | AWS KMS |
| Session Cookies | HMAC-SHA256 JWT | Application-managed secret |
| Sensitive Fields | AES-256-GCM | ENCRYPTION_MASTER_KEY |

---

## 9. Data Residency

Tenant administrators can select their preferred data residency region:

| Region | S3 Bucket | Database | AI Processing |
|--------|-----------|----------|--------------|
| United States | us-east-1 | us-east-1 | US (native) |
| European Union | eu-west-1 | eu-west-1 | US (cross-border flagged) |
| Asia-Pacific | ap-southeast-1 | ap-southeast-1 | US (cross-border flagged) |

When AI processing requires cross-border data transfer, the system logs a `[CROSS-BORDER TRANSFER]` event in the audit trail and requires explicit tenant consent on first use.

---

## 10. Audit Logging

VENTEX maintains comprehensive audit logs for all sensitive operations:

| Event Category | Examples | Retention |
|---------------|----------|-----------|
| Authentication | Login, logout, passkey registration, MFA events | 7 years |
| Data Access | Venture view, SPV view, distribution view | 7 years |
| Data Mutation | Create, update, delete operations | 7 years |
| AI Operations | Agent execution, draft approval/rejection | 7 years |
| Access Control | Permission denied, role changes | 7 years |
| File Operations | Upload, download, delete with checksums | 7 years |
| Security Events | Brute-force, session anomaly, cross-tenant attempts | 7 years |
| Cross-Border | Data transfer events | 7 years |

Audit logs are stored in the `audit_log` table and include: user ID, action, entity type, entity ID, details (JSON), IP address, user agent, result (success/denied/error), and timestamp. Logs are archived (soft-deleted) after 365 days per SOC 2 CC7.2 but retained for the full 7-year period.

---

## 11. Enterprise SSO (SAML 2.0 + SCIM 2.0)

VENTEX supports enterprise SSO for organizations that require centralized identity management:

**SAML 2.0:** Organizations configure their Identity Provider (Okta, Azure AD, OneLogin, etc.) with VENTEX SP metadata. Authentication flows through the IdP, and VENTEX creates/maps users based on SAML assertions.

**SCIM 2.0:** Automated user lifecycle management. The IdP pushes user create/update/deactivate events to the VENTEX SCIM endpoint. Session termination on SCIM deactivate occurs within 60 seconds.

**Just-In-Time Provisioning:** New users authenticated via SAML are automatically provisioned with the default client role in their organization.

---

## 12. Data Retention and Lifecycle

| Data Type | Retention Period | Disposal Method |
|-----------|-----------------|-----------------|
| Audit logs | 365 days active, 7 years archived | Soft-delete → archive |
| Activity logs | 180 days | Hard delete |
| Expired sessions | 30 days after expiry | Hard delete |
| Temporary files | 7 days | Auto-delete lifecycle rule |
| File versions | 90 days | Auto-delete lifecycle rule |

Data purge jobs run daily at 03:00 UTC. All purge operations are logged.

---

## 13. Sub-Processor Management

VENTEX maintains a register of all third-party sub-processors that process client data:

1. **AWS** — File storage (SOC 2, ISO 27001, FedRAMP)
2. **TiDB Cloud** — Database (SOC 2, ISO 27001)
3. **Anthropic** — AI inference (SOC 2)
4. **Resend** — Email delivery (SOC 2)
5. **Manus** — Hosting and authentication (SOC 2 pending)

Data Processing Agreements (DPAs) are in place with all sub-processors. Clients are notified at least 30 calendar days before any new sub-processor is engaged.

---

## 14. Incident Response

Our incident response process follows the published Incident Response Policy:

| Severity | Response Time | Notification |
|----------|--------------|-------------|
| Critical (P0) | 1 hour | Immediate client notification |
| High (P1) | 4 hours | Within 24 hours |
| Medium (P2) | 24 hours | Weekly summary |
| Low (P3) | 72 hours | Monthly summary |

Breach notification is provided within 72 hours of confirmation, in compliance with GDPR Article 33.

---

## 15. Compliance Roadmap

| Milestone | Status | Target Date |
|-----------|--------|------------|
| SOC 2 Type II Readiness | Policies published, controls implemented | Complete |
| Enterprise Security Controls | Passkeys, S3 hardening, session management | Complete |
| SAML 2.0 + SCIM 2.0 | Enterprise SSO integration | Complete |
| SOC 2 Type II Audit | Audit firm engagement | Q3 2026 |
| GDPR Compliance | DPA, sub-processor register, data residency | Complete |
| Tenant Isolation Audit | 37 procedures remediated | Complete |
| AI Safety Framework | Human approval, confidence scoring, audit trail | Complete |
| Penetration Test | Third-party assessment | Q3 2026 |
| ISO 27001 | ISMS design phase | 2027 |

---

## 16. Contact

For security inquiries, vulnerability reports, or compliance documentation requests:

**Email:** security@aurovia.co
**Security.txt:** https://www.ventex.us.com/.well-known/security.txt
**Trust Page:** https://www.ventex.us.com/trust

---

**`[LEGAL REVIEW REQUIRED]`** — This whitepaper requires review by qualified legal counsel and security leadership before distribution to clients. Specific claims about certifications, compliance status, and security controls must be validated.
