# VENTEX — Indemnification Clause Templates

**Prepared by:** aurovia LLC Engineering  
**Date:** April 16, 2026  
**Classification:** Confidential — For Legal Review  
**Version:** 1.0 (DRAFT — Requires Outside Counsel Review)

---

## 1. Purpose

This document provides template indemnification clauses for inclusion in VENTEX client agreements, data processing agreements (DPAs), and sub-processor contracts. These templates are designed to allocate risk appropriately between aurovia LLC and its counterparties, consistent with the platform's security posture and insurance coverage.

**All clauses in this document are drafts and must be reviewed by qualified legal counsel before inclusion in any binding agreement.**

---

## 2. Client Agreement Indemnification

### 2.1 aurovia LLC Indemnification of Client

> **Indemnification by Service Provider.** aurovia LLC ("Provider") shall indemnify, defend, and hold harmless Client and its officers, directors, employees, and agents ("Client Indemnitees") from and against any third-party claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys' fees) ("Losses") arising out of or relating to:
>
> (a) Provider's material breach of its data protection obligations under this Agreement or the applicable Data Processing Agreement;
>
> (b) Provider's gross negligence or willful misconduct in the operation of the VENTEX platform;
>
> (c) Any unauthorized access to or disclosure of Client Data that results directly from a security vulnerability in the VENTEX platform, provided that Client has complied with its security obligations under this Agreement (including but not limited to maintaining strong authentication credentials and promptly reporting suspected security incidents);
>
> (d) Any infringement of a third party's intellectual property rights by the VENTEX platform (excluding Client Data and Client-provided content).
>
> **Exclusions.** Provider's indemnification obligations shall not apply to Losses arising from: (i) Client's breach of this Agreement; (ii) Client's use of the platform in violation of applicable law; (iii) Client Data that infringes third-party rights; (iv) modifications to the platform made by Client or at Client's specific direction; or (v) Client's failure to implement security recommendations provided by Provider.

### 2.2 Client Indemnification of aurovia LLC

> **Indemnification by Client.** Client shall indemnify, defend, and hold harmless Provider and its officers, directors, employees, and agents ("Provider Indemnitees") from and against any Losses arising out of or relating to:
>
> (a) Client's breach of its representations, warranties, or obligations under this Agreement;
>
> (b) Client Data that infringes or misappropriates any third party's intellectual property rights, privacy rights, or other legal rights;
>
> (c) Client's use of the VENTEX platform in violation of applicable law, regulation, or industry standard;
>
> (d) Any claims by Client's investors, limited partners, or other stakeholders arising from Client's business decisions, even if informed by data or analysis provided through the VENTEX platform.

---

## 3. AI Output Indemnification

Given that VENTEX employs AI agents that generate communications and analyses, specific indemnification provisions are required.

### 3.1 AI Output Disclaimer and Limitation

> **AI-Generated Content.** Client acknowledges that certain features of the VENTEX platform utilize artificial intelligence to generate draft communications, analyses, and recommendations ("AI Outputs"). All AI Outputs are provided for informational purposes only and are subject to human review and approval before dissemination.
>
> Provider shall not be liable for any Losses arising from Client's reliance on AI Outputs without independent verification, or from Client's decision to send, publish, or act upon AI Outputs without the human review required by the platform's approval workflow.
>
> Provider's indemnification obligations under Section 2.1 shall apply to AI Outputs only to the extent that: (a) the AI Output was approved through the platform's human-in-the-loop approval process; and (b) the Loss results from a defect in the AI system itself (rather than from the underlying data provided by Client or the judgment exercised by the human reviewer).

### 3.2 AI Bias and Discrimination

> **Non-Discrimination.** Provider shall use commercially reasonable efforts to ensure that AI Outputs do not exhibit unlawful bias or discrimination. In the event that an AI Output is found to contain discriminatory content that violates applicable law, Provider shall: (a) promptly remediate the underlying model or algorithm; (b) notify affected Client(s); and (c) indemnify Client against third-party claims arising directly from such discriminatory AI Output, subject to the limitations set forth in this Agreement.

---

## 4. Data Processing Agreement Indemnification

These clauses supplement the DPA template in `docs/legal/dpa-template.md`.

### 4.1 Data Breach Indemnification

