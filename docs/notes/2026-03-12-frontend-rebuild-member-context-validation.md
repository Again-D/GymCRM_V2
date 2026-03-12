# 2026-03-12 Frontend Rebuild Member Context Validation

## Scope
- Worktree: `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1`
- Prototype app: `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/frontend-rebuild`
- Phase: `Memberships / Reservations Prototype Slice`

## Implemented
- `/memberships` now uses selected-member fallback instead of a static placeholder.
- `/reservations` now shows a reservation target list plus selected-member handoff.
- both sections consume the canonical `SelectedMemberContext` from the members domain.
- reservation target loading is owned by `frontend-rebuild/src/pages/reservations/modules/useReservationTargetsQuery.ts`.

## Verified behavior
- `/memberships` falls back to member search/list when no member is selected.
- selecting a member in the fallback list populates the same selected-member source used by `/members`.
- `/reservations` lists reservation targets and can hand off a selected target into the same member-context owner.
- build and focused prototype tests still pass after adding the member-context surfaces.

## Commands
- `cd /Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/frontend-rebuild && npm test -- --run src/App.routing.test.tsx src/pages/members/modules/useMembersQuery.test.tsx src/pages/members/modules/SelectedMemberContext.test.tsx src/pages/reservations/modules/useReservationTargetsQuery.test.tsx`
- `cd /Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/frontend-rebuild && npm run build`

## Remaining gaps before Go/No-Go 1
- trainer-scoped reservation restrictions are still placeholder-only.
- reservable membership policy parity and detail modal parity are not rebuilt yet.
- debounce/cache/dedupe and stale-response reset guards still need parity coverage.
