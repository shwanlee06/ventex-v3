# Current Tasks

## Export PDF
- [x] Find where Export PDF button is located
- [x] Implement PDF generation
- [x] Test PDF export works

## Settings Page Tabs
- [x] Review current Settings tabs
- [x] Configure all tabs with working content
- [x] Ensure each tab is fully functional

## Multi-User Tracking
- [x] Review current session/auth management
- [x] Implement operator activity tracking (login time, actions)
- [x] Show active operators / session log
- [x] Ensure each operator's session is independent

## AI Agent - Claude 4.6 Sonnet
- [x] Upgrade project to web-db-user for backend API routes
- [x] Create backend tRPC route for AI chat via Forge API
- [x] Update Agent.tsx to call real Claude 4.6 Sonnet
- [x] Fix Home.tsx duplicate loading variable after upgrade
- [x] Add portfolio context injection for AI responses

## Landing Page Updates
- [x] Change hero logo from ATLAS to ATL_ with throbbing underscore cursor
- [x] Simplify auth screen to ROYALTON INVESTMENTS engineered by ATLAS + password
- [x] Revert cipher loading screen back to ATLAS, keep ATL_ only on dashboard nav

## AI Agent Optimization
- [x] Add streaming backend endpoint for real-time AI responses
- [x] Update frontend to consume SSE stream with word-by-word rendering
- [x] Reduce system prompt size for faster first-token latency
- [x] Add typing indicator and smooth streaming UX

## Feature I — Venture Detail Pages
- [x] Create /ventures/:slug dynamic route
- [x] Build venture detail header with back arrow, name, badges, action buttons
- [x] Section A: Key Details card with edit/save functionality
- [x] Section B: Team & Responsibilities card with assign/remove members
- [x] Section C: Open Tasks list with add task modal and checkbox completion
- [x] Section D: Attached Files with file picker and remove
- [x] Section E: Activity Log chronological feed
- [x] Pre-populate with existing venture data
- [x] Make venture table rows clickable with hover arrow

## Feature II — Redesigned AI Agent + Tasks Page
- [x] Remove Priority Tasks from AI Agent sidebar
- [x] Add Recent Context panel (last 3 conversations)
- [x] Add Suggested Actions panel (4 large cards)
- [x] Shorten AI welcome message to conversational tone
- [x] Update chat input placeholder
- [x] Add Clear conversation button with confirmation
- [x] Add Latest activity quick-action pill
- [x] Create standalone /tasks page with filters and task table
- [x] Add Tasks link to sidebar navigation

## Feature III — Mobile App (React Native / Expo)
- [x] Initialize Expo project in /mobile directory
- [x] Set up bottom tab navigation (Dashboard, Ventures, AI Agent, Tasks)
- [x] Build Dashboard screen with stats, sectors, activity
- [x] Build Ventures screen with search and filter
- [x] Build Venture Detail screen
- [x] Build AI Agent screen with Claude streaming
- [x] Build Tasks screen with filters and bottom sheet
- [x] Apply dark theme styling matching web app
- [x] Pre-populate with same data as web app

## FIX 8 — Rename Royalton to Thalora
- [x] Global find-replace Royalton Investments → Thalora across all files
- [x] Update page title, sidebar, auth page, landing page, footer, AI prompt, data strings
- [x] Do NOT change ATLAS, Aurovia, SSH Maritime or other brand names

## FIX 3 — Add Shwan Lee and Najib to team
- [x] Add Shwan Lee (Founder & CEO) and Najib (Advisor) to team data
- [x] Ensure they appear in all team member dropdowns

## FIX 1 — Persistent AI chat history
- [x] Save messages to localStorage (atlas_chat_history)
- [x] Pre-populate chat on page load from localStorage
- [x] Cap at 50 messages
- [x] Clear button removes localStorage and resets UI
- [x] Show timestamps on messages from previous sessions

## FIX 2 — AI chat file/image attachments
- [x] Add paperclip button to chat input
- [x] Show preview chips with remove button
- [x] Images: base64 vision message to Claude
- [x] Documents: include filename reference in text
- [x] Multiple file support, clear after send

