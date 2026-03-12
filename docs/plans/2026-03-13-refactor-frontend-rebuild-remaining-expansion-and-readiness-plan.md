---
title: refactor: frontend rebuild remaining expansion and readiness
type: refactor
status: active
date: 2026-03-13
---

# refactor: Frontend Rebuild Remaining Expansion And Readiness

## Overview

The rebuild prototype in `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/frontend-rebuild` has already proven the new structure across these slices:

- shell/auth routing
- members
- memberships
- reservations
- access
- lockers
- products
- crm

At this point, the remaining work is no longer “keep adding slices until the branch feels large enough.” The remaining work is narrower and more important than that:

1. finish the last major uncovered operational/reporting slice (`/settlements`)
2. harden cross-slice parity and invalidation behavior across the rebuilt app
3. decide whether the rebuild should continue toward cutover readiness, remain a long-lived experiment, or stop after extracting lessons

This plan exists to keep that final stretch deliberate. It should prevent the rebuild branch from drifting into open-ended exploration after the main architectural questions have already been answered.

## Problem Statement / Motivation

The rebuild branch has enough breadth to be convincing, but it still has one major blind spot: **reporting-oriented screens with broad filter state and summary outputs**. That gap matters because reporting screens stress the architecture differently from operational slices:

- they are less member-context driven
- they often have broader filter state
- they are more vulnerable to state duplication and route/query drift
- they can tempt central coordination if the page structure is not clear

Without a `settlements` slice and a final parity hardening pass, we still cannot answer the bigger product question with confidence:

> Is the rebuilt frontend only good at local prototype slices, or is it actually coherent enough to support the remaining admin portal surface without slipping back into coordinator-heavy behavior?

## Proposed Solution

Treat the remaining work as a focused three-phase finish:

1. implement `settlements` parity as the final major uncovered slice
2. run a rebuild-wide parity hardening pass across all completed slices
3. perform a formal readiness checkpoint and record a go/no-go recommendation for the branch

This plan intentionally avoids expanding into new surface area beyond the baseline admin portal. The goal is not to grow the rebuild endlessly. The goal is to determine whether the rebuild branch has earned another level of confidence.

## Technical Considerations

- Keep `selectedMember` canonical ownership in the members-domain support module/store. No new global coordinator is allowed.
- Keep shell-only routing boundaries intact. Do not add full detail-route expansion in the same phase.
- Keep query-owned reads and page-local mutation state separated.
- Continue using explicit invalidation domains instead of bundled reload behavior.
- Preserve the runtime auth preset model so JWT/prototype browser validation remains executable in the running prototype.
- Use the rebuilt product/query invalidation pattern as the model for remaining shared domains.
- Treat `settlements` as a route-level composition problem, not as an excuse to grow app-shell ownership.

## System-Wide Impact

- **Interaction graph**
  - `settlements` will validate reporting queries, filter ownership, and summary rendering in the rebuilt page-first structure.
  - the final hardening phase will test whether mutation-driven invalidation still behaves coherently once all covered slices are exercised together.
- **Error propagation**
  - reporting and cross-slice reload failures must remain local to their page/query modules.
  - final hardening must identify whether any page has silently recreated app-shell error coordination.
- **State lifecycle risks**
  - reporting filters, selected-member context, and shared query domains are the highest risk for accidental re-centralization.
  - final hardening must explicitly verify reset behavior, stale-response guards, and invalidation coverage.
- **API surface parity**
  - the rebuild should be judged against the currently supported baseline surface, not against hypothetical future features.
- **Integration test scenarios**
  - at least one cross-slice scenario must prove that a shared-domain mutation refreshes another consumer without manual page reload.
  - at least one shell/auth scenario must prove route stability across refresh and mode changes.

## Implementation Phases

### Phase 1: Settlements Parity Slice

Goal:
- prove the rebuild can support a reporting-heavy page without app-shell coordinator drift

Scope:
- `/settlements` route becomes a real page
- summary cards, report filters, result table, and pagination where applicable
- explicit query module(s) for settlement reads
- page-local filter state and feedback state
- desktop/mobile browser smoke

