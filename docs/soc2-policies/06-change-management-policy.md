# Change Management Policy

**Royalton Venture Holding — ATLAS Platform**
**Document ID:** SOC2-CMP-006
**Version:** 1.0
**Effective Date:** April 8, 2026
**Owner:** Chief Information Security Officer (CISO)
**Classification:** Internal — Confidential

---

## 1. Purpose

This Change Management Policy establishes the procedures for planning, approving, implementing, and reviewing changes to the ATLAS platform. It ensures that changes are made in a controlled manner that minimizes risk to service availability, data integrity, and security posture, in alignment with SOC 2 Trust Services Criteria CC8.1 (change management).

## 2. Scope

This policy applies to all changes to the ATLAS platform, including: application code changes (frontend and backend); database schema modifications; infrastructure and configuration changes; dependency updates and security patches; environment variable and secret changes; and third-party integration modifications.

## 3. Change Classification

Changes are classified by risk and impact to determine the appropriate approval and testing requirements:

| Classification | Description | Approval Required | Testing Required | Examples |
|---|---|---|---|---|
| **Standard** | Low-risk, routine changes with well-understood impact | Engineering Lead | Unit tests, type checking | UI text changes, minor styling updates, documentation |
| **Normal** | Moderate-risk changes affecting functionality or data | Engineering Lead + CISO review | Unit tests, integration tests, manual QA | New features, API changes, dependency updates |
| **Emergency** | Urgent changes to address security vulnerabilities or critical outages | Post-implementation review | Minimal viable testing | Security patches, hotfixes for production outages |
| **Major** | High-risk changes affecting architecture, security, or data models | CISO + Business Owner | Full regression testing, security review | Schema migrations, auth changes, encryption updates, new vendor integrations |

## 4. Change Request Process

### 4.1 Request Submission

All non-emergency changes must be documented before implementation, including: description of the change and its business justification; affected components (frontend, backend, database, infrastructure); risk assessment and potential impact; rollback plan; and testing plan.

### 4.2 Review and Approval

Changes are reviewed based on their classification. The review process includes: code review by at least one other engineer; TypeScript compilation verification (`npx tsc --noEmit`); automated test execution (`pnpm test`); security impact assessment for changes touching authentication, authorization, encryption, or data access; and database migration review for schema changes.

### 4.3 Implementation

Changes are implemented following the platform's build loop: (1) update database schema in `drizzle/schema.ts` and push migrations (`pnpm db:push`); (2) add or update query helpers in `server/db.ts`; (3) create or modify tRPC procedures in `server/routers.ts` or feature routers; (4) build frontend UI using tRPC hooks and shadcn/ui components; and (5) write or update vitest specifications.

### 4.4 Verification

After implementation, changes are verified through: TypeScript compilation (zero errors required); automated test suite execution (all tests must pass); manual testing of affected functionality; checkpoint creation (`webdev_save_checkpoint`) for version tracking; and production deployment verification.

## 5. Database Change Management

Database changes require additional controls due to the irreversible nature of data modifications:

### 5.1 Schema Changes

All schema changes must: be defined in `drizzle/schema.ts` using the Drizzle ORM; generate migrations via `drizzle-kit generate`; be reviewed for backward compatibility; include a rollback strategy; and be applied using `drizzle-kit migrate` (via `pnpm db:push`).

### 5.2 Destructive Operations

Destructive database operations (DROP TABLE, DELETE without WHERE, column removal) require: explicit approval from the CISO; a verified backup of affected data; documentation of the business justification; and a tested recovery procedure.

## 6. Emergency Changes

Emergency changes bypass the standard approval process but must: be documented within 24 hours of implementation; receive post-implementation review from the CISO; include a root cause analysis of the emergency; and be tracked in the audit log with the `emergency_change` action type.

## 7. Dependency Management

### 7.1 Routine Updates

Dependencies are updated regularly to address security vulnerabilities. The update process includes: running `pnpm audit` to identify vulnerabilities; prioritizing critical and high-severity patches; testing compatibility after updates; documenting any breaking changes or workarounds; and creating a checkpoint after successful updates.

### 7.2 Major Version Upgrades

Major version upgrades of critical dependencies (Express, tRPC, Drizzle, React, Vite) require: review of the changelog and migration guide; assessment of breaking changes; comprehensive testing; and a rollback plan with a pre-upgrade checkpoint.

## 8. Configuration Changes

Changes to environment variables, secrets, and platform configuration must: be applied through the `webdev_request_secrets` tool or platform settings; never be committed to source code or version control; be documented with the reason for the change; and be verified through automated tests where possible.

## 9. Rollback Procedures

### 9.1 Application Rollback

Application changes can be rolled back using `webdev_rollback_checkpoint` to restore a previous checkpoint. Rollback should be initiated when: automated tests fail after deployment; critical functionality is broken; security vulnerabilities are introduced; or performance degradation is detected.

### 9.2 Database Rollback

Database schema rollbacks require manual intervention and must: be planned before the forward migration is applied; be tested in a non-production environment; preserve data integrity; and be documented in the change record.

## 10. Audit Trail

All changes are tracked through: version control (Git) with descriptive commit messages; checkpoint history with timestamps and descriptions; audit log entries for configuration and security changes; and database migration history in `drizzle/meta/_journal.json`.

## 11. Policy Review

This policy is reviewed annually or after significant incidents related to change management failures.

---

**Approval:**
- Prepared by: ATLAS Security Team
- Approved by: CISO, Royalton Venture Holding
- Next Review Date: April 8, 2027