## FIX 4 — Venture detail downloadable files
- [x] Store file data (base64) in localStorage per venture
- [x] Open button: lightbox for images, new tab for PDFs, download for others
- [x] Download button for all file types
- [x] 5MB file size limit with toast warning
- [x] File type icons (PDF red, image thumbnail, Word blue, Excel green)

## FIX 5 — Remove Tasks from venture detail
- [x] Remove Tasks section from VentureDetail.tsx
- [x] Ensure no gap in layout

## FIX 6 — Fix dark mode toggle
- [x] Define full light mode CSS custom properties
- [x] Toggle adds/removes light-mode class on html element
- [x] Persist preference to localStorage (atlas_theme)
- [x] Apply on app load before render
- [x] Works across all pages

## FIX 7 — Team member profile pages
- [x] Create /team/:slug route
- [x] Make team rows clickable with hover arrow
- [x] Build profile page: header, about/bio, expertise tags, roles, contact, ventures, tasks, activity
- [x] Photo upload with localStorage persistence
- [x] Edit mode for all sections

## Folder Organization in Venture Files
- [x] Add "Create Folder" button next to file attach button
- [x] Allow naming folders and organizing files into them
- [x] Show folder tree with expand/collapse
- [x] Persist folder structure to localStorage per venture
- [x] Allow drag or move files between folders

## Data Persistence — Never Remove Data
- [x] Persist all dashboard data changes to localStorage
- [x] Tasks: persist completions, additions, reassignments
- [x] Ventures: persist edits, status changes
- [x] Distributions: persist new entries
- [x] Team: persist additions and edits
- [x] Prevent accidental data deletion with confirmation dialogs

## Airtable Sync
- [x] Connect to Airtable via MCP server
- [x] Discover base and table structure
- [x] Create backend API routes for sync (ventures, tasks, people, SPVs)
- [x] Sync new/updated tasks to Airtable
- [x] Sync new/updated ventures to Airtable
- [x] Sync new/updated team members to Airtable
- [x] Sync SPVs/deals to Airtable
- [x] Add "Sync All to Airtable" button in Settings General tab
- [x] Wire auto-sync into persistence layer (debounced 5s)
- [x] Add data summary counts in sync card
- [x] Write vitest tests for all sync endpoints (8 tests passing)

## AI Agent — ChatGPT-style Conversation History
- [x] Auto-generate title for each chat log based on first user message
- [x] Save each conversation as a separate chat log in localStorage
- [x] Show chat history list in Recent Context sidebar with titles and timestamps
- [x] Create "New Chat" button to start fresh conversation
- [x] Switch between saved chat logs by clicking them
- [x] Delete chat logs from sidebar
- [x] Download chat logs (as text/JSON)
- [x] View/preview chat logs in sidebar

## PART 1 — Live Shared Data Architecture
- [x] Create DB schema: ventures, venture_team, tasks, team_members, spvs, distributions, activity_log, venture_files, notifications
- [x] Push migrations to database
- [x] Seed all tables with existing hardcoded data (20 ventures, 10 SPVs, 9 tasks, 12 team, 4 distributions)
- [x] Build tRPC procedures for all CRUD operations (8 routers)
- [x] Replace all localStorage/useState data with DB reads/writes across all pages
- [x] Venture detail: team from venture_team join table
- [x] Venture detail: files stored in venture_files table
- [x] Tasks page: all tasks from DB, checkbox writes to DB
- [x] Dashboard: live counts from DB
- [x] Team page: all data from DB

## PART 2 — Venture Detail: Linked Tasks (read-only view)
- [x] Add "Linked Tasks" section to venture detail pages
- [x] Show tasks where venture_id matches, with checkbox to mark complete
- [x] Add Task button pre-filled with venture
- [x] View all in Tasks link

## PART 3 — Dashboard Enhancements
- [x] Stat cards clickable with navigation
- [x] Pipeline Health mini-chart (horizontal bar)
- [x] Live Recent Activity from activity_log
- [x] Overdue Alerts banner
- [x] Quick Actions row (New Venture, Task, SPV, Distribution)
- [x] Venture sector cards show live data

## PART 4 — SPV Detail Pages
- [x] Route /spvs/:slug with full detail page
- [x] SPV header, key details, linked ventures, assigned team, documents, activity log
- [x] Make SPV rows clickable

