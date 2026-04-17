# Cross-Tenant Test Results — 2026-04-16

## Test Group 1: Unauthenticated Access
All 6 IDOR-flagged procedures correctly reject unauthenticated requests. **6/6 PASS**

## Test Group 2: IDOR Verification (server response check)
All 13 IDOR-flagged procedures correctly require authentication before processing. **13/13 PASS**

Note: These tests confirm the **authentication layer** is solid. The IDOR risk is **post-authentication** — once a client user is logged in, they can call these procedures with arbitrary IDs. The static analysis finding stands: the procedures lack **authorization** (org-scoping) checks, not **authentication** checks.

## Test Group 3: Cross-Tenant Search
Search correctly blocks unauthenticated cross-org queries. **1/1 PASS**

## Test Group 4: Organization ID Manipulation
All org-scoped procedures correctly reject unauthenticated orgId injection. **3/3 PASS**

## Summary
- **Total tests: 23**
- **Passed: 23**
- **Failed: 0**

## Important Caveat
These tests only verify the **unauthenticated** attack surface. The IDOR vulnerabilities identified in the static analysis (Section 2.1) are **post-authentication** risks — they would require a logged-in client user to exploit. Since we cannot easily simulate a client session in this test environment, the static analysis findings remain the authoritative source for IDOR risk assessment.

The 13 IDOR procedures confirmed by static analysis:
1. `ventures.getTasks` — no org check on ventureId
2. `ventures.getTeam` — no org check on ventureId
3. `ventures.getWithMilestones` — no org check on venture id
4. `ventures.updateMilestone` — no org check on ventureId (WRITE)
5. `ventures.renameFolder` — no org check on folderId (WRITE)
6. `tasks.update` — no org check on task id (WRITE)
7. `spvs.getLinkedVentures` — no org check on spvId
8. `spvs.getTeam` — no org check on spvId
9. `spvs.renameFolder` — no org check on folderId (WRITE)
10. `team.assignToVenture` — no org check on ventureId (WRITE)
11. `team.removeFromVenture` — no org check on ventureId (WRITE)
12. `intelligence.getVentureHealth` — no org check on ventureId
13. `intelligence.dismissAlert` — no org check on alertId (WRITE)
