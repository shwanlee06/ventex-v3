# Regulatory Questions for Outside Counsel

**Document Owner:** Aurovia LLC
**Product:** VENTEX — Velocity AI for Venture Holdings
**Date:** April 16, 2026
**Classification:** Attorney-Client Privileged — Do Not Distribute
**Purpose:** Structured analysis framework for regulatory counsel to determine VENTEX's regulatory classification and compliance obligations across all operating jurisdictions.

---

## 1. Regulatory Classification

### 1.1 Technology Vendor vs. Investment Adviser

VENTEX provides operational software to venture holding firms, family offices, and institutional investors. The platform includes AI-powered agents that generate operational suggestions (task prioritization, distribution schedule monitoring, document classification). The core question is whether any feature, individually or in combination, crosses the line from technology vendor to investment adviser under the Investment Advisers Act of 1940.

**Questions for Counsel:**

1. Does the VENTEX platform, as currently architected, constitute an "investment adviser" under Section 202(a)(11) of the Investment Advisers Act of 1940? Specifically, do the AI agents' operational suggestions constitute "advice" regarding "securities" for "compensation"?

2. If the platform is currently a technology vendor, what specific features or changes would cause it to cross the threshold into investment adviser territory? Please provide a bright-line analysis for each of the following features:
   - AI-generated stage advancement recommendations for venture investments
   - AI-generated distribution schedule monitoring and alerting
   - AI-generated document intelligence that classifies legal documents and extracts financial terms
   - AI-generated "velocity scores" that rank ventures by operational health

3. Does the "Operational Suggestion" labeling (as opposed to "Recommendation") provide meaningful regulatory distinction? What additional disclaimers or architectural controls would strengthen this distinction?

4. If VENTEX were to add portfolio analytics features (IRR calculations, benchmark comparisons, allocation suggestions), would this trigger RIA registration requirements?

### 1.2 Broker-Dealer Analysis

5. Do any VENTEX features constitute "effecting transactions in securities" under Section 3(a)(4) of the Securities Exchange Act of 1934? Specifically:
   - Distribution tracking and notification features
   - Capital call tracking features (if added)
   - SPV deal pipeline management

6. Does the platform's role in facilitating communication between venture holding operators and their limited partners constitute broker-dealer activity, even if no transactions are executed through the platform?

---

## 2. Custody Analysis

### 2.1 Advisers Act Rule 206(4)-2

7. Do any VENTEX features trigger "custody" under Rule 206(4)-2 of the Advisers Act? Specifically:
   - Distribution tracking: the platform records distribution amounts, dates, and recipients. It does not initiate, authorize, or process any fund transfers. Does displaying distribution data constitute custody?
   - Capital call tracking (if added): same question — display-only vs. custody implications.
   - Document storage: the platform stores legal documents (operating agreements, subscription agreements). Does storing these documents constitute custody of client assets?

8. What architectural controls should VENTEX implement to ensure it never triggers custody requirements? Please provide specific technical recommendations (e.g., "never store bank account numbers," "never generate wire instructions," "never display account balances from external sources").

9. If a client uses VENTEX to track distributions and then separately instructs their bank to make the distribution, does VENTEX's involvement in the tracking step create any custody risk?

---

## 3. Money Movement

### 3.1 Current Architecture

VENTEX currently does **not** move funds. The platform tracks distribution amounts, dates, and statuses as data entries. No bank accounts are connected. No payment rails are integrated. No wire instructions are generated or transmitted.

10. Is the current architecture (display-only, no fund movement) sufficient to avoid money transmitter licensing requirements under FinCEN regulations and state money transmitter laws?

11. If VENTEX were to add a "one-click distribution" feature that generates pre-filled wire instructions (but does not execute them), would this trigger money transmitter requirements?

12. If VENTEX were to integrate with a payment processor (e.g., Stripe, Dwolla, or a bank API) to enable actual fund movement, what licenses would be required? Please analyze:
    - Federal: FinCEN MSB registration
    - State: money transmitter licenses (all 50 states + DC)
    - Alternatives: partnership with a licensed money transmitter or bank

13. What disclaimers and architectural separations should VENTEX maintain to clearly delineate "data display" from "fund movement"?

**`[LEGAL REVIEW REQUIRED]`** — The `enables_money_movement` feature flag is currently set to OFF in the codebase. It must not be enabled without written legal clearance.

---

## 4. Securities Communications

### 4.1 AI-Generated Communications

14. Do AI-generated LP notices (e.g., "Distribution of $X scheduled for [date]") constitute "communications with the public" under FINRA Rule 2210?

15. Do AI-generated distribution communications constitute "advertisements" or "solicitations" under SEC Rule 206(4)-1 (the Marketing Rule)?

16. If VENTEX generates a draft email to limited partners regarding a distribution, and a human operator reviews and sends it, does the AI involvement change the regulatory classification of the communication?

17. What disclaimers must accompany AI-generated communications to limited partners? Should the AI involvement be disclosed?

