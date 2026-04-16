# SOC 2 Type II — Evidence Collection Guide

**Prepared by:** VENTEX Security Engineering  
**Version:** 1.0  
**Date:** April 2026

---

## 1. Purpose

This guide provides step-by-step instructions for collecting evidence required during a SOC 2 Type II audit of the VENTEX platform. Each evidence item maps to a specific Trust Services Criterion (TSC) from the controls mapping document.

---

## 2. Automated Evidence Collection

The VENTEX platform provides several automated mechanisms for evidence collection:

### 2.1 Security Status Snapshot

The `security.getSecurityStatus` tRPC procedure returns a real-time snapshot of the current security posture, including MFA enrollment rates, active session counts, and security configuration status. This can be called from the Security page in the admin UI.

### 2.2 Audit Log Export

The `security.exportAuditLogCsv` procedure exports filtered audit log entries as CSV. Auditors can filter by date range, action type, user, and entity to extract relevant evidence for any examination period.

Access path: Security Page → Audit Log tab → Export CSV button.

### 2.3 Retention Statistics

The `security.getRetentionStats` procedure returns the total number of audit log entries and the count of entries older than the 90-day retention threshold, demonstrating that the retention policy is enforced.

### 2.4 Security Scanning

The automated security scanning script (`scripts/security-scan.sh`) produces a machine-readable report of HTTP security header compliance. Run this script monthly and archive the output as evidence of continuous monitoring.

---

## 3. Evidence Categories

### 3.1 Access Control Evidence

| Evidence Item | Collection Method | TSC Reference | Frequency |
|--------------|-------------------|---------------|-----------|
| User role assignments | Database query: `SELECT id, email, role FROM users` | CC6.1, CC6.2 | Quarterly |
| MFA enrollment rates | `security.getSecurityStatus` API call | CC6.6 | Monthly |
| Active session inventory | `security.getActiveSessions` API call | CC6.1 | On-demand |
| IP allowlist configurations | `security.getOrgSecuritySettings` per org | CC6.5 | Quarterly |
| API key inventory | `security.listApiKeys` per user | CC6.6 | Quarterly |
| SCIM provisioning logs | Audit log filtered by action `scim.*` | CC6.2, CC6.3 | Monthly |
| User deprovisioning evidence | Audit log filtered by action `scim.deactivate_user` | CC6.3 | Monthly |

### 3.2 Change Management Evidence

| Evidence Item | Collection Method | TSC Reference | Frequency |
|--------------|-------------------|---------------|-----------|
| Deployment history | Git log: `git log --oneline --since="YYYY-MM-DD"` | CC8.1 | Quarterly |
| Database migration history | `drizzle/meta/_journal.json` file | CC8.1 | Quarterly |
| Configuration change log | Audit log filtered by action `security.*` | CC8.1 | Monthly |

### 3.3 Monitoring Evidence

| Evidence Item | Collection Method | TSC Reference | Frequency |
|--------------|-------------------|---------------|-----------|
| Health check history | `/api/health` endpoint response logs | CC7.2 | Continuous |
| Security scan results | `scripts/security-scan.sh` output | CC4.2 | Monthly |
| Rate limiting effectiveness | Audit log filtered by rate limit events | CC6.5 | Monthly |
| AI safety review queue | `agents.approvalLog` API call | PI1.3 | Monthly |

### 3.4 Incident Response Evidence

| Evidence Item | Collection Method | TSC Reference | Frequency |
|--------------|-------------------|---------------|-----------|
| IR plan document | `docs/security/incident-response-plan.md` | CC7.4, CC7.5 | Annual review |
| IR drill records | Post-drill reports (manual) | CC7.4 | Quarterly |
| Incident tickets | Issue tracker records (manual) | CC7.5 | As-needed |

### 3.5 Vendor Management Evidence

| Evidence Item | Collection Method | TSC Reference | Frequency |
|--------------|-------------------|---------------|-----------|
| Sub-processor inventory | `docs/security/sub-processors.md` | CC9.1 | Annual review |
| DPA agreements | `docs/legal/dpa-template.md` + signed copies | CC9.2 | Annual review |
| Vendor compliance certs | Collected from sub-processor portals | CC9.2 | Annual |

### 3.6 Data Protection Evidence

| Evidence Item | Collection Method | TSC Reference | Frequency |
|--------------|-------------------|---------------|-----------|
| Encryption configuration | Code review of `server/security/encryption.ts` | CC6.7, C1.1 |  Annual |
| Data retention compliance | `security.getRetentionStats` API call | C1.2, P5.1 | Monthly |
| Data export capability | `security.exportData` API call demonstration | P8.1 | Annual |
| Backup verification | BCP/DR drill records | A1.3 | Quarterly |

---

## 4. Evidence Archive Structure

All evidence should be archived in the following directory structure, organized by examination period:

```
evidence/
  YYYY-Q[1-4]/
    access-control/
      user-roles-YYYY-MM-DD.csv
      mfa-enrollment-YYYY-MM-DD.json
      session-inventory-YYYY-MM-DD.json
      ip-allowlists-YYYY-MM-DD.json
    change-management/
      git-log-YYYY-MM-DD.txt
      migrations-YYYY-MM-DD.json
      config-changes-YYYY-MM-DD.csv
    monitoring/
      security-scan-YYYY-MM-DD.txt
      health-check-logs-YYYY-MM-DD.json
      rate-limit-events-YYYY-MM-DD.csv
    incident-response/
      ir-drill-report-YYYY-MM-DD.pdf
      incident-tickets-YYYY-MM-DD.csv
    vendor-management/
      sub-processor-review-YYYY-MM-DD.md
      dpa-signed-copies/
    data-protection/
      retention-stats-YYYY-MM-DD.json
      backup-verification-YYYY-MM-DD.pdf
```

---

## 5. Examination Period Preparation

Before the SOC 2 Type II examination period begins, ensure the following are in place:

1. **Audit log retention** is set to at least the examination period length (minimum 90 days, recommend 12 months for the first audit).
2. **Automated evidence collection** scripts are scheduled to run at the frequencies specified in Section 3.
3. **Access to the staging environment** is provisioned for the auditor with a read-only admin account.
4. **All policy documents** in `docs/security/` and `docs/legal/` are reviewed and current.
5. **Security scanning** has been run within the last 30 days with no unresolved critical findings.

---

## 6. Recommended Audit Partners

For SOC 2 Type II certification, consider the following audit-acceleration platforms that integrate with cloud-native applications:

| Platform | Strengths | Typical Timeline |
|----------|-----------|-----------------|
| Vanta | Automated evidence collection, continuous monitoring | 3-6 months |
| Drata | Strong integration ecosystem, real-time compliance | 3-6 months |
| Secureframe | AI-powered gap analysis, streamlined workflows | 3-6 months |
| Laika | Customizable frameworks, multi-standard support | 4-8 months |

These platforms can connect to the VENTEX codebase and infrastructure to automatically collect much of the evidence described in this guide, reducing manual effort significantly.
