# Incident Response Policy

**Royalton Venture Holding — ATLAS Platform**
**Document ID:** SOC2-IRP-002
**Version:** 1.0
**Effective Date:** April 8, 2026
**Owner:** Chief Information Security Officer (CISO)
**Classification:** Internal — Confidential

---

## 1. Purpose

This Incident Response Policy establishes procedures for identifying, reporting, assessing, responding to, and recovering from security incidents affecting the ATLAS platform. It ensures that incidents are handled consistently, minimizing impact on business operations and client data, in alignment with SOC 2 Trust Services Criteria CC7.3, CC7.4, and CC7.5.

## 2. Scope

This policy covers all security events and incidents involving the ATLAS platform, including but not limited to: unauthorized access attempts; data breaches or data loss; service disruptions or denial of service; malware or ransomware; insider threats; third-party vendor compromises; and misuse of platform resources.

## 3. Definitions

| Term | Definition |
|---|---|
| **Security Event** | Any observable occurrence relevant to information security (e.g., failed login attempt, rate limit trigger) |
| **Security Incident** | A security event that has been confirmed to compromise the confidentiality, integrity, or availability of information assets |
| **Data Breach** | A security incident involving unauthorized access to or disclosure of personal or confidential data |
| **Incident Commander** | The designated individual responsible for coordinating the incident response |

## 4. Incident Classification

Incidents are classified by severity to determine the appropriate response:

| Severity | Description | Response Time | Examples |
|---|---|---|---|
| **Critical (P1)** | Active data breach, complete service outage, or compromise of encryption keys | Immediate (< 1 hour) | Database breach, master key exposure, ransomware |
| **High (P2)** | Significant unauthorized access, partial service degradation, or vulnerability exploitation | < 4 hours | Unauthorized admin access, cross-tenant data leak, DDoS attack |
| **Medium (P3)** | Suspicious activity, failed attack attempts, or minor service issues | < 24 hours | Repeated MFA failures, rate limit exhaustion, suspicious API usage |
| **Low (P4)** | Informational events, policy violations, or minor anomalies | < 72 hours | Single failed login, expired session cleanup, minor configuration drift |

## 5. Incident Response Phases

### 5.1 Detection and Identification

Incidents may be detected through the following mechanisms: audit log analysis (anomalous patterns in `audit_log` table); rate limiting alerts (repeated rate limit violations); agent event monitoring (agent-generated security signals in `agent_events`); user reports (via support channels or platform notifications); automated monitoring (server health checks, dependency vulnerability scans); and third-party notifications (vendor security advisories).

### 5.2 Containment

Upon confirmation of an incident, the Incident Commander initiates containment measures appropriate to the severity. For Critical/High incidents, immediate actions include: revoking compromised sessions (via `sessions` table `isActive` flag); rotating affected API keys and encryption credentials; blocking suspicious IP addresses at the network level; disabling compromised user accounts; and isolating affected organization data.

### 5.3 Eradication

After containment, the root cause is identified and eliminated. This may involve: patching exploited vulnerabilities; removing unauthorized access vectors; resetting compromised credentials; updating security configurations; and deploying additional monitoring for the attack vector.

### 5.4 Recovery

Systems are restored to normal operation through: verifying the integrity of affected data; re-enabling services with enhanced monitoring; communicating with affected users and clients; and conducting post-recovery validation testing.

### 5.5 Post-Incident Review

Within 5 business days of incident resolution, a post-incident review is conducted to document: timeline of events; root cause analysis; effectiveness of the response; lessons learned; and recommended improvements to prevent recurrence.

## 6. Communication

### 6.1 Internal Communication

The Incident Commander coordinates all internal communications. Status updates are provided at regular intervals based on severity: P1 every 30 minutes, P2 every 2 hours, P3 daily, P4 as needed.

### 6.2 External Communication

Affected clients are notified within 72 hours of confirming a data breach, or sooner if required by applicable law. Notifications include: description of the incident; types of data affected; actions taken to contain and remediate; recommended actions for affected parties; and contact information for questions.

### 6.3 Regulatory Notification

If the incident involves personal data subject to data protection regulations (GDPR, CCPA, etc.), the appropriate supervisory authorities are notified within the legally required timeframe.

## 7. Roles and Responsibilities

| Role | Responsibilities |
|---|---|
| **CISO** | Overall accountability for incident response; approves external communications |
| **Incident Commander** | Coordinates response activities; manages communication; documents timeline |
| **Engineering Lead** | Technical investigation, containment, and remediation |
| **Platform Administrators** | Execute containment actions (session revocation, account lockout) |
| **Legal Counsel** | Advises on regulatory obligations and external communications |

## 8. Evidence Preservation

All incident-related evidence is preserved for a minimum of 365 days, including: audit log entries; system logs; network traffic captures; screenshots and forensic images; and communication records. Evidence is stored in a secure, tamper-evident manner separate from production systems.

## 9. Testing

This incident response plan is tested at least annually through tabletop exercises simulating various incident scenarios. Test results are documented and used to improve the plan.

## 10. Policy Review

This policy is reviewed annually or after any significant incident. Updates require approval from the CISO.

---

**Approval:**
- Prepared by: ATLAS Security Team
- Approved by: CISO, Royalton Venture Holding
- Next Review Date: April 8, 2027
