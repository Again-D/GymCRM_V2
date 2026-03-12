# 2026-03-12 Frontend Rebuild Prototype Checkpoint

## Scope
- Worktree: `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1`
- Branch: `codex/refactor-frontend-rebuild-v1`
- Checkpoint: `Go / No-Go 1`

## Side-by-Side Evidence
### Baseline screenshots
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/testing/artifacts/rebuild-baseline-dashboard.png`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/testing/artifacts/rebuild-baseline-members.png`

### Prototype screenshots
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/testing/artifacts/rebuild-prototype-dashboard.png`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/testing/artifacts/rebuild-prototype-members.png`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/testing/artifacts/rebuild-prototype-memberships.png`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/testing/artifacts/rebuild-prototype-reservations.png`

## What was compared
- baseline JWT shell:
  - `/dashboard`
  - `/members`
- prototype shell and first vertical slices:
  - `/dashboard`
  - `/members`
  - `/memberships`
  - `/reservations`

## Structural observations
- `frontend/src/App.tsx`: `2121` lines
- `frontend-rebuild/src/App.tsx`: `92` lines
- App-shell responsibility is materially smaller in the rebuild prototype.
- Shell route metadata, auth state, selected-member ownership, and page composition are now separated into explicit modules.
- The `selectedMember` canonical owner is no longer at the app shell level. It lives in the members domain store and is consumed by memberships/reservations.

## Prototype wins
- shell route contract was recreated without reintroducing `activeNavSection` as a second source of truth.
- `/members` is now a page-owned composition with support modules rather than a branch inside a large shell coordinator.
- `members -> memberships/reservations` handoff is easier to explain because those sections consume the same selected-member source.
- The worktree lets baseline and prototype coexist without blocking `main` feature work.

## Remaining gaps
- memberships and reservations do not yet have real parity for mutations, detail panels, or trainer-scoped restrictions.
- prototype reservations still use mock data mode for side-by-side structural review.
- debounce/cache/dedupe and stale-response protections have not yet been reintroduced in the rebuild slices.
- responsive/mobile verification for the prototype is still open.
- no parity decision has been made yet for access, lockers, products, CRM, or settlements.

## Go / No-Go 1
- Decision: `GO (continue prototype hardening)`

## Why this is a go
- The page-first rebuild has already reduced top-level shell complexity in a measurable way.
- The hardest ownership decision (`selectedMember`) is now concretely better than the baseline placement in `App.tsx`.
- Members, memberships, and reservations can now be discussed as a coherent vertical slice rather than unrelated placeholders.
- The remaining gaps are parity gaps, not “this structure fundamentally does not work” gaps.

## What would force a future no-go
- If trainer-scoped reservations require rebuilding a second coordinator around the members store.
- If real query lifecycle parity (debounce/cache/stale guards) makes the page-first support modules harder to reason about than the baseline feature structure.
- If responsive complexity grows sharply once full action surfaces are ported.

## Recommended next step
- Continue into parity hardening for `memberships` + `reservations` before expanding to the remaining sections.
