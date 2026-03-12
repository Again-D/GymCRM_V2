---
title: feat: rebuild products parity expansion
type: feat
status: completed
date: 2026-03-12
---

# feat: Rebuild Products Parity Expansion

## Overview

Extend the isolated `frontend-rebuild` prototype with `products` as the next breadth slice after:

- shell/auth routing
- members
- memberships
- reservations
- access
- lockers

The goal is to prove the rebuilt page-first structure can support a CRUD/admin workflow that is **not primarily selected-member driven**, while still respecting the rebuild's core architectural contracts:

- app shell does not regain coordinator ownership
- shared data that other slices consume stays canonical and invalidation-driven
- page-local form state stays local to the page
- browser-runnable runtime auth parity remains intact

This work runs only inside the rebuild worktree and draft PR `#73` branch:
- branch: `codex/refactor-frontend-rebuild-v1`
- worktree: `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1`

## Problem Statement / Motivation

The rebuild has already proven member-context-heavy operational slices. What it has **not** yet proven is whether the same architecture can handle a more classic admin CRUD surface without silently reintroducing old coordination problems.

`products` is the right next test because it sits in the middle of two architectural pressures:

1. `/products` itself is a standalone admin page with list/filter/create/edit style UX.
2. Product data is also consumed outside `/products`, especially by `memberships` purchase flows and any other product-derived business surfaces.

That means the rebuild must prove both of these at once:

- `/products` can be route-owned and self-contained as a CRUD page
- product data itself cannot become trapped in `/products` local state, because other slices still depend on it

If we do not pin that shared ownership now, the rebuild can appear locally clean while recreating duplicate product stores or stale cross-section state.

Baseline references:
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/products/ProductsSection.tsx`
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/products/ProductManagementPanels.tsx`
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/products/useProductsQuery.ts`
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/products/useProductWorkspaceState.ts`

Related roadmap/context:
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/plans/2026-03-12-refactor-frontend-rebuild-breadth-expansion-roadmap-plan.md`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-12-frontend-rebuild-prototype-checkpoint.md`

## Proposed Solution

Add a `products` prototype slice under `frontend-rebuild/src/pages/products` with a **shared product query/domain** and a **page-local CRUD form/action layer**.

### Canonical ownership rules

- `products` data remains a shared canonical query/domain
- `/products` page owns:
  - product filter UI state
  - create/edit form state
  - submit/error/success feedback
- `memberships` and any other product-consuming slice must read product-derived state from the shared product domain, not from `/products` local state
- product mutations invalidate the shared product domain explicitly instead of patching foreign slices ad hoc

### Route contract

Replace the current `/products` shell placeholder with a real `ProductsPage`.

- current placeholder route lives in:
  - `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/frontend-rebuild/src/App.tsx`
- target route:
  - `/products`

### Scope for this expansion

Include:
- product list surface
- core filter/search surface if present in baseline contract
- create product form
- edit product form or edit-in-place flow
- active/inactive status handling
- shared pagination reuse where useful
- shared product invalidation after create/update/archive actions
- at least one cross-slice proof that product mutation reaches a non-`/products` consumer

Do not include:
- full detail-route routing
- backend-auth/session integration beyond current runtime auth presets
- unrelated section breadth (`crm`, `settlements`)
- immediate cutover work

## Technical Considerations

- Keep shell-only routing boundaries intact.
- Continue using query-owned reads with request-version/reset-safe behavior.
- Reuse rebuild-wide invalidation contract already in:
  - `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/frontend-rebuild/src/api/queryInvalidation.ts`
- Add a shared product domain rather than making `/products` the sole owner of product data.
- Preserve runtime auth preset behavior so prototype/jwt/admin/trainer browser checks remain executable.
- Keep any cross-slice product refresh explicit and testable.

### Shared product ownership rule

Shared product domain owns:
- canonical product list/query cache
- invalidation after create/update/archive
- cross-slice consumption by `memberships` and future product-derived reads

`/products` page owns:
- create/edit/archive form state
- local filter state
- local optimistic/pending UI only if it does not replace the shared canonical source
- local success/error feedback

### Invalidation rule

Default expectation:
- product create invalidates `products`
- product update invalidates `products`
- product archive/reactivate invalidates `products`
- `memberships` re-reads from the shared `products` domain after invalidation, rather than depending on a local `/products` patch

## System-Wide Impact

- **Interaction graph**
  - `/products` CRUD actions must refresh the shared product domain.
  - `memberships` product selectors should observe refreshed product data through that domain.
