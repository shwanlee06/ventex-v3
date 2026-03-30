# Gap-Closing Audit Results

## Already Done (confirmed in codebase):
- FIX 5: Blueprint tables exist in drizzle/schema.ts (process_templates, process_steps, venture_process_tracking, client_velocity_benchmarks)
- FIX 6: Blueprint procedures exist (listTemplates, getTemplateWithSteps, updateStep, deleteStep, addStep, applyToVentures, getVentureTracking, updateTrackingStep, refineFromActuals, getMissingSectors, generateStarterBlueprints, autoApplyToSectorVentures, recalculateHealthScores, extractFromDocument, uploadAndExtract, conversationExtract)
- FIX 7: populateIntelligence and recalculateHealth are already mutations. organizations.create is already a mutation.
- FIX 8: Agent blueprint awareness already implemented (velocity + overdue agents read blueprint context)
- FIX 9: Onboarding already calls generateStarterBlueprints after org creation
- FIX 10: Email auto-triggers already wired in agents.ts (sendOverdueAutoEmail, sendReadyToAdvanceEmail, sendStageAdvancedEmail, sendDistributionNotice)

## Partially Done:
- FIX 4: emailService.ts exists with Resend integration and templates. But NO tRPC email.send procedure exists as a standalone router. The email functions are called directly from agents.ts. The spec wants a tRPC mutation.
- FIX 1: AcceptInvite page exists, OAuth callback handles invitation acceptance. But there's no tRPC auth.acceptInvite mutation — it's handled via OAuth flow + REST route. The spec wants a tRPC mutation with password set.
- FIX 2: No forgotPassword/resetPassword exists at all.
- FIX 3: Onboarding wizard calls individual procedures (create, addVentures, sendInvitations, configureAgents) per step. No single onboarding.complete mutation. The spec wants a unified mutation.

## Truly Missing:
1. FIX 4 (partial): Need tRPC email.send mutation wrapping existing emailService
2. FIX 1 (partial): Need tRPC auth.acceptInvite mutation (currently OAuth-only flow)
3. FIX 2: Need forgotPassword + resetPassword mutations + pages
4. FIX 3 (partial): Need onboarding.complete unified mutation

## Removals Still Needed:
- "Portfolio on track" card in ClientDashboard.tsx (lines 423, 430)
- WATCHING labels in VelocityFeed.tsx (line 88)
- TBD location already partially handled but needs verification
- Duplicate agents.list polling (LiveTicker + AgentContext both call it)
- Lowercase name issue (may be from database, not code)
