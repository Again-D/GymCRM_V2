---
status: active
owner: Codex
created: 2026-03-12
updated: 2026-03-12
tags:
  - frontend
  - rebuild
  - prototype
  - parity
  - worktree
---

# Frontend Rebuild Next Parity Expansion Plan

## Summary

The isolated `frontend-rebuild` prototype has passed the first structural checkpoint:

- shell-only routing is rebuilt and browser-testable
- members, memberships, and reservations core flows exist in the new structure
- `selectedMember` ownership is pinned to a members-domain module
- trainer-scoped read constraints, request-churn protection, and stale-response guards are present
- the prototype can now demonstrate runtime `prototype` and `jwt` auth modes without source edits

The next step is not breadth for its own sake. We should expand parity in the smallest set of areas that proves the rebuild can support the rest of the admin console without recreating the coordinator drift of the baseline app.

## Goal

Validate that the rebuild structure can absorb the next class of workflows after `members -> memberships/reservations` by adding one more operational slice and one more shared cross-section contract, while keeping the experiment isolated in the rebuild worktree.

## Recommended Scope

### 1. Add `access` as the next full vertical slice

This is the best next parity target because it exercises:

- a list-heavy operational screen
- selected-member handoff from the shared members-domain owner
- multi-list pagination and summary surfaces
- mutation-like actions with immediate feedback
- read query ownership that differs from memberships/reservations

Why `access` first:

- it is narrower than `crm` or `settlements`
- it forces us to prove the new structure can handle cross-section operational UI beyond member-context transactions
- it already had important state/query ownership work in the baseline app, so parity success here is meaningful

### 2. Harden shared query ownership for rebuild-wide invalidation

The rebuild now has:

- members summary
- selected member memberships
- reservation targets
- reservation schedules

The next parity step should formalize a small rebuild-wide invalidation convention so new slices do not hand-roll cache resets differently.

Target:

- a shared invalidation utility or version-token pattern for rebuild query modules
- explicit guidance for which mutations must invalidate which read surfaces

### 3. Defer the following until after `access`

Keep these out of the next slice:

- full `lockers` parity
- `crm`
- `settlements`
- `products` CRUD parity
- real backend auth/session integration

Those are useful later, but they are not the highest signal-to-cost next step.

## Proposed Deliverables

### Rebuild app code

- `frontend-rebuild/src/pages/access/AccessPage.tsx`
- `frontend-rebuild/src/pages/access/modules/*`
- `frontend-rebuild/src/pages/access/components/*`
- shared invalidation helper(s) under `frontend-rebuild/src/shared` or `frontend-rebuild/src/api`

### Documentation

- execution note for access parity
- validation log for desktop/mobile smoke
- updated rebuild structure note if new support modules are introduced

### Tests

- access query tests
- selected-member handoff tests for `/members -> /access`
- invalidation tests for shared read surfaces after access mutations
- route tests if new shell contracts are affected

## Phase Breakdown

### Phase 1: Rebuild-wide query invalidation contract

- [x] Define a single invalidation pattern for rebuild query modules
- [x] Apply it to existing members/reservations modules without changing behavior
- [x] Add tests proving cross-section reload after mutation does not depend on ad hoc local patching

### Phase 2: Access prototype slice

- [x] Add `AccessPage`
- [x] Add selected-member-aware access detail surface
- [x] Add current presence / recent access events / member search result surfaces
- [x] Reuse shared pagination patterns already proven in the baseline app
- [x] Define clear fallback behavior when no member is selected

### Phase 3: Access action parity

- [x] Add prototype access actions that update the correct rebuild read surfaces
- [x] Ensure the rebuild invalidation contract updates access + members summary where needed
- [x] Verify trainer-scoped behavior if access is meant to respect role limits

### Phase 4: Validation

- [x] Unit/integration tests for access modules
- [x] Desktop browser smoke for `/members`, `/access`, `/memberships`, `/reservations`
- [x] Mobile browser smoke for `/access`
- [x] Update parity notes with tradeoffs and remaining gaps

## Out of Scope

- production cutover
- swapping the main frontend entrypoint
- backend auth/session integration beyond current prototype auth presets
- migrating every remaining section in one pass

## Quality Gates

- `selectedMember` remains owned by the members-domain store
- new slices consume shared ownership rather than recreating app-shell coordination
- cache invalidation is explicit and testable
- no new stale-response or request-churn regressions are introduced
- `access` parity is demonstrable in browser smoke on desktop and mobile

## Success Criteria

We should consider the next expansion successful if:

1. the rebuild can support `members -> access` and `members -> memberships/reservations` without separate ownership models
2. shared invalidation is no longer ad hoc
3. one more operational slice beyond member-context transactions is proven in the new structure
4. the experiment still feels simpler than the baseline, not merely different

## Follow-up After This Plan

If this succeeds, the next decision point should be:

- `lockers` as another operational slice, or
- `products` as a CRUD/admin slice, or
- a stop-and-evaluate checkpoint on whether the rebuild is convincing enough to justify deeper parity work
