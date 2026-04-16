# VENTEX — Cyber Liability Insurance Requirements

**Prepared by:** aurovia LLC Engineering  
**Date:** April 16, 2026  
**Classification:** Confidential — Internal Use Only  
**Version:** 1.0

---

## 1. Purpose

This document specifies the cyber liability insurance coverage requirements for aurovia LLC in connection with the operation of the VENTEX platform. It is intended to guide insurance procurement discussions with brokers and underwriters, and to satisfy due diligence inquiries from institutional limited partners (LPs) and enterprise clients.

aurovia LLC operates VENTEX as a multi-tenant venture holding operations platform that processes financial data, investor communications, and AI-generated outputs on behalf of its clients. The nature of this data and the regulatory environment in which the platform operates necessitate comprehensive cyber liability coverage.

---

## 2. Coverage Requirements

### 2.1 First-Party Coverage

First-party coverage protects aurovia LLC against direct losses arising from cyber incidents.

| Coverage Area | Minimum Limit | Rationale |
|--------------|--------------|-----------|
| **Data breach response costs** | $2,000,000 per occurrence | Covers forensic investigation, legal counsel, notification costs, credit monitoring for affected individuals, and public relations |
| **Business interruption** | $1,000,000 per occurrence | Covers lost revenue and extra expense during platform outage. Based on estimated daily revenue impact and maximum RTO of 4 hours for Tier 1 services |
| **Data recovery and restoration** | $500,000 per occurrence | Covers costs to restore data from backups, rebuild systems, and verify data integrity after an incident |
| **Cyber extortion / ransomware** | $1,000,000 per occurrence | Covers ransom payments (where legal), negotiation costs, and associated forensic expenses |
| **Reputational harm** | $500,000 per occurrence | Covers crisis management, public relations, and client retention efforts following a publicized incident |

### 2.2 Third-Party Coverage

Third-party coverage protects against claims from clients, partners, and regulatory bodies.

| Coverage Area | Minimum Limit | Rationale |
|--------------|--------------|-----------|
| **Privacy liability** | $3,000,000 per occurrence | Covers claims arising from unauthorized disclosure of personal data, including GDPR fines and penalties |
| **Network security liability** | $2,000,000 per occurrence | Covers claims arising from security failures that affect third parties (e.g., tenant data breach, malware propagation) |
| **Media liability** | $500,000 per occurrence | Covers claims arising from AI-generated content that causes harm (defamation, IP infringement) |
| **Regulatory defense and penalties** | $2,000,000 per occurrence | Covers legal defense costs and regulatory fines/penalties from data protection authorities |
| **Technology errors and omissions** | $2,000,000 per occurrence | Covers claims arising from platform failures, incorrect AI outputs, or service delivery failures |

### 2.3 Aggregate Limits

| Limit Type | Amount |
|-----------|--------|
| Per-occurrence limit | As specified per coverage area above |
| Annual aggregate limit | $5,000,000 minimum |
| Deductible / retention | $25,000 - $50,000 per occurrence (negotiable based on premium) |

---

## 3. Special Considerations

### 3.1 AI-Specific Coverage

VENTEX employs AI agents that generate communications, financial analyses, and operational recommendations. The insurance policy must explicitly cover:

1. **AI output liability** — Claims arising from AI-generated content that is inaccurate, misleading, or causes financial harm to clients or their investors.
2. **Algorithmic discrimination** — Claims that AI outputs exhibit bias in venture assessment, distribution calculations, or client communications.
3. **Unauthorized AI actions** — Claims arising from AI agents taking actions without proper human approval (mitigated by the human-in-the-loop approval system but coverage is still required).

The policy must not contain exclusions for "artificial intelligence," "machine learning," "automated decision-making," or similar terms that would void coverage for AI-related incidents.

### 3.2 Multi-Tenant Considerations

The policy must cover incidents that affect multiple tenants simultaneously, including:

1. **Tenant isolation failures** — A breach in one tenant's data that exposes another tenant's information.
2. **Cascading failures** — A single vulnerability that is exploited across multiple tenants.
3. **Aggregate notification costs** — The cost of notifying all affected tenants and their downstream stakeholders.

