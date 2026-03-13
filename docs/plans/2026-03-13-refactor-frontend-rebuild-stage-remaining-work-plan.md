---
title: refactor: frontend rebuild stage remaining work
type: refactor
status: active
date: 2026-03-13
---

# refactor: Frontend Rebuild Stage Remaining Work

## Status Note

This document captured the correct recommendation for the rebuild branch at the end of the earlier prototype/readiness phase: keep it as a long-lived reference experiment and focus on pattern harvest into `main`.

That recommendation has since been superseded by:
- `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-13-refactor-frontend-replacement-candidate-project-plan.md`

Use this document as historical context for the branch closeout stage. For current branch-role guidance and next-step planning, treat the replacement-candidate plan as canonical.

## Overview

The rebuild prototype in `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/frontend-rebuild` has already covered the main breadth needed for architectural evaluation:

- shell/auth routing
- members
- memberships
- reservations
- access
- lockers
- products
- crm
- settlements

The remaining work is no longer about proving that the rebuild can add more pages. The remaining work is about deciding what to do with the rebuild now that the core experiment has succeeded.

This plan defines the remaining tasks for the rebuild stage itself:

1. keep the rebuild branch reviewable and evidence-backed
2. close any remaining draft-PR structural concerns quickly
3. decide what gets harvested into `main`
4. decide whether the rebuild stays a long-lived experiment, enters a new parity phase, or is frozen as reference architecture

## Problem Statement / Motivation

Without a final-stage plan, the rebuild branch can drift in one of two bad directions:

- it keeps growing without a new architectural question
- it stops moving, but nobody extracts the patterns it proved

That would waste the strongest output of the rebuild effort.

The rebuild has already produced useful evidence:

- route-first page composition is easier to explain
- `selectedMember` works better as a members-domain owner
- query-owned reads plus explicit invalidation are more reviewable than bundled reload behavior
- multiple slices can coexist without falling back into `App.tsx`-heavy orchestration

The remaining work should turn those observations into decisions.

## Goals

- keep draft PR `#73` understandable to reviewers without requiring branch archaeology
- maintain the rebuild branch as a stable reference implementation
- identify which patterns should be harvested into `main` next
- make an explicit recommendation about the rebuild branch's future

## Non-Goals

- do not keep adding slices just to increase surface area
- do not begin a cutover migration from baseline frontend to rebuild frontend in this phase
- do not rewrite backend/API contracts to serve the rebuild branch

## Proposed Solution

Treat the remaining rebuild stage as a three-part closeout and transition phase:

1. reviewability and evidence maintenance
2. pattern-harvest planning into `main`
3. branch-future recommendation and operating rules

## Technical Considerations

- The rebuild branch should remain isolated in its own worktree and branch.
- Draft PR `#73` should stay the canonical review surface for the experiment.
- Machine-local `.worktrees/...` paths are working paths only, not durable evidence references.
- Durable rebuild evidence must live in files tracked by the rebuild branch itself, and key checkpoint/readiness docs that are referenced from the main repo should be mirrored into stable tracked paths before the worktree is treated as a long-lived reference.
- New code in the rebuild branch should require a fresh architectural question or a documented parity gap.
- Pattern harvests should happen in normal `main`-targeting feature branches, not inside the rebuild branch.
- The rebuild branch should remain runnable with:
  - build passing
  - tests passing
  - runtime auth presets available
  - smoke evidence preserved in docs

## Implementation Phases

### Phase 1: Review Surface Maintenance

Goal:
- keep draft PR `#73` current, reviewable, and evidence-backed

Tasks:
- refresh PR summary if structure or scope changes materially
- keep key docs current:
  - readiness checkpoint
  - parity hardening notes
  - slice smoke notes
  - rebuild folder structure note
- ensure each new follow-up fix is linked to evidence or a documented finding
- mirror any machine-local-only checkpoint/readiness evidence into branch-tracked docs before calling the branch reviewable
- keep the rebuild worktree clean and reproducible

Success criteria:
- a reviewer can understand the branch from current docs and PR text without depending on a machine-local worktree path
- no unresolved structural finding is silently left in draft state
- the rebuild branch still builds and tests cleanly

### Phase 2: Pattern Harvest Planning

Goal:
- convert rebuild wins into concrete `main`-targeting follow-up work

Tasks:
- maintain a prioritized list of harvest candidates
- identify which patterns are already mature enough to move into `main`
- write follow-up implementation plans in the main repo for the top candidates
- track adoption state:
  - planned
  - in progress
  - adopted
  - deferred

Initial harvest candidates:
- selected-member canonical ownership
- explicit query invalidation contract
- page-owned query / mutation separation
- route metadata discipline refinements

Success criteria:
- each high-confidence pattern has a clear migration path into `main`
- the rebuild branch is no longer the only place where the architecture improvements live

### Phase 3: Branch Recommendation And Operating Rules

Goal:
- remove ambiguity about what the rebuild branch is for next

Tasks:
- classify the branch as one of:
  - long-lived reference experiment
  - active parity continuation
  - frozen reference after harvest
- define the rule for when new rebuild work is justified
- record whether future work should focus on:
  - parity expansion
  - pattern harvest only
  - maintenance only
- keep the recommendation updated if major new evidence appears

Default recommendation unless new evidence changes it:
- keep the rebuild as a long-lived reference experiment
- continue harvesting proven patterns into `main`
- do not pursue cutover planning yet

Success criteria:
- there is one documented answer to "what is this rebuild branch for now?"
- future work on the rebuild branch has a decision gate instead of open-ended expansion

## Acceptance Criteria

- [ ] draft PR `#73` remains current and reviewable
- [ ] rebuild branch docs reflect the actual current prototype state
- [ ] high-confidence harvest candidates are explicitly listed and prioritized
- [ ] at least one additional rebuild pattern beyond selected-member ownership is planned for `main`
- [ ] the rebuild branch has a current written recommendation for its future role

## Success Metrics

- reviewers can understand the rebuild branch from current documentation alone
- rebuild work leads to concrete `main` improvements instead of staying isolated
- future rebuild work is triggered by explicit architectural questions, not momentum alone

## Risks

- the branch can become a permanent side project if harvest work is not prioritized
- docs can drift from code if the draft PR is not kept current
- machine-local worktree evidence can disappear if it is not mirrored into durable tracked docs
- the team can overvalue mock-driven confidence and mistake the branch for cutover-ready

## Recommended Execution Order

1. keep PR `#73` and rebuild docs current
2. continue harvesting proven patterns into `main`
3. revisit the rebuild branch recommendation only when new architectural evidence appears

Why this order:
- reviewability protects the value of the experiment
- harvest work converts that value into production improvements
- branch-future decisions should be revisited only when evidence changes

## References

- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-readiness-checkpoint.md`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-parity-hardening.md`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/plans/2026-03-13-refactor-rebuild-pattern-harvest-into-main-plan.md`
- `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-13-refactor-main-selected-member-ownership-harvest-plan.md`
- draft PR `#73`
