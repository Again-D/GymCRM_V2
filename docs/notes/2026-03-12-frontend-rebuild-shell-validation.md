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

## Runtime auth presets
- The running prototype now supports source-free auth switching through `AuthStateProvider` runtime presets.
- Query params can override the initial session:
  - `?authMode=prototype`
  - `?authMode=jwt&authSession=anon`
  - `?authMode=jwt&authSession=admin`
  - `?authMode=jwt&authSession=trainer`
- The `/login` screen exposes runtime buttons for JWT admin, JWT trainer, and prototype mode.
- The shell sidebar exposes runtime controls for `Prototype`, `JWT 관리자`, `JWT 트레이너`, and `JWT 로그아웃 상태`.
- `src/app/auth.test.tsx` now proves query-param bootstrap and persisted runtime preset changes.
