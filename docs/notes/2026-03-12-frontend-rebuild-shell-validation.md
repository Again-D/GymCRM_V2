# 2026-03-12 Frontend Rebuild Shell Validation

## Scope
- Worktree: `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1`
- Prototype app: `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/frontend-rebuild`
- Phase: `New Shell Prototype`

## Implemented contract
- `BrowserRouter`-based shell routing lives in the prototype app only.
- Shell route metadata is centralized in `frontend-rebuild/src/app/routes.ts`.
- Auth state is provided by `frontend-rebuild/src/app/auth.tsx`.
- Prototype shell exposes the baseline route surface:
  - `/dashboard`
  - `/members`
  - `/memberships`
  - `/reservations`
  - `/access`
  - `/lockers`
  - `/crm`
  - `/settlements`
  - `/products`
- `/login` remains outside the protected shell.

## Verified behaviors
- Prototype mode redirects `/` to `/dashboard`.
- JWT unauthenticated sessions redirect protected shell routes to `/login`.
- `authBootstrapping` renders a bootstrap screen before redirects.
- Unknown paths fall back to `/dashboard` for authenticated sessions.
- Sidebar navigation and dashboard quick-entry metadata now come from the same shell route table.

## Commands
- `cd /Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/frontend-rebuild && npm test -- --run src/App.routing.test.tsx`
- `cd /Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/frontend-rebuild && npm run build`

## Outcome
- Phase 1 shell prototype is ready for the next vertical slice.
- The next implementation target should be `/memberships` and `/reservations`, reusing the members-domain support module/store that now owns `selectedMemberId` and `selectedMember`.
