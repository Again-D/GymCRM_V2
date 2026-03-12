---
title: "feat: Rebuild locker parity expansion"
type: feat
status: completed
date: 2026-03-12
tags:
  - frontend
  - rebuild
  - locker
  - parity
  - worktree
---

# feat: Rebuild Locker Parity Expansion

## Overview

Extend the isolated `frontend-rebuild` prototype with `lockers` as the next operational slice after `members -> memberships/reservations -> access`.

The goal is not full breadth parity. The goal is to prove the rebuilt structure can support one more selected-member-aware operational workflow that mixes:

- list-heavy read surfaces
- selected-member handoff from the shared members-domain owner
- query ownership separate from app shell
- mutation flows that must invalidate multiple read surfaces
- role-aware visibility rules without recreating baseline `App.tsx` coordinator drift

This plan runs only inside the rebuild worktree and draft PR `#73` branch:
- branch: `codex/refactor-frontend-rebuild-v1`
- worktree: `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1`

## Problem Statement / Motivation

The rebuild prototype currently demonstrates structural viability for:

- shell/auth routing
- members as canonical selected-member owner
- memberships and reservations member-context flows
- access as an operational slice with shared invalidation

The next unanswered question is whether the same structure can absorb a workflow that is less transaction-like than memberships/reservations and less event-like than access.

`lockers` is the best next test because the baseline app already has:

- slot search/filter surfaces
- assignment lists
- assign/return mutations
- read query ownership separated from workspace-local state

