# Section 2.3 — Privilege Escalation Audit

**Date:** 2026-04-16

## RBAC Architecture Review

### Role Hierarchy (7 levels)

| Role | Level | Classification | Permissions |
|------|-------|---------------|-------------|
| viewer | 10 | External | read |
| client | 20 | External | read |
| user | 30 | Internal (if no org) / External (if org assigned) | read, create, update, process_documents |
| partner | 35 | External (elevated) | read, create, update, process_documents, export_data, view_audit_log |
| manager | 40 | Internal (if no org) / External (if org assigned) | read, create, update, delete, manage_team, process_documents, manage_spvs |
| admin | 50 | VENTEX Internal | ALL permissions |
| owner | 60 | VENTEX Internal | ALL permissions |

### isVentexTeam() Logic

```
owner/admin → always VENTEX team
manager/user → VENTEX team ONLY IF no organizationId or organizationId === 1
partner → NEVER VENTEX team (external elevated)
client/viewer → NEVER VENTEX team
```

**Finding PE-01 (LOW):** The `user` and `manager` roles have dual identity — they can be either VENTEX internal or client-side depending on `organizationId`. This is architecturally sound but requires careful documentation. A `manager` with `organizationId=null` gets full VENTEX team access, while a `manager` with `organizationId=2` is scoped to Meridian Holdings only.

### Middleware Chain

All procedure types enforce this chain:
```
requireUser → enforceIpAllowlist → [role check] → autoAudit → procedure
```

**Finding PE-02 (PASS):** The middleware chain is consistently applied:
- `protectedProcedure`: requireUser + ipAllowlist + autoAudit
- `adminProcedure`: requireUser + ipAllowlist + admin/owner check + autoAudit
- `partnerProcedure`: requireUser + ipAllowlist + partner/admin/owner check + autoAudit
- `tenantScopedProcedure`: requireUser + ipAllowlist + tenantGuard + autoAudit

### Escalation Vector Analysis

| Attack Vector | Status | Detail |
|--------------|--------|--------|
| viewer → client escalation | **BLOCKED** | Role stored in DB, not in JWT/cookie. Cannot self-modify. |
| client → user escalation | **BLOCKED** | Same — role is server-side. |
| client → admin escalation | **BLOCKED** | adminProcedure checks `ctx.user.role` from DB. |
| partner → admin escalation | **BLOCKED** | adminProcedure explicitly checks for admin/owner only. |
| manager → admin escalation | **BLOCKED** | Same check. |
| Null role handling | **SAFE** | Default role is "user" in schema. PERMISSION_MATRIX returns empty set for unknown roles. |
| Role via cookie manipulation | **BLOCKED** | Session cookie contains JWT with user ID only. Role is fetched from DB on each request via context.ts. |
| Role via tRPC input | **BLOCKED** | No procedure accepts a `role` parameter for self-modification. Only `security.updateUserRole` (adminProcedure) can change roles. |
| Unauthenticated → any role | **BLOCKED** | `requireUser` middleware throws UNAUTHORIZED before any role check. |
| IP allowlist bypass | **SAFE** | Allowlist is checked per-org from DB. No client-side override possible. |

### IP Allowlist Implementation

**Finding PE-03 (PASS):** IP allowlist is enforced at the middleware level for ALL procedure types (protected, admin, partner, tenant-scoped). Uses CIDR matching. If org has no allowlist, all IPs are allowed (correct default for new orgs).

### Auto-Audit Trail

**Finding PE-04 (PASS):** The `autoAudit` middleware logs every procedure call with user ID, action, resource, IP, and result. This creates an immutable audit trail for all authenticated operations.

### Session Management

**Finding PE-05 (INFO):** Sessions table tracks: userId, token, ipAddress, userAgent, isActive, lastActivity, expiresAt. Session termination is available via `settings.terminateSession` (correctly scoped to ctx.user.id).

### Inline Role Checks

Several procedures use inline role checks instead of middleware:
- `notifications.delete`: `ctx.user.role !== "admin" && ctx.user.role !== "owner"` — correct
- `notifications.clearRead`: Same pattern — correct
- `settings.getRetentionStats`: `ctx.user.role !== "admin"` — correct
- `settings.runRetentionPurge`: Same — correct

**Finding PE-06 (LOW):** Inline role checks are less maintainable than middleware-based checks. If the role hierarchy changes, these inline checks must be updated manually. Recommend migrating to `requirePermission()` or `adminProcedure`.

## Summary

| Finding | Severity | Status |
|---------|----------|--------|
| PE-01: Dual identity for user/manager roles | LOW | Architecturally sound, needs documentation |
| PE-02: Middleware chain consistency | PASS | All procedure types properly chained |
| PE-03: IP allowlist enforcement | PASS | Applied to all authenticated procedures |
| PE-04: Auto-audit trail | PASS | Logs all procedure calls |
| PE-05: Session management | INFO | Proper session tracking with termination |
| PE-06: Inline role checks | LOW | 4 procedures use inline checks instead of middleware |

**Verdict: No privilege escalation vectors found.** The RBAC system is well-designed with server-side role enforcement, consistent middleware chains, and proper separation between VENTEX internal and external roles.
