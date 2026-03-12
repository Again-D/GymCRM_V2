---
title: feat: rebuild crm parity expansion
type: feat
status: completed
date: 2026-03-13
---

# feat: Rebuild CRM Parity Expansion

## Overview

Extend the isolated `frontend-rebuild` prototype with a real `/crm` slice after the rebuild has already proven these areas:

- shell/auth routing
- members
- memberships
- reservations
- access
- lockers
- products

This slice should validate a different kind of workflow from the slices already covered: a queue/history-oriented operational screen with trigger/process actions, filter-heavy reads, and history tables that are not primarily driven by `selectedMember`.

The work stays inside the rebuild experiment only:
- branch: `codex/refactor-frontend-rebuild-v1`
- worktree: `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1`
- draft PR: `#73`

## Problem Statement / Motivation

The rebuild has already shown that the new structure works for:
- selected-member-heavy operational flows (`memberships`, `reservations`)
- mixed operational/admin flows (`access`, `lockers`)
- standalone CRUD/admin flows (`products`)

What is still unproven is whether the rebuild handles a screen whose center of gravity is:
- queue/history query ownership
- action-triggered refreshes
- event/process style UX
- filters and pagination over operational history

`/crm` is the right next slice because the baseline screen is primarily about:
- loading history rows
- filtering by send status and limit
- triggering a message enqueue path
- processing queued messages
- surfacing action feedback without handing coordination back to `App.tsx`

If we can rebuild `/crm` cleanly, we will have covered one more important UI class: event/queue management surfaces that combine query results with explicit action-triggered invalidation.

Baseline references:
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/crm/CrmSection.tsx`
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/crm/CrmMessagePanels.tsx`
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/crm/useCrmHistoryQuery.ts`
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/crm/useCrmWorkspaceState.ts`

Related roadmap:
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/plans/2026-03-12-refactor-frontend-rebuild-breadth-expansion-roadmap-plan.md`

## Proposed Solution

Replace the current `/crm` placeholder route in `frontend-rebuild` with a real `CrmPage` that follows the rebuild's existing contracts:

- shell routing stays the same
- query-owned reads stay local to the slice
- action state stays page-local
- shared invalidation domains are explicit
- errors and feedback remain local to `/crm`

The slice should prove that the rebuild can model a queue/history workflow without creating hidden cross-slice coupling or reintroducing app-shell coordinator logic.

## Technical Considerations

### Route contract

Replace the current `/crm` placeholder in:
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/frontend-rebuild/src/App.tsx`

with a real page:
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/frontend-rebuild/src/pages/crm/CrmPage.tsx`

### Ownership rules

`/crm` is **not** a selected-member-gated page.

- `selectedMember` should not become a gate or canonical owner for CRM state.
- CRM filters, queue/process actions, and history queries belong to the CRM slice.
- If future CRM flows gain member-context affordances, that should be additive, not a requirement for entering the route.

### Query ownership

Create a CRM-specific query module for the history table.

Suggested module:
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/frontend-rebuild/src/pages/crm/modules/useCrmHistoryQuery.ts`

The query should own:
- `crmHistoryRows`
- `crmHistoryLoading`
- `crmHistoryError`
- `loadCrmHistory()`
- `resetCrmHistoryQuery()`

It should preserve rebuild conventions:
- request-version guard
- reset-safe behavior
- cache/in-flight dedupe where useful
- explicit domain-based invalidation

### Invalidation contract

Pin CRM domains before implementation instead of deciding them ad hoc.

Default split:
- `crmHistory`
- `crmQueue`

Mutation matrix:
- trigger/enqueue action invalidates:
  - `crmHistory`
  - `crmQueue`
- queue process action invalidates:
  - `crmHistory`
  - `crmQueue`
- local filter changes do **not** invalidate; they only cause re-query/load in the CRM query module

### Page-local state

Create a CRM-local action state module for:
- filter form state
- trigger days ahead input
- trigger submitting state
- process submitting state
- page-local success/error feedback

