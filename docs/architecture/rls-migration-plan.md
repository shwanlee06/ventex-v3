# Row-Level Security (RLS) Migration Plan

**Date:** April 16, 2026  
**Author:** VENTEX Security Engineering  
**Status:** Evaluation Phase — No migration initiated  
**Classification:** Internal — Architecture Decision Record

---

## 1. Executive Summary

This document evaluates the feasibility and trade-offs of migrating VENTEX's tenant isolation from application-layer `WHERE organization_id = ?` filtering to database-level Row-Level Security (RLS). The current architecture uses TiDB (MySQL-compatible) as its primary database, which does not natively support RLS. This document outlines the options, risks, and a phased migration path should the decision be made to adopt RLS.

**Recommendation:** Do not migrate to database-level RLS at this time. Instead, strengthen the application-layer isolation through the tenant guard middleware (already implemented) and systematically fix the 44 critical gaps identified in the tenant isolation audit. Revisit RLS when the platform reaches the scale or regulatory threshold that demands it.

---

## 2. Current Architecture

### 2.1 Database

VENTEX uses **TiDB Cloud** (MySQL 8.0-compatible, distributed NewSQL) as its primary database, accessed through **Drizzle ORM**. TiDB does not support native RLS policies.

### 2.2 Tenant Isolation Model

The current isolation model is **application-layer, shared-database, shared-schema**:

| Layer | Mechanism | Status |
|-------|-----------|--------|
| **tRPC Middleware** | `tenantScopedProcedure` validates org context before any data access | Implemented (Apr 2026) |
| **Org Scope Helper** | `resolveOrgId()` forces client users to their own org, blocks cross-tenant requests | Implemented |
| **Venture Scope Helper** | `getOrgVentureIds()` returns only venture IDs accessible to the user's org | Implemented |
| **DB Query Filtering** | `WHERE organizationId = ?` in Drizzle queries | Implemented in 154/209 procedures (74%) |
| **Audit Middleware** | `autoAuditMiddleware` logs all mutations with actor and org context | Implemented |

### 2.3 Identified Gaps

The tenant isolation audit (April 16, 2026) found:

- **44 CRITICAL** procedures with missing org scoping
- **10 WARNING** procedures with partial scoping
- **154 OK** procedures with proper scoping

The 44 critical gaps are concentrated in: blueprints (9), intelligence (4), notifications (3), distributions (2), activity (1), agents (1), AI chat (1), search (1), ventures (1), tasks (1), and blueprint diagnostics (3).

---

## 3. RLS Options Evaluation

### 3.1 Option A: Native Database RLS (PostgreSQL Migration)

**Description:** Migrate from TiDB to PostgreSQL and implement native `CREATE POLICY` RLS rules.

| Factor | Assessment |
|--------|-----------|
| **Security** | Strongest isolation — enforced at the database engine level, cannot be bypassed by application bugs |
| **Migration effort** | Very high — requires full database migration (TiDB → PostgreSQL), ORM query adjustments, connection string changes, and extensive testing |
| **Performance** | Moderate overhead — RLS policies add a predicate to every query; can be optimized with proper indexing |
| **Operational complexity** | High — requires `SET app.current_tenant_id` on every connection, connection pooling changes (PgBouncer session mode), and careful handling of migrations |
| **Drizzle ORM support** | Drizzle supports PostgreSQL natively; migration is feasible but requires rewriting all schema definitions |
| **Timeline** | 4–8 weeks for migration + 2–4 weeks for testing |
| **Risk** | Data loss risk during migration; downtime required; regression risk in all 209 procedures |

**PostgreSQL RLS Example:**

```sql
-- Enable RLS on the ventures table
ALTER TABLE ventures ENABLE ROW LEVEL SECURITY;

-- Policy: users can only see rows matching their org
CREATE POLICY tenant_isolation ON ventures
  USING (organization_id = current_setting('app.current_tenant_id')::int);

-- VENTEX admin bypass
CREATE POLICY admin_bypass ON ventures
  USING (current_setting('app.user_role') IN ('admin', 'owner'));
```