## PART 5 — Activity Log Page
- [x] New /activity route with sidebar link
- [x] Stats bar, filter tabs by entity type
- [x] Chronological list from activity_log table grouped by date
- [x] Load more pagination

## PART 6 — Notifications Center
- [x] Notifications table in DB
- [x] Notification panel reads from DB via tRPC
- [x] Bell icon shows unread count, click opens panel, mark read/all-read

## PART 7 — Kanban View for Tasks
- [x] Build Board view with columns (Open, In Progress, Overdue, Complete)
- [x] Click to move between columns updates status in DB
- [x] Task cards show venture name, assignee, due date, priority badge

## PART 8 — Search Command Palette
- [x] Press / or click search to open overlay
- [x] Live search across all DB tables (ventures, SPVs, tasks, team)
- [x] Results grouped by type with keyboard navigation
- [x] Click navigates to entity detail page

## Tests
- [x] 54 vitest tests passing across 6 test files
- [x] Ventures, tasks, SPVs, team, distributions, activity, notifications router tests
- [x] Airtable sync endpoint tests
- [x] Auth logout test
- [x] AI chat test
- [x] Document Intelligence router tests (8 procedure checks)
- [x] Intelligence router tests (8 procedure checks)

## FIX — File Persistence (S3 + DB)
- [x] Build server-side file upload endpoint (S3 storagePut + DB metadata)
- [x] Wire VentureDetail file uploads to S3 backend instead of in-memory
- [x] Wire SpvDetail file uploads to S3 backend (new spv_files + spv_folders tables)
- [x] Files persist across page refresh for all users
- [x] Folder organization persists in DB (venture_folders + spv_folders tables)
- [x] File delete removes from DB
- [x] File download/view works from S3 URLs
- [x] SPV detail page: full Documents & Folders section with upload, folder create, rename, delete, move, lightbox

## PART 1 — Intelligent Document Processing Engine
- [x] Create document_intelligence table in DB schema
- [x] Create venture_risks table in DB schema
- [x] Create meeting_briefs table in DB schema
- [x] Install pdf-parse, mammoth, xlsx npm packages
- [x] Build processFile tRPC procedure: PDF text extraction, DOCX extraction, XLSX extraction, image via Claude Vision
- [x] Send extracted text to Claude for classification (document_type, entities, financials, action_items, deadlines, risks, summary, sentiment)
- [x] Store structured intelligence in document_intelligence table
- [x] Auto-create tasks from action_items (fuzzy match to avoid duplicates)
- [x] Auto-create notifications from deadlines (urgent if <7 days)
- [x] Auto-create venture_risks from risks_mentioned
- [x] Show "Process with AI" brain icon on each file row
- [x] Toast notification on processing success
- [x] Meeting minutes auto-brief: special Claude prompt for meeting summaries, store in meeting_briefs table
- [x] Auto-notify team members when meeting brief is generated

## PART 2 — Live Intelligent Dashboard
- [x] Create daily_briefs table in DB schema
- [x] Create smart_alerts table in DB schema
- [x] Create ai_observations table in DB schema
- [x] Add health_score column to ventures table
- [x] Build daily brief generator: Claude API with full portfolio context → structured JSON
- [x] Build venture health score calculator (tasks, documents, team, stage, sentiment)
- [x] Build smart alerts system: Critical (red), Warning (yellow), Info (blue) with dismiss
- [x] Document Intelligence Feed section on dashboard (recent processed docs)
- [x] Daily Brief card on dashboard right column
- [x] Smart Alerts stacked cards on dashboard right column
- [x] Venture health score on venture detail pages

## PART 3 — Autonomous AI Agent
- [x] Build AI processor: scheduled analysis of full portfolio → ai_observations
- [x] AI Observations management (accept/dismiss)
- [x] Document-aware AI chat: include document summaries, action items, deadlines, risks in system prompt
- [x] AI Recommendations card on venture detail pages
- [x] Accept/dismiss observation procedures

## PART 4 — Document Intelligence on Venture & SPV Pages
- [x] Document type tabs on venture detail (via docIntel.getByVenture)
- [x] Document intelligence sections on venture detail: risks, recommendations, doc feed
- [x] Document search across extracted text (searchDocuments procedure)
- [x] Meeting Briefs retrieval (getMeetingBriefs procedure)
- [x] SPV document intelligence (getBySpv procedure)

