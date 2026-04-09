# Guided Demo Plan

## Admin View Components (DemoDashboard.tsx)
1. Dashboard — KPIs, client portfolio grid, priority tasks, velocity intelligence, agent activity feed, active agents
2. Activity — filterable timeline with stats (total events, agent actions, human actions, avg response)
3. Oversight — client health matrix, risk alerts, compliance tracker
4. AI Concierge — chat interface with pre-filled conversation
5. AI Agents — 4 agent cards (Velocity, Overdue, Distribution Sentinel, Compliance Watcher) with status/metrics
6. Blueprints — venture pipeline kanban across stages
7. ATLAS Team — team member cards with photos, status, ventures, tasks
8. Client Contacts — org-grouped contact directory
9. Onboard Client — 3-step wizard (org details, ventures, team/access)
10. Drafts — document drafts list
11. Settings — configuration panels (general, notifications, integrations, security)

## Client Portal Components (ClientPortal.tsx)
1. Header — org name, "Managed by ATLAS", user name, logout
2. Velocity Summary — AI-generated one-line briefing
3. Action Needed (amber) — cards with action buttons (Advance Status, Review & Approve, Confirm Distribution, Resolve, View Tasks)
4. Completed (teal) — completed items feed
5. Watching (gray, collapsed) — items being monitored
6. Your Portfolio — venture cards with sector, stage indicator, momentum, risk factors
7. Portfolio Health Score — overall score /100 with trend
8. Venture Forecasts — AI-projected timelines with confidence bars
9. Market Intelligence — sector signals (opportunity, risk, regulatory)
10. AI Portfolio Assistant — floating chat bubble

## Implementation Plan
- Add a "demoView" state: "admin" | "client" to DemoDashboard
- Add a toggle in the demo banner: "Admin View" / "Client View"
- When "client" is selected, render a static client portal demo (no tRPC)
- Add annotation tooltips/badges to both views explaining each component
- Use a small info icon (ℹ) next to each section title that shows a tooltip on hover
