# Live Widget Investigation

## Dashboard Live Widget
- Shows "Live 1/15 online" with SL avatar
- Uses `trpc.team.liveStatuses` → filters by `type === "Internal" && adminStatus !== "deactivated"`

## VentexTeam Page
- Uses `trpc.team.listInternal` → filters by `type === "Internal"` in DB
- Then client-side filters out names starting with "Test "
- Also uses `trpc.team.liveStatuses` for status dots

## Mismatch Issue
- LivePresenceWidget shows 15 operators (all Internal, non-deactivated)
- VentexTeam page may show fewer due to the "Test " prefix filter
- The count "1/15" should match the count shown on the VENTEX Team page
- Need to apply the same "Test " filter in LivePresenceWidget
- Also need to filter out deactivated members consistently

## Fix Plan
- Update LivePresenceWidget to use the same filtering as VentexTeam
- Filter out test members (names starting with "Test ")
- Ensure both show the same set of operators
