---
status: complete
priority: p2
issue_id: "085"
tags: [code-review, frontend, rebuild, lockers, architecture]
dependencies: []
---

# Keep lockers usable without member-context in rebuild plan

## Problem Statement
The rebuild locker parity plan currently frames `/lockers` as a selected-member-aware workflow with fallback when no member is selected, but the baseline locker screen is still a globally usable operational screen with an optional member picker for assignment. If the rebuild treats member-context as mandatory instead of optional, it can accidentally narrow the workflow and distort parity.

## Findings
- Plan lines around scope and fallback lean heavily on selected-member-aware behavior.
- Baseline locker UI keeps slot search and assignment lists usable even without a selected member.

## Proposed Solutions
1. Explicitly state that `/lockers` stays globally usable and selected member only pre-fills/highlights the assignment form.
2. Split the page contract into global read surfaces plus optional selected-member assignment affordances.

## Recommended Action

Clarified the plan so `/lockers` stays globally usable without selected member context. Selected member is now explicitly described as an optional prefill/highlight affordance for the assignment surface only.

## Technical Details
- Plan: `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/plans/2026-03-12-feat-rebuild-locker-parity-expansion-plan.md`
- Baseline: `/Users/abc/projects/GymCRM_V2/frontend/src/features/lockers/LockerManagementPanels.tsx`

## Acceptance Criteria
- [ ] Plan says `/lockers` remains usable without selected member
- [ ] Plan defines selected member as optional prefill, not required gate

## Work Log
- 2026-03-12: Created from plan review.
- 2026-03-12: Updated the plan to keep slot search and assignment history usable without member-context gating.

## Resources
- Draft PR: https://github.com/Again-D/GymCRM_V2/pull/73
