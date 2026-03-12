# Frontend Rebuild Access Hardening

## Scope
- worktree: `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1`
- branch: `codex/refactor-frontend-rebuild-v1`
- phase: `Next parity expansion - access slice`

## What was added
- rebuilt app now has a real `/access` shell route instead of a placeholder card
- `AccessPage` reuses the members-domain `selectedMember` owner and falls back to member search when no member is selected
- access slice includes:
  - selected-member action surface (`입장 처리`, `퇴장 처리`, `새로고침`)
  - current access presence summary
  - member search results with shared pagination
  - current open sessions list
  - recent access events list
- shared invalidation contract is now explicit through `queryInvalidation.ts`
  - `members`
  - `reservationTargets`
  - `accessPresence`
  - `accessEvents`
- memberships mutations invalidate cross-section read surfaces through the shared contract instead of ad hoc cache coupling
- access actions invalidate both presence and event queries through the same contract

## New files
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/frontend-rebuild/src/api/queryInvalidation.ts`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/frontend-rebuild/src/api/queryInvalidation.test.ts`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/frontend-rebuild/src/pages/access/AccessPage.tsx`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/frontend-rebuild/src/pages/access/modules/types.ts`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/frontend-rebuild/src/pages/access/modules/useAccessQueries.ts`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/frontend-rebuild/src/pages/access/modules/useAccessQueries.test.tsx`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/frontend-rebuild/src/pages/access/modules/useAccessPrototypeState.ts`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/frontend-rebuild/src/pages/access/modules/useAccessPrototypeState.test.tsx`

## Validation
- `cd /Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/frontend-rebuild && npm test -- --run src/api/queryInvalidation.test.ts src/pages/access/modules/useAccessQueries.test.tsx src/pages/access/modules/useAccessPrototypeState.test.tsx src/App.routing.test.tsx src/pages/members/modules/useMembersQuery.test.tsx src/pages/reservations/modules/useReservationTargetsQuery.test.tsx src/pages/members/modules/SelectedMemberContext.test.tsx src/pages/memberships/modules/useMembershipPrototypeState.test.tsx src/pages/reservations/modules/useReservationSchedulesQuery.test.tsx src/pages/reservations/modules/reservableMemberships.test.ts src/api/mockData.test.ts`
- `cd /Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/frontend-rebuild && npm run build`

## Remaining gaps
- desktop/mobile browser smoke for `/access` is still pending
- access slice still runs on mock API and runtime auth presets, not real backend auth/session integration
- locker/product/CRM/settlement parity is intentionally deferred
