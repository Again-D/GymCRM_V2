---
title: refactor: frontend rebuild breadth expansion roadmap
type: refactor
status: active
date: 2026-03-12
---

# refactor: Frontend Rebuild Breadth Expansion Roadmap

## Overview

The rebuild prototype in `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/frontend-rebuild` has now proven the core structure across these slices:

- shell/auth routing
- members
- memberships
- reservations
- access
- lockers
- products

The next phase is no longer about proving that the page-first rebuild can work at all. That has already been demonstrated. The next phase is about **expanding breadth without losing the architectural gains** that made the prototype convincing:

- canonical selected-member ownership in the members domain
- query-owned reads instead of app-shell coordination
- explicit invalidation domains
- route-level composition instead of `App.tsx` coordinator drift
- browser-testable shell/auth contracts

This roadmap organizes the remaining rebuild work into deliberate vertical slices and checkpoints so the experiment stays reviewable and we can still stop if the cost of parity starts to outweigh the clarity gain.

## Problem Statement / Motivation

After `members -> memberships/reservations -> access -> lockers`, the rebuild has enough shape to be credible, but it is still not broad enough to answer the harder product question:

> Can this rebuilt frontend replace the current admin portal structure without falling back into the same coordination problems as the baseline app?

The remaining unanswered breadth is concentrated in:

- CRUD/admin surfaces with less selected-member coupling (`products`)
- communication/event surfaces with queue/history behavior (`crm`)
- report-style read-heavy surfaces (`settlements`)
- final parity and cutover evidence for shell/auth/runtime behavior beyond prototype-only validation

Without a broader plan, the rebuild risks drifting into ad hoc slice work again. We need a clear sequence, decision gates, and success criteria for the remaining parity work.

## Proposed Solution

Treat the next phase as a **breadth-expansion program** with four ordered tracks:

1. `products` parity to prove CRUD/admin flows in the new structure
2. `crm` parity to prove queue/history/event-style screens
3. `settlements` parity to prove read-heavy reporting and filter state
4. final parity hardening and cutover readiness review

This plan intentionally avoids broadening all remaining sections at once. Each slice should either confirm the rebuild's advantage or provide an explicit signal to stop.

## Technical Considerations

- Keep `selectedMember` canonical ownership in the members-domain store. New slices may consume it, but must not recreate it.
- Reuse the rebuild-wide invalidation contract already introduced for access/lockers.
- Keep shell-only routing boundaries intact. Do not introduce full detail-route expansion in the same roadmap.
- Continue using explicit slice-local query modules and slice-local mutation state.
- Treat product data as a shared canonical query/domain wherever other slices consume product-derived state; `/products` should own CRUD forms and page-local feedback, not a second authoritative product store.
- Preserve the runtime auth preset model so shell/auth/browser validation remains executable in the running prototype.
- Treat browser smoke and mobile checks as part of each slice, not as a final afterthought.

## System-Wide Impact

- **Interaction graph**
  - `products` should validate CRUD surfaces without member-context drift.
  - `crm` should validate queue/history reads plus mutation-like actions that affect other read surfaces.
  - `settlements` should validate heavy filters, reporting summaries, and route-state persistence without bloating app shell ownership.
- **Error propagation**
  - Each new slice should keep errors local and avoid turning app shell into a shared error coordinator.
- **State lifecycle risks**
  - Filters, pagination, selected member, and invalidation must stay explicit and reset-safe.
- **API surface parity**
  - New rebuild slices must continue mirroring the baseline's real surface area closely enough that architecture comparisons stay meaningful.
- **Integration test scenarios**
  - Each added slice should include at least one cross-section scenario showing invalidation/refresh behavior across slice boundaries.
  - `products` should include a product mutation scenario that refreshes another product-consuming slice such as memberships.

## Roadmap Phases

### Phase 1: Products Slice

Goal:
- prove the rebuild can support a CRUD/admin slice that is not primarily member-context driven

Scope:
- `/products` route becomes a real page
- product list, create/edit surface, and active/inactive state handling
- pagination and filter behavior preserved where relevant
- explicit invalidation for product reads after mutation
- product data remains shared for cross-slice consumers such as memberships, rather than becoming page-local to `/products`

