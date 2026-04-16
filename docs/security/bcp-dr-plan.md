# VENTEX — Business Continuity & Disaster Recovery Plan

**Prepared by:** aurovia LLC Engineering  
**Date:** April 16, 2026  
**Classification:** Confidential — Internal Use Only  
**Version:** 1.0  
**Review Cadence:** Semi-annually or after any P1 incident

---

## 1. Purpose and Scope

This Business Continuity Plan (BCP) and Disaster Recovery Plan (DRP) establishes the procedures, targets, and responsibilities for maintaining VENTEX platform operations during adverse events and restoring services after disruptions. The plan covers all components of the VENTEX platform including the application tier, database tier, file storage, AI services, and supporting infrastructure.

The plan is designed to meet the expectations of institutional limited partners (LPs) and enterprise clients who require documented continuity assurance as part of their due diligence process.

---

## 2. Service Tier Classification

VENTEX services are classified into tiers based on their criticality to business operations. Each tier has distinct recovery objectives and resource allocation priorities.

| Tier | Service | Description | Business Impact of Outage |
|------|---------|-------------|--------------------------|
| **Tier 1 — Critical** | Core Application | Dashboard, venture management, SPV tracking, client portal | Complete operational halt for all tenants |
| **Tier 1 — Critical** | Database (TiDB) | All persistent data — ventures, SPVs, distributions, users, audit logs | Data loss, compliance violation |
| **Tier 1 — Critical** | Authentication | OAuth, session management, MFA | No user access to any system |
| **Tier 2 — Essential** | File Storage (S3) | Documents, reports, uploaded files | Degraded operations, no document access |
| **Tier 2 — Essential** | AI Agent Services | Overdue agent, distribution sentinel, velocity agent | No automated monitoring or alerts |
| **Tier 3 — Supporting** | Email Notifications | Resend email delivery | Delayed communications, manual workaround available |
| **Tier 3 — Supporting** | Analytics & Monitoring | Health checks, audit logging | Reduced visibility, no compliance logging |

---

## 3. Recovery Objectives

Recovery Point Objective (RPO) defines the maximum acceptable data loss measured in time. Recovery Time Objective (RTO) defines the maximum acceptable downtime before services must be restored.

| Service Tier | RPO | RTO | Justification |
|-------------|-----|-----|---------------|
| **Tier 1 — Critical** | 1 hour | 4 hours | Financial data and tenant operations cannot tolerate significant loss or extended downtime |
| **Tier 2 — Essential** | 4 hours | 8 hours | AI agents and file storage can tolerate brief interruption; manual workarounds exist |
| **Tier 3 — Supporting** | 24 hours | 24 hours | Email and analytics can be reconstructed from primary data sources |

---

## 4. Sub-Processor Dependency Map

The following table maps each VENTEX component to its infrastructure provider and the provider's own continuity guarantees. This aligns with the sub-processor registry documented in `docs/security/sub-processors.md`.

| Component | Provider | Provider SLA | Data Region | Failover Capability |
|-----------|----------|-------------|-------------|-------------------|
| Application Hosting | Manus Cloud | 99.9% uptime | US (primary) | Multi-zone deployment |
| Database | TiDB Cloud (PingCAP) | 99.995% uptime | US-East | Automatic multi-replica failover |
| File Storage | AWS S3 | 99.99% availability | US-East-1 | Cross-region replication available |
| Authentication | Manus OAuth | 99.9% uptime | US | Stateless JWT fallback |
| AI/LLM Services | Manus Forge API | Best effort | US | Graceful degradation (agents pause) |
| Email Delivery | Resend | 99.9% uptime | US | Queue-based retry |

---

## 5. Backup Strategy

### 5.1 Database Backups

TiDB Cloud provides automated backup management. The following backup schedule applies:

