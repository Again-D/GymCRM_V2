# Frontend Rebuild Live Auth / Session Flow

Date: 2026-03-13

## Scope

- live auth bootstrap via `/api/v1/health` + `/api/v1/auth/refresh`
- live login via `/api/v1/auth/login`
- live logout via `/api/v1/auth/logout`
- auth transition impact on selected-member context
- protected route redirect behavior with real session state
- role matrix for `ROLE_CENTER_ADMIN`, `ROLE_DESK`, `ROLE_TRAINER`

## Evidence captured in code

- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/frontend-rebuild/src/app/auth.test.tsx`
  - live bootstrap restores jwt session
  - live login updates authenticated user
  - live logout clears authenticated user
  - live logout clears selected-member context through the members-domain owner

## Browser evidence

- admin
  - unauth direct entry to `/members` redirected to `/login`
  - live login with `center-admin / dev-admin-1234!` redirected to `/dashboard`
  - screenshot:
    - `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/testing/artifacts/rebuild-live-auth-admin-members.png`
- desk
  - live login with `desk-user / desk-user-1234!`
  - `/access` opened as a supported global operational page
  - screenshot:
    - `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/testing/artifacts/rebuild-live-auth-desk-access.png`
- trainer
  - live login with `trainer-user / trainer-user-1234!`
  - `/access` opened with unsupported notice and disabled operational surface
  - `/reservations` remained accessible
  - screenshots:
    - `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/testing/artifacts/rebuild-live-auth-trainer-access.png`
    - `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/testing/artifacts/rebuild-live-auth-trainer-reservations.png`
- logout / protected route
  - after live logout, direct entry back to `/members` redirected to `/login`
  - screenshot:
    - `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/testing/artifacts/rebuild-live-auth-post-logout-login.png`

## Role parity matrix

| Role | Login | Protected route bootstrap | `/access` live behavior | `/reservations` live behavior |
|---|---|---|---|---|
| `ROLE_CENTER_ADMIN` | Supported | `/members -> /login`, then `/dashboard` after login | Supported | Supported |
| `ROLE_DESK` | Supported | Same protected-route contract | Supported | Supported |
| `ROLE_TRAINER` | Supported | Same protected-route contract | Explicitly unsupported in live mode, disabled surface | Supported |

## Current parity interpretation

- bootstrap contract is now test-backed
- login / logout contract is now test-backed
- selected-member reset on auth transition is now test-backed
- live browser role matrix is now captured
- protected route redirect after logout is now captured with a real session

## Remaining gap after this phase

- no auth/session blocker remains at local live parity level
- next evidence gate is staging role/session smoke, not local live auth/session behavior
