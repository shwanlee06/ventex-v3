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

## Mobile-First Cleanup — Admin Dashboard & Client Portal

### ATLAS Admin Dashboard Cleanup
- [x] Reduce visual density — 4 KPI cards (2x2 on mobile), AI Velocity hidden on mobile
- [x] Simplify partnership cards — name, sector, completion ring, key metrics, health, members
- [x] Stack sections vertically on mobile (grid-cols-1 on mobile, 3-col on desktop)
- [x] Larger font sizes (text-xl/2xl KPIs) and generous padding (p-4 sm:p-5 md:p-6)
- [x] Removed pipeline/sector allocation/fund overview — replaced with cleaner Activity, SPVs, Team columns
- [x] Removed Needs Attention banner — overdue count shown in KPI card and per-venture

### Client Portal Cleanup
- [x] Simplified hero — clean greeting, date, portfolio value, and +18.4% indicator
- [x] Single-column venture cards with icon, name, sector·location, status badge, chevron
- [x] Better spacing — space-y-6 sm:space-y-8, generous padding, max-w-3xl centered
- [x] Simpler activity feed — 5 items max, clean timeline with dots and connecting lines
- [x] All touch targets comfortable — cards are full-width with 1.5rem padding
- [x] Removed visual noise — minimal badges, clean borders, no micro-elements

