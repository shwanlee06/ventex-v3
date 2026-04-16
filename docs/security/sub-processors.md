# Sub-Processor Register

**Document Owner:** Aurovia LLC
**Product:** VENTEX — Velocity AI for Venture Holdings
**Last Updated:** April 16, 2026
**Review Cadence:** Quarterly, or upon addition/removal of any sub-processor
**Classification:** Confidential — Share with Clients Under NDA

---

## 1. Overview

This document enumerates every third-party sub-processor that processes, stores, or transmits Client Data on behalf of Aurovia LLC in the operation of the VENTEX platform. "Client Data" includes venture records, SPV details, distribution data, task metadata, team member information, uploaded documents, AI-generated outputs, and audit logs.

Aurovia LLC maintains Data Processing Agreements (DPAs) with each sub-processor listed below. Clients are notified at least **30 calendar days** before any new sub-processor is engaged, in accordance with the VENTEX Master Services Agreement and applicable data protection regulations.

---

## 2. Sub-Processor List

| # | Vendor | Purpose | Data Categories Processed | Processing Location | DPA Status | Security Certifications |
|---|--------|---------|--------------------------|--------------------|-----------|-----------------------|
| 1 | **Manus (Manus AI Inc.)** | Application hosting, OAuth identity provider, deployment infrastructure | All Client Data (application layer) | United States (us-east-1) | In place | SOC 2 Type II (pending), ISO 27001 (planned) |
| 2 | **Amazon Web Services (AWS)** | Object storage (S3) for uploaded files, documents, and generated assets | Uploaded documents, images, file attachments | United States (us-east-1); EU (eu-west-1) available per tenant config | In place | SOC 2 Type II, ISO 27001, ISO 27017, ISO 27018, CSA STAR Level 2, FedRAMP |
| 3 | **TiDB Cloud (PingCAP)** | Managed MySQL-compatible database for all structured application data | Venture records, SPV data, tasks, distributions, team members, audit logs, agent events | United States; APAC available | In place | SOC 2 Type II, ISO 27001, HIPAA eligible |
| 4 | **Anthropic** | Large Language Model (LLM) inference for AI agent operations, document intelligence, and chat | Venture context, task descriptions, document text (extracted), user prompts | United States | In place | SOC 2 Type II, responsible AI commitments |
| 5 | **Resend (Resend Inc.)** | Transactional email delivery for notifications, distribution notices, and system alerts | Recipient email addresses, email subject lines, email body content | United States | In place | SOC 2 Type II |
| 6 | **OpenAI (Whisper API)** | Voice transcription for audio file processing | Audio file content, transcribed text | United States | In place | SOC 2 Type II, ISO 27001 |

---

## 3. Data Processing Principles

Each sub-processor engagement adheres to the following principles:

**Data Minimization.** Only the minimum data necessary for the sub-processor's stated purpose is transmitted. For example, Anthropic receives venture context and document text but never receives raw financial account numbers or Social Security numbers.

**Encryption in Transit.** All data transmitted to sub-processors uses TLS 1.2 or higher. No unencrypted channels are used.

**Encryption at Rest.** All sub-processors encrypt stored data at rest using AES-256 or equivalent. AWS S3 uses server-side encryption (SSE-S3). TiDB Cloud uses transparent data encryption (TDE).

**Access Controls.** Sub-processor access is limited to API keys and service accounts with least-privilege permissions. No sub-processor has interactive access to the VENTEX production environment.

**Retention.** Sub-processors retain data only for the duration necessary to perform their function. Anthropic and OpenAI do not retain prompt or completion data beyond the API request lifecycle per their enterprise agreements.

---

## 4. Cross-Border Transfer Mechanisms

For tenants subject to GDPR, Swiss FADP, or equivalent data protection regimes:

| Transfer Route | Legal Basis | Supplementary Measures |
|---------------|------------|----------------------|
| EU → US (Anthropic, Resend) | EU-US Data Privacy Framework (DPF) | TLS 1.2+, data minimization, no PII in prompts where avoidable |
| EU → US (Manus) | Standard Contractual Clauses (SCCs) Module 2 | Encryption in transit and at rest, access logging |
| EU → US (AWS) | EU-US DPF + SCCs | EU-region S3 bucket available; cross-border only when tenant selects US region |
| EU → US (TiDB) | SCCs Module 2 | EU-region instance available on request |

**`[CROSS-BORDER TRANSFER]` Flag:** When a tenant configured for EU data residency triggers an AI operation that routes through a US-based LLM endpoint, the system logs a `[CROSS-BORDER TRANSFER]` event and requires explicit tenant consent on first use. See `server/compliance.ts` for implementation.

---

## 5. Sub-Processor Change Notification Process

When Aurovia LLC intends to add a new sub-processor:

1. **30-Day Notice.** Tenant administrators receive an email notification at least 30 calendar days before the new sub-processor begins processing Client Data.
2. **Objection Window.** Tenants may object in writing within the 30-day period. Aurovia LLC will work with the tenant to address concerns or, if unresolvable, the tenant may terminate the affected services without penalty.
3. **Register Update.** This document is updated and the version history reflects the change.
4. **DPA Execution.** A DPA is executed with the new sub-processor before any Client Data is shared.

---

## 6. Version History

| Date | Change | Approved By |
|------|--------|------------|
| 2026-04-16 | Initial register created | Aurovia LLC Engineering |

---

**`[LEGAL REVIEW REQUIRED]`** — This document requires review by qualified legal counsel before distribution to clients. Cross-border transfer mechanisms and DPA adequacy assessments must be validated by a data protection specialist.
