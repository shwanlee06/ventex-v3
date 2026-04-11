# Data Retention Policy

**Royalton Venture Holding — VENTEX Platform**
**Document ID:** SOC2-DRP-003
**Version:** 1.0
**Effective Date:** April 8, 2026
**Owner:** Chief Information Security Officer (CISO)
**Classification:** Internal — Confidential

---

## 1. Purpose

This Data Retention Policy defines the retention periods, storage requirements, and disposal procedures for all data processed by the VENTEX platform. It ensures compliance with SOC 2 Trust Services Criteria CC6.5 (logical access controls) and CC7.2 (system monitoring), as well as applicable legal and regulatory requirements.

## 2. Scope

This policy applies to all data stored, processed, or transmitted by the VENTEX platform, including database records, uploaded files, system logs, and cached data. It covers both production and backup data.

## 3. Retention Schedule

The following retention periods are enforced through automated purging mechanisms:

| Data Category | Database Table | Retention Period | Purge Condition | Justification |
|---|---|---|---|---|
| **Audit Logs** | `audit_log` | 365 days | All records older than cutoff | SOC 2 regulatory minimum; security forensics |
| **Activity Logs** | `activity_log` | 180 days | All records older than cutoff | Business operations trail |
| **Expired Sessions** | `sessions` | 30 days after expiry | `isActive = false` AND `expiresAt` older than cutoff | Session cleanup; no longer needed for auth |
| **Agent Events** | `agent_events` | 180 days | `isRead = true` AND older than cutoff | Operational intelligence; unread events preserved |
| **Read Notifications** | `notifications` | 90 days | `isRead = 1` AND older than cutoff | User communication; unread preserved |

### 3.1 Business Data Retention

The following business data is retained indefinitely while the organization's account is active:

| Data Category | Tables | Retention | Notes |
|---|---|---|---|
| **Venture Records** | `ventures`, `venture_files`, `venture_folders` | Account lifetime | Core business data |
| **SPV Records** | `spvs`, `spv_files` | Account lifetime | Investment records |
| **Distribution Records** | `distributions` | Account lifetime | Financial records |
| **Task Records** | `tasks` | Account lifetime | Operational history |
| **User Accounts** | `users`, `user_preferences` | Account lifetime + 30 days | Grace period for reactivation |
| **Organization Data** | `organizations`, `org_members` | Account lifetime | Tenant configuration |

### 3.2 File Storage Retention

Files uploaded to AWS S3 (venture documents, SPV files, blueprints, team avatars) are retained for the lifetime of the associated record. When a file record is deleted from the database, the corresponding S3 object should be deleted within 30 days.

## 4. Automated Purging

### 4.1 Purge Schedule

The automated data retention purge runs daily, initiated 2 minutes after server startup and then every 24 hours. The purge process executes sequentially across all covered tables.

### 4.2 Purge Process

Each purge cycle: (1) calculates the cutoff date for each data category based on the retention period; (2) executes DELETE queries with appropriate WHERE conditions; (3) records the number of deleted rows per table; (4) logs the complete purge summary to the `audit_log` table for compliance trail; and (5) outputs a summary to the server console.

### 4.3 Manual Purge

Administrators with the `admin` role can trigger a manual purge cycle through the Settings interface (`settings.runRetentionPurge` tRPC mutation). Manual purges are rate-limited to prevent abuse.

### 4.4 Retention Statistics

Administrators can view current data retention statistics through the Settings interface (`settings.getRetentionStats` tRPC query), which displays row counts and configured retention periods for each covered table.

## 5. Data Disposal

### 5.1 Database Records

Records past their retention period are permanently deleted using SQL DELETE operations. The database engine handles physical storage reclamation through its internal garbage collection processes.

### 5.2 Encrypted Data

When records containing encrypted fields (MFA secrets, backup codes) are deleted, the encrypted data is irrecoverable because the individual encryption IVs are destroyed with the record.

### 5.3 Backup Data

Database backups managed by TiDB Cloud follow the cloud provider's retention schedule. Backup retention should not exceed the maximum retention period defined in this policy plus 30 days.

## 6. Account Termination

When an organization's account is terminated: (a) all organization-scoped data is retained for 30 days to allow data export; (b) after the 30-day grace period, all organization data is permanently deleted; (c) audit logs related to the organization are retained for the full 365-day period for compliance purposes; and (d) S3 files associated with the organization are deleted within 30 days of data deletion.

## 7. Legal Holds

If a legal hold is placed on specific data, the automated purge process must be configured to exclude that data until the hold is released. Legal holds override the standard retention schedule and require approval from Legal Counsel.

## 8. Exceptions

Exceptions to this policy require written approval from the CISO and must document: the specific data affected; the reason for the exception; the alternative retention period; and the review date for the exception.

## 9. Compliance Verification

Retention compliance is verified through: automated purge audit log entries (recorded after each cycle); periodic review of retention statistics by administrators; and annual policy review against regulatory requirements.

## 10. Policy Review

This policy is reviewed annually or upon changes to regulatory requirements, business needs, or platform architecture.

---

**Approval:**
- Prepared by: VENTEX Security Team
- Approved by: CISO, Royalton Venture Holding
- Next Review Date: April 8, 2027
