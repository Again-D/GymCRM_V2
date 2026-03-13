# Frontend Rebuild Live Auth / Session Flow

Date: 2026-03-13

## Scope

- live auth bootstrap via `/api/v1/health` + `/api/v1/auth/refresh`
- live login via `/api/v1/auth/login`
- live logout via `/api/v1/auth/logout`
- auth transition impact on selected-member context

## Evidence captured in code

- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/frontend-rebuild/src/app/auth.test.tsx`
  - live bootstrap restores jwt session
  - live login updates authenticated user
  - live logout clears authenticated user
  - live logout clears selected-member context through the members-domain owner

## Current parity interpretation

- bootstrap contract is now test-backed
- login / logout contract is now test-backed
- selected-member reset on auth transition is now test-backed

## Remaining gap before calling auth/session parity done

- live browser evidence for admin / desk / trainer role matrix
- protected route behavior captured with real backend session, not only test doubles
- explicit note of any remaining divergence between baseline and rebuild login UX
