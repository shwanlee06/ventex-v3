# Vendor Management Policy

**Royalton Venture Holding — VENTEX Platform**
**Document ID:** SOC2-VMP-005
**Version:** 1.0
**Effective Date:** April 8, 2026
**Owner:** Chief Information Security Officer (CISO)
**Classification:** Internal — Confidential

---

## 1. Purpose

This Vendor Management Policy establishes the framework for evaluating, selecting, monitoring, and managing third-party vendors and service providers that support the VENTEX platform. It ensures that vendors meet the security, privacy, and compliance standards required to protect client data and maintain SOC 2 compliance, addressing Trust Services Criteria CC9.2 (risk assessment of third parties).

## 2. Scope

This policy applies to all third-party vendors, service providers, and subprocessors that: host, process, or store VENTEX platform data; provide infrastructure or platform services; supply software components or libraries integrated into the platform; or have access to confidential business or client information.

## 3. Current Vendor Inventory

The following vendors are currently integrated with the VENTEX platform:

| Vendor | Service | Data Access | Risk Tier | SOC 2 Status |
|---|---|---|---|---|
| **TiDB Cloud** | Database hosting (MySQL-compatible) | Full database access (encrypted) | Critical | SOC 2 Type II certified |
| **AWS S3** | File storage | Uploaded documents, images | Critical | SOC 2 Type II certified |
| **Manus Platform** | OAuth, LLM, built-in APIs | Authentication tokens, AI prompts/responses | Critical | Platform-managed |
| **Resend** | Transactional email delivery | Email addresses, notification content | High | SOC 2 Type II certified |
| **npm Registry** | Package distribution | Source code dependencies | Medium | N/A (public registry) |

## 4. Vendor Risk Classification

Vendors are classified into risk tiers based on their level of data access and criticality:

| Risk Tier | Criteria | Review Frequency | Requirements |
|---|---|---|---|
| **Critical** | Stores or processes confidential data; service outage causes platform failure | Quarterly | SOC 2 Type II report, encryption at rest/transit, incident notification SLA |
| **High** | Accesses confidential data in transit; significant business impact if unavailable | Semi-annually | SOC 2 Type II or equivalent, data processing agreement, security questionnaire |
| **Medium** | Limited data access; moderate business impact | Annually | Security documentation review, vulnerability disclosure policy |
| **Low** | No data access; minimal business impact | Biennially | Basic due diligence, terms of service review |

## 5. Vendor Selection

### 5.1 Due Diligence

Before engaging a new vendor, the following due diligence steps are required: review of the vendor's security certifications (SOC 2, ISO 27001, etc.); assessment of the vendor's data handling practices and privacy policy; evaluation of the vendor's incident response capabilities; review of the vendor's business continuity and disaster recovery plans; and verification of the vendor's financial stability and market reputation.

### 5.2 Contractual Requirements

Vendor contracts must include: data processing agreements specifying the types of data processed and permitted uses; confidentiality and non-disclosure obligations; security requirements aligned with the VENTEX Information Security Policy; incident notification requirements (within 72 hours of discovery); data return and deletion obligations upon contract termination; right to audit or request security assessments; and compliance with applicable data protection regulations.

### 5.3 Approval Process

New vendor engagements require approval from: the Engineering Lead (for technical suitability); the CISO (for security and compliance); and the business owner (for business justification and budget).

## 6. Ongoing Monitoring

### 6.1 Performance Monitoring

Vendor performance is monitored through: service level agreement (SLA) tracking; uptime and availability metrics; incident frequency and resolution times; and support responsiveness and quality.

### 6.2 Security Monitoring

Vendor security posture is monitored through: annual review of SOC 2 reports or equivalent certifications; monitoring of vendor security advisories and breach notifications; periodic review of vendor access logs and permissions; and assessment of vendor dependency vulnerabilities (via `pnpm audit`).

### 6.3 Dependency Management

Open-source dependencies are managed through: regular vulnerability scanning using `pnpm audit`; prompt patching of critical and high-severity vulnerabilities; documentation of unpatched transitive vulnerabilities with risk acceptance; and periodic review of dependency licenses for compliance.

## 7. Vendor Incidents

When a vendor reports a security incident that may affect VENTEX platform data: (1) the CISO is notified immediately; (2) the impact on VENTEX data is assessed; (3) containment measures are implemented (credential rotation, access revocation); (4) affected clients are notified per the Incident Response Policy; and (5) the incident is documented and reviewed for lessons learned.

## 8. Vendor Offboarding

When a vendor relationship is terminated: all vendor access to VENTEX systems and data is revoked; confirmation of data deletion is obtained from the vendor; API keys, credentials, and integration configurations are removed; and the vendor is removed from the approved vendor inventory.

## 9. Policy Review

This policy is reviewed annually or when significant changes occur in the vendor landscape, regulatory environment, or platform architecture.

---

**Approval:**
- Prepared by: VENTEX Security Team
- Approved by: CISO, Royalton Venture Holding
- Next Review Date: April 8, 2027
