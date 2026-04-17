# VENTEX — Manus Platform Dependency Map

> Last updated: April 17, 2026
> Purpose: Document every Manus platform dependency and its open-source/commercial replacement for portability planning.

## Overview

VENTEX is built on the Manus application platform, which provides hosting, authentication, LLM access, file storage, and notifications. This document maps each dependency to its replacement path should migration become necessary.

## Dependency Matrix

| Service | Manus Component | Usage in VENTEX | Replacement Options | Migration Effort |
|---------|----------------|-----------------|---------------------|-----------------|
| **Hosting** | Manus Hosting (manus.space) | Web app deployment, SSL, CDN | Vercel, Railway, Render, AWS ECS, Fly.io | Low — standard Node.js app |
| **Authentication** | Manus OAuth 2.0 | User login, session management | Auth0, Clerk, Lucia Auth, NextAuth | Medium — rewire OAuth flow |
| **Database** | TiDB Cloud (via Manus) | All business data (MySQL-compatible) | PlanetScale, Neon, AWS RDS, self-hosted MySQL | Low — standard MySQL/Drizzle ORM |
| **File Storage** | AWS S3 (via Manus SDK) | Document uploads, venture files | Direct AWS S3, Cloudflare R2, MinIO | Low — swap SDK credentials |
| **LLM Inference** | Manus Forge API | AI chat, agent analysis, drafts | OpenAI API, Anthropic API, Azure OpenAI | Low — swap API endpoint/key |
| **Email** | Resend (via Manus) | Notifications, distribution alerts | Direct Resend, SendGrid, AWS SES | Low — swap API key |
| **Notifications** | Manus Notification API | Owner alerts, system events | Slack webhooks, email, PagerDuty | Low — swap notification helper |
| **Image Generation** | Manus Image Service | AI-generated content | DALL-E API, Stability AI, Replicate | Low — swap API endpoint |
| **Voice Transcription** | Manus Whisper API | Audio transcription | OpenAI Whisper API, AssemblyAI | Low — swap API endpoint |
| **Maps** | Google Maps (via Manus proxy) | Location features | Direct Google Maps API key | Low — add own API key |

## Replacement Details

### 1. Hosting

**Current:** Manus deploys the app as a containerized Node.js service with automatic SSL and CDN.

**Replacement steps:**
1. Export the project via GitHub sync (already configured)
2. Add a `Dockerfile` or use the existing `pnpm build` output
3. Deploy to Vercel (frontend) + Railway/Render (backend), or a single platform like Fly.io
4. Update DNS records for custom domain

**Files affected:** `package.json` (start script), environment variables

### 2. Authentication

**Current:** `server/_core/oauth.ts` handles Manus OAuth callback, session cookies via `server/_core/cookies.ts`.

**Replacement steps:**
1. Replace `server/_core/oauth.ts` with Auth0/Clerk SDK integration
2. Update `server/_core/context.ts` to read user from new auth provider
3. Update `client/src/const.ts` `getLoginUrl()` to point to new provider
4. Migrate user records (id, name, email, role) to new auth system

**Files affected:** `server/_core/oauth.ts`, `server/_core/context.ts`, `server/_core/cookies.ts`, `client/src/const.ts`

### 3. Database

**Current:** TiDB Cloud (MySQL-compatible) via Drizzle ORM. Connection string in `DATABASE_URL`.

**Replacement steps:**
1. Export data using `mysqldump` or the Data API
2. Import into new MySQL-compatible database
3. Update `DATABASE_URL` environment variable
4. Run `pnpm db:push` to verify schema

**Files affected:** `.env` (DATABASE_URL only) — no code changes needed

### 4. File Storage (S3)

**Current:** `server/storage.ts` uses `@aws-sdk/client-s3` with Manus-provided credentials.

**Replacement steps:**
1. Create own S3 bucket or Cloudflare R2 bucket
2. Update environment variables: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET`, `S3_REGION`
3. Migrate existing files using `aws s3 sync`

**Files affected:** Environment variables only — `server/storage.ts` uses standard AWS SDK

### 5. LLM Inference

**Current:** `server/_core/llm.ts` calls Manus Forge API (OpenAI-compatible endpoint).

**Replacement steps:**
1. Sign up for OpenAI/Anthropic API access
2. Update `BUILT_IN_FORGE_API_URL` → new API base URL
3. Update `BUILT_IN_FORGE_API_KEY` → new API key
4. Optionally update model name in `invokeLLM` calls

**Files affected:** Environment variables; optionally `server/_core/llm.ts` if model names differ

### 6. Notifications

**Current:** `server/_core/notification.ts` calls Manus notification API.

**Replacement steps:**
1. Replace `notifyOwner()` with Slack webhook, email, or PagerDuty integration
2. Update all callers (search for `notifyOwner` in server code)

**Files affected:** `server/_core/notification.ts`, callers in routers

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Auth migration breaks sessions | Medium | High | Run parallel auth for 30 days |
| File URL changes break references | Low | Medium | Use redirect layer or bulk URL update |
| LLM behavior changes with new provider | Low | Low | Test with same model family |
| Database migration data loss | Low | High | Use `mysqldump` with verification |

## Estimated Migration Timeline

| Phase | Duration | Description |
|-------|----------|-------------|
| Planning | 1 week | Evaluate providers, set up accounts |
| Database | 1 day | Export/import MySQL data |
| Storage | 1 day | Sync S3 files to new bucket |
| Auth | 1 week | Implement new OAuth flow, test |
| LLM/APIs | 1 day | Swap API keys and endpoints |
| Hosting | 2 days | Deploy to new platform, DNS |
| Testing | 1 week | End-to-end verification |
| **Total** | **~3 weeks** | Conservative estimate with testing |
