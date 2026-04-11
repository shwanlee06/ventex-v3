# Information Security Policy

**Royalton Venture Holding — VENTEX Platform**
**Document ID:** SOC2-ISP-001
**Version:** 1.0
**Effective Date:** April 8, 2026
**Owner:** Chief Information Security Officer (CISO)
**Classification:** Internal — Confidential

---

## 1. Purpose

This Information Security Policy establishes the framework for protecting the confidentiality, integrity, and availability of information assets managed by the VENTEX platform. It defines the security controls, responsibilities, and procedures required to safeguard business data, client information, and system infrastructure in alignment with SOC 2 Type II Trust Services Criteria (TSC).

## 2. Scope

This policy applies to all employees, contractors, administrators, and third-party service providers who access, process, store, or transmit information through the VENTEX platform. It covers all information assets including venture data, SPV records, financial distributions, client communications, documents, and system configurations.

## 3. Information Classification

All information processed by VENTEX is classified into the following categories:

| Classification | Description | Examples | Controls |
|---|---|---|---|
| **Confidential** | Highly sensitive business data requiring maximum protection | Financial records, distribution amounts, API keys, MFA secrets, encryption keys | AES-256-GCM encryption at rest, TLS 1.2+ in transit, RBAC, audit logging |
| **Internal** | Business information for authorized personnel only | Venture details, SPV pipelines, task assignments, agent configurations | RBAC, cross-tenant isolation, session management |
| **Restricted** | Information shared with specific external parties | Client portal data, partner invitations, shared documents | Organization-scoped access, time-limited tokens |
| **Public** | Information intended for public access | Privacy policy, terms of service, landing page content | No access restrictions |

## 4. Access Control

### 4.1 Authentication

All users must authenticate via Manus OAuth with session-based cookie management. Administrative accounts (admin and owner roles) are required to enable TOTP-based multi-factor authentication (MFA). Authentication tokens are signed with JWT and expire according to configurable session timeout policies.

### 4.2 Authorization

The platform implements role-based access control (RBAC) with the following roles:

| Role | Access Level | MFA Required |
|---|---|---|
| **Owner** | Full platform access, system configuration, user management | Yes |
| **Admin** | Organization management, venture/SPV operations, agent configuration | Yes |
| **User** | Read access to assigned ventures, task completion, profile management | Recommended |
| **Client** | Portal access to organization-specific data only | No (token-based) |

### 4.3 Cross-Tenant Isolation

All database queries are scoped by `organizationId` to enforce strict tenant isolation. No user can access data belonging to another organization, regardless of their role. This is enforced at the database query layer through parameterized queries with organization-scoped WHERE clauses.

### 4.4 Session Management

Sessions are tracked in the `sessions` table with the following controls: configurable session timeout (default 30 minutes of inactivity); device fingerprinting for anomaly detection; IP address logging; ability to revoke individual sessions; and automatic expiration of inactive sessions.

## 5. Encryption

### 5.1 Data at Rest

Sensitive data fields (TOTP secrets, backup codes, API key hashes) are encrypted using AES-256-GCM with a platform-managed encryption master key (`ENCRYPTION_MASTER_KEY`). Database connections use TLS-encrypted connections to TiDB Cloud.

### 5.2 Data in Transit

All client-server communication is encrypted using TLS 1.2 or higher. Internal service-to-service communication uses HTTPS with bearer token authentication. File uploads to AWS S3 use server-side encryption (SSE-S3).

## 6. Network Security

### 6.1 Rate Limiting

All sensitive endpoints are protected by server-side rate limiting to prevent brute-force attacks and abuse:

| Endpoint Category | Limit | Window |
|---|---|---|
| MFA verification | 5 attempts | 5 minutes |
| API key creation | 5 requests | 1 hour |
| File uploads | 30 requests | 10 minutes |
| Email sending | 10 requests | 1 hour |
| AI chat | 30 requests | 10 minutes |
| Invitations | 20 requests | 1 hour |

### 6.2 Input Validation

All user inputs are validated using Zod schemas at the tRPC procedure level before processing. File uploads are validated for type, size, and content. SQL injection is prevented through parameterized queries via the Drizzle ORM.

## 7. Logging and Monitoring

### 7.1 Audit Logging

All security-relevant events are recorded in the `audit_log` table, including: authentication events (login, logout, MFA setup); data access and modifications; administrative actions; access denials; and system events. Audit logs are retained for a minimum of 365 days per the Data Retention Policy.

### 7.2 Activity Logging

Business operations are tracked in the `activity_log` table, providing a complete trail of venture, SPV, task, and distribution changes. Activity logs are retained for 180 days.

### 7.3 Agent Event Logging

AI agent operations are logged in the `agent_events` table with severity levels, action types, and entity linking. Events requiring client action are flagged and tracked until resolution.

## 8. Vulnerability Management

Dependencies are regularly audited using `pnpm audit` and updated to address known vulnerabilities. Critical and high-severity vulnerabilities are prioritized for immediate patching. Remaining transitive vulnerabilities with no available patches are documented and monitored.

## 9. Incident Response

Security incidents are handled according to the Incident Response Policy (SOC2-IRP-002). All incidents are logged in the audit trail and escalated according to severity classification.

## 10. Policy Review

This policy is reviewed annually or upon significant changes to the platform architecture, threat landscape, or regulatory requirements. All changes require approval from the CISO and are documented in the policy version history.

---

**Approval:**
- Prepared by: VENTEX Security Team
- Approved by: CISO, Royalton Venture Holding
- Next Review Date: April 8, 2027
