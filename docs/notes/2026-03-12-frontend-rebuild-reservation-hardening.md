# Frontend Rebuild Reservation Hardening

## Scope
- worktree: `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1`
- branch: `codex/refactor-frontend-rebuild-v1`
- phase: `Phase 5 - Parity Hardening for Core Flows`

## What was hardened
- rebuilt `reservations` prototype now reloads the selected member's memberships through a dedicated query module instead of relying on placeholder-only state
- reservation schedules are loaded through a reset-safe request-version guarded hook
- reservable membership policy is extracted into a shared helper so the rebuilt reservations flow uses the same baseline rule shape:
  - `ACTIVE` only
  - reject expired memberships
  - reject exhausted count memberships
- memberships prototype now uses the same selected-member memberships query so member-context ownership stays in `members` domain while downstream data stays query-owned

## New files
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/frontend-rebuild/src/pages/member-context/modules/useSelectedMemberMembershipsQuery.ts`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/frontend-rebuild/src/pages/reservations/modules/useReservationSchedulesQuery.ts`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/frontend-rebuild/src/pages/reservations/modules/reservableMemberships.ts`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/frontend-rebuild/src/pages/reservations/modules/useReservationSchedulesQuery.test.tsx`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/frontend-rebuild/src/pages/reservations/modules/reservableMemberships.test.ts`

## Validation
- `cd /Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/frontend-rebuild && npm test -- --run src/pages/reservations/modules/useReservationSchedulesQuery.test.tsx src/pages/reservations/modules/reservableMemberships.test.ts src/pages/reservations/modules/useReservationTargetsQuery.test.tsx src/pages/members/modules/useMembersQuery.test.tsx src/pages/members/modules/SelectedMemberContext.test.tsx src/App.routing.test.tsx`
- `cd /Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/frontend-rebuild && npm run build`

## Remaining parity gaps
- trainer-scoped reservation restriction is not yet re-applied in prototype reads/actions
- reservation detail modal and action surface parity is still placeholder-level
- search debounce/cache/dedupe parity is not yet reintroduced for rebuilt member-context search surfaces
- hold summary semantics and broader membership mutation parity are not yet ported
