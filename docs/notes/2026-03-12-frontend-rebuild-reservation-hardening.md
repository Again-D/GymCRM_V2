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
- trainer-scoped read parity is now visible in prototype mode:
  - members list query filters to trainer-owned member rows
  - reservation target query filters to trainer-owned target rows
  - direct `selectMember()` attempts outside trainer scope fail back into picker/list state instead of creating an inconsistent selected-member context
- request churn mitigation is now partially re-applied:
  - `MemberContextFallback` and `ReservationsPage` search inputs use debounced keywords
  - rebuilt `useMembersQuery` and `useReservationTargetsQuery` cache identical query results
  - identical in-flight requests are deduped per query key
- reservation detail/action surface is no longer placeholder-only:
  - selected member reservation list loads through a dedicated reservations state module
  - prototype reservation create form can append a new confirmed reservation into local state
  - check-in / complete / cancel / no-show buttons mutate local reservation state with baseline-style gating messages

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
- trainer-scoped reservation restriction is only re-applied to prototype reads and member-context selection, not reservation mutations
- reservation detail modal parity is still incomplete, but reservation list/create/action surface parity is now represented in-page
- search debounce/cache/dedupe parity is reintroduced for member-context search surfaces, but not yet for every future rebuilt search UI
- hold summary semantics and broader membership mutation parity are not yet ported