## SOC 2 Compliance — AES-256 Encryption
- [x] Build AES-256-GCM encryption/decryption module (server/security/encryption.ts)
- [x] Auto-generated ENCRYPTION_MASTER_KEY (256-bit via openssl)
- [x] Field-level encryption with HMAC-SHA256 key derivation per field
- [x] Encrypted file storage module (server/security/encryptedStorage.ts)
- [x] 10 vitest tests for encryption module (encrypt/decrypt/buffer/deterministic)

## SOC 2 Compliance — Zero-Trust Architecture
- [x] Re-validate session token on every tRPC request (via tRPC context)
- [x] IP logging and user-agent tracking in audit trail
- [x] Session management table with active session tracking
- [x] Zero-trust: every procedure re-validates auth, no implicit trust

## SOC 2 Compliance — RBAC (Role-Based Access Control)
- [x] Extended user roles: Owner, Admin, Manager, User, Client, Viewer (6-tier)
- [x] Created user_venture_access table (user → venture permission mapping)
- [x] Created permissions matrix (13 actions × 6 roles)
- [x] Built RBAC middleware (server/security/rbac.ts) with checkPermission, checkVentureAccess, logAudit
- [x] Row-level security: users only see ventures/SPVs they have access to
- [x] Owner/Admin can manage roles and access via security router
- [x] Client/Viewer role: read-only access to assigned ventures only

## SOC 2 Compliance — Audit Logging
- [x] Created audit_log table (userId, userName, action, entityType, entityId, entityName, details, ipAddress, userAgent, result, createdAt)
- [x] Audit middleware (server/security/auditMiddleware.ts) for mutations, access, and auth events
- [x] Log all data access attempts (granted and denied)
- [x] Log authentication events (login, logout, failed attempts)
- [x] Log role/permission changes
- [x] Audit log viewer with filters, pagination, and export in Security page

## SOC 2 Compliance — Security Admin UI
- [x] New /security route with Lock icon in sidebar
- [x] Overview tab: SOC 2 compliance checklist, encryption config, quick stats
- [x] Users & Roles tab: user list with inline role editing (6-tier dropdown)
- [x] Audit Log tab: filterable table with pagination (result, entity type)
- [x] Access Control tab: current user permissions, full permission matrix
- [x] Role hierarchy legend with descriptions

## UI/UX Overhaul — Mobile-First Responsive Design

### Global / Layout
- [x] Replace sidebar with bottom tab bar on mobile (<768px) with icons + labels
- [x] Responsive header: hide search behind icon on mobile, compact title
- [x] Stat cards: stack vertically on mobile, 2-col tablet, 3-4 col desktop
- [x] Typography: increase base font, 8pt grid spacing, distinct section headers
- [x] Touch targets: minimum 44x44px tap area on all interactive elements
- [x] Filter/action bars: collapse on mobile, FAB for primary actions

### Dashboard Page
- [x] 2x2 stat card grid on mobile, single row desktop
- [x] Horizontal scrollable pill row for quick actions on mobile
- [x] Swipeable/scrollable venture sector cards on mobile
- [x] Stack activity/tasks/distributions panels full-width on mobile
- [x] Prominent rounded overdue alert banner on mobile

### Ventures Page
- [x] Card list view on mobile (name, sector badge, country, stage, status pill)
- [x] View toggle (List/Table/Grid) with user preference persistence
- [x] Filter bottom sheet on mobile instead of inline dropdowns

### SPVs & Deals Page
- [x] Card view on mobile with name, sector, priority, stage, status
- [x] Horizontal scroll stats on mobile, 3-col on desktop

### Tasks Page
- [x] Card/list view on mobile (title, venture, due date, priority, assignee)
- [x] Full-width search, collapsible filters on mobile
- [x] Clean segmented control for Table/Board toggle
- [x] Consistent priority colors: High=red, Medium=amber, Low=green

### Distributions Page
- [x] Card view on mobile with name, fund, amount, status badge, date
- [x] Full-width stacked buttons on mobile

