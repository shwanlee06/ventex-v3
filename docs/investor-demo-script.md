# VENTEX — Investor Demo Walkthrough Script

**Document Classification:** CONFIDENTIAL — INTERNAL USE ONLY
**Version:** 1.0 | **Date:** April 2026
**Prepared by:** Aurovia LLC — Product Engineering

---

## Purpose

This document provides a structured walkthrough script for demonstrating VENTEX to prospective investors. The demo is designed to last approximately 12 minutes, with an additional 5 minutes reserved for Q&A. The presenter should be familiar with the platform and have access to the Royalton Venture Holding client account for live demonstration.

---

## Pre-Demo Checklist

Before beginning the demo, the presenter should verify the following items to ensure a seamless experience.

| Item | Action | Status |
|------|--------|--------|
| Browser | Use Chrome or Edge, clear cache, full-screen mode | Required |
| Login | Confirm operator login is active (no session expiry mid-demo) | Required |
| Data | Verify Royalton Venture Holding has 30 ventures visible | Required |
| AI Agent | Send one test message to warm the LLM connection | Recommended |
| Network | Confirm stable internet (the live ticker requires WebSocket) | Required |
| Screen | Use 1920x1080 or higher resolution, dark mode enabled | Recommended |

---

## Act 1 — The Hook (2 minutes)

### Scene 1: Landing Page

Open the VENTEX landing page. The cipher animation decodes "VENTEX" letter by letter against a black background — this sets the tone.

**Talking Points:**

> "VENTEX stands for Velocity ENabled Technology for EXponential velocity. It is the AI-powered operations platform built exclusively for venture holding businesses. One command layer. Every holding. Total control."

Pause on the hero section. Point out the system status indicators on the right side: ventures tracked (93), SPVs active (14), tasks completed (228), sectors (6). These are live numbers pulled from the database.

> "Everything you see here is real data. This is not a mockup — this is a production system managing real venture portfolios."

Click **AUTHORIZED ACCESS** to proceed to the dashboard.

### Scene 2: The Dashboard

The dashboard loads with the live velocity ticker scrolling across the top. Point out the AI agent activity happening in real-time.

> "The first thing an operator sees is the velocity intelligence score — currently at 63%. This is a composite metric that tells you how fast your portfolio is moving. Below that: 5 active clients, 38 ventures across those clients, 79% task completion rate, and 10 AI communications pending client review."

---

## Act 2 — The Intelligence Layer (4 minutes)

### Scene 3: Client Portfolio View

Click on **Royalton Venture Holding** in the client table. The client portfolio page opens showing 30 ventures organized by sector.

> "Each client gets their own portfolio view. Royalton has 30 ventures across 6 sectors — Real Estate, F&B, Yacht, Entertainment, Oil & Gas, and Others. Every venture card shows task completion, health status, and team assignments at a glance."

Click on a venture (e.g., **Zarka City**) to open the detail page.

> "Drill into any venture and you see the full picture: key details, team assignments, linked tasks, documents, and a chronological activity log. Everything is editable in real-time and syncs across all operators."

Navigate back to the client portfolio.

### Scene 4: AI Concierge

Navigate to the **Concierge** page from the sidebar.

> "This is the AI Concierge — powered by Claude. It has full context of the entire portfolio. Watch this."

Type: **"Give me a status update on Royalton's Real Estate ventures"**

Wait for the streaming response. The AI will reference specific ventures, completion rates, and recent activity.

> "The AI is not generating generic text. It is querying the live database, analyzing task completion rates, identifying overdue items, and synthesizing a briefing. Every claim it makes is grounded in real data."

Point out the suggested action cards: Portfolio overview, Open tasks, Draft LP update, SPV pipeline status.

> "These are one-click intelligence reports. The AI can draft LP updates, summarize pipeline status, or flag ventures that need attention — all in seconds."

---

## Act 3 — The Operations Engine (3 minutes)

### Scene 5: Distributions & Multi-Currency

Navigate to **Distributions** from the sidebar. Select **Meridian Holdings** from the dropdown.

> "VENTEX handles multi-currency distributions natively. Meridian has distributions in USD, EUR, GBP, Swiss Francs, and AED. The system tracks paid, scheduled, and cancelled distributions with full audit trails."

