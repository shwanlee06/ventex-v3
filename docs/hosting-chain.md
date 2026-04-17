# VENTEX — Hosting Architecture & SLA Chain

> Last updated: April 17, 2026
> Classification: Confidential — Share with Clients Under NDA
> Maintained by: Aurovia LLC Engineering

## Hosting Chain Overview

VENTEX operates on a multi-tier hosting architecture. Each tier has defined responsibilities, SLA commitments, and failover procedures.

```
Client Browser
    │
    ▼
┌─────────────────────────────────┐
│  Tier 1: CDN & Edge (Manus)    │  SSL termination, DDoS protection, static assets
│  SLA: 99.9% availability       │  Automatic failover across edge nodes
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│  Tier 2: Application (Manus)   │  Node.js runtime, tRPC API, AI agent orchestration
│  SLA: 99.5% uptime target      │  Auto-restart on crash, health check monitoring
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│  Tier 3: Database (TiDB Cloud) │  MySQL-compatible distributed SQL
│  SLA: 99.99% (TiDB Cloud SLA)  │  Multi-AZ replication, automated backups
└─────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│  Tier 4: Storage (AWS S3)      │  Document storage, file uploads
│  SLA: 99.99% (AWS S3 SLA)      │  11 nines durability, cross-region replication
└─────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│  Tier 5: AI Services (LLM API) │  Text analysis, signal processing, drafting
│  SLA: Best-effort              │  Graceful degradation if unavailable
└─────────────────────────────────┘
```

## Tier Details

### Tier 1: CDN & Edge

| Attribute | Value |
|-----------|-------|
| Provider | Manus Platform |
| Function | SSL termination, static asset serving, DDoS mitigation |
| SLA | 99.9% availability |
| Failover | Automatic edge node failover |
| Data processed | HTTP requests, static assets (no PII at this layer) |

### Tier 2: Application Server

| Attribute | Value |
|-----------|-------|
| Provider | Manus Platform (containerized Node.js) |
| Function | API server, business logic, AI agent orchestration |
| SLA | Targeting 99.5% uptime |
| Failover | Auto-restart on process crash, health check monitoring |
| Data processed | All business data (encrypted in transit via TLS 1.2+) |
| Scaling | Vertical scaling within container limits |

### Tier 3: Database

| Attribute | Value |
|-----------|-------|
| Provider | TiDB Cloud (PingCAP) |
| Function | Primary data store (MySQL-compatible distributed SQL) |
| SLA | 99.99% per TiDB Cloud Enterprise SLA |
| Failover | Multi-AZ replication with automatic failover |
| Backups | Automated daily backups with 30-day retention |
| Encryption | TDE (Transparent Data Encryption) at rest, TLS in transit |
| Data residency | Configurable per tenant (US, EU, APAC regions available) |

### Tier 4: File Storage

| Attribute | Value |
|-----------|-------|
| Provider | AWS S3 |
| Function | Document storage, file uploads, venture files |
| SLA | 99.99% availability, 99.999999999% durability |
| Encryption | Server-side encryption (AES-256 via AWS KMS) |
| Access control | Presigned URLs with 1-hour expiry for downloads |

### Tier 5: AI Services

| Attribute | Value |
|-----------|-------|
| Provider | LLM API (OpenAI-compatible endpoint) |
| Function | Text analysis, document drafting, signal processing |
| SLA | Best-effort (non-critical path) |
| Failover | Graceful degradation — platform remains fully functional without AI |
| Data handling | Minimum necessary context sent; no training on client data |

## Composite SLA

The effective platform SLA is determined by the weakest link in the critical path:

| Path | Components | Composite SLA |
|------|-----------|---------------|
| Core operations (CRUD, auth, navigation) | CDN + App + DB | 99.5% |
| Document access | CDN + App + DB + S3 | 99.5% |
| AI features | CDN + App + DB + LLM | Best-effort (degrades gracefully) |

**VENTEX commitment:** Targeting 99.5% uptime for core platform operations. AI features operate on a best-effort basis and degrade gracefully without affecting core functionality.

## Risk Mitigation

| Risk | Mitigation | Recovery Time |
|------|-----------|---------------|
| Manus platform outage | Migration guide prepared (see docs/migration-guide.md) | 1-3 weeks for full migration |
| Database failure | TiDB multi-AZ replication + daily backups | Automatic (< 30 seconds) |
| S3 outage | AWS multi-AZ redundancy | Automatic (< 1 minute) |
| LLM API outage | Graceful degradation — all non-AI features continue | Immediate (no recovery needed) |
| DNS failure | Multiple DNS providers, low TTL records | < 5 minutes |

## Monitoring & Alerting

- Application health checks: `/api/health`, `/api/health/db`, `/api/health/ai`
- Automated monitoring with alerts on degradation
- Incident response plan documented in `docs/security/incident-response-plan.md`
- Status page available at `/trust#status`

## Contact

For hosting architecture questions or SLA documentation requests:
- Email: security@aurovia.com
- Response time: Within 24 hours for enterprise inquiries