See baseline references:
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/lockers/useLockerQueries.ts`
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/lockers/useLockerWorkspaceState.ts`
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/lockers/LockerManagementPanels.tsx`
- `/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-09-access-locker-query-ownership-validation.md`

This also lets us carry forward a key institutional learning from the recent rebuild review finding:

- cross-section mutations must not stay local to one slice
- shared invalidation must remain stronger than local cache reuse

Relevant notes:
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-12-frontend-rebuild-access-hardening.md`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-12-frontend-rebuild-reservation-hardening.md`
- `/Users/abc/projects/GymCRM_V2/todos/083-complete-p2-membership-prototype-mutations-do-not-propagate-across-sections.md`

## Proposed Solution

Add a `lockers` prototype slice inside `frontend-rebuild/src/pages/lockers` that follows the same rebuilt architecture rules already proven by the members/access/reservations slices.

### Canonical ownership rules

- `selectedMember` remains owned by the members-domain module/store
- locker read queries remain query-owned inside the lockers slice
- locker assign form state and feedback stay locker-local
- mutations invalidate explicit query domains rather than patching unrelated sections ad hoc

### Rebuild route contract

Replace the current locker placeholder route with a real page:
- current placeholder: `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/frontend-rebuild/src/App.tsx`
- target route: `/lockers`

### Scope for this expansion

Include:
- locker slot list
- locker assignment list
- selected-member-aware locker assignment surface
- locker return action surface
- shared pagination reuse
- trainer/admin role-aware read behavior if applicable in the baseline contract

Clarification:
- `/lockers` remains globally usable even when no member is selected
- selected member is an optional convenience input for the assignment surface
- slot search, slot list, and assignment history must stay accessible without member-context gating
- selected member may prefill or highlight the assignment form, but it must not become a required entry gate for the page

Do not include:
- real backend session/auth integration
- production cutover
- unrelated CRUD/admin slices
- breadth work on CRM/settlements/products in the same pass

## Technical Considerations

- Carry forward the explicit invalidation contract introduced for access parity:
  - `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/frontend-rebuild/src/api/queryInvalidation.ts`
- Prefer the same request-version + explicit reset style for locker read queries that the baseline and rebuild already converged on
- Keep selected-member fallback behavior consistent with memberships/reservations/access:
  - invalid or inaccessible member-context should fall back to picker/list state
- Keep route ownership shell-only:
  - do not introduce full detail-route routing as part of this slice
- Avoid local mutation drift:
  - locker assignment/return must update locker reads through the shared invalidation contract
  - if lockers affect members summary or other cross-section signals, that dependency must be explicit and tested

## System-Wide Impact

- **Interaction graph**:
  - `/members -> /lockers` should hand off through the members-domain selected-member owner only once
  - locker assign/return should trigger locker read refreshes through the shared invalidation contract, not direct shell coordination
- **Error propagation**:
  - locker query failures should stay locker-local and not poison unrelated sections
  - assignment/return failure should preserve form state and show local feedback
- **State lifecycle risks**:
  - selected member changes must reset locker-local form state safely
  - late locker responses must not repopulate cleared state after reset
- **API surface parity**:
  - baseline lockers have separate read queries and workspace-local state; rebuild should mirror the same ownership split
- **Integration test scenarios**:
  - assigning a locker should refresh slot availability and active assignment list
  - returning a locker should remove it from active assignments without stale cache reuse
  - selected-member changes should not leave the previous member prefilled in locker form state

## Proposed Deliverables

### Rebuild app code

- `frontend-rebuild/src/pages/lockers/LockersPage.tsx`
- `frontend-rebuild/src/pages/lockers/modules/useLockerQueries.ts`
- `frontend-rebuild/src/pages/lockers/modules/useLockerPrototypeState.ts`
- `frontend-rebuild/src/pages/lockers/modules/types.ts`
- optional `frontend-rebuild/src/pages/lockers/components/*`

### Supporting code

- updates to `frontend-rebuild/src/api/mockData.ts`
- updates to `frontend-rebuild/src/api/queryInvalidation.ts` if a new locker query domain is needed
- route wiring in `frontend-rebuild/src/App.tsx`

### Documentation

- locker parity execution note
- validation log for desktop/mobile smoke
- next-parity plan status updates

### Tests

- locker query tests
- locker action tests
- selected-member reset tests for `/members -> /lockers`
- invalidation tests for locker reads after assign/return

## Implementation Phases

### Phase 1: Define locker query domains

- [x] Keep separate invalidation domains for `lockerSlots` and `lockerAssignments`
- [x] Extend shared invalidation contract with `lockerSlots` and `lockerAssignments`
- [x] Document the default invalidation matrix:
  - locker assign invalidates `lockerSlots` and `lockerAssignments`
  - locker return invalidates `lockerSlots` and `lockerAssignments`
  - pure slot-filter changes invalidate neither domain and only change query keys
  - selected-member changes reset locker-local form state but do not invalidate slot/assignment data by themselves

### Phase 2: Rebuild locker read slice

- [x] Add `LockersPage`
- [x] Add locker slot read query module
- [x] Add locker assignment read query module
- [x] Add selected-member-aware locker assignment surface without gating the rest of the page
- [x] Reuse shared pagination for slot list and assignment list
- [x] Define optional selected-member prefill/highlight behavior when no member is selected

### Phase 3: Locker action parity

- [x] Add prototype locker assign action
- [x] Add prototype locker return action
- [x] Ensure assign/return update the correct read surfaces through shared invalidation
- [x] Reset locker-local form/feedback state when selected member changes

### Phase 4: Validation

- [x] Unit/integration tests for locker modules
- [x] Desktop browser smoke for `/members`, `/lockers`, `/memberships`, `/reservations`
- [x] Mobile browser smoke for `/lockers`
- [x] Record parity notes, tradeoffs, and remaining gaps

## Acceptance Criteria

- [x] `/lockers` is no longer a placeholder in `frontend-rebuild`
- [x] `selectedMember` remains owned by the members-domain store and is consumed, not recreated, by lockers
- [x] `/lockers` remains usable without selected member context
- [x] locker slot and assignment reads are query-owned and reset-safe
- [x] locker slot and assignment reads use separate invalidation domains by default
- [x] locker assign/return actions update locker read surfaces through the shared invalidation contract
- [x] changing selected member clears locker-local form state without stale repopulation
- [x] desktop and mobile browser smoke pass for the rebuilt locker slice

## Success Metrics

- the rebuild can now demonstrate four coherent slices with the same ownership model:
  - members
  - memberships
  - reservations
  - access
  - lockers
- no new ad hoc cache coupling is introduced
- the new slice still feels simpler than the baseline locker implementation, not just relocated

## Dependencies & Risks

### Dependencies

- completed access parity work and shared invalidation contract
- current rebuild auth presets and members-domain selected-member ownership
- baseline locker behavior for reference

### Risks

- locker mutations may tempt local patching instead of explicit invalidation
- selected-member handoff may drift if locker form state tries to own member context itself
- the rebuild could accidentally turn optional member context into a hard gate and narrow parity relative to baseline lockers
- locker reads could collapse back into bundled invalidation if slot/assignment domains are not kept separate from the start
- route breadth may grow too quickly if this slice pulls products or other admin concerns in prematurely
- browser smoke may expose responsive table density issues similar to earlier pagination/mobile work

## Sources & References

### Internal references
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/lockers/useLockerQueries.ts`
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/lockers/useLockerWorkspaceState.ts`
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/lockers/LockerManagementPanels.tsx`
- `/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-09-access-locker-query-ownership-validation.md`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-12-frontend-rebuild-access-hardening.md`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/plans/2026-03-12-refactor-frontend-rebuild-next-parity-expansion-plan.md`

### Institutional learnings
- `membership mutations must not stay local when other sections depend on their derived state`
- `request-version invalidation must remain stronger than cache reuse when reset semantics matter`
- `selected-member ownership should stay canonical in the members domain to avoid coordinator drift`
