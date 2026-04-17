# VENTEX — Entity Hierarchy Model

> Version 1.0 — April 17, 2026
> Author: Aurovia LLC Engineering

## Overview

VENTEX supports a flexible entity hierarchy that models the legal and operational structure of venture holding firms. The hierarchy flows from trust/family office structures down to individual ventures and SPVs.

## Hierarchy Levels

```
Trust / Family Office
    │
    ├── Holding Company
    │       │
    │       ├── Operating Entity (LLC, LP, Corp)
    │       │       │
    │       │       ├── Venture (project / investment)
    │       │       │       ├── SPV (deal vehicle)
    │       │       │       └── Tasks, Files, Team assignments
    │       │       │
    │       │       └── Venture
    │       │
    │       └── Operating Entity
    │
    └── Holding Company
```

## Schema Implementation

### Organizations Table

The `organizations` table supports hierarchy through self-referencing:

| Field | Type | Purpose |
|-------|------|---------|
| `entityType` | varchar(32) | Classification: `trust`, `holding_company`, `operating_entity`, `fund`, `family_office` |
| `parentOrgId` | int | Self-referencing FK to parent organization |
| `jurisdiction` | varchar(128) | Legal jurisdiction (e.g., "Delaware, USA", "DIFC, UAE") |
| `registrationNumber` | varchar(128) | Company registration number / EIN |
| `dataResidencyRegion` | varchar(32) | Preferred data storage region: `us-east-1`, `eu-west-1`, `ap-southeast-1` |

### Ventures Table

Ventures link to their owning operating entity:

| Field | Type | Purpose |
|-------|------|---------|
| `operatingEntityId` | int | FK to organizations (the operating entity that owns this venture) |
| `legalStructure` | varchar(64) | Legal form: `LLC`, `LP`, `Corp`, `JV`, `SPV` |

### Access Model

The existing `org_venture_access` table controls which organizations can view/edit/manage each venture. This is separate from ownership — an operating entity owns a venture, but a parent holding company or trust may also have access.

## Query Patterns

### Get full hierarchy for a trust

```sql
-- Get all entities under a trust (one level)
SELECT * FROM organizations WHERE parentOrgId = :trustId;

-- Get ventures for an operating entity
SELECT v.* FROM ventures v WHERE v.operatingEntityId = :opEntityId;
```

### Get parent chain for a venture

```sql
-- Walk up from venture → operating entity → holding co → trust
SELECT o.* FROM organizations o
WHERE o.id = (SELECT operatingEntityId FROM ventures WHERE id = :ventureId);
```

## Data Residency

Each organization can specify a preferred data residency region. When processing data for a venture, the system checks the operating entity's `dataResidencyRegion` to determine where files and AI processing should be routed.

Available regions:
- `us-east-1` — United States (default)
- `eu-west-1` — European Union
- `ap-southeast-1` — Asia-Pacific

## Migration Notes

The hierarchy fields are nullable to support gradual adoption. Existing organizations and ventures continue to function without hierarchy assignments. Administrators can populate hierarchy data through the organization settings UI.
