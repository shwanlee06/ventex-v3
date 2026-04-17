# Section 2.7 — Rate Limiting & Abuse Testing Audit

**Date:** 2026-04-16

## Rate Limit Configuration

| Category | Max Requests | Window | Applied To |
|----------|-------------|--------|------------|
| login | 10 | 15 min per IP | OAuth login attempts |
| apiKeyCreate | 5 | 1 hour per user | API key generation |
| fileUpload | 30 | 10 min per user | Venture/SPV/Team file uploads |
| invitation | 20 | 1 hour per user | Team member invitations |
| mfaVerify | 5 | 5 min per user | MFA code verification |
| aiChat | 30 | 10 min per user | Admin AI chat |
| portalAi | 20 | 10 min per user | Client portal AI chat |
| general | 200 | 1 min per IP | General API calls |
| emailSend | 10 | 1 hour per user | Email sending |

## Coverage Analysis

| Sensitive Endpoint | Rate Limited? | Category |
|-------------------|--------------|----------|
| OAuth login | **YES** | login |
| MFA verification | **YES** | mfaVerify |
| File upload (ventures) | **YES** | fileUpload |
| File upload (SPVs) | **YES** | fileUpload |
| File upload (team) | **YES** | fileUpload |
| Invitation sending | **YES** | invitation |
| API key creation | **YES** | apiKeyCreate |
| AI chat (admin) | **YES** | aiChat |
| AI chat (portal) | **YES** | portalAi |
| Email sending | **YES** | emailSend |
| Blueprint generation | **YES** | fileUpload |
| Settings update | **YES** | general |
| Password/MFA reset | **YES** | mfaVerify |

**Finding RL-01 (PASS):** All sensitive endpoints have rate limiting applied. 22 `enforceRateLimit` calls across 11 router files.

## Implementation Quality

| Aspect | Status | Detail |
|--------|--------|--------|
| Token bucket algorithm | **PASS** | Proper sliding window implementation |
| Automatic cleanup | **PASS** | Stale entries cleaned every 5 minutes |
| Error messaging | **PASS** | Returns retry-after seconds in error message |
| Key format | **PASS** | `category:identifier` prevents cross-category collision |

**Finding RL-02 (LOW):** Rate limiting is in-memory (Map-based). In a horizontally scaled deployment, each instance maintains its own counter. An attacker could distribute requests across instances to bypass limits. For production scale, consider Redis-backed rate limiting.

**Finding RL-03 (INFO):** The `general` category (200/min per IP) is applied to settings updates but not to most read operations. This is acceptable — read operations are less sensitive and the authentication layer already provides protection.

## Abuse Scenarios

| Scenario | Protected? | Detail |
|----------|-----------|--------|
| Brute-force login | **YES** | 10 attempts per 15 min per IP |
| MFA brute-force | **YES** | 5 attempts per 5 min per user |
| Invitation spam | **YES** | 20 per hour per user |
| File upload flood | **YES** | 30 per 10 min per user |
| AI cost abuse | **YES** | 30 admin / 20 portal per 10 min |
| Email spam | **YES** | 10 per hour per user |
| API key enumeration | **YES** | 5 per hour per user |

## Summary

| Finding | Severity | Status |
|---------|----------|--------|
| RL-01: Endpoint coverage | PASS | All sensitive endpoints rate-limited |
| RL-02: In-memory only | LOW | Not shared across instances |
| RL-03: Read operations not limited | INFO | Acceptable — auth layer protects |

**Verdict: Rate limiting is comprehensive and well-configured.** All sensitive operations are protected with appropriate limits. The in-memory limitation is acceptable for single-instance deployment.
