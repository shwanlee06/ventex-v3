# Section 2.6 — Input Validation & Injection Audit

**Date:** 2026-04-16

## SQL Injection

### ORM Usage (Primary Defense)
All database operations use **Drizzle ORM** with parameterized queries. Drizzle's query builder automatically parameterizes all values, preventing SQL injection.

### Raw SQL Usage
13 instances of `sql` template tag usage across routers. All use Drizzle's `sql` tagged template which automatically parameterizes interpolated values:

```ts
// Example from agents.ts — safe parameterized query
sql`${tasks.dueDate} IS NOT NULL AND ${tasks.dueDate} < CURDATE()`
sql`${agentDrafts.subject} LIKE ${`%${task.title}%`}`
```

**Finding INJ-01 (PASS):** All SQL is parameterized via Drizzle ORM. No string concatenation in SQL queries. The `sql` template tag properly escapes all interpolated values.

## XSS Prevention

### Server-Side
- `sanitize.ts` module provides: `stripHtml()`, `escapeHtml()`, `sanitizeFilename()`, `sanitizePath()`, `sanitizeForLog()`
- Security headers include CSP with `script-src 'self' 'unsafe-inline' 'unsafe-eval'`

**Finding INJ-02 (MEDIUM):** CSP allows `'unsafe-inline'` and `'unsafe-eval'` for scripts. This weakens XSS protection. Required for React/Vite development but should be tightened for production with nonce-based CSP.

### Client-Side
- React's JSX auto-escapes all rendered content by default
- `sanitizeForClient()` in ActivityLog.tsx strips sensitive data from client-facing views
- No `dangerouslySetInnerHTML` usage found in user-input rendering contexts

**Finding INJ-03 (PASS):** React's default escaping provides strong XSS protection. Sanitization helpers are available and used for sensitive contexts.

## Prompt Injection

### AI Chat System
The portal AI chat uses a structured system prompt with scoped context:
```
"Only use the portfolio data provided below. Never make up data or reference information outside this client's scope."
```

User messages are passed as `role: "user"` — separate from the system prompt. The LLM is instructed to stay within the client's data scope.

**Finding INJ-04 (LOW):** The system prompt instructs the LLM to stay scoped, but there's no server-side output validation. A sophisticated prompt injection could potentially extract the system prompt or make the LLM generate unscoped responses. This is a known limitation of LLM-based systems. Mitigation: The LLM only receives data already scoped to the user's org, so even a successful injection cannot access other tenants' data.

## File Upload Validation

| Check | Status | Detail |
|-------|--------|--------|
| Zod input validation | **PASS** | filename, fileType, fileSize validated via z.string()/z.number() |
| Filename sanitization | **AVAILABLE** | `sanitizeFilename()` exists but not called in upload path |
| File type validation | **MISSING** | `fileType` is accepted as any string — no allowlist |
| File size limit | **PARTIAL** | Express body parser limits to 50MB, but no per-file type limit |
| Path traversal | **SAFE** | Files stored in S3 with nanoid prefix, not local filesystem |

**Finding INJ-05 (MEDIUM):** File upload accepts any `fileType` string without validation against an allowlist. While files are stored in S3 (not served from the application), a malicious file type header could be used for content-type confusion attacks.

**Finding INJ-06 (LOW):** `sanitizeFilename()` exists but is not called in the upload mutation. The filename is used in the S3 key path. While nanoid prefix prevents collisions, unsanitized filenames could contain special characters.

## Security Headers

| Header | Value | Assessment |
|--------|-------|------------|
| X-Content-Type-Options | nosniff | **PASS** |
| X-Frame-Options | DENY | **PASS** |
| X-XSS-Protection | 1; mode=block | **PASS** (legacy) |
| Strict-Transport-Security | max-age=63072000; includeSubDomains; preload | **PASS** — 2 year HSTS with preload |
| Referrer-Policy | strict-origin-when-cross-origin | **PASS** |
| Content-Security-Policy | default-src 'self'; ... | **PARTIAL** — unsafe-inline/eval |
| Permissions-Policy | camera=(), microphone=(), ... | **PASS** — all unnecessary features disabled |
| Cross-Origin-Opener-Policy | same-origin | **PASS** |
| Cross-Origin-Resource-Policy | same-origin | **PASS** |
| X-Powered-By | removed | **PASS** |

## Zod Input Validation

**774 Zod schema declarations** across all routers. Every tRPC procedure validates its input with Zod before processing.

**Finding INJ-07 (PASS):** Comprehensive input validation via Zod. All procedure inputs are typed and validated.

## Summary

| Finding | Severity | Status |
|---------|----------|--------|
| INJ-01: SQL injection | PASS | All queries parameterized via Drizzle ORM |
| INJ-02: CSP allows unsafe-inline/eval | MEDIUM | Required for dev, should tighten for production |
| INJ-03: XSS prevention | PASS | React auto-escaping + sanitization helpers |
| INJ-04: Prompt injection | LOW | LLM scoped to user's data, but no output validation |
| INJ-05: File type not validated | MEDIUM | No allowlist for uploaded file types |
| INJ-06: Filename not sanitized in upload | LOW | sanitizeFilename exists but not called |
| INJ-07: Zod input validation | PASS | 774 schema declarations across all routers |

**Verdict: Strong input validation foundation.** Two medium findings (CSP and file type validation) that should be addressed before production. No SQL injection or XSS vulnerabilities found.