| Backup Type | Frequency | Retention | Storage Location |
|------------|-----------|-----------|-----------------|
| Continuous incremental | Real-time (PITR) | 7 days | TiDB Cloud managed storage |
| Full snapshot | Daily at 02:00 UTC | 30 days | TiDB Cloud managed storage |
| Monthly archive | First Sunday of month | 12 months | Separate cloud storage account |

**Point-in-Time Recovery (PITR):** TiDB Cloud supports recovery to any point within the 7-day PITR window, enabling RPO of effectively zero for database operations within that window.

### 5.2 File Storage Backups

AWS S3 provides built-in durability of 99.999999999% (11 nines). Additional protection measures include:

| Protection | Status | Details |
|-----------|--------|---------|
| S3 versioning | Enabled | All objects retain previous versions for 90 days |
| Cross-region replication | Planned | Replication to US-West-2 for geographic redundancy |
| Lifecycle policies | Active | Transition to Glacier after 180 days for archived files |

### 5.3 Application State

The VENTEX application is stateless by design. All session state is stored in signed JWT cookies, and all persistent state resides in the database. This means the application tier can be fully reconstructed from the code repository and database backup.

| Component | Backup Method | Recovery Method |
|-----------|--------------|----------------|
| Application code | Git repository (GitHub) | `git clone` + `pnpm install` + `pnpm build` |
| Environment variables | Manus Cloud secrets manager | Re-inject from secrets store |
| Database schema | Drizzle migrations in repository | `pnpm db:push` against new database |
| Static assets | CDN with S3 origin | Re-upload from local archive |

---

## 6. Disaster Recovery Procedures

### 6.1 Scenario: Database Failure

**Detection:** Health check `/api/health/db` returns non-200 status. Application logs show connection errors.

**Recovery Procedure:**

1. **Assess scope:** Determine if the failure is a connection issue, replica failure, or complete cluster loss.
2. **Connection issue:** Verify network connectivity; check TiDB Cloud status page; restart application server to reset connection pool.
3. **Replica failure:** TiDB Cloud handles automatic failover to healthy replicas. Monitor recovery via TiDB Cloud dashboard. Expected recovery: under 30 seconds.
4. **Complete cluster loss:** Initiate PITR recovery via TiDB Cloud console. Target the most recent available restore point. Estimated recovery time: 30-60 minutes depending on data volume.
5. **Post-recovery:** Run `pnpm db:push` to verify schema integrity. Execute the full test suite. Review audit logs for any data gaps during the outage window.

### 6.2 Scenario: Application Server Failure

**Detection:** Health check `/api/health` returns non-200 status or connection timeout.

**Recovery Procedure:**

1. **Assess scope:** Check Manus Cloud deployment status. Determine if the failure is isolated or platform-wide.
2. **Single instance failure:** Manus Cloud automatically restarts failed instances. Monitor via dashboard.
3. **Deployment failure:** Roll back to the last known-good checkpoint using `webdev_rollback_checkpoint`. Verify health endpoints.
4. **Platform-wide outage:** Escalate to Manus Cloud support. Activate communication templates from the Incident Response Plan.
5. **Post-recovery:** Verify all health endpoints return 200. Check that agent scheduler resumes. Verify SSE connections re-establish.

### 6.3 Scenario: File Storage (S3) Failure

**Detection:** File upload/download operations fail. Health check shows S3 connectivity issues.

**Recovery Procedure:**

1. **Assess scope:** Check AWS S3 status page. Determine if the issue is regional or service-wide.
2. **Regional outage:** If cross-region replication is active, switch to secondary region. Update S3 endpoint configuration.
3. **Service-wide outage:** Enable graceful degradation — application continues to function without file access. Display user-facing message indicating temporary file unavailability.
4. **Data loss:** Restore from S3 versioning (90-day retention) or cross-region replica.
5. **Post-recovery:** Verify file integrity by comparing S3 inventory against database file metadata records.

### 6.4 Scenario: AI/LLM Service Failure