Success criteria:
- settlement filters are page-owned and easy to explain
- report queries are query-owned and reset-safe
- refresh and route reload keep the screen usable without reintroducing shell-level state coupling
- desktop/mobile smoke shows the page remains usable at realistic viewport sizes

### Phase 2: Final Parity Hardening

Goal:
- validate that the completed slices still behave coherently together as one rebuilt app

Scope:
- rebuild-wide invalidation review
- stale-response / debounce / cache review for remaining shared domains
- shell/auth/runtime preset review
- cross-slice smoke covering at least:
  - members -> memberships
  - members -> reservations
  - members -> access
  - members -> lockers
  - products -> memberships consumer refresh
  - crm history/queue actions
  - settlements route refresh and filter persistence behavior
- documentation refresh for any remaining parity gaps

Success criteria:
- no completed slice depends on implicit app-shell reload behavior
- shared domains remain explicit and reviewable
- no major cross-slice stale-state regression remains open in the prototype
- the parity story is documented in a way that another engineer can review without replaying all branch history

### Phase 3: Readiness Checkpoint

Goal:
- decide what this branch is for next

Scope:
- refresh the rebuild parity matrix
- classify remaining unsupported or shallow areas, if any
- summarize architectural wins vs remaining migration cost
- record recommendation in writing:
  - continue toward cutover readiness
  - keep as long-lived experiment and harvest patterns into `main`
  - stop after documentation and lessons extraction

Success criteria:
- the branch has a written recommendation with concrete reasoning
- the recommendation is based on evidence from implemented slices and browser/test validation, not intuition alone
- the next move for the rebuild is unambiguous for reviewers

## Acceptance Criteria

- [x] `settlements` parity is implemented as a real rebuilt slice
- [x] desktop/mobile smoke is recorded for the rebuilt settlements page
- [ ] a rebuild-wide parity hardening pass is completed across covered slices
- [ ] shared invalidation, selected-member ownership, and shell routing boundaries remain fixed
- [ ] a written readiness checkpoint records whether the rebuild should continue, pause, or stop
- [ ] the draft PR remains reviewable with current evidence and documentation

## Success Metrics

- the rebuilt app can now explain both operational slices and reporting slices without app-shell coordinator drift
- cross-slice invalidation remains explicit instead of devolving into manual reload behavior
- the parity story is easier to understand from current documents than from branch archaeology
- the final recommendation can be defended with test, build, and browser evidence

## Dependencies & Risks

### Dependencies

- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/plans/2026-03-12-refactor-frontend-rebuild-in-worktree-plan.md`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/plans/2026-03-12-refactor-frontend-rebuild-breadth-expansion-roadmap-plan.md`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/plans/2026-03-13-feat-rebuild-crm-parity-expansion-plan.md`
- draft PR `#73`

### Risks

- `settlements` may expose broader filter/query coordination pressure than the operational slices did
- parity hardening may reveal hidden duplication across slices that looked acceptable in isolation
- the branch may become “almost complete” without ever earning a clear go/no-go decision if Phase 3 is not treated as a real checkpoint
- runtime mock evidence can still overstate real integration readiness if the final checkpoint does not describe those limits clearly

## Recommended Execution Order

1. `settlements` parity slice
2. rebuild-wide parity hardening
3. readiness checkpoint and branch recommendation

Why this order:
- `settlements` is the last major missing architectural test case
- parity hardening is more meaningful after the last big slice is present
- the branch recommendation should be based on the widest credible rebuilt surface, not on partial breadth

## Sources & References

- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/plans/2026-03-12-refactor-frontend-rebuild-in-worktree-plan.md`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/plans/2026-03-12-refactor-frontend-rebuild-breadth-expansion-roadmap-plan.md`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/plans/2026-03-13-feat-rebuild-crm-parity-expansion-plan.md`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-12-frontend-rebuild-prototype-checkpoint.md`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-crm-hardening.md`

- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-settlements-hardening.md`
