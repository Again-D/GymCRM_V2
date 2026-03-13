---
title: refactor: harvest explicit query invalidation contract into main
type: refactor
status: completed
date: 2026-03-13
---

# refactor: Harvest Explicit Query Invalidation Contract Into Main

## Overview

The rebuild prototype in `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/frontend-rebuild` proved that **explicit invalidation domains** are easier to reason about than ad hoc local reloads and cache clears spread across `App.tsx` and individual mutation handlers.

The goal of this plan is to harvest that pattern into `main` without attempting a broad rewrite. We want to make query refresh behavior easier to trace, easier to test, and less dependent on remembering which mutation should manually reload which slice.

This is not a full query-layer rewrite. It is a bounded contract refactor.

## Problem Statement / Motivation

The baseline frontend already has several good pieces:
- request-id guards in multiple query hooks
- local cache invalidation in some shared hooks
- more explicit selected-member ownership than before

But invalidation behavior is still uneven.

Today, refresh behavior is split across multiple styles:
- direct `loadX()` calls after mutations
- local cache invalidation helpers such as workspace member search invalidation
- implicit state replacement in mutation success handlers
- query hooks with reset semantics that are not coordinated through a common contract

That creates three costs:

1. it is hard to see which mutation should refresh which consumers
2. cross-slice stale-state bugs are easy to reintroduce
3. `App.tsx` and page-level handlers still carry refresh choreography knowledge that should be more explicit

The rebuild branch proved a better pattern:
- named invalidation domains
- query hooks react to explicit version changes
- mutation handlers invalidate domains instead of manually orchestrating every follow-up reload

## Proposed Solution

Introduce a small explicit invalidation contract in the baseline frontend and migrate the highest-value read domains to it first.

The first pass should focus on domains that already show cross-slice coordination pressure:
- `members`
- `products`
- `reservationTargets`
- `reservationSchedules`
- `workspaceMemberSearch`

Each domain should have:
- a clear invalidation owner
- a versioned signal or equivalent explicit trigger
- documented mutation -> invalidation mapping

The contract should remain lightweight. This is not a generic data library replacement.

## Technical Considerations

- Keep query-owned reads in their current domain hooks.
- Do not move all query state into one global store.
- The invalidation layer should only answer: "which domain became stale?"
- Existing request-id stale-response guards stay in place; invalidation is additive, not a replacement.
- Mutations should prefer domain invalidation over direct bundled reload choreography when parity allows it.
- The contract should be explicit enough that another engineer can answer "what refreshes after this mutation?" from code search.

## Candidate Domain Boundaries

### 1. `members`
Used by:
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/members/useMembersQuery.ts`
- members management list and summary badges

Should invalidate after:
- member create/update status-changing operations
- membership mutations that affect summary semantics (`홀딩중`, remaining count visibility, etc.)

### 2. `products`
Used by:
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/products/useProductsQuery.ts`
- memberships purchase consumer paths

Should invalidate after:
- product create/update/archive-like mutations

### 3. `reservationTargets`
Used by:
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/reservations/useReservationTargetsQuery.ts`

Should invalidate after:
- reservation-affecting membership mutations
- reservation create/cancel/complete/no-show if target eligibility changes

### 4. `reservationSchedules`
Used by:
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/reservations/useReservationSchedulesQuery.ts`

Should invalidate after:
- reservation create/update/status mutations

### 5. `workspaceMemberSearch`
Used by:
- `/Users/abc/projects/GymCRM_V2/frontend/src/shared/hooks/useWorkspaceMemberSearchLoader.ts`

Should invalidate after:
- member create/update
- membership mutations that change visible summary state

## Implementation Phases

### Phase 1: Introduce Invalidation Contract

Goal:
- create a minimal shared invalidation mechanism in the baseline frontend

Scope:
- add invalidation domain registry/helper
- support read-only subscription/version checking from query hooks
- document the contract boundary

Target files:
- new shared invalidation module under `/Users/abc/projects/GymCRM_V2/frontend/src/shared`
- `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-13-refactor-main-explicit-query-invalidation-harvest-plan.md`

Success criteria:
- the contract exists without changing user-visible behavior yet
- domain names are explicit and stable

### Phase 2: Migrate High-Value Query Hooks

Goal:
- make the highest-risk query hooks react to explicit invalidation domains

Scope:
- `useMembersQuery`
- `useProductsQuery`
- `useReservationTargetsQuery`
- `useReservationSchedulesQuery`
- `useWorkspaceMemberSearchLoader`

Success criteria:
- query hooks can refresh or discard cached assumptions when their domain is invalidated
- request-id stale-response protection still works the same or better

### Phase 3: Rewire Mutation Paths

Goal:
- reduce manual reload choreography in mutation handlers

Scope:
- replace direct ad hoc reload patterns where safe with domain invalidation
- keep any required immediate local optimistic updates only where they are genuinely needed
- document mutation -> invalidation mapping in code comments or tests where it is not obvious

Likely mutation surfaces:
- membership purchase / hold / resume / refund
- reservation create / cancel / complete / no-show / check-in
- member create / update
- product create / update

Success criteria:
- mutation handlers no longer need to remember every downstream read consumer manually
- cross-slice refresh behavior is more predictable and easier to test

### Phase 4: Validation And Cleanup

Goal:
- verify the contract actually reduces stale-state risk without broad regressions

Scope:
- focused tests around invalidation-triggered refresh behavior
- browser smoke on members / memberships / reservations flows
- trim obsolete direct reload helpers only after parity is proven

Success criteria:
- cross-slice stale-state regressions are harder to reproduce than before
- invalidation behavior is discoverable from tests and code search

## Acceptance Criteria

- [x] explicit invalidation domains exist in `main`
- [x] at least the initial five domains are defined and documented
- [x] high-value query hooks consume the invalidation contract
- [x] membership/reservation/member/product mutation paths use the contract where appropriate
- [x] tests cover invalidation-driven refresh for at least one cross-slice scenario
- [x] `App.tsx` carries less manual reload choreography than before

## Success Metrics

- fewer mutation handlers directly call multiple downstream reload functions
- cross-slice refresh behavior becomes easier to explain from code search
- stale-state fixes become more localized instead of shell-coordinated

## Risks

- over-generalizing the invalidation layer can create a second global coordinator
- replacing direct reloads too aggressively can hide missing local updates
- domain boundaries can drift if they are not named clearly at the start

## Recommended Execution Order

1. define invalidation domains
2. wire query hooks to the domains
3. migrate mutation handlers one cluster at a time
4. remove obsolete direct choreography only after tests and smoke pass

## References

- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/plans/2026-03-13-refactor-rebuild-pattern-harvest-into-main-plan.md`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-parity-hardening.md`
- `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-13-refactor-main-selected-member-ownership-harvest-plan.md`