**Connection setup required:**

```typescript
// Must be called on every request before any query
await db.execute(sql`SET app.current_tenant_id = ${orgId}`);
await db.execute(sql`SET app.user_role = ${userRole}`);
```

### 3.2 Option B: Application-Layer RLS (Current Approach, Hardened)

**Description:** Keep TiDB, fix all 44 critical gaps, and enforce isolation through middleware + code review.

| Factor | Assessment |
|--------|-----------|
| **Security** | Strong — defense-in-depth with middleware guard + per-query scoping + audit logging |
| **Migration effort** | Low — fix 44 procedures (estimated 2–3 days), no database migration |
| **Performance** | No additional overhead beyond existing WHERE clauses |
| **Operational complexity** | Low — no connection pooling changes, no session variables |
| **Drizzle ORM support** | Already working; no changes needed |
| **Timeline** | 1–2 weeks including testing |
| **Risk** | Low — incremental fixes, each testable independently |

### 3.3 Option C: Drizzle-Level RLS Abstraction

**Description:** Build a Drizzle query wrapper that automatically injects `WHERE organizationId = ?` into every query.

| Factor | Assessment |
|--------|-----------|
| **Security** | Good — centralized enforcement, but still application-layer (can be bypassed by raw SQL) |
| **Migration effort** | Medium — requires building a query proxy layer and migrating all `db.select()` calls |
| **Performance** | Minimal overhead |
| **Operational complexity** | Medium — custom abstraction layer needs maintenance |
| **Timeline** | 2–3 weeks |
| **Risk** | Medium — custom abstraction may have edge cases; raw SQL queries bypass it |

**Drizzle wrapper example:**

```typescript
// Tenant-scoped query builder
function tenantDb(orgId: number) {
  return {
    select: <T extends Table>(table: T) => 
      db.select().from(table).where(eq(table.organizationId, orgId)),
    insert: <T extends Table>(table: T) => ({
      values: (data: any) => db.insert(table).values({ ...data, organizationId: orgId }),
    }),
    update: <T extends Table>(table: T) => ({
      set: (data: any) => db.update(table).set(data).where(eq(table.organizationId, orgId)),
    }),
    delete: <T extends Table>(table: T) => 
      db.delete(table).where(eq(table.organizationId, orgId)),
  };
}
```

### 3.4 Option D: Schema-Per-Tenant (Physical Isolation)

**Description:** Create a separate database schema (or database) for each tenant.

| Factor | Assessment |
|--------|-----------|
| **Security** | Strongest possible — complete physical isolation |
| **Migration effort** | Extremely high — requires multi-tenant routing, schema management, migration orchestration |
| **Performance** | Best per-tenant performance; no cross-tenant query risk |
| **Operational complexity** | Very high — schema migrations must be applied to every tenant; connection management complex |
| **Timeline** | 8–16 weeks |
| **Risk** | High — fundamental architecture change; operational burden scales with tenant count |

**Not recommended** for VENTEX's current scale (< 50 tenants). Consider only if regulatory requirements mandate physical data separation (e.g., certain Swiss banking regulations).

---

## 4. Recommendation

### 4.1 Immediate (Now — 2 weeks)

**Execute Option B: Harden application-layer isolation.**

1. Fix all 44 CRITICAL procedures by adding `resolveOrgId()` or `enforceOrgScope` middleware
2. Add `assertTenantScope()` calls to all DB helpers in `server/db.ts`
3. Deploy the `tenantScopedProcedure` to all tenant-sensitive routers
4. Add the CI check for org scoping violations (prevents regression)
5. Run the full cross-tenant test suite (91 tests) on every PR

### 4.2 Short-term (1–3 months)

**Build Option C: Drizzle-level RLS abstraction.**

1. Create a `tenantDb(orgId)` wrapper that auto-injects org scoping
2. Migrate all DB queries to use the wrapper instead of raw `db.select()`
3. Add a lint rule that flags direct `db.select()` usage without the wrapper
4. This provides a centralized enforcement point without a database migration

### 4.3 Long-term (6–12 months, conditional)

