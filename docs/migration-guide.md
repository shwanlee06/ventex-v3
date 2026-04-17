# VENTEX — Migration & Transition Guide

> Last updated: April 17, 2026
> Companion to: `docs/manus-dependency-map.md`

## Purpose

This guide provides step-by-step instructions for migrating VENTEX from the Manus platform to self-hosted or alternative infrastructure. It covers data export, service replacement, and verification procedures.

## Prerequisites

- Access to the VENTEX GitHub repository (already synced)
- Target hosting account (Vercel, Railway, Render, or similar)
- MySQL-compatible database instance
- S3-compatible storage (AWS S3, Cloudflare R2, or MinIO)
- Auth provider account (Auth0, Clerk, or similar)
- Node.js 22+ and pnpm installed locally

## Phase 1: Data Export

### 1.1 Database Export

```bash
# Connect to current TiDB database (credentials from Dashboard > Database > Settings)
mysqldump -h <HOST> -P <PORT> -u <USER> -p --ssl-mode=REQUIRED \
  --single-transaction --routines --triggers \
  <DATABASE_NAME> > ventex-backup-$(date +%Y%m%d).sql

# Verify the dump
grep "CREATE TABLE" ventex-backup-*.sql | wc -l
# Expected: 15+ tables (users, organizations, ventures, distributions, etc.)
```

### 1.2 File Storage Export

```bash
# List all files in the S3 bucket
aws s3 ls s3://<BUCKET_NAME>/ --recursive > file-inventory.txt

# Sync all files to local directory
aws s3 sync s3://<BUCKET_NAME>/ ./ventex-files/

# Verify file count
wc -l file-inventory.txt
ls -la ventex-files/ | wc -l
```

### 1.3 Configuration Export

```bash
# Document all environment variables from Dashboard > Settings > Secrets
# Critical variables to capture:
# - DATABASE_URL
# - JWT_SECRET
# - All VITE_* variables
# - RESEND_API_KEY
# - ENCRYPTION_MASTER_KEY
```

## Phase 2: Infrastructure Setup

### 2.1 Database

```bash
# Import to new MySQL instance
mysql -h <NEW_HOST> -P <NEW_PORT> -u <NEW_USER> -p \
  --ssl-mode=REQUIRED < ventex-backup-*.sql

# Verify table count and row counts
mysql -h <NEW_HOST> -u <NEW_USER> -p -e "
  SELECT TABLE_NAME, TABLE_ROWS
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = '<DATABASE_NAME>'
  ORDER BY TABLE_NAME;"
```

### 2.2 File Storage

```bash
# Upload to new S3 bucket
aws s3 sync ./ventex-files/ s3://<NEW_BUCKET>/ \
  --acl public-read

# Update file URLs in database if bucket/domain changed
# Run this SQL to check affected records:
SELECT COUNT(*) FROM venture_files WHERE fileUrl LIKE '%old-bucket%';
```

### 2.3 Authentication

1. Create application in Auth0/Clerk
2. Configure OAuth callback URL: `https://<YOUR_DOMAIN>/api/oauth/callback`
3. Update `server/_core/oauth.ts`:
   - Replace Manus OAuth endpoints with new provider
   - Map user profile fields (id, name, email, avatar)
4. Update `client/src/const.ts`:
   - Change `getLoginUrl()` to point to new auth provider

### 2.4 Environment Variables

Create `.env` file for the new deployment:

```env
# Database
DATABASE_URL=mysql://<user>:<pass>@<host>:<port>/<db>?ssl=true

# Auth (replace with new provider)
JWT_SECRET=<generate-new-256bit-secret>
VITE_APP_ID=<new-oauth-app-id>
OAUTH_SERVER_URL=<new-oauth-server>
VITE_OAUTH_PORTAL_URL=<new-login-portal>

# Storage
AWS_ACCESS_KEY_ID=<your-key>
AWS_SECRET_ACCESS_KEY=<your-secret>
S3_BUCKET=<your-bucket>
S3_REGION=<your-region>

# LLM (OpenAI-compatible)
BUILT_IN_FORGE_API_URL=https://api.openai.com/v1
BUILT_IN_FORGE_API_KEY=<your-openai-key>

# Email
RESEND_API_KEY=<your-resend-key>

# Security
ENCRYPTION_MASTER_KEY=<same-key-from-original>
```

## Phase 3: Code Modifications

### 3.1 Auth Module Replacement

The primary code change is in the authentication module. All other services use standard APIs.

**Files to modify:**
- `server/_core/oauth.ts` — Replace Manus OAuth with new provider
- `server/_core/context.ts` — Update session parsing if token format changes
- `client/src/const.ts` — Update login URL construction

### 3.2 Notification Helper

Replace `server/_core/notification.ts` with your preferred notification channel:

```typescript
// Example: Slack webhook replacement
export async function notifyOwner({ title, content }: { title: string; content: string }) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return false;
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: `*${title}*\n${content}` }),
  });
  return res.ok;
}
```

### 3.3 Build & Deploy

```bash
# Install dependencies
pnpm install

# Build the application
pnpm build

# The output is in dist/ — deploy as a Node.js application
# Start command: node dist/index.js
```

## Phase 4: Verification

### 4.1 Data Integrity Checks

```sql
-- Compare record counts between old and new databases
-- Run on BOTH databases and compare results:
SELECT 'users' as tbl, COUNT(*) as cnt FROM users
UNION ALL SELECT 'organizations', COUNT(*) FROM organizations
UNION ALL SELECT 'ventures', COUNT(*) FROM ventures
UNION ALL SELECT 'distributions', COUNT(*) FROM distributions
UNION ALL SELECT 'spvs', COUNT(*) FROM spvs
UNION ALL SELECT 'tasks', COUNT(*) FROM tasks
UNION ALL SELECT 'venture_files', COUNT(*) FROM venture_files
UNION ALL SELECT 'audit_log', COUNT(*) FROM audit_log;
```

### 4.2 Functional Verification Checklist

| Feature | Test | Expected Result |
|---------|------|-----------------|
| Login | Click "Sign In" | Redirects to new auth provider |
| Dashboard | Load /dashboard | Shows metrics, ventures, tasks |
| Ventures | Navigate to /ventures | Lists all ventures with org grouping |
| Distributions | Navigate to /distributions | Shows amounts with correct currency |
| File Upload | Upload a document to a venture | File stored in new S3 bucket |
| File Download | Download an existing file | File downloads correctly |
| AI Chat | Send message in client portal | LLM responds via new API |
| FX Rates | Fetch ECB rates | Rates saved to database |
| Notifications | Trigger an alert | Notification delivered via new channel |

### 4.3 Performance Baseline

```bash
# Run after migration to establish baseline
curl -w "@curl-format.txt" -o /dev/null -s https://<YOUR_DOMAIN>/api/trpc/auth.me
# Expected: < 200ms TTFB

# Database query performance
mysql -e "SELECT * FROM ventures LIMIT 1" --execute-time
# Expected: < 50ms
```

## Rollback Plan

If migration fails at any phase:

1. **Phase 1-2 failure:** No impact — original system untouched
2. **Phase 3 failure:** Revert code changes via git (`git checkout main`)
3. **Phase 4 failure:** Point DNS back to Manus hosting, restore original env vars
4. **Post-cutover:** Keep Manus deployment running for 30 days as fallback

## Timeline

See `docs/manus-dependency-map.md` for estimated migration timeline (~3 weeks conservative).
