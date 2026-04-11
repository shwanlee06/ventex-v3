# Demo vs Actual Dashboard Audit

## Actual Production Dashboard
- Uses `DashboardLayout` wrapper (AppSidebar + Topbar + content)
- AppSidebar: slim collapsible rail (60px collapsed / 220px expanded), VENTEX logo, tooltips, client list at bottom
- Topbar: h-14, title + subtitle, search/notifications/user dropdown, preview toggle, client switcher
- Admin (VentexDashboard): velocity KPIs, client grid/table with health/velocity/completion metrics, AI task generator, overdue alerts, live presence, agent execution log, executive summary
- Client (ClientDashboard): velocity feed, action cards, sector pie chart, stage bars, venture cards, advance banner

## Demo Dashboard (DemoDashboard.tsx)
- Custom sidebar (not using AppSidebar) — different look
- Custom topbar — different from actual Topbar
- Static data, no tRPC calls
- Admin view: metric cards, venture sectors grid, SPV deals, activity feed, tasks
- Client view: ClientPortalDemoView — separate static component

## Key Visual Differences to Fix
1. **Sidebar**: Demo uses custom sidebar with different styling. Should match AppSidebar's slim rail + expand pattern
2. **Topbar**: Demo has custom topbar. Should match actual Topbar layout (title/subtitle left, actions right)
3. **Admin content**: Demo shows different metrics/layout than VentexDashboard. Should mirror the velocity KPIs, client grid, agent log pattern
4. **Client content**: Demo ClientPortalDemoView should mirror ClientDashboard's velocity feed, action cards, sector pie, stage bars

## Decision
The demo is intentionally self-contained (no auth/DB). The visual STRUCTURE should match production but with static data. Key alignment:
- Use same sidebar pattern (slim rail + expand)
- Use same topbar pattern (h-14, same layout)
- Mirror the same content sections with static data
