---
status: complete
priority: p2
issue_id: "086"
tags: [code-review, frontend, rebuild, lockers, query]
dependencies: []
---

# Pin locker query domain granularity before rebuild implementation

## Problem Statement
The plan says locker query domains will be decided during implementation, but for this rebuild the invalidation contract is already a core architectural claim. Leaving domain granularity open risks reintroducing bundled reload behavior where slot list and assignment list are always invalidated together even when only one surface changed.

## Findings
- Phase 1 currently defers deciding query domain boundaries.
- Baseline locker reads are already split into slots and assignments.

## Proposed Solutions
1. Require separate invalidation domains for `lockerSlots` and `lockerAssignments` unless a documented reason emerges not to.
2. Document the assign/return invalidation matrix before code changes start.

## Recommended Action

Pinned the default locker invalidation split in the plan to `lockerSlots` and `lockerAssignments`, and documented the initial mutation invalidation matrix before implementation starts.

## Technical Details
- Plan: `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/plans/2026-03-12-feat-rebuild-locker-parity-expansion-plan.md`
- Baseline: `/Users/abc/projects/GymCRM_V2/frontend/src/features/lockers/useLockerQueries.ts`

## Acceptance Criteria
- [ ] Plan names the default invalidation domains for lockers
- [ ] Plan describes which mutations invalidate slots, assignments, or both

## Work Log
- 2026-03-12: Created from plan review.
- 2026-03-12: Updated the plan to require separate locker query domains and a documented assign/return invalidation matrix.

## Resources
- Draft PR: https://github.com/Again-D/GymCRM_V2/pull/73
