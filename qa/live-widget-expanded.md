# Live Widget Expanded — Findings

The Live widget shows "1/15 online" with these operators:
1. Shwan Lee (SL) — Active now ✅
2. Chris Phelps (CP) — Offline · 7d ago
3. Brian Chen (BC) — Offline · 7d ago  
4. Michael Adenew (MA) — Offline · 16d ago
5-15. Test VENTEX Member 1776389096122, 1776392433792, etc. — All "Never connected" / Offline

The VentexTeam page filters out names starting with "Test " so it only shows 4 real members.
But the LivePresenceWidget does NOT filter out test members, showing 15 total.

## Fix Required
- LivePresenceWidget must filter out test members (names starting with "Test ")
- This will make the count match: "1/4 online" instead of "1/15 online"
- Better approach: filter at the server level in liveStatuses to exclude test members,
  OR apply the same client-side filter in LivePresenceWidget