### Team & Contacts Page
- [x] 2-column grid on mobile with avatar, name, role, contact icon
- [x] Proper 3-up stat row that fits mobile

### Security Page
- [x] 1-col mobile, 2-col tablet, 3-col desktop for security cards
- [x] Green checkmarks + progress bar for compliance checklist

### Settings Page
- [x] Horizontally scrollable tab row on mobile
- [x] Label-left switch-right layout with ample row height

### Design System
- [x] Consistent semantic colors (emerald, amber, red, slate, gold)
- [x] Standardized status badge pills across all pages
- [x] Consistent card styling (12px radius, subtle border, bg difference)
- [x] Skeleton loaders for all data tables and card grids
- [x] Empty state UI with icon and message
- [x] Micro-interactions: hover lift on desktop, press scale on mobile

## Invite-Only Access System with API Keys

### Schema & Backend
- [x] Create organizations table (Aurovia, ATLAS, partnerships)
- [x] Create invitations table (email, org, venture access, status, token)
- [x] Create api_keys table (48-char key, user, org, venture scope, active/revoked)
- [x] Add organizationId to users table
- [x] Push DB migrations
- [x] Build tRPC procedures: invite user, accept invite, generate API key, revoke key, list keys
- [x] Build organization management procedures (CRUD)

### Gated OAuth Flow
- [x] Block OAuth login for users without a valid invitation
- [x] Redirect unauthorized users to "Access Denied — Request Invitation" page
- [x] On first OAuth login with valid invite: create user, assign org, generate 48-char API key
- [x] Show API key once on first login (copy-to-clipboard, never shown again)
- [ ] Validate API key on every authenticated request (middleware) — deferred, using session-based auth

### Admin UI (Access Management Page)
- [x] Organizations tab: list/add/edit/suspend partner organizations
- [x] Invitations tab: send invites by email, set org + role, track status, copy invite link
- [x] API Keys tab: list all keys, revoke, see last used, key prefix display
- [x] Stat cards: org count, pending invites, active keys, total invitations
- [x] New /access route with KeyRound icon in sidebar

### User Onboarding Flow
- [x] Invite link with unique token (copy-to-clipboard from admin UI)
- [x] OAuth callback gates access: checks for pending invitation by email
- [x] Error handling on landing page: no_invitation, blocked, suspended, invitation_expired
- [x] Venture-scoped dashboard: users only see ventures their org has access to — implemented in two-tier architecture

### Tests
- [x] Vitest tests for API key generation (format, uniqueness, 45-char length)
- [x] Vitest tests for invite token generation (URL-safe, unique)
- [x] Vitest tests for API key hashing (SHA-256, consistency, uniqueness)
- [x] Vitest tests for key prefix extraction
- [x] Vitest tests for invitation expiry logic
- [x] Vitest tests for role hierarchy and organization types
- [x] Vitest tests for OAuth error messages

## Partner Identification — Org-Specific Invite Links & Branded Onboarding

### Invite Link Structure
- [x] Embed org slug in invite URL: `/invite/aurovia/<token>` or `/invite/royalton/<token>`
- [x] System identifies partner org from URL before user even logs in
- [x] Each org gets unique invite links that are visually distinct

### Branded Onboarding Page
- [x] Partner-specific welcome page showing org name, type badge, and context
- [x] "YOU HAVE BEEN INVITED BY [ORG NAME]" typewriter messaging before OAuth
- [x] Org-branded color accent on the invite acceptance page (core=gold, partner=blue, client=green)

### OAuth Flow — Org Tracking
- [x] Invite token stored in sessionStorage before OAuth redirect
- [x] Public /api/invite/validate endpoint validates token + org slug match
- [x] Email masking for privacy on invite page (pa***@aurovia.com)

### API Key — Org Prefix
- [x] Include org identifier in API key prefix: `ATLAS-AUROVI-XXXX...` or `ATLAS-ROYALT-XXXX...`
- [x] Admin can see at a glance which org a key belongs to via prefix

### Tests
- [x] Vitest tests for org slug generation and URL-safe formatting
- [x] Vitest tests for org-prefixed API key generation (aurovia, royalton, atlas)
- [x] Vitest tests for invite link format (org-specific vs fallback)
- [x] Vitest tests for email masking in invite validation
- [x] Vitest tests for special character handling in org slugs

