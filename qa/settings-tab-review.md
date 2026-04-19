# Client Portal Settings Tab Review

## Issues Found
1. **OrgLinked Venture entries still showing** — The test data cleanup removed ventures from DB but there are still "OrgLinked Venture" entries appearing in the action items. These are likely from agent_events table that weren't cleaned up.
2. **Settings tab visible** — Tab button is present in the nav bar (4th tab)
3. **PWA Install prompt** — Working correctly, shows "Install VENTEX" banner

## Need to verify
- Click Settings tab to see notification preferences UI
- Clean up remaining OrgLinked Venture references from agent_events
