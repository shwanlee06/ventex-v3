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
- [x] 27 vitest tests passing across 4 test files
- [x] Ventures, tasks, SPVs, team, distributions, activity, notifications router tests
- [x] Airtable sync endpoint tests
- [x] Auth logout test
- [x] AI chat test