## Bug Fixes

- [x] Admin cannot remove/delete users (e.g., Jason) from Security page — added delete user with confirmation dialog, cascade cleanup of sessions/API keys/access grants, audit logging, and role-based guards (can't delete owner, only owner can delete admins)

## Two-Tier Architecture — ATLAS Team vs Client Sub-Accounts

### Role Simplification
- [x] Simplify to two tiers: ATLAS internal (owner, admin) vs Client (manager, user, viewer)
- [x] ATLAS team (owner/admin) = full dashboard, all data, all admin controls
- [x] Client roles = scoped portal, only their org's ventures/SPVs/tasks/distributions
- [x] Add isAtlasTeam() helper in rbac.ts to check if user is owner or admin

### Org-Scoped Data Filtering (Backend)
- [x] Filter ventures by user's organizationId via org_venture_access table
- [x] Filter SPVs by ventures the org has access to
- [x] Filter tasks by ventures the org has access to
- [x] Filter distributions — ATLAS sees all, clients see all (venture-link deferred)
- [x] ATLAS team bypasses all filters (sees everything)

### Client Portal Layout (Frontend)
- [x] Scoped sidebar: hide admin-only pages (Security, Access, Agent, Team, Settings)
- [x] Client sees: Dashboard, Ventures, SPVs, Tasks, Distributions, Activity, Profile
- [x] Dynamic dashboard subtitle: ATLAS sees "ROYALTON VENTURE HOLDING", clients see "Client Portal"
- [x] Route guards: RequireAtlas wrapper redirects clients away from admin pages
- [x] Quick actions (New Venture/Task/SPV) hidden for clients
- [x] Intelligence queries (Daily Brief, Smart Alerts, Doc Intel) disabled for clients
- [x] Bottom tab bar on mobile shows role-appropriate nav items

### ATLAS Admin Dashboard Enhancements
- [x] ATLAS team sees all data across all orgs (no filter needed yet — all data visible)
- [ ] Add org filter dropdown to dashboard for per-client view — deferred for future
- [ ] Show org badge on ventures/SPVs — deferred for future

### Tests
- [x] Vitest tests for isAtlasTeam helper (owner/admin = true, all others = false)
- [x] Vitest tests for org-scoped data filtering logic (null = see all, array = filtered)
- [x] Vitest tests for role-based navigation visibility (ATLAS nav vs client nav)
- [x] Vitest tests for route guards (ATLAS-only routes blocked for clients)
- [x] Vitest tests for dashboard subtitle by role
- [x] Updated routers.test.ts with authenticated context for protectedProcedure

- [x] Remove old hardcoded ACCESS_KEYS gate from SpyOps landing page — replaced with OAuth sign-in button, auth-aware hero CTA

## Settings — Personal Information, Notifications, Security (Persistent)

### Personal Information
- [x] Save/load user profile fields (name, timezone) to DB via settings.updateProfile
- [x] Load profile data from settings.getProfile on page load
- [x] Edit mode with save/cancel, toast confirmation, loading states
- [ ] Profile photo upload to S3 — deferred

### Notifications
- [x] Created user_preferences table with all notification fields
- [x] Save/load notification channel toggles (email, push, Slack) from DB
- [x] Save/load alert type toggles (task complete, distribution, login, overdue, weekly) from DB
- [x] Batch save with "Save Notification Settings" button and unsaved changes indicator

### Security
- [x] Display active sessions from DB (last activity, browser type, IP)
- [x] Session termination (end individual sessions)
- [x] Security posture overview with real session/key counts
- [x] API keys display from DB with prefix, status, and last used time
- [x] Real audit log from DB with action type, result, and timestamp

### Tests
- [x] All 128 existing tests passing
- [x] Backend procedures tested via existing router test suite

## Preview as Client Mode

- [x] Create PreviewMode context provider with toggle state
- [x] Add "Preview as Client" toggle button in admin top bar (eye icon + dropdown menu item)
- [x] Override role checks (isAtlasTeam, sidebar nav, route guards) when preview mode is active
- [x] Show amber "CLIENT PREVIEW MODE" banner at top when active
- [x] Exit preview mode via banner button, top bar icon, or dropdown menu
- [x] Dashboard switches to "Client Portal" subtitle in preview mode
- [x] Intelligence queries disabled in preview mode
- [x] Quick actions hidden in preview mode
- [x] Avatar changes to amber color in preview mode

## UHNWI/HNWI Client Portal Redesign

### Design Language
- [x] Luxury private banking aesthetic — spacious, clean, premium
- [x] Large typography with generous letter-spacing (Inter/Playfair Display mix)
- [x] Generous whitespace — no compact layouts, breathable spacing
- [x] Subtle gold/champagne accent on dark background
- [x] Card-based layout with soft shadows and rounded corners (16-20px radius)
- [x] Smooth micro-animations (fade, slide, scale) for premium feel

### Client Layout
- [x] Dedicated ClientPortal layout component (ClientDashboard.tsx)
- [x] Minimal bottom tab bar (3-4 items max) with elegant icons
- [x] No sidebar on mobile — full-width content
- [x] Premium header with greeting and portfolio value
- [ ] Pull-down gesture area for refresh — deferred

### Client Dashboard
- [x] Hero greeting card with name, portfolio value, and performance indicator
- [x] Large venture cards with sector icons, status badges, and key metrics
- [x] Recent activity feed — clean timeline style
- [x] Upcoming distributions section with amounts and dates

### Client Detail Views
- [ ] Venture detail — full-width hero, key metrics, documents, updates — deferred
- [ ] SPV detail — clean card layout with investment summary — deferred
- [ ] Distribution history — timeline with amounts and status badges — deferred

### Mobile-First
- [x] All touch targets minimum 48x48px
- [x] Full-width cards with 20-24px horizontal padding
- [x] Large text (16px base, 24-32px headings)
- [x] Safe area padding for notch/home indicator

## ATLAS Admin Dashboard — Analytics Command Center

### Dashboard Redesign
- [x] Dense analytics grid with 6 KPI cards (ventures, SPVs, tasks, completion rate, distributions, AI velocity)
- [x] AI Velocity Tracker — show 43% task completion acceleration metric with banner
- [x] Fund Management section — AUM, deployed capital, pipeline value, IRR
- [x] Venture Pipeline bar visualization (Validation → Active → Fundraising → On Hold)
- [x] Task velocity shown in KPI cards with sparkline trends
- [x] Sector allocation breakdown with donut chart
- [x] Team summary with internal/external/advisor breakdown
- [x] Real-time activity stream with live indicator

### Data-Rich Views
- [x] Dense data table for Active SPVs & Deals with priority/stage columns
- [x] SPV deal pipeline with stage progression in pipeline bar
- [x] Distribution list with paid/scheduled/cancelled status
- [ ] Portfolio health heatmap across all 30+ ventures — deferred

## Partnership-Specific Analytics Dashboard

### Dashboard Redesign
- [x] Replace aggregated KPI averages with per-venture/partnership analytics
- [x] Add venture analytics cards showing each partnership's tasks, completion rate, velocity, status
- [x] Per-venture task breakdown: open, completed, overdue counts
- [x] Per-venture completion rate and AI velocity metric
- [x] Per-venture status indicator (healthy, at risk, needs attention)
- [x] Sortable/filterable venture analytics grid (search + sector filter + grid/table toggle)
- [x] Keep top-level portfolio summary KPIs but add "drill into partnership" capability
- [x] Backend query for venture-grouped task analytics (uses existing tRPC queries)
- [x] Tests for partnership-specific analytics data (168 tests passing)

## Branding Fix & Organizational Member Mapping

### Branding
- [x] Fix dashboard context — ventures belong to Royalton (client), ATLAS is the managing firm
- [x] Update subtitle/header to reflect "ROYALTON PORTFOLIO · MANAGED BY ATLAS"
- [x] Ensure ATLAS branding is about the tool/platform, not the venture owner

### Organizational Member Mapping
- [x] Show which team members are assigned to which ventures/partnerships
- [x] Org Map section on dashboard — shows all members with type badges (INT/EXT/ADV), roles, and venture counts
- [x] Display member roles and venture assignments in Org Map with 76 total assignments
- [x] Add member avatars (initials) and count per venture on partnership cards + table view