Success criteria:
- product CRUD flow is readable without app-shell coordination
- route and local form ownership remain clear
- product create/update/archive invalidates a shared product domain that non-`/products` consumers can re-read
- rebuild still feels simpler than baseline product management

Shared ownership rule for this slice:
- `/products` owns:
  - CRUD form state
  - submit/error/success feedback
  - page-local filter state
- shared product domain owns:
  - canonical product list/query cache
  - invalidation after create/update/archive
  - cross-slice consumption by memberships and any other product-derived read surfaces

### Phase 2: CRM Slice

Goal:
- prove the rebuild can support communication/event workflows with queue/history style UI

Scope:
- `/crm` route becomes a real page
- queue/history list surfaces
- key filter/search behavior
- representative action surface where parity is valuable
- local error handling and explicit read invalidation

Success criteria:
- queue/history reads are query-owned and reset-safe
- any action surface does not create hidden cross-section coupling
- desktop/mobile smoke stays manageable in the rebuilt structure

### Phase 3: Settlements Slice

Goal:
- prove the rebuild can handle reporting-oriented screens with broader filter state and summary outputs

Scope:
- `/settlements` route becomes a real page
- report filters, summary cards, result tables
- pagination where needed
- route refresh stability and filter reset rules

Success criteria:
- report state is explainable without reintroducing shell-level coordinator logic
- filter/query ownership is explicit
- browser smoke demonstrates the screen is usable at realistic viewport sizes

### Phase 4: Final Parity Hardening

Goal:
- assess whether the rebuild is approaching replacement-grade parity or should remain an experimental branch

Scope:
- parity matrix refresh
- cross-slice invalidation review
- shell/auth/runtime contract review
- mobile/desktop smoke refresh across covered slices
- identify remaining unsupported areas and cutover blockers

Success criteria:
- we can state clearly whether the rebuild should:
  - continue toward cutover
  - remain a long-lived experiment
  - stop after extracting lessons into the main app

## Acceptance Criteria

- [ ] A clear expansion order exists for the remaining rebuild slices
- [ ] `products`, `crm`, and `settlements` each have a distinct architectural purpose in the roadmap
- [ ] Each slice is tied to a specific parity question, not just feature breadth
- [ ] Shared invalidation, selected-member ownership, and shell routing boundaries remain fixed across future work
- [ ] The roadmap includes a final go/no-go style parity hardening checkpoint

## Success Metrics

- each additional slice increases coverage without making the rebuild architecture harder to explain
- no new slice forces selected-member ownership back into app shell
- invalidation and query ownership stay explicit instead of drifting toward bundled reload behavior
- the rebuild remains reviewable via draft PR `#73` with evidence attached per slice

## Dependencies & Risks

### Dependencies

- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/plans/2026-03-12-refactor-frontend-rebuild-in-worktree-plan.md`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/plans/2026-03-12-refactor-frontend-rebuild-next-parity-expansion-plan.md`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/plans/2026-03-12-feat-rebuild-locker-parity-expansion-plan.md`
- draft PR `#73`

### Risks

- breadth work can become cosmetic parity without proving new architectural value
- `crm` or `settlements` may expose new coordinator pressure that weakens the current page-first direction
- too many slices can be added before the branch earns another serious review checkpoint
- runtime mock/prototype evidence may overstate readiness if we stop validating browser behavior per slice

## Recommended Next Order

1. `products` ✅ completed
2. `crm`
3. `settlements`
4. parity hardening checkpoint

Why this order:
- `products` is the cleanest next contrast to the operational slices already proven
- `crm` then tests queue/history style workflows
- `settlements` is best left after more slice patterns are proven because reporting screens often force broad filter/query decisions

## Sources & References

- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/plans/2026-03-12-refactor-frontend-rebuild-in-worktree-plan.md`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/plans/2026-03-12-refactor-frontend-rebuild-next-parity-expansion-plan.md`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/plans/2026-03-12-feat-rebuild-locker-parity-expansion-plan.md`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-12-frontend-rebuild-prototype-checkpoint.md`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-12-frontend-rebuild-locker-smoke.md`