**Detection:** Health check `/api/health/ai` returns non-200 status. Agent scheduler logs show LLM invocation failures.

**Recovery Procedure:**

1. **Graceful degradation:** AI agents automatically pause when LLM calls fail. The platform continues to operate without AI features.
2. **User notification:** Display banner indicating "AI features temporarily unavailable."
3. **Manual override:** Operators can manually perform actions that agents would normally handle (draft communications, update task statuses).
4. **Service restoration:** When LLM service recovers, agents resume on the next scheduler cycle. No data loss occurs because agent state is persisted in the database.

### 6.5 Scenario: Complete Platform Loss

**Detection:** All services unreachable. Manus Cloud infrastructure unavailable.

**Recovery Procedure:**

1. **Activate BCP team:** Notify all stakeholders per the Incident Response Plan escalation matrix.
2. **Assess timeline:** Coordinate with Manus Cloud for estimated restoration time.
3. **If RTO exceeded:** Initiate deployment to alternative infrastructure.
   - Clone repository from GitHub
   - Provision new TiDB Cloud cluster and restore from latest backup
   - Configure environment variables and secrets
   - Deploy application and verify health endpoints
   - Update DNS records to point to new infrastructure
4. **Estimated time for full alternative deployment:** 4-8 hours depending on database size and DNS propagation.

---

## 7. Communication During Disruptions

| Audience | Channel | Timing | Template |
|----------|---------|--------|----------|
| Internal team | Slack / email | Immediately upon detection | IRP internal escalation template |
| Affected tenants | Email + portal banner | Within 1 hour for P1, 4 hours for P2 | IRP tenant notification template |
| All tenants | Status page update | Within 30 minutes | Status page incident template |
| Regulatory bodies | Formal notification | Per jurisdiction requirements (see IRP Section 7) | IRP regulatory notification template |

---

## 8. Testing and Validation

| Test Type | Frequency | Scope | Owner |
|-----------|-----------|-------|-------|
| **Backup restoration test** | Monthly | Restore database from backup to test environment; verify data integrity | Engineering Lead |
| **Failover drill** | Quarterly | Simulate database replica failure; verify automatic failover | Technical Lead |
| **Full DR simulation** | Annually | Complete platform recovery from backups on alternative infrastructure | IC + Full team |
| **Tabletop exercise** | Quarterly | Walk through disaster scenarios with decision-makers | IC + Communications Lead |
| **Communication test** | Semi-annually | Send test notifications through all channels; verify delivery | Communications Lead |

---

## 9. Plan Maintenance

This plan must be updated under the following circumstances:

1. After any P1 or P2 incident (within 10 business days of post-incident review).
2. When new sub-processors are added or existing ones change.
3. When infrastructure architecture changes significantly.
4. When new regulatory requirements are identified.
5. At minimum semi-annually, regardless of incidents.

The plan owner (CTO / Engineering Lead) is responsible for ensuring updates are made and distributed to all relevant parties.

---

## 10. Appendix: Recovery Runbook Quick Reference

| Scenario | First Action | Key Command / Tool | Expected Recovery Time |
|----------|-------------|-------------------|----------------------|
| DB connection failure | Check TiDB Cloud status | Restart app server | 5-15 minutes |
| DB replica failure | Monitor TiDB dashboard | Automatic failover | Under 30 seconds |
| DB cluster loss | Initiate PITR | TiDB Cloud console | 30-60 minutes |
| App server crash | Check Manus Cloud | Automatic restart | 2-5 minutes |
| Bad deployment | Rollback checkpoint | `webdev_rollback_checkpoint` | 5-10 minutes |
| S3 regional outage | Check AWS status | Switch to secondary region | 15-30 minutes |
| LLM service down | Agents auto-pause | No action needed | Automatic on recovery |
| Complete platform loss | Activate BCP team | Full redeployment | 4-8 hours |

---

*This document is a living artifact. It must be reviewed semi-annually and after every P1 incident.*