18. Does the platform's role in generating and facilitating LP communications require VENTEX or its clients to register as a broker-dealer or investment adviser?

**`[LEGAL REVIEW REQUIRED]`** — The `enables_securities_communications` feature flag is currently set to OFF in the codebase. It must not be enabled without written legal clearance.

---

## 5. Cross-Border Regulatory Analysis

### 5.1 United Kingdom (FCA)

19. If VENTEX serves UK-based family offices or venture holding firms, does the platform require FCA authorization? Under which regulatory perimeter (e.g., MiFID II, AIFMD, financial promotion rules)?

20. Do AI-generated operational suggestions constitute "regulated advice" under UK financial services law?

### 5.2 Switzerland (FINMA)

21. Does VENTEX require a FINMA license to serve Swiss family offices? What exemptions apply (e.g., technology vendor exemption, intra-group exemption)?

### 5.3 Singapore (MAS)

22. Does VENTEX require a Capital Markets Services license under the Securities and Futures Act to serve Singapore-based clients?

23. Does the platform's AI functionality trigger any obligations under the MAS FEAT principles (Fairness, Ethics, Accountability, Transparency)?

### 5.4 UAE (ADGM / DIFC)

24. Does VENTEX require registration with the ADGM Financial Services Regulatory Authority or the DIFC's DFSA to serve UAE-based clients?

25. Do UAE data localization requirements affect VENTEX's architecture for UAE-based tenants?

### 5.5 General Cross-Border

26. For each jurisdiction where VENTEX has clients, what is the minimum regulatory footprint required? Please provide a matrix of: jurisdiction, applicable regulator, license/registration required (if any), exemptions available, and estimated timeline/cost.

---

## 6. Data Protection and Privacy

### 6.1 GDPR Controller vs. Processor

27. In the VENTEX-client relationship, is Aurovia LLC a data controller or data processor under GDPR? Please analyze for each data category:
    - Client employee data (names, emails, roles)
    - Investor/LP data (names, distribution amounts)
    - Document content (uploaded files, extracted text)
    - AI-generated outputs (suggestions, drafts)
    - Usage data (login timestamps, feature usage)

28. If Aurovia LLC is a processor, is the current Data Processing Agreement template adequate? What provisions should be added or modified?

29. For tenants subject to GDPR, what data subject rights must VENTEX support (access, rectification, erasure, portability, restriction, objection)? What is the technical implementation timeline for each?

### 6.2 US State Privacy Laws

30. What obligations does VENTEX have under the California Consumer Privacy Act (CCPA/CPRA), Virginia Consumer Data Protection Act (VCDPA), Colorado Privacy Act (CPA), and other state privacy laws?

---

## 7. AI-Specific Regulation

### 7.1 US State AI Laws

31. Does VENTEX's AI functionality trigger obligations under the Colorado AI Act (SB 21-169)? Specifically, is VENTEX a "developer" or "deployer" of a "high-risk AI system"?

32. If VENTEX serves New York City-based clients, does the NYC Automated Employment Decision Tool (AEDT) law apply to any VENTEX feature?

### 7.2 EU AI Act

33. Under the EU AI Act risk classification framework, what risk category do VENTEX's AI agents fall into? Specifically:
    - Velocity Agent (task prioritization and operational suggestions)
    - Distribution Sentinel (distribution monitoring and alerting)
    - Document Intelligence (document classification and entity extraction)
    - Proactive Task Generator (automated task creation)

34. If any agent is classified as "high-risk," what compliance obligations apply (risk management system, data governance, technical documentation, transparency, human oversight, accuracy/robustness)?

35. What AI transparency obligations apply to VENTEX under the EU AI Act? Must the platform disclose to end users that AI is generating content?

---

## 8. Requested Deliverables from Counsel

We request the following deliverables from this engagement:

1. **Regulatory Classification Memo** — Written opinion on VENTEX's regulatory status (technology vendor vs. investment adviser vs. broker-dealer) with specific feature-by-feature analysis.

2. **Custody Analysis Memo** — Written opinion on custody implications with specific architectural recommendations.

3. **Cross-Border Matrix** — Jurisdiction-by-jurisdiction analysis of regulatory requirements.

4. **AI Compliance Memo** — Analysis of AI-specific regulatory obligations (EU AI Act, Colorado AI Act, NYC AEDT).

5. **Feature Flag Clearance** — Written clearance (or denial with conditions) for enabling the `enables_money_movement` and `enables_securities_communications` feature flags.

6. **DPA Review** — Review and markup of the Data Processing Agreement template.

7. **Disclaimer Language** — Approved disclaimer language for AI-generated outputs, distribution communications, and platform marketing materials.

---

**`[LEGAL REVIEW REQUIRED]`** — This entire document is designed to be sent to outside counsel. No regulatory conclusions should be drawn from the questions themselves. Aurovia LLC does not claim to have answered any of these questions and explicitly defers to qualified legal counsel for all regulatory determinations.