Point out the FX Rates button.

> "We pull live ECB exchange rates daily at 16:00 CET. Every distribution can be viewed in its native currency or converted to a base currency for consolidated reporting."

### Scene 6: Team & SCIM Provisioning

Navigate to **People** from the sidebar.

> "25 contacts across 5 clients, each with role assignments, function tags, and client affiliations. For enterprise clients, VENTEX supports SCIM 2.0 provisioning — meaning their identity provider can automatically create, update, and deactivate users in VENTEX. No manual onboarding required."

### Scene 7: Settings & Security

Navigate to **Settings** and click through the tabs briefly.

> "Five configuration tabs: General, Security, Compliance, Notifications, and Audit Log. The security layer includes nonce-based Content Security Policy, CSRF protection, rate limiting, IP allowlisting, MFA support, and full audit logging. Every action by every operator is tracked."

---

## Act 4 — The Velocity Engine (2 minutes)

### Scene 8: AI Agent Scheduler

Return to the Dashboard. Point to the live ticker at the top.

> "What you are seeing in this ticker is the VENTEX Velocity Agent working autonomously. It monitors every venture, identifies tasks that need to be completed, executes them using AI, and advances ventures through their lifecycle stages — from validation to fundraising to active operations."

Point to a specific ticker entry showing task completion.

> "The agent just completed a market research task for a new F&B venture and automatically created three follow-up tasks. It then advanced the venture from 'In Validation' to 'In Fundraising'. This is not a notification — this is autonomous execution."

### Scene 9: Nightly Snapshots & Resilience

> "Every night at 02:00 UTC, VENTEX generates a complete portfolio snapshot for every active organization and stores it in S3. If anything ever goes wrong, we can reconstruct the entire portfolio state from any point in time. This is enterprise-grade resilience."

---

## Act 5 — The Business Case (1 minute)

### Closing Statement

> "VENTEX is built by Aurovia LLC. We are a pre-seed company converting from LLC to C-Corp with this raise. VENTEX is one of our products — purpose-built for venture holding businesses that manage multiple ventures, SPVs, and investor relationships."

> "The platform replaces spreadsheets, email chains, and manual tracking with a single AI-powered command center. Every venture, every task, every distribution, every team member — all in one place, all in real-time, all with AI intelligence."

> "We are looking for investors who understand that the venture holding space is underserved by technology. VENTEX is the first platform built specifically for this market."

---

## Q&A Preparation

The following questions are commonly asked during investor demos. Prepare concise answers for each.

| Question | Suggested Response |
|----------|-------------------|
| What is the tech stack? | React 19, TypeScript, tRPC, Express, TiDB (MySQL-compatible), S3, Claude AI. Deployed on Manus infrastructure with custom domains. |
| How many clients can it handle? | The architecture is multi-tenant by design. Each organization is fully isolated. Currently managing 5 clients with 38 ventures — designed to scale to hundreds. |
| What about data security? | Nonce-based CSP, CSRF protection, rate limiting, IP allowlisting, MFA, full audit logging, SCIM 2.0 provisioning, data retention policies, and SOC 2-aligned compliance controls. |
| Who are the current users? | Royalton Venture Holding (30 ventures), Meridian Holdings (5 ventures), Volkov Capital (3 ventures), plus two test accounts. |
| What is the revenue model? | SaaS subscription per organization, tiered by number of ventures and users. Enterprise tier includes SCIM, SSO, and dedicated support. |
| How does the AI work? | Claude processes portfolio data in real-time. The Velocity Agent runs autonomously on a scheduler, executing tasks and advancing venture stages. All AI actions are logged and auditable. |
| What is the competitive landscape? | No direct competitor builds specifically for venture holding operations. Adjacent tools (Carta, Juniper Square) focus on fund administration, not operational velocity. |

---

## Post-Demo Follow-Up

After the demo, send the investor a follow-up email within 24 hours containing:

1. A link to the VENTEX Trust & Security page (accessible from the landing page footer)
2. The portfolio snapshot PDF export (generated from the Export button on the client portfolio page)
3. A calendar link for a follow-up technical deep-dive if requested

---

*This document is the intellectual property of Aurovia LLC. All ideas and products described herein belong to Aurovia LLC.*
