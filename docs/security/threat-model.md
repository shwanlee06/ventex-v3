# VENTEX Platform — Threat Model (STRIDE)

**Version:** 1.0  
**Date:** April 2026  
**Methodology:** STRIDE (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege)

---

## 1. System Decomposition

The VENTEX platform consists of five trust boundaries:

1. **Public Internet → Web Application** — Unauthenticated users accessing the SPA and public endpoints
2. **Authenticated User → tRPC API** — Authenticated users making API calls with session cookies
3. **tRPC API → Database** — Server-side queries against TiDB
4. **tRPC API → External Services** — Server-side calls to OpenAI, S3, email providers
5. **IdP → SCIM/SAML Endpoints** — Enterprise identity providers provisioning users

---

## 2. STRIDE Analysis by Trust Boundary

### 2.1 Trust Boundary: Public Internet → Web Application

#### Spoofing

| Threat | Likelihood | Impact | Mitigation | Status |
|--------|-----------|--------|------------|--------|
| Session cookie theft via XSS | Medium | Critical | CSP `script-src 'self'`, HttpOnly cookies, React auto-escaping | Mitigated |
| OAuth state parameter forgery | Low | High | Cryptographic state parameter with HMAC validation | Mitigated |
| SAML assertion replay | Medium | Critical | Assertion timestamp validation, one-time-use enforcement | Partially mitigated |
| Credential stuffing on login | Medium | High | Rate limiting (5 attempts/min), MFA enforcement option | Mitigated |

#### Tampering

| Threat | Likelihood | Impact | Mitigation | Status |
|--------|-----------|--------|------------|--------|
| Man-in-the-middle on API calls | Low | Critical | HSTS with preload, TLS 1.2+ enforced | Mitigated |
| Client-side JavaScript tampering | Medium | Medium | Server-side validation on all inputs via Zod schemas | Mitigated |
| SAML response modification | Medium | Critical | XML signature verification (requires production IdP cert) | Partially mitigated |

#### Information Disclosure

| Threat | Likelihood | Impact | Mitigation | Status |
|--------|-----------|--------|------------|--------|
| Error message leaking stack traces | Low | Medium | Production error handler strips stack traces | Mitigated |
| Health endpoints revealing internals | Low | Low | Health endpoints return minimal status only | Mitigated |
| Organization enumeration via SSO URLs | Medium | Low | Org slugs are not secret; SSO login requires valid IdP config | Accepted risk |

### 2.2 Trust Boundary: Authenticated User → tRPC API

#### Spoofing

| Threat | Likelihood | Impact | Mitigation | Status |
|--------|-----------|--------|------------|--------|
| Session hijacking | Medium | Critical | Secure/HttpOnly/SameSite cookies, IP binding optional | Mitigated |
| API key theft | Medium | High | Keys hashed with SHA-256, shown once at creation | Mitigated |
| Impersonating another user | Low | Critical | Session tokens are cryptographically random, server-validated | Mitigated |

#### Tampering

| Threat | Likelihood | Impact | Mitigation | Status |
|--------|-----------|--------|------------|--------|
| Modifying another tenant's data | High | Critical | 37 TENANT_PATCHED guards across 9 router files | Mitigated |
| Bypassing role checks | Medium | Critical | Server-side RBAC on every procedure, defense-in-depth | Mitigated |
| Manipulating AI agent outputs | Medium | High | Human approval required, confidence scoring, disclaimers | Mitigated |

#### Repudiation

| Threat | Likelihood | Impact | Mitigation | Status |
|--------|-----------|--------|------------|--------|
| User denying sensitive actions | Medium | High | Immutable audit log with user ID, IP, timestamp, action | Mitigated |
| AI agent denying recommendations | Low | Medium | Agent approval log with immutable trail | Mitigated |
| Admin denying configuration changes | Medium | High | All security setting changes audit-logged | Mitigated |

#### Information Disclosure

| Threat | Likelihood | Impact | Mitigation | Status |
|--------|-----------|--------|------------|--------|
| Cross-tenant data leakage | High | Critical | Organization-scoped queries with getOrgVentureIds/getOrgSpvIds | Mitigated |
| Unauthorized file access | Medium | High | File operations check venture/SPV ownership before serving | Mitigated |
| AI model leaking training data | Low | Medium | System prompts constrain output scope; no fine-tuning on tenant data | Partially mitigated |

#### Denial of Service

