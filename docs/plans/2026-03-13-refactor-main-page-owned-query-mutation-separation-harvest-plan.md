---
title: refactor: harvest page-owned query and mutation separation into main
type: refactor
status: active
date: 2026-03-13
---

# refactor: Harvest Page-Owned Query / Mutation Separation Into Main

## Overview

The rebuild branch showed that one of the clearest structural improvements was **making each page or workspace explicit about two separate responsibilities**:

1. which reads it owns
2. which mutations / local action state it owns

The baseline frontend in `main` already improved in two important ways:
- selected-member ownership now lives in the `members` domain
- explicit query invalidation domains now exist for the highest-pressure shared reads

The next step is to reduce the remaining cases where a page mixes too many query reads, mutation orchestration, and follow-up UI state in one large shell coordinator.

This plan harvests the rebuild pattern without attempting a full rewrite.

## Problem Statement / Motivation

`App.tsx` has become smaller and clearer than before, but several workflows still rely on a shell-level coordination style where:
- page-local form state lives in a feature hook
- read queries live in their own hooks
- mutations are still orchestrated in `App.tsx`
- mutation success handling directly patches local state, sets panel messages, and coordinates downstream reads

That creates three remaining costs:

1. page boundaries are still less explicit than they could be
2. mutation behavior is harder to test in isolation than read behavior
3. `App.tsx` still carries page business rules that belong closer to the page or workspace domain

The rebuild branch proved a better direction:
- queries are owned close to the page that renders them
- mutation state is owned close to the page that submits them
- invalidation is explicit rather than hidden inside shell choreography
- the shell mainly composes sections instead of owning their business workflows

## Proposed Solution

Harvest the pattern of **page-owned query / mutation separation** into `main`, one operational slice at a time.

The first pass should focus on the slices where the payoff is highest and recent ownership work already reduced the surrounding risk:
- `memberships`
- `reservations`
- `products`

Each target slice should move toward this shape:
- query reads remain in dedicated query hooks
- mutation action state lives in a page-local or slice-local hook
- the page or section binds reads + mutation state together
- `App.tsx` passes high-level composition props and shared context, but stops being the place that owns workflow semantics

This is **not** a full page rewrite and **not** a rebuild cutover. It is a bounded harvest of the most successful rebuild pattern.

## Technical Considerations

- Keep `selectedMember` ownership in the `members` domain.
- Keep explicit invalidation domains from the previous harvest; this plan builds on them.
- Do not move all mutation logic into one global action store.
- Each slice should own its own form draft, submitting state, page-level feedback, and mutation helpers.
- Query reads should stay query-owned; mutation hooks should not quietly absorb unrelated read ownership.
- `App.tsx` should retain routing, auth composition, and cross-section layout responsibilities, but lose page-specific workflow detail where parity allows.

## Candidate Harvest Targets

### 1. `memberships`

Current pressure:
- membership purchase / hold / resume / refund mutation paths are still coordinated in `App.tsx`
- purchase form state already lives in `/Users/abc/projects/GymCRM_V2/frontend/src/features/memberships/useMembershipWorkspaceState.ts`
- selected member context already comes from the `members` domain

Target direction:
- create a memberships mutation hook owned by the memberships slice
- keep membership reads (`memberMembershipsByMemberId`, payments, selected member) explicit
- have `/Users/abc/projects/GymCRM_V2/frontend/src/features/memberships/MembershipsSection.tsx` consume both the query inputs and mutation state directly

### 2. `reservations`

Current pressure:
- reservation create / cancel / check-in / complete / no-show are still coordinated in `App.tsx`
- reservation target list and schedules already have their own query hooks
- selected member ownership is already harvested

Target direction:
- create a reservations mutation hook for create and status transitions
- keep reservation target / schedule queries explicit
- let `/Users/abc/projects/GymCRM_V2/frontend/src/features/reservations/ReservationsSection.tsx` bind selected-member context, query inputs, and action state without `App.tsx` owning the workflow details

### 3. `products`

Current pressure:
- product create / update / status toggle still live in `App.tsx`
- product query ownership already exists and explicit invalidation now exists

Target direction:
- create a product mutation hook owned by the products slice
- keep product list query separate from form state and mutation feedback
- let `/Users/abc/projects/GymCRM_V2/frontend/src/features/products/ProductsSection.tsx` take over page-local orchestration

## Out Of Scope

- rewriting access / lockers / crm / settlements in the same pass
- introducing a global mutation store
- changing route structure or selected-member ownership again
- replacing explicit invalidation with a new remote-state library
- cutting over to the rebuild prototype

## Implementation Phases

### Phase 1: Memberships Slice Harvest

Goal:
- move memberships mutation choreography out of `App.tsx`

Scope:
- purchase submission
- hold / resume submission
- refund preview / submit
- page-level feedback and submitting state
- keep reads explicit and selected-member driven

Success criteria:
- memberships mutation behavior is owned by a memberships slice hook
- `App.tsx` no longer carries detailed membership mutation orchestration
- invalidation contract is still used rather than replaced by ad hoc reloads

### Phase 2: Reservations Slice Harvest

Goal:
- move reservation mutation choreography out of `App.tsx`

Scope:
- reservation create
- cancel / check-in / complete / no-show
- page-level action feedback and submitting state
- selected-member driven reservation list stays explicit

Success criteria:
- reservations action handling is owned by a reservations slice hook
- `App.tsx` stops being the reservation mutation coordinator
- query invalidation / selected-member refresh still behave correctly

### Phase 3: Products Slice Harvest

Goal:
- move product mutation choreography out of `App.tsx`

Scope:
- create / update / status toggle
- product form submitting / error / message ownership
- keep products query and selected-product read behavior explicit

Success criteria:
- products mutation behavior lives in the products slice
- `App.tsx` no longer owns page-local product workflow semantics

### Phase 4: Validation And Cleanup

Goal:
- verify the harvest reduced shell coordination without reintroducing stale-state bugs

Scope:
- targeted tests around each slice mutation hook
- browser smoke on memberships / reservations / products
- trim obsolete shell helpers only after parity is proven

Success criteria:
- `App.tsx` is meaningfully lighter in workflow-specific mutation logic
- page ownership is easier to explain from code search
- cross-slice refresh and selected-member handoff still behave correctly

## Acceptance Criteria

- [x] memberships mutation orchestration is slice-owned
- [ ] reservations mutation orchestration is slice-owned
- [ ] products mutation orchestration is slice-owned
- [ ] explicit query invalidation remains the refresh mechanism
- [ ] selected-member ownership remains canonical in the members domain
- [x] `App.tsx` loses a meaningful amount of page-specific business logic
- [x] tests cover the new mutation-owner hooks and at least one cross-slice refresh path

## Success Metrics

- fewer workflow mutation handlers remain in `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`
- page ownership becomes easier to explain without referring back to shell coordinator code
- mutation tests become more local and less dependent on shell rendering

## Risks

- moving too much into mutation hooks can accidentally absorb read ownership too
- page-local hooks can become mini shell coordinators if they take on too many responsibilities
- invalidation can become less clear if mutation hooks hide domain effects instead of naming them explicitly

## Recommended Execution Order

1. memberships
2. reservations
3. products
4. cleanup and validation

## References

- `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-13-refactor-main-selected-member-ownership-harvest-plan.md`
- `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-13-refactor-main-explicit-query-invalidation-harvest-plan.md`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/plans/2026-03-13-refactor-rebuild-pattern-harvest-into-main-plan.md`