Suggested module:
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/frontend-rebuild/src/pages/crm/modules/useCrmPrototypeState.ts`

This module should not own history rows. It should only own action/form state.

### Mock/runtime parity

The rebuild runtime currently uses executable auth presets and mock-backed data. CRM parity should remain browser-runnable in that environment.

That means:
- add CRM mock responses to `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/frontend-rebuild/src/api/mockData.ts`
- keep queue/history behavior believable enough for browser smoke and state-flow testing
- do not require real backend session wiring for this parity slice

## System-Wide Impact

- **Interaction graph**
  - CRM trigger/process actions should update CRM history through explicit invalidation instead of silent local patching.
- **Error propagation**
  - action failures stay local to `/crm`; app shell should not become an error coordinator.
- **State lifecycle risks**
  - filter resets and query resets must not leave stale history rows or stale loading states.
- **API surface parity**
  - the rebuild should continue mirroring the baseline CRM surface closely enough for architectural comparison to remain meaningful.
- **Integration test scenarios**
  - trigger action updates history after invalidation
  - process action updates history after invalidation
  - repeated filter loads stay reset-safe and request-safe

## Proposed Deliverables

### Rebuild app code

- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/frontend-rebuild/src/pages/crm/CrmPage.tsx`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/frontend-rebuild/src/pages/crm/modules/useCrmHistoryQuery.ts`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/frontend-rebuild/src/pages/crm/modules/useCrmPrototypeState.ts`
- optional: `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/frontend-rebuild/src/pages/crm/modules/types.ts`

### Supporting code

- updates to `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/frontend-rebuild/src/api/mockData.ts`
- updates to `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/frontend-rebuild/src/api/queryInvalidation.ts`
- route wiring in `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/frontend-rebuild/src/App.tsx`

### Documentation

- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-crm-hardening.md`
- roadmap update after CRM completion

### Tests

- CRM query tests
- CRM action-state tests
- invalidation tests for `crmHistory` / `crmQueue`
- routing/build regression coverage as needed

## Implementation Phases

### Phase 1: CRM data contracts

- [x] Add CRM invalidation domains to the rebuild-wide invalidation contract
- [x] Add CRM mock data and endpoints to the rebuild runtime source
- [x] Define CRM row/filter/action types as needed
- [x] Add tests that prove CRM mock actions change CRM history data

### Phase 2: CRM query and action modules

- [x] Create `useCrmHistoryQuery` with request-version/reset-safe behavior
- [x] Create `useCrmPrototypeState` for filters and action UI state
- [x] Keep history rows query-owned and action/form state page-local
- [x] Add tests for query reset/invalidation and local action transitions

### Phase 3: CRM page wiring

- [x] Add `CrmPage`
- [x] Replace `/crm` placeholder route with the real page
- [x] Implement history table, filters, trigger action, and process action surface
- [x] Apply shared pagination if history size warrants it
- [x] Keep feedback and errors local to the page

### Phase 4: Validation

- [x] Unit/integration tests for CRM modules pass
- [x] Desktop browser smoke for `/crm`
- [x] Mobile browser smoke for `/crm`
- [x] Record notes, evidence, and remaining parity gaps

## Acceptance Criteria

- [x] `/crm` is no longer a placeholder in `frontend-rebuild`
- [x] CRM history rows are owned by a query module, not page-local action state
- [x] CRM page owns only filters, action state, and feedback
- [x] trigger/process actions invalidate explicit CRM domains
- [x] CRM remains usable without selected-member context
- [x] query/reset behavior is request-safe and reset-safe
- [x] desktop and mobile browser smoke pass for the rebuilt CRM slice

## Success Metrics

- the rebuild can now demonstrate a queue/history/event-style operational surface in addition to prior slices
- the CRM slice remains easier to explain than the baseline CRM composition
- no hidden coordinator logic leaks back into the shell or a global store
- the rebuild draft PR remains reviewable with slice-specific evidence attached

## Dependencies & Risks

### Dependencies

- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/plans/2026-03-12-refactor-frontend-rebuild-breadth-expansion-roadmap-plan.md`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-12-frontend-rebuild-products-hardening.md`
- draft PR `#73`

### Risks

- CRM action surfaces may tempt bundled reload behavior if invalidation domains are not kept explicit
- history filters may drift into page-local cached tables that bypass query ownership
- mock queue/process behavior may become too unrealistic if not kept close to baseline semantics
- browser smoke may reveal layout pressure from history tables on mobile widths

## Sources & References

- `/Users/abc/projects/GymCRM_V2/frontend/src/features/crm/CrmSection.tsx`
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/crm/CrmMessagePanels.tsx`
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/crm/useCrmHistoryQuery.ts`
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/crm/useCrmWorkspaceState.ts`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/plans/2026-03-12-refactor-frontend-rebuild-breadth-expansion-roadmap-plan.md`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-12-frontend-rebuild-products-hardening.md`