| Threat | Likelihood | Impact | Mitigation | Status |
|--------|-----------|--------|------------|--------|
| API abuse via rapid requests | Medium | Medium | Rate limiting on 8 endpoint categories | Mitigated |
| Large file upload exhaustion | Medium | Medium | 50MB request size limit, file size validation | Mitigated |
| SSE connection exhaustion | Low | Low | Heartbeat cleanup, connection limits | Mitigated |

#### Elevation of Privilege

| Threat | Likelihood | Impact | Mitigation | Status |
|--------|-----------|--------|------------|--------|
| Client escalating to admin | High | Critical | Server-side role checks on every protected procedure | Mitigated |
| Viewer modifying data | Medium | High | Write operations require appropriate role level | Mitigated |
| Bypassing IP allowlist | Medium | High | IP check in tRPC middleware chain, applied to all procedure types | Mitigated |
| Bypassing feature flags | Low | High | Server-side feature flag checks, not client-side only | Mitigated |

### 2.3 Trust Boundary: tRPC API → Database

#### Tampering

| Threat | Likelihood | Impact | Mitigation | Status |
|--------|-----------|--------|------------|--------|
| SQL injection | Low | Critical | Drizzle ORM parameterized queries, no raw SQL | Mitigated |
| Database credential exposure | Low | Critical | Credentials in environment variables, not in code | Mitigated |

#### Information Disclosure

| Threat | Likelihood | Impact | Mitigation | Status |
|--------|-----------|--------|------------|--------|
| Database backup exposure | Medium | Critical | Encrypted backups, access-controlled storage | Mitigated |
| MFA secret exposure | Medium | High | AES-256-GCM encryption at application level | Mitigated |

### 2.4 Trust Boundary: tRPC API → External Services

#### Spoofing

| Threat | Likelihood | Impact | Mitigation | Status |
|--------|-----------|--------|------------|--------|
| Man-in-the-middle on API calls | Low | High | TLS enforced on all external connections | Mitigated |
| S3 bucket misconfiguration | Medium | High | Non-enumerable file keys with random suffixes | Mitigated |

#### Information Disclosure

| Threat | Likelihood | Impact | Mitigation | Status |
|--------|-----------|--------|------------|--------|
| API keys in client-side code | Medium | Critical | All external API calls server-side only | Mitigated |
| LLM prompt leakage | Low | Medium | System prompts are server-side, not exposed to client | Mitigated |

### 2.5 Trust Boundary: IdP → SCIM/SAML Endpoints

#### Spoofing

| Threat | Likelihood | Impact | Mitigation | Status |
|--------|-----------|--------|------------|--------|
| Fake SCIM provisioning requests | Medium | Critical | Bearer token authentication per organization | Mitigated |
| SAML assertion forgery | Medium | Critical | Signature validation framework in place | Partially mitigated |

#### Tampering

| Threat | Likelihood | Impact | Mitigation | Status |
|--------|-----------|--------|------------|--------|
| SCIM user attribute manipulation | Low | Medium | Server-side validation of SCIM payloads | Mitigated |
| Unauthorized role assignment via SCIM | Medium | High | SCIM-provisioned users default to `client` role | Mitigated |

---

## 3. Risk Summary

| Risk Level | Count | Examples |
|-----------|-------|---------|
| **Critical (mitigated)** | 8 | Cross-tenant leakage, session hijacking, SQL injection |
| **High (mitigated)** | 10 | Role escalation, file access, API key theft |
| **Medium (mitigated)** | 6 | Rate limiting bypass, error disclosure |
| **Partially mitigated** | 3 | SAML signature verification, AI data leakage, SAML replay |
| **Accepted** | 1 | Org slug enumeration via SSO URLs |

---

## 4. Recommendations for Pen Test Focus

Based on this threat model, the penetration test should prioritize:

1. **Multi-tenant isolation verification** — Attempt to access Org B's ventures, SPVs, distributions, and files from Org A's authenticated session. This is the highest-risk area given the financial data sensitivity.

2. **Role escalation testing** — Attempt to call admin-only procedures (e.g., `updateOrgSecuritySettings`, `purgeExpiredAuditLogs`) from a client-role session.

3. **SAML assertion manipulation** — Test whether modified SAML responses can bypass authentication or provision users in unauthorized organizations.

4. **AI prompt injection** — Attempt to manipulate AI agent outputs by injecting instructions into venture names, task descriptions, or chat messages that are passed to the LLM.

5. **IDOR on tRPC procedures** — Systematically test all procedures that accept entity IDs (venture, SPV, distribution, task) to verify that ownership checks are enforced.
