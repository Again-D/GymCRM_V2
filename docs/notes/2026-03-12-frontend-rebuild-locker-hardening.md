# Frontend Rebuild Locker Hardening

Date: 2026-03-12
Branch: `codex/refactor-frontend-rebuild-v1`
Worktree: `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1`

## Summary

Added the rebuild prototype's first real `/lockers` slice with the same ownership rules used by the rebuilt `members`, `memberships`, `reservations`, and `access` slices.

## What changed

- Added `LockersPage` and replaced the shell placeholder route.
- Split locker reads into separate query-owned modules for:
  - `lockerSlots`
  - `lockerAssignments`
- Added locker-local action state for:
  - assign
  - return
  - assign form reset when selected member changes
- Kept `/lockers` globally usable without selected member context.
- Treated selected member only as an optional assignment prefill/highlight affordance.
- Extended rebuild-wide invalidation domains with:
  - `lockerSlots`
  - `lockerAssignments`

## Parity notes

- This follows the baseline ownership split more closely than gating the page on member context would have.
- Query invalidation is explicit rather than bundled into shell-level reloads.
- The remaining gap is browser smoke for desktop/mobile locker flows.

## Verification

- `npm test -- --run src/pages/lockers/modules/useLockerQueries.test.tsx src/pages/lockers/modules/useLockerPrototypeState.test.tsx src/App.routing.test.tsx`
- `npm run build`

Both passed in `frontend-rebuild`.