**Evaluate Option A: PostgreSQL migration with native RLS.**

Trigger conditions for this migration:

- Enterprise client requires database-level isolation proof for procurement
- SOC 2 Type II auditor recommends database-level controls
- Tenant count exceeds 100 and application-layer enforcement becomes a maintenance burden
- Regulatory requirement (e.g., EU financial services) mandates database-level isolation

If triggered, the migration path would be:

1. Set up PostgreSQL (e.g., Neon, Supabase, or AWS RDS) in parallel
2. Build a data migration pipeline (TiDB → PostgreSQL)
3. Implement RLS policies for all tenant-scoped tables
4. Run both databases in parallel with read verification for 2 weeks
5. Cut over with a maintenance window

---

## 5. Tables Requiring RLS Policies

If Option A is pursued, the following 50+ tables would need RLS policies. Tables are grouped by isolation requirement:

### 5.1 Direct Org Scoping (have `organizationId` column)

| Table | Column | Priority |
|-------|--------|----------|
| `ventures` | `organizationId` | P0 |
| `tasks` | (via venture → org) | P0 |
| `spvs` | `organizationId` | P0 |
| `distributions` | `organizationId` | P0 |
| `activity_log` | `activityOrgId` | P0 |
| `agent_events` | `organizationId` | P0 |
| `notifications` | `organizationId` | P1 |
| `process_templates` | `organizationId` | P1 |
| `venture_process_tracking` | (via venture → org) | P1 |
| `intelligence_forecasts` | `organizationId` | P1 |
| `risk_matrix_entries` | `organizationId` | P1 |
| `client_contacts` | `organizationId` | P1 |
| `team_members` | (via type/org) | P1 |

### 5.2 Indirect Scoping (via foreign key to org-scoped table)

| Table | Scoping Path | Priority |
|-------|-------------|----------|
| `task_comments` | task → venture → org | P1 |
| `venture_process_overrides` | venture → org | P1 |
| `document_intelligence` | venture → org | P1 |
| `spv_ventures` | spv → org | P1 |
| `org_venture_access` | direct org reference | P0 |

### 5.3 System Tables (no RLS needed)

| Table | Reason |
|-------|--------|
| `users` | Cross-tenant by design (user belongs to one org) |
| `organizations` | Metadata table, admin-only access |
| `audit_log` | Already scoped by actor; admin-only read |
| `sessions` | Scoped by user ID |

---

## 6. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Application-layer bypass via raw SQL | Low | High | CI check flags raw SQL; code review required |
| New procedure added without org scoping | Medium | High | CI check + `tenantScopedProcedure` as default |
| Connection pooling breaks RLS session vars (if Option A) | Medium | Critical | Use session-mode pooling; test thoroughly |
| Data migration loss (if Option A) | Low | Critical | Parallel-run verification; rollback plan |
| Performance degradation from RLS policies (if Option A) | Low | Medium | Index on `organizationId`; query plan analysis |

---

## 7. Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| Apr 16, 2026 | Implement Option B (application-layer hardening) | Lowest risk, fastest to deploy, addresses all 44 gaps |
| Apr 16, 2026 | Defer Option A (PostgreSQL RLS) | TiDB doesn't support RLS; migration risk too high for current scale |
| Apr 16, 2026 | Plan Option C (Drizzle wrapper) for Q3 2026 | Centralized enforcement without database migration |
| — | Option A trigger review | Scheduled for Q1 2027 or when triggered by enterprise procurement |

---

## 8. Appendix: TiDB RLS Limitations

TiDB (as of v8.x) does not support PostgreSQL-style `CREATE POLICY` RLS. The closest alternatives in TiDB are:

1. **Views with WHERE clauses** — limited, cannot enforce on writes
2. **SQL SECURITY DEFINER views** — MySQL-compatible but not true RLS
3. **TiDB's RBAC** — role-based access to databases/tables, not row-level

For true database-level RLS, a migration to PostgreSQL, CockroachDB, or another RLS-supporting database would be required.

---

*This document is a living architecture decision record. It will be updated as the platform scales and regulatory requirements evolve.*
