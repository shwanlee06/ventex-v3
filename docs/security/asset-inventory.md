# VENTEX Platform — Asset Inventory

**Version:** 1.0  
**Date:** April 2026  
**Classification:** CONFIDENTIAL

---

## 1. API Surface

### 1.1 REST Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/oauth/callback` | GET | Public | OAuth 2.0 callback handler |
| `/api/health` | GET | Public | Basic health check |
| `/api/health/db` | GET | Public | Database connectivity check |
| `/api/health/ai` | GET | Public | AI service availability |
| `/api/agent-scheduler/status` | GET | Public | Agent scheduler status |
| `/api/events` | GET | Session | SSE real-time event stream |
| `/api/events/stats` | GET | Admin | SSE connection statistics |
| `/api/ai-stream` | POST | Session | LLM chat streaming endpoint |
| `/api/invitations/validate/:token` | GET | Public | Invitation token validation |
| `/api/sso/saml/:orgSlug/metadata` | GET | Public | SAML SP metadata XML |
| `/api/sso/saml/:orgSlug/login` | GET | Public | Initiate SAML login |
| `/api/sso/saml/:orgSlug/acs` | POST | Public | SAML assertion consumer |
| `/api/scim/v2/:orgId/Users` | GET/POST | Bearer | SCIM user provisioning |
| `/api/scim/v2/:orgId/Users/:id` | GET/PUT/PATCH/DELETE | Bearer | SCIM user management |

### 1.2 tRPC Procedure Categories (200+ procedures)

| Router | Procedure Count | Auth Level | Description |
|--------|----------------|------------|-------------|
| `auth` | 3 | Mixed | Login state, logout, session |
| `ventures` | 25+ | Protected | Venture CRUD, files, folders |
| `spvs` | 20+ | Protected | SPV management, files, deals |
| `distributions` | 8 | Protected | Distribution tracking, export |
| `tasks` | 15+ | Protected | Task management, assignments |
| `agents` | 30+ | Protected | AI agent config, execution, drafts |
| `blueprints` | 18 | Protected | Blueprint templates, tracking |
| `blueprintDiagnostics` | 5 | Protected | Blueprint health diagnostics |
| `intelligence` | 10+ | Protected | AI observations, insights |
| `organizations` | 12 | Protected | Org management, onboarding |
| `team` | 15+ | Protected | Team members, invitations |
| `portal` | 10 | Protected | Client portal data, actions |
| `security` | 20+ | Protected | MFA, sessions, audit, settings |
| `notifications` | 8 | Protected | Notification management |
| `search` | 2 | Protected | Global search |
| `activity` | 5 | Protected | Activity feed, velocity log |
| `documents` | 8 | Protected | Document processing, search |
| `system` | 3 | Admin | System notifications, config |

### 1.3 Public (Unauthenticated) Endpoints

These endpoints are accessible without authentication and represent the primary attack surface for unauthenticated attackers:

| Endpoint | Risk Level | Notes |
|----------|-----------|-------|
| `/api/health/*` | Low | Information disclosure only |
| `/api/sso/saml/*/metadata` | Low | SP metadata is intentionally public |
| `/api/sso/saml/*/login` | Medium | Could be used for org enumeration |
| `/api/invitations/validate/*` | Medium | Token brute-force risk (rate-limited) |
| `/.well-known/security.txt` | Low | Security contact information |

---

## 2. Data Stores

| Store | Technology | Contents | Encryption |
|-------|-----------|----------|------------|
| Primary Database | TiDB Cloud (MySQL 8.0 compat) | All application data | TLS in-transit, AES-256 at-rest |
| File Storage | AWS S3 | Documents, images, uploads | TLS in-transit, SSE-S3 at-rest |
| Session Store | Database table (`sessions`) | Active user sessions | JWT signed with HS256 |
| MFA Secrets | Database column (`mfaSecret`) | TOTP secrets | AES-256-GCM application-level encryption |
| API Keys | Database column (`keyHash`) | API key hashes | SHA-256 one-way hash |

---

## 3. Third-Party Integrations

| Service | Purpose | Data Exchanged | Auth Method |
|---------|---------|---------------|-------------|
| Manus OAuth | User authentication | User profile (name, email, openId) | OAuth 2.0 |
| OpenAI API | LLM inference | Prompts, completions | API key (server-side) |
| AWS S3 | File storage | File bytes, metadata | IAM credentials |
| TiDB Cloud | Database | All application data | Connection string + TLS |
| Resend | Email delivery | Email addresses, content | API key |

---

## 4. Security Controls Summary

| Control | Implementation | Status |
|---------|---------------|--------|
| HTTPS/TLS | Enforced via HSTS with preload | Active |
| CSP | `default-src 'self'` with specific allowances | Active |
| CORS | Restricted to same-origin | Active |
| Rate Limiting | 8 endpoint categories with sliding windows | Active |
| Input Validation | Zod schemas on all tRPC inputs | Active |
| Output Encoding | React JSX auto-escaping | Active |
| Session Management | Server-side sessions with idle + absolute timeout | Active |
| MFA | TOTP with encrypted secrets, optional/enforced per org | Active |
| IP Allowlist | Per-org CIDR-based allowlisting | Active |
| Audit Logging | Immutable audit trail for all sensitive operations | Active |
| Tenant Isolation | Organization-scoped queries with defense-in-depth guards | Active |
| AI Safety | Confidence scoring, human approval, disclaimers | Active |
| SCIM Provisioning | Immediate session termination on deactivation (<60s) | Active |

---

## 5. Client-Side Assets

| Asset | URL Pattern | Description |
|-------|-------------|-------------|
| SPA Bundle | `/assets/*.js` | React application bundle |
| CSS | `/assets/*.css` | Tailwind CSS styles |
| Favicon | `/favicon.ico` | Site icon |
| Robots | `/robots.txt` | Search engine directives |
| Security.txt | `/.well-known/security.txt` | Security contact info |
