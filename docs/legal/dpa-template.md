# Data Processing Agreement

**`[LEGAL REVIEW REQUIRED]`** — This template requires review and customization by qualified legal counsel before execution. It is provided as a starting framework and does not constitute legal advice.

---

## DATA PROCESSING AGREEMENT

**Between:**

**Controller:** ______________________________ ("Client")
Address: ______________________________
Contact: ______________________________

**Processor:** Aurovia LLC, doing business as VENTEX ("Processor")
Address: ______________________________
Contact: privacy@aurovia.com

**Effective Date:** ______________________________

---

## 1. DEFINITIONS

**1.1** "Applicable Data Protection Law" means all laws and regulations applicable to the processing of Personal Data under this Agreement, including but not limited to: the General Data Protection Regulation (EU) 2016/679 ("GDPR"), the Swiss Federal Act on Data Protection ("FADP"), the California Consumer Privacy Act ("CCPA"), and any successor legislation.

**1.2** "Client Data" means all data submitted to the VENTEX platform by or on behalf of the Client, including venture records, SPV details, distribution data, task metadata, team member information, uploaded documents, and any data derived therefrom.

**1.3** "Personal Data" means any information relating to an identified or identifiable natural person contained within Client Data.

**1.4** "Processing" means any operation performed on Personal Data, including collection, recording, organization, structuring, storage, adaptation, retrieval, consultation, use, disclosure, combination, restriction, erasure, or destruction.

**1.5** "Sub-Processor" means any third party engaged by the Processor to process Personal Data on behalf of the Client.

---

## 2. SCOPE AND PURPOSE OF PROCESSING

**2.1** The Processor shall process Personal Data solely for the purpose of providing the VENTEX platform services as described in the Master Services Agreement between the parties.

**2.2** Categories of Personal Data processed:

| Category | Examples | Lawful Basis |
|----------|----------|-------------|
| Contact information | Names, email addresses, phone numbers of team members and stakeholders | Legitimate interest / Contract performance |
| Professional information | Job titles, roles, organizational affiliations | Legitimate interest / Contract performance |
| Financial data | Distribution amounts, capital commitments, investment returns | Contract performance |
| Document content | Uploaded files, extracted text, AI-generated summaries | Contract performance |
| Usage data | Login timestamps, feature usage, audit trail entries | Legitimate interest |

**2.3** Categories of data subjects: Client employees, Client's portfolio company personnel, Client's investors and limited partners (as identified by Client), Client's advisors and service providers.

---

## 3. PROCESSOR OBLIGATIONS

**3.1 Instructions.** The Processor shall process Personal Data only on documented instructions from the Client, unless required by applicable law.

**3.2 Confidentiality.** The Processor shall ensure that persons authorized to process Personal Data have committed to confidentiality obligations.

**3.3 Security Measures.** The Processor shall implement appropriate technical and organizational measures, including:
- Encryption of data in transit (TLS 1.2+) and at rest (AES-256)
- Access controls with role-based permissions and multi-factor authentication
- Tenant isolation at the application and database level
- Regular security assessments and vulnerability scanning
- Incident detection and response capabilities
- Audit logging of all data access and modifications

**3.4 Sub-Processors.** The Processor shall not engage a new Sub-Processor without providing the Client with 30 days' prior written notice and an opportunity to object. The current list of Sub-Processors is maintained at `/docs/security/sub-processors.md` and is incorporated by reference.

**3.5 Data Subject Rights.** The Processor shall assist the Client in responding to data subject requests (access, rectification, erasure, portability, restriction, objection) within the timeframes required by Applicable Data Protection Law.

**3.6 Data Breach Notification.** The Processor shall notify the Client without undue delay (and in any event within 72 hours) upon becoming aware of a Personal Data breach. The notification shall include:
- Nature of the breach
- Categories and approximate number of data subjects affected
- Likely consequences
- Measures taken or proposed to address the breach

**3.7 Data Protection Impact Assessment.** The Processor shall provide reasonable assistance to the Client in conducting data protection impact assessments where required.

**3.8 Audit Rights.** The Client may audit the Processor's compliance with this Agreement, subject to reasonable notice and confidentiality obligations. The Processor shall make available all information necessary to demonstrate compliance.

---

## 4. DATA RESIDENCY AND CROSS-BORDER TRANSFERS

**4.1** The Client may select a data residency region (US, EU, or APAC) for their tenant. The Processor shall store and process Client Data in the selected region to the extent technically feasible.

**4.2** Where cross-border transfers are necessary (e.g., AI processing via US-based services for EU-resident tenants), the Processor shall:
- Rely on an adequate transfer mechanism (EU-US Data Privacy Framework, Standard Contractual Clauses, or equivalent)
- Log all cross-border transfers in the audit trail
- Obtain explicit tenant consent for AI-related cross-border transfers on first use

**4.3** The Standard Contractual Clauses (Commission Implementing Decision (EU) 2021/914) are incorporated by reference as Annex A to this Agreement where applicable.

---

## 5. DATA RETENTION AND DELETION

**5.1** Upon termination of the Master Services Agreement, the Processor shall:
- Provide the Client with a complete export of Client Data within 30 days
- Delete all Client Data within 90 days of the export, except as required by law
- Provide written certification of deletion upon request

**5.2** Audit logs shall be retained for 7 years in accordance with financial services regulatory requirements, unless the Client instructs otherwise in writing.

---

## 6. TERM AND TERMINATION

**6.1** This Agreement shall remain in effect for the duration of the Master Services Agreement.

**6.2** The obligations of the Processor regarding data security and confidentiality shall survive termination.

---

## 7. GOVERNING LAW

This Agreement shall be governed by ______________________________ `[SPECIFY JURISDICTION]`.

---

## SIGNATURES

**Controller:**
Name: ______________________________
Title: ______________________________
Date: ______________________________
Signature: ______________________________

**Processor (Aurovia LLC):**
Name: ______________________________
Title: ______________________________
Date: ______________________________
Signature: ______________________________

---

**`[LEGAL REVIEW REQUIRED]`** — This template must be reviewed by qualified legal counsel before use. Specific provisions may need to be adjusted based on the Client's jurisdiction, regulatory requirements, and the specific services being provided. Standard Contractual Clauses (Annex A) must be separately attached where applicable.