### 3.3 Cross-Border Coverage

VENTEX serves clients in multiple jurisdictions. The policy must provide:

1. **Worldwide coverage** with specific endorsements for EU (GDPR), UK (UK GDPR), UAE (PDPL), and Cayman Islands operations.
2. **Multi-jurisdictional regulatory defense** covering simultaneous investigations by multiple data protection authorities.
3. **Currency flexibility** for claims and settlements in non-USD currencies.

### 3.4 Financial Data Sensitivity

Given that VENTEX processes financial distribution data, SPV structures, and investor communications:

1. The policy must not exclude "financial data" or "investment information" from the definition of covered data.
2. Coverage must extend to claims arising from incorrect financial calculations or distribution errors facilitated by the platform.
3. The policy should cover regulatory actions by financial regulators (SEC, CIMA, DFSA) in addition to data protection authorities.

---

## 4. Underwriting Information

The following information should be provided to underwriters to support the application:

### 4.1 Security Controls Summary

| Control Category | Implementation Status |
|-----------------|---------------------|
| Multi-factor authentication | Active (TOTP), enforceable per organization |
| Encryption at rest | Active (TiDB transparent encryption, S3 SSE) |
| Encryption in transit | Active (TLS 1.2+, HSTS with preload) |
| Access controls (RBAC) | Active (7 roles, tenant isolation verified) |
| Audit logging | Active (comprehensive audit trail) |
| Incident response plan | Documented and tested |
| Business continuity plan | Documented with defined RPO/RTO |
| Penetration testing | Readiness report complete; third-party test planned |
| Vulnerability management | Automated security scanning in CI/CD |
| Employee security training | Planned (quarterly cadence) |
| Data backup and recovery | Active (PITR, daily snapshots, monthly archives) |

### 4.2 Risk Profile

| Factor | Assessment |
|--------|-----------|
| Annual revenue | Pre-revenue (pre-seed stage) |
| Number of tenants | Early stage (under 10 active tenants) |
| Data volume | Moderate (financial records, documents, communications) |
| Geographic exposure | US primary, with EU, UK, UAE, Cayman Islands clients |
| Prior incidents | None |
| Regulatory environment | Moderate complexity (multi-jurisdictional) |

---

## 5. Policy Selection Criteria

When evaluating insurance proposals, prioritize the following:

1. **No AI exclusions** — The policy must not exclude AI-related claims.
2. **Retroactive date** — Coverage should include a retroactive date from the platform's launch.
3. **Duty to defend** — The insurer should have a duty to defend (not just indemnify) against claims.
4. **Choice of counsel** — aurovia LLC should have the right to select legal counsel for regulatory proceedings.
5. **Tail coverage** — Extended reporting period of at least 3 years should be available.
6. **Sublimit adequacy** — Sublimits for individual coverage areas should be sufficient (not just the aggregate).
7. **Claim notification period** — At least 90 days after policy expiration to report claims.

---

## 6. Recommended Carriers

The following carriers are known to offer technology-focused cyber liability policies suitable for SaaS/fintech platforms:

| Carrier | Specialty | Notes |
|---------|----------|-------|
| Coalition | Tech-focused cyber | Strong AI coverage, proactive risk monitoring |
| Corvus Insurance | AI-enhanced underwriting | Good fit for AI-heavy platforms |
| At-Bay | Cybersecurity-focused | Includes security assessment as part of policy |
| Hartford Steam Boiler (Munich Re) | Technology E&O + Cyber | Strong regulatory defense coverage |
| Beazley | Specialty cyber | Established breach response team |

---

## 7. Annual Review

This requirements document should be reviewed annually or when:

1. Annual revenue exceeds $1M (increase aggregate limits).
2. Tenant count exceeds 50 (increase per-occurrence limits).
3. New jurisdictions are added (update cross-border endorsements).
4. Regulatory landscape changes materially.
5. A claim or incident occurs.

---

*This document is for internal planning purposes and should be shared with the insurance broker to guide policy procurement. It does not constitute legal advice.*
