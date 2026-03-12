# 2026-03-12 Frontend Rebuild Execution Model

## Worktree
- Branch: `codex/refactor-frontend-rebuild-v1`
- Worktree: `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1`

## Side-by-Side Model
- Baseline app: `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/frontend`
- Prototype app: `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/frontend-rebuild`

## Default Ports
- Baseline Vite dev server: `5173`
- Prototype Vite dev server: `5175`
- Baseline preview port: `4173` or repo default
- Prototype preview port: `4175`

## Current Prototype Scope
- Shell prototype with baseline route contract
- Route surface currently scaffolded:
  - `/dashboard`
  - `/members`
  - `/memberships`
  - `/reservations`
  - `/access`
  - `/lockers`
  - `/crm`
  - `/settlements`
  - `/products`
  - `/login`
- `selectedMember` canonical owner rule:
  - members domain support module/store owns `selectedMemberId` and `selectedMember`
  - app shell does not own member-context state

## Phase 0 Outcome
- Worktree created from `main`
- Baseline app preserved untouched inside worktree
- Prototype app scaffold created as separate entry
- Ready to begin Phase 1 shell implementation without mutating the baseline app