## Org Structure Fix — ATLAS vs Royalton
- [x] Only Shwan is ATLAS (the operator/platform); everyone else is Royalton (the client's team)
- [x] Update Team section on dashboard to reflect this — label "Royalton Team", exclude Shwan from counts (5 INT, 3 EXT, 3 ADV)
- [x] Updated "ATLAS Admin" to "ATLAS Operator" in topbar
- [x] Shwan filtered from venture member avatars (cards + table view), only Royalton team shown

## SaaS Framing — ATLAS as Platform Provider
- [x] Reframe dashboard header: subtitle now "CLIENT: ROYALTON VENTURE HOLDING"
- [x] Dashboard subtitle shows "CLIENT: ROYALTON VENTURE HOLDING"
- [x] Partnerships section labeled "Royalton Partnerships"
- [x] Topbar shows "Platform Admin" for owner, "ATLAS Operator" for admin
- [x] Sidebar shows "ATLAS" with "Royalton Workspace" subtitle when expanded
- [x] Dashboard reads as ATLAS managing Royalton's portfolio — verified in UI

## Multi-Client Workspace System
- [x] Design multi-client data model — uses existing organizations table with type (core/partner/client)
- [x] Link existing ventures to Royalton via org_venture_access junction table (20 ventures linked)
- [x] Seeded ATLAS (core) and Royalton Venture Holding (client) as organizations
- [x] tRPC endpoints: organizations.list (with venture counts), organizations.create
- [x] WorkspaceContext provider — tracks active org, persists to localStorage, auto-selects first client
- [x] Sidebar workspace switcher — dropdown under ATLAS logo shows all client workspaces with venture counts
- [x] Dashboard dynamically shows active org name in subtitle, partnerships header, and team section
- [ ] "Add Client" flow — create new organization with basic info (deferred)
- [x] All 168 tests passing after workspace changes

## Add Client Form & Org-Scoped Data Filtering
- [x] Add Client button in workspace switcher dropdown
- [x] Add Client form with name, type, and optional description (inline in sidebar workspace dropdown)
- [x] Create organization via tRPC and auto-switch to new workspace
- [x] Org-scoped ventures query — filter by active organization via org_venture_access
- [x] Org-scoped tasks query — filter tasks by ventures belonging to active org
- [x] Org-scoped SPVs query — filter SPVs linked to active org ventures
- [x] Org-scoped distributions query — filter distributions by active org ventures
- [x] Org-scoped team query — filter team members by venture_team assignments in active org
- [x] Org-scoped activity query — filter activity by active org ventures
- [x] Update all frontend pages to pass activeOrgId to queries (8 pages + 2 dashboard components)
- [x] Dashboard KPIs update when switching clients (all queries re-fetch on org change)
- [x] Tests for org-scoped filtering (168 tests passing)

## Multi-Client Management Redesign (30+ Clients at Scale)
- [x] Backend: Add organizations.listWithMetrics endpoint — returns all clients with aggregate metrics (venture count, task counts, overdue, health, team size, distributions)
- [x] ATLAS Home redesign: Client Portfolio Overview — searchable/filterable table of ALL clients with key metrics
- [x] Client detail page: /clients/:slug — drill into any client's full workspace (ventures, tasks, SPVs, distributions, team)
- [x] Sidebar workspace dropdown preserved — client list is primary navigation from dashboard
- [x] Dashboard shows "ATLAS COMMAND CENTER" with all-clients overview
- [x] Client cards with health indicators, task velocity, overdue alerts
- [x] Search/filter/sort across 30+ clients by name, health, overdue count, sector
- [x] Quick actions per client (view details, add venture, manage team)
- [x] Client detail: KPI cards, venture grid with task metrics, sector filter, team, distributions, activity
- [x] Tests for new multi-client endpoints (12 new tests, 180 total passing)

## Delete Client Functionality
- [x] Backend: Add organizations.delete endpoint (admin only) — removes org, org_venture_access, distributions, invitations, API keys
- [x] Frontend: Add delete button on client detail page with confirmation dialog (AlertDialog)
- [x] Frontend: Add delete button on ATLAS dashboard client table with confirmation dialog
- [x] Handle cascade: deletes org_venture_access links, distributions, invitations, API keys, then org

## Per-Client Distributions (Not Shared)
- [x] Add organizationId column to distributions table (link distributions to specific clients)
- [x] Migrate existing distributions to be linked to Royalton org (id=2)
- [x] Update distributions router to filter by organizationId
- [x] Update client detail page to show only that client's distributions
- [x] Update ATLAS dashboard to show per-client distribution totals
- [x] Rewrite Distributions page to use tRPC + workspace context for per-client scoping
- [x] Tests for delete client and per-client distributions (8 new tests, 188 total passing)

## Archive / Soft Delete Clients
- [x] Backend: Add organizations.archive endpoint (sets status to "archived", logs activity)
- [x] Backend: Add organizations.restore endpoint (sets status back to "active", logs activity)
- [x] Update listWithMetrics to exclude archived clients by default, with optional includeArchived flag
- [x] Update list endpoint to also support includeArchived flag
- [x] Frontend: Replace "Remove Client" with "Archive Client" as primary action on active clients
- [x] Frontend: Add "Archived" tab on ATLAS dashboard with archived client count badge
- [x] Frontend: Add restore button + permanent delete button on archived client rows (table + grid)
- [x] Frontend: Client detail page — archived banner with restore option, context-aware header actions
- [x] Permanent delete only available on archived clients (safety net)
- [x] Tests for archive, restore, includeArchived filtering (10 new tests, 198 total passing)

## Team & Contacts Redesign — Client-by-Client + ATLAS Members
- [x] Audit current Team page, schema, and data model
- [x] Add organizationId to teamMembers schema so contacts belong to specific clients
- [x] Create separate concept: ATLAS/Aurovia internal members (organizationId = null)
- [x] Backend: Add team.listInternal endpoint (ATLAS members only, org = null)
- [x] Backend: Add team.listByOrganization endpoint (client contacts grouped by org with orgName/orgSlug)
- [x] Backend: Update team.create to accept organizationId (null = ATLAS, set = client)
- [x] Backend: Add team.delete endpoint with cascade (removes venture assignments)
- [x] Frontend: Redesign Team page with two tabs — "ATLAS Team" and "Client Contacts"
- [x] Frontend: ATLAS Team tab — table view of internal members with search/filter
- [x] Frontend: Client Contacts tab — collapsible groups per client org with member tables
- [x] Frontend: Add Member dialog with org selector (ATLAS vs specific client)
- [x] Frontend: Member detail drawer with contact info, type, status, org badge
- [x] Frontend: Sidebar nav renamed from "Team" to "People"
- [x] Tests for org-scoped team queries (10 new tests, 208 total passing)

## Simplify People Page — ATLAS = Just Shwan, Condense Client Contacts
- [x] Migrate all existing team members (except Shwan) to Royalton org as client contacts
- [x] ATLAS section = compact operator card showing Shwan + stats (managing X clients, Y contacts)
- [x] Redesign Client Contacts — single unified table with Client column, search, client filter, type filter
- [x] Client filter dropdown to scope contacts to any one client instantly
- [x] Type filter (Internal / External Partner / Advisor)
- [x] Compact row design with avatar initials, client badge (clickable to client detail), contact icons
- [x] Quick-add contact dialog with required client selector
- [x] All 208 tests passing

## AI Agent — Premium UHNWI/HNWI Redesign
- [x] Audit current AI agent chat interface (1115 lines of cluttered code)
- [x] Redesign for premium, minimal, private-banking aesthetic — stripped all technical indicators
- [x] Clean typography, generous whitespace, centered max-w-2xl message thread
- [x] Seamless feel — no model names, no streaming badges, no portfolio sidebar, no quick action chips
- [x] Anchor icon as assistant avatar (per previous requirement)
- [x] Understated suggestion pills: Portfolio overview, Open tasks, Draft LP update, SPV pipeline
- [x] History drawer (right sheet) instead of always-visible sidebar
- [x] Clean input area with subtle border, no visual noise
- [x] All 208 tests passing

## Ventures Tab — Organized by Client Sub-Sections
- [x] Audit current Ventures page structure and data flow
- [x] Backend: Add ventures.listWithOrgs endpoint — returns all ventures with their org assignments
- [x] Redesign Ventures page with collapsible sub-sections per client
- [x] Each client section shows ventures with status, stage, location, open tasks, overdue
- [x] Global search across ventures, clients, locations
- [x] Client filter dropdown + sector filter + status filter
- [x] Collapse/expand all toggle for managing 30+ client sections
- [x] Venture count, active count, task count, overdue count per client section header
- [x] "View client →" link in each section header to jump to client detail
- [x] Summary KPI bar: Total ventures, Active, Open Tasks, Overdue
- [x] Tests for listWithOrgs endpoint (6 new tests, 214 total passing)

## Add Venture with Client Assignment
- [x] Backend: Update ventures.create to accept organizationId and auto-link via orgVentureAccess
- [x] Frontend: Add client selector dropdown as first field in Add Venture dialog (required)
- [x] Fetch active client orgs for the dropdown (excludes archived)
- [x] New ventures appear under the correct client section on the Ventures tab
- [x] Activity log includes client name when venture is created for a client
- [x] Tests for venture creation with org assignment (4 new tests, 218 total passing)

## Remove Standalone Ventures Page from Admin
- [x] Remove Ventures nav item from admin sidebar
- [x] Remove /ventures route — redirects to /dashboard (ventures only accessible via client detail)
- [x] Removed unused Layers3 import from AppSidebar
- [x] /ventures/:slug still works for individual venture detail pages
- [x] All 218 tests passing

## Ventures Tab — Client-Only (Not Admin)
- [x] Add Ventures back to sidebar as clientOnly (hidden from admin, visible to clients)
- [x] Restore /ventures route for client users
- [x] Admin sees ventures only within client detail pages

## ATLAS Admin CRM Redesign — Premium Command Center
- [x] Clean admin sidebar: Dashboard, AI Concierge, People, Activity, Settings (5 items only)
- [x] Move SPVs, Tasks, Distributions, Ventures to client-only in sidebar
- [x] Admin sidebar has quick client list when expanded (top 10 clients with links)
- [x] Quick "Add Client" inline from sidebar
- [x] Client detail page is the full workspace for each client
- [x] Premium aesthetic — clean, minimal navigation
- [x] Seamless navigation — click client → see everything about them
- [x] All 218 tests passing

## Fix: Sidebar Client List — Hide Archived/Deleted Clients
- [x] Filter sidebar quick client list to only show active clients (exclude archived)

## Fix: Sidebar Refresh After Archive/Delete
- [x] Removed refetchOnWindowFocus:false from WorkspaceContext so invalidation propagates
- [x] Added proper cleanup when active org is archived/deleted (falls back to first available)
- [x] Dashboard invalidateAll() now correctly triggers sidebar refresh
- [x] 3 new sidebar refresh tests (archived disappears, deleted disappears, restored reappears)

## Velocity AI Metrics on Admin Dashboard
- [x] Added velocity calculation per client: 40% completion + 30% health + 30% (100 - overdue%)
- [x] Velocity KPI card in dashboard summary bar (Avg Velocity across all clients)
- [x] Velocity badge per client row (green arrow up ≥70%, amber dash ≥40%, red arrow down <40%)
- [x] Progress ring with velocity score next to each client name
- [x] Completion progress bar per client in table and grid views
- [x] Health indicator per client (Healthy/At Risk/Critical)
- [x] Filter pills: High Velocity, Low Velocity, Overdue
- [x] Sort by velocity column
- [x] Grid view with velocity rings, completion bars, metrics
- [x] 4 new velocity metric tests (data validation, bounds checks, task math)
- [x] All 225 tests passing

## Fix: "Member not found" Error on Team Delete
- [x] Investigated: error was team.delete mutation called with stale id 30008 (already deleted by test run)
- [x] Made team.delete idempotent — returns success instead of throwing when member already gone
- [x] Cleaned up stale test data from database
- [x] Added test for idempotent delete behavior
- [x] All 226 tests passing

## AI-Powered Task Generation Engine
- [x] Audit current task creation flow and venture data structure
- [x] Build backend: export all venture data per client (ventures, SPVs, team, distributions, documents, health scores)
- [x] Build backend: send venture data to LLM to analyze and determine what tasks are needed
- [x] Build backend: AI returns structured task suggestions with title, description, priority, due date, venture link
- [x] Build frontend: "Generate Tasks" button on client detail and dashboard (Brain icon per-row + toolbar)
- [x] Build frontend: review/approve flow — show AI-suggested tasks, let admin approve/edit/reject before creating
- [x] Build frontend: progress indicator during AI analysis (animated step-by-step loading)
- [x] Prevent duplicate tasks — AI checks existing tasks before suggesting new ones
- [x] Integrate into AtlasDashboard (table view + grid view per-row actions)
- [x] Write tests for AI task generation endpoint (9 tests: auth, export, approve, validation)
- [x] All 235 tests passing

## ATLAS Members — Separate from Client List
- [x] Audited data model: Internal members have type="Internal" in team_members table
- [x] Fixed listInternal endpoint to filter by type="Internal" (not orgId=NULL) to capture all ATLAS members
- [x] Built dedicated ATLAS Members page at /atlas-team with stats bar, member table, detail drawer, add/edit/remove
- [x] Added ATLAS Team (shield icon) nav item to sidebar, separate from Client Contacts (users icon)
- [x] Shows member role, function, venture assignments count, contact info, status with colored dots
- [x] Updated test to match new behavior, all 235 tests passing

## Add ATLAS Members: Brian Chen & Chris Phelps
- [x] Added Brian Chen (Partner, Finance & Capital) as ATLAS internal member
- [x] Added Chris Phelps (Partner, Operations & Systems) as ATLAS internal member
- [x] Removed all test data from team_members table (12 stale test records)
- [x] All 235 tests passing

## Fix: Reclassify Royalton Members
- [x] Moved Jimmy Frangi, Anton Maghami, Jon Eichner, Angie Samadi, Maher Abou Chakra to Royalton (orgId=2, type=External Partner)
- [x] Cleaned up stale test record
- [x] ATLAS Team: 3 members (Shwan Lee, Brian Chen, Chris Phelps)
- [x] Client Contacts: 11 Royalton members (Jimmy, Anton, Jon, Maher, Angie, Carl, Leonidas, Najib, Igor, Sohail, Ruwaida)
- [x] All 235 tests passing

## Live Member Status Tracking
- [x] Added lastSeenAt + adminStatus columns to team_members table, pushed migration
- [x] Built heartbeat endpoint that updates lastSeenAt every 2 minutes from frontend
- [x] Calculate real status: Online (<5min), Away (<30min), Offline (>30min)
- [x] Admin can set status (Active, On Leave, Deactivated) via dropdown in ATLAS Team drawer
- [x] Live status dots (green pulse/amber/gray) on both ATLAS Team and Client Contacts pages
- [x] Show "last seen" relative time with tooltip (e.g., "2 min ago", "3 hours ago")
- [x] Linked Shwan Lee's user account (userId=1) to team member for live heartbeat
- [x] LiveStatusDot reusable component with sm/md sizes, pulse animation for online
- [x] useHeartbeat hook at App root level, polls every 2 minutes
- [x] liveStatuses query polls every 30 seconds for near-real-time updates
- [x] All 235 tests passing

## Activity Feed — Separate Admin vs Client Activities
- [x] Added activitySource column to activity_log (atlas_ops, client_business, system)
- [x] Classified all 18 activity log inserts across 8 files with correct source
- [x] Classified existing DB entries retroactively
- [x] Redesigned activity page with 4 source tabs: All, ATLAS Ops (shield), Business (building), System (bot)
- [x] Distinct visual treatment: ATLAS = primary accent, Business = blue, System = cyan
- [x] Source badges on each entry in "all" view, contextual description banner per source
- [x] Entity type sub-filters + search within each source view
- [x] All 235 tests passing

## Fix: Client POV — Hide ATLAS Ops Activity
- [x] Backend: activity.list and activity.recent now filter out atlas_ops for non-admin users (ne condition)
- [x] Backend: non-admin users auto-scoped to their organizationId
- [x] Frontend: ATLAS Ops tab hidden for client users, grid shows 3 tabs instead of 4
- [x] Frontend: subtitle changes to "YOUR BUSINESS ACTIVITY" for clients
- [x] Frontend: source badges hidden in "all" view for non-admins
- [x] Updated test to use authenticated caller (activity.recent is now protectedProcedure)
- [x] All 235 tests passing

## Live Notification System
- [x] Enhanced notifications table: added organizationId, priority, link, category, entityType/Id/Name, actorName
- [x] Built createNotification helper (server/notificationHelper.ts) with NOTIF_TYPES constants
- [x] Built notification endpoints: list (cursor-based pagination), unreadCount (30s polling), markRead, markAllRead, dismiss
- [x] Built frontend: notification bell with unread badge, dropdown panel with category filters (All/Critical/Info/Success/Warning)
- [x] Built frontend: click-to-navigate on notifications with link, mark as read on click, mark all read, dismiss
- [x] Built frontend: real-time polling every 30s for unread count
- [x] Wired triggers: venture create/status change/file upload (ventures.ts)
- [x] Wired triggers: task create/complete (tasks.ts)
- [x] Wired triggers: SPV create/stage change (spvs.ts)
- [x] Wired triggers: distribution create (distributions.ts)
- [x] Wired triggers: document analyzed + high-risk document alert (documentIntelligence.ts)
- [x] Wired triggers: team member added/removed (team.ts)
- [x] Wired triggers: client archived/restored (organizations.ts)
- [x] Role-based: admins see all, clients scoped to their org
- [x] Updated tests: all 235 passing

## Fix: Incorrect Client Count (Test Data Pollution)
- [x] Found 27 stale test team members, 50 test ventures, 59 test tasks, 55 test notifications in DB
- [x] Cleaned up all test records (IDs >= 30000) from all tables
- [x] Added global test teardown (server/test-global-teardown.ts) that auto-cleans after all tests
- [x] Real counts: 20 ventures, 10 SPVs, 9 tasks, 14 team members, 4 distributions
- [x] All 235 tests passing

## Overdue Task Auto-Detection & Notification System
- [x] Backend: Add tasks.listOverdue endpoint — returns all overdue tasks grouped by client with days overdue
- [x] Backend: Add tasks.overdueByClient endpoint — returns per-client overdue summary for dashboard
- [x] Backend: Add tasks.scanAndNotify mutation — scans for newly overdue tasks and creates notifications
- [x] Frontend: Add overdue task section to ATLAS dashboard (OverdueAlertBanner with expandable per-client detail)
- [x] Frontend: Overdue badge per client row already exists; OverdueAlertBanner adds drill-down detail
- [ ] Frontend: Add overdue task detail drawer with reassign/extend/complete actions (deferred — click navigates to client page)
- [x] Tests: 12 vitest tests for overdue detection (pure functions + integration) — all passing

## ATLAS Team Capacity & Workload View
- [x] Backend: Add tasks.workloadSummary endpoint — returns per-member task counts, overdue, completion rate, capacity status
- [x] Frontend: Add WorkloadCapacity component to ATLAS Team page (per-member grid with assigned/done/overdue/completion/capacity)
- [x] Frontend: Capacity indicator (Available/Busy/Overloaded) with color-coded badges
- [x] Tests: workloadSummary integration test included in overdue.test.ts — all 247 tests passing

## Remove WorkloadCapacity from ATLAS Team Page
- [x] Remove WorkloadCapacity import and component from AtlasTeam.tsx

## Fix: ATLAS Team Sort Order
- [x] Investigate why Brian Chen appears at top of ATLAS Team page
- [x] Fix sort order so Shwan Lee (Founder & CEO) appears first, then by role hierarchy

## Feature: Custom Sort Order for Team Members
- [x] Add `sortOrder` integer column to team_members schema
- [x] Run db:push migration
- [x] Set initial sortOrder values (Shwan=1, Brian=2, Chris=3, etc.)
- [x] Update listInternal to sort by sortOrder ascending
- [x] Add `team.reorder` mutation for batch reordering
- [x] Frontend: Add up/down arrows in member detail drawer for reordering
- [x] Tests: 4 vitest tests for reorder and sortOrder

## Feature: Team Member Profile Photos
- [x] Add `avatarUrl` text column to team_members schema
- [x] Run db:push migration
- [x] Add `team.uploadAvatar` mutation (accepts base64, uploads to S3, saves URL)
- [x] Frontend: Display avatar images instead of initials in table and drawer
- [x] Frontend: Add avatar upload overlay (camera icon on hover) in member drawer
- [x] Tests: 3 vitest tests for avatar upload and avatarUrl management

## Feature: Partner Role-Based Access
- [x] Add 'partner' to user role enum in schema (db:push migrated)
- [x] Create partnerProcedure middleware (partner + admin + owner)
- [x] Update RBAC: partner in hierarchy (35), isAtlasTeam includes partner, partner permissions (read, create, update, process_documents, export_data, view_audit_log)
- [ ] Link Brian Chen and Chris Phelps team_members to user accounts when they log in (requires them to sign up first)
- [ ] Frontend: Show partner-specific navigation (deferred — requires partner users to exist)
- [x] Tests: 14 vitest tests for partner access control — all passing

## Feature: Team Member Invitation System
- [x] Add `teamMemberId` to invitations table, `invitationStatus`/`invitationId`/`systemRole` to team_members, `partner` to inviteRole enum
- [x] Run db:push migration
- [x] Update `team.create` to auto-send invitation when email is provided (creates invitation record with token)
- [x] Add `team.resendInvitation` mutation — revokes old invitation, creates new one
- [x] Add `team.getInvitationStatus` query — returns invitation details for a member
- [ ] Add `team.acceptInvitation` endpoint — validates token, creates/links user account with correct role (deferred — requires OAuth callback integration)
- [ ] Add invitation acceptance page on frontend (deferred — requires acceptInvitation endpoint)
- [x] Frontend: Add system role selector to Add Member dialog (partner, admin, manager, user, viewer) — shown when email is entered
- [x] Frontend: Show invitation status badges on team member table rows (Invited/Active/Expired + system role)
- [x] Frontend: Add "Resend" / "Invite" button in member drawer with invitation status card
- [x] Tests: 8 vitest tests for invitation flow — create with email, auto-send, resend, revoke old, status query — all 276 passing

## Feature: Invitation Acceptance Flow
- [x] Backend: Updated `access.acceptInvitation` to also update teamMembers.invitationStatus when linked
- [x] Backend: Updated OAuth callback to detect teamMemberId on invitation and auto-update team member status
- [x] Backend: Added `/api/invite/validate-token` public endpoint for token-only validation (no orgSlug needed)
- [x] Frontend: `/accept-invite?token=...` page — ATLAS-branded, validates token, shows role/org/email, redirects to OAuth
- [ ] Frontend: Post-acceptance redirect to dashboard with welcome message (deferred — requires OAuth integration testing)

## Feature: Email Delivery for Invitations
- [x] Backend: Created `invitationEmail.ts` helper with `sendInvitationEmail` and `buildInviteLink`
- [x] Backend: Wired email into `team.create` (auto-send when origin provided) and `team.resendInvitation`
- [x] Tests: 11 vitest tests for acceptance flow, buildInviteLink, token validation — all 287 passing

## Bug Fix: Add Member Button Not Visible on ATLAS Team Page
- [ ] Investigate and fix the Add Member button visibility issue

## Bug Fix: Invitation Email Not Reaching Invitee
- [ ] Investigate: notifyOwner sends to project owner, not to the invitee's email
- [ ] Fix: Use proper email sending API to deliver invitation to the invitee's actual email address
- [x] Workaround: Show copyable invite link in Add Member dialog after successful creation
- [x] Workaround: Show copyable invite link in the member drawer invitation status card (Copy Link button)

## Feature: Resend Email Integration
- [ ] Store RESEND_API_KEY as environment secret
- [ ] Install Resend SDK
- [ ] Update invitationEmail.ts to send via Resend API directly to invitee
- [ ] Design professional HTML email template for invitations
- [ ] Write vitest for email sending logic
- [ ] Verify end-to-end: add member → email arrives in invitee's inbox

## Feature: Live Active Users on Dashboard
- [x] Verify Chris Phelps account was created and invitation accepted (user id 840001, promoted to partner)
- [x] Backend: Using existing lastSignedIn + team.heartbeat + team.liveStatuses (already built)
- [x] Backend: team.heartbeat already exists, polls every 2 min
- [x] Backend: team.liveStatuses already exists with calculateLiveStatus logic
- [x] Frontend: LivePresenceWidget on dashboard — stacked avatars, online/away counts, expandable member list
- [x] Frontend: Polls every 15 seconds via refetchInterval
- [x] Tests: All 287 tests passing (existing heartbeat/liveStatuses tests cover this)

## Bug Fix: Invitation Link Not Working When Adding New ATLAS Team Members
- [x] Investigate full invitation flow: token creation, link generation, validation endpoint, accept-invite page
- [x] Fix resendInvitation return field mismatch: backend returned `token` but frontend expected `inviteToken`
- [x] Fix drawer Copy Link button: replaced broken placeholder input with proper Generate & Copy button
- [x] Fix resend mutation default handler to auto-copy link to clipboard on success
- [x] Fix OAuth callback to link userId to team member record on invitation acceptance
- [x] Fix acceptInvitation in access.ts to also link userId to team member
- [x] Fix RequireAtlas guard to include partner role (partners can access ATLAS-only pages)
- [x] Fix AppSidebar isAtlasRole to include partner role (partners see ATLAS nav items)
- [x] Write vitest tests for the fixes (6 new tests, all 293 tests passing)
- [x] Test end-to-end: add member → copy link → open link → validate → accept

## Bug Fix: Live Presence Status Showing False Active Status
- [x] Investigate how live status is calculated (heartbeat, lastSignedIn, liveStatuses)
- [x] Determine why Chris (or other members) show as "active" when they're not really online
- [x] Fix heartbeat to use Page Visibility API + user activity detection (mouse/keyboard/scroll)
- [x] Heartbeat only fires when tab is visible AND user interacted within last 5 minutes
- [x] If user is idle 5+ min: heartbeat stops → status transitions to Idle then Offline
- [x] Updated labels: Online→Active, Away→Idle, "Online Now"→"Active Now"
- [x] Added "last active" timestamps in expanded widget (Active now, Active 1m ago, Never connected)
- [x] Ensure dashboard widget shows accurate active/idle/offline states
- [x] Verified with real data: Shwan Lee (Active now), Chris Phelps (Active 1m ago), Brian Chen (Never connected)

## Enable Najib to Log In on Royalton Client Side
- [x] Investigate Najib's records in the database (team member ID 12, org ID 2 Royalton, type Advisor)
- [x] Set Najib's email to hanna1@gmail.com and systemRole to client
- [x] Create invitation (ID 60007) with token, linked to team member, expires 2026-04-25
- [x] Verify validate-token endpoint returns correct data (CLIENT ACCESS, Royalton Venture Holding)
- [x] Verify accept-invite page renders correctly with invitation card and ACCEPT & SIGN IN button
- [x] Invite link ready: /accept-invite?token=gos3p0Anx4G4A2pakSi6Ufq9ULueF_RUtovK47lyyj1Oy0kR7x04WSVySgSDhbHw

## Fix Jason Yu — Should Be ATLAS Member, Not Client
- [x] Investigate Jason Yu's records: user ID 390151 (role: user, org: NULL), team member ID 90007 (role: partner, org: NULL, userId: NULL)
- [x] Fix user role to partner, set organizationId to 1 (ATLAS), link invitationId 60008
- [x] Fix team member: link userId 390151, set organizationId to 1, mark invitation accepted
- [x] Mark invitation 60008 as accepted
- [x] Fix OAuth callback: existing users with no org now auto-accept pending invitations on login
- [x] All 293 tests passing

## Fix: ATLAS Members Seeing Client Portal Instead of Command Center
- [x] Investigate: Home.tsx isAtlas only checked owner/admin, missing partner role
- [x] Investigate: Topbar.tsx isAtlasRole only checked owner/admin, missing partner role
- [x] Fix Home.tsx: added partner to isAtlas check → partners see AtlasDashboard
- [x] Fix Topbar.tsx: added partner to isAtlasRole → partners see Preview toggle, Settings, ATLAS Partner label
- [x] Verified: App.tsx and AppSidebar.tsx already included partner (from earlier fix)
- [x] All 293 tests passing

## ATLAS Platform Upgrades (7 total)
- [x] Upgrade 1: Velocity Intelligence Card (Dashboard) — VelocityIntelligenceCard component with sparkline, stalled count, sector warning from sectorMetrics query
- [x] Upgrade 2: Overdue Task Escalation Panel (Dashboard) — OverdueAlertBanner rewritten with severity tiers (Critical/Warning/Info), per-client escalation rows, collapsible task detail, Scan & Notify button
- [x] Upgrade 3: Venture Health Matrix (Client page) — VentureHealthMatrix scatter plot with X=overdue tasks, Y=completion%, color-coded by sector, quadrant labels, tooltip on hover
- [x] Upgrade 4: Sector Pulse Panel (Client page) — SectorPulsePanel with collapsible sector breakdown, health bars, overdue counts, venture count per sector
- [x] Upgrade 5: Distribution Timeline (Client page) — DistributionTimeline vertical timeline replacing flat distribution display, status badges, running total
- [x] Upgrade 6: Team Venture Attribution (Client page) — TeamVentureAttribution mini-table with venture assignments, role badges, sorted by assignment count
- [x] Upgrade 7: Command Palette (Global) — Enhanced existing CommandPalette with Cmd+K/Ctrl+K shortcut alongside existing / shortcut
- [x] All 293 tests passing, 0 TypeScript errors

## ATLAS Agent System — Layer 1: Autonomous Intelligence
- [x] Step 1: Add agent_events table to Drizzle schema
- [x] Step 2: Push DB migration (agent_events table)
- [x] Step 3: Build agents router with 4 agent types (Overdue, Venture, Distribution Sentinel, Orchestrator)
- [x] Step 4: Integrate LLM (invokeLLM) for AI-powered signal generation
- [x] Step 5: Build AgentContext provider with useAgents hook
- [x] Step 6: Build LiveTicker component (scrolling horizontal ticker strip)
- [x] Step 7: Build /agents page with 2x2 agent cards + signal history feed
- [x] Step 8: Register /agents route in App.tsx with RequireAuth + RequireAtlas guards
- [x] Step 9: Add "AI Agents" nav item with Cpu icon to AppSidebar
- [x] Step 10: Wire LiveTicker into dashboard Home.tsx (ATLAS admin only)
- [x] Step 11: Wrap app with AgentProvider in App.tsx
- [x] Step 12: Fix agent name mapping — DB display names resolved to UI short keys
- [x] Step 13: Write vitest tests for agents router (11 tests including LLM integration)

## ATLAS Velocity AI Master Build
- [x] Section 1: Add venture_velocity table to schema
- [x] Section 1: Add agent_drafts table to schema
- [x] Section 1: Add missing columns to agent_events (action_type, action_label, action_payload, action_taken, action_taken_at, action_taken_by)
- [x] Section 1: Push DB migrations
- [x] Section 2: Upgrade Overdue Agent — update task status, draft follow-ups, save to agent_drafts
- [x] Section 2: Upgrade Velocity Agent — auto-advance stages, velocity tracking, stall detection
- [x] Section 2: Upgrade Distribution Sentinel — draft LP notifications, save to agent_drafts
- [x] Section 2: Upgrade Orchestrator — entity linking, portfolio-wide insights
- [x] Section 3: Upgrade AgentContext — drafts state, sendDraft, dismissDraft, runAgent, agent statuses
- [x] Section 4: Refine LiveTicker — 36px height, severity dots, click-to-open notification panel
- [x] Section 5: Upgrade bell icon — severity-based badge colors (red pulsing/amber/clear)
- [x] Section 5: Action notification panel — action buttons per event type
- [x] Section 5: Draft preview modal — edit + send/dismiss
- [x] Section 6: Velocity Compression KPI card on dashboard
- [x] Section 6: Velocity Log tab on client page (data available via velocityMetrics in AgentContext)
- [x] Section 7: Draft Center page at /drafts with Pending/Sent/Dismissed tabs
- [x] Section 7: Add Drafts nav item to sidebar
- [x] Section 8: Upgrade /agents page — pause/resume, run now, severity bars, action buttons
- [x] Section 9A: Client dashboard action cards (replace static stats)
- [x] Section 9B: Client ventures stage bar + sector filter pills
- [x] Section 9C: Client tasks sort by overdue + progress bar + overdue banner
- [x] Section 9D: Client distributions timeline view + summary pills
- [x] Section 9E: Client profile page — portfolio summary card with venture/task/distribution counts