- **Error propagation**
  - `/products` errors stay page-local and must not turn app shell into a shared error coordinator.
- **State lifecycle risks**
  - page-local forms must reset cleanly after create/update/archive.
  - shared product query must not leave stale data after mutation.
- **API surface parity**
  - rebuild must preserve baseline semantics for product list and product state handling closely enough for structure comparisons to stay meaningful.
- **Integration test scenarios**
  - product create/update should be observable from another product-consuming slice.
  - page-local form reset should not clear unrelated route or shell state.

## Proposed Deliverables

### Rebuild app code

- `frontend-rebuild/src/pages/products/ProductsPage.tsx`
- `frontend-rebuild/src/pages/products/modules/useProductsQuery.ts`
- `frontend-rebuild/src/pages/products/modules/useProductPrototypeState.ts`
- `frontend-rebuild/src/pages/products/modules/types.ts`
- optional `frontend-rebuild/src/pages/products/components/*`

### Supporting code

- updates to `frontend-rebuild/src/api/mockData.ts`
- updates to `frontend-rebuild/src/api/queryInvalidation.ts`
- route wiring in `frontend-rebuild/src/App.tsx`
- updates to any cross-slice consumer that should read shared product data (especially memberships)

### Documentation

- products parity hardening note
- products browser validation note
- roadmap status update after products completion

### Tests

- product query tests
- product action tests
- invalidation tests for shared product domain
- at least one cross-slice test showing product mutation reaches memberships or another consumer

## Implementation Phases

### Phase 1: Shared product domain

- [x] Add `products` invalidation domain to the rebuild-wide invalidation contract
- [x] Create shared product query module for canonical product reads
- [x] Make the ownership split explicit in code: shared query vs page-local action state
- [x] Add tests that prove product query state is reset-safe and invalidation-aware

### Phase 2: Products page slice

- [x] Add `ProductsPage`
- [x] Replace `/products` placeholder route with the real page
- [x] Build product list/filter/pagination surface
- [x] Add create/edit/archive action surface with page-local state ownership
- [x] Keep errors and feedback page-local

### Phase 3: Cross-slice parity

- [x] Connect `memberships` (or another product consumer) to the shared product domain
- [x] Ensure product mutations invalidate and refresh shared product data correctly
- [x] Add a cross-slice test proving a non-`/products` consumer reflects product changes

### Phase 4: Validation

- [x] Unit/integration tests for product modules
- [x] Desktop browser smoke for `/products` and one non-`/products` consumer path
- [x] Mobile browser smoke for `/products`
- [x] Record parity notes, tradeoffs, and remaining gaps

## Acceptance Criteria

- [x] `/products` is no longer a placeholder in `frontend-rebuild`
- [x] product data is owned by a shared canonical query/domain rather than page-local state
- [x] `/products` page owns only CRUD form/filter/feedback state
- [x] product create/update/archive invalidates the shared product domain explicitly
- [x] at least one non-`/products` consumer re-reads product changes through shared invalidation
- [x] product query state is reset-safe and invalidation-aware
- [x] desktop and mobile browser smoke pass for the rebuilt products slice

## Success Metrics

- the rebuild can now demonstrate both:
  - selected-member-heavy operational slices
  - a standalone CRUD/admin slice
- product ownership remains easier to explain than the baseline product flow
- no duplicate product store emerges in `/products` vs `memberships`
- the rebuild branch remains reviewable with evidence attached in draft PR `#73`

## Dependencies & Risks

### Dependencies

- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/plans/2026-03-12-refactor-frontend-rebuild-breadth-expansion-roadmap-plan.md`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/plans/2026-03-12-feat-rebuild-locker-parity-expansion-plan.md`
- shared invalidation contract already used by access/lockers
- draft PR `#73`

### Risks

- `/products` may accidentally become a second authoritative owner of product state
- cross-slice product invalidation may tempt local patching in `memberships`
- CRUD UI can drift into page-local convenience hacks that weaken the rebuild's architectural claims
- browser smoke may reveal responsive layout issues similar to earlier pagination/mobile work

## Sources & References

- `/Users/abc/projects/GymCRM_V2/frontend/src/features/products/ProductsSection.tsx`
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/products/ProductManagementPanels.tsx`
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/products/useProductsQuery.ts`
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/products/useProductWorkspaceState.ts`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/plans/2026-03-12-refactor-frontend-rebuild-breadth-expansion-roadmap-plan.md`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-12-frontend-rebuild-prototype-checkpoint.md`