> **Data Breach Indemnification.** In the event of a Personal Data Breach (as defined in the DPA) caused by Provider's failure to implement the security measures described in the DPA, Provider shall indemnify Client against:
>
> (a) Reasonable costs of notifying affected data subjects, as required by applicable data protection law;
>
> (b) Reasonable costs of providing credit monitoring or identity protection services to affected data subjects, for a period not to exceed twelve (12) months;
>
> (c) Regulatory fines or penalties imposed on Client by a supervisory authority, to the extent directly attributable to Provider's breach of its DPA obligations;
>
> (d) Reasonable legal fees incurred by Client in responding to regulatory investigations arising from the breach.
>
> **Limitation.** Provider's aggregate liability under this Section shall not exceed the greater of: (i) the fees paid by Client to Provider in the twelve (12) months preceding the breach; or (ii) the applicable per-occurrence limit of Provider's cyber liability insurance policy.

### 4.2 Sub-Processor Indemnification

> **Sub-Processor Liability.** Provider shall be liable for the acts and omissions of its sub-processors to the same extent as if Provider had performed the processing directly. Provider shall ensure that each sub-processor agreement includes indemnification obligations that are no less protective of Client's interests than those set forth in this DPA.
>
> Provider maintains a current list of sub-processors at `docs/security/sub-processors.md` and shall notify Client of any changes in accordance with the DPA.

---

## 5. Liability Caps

### 5.1 General Liability Cap

> **Limitation of Liability.** Except for each party's indemnification obligations, either party's breach of confidentiality obligations, or Provider's breach of data protection obligations, neither party's aggregate liability under this Agreement shall exceed the total fees paid or payable by Client to Provider in the twelve (12) months preceding the event giving rise to the claim.

### 5.2 Enhanced Liability Cap for Data Protection

> **Enhanced Cap for Data Protection.** For claims arising from Provider's breach of its data protection obligations (including data breach indemnification under Section 4.1), Provider's aggregate liability shall not exceed the greater of: (i) two (2) times the total fees paid or payable by Client to Provider in the twelve (12) months preceding the event; or (ii) $1,000,000.

### 5.3 Exclusion of Consequential Damages

> **Exclusion of Consequential Damages.** Except for each party's indemnification obligations and Provider's breach of data protection obligations, neither party shall be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, revenue, data, or business opportunity, regardless of the theory of liability.

---

## 6. Indemnification Procedures

> **Indemnification Procedures.** The indemnified party shall: (a) promptly notify the indemnifying party in writing of any claim for which indemnification is sought (provided that failure to provide prompt notice shall not relieve the indemnifying party of its obligations except to the extent materially prejudiced); (b) grant the indemnifying party sole control of the defense and settlement of such claim (provided that the indemnifying party shall not settle any claim that imposes obligations on the indemnified party without the indemnified party's prior written consent); and (c) provide reasonable cooperation and assistance to the indemnifying party in the defense of such claim, at the indemnifying party's expense.

---

## 7. Insurance Backing

> **Insurance.** Provider shall maintain cyber liability insurance with coverage limits of not less than $5,000,000 in the annual aggregate, covering the indemnification obligations set forth in this Agreement. Provider shall provide Client with a certificate of insurance upon request and shall notify Client of any material change in coverage within thirty (30) days.

---

## 8. Review Notes for Outside Counsel

The following items require specific legal review before these templates are used in binding agreements:

1. **Liability cap amounts** — The $1,000,000 enhanced cap and 2x fee multiplier should be calibrated to actual contract values and insurance coverage.
2. **AI output indemnification scope** — The carve-out for human-approved AI outputs needs to be tested against the platform's actual approval workflow to ensure it provides adequate protection.
3. **Regulatory fine coverage** — Some jurisdictions prohibit indemnification for regulatory fines. Confirm applicability in each target jurisdiction (US, EU, UK, UAE, Cayman Islands).
4. **Sub-processor liability flow-down** — Verify that current sub-processor agreements (TiDB Cloud, AWS, Resend, Manus Cloud) contain adequate indemnification provisions.
5. **Consequential damages carve-out** — The exception for data protection breaches may be too broad. Consider whether to cap consequential damages for data protection claims separately.
6. **Choice of law and jurisdiction** — These templates do not specify governing law. Each agreement should specify the applicable jurisdiction.

---

*These templates are provided as starting points for legal drafting. They do not constitute legal advice and must be reviewed and customized by qualified legal counsel before use in any binding agreement.*
