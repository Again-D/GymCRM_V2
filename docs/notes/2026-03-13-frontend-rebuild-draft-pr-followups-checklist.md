# 2026-03-13 Frontend Rebuild Draft PR Follow-ups Checklist

## Scope

This checklist tracks what is still worth doing **after** the core rebuild plan was completed in the isolated worktree branch and draft PR `#73` was brought to a reviewable state.

Reference surfaces:
- rebuild draft PR: [#73](https://github.com/Again-D/GymCRM_V2/pull/73)
- completed rebuild execution plan:
  - `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-12-refactor-frontend-rebuild-in-worktree-plan.md`
- remaining rebuild-stage work plan:
  - `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-13-refactor-frontend-rebuild-stage-remaining-work-plan.md`

## Current Read

The rebuild branch is in a good state for architectural review.

What is already true:
- shell/auth/members/memberships/reservations/access/lockers/products/crm/settlements slices exist in the prototype
- prototype browser smoke and mobile smoke exist for the major slices
- runtime auth presets are exercisable in the running prototype
- selected-member ownership, invalidation, and stale-response rules are documented and tested
- the latest structure review findings on draft PR `#73` were closed

What is not the goal right now:
- immediate cutover
- continuing slice expansion by default
- treating mock-driven runtime confidence as production readiness

## Remaining Follow-ups

### 1. Keep PR `#73` Reviewable
- [ ] Update the PR body whenever the architectural recommendation changes materially
- [ ] Mirror any machine-local-only evidence into durable tracked docs if new checkpoint material is added
- [ ] Keep the rebuild branch buildable and testable

### 2. Keep The Rebuild Branch Honest
- [ ] Only continue rebuild implementation if a new architectural question is documented first
- [ ] Avoid adding breadth “just because the branch exists”
- [ ] Record any newly discovered parity gap in docs before extending the branch

### 3. Harvest Proven Patterns Into `main`
- [x] `selectedMember` canonical ownership has a `main` harvest plan
- [ ] explicit query invalidation contract has a `main` harvest plan
- [ ] page-owned query / mutation separation has a `main` harvest plan
- [ ] route metadata discipline refinements have a `main` harvest plan

### 4. Keep Recommendation Current
- [ ] Revisit the rebuild branch recommendation only if new evidence changes the current recommendation
- [ ] If the recommendation changes, update:
  - draft PR `#73`
  - readiness checkpoint note
  - remaining-work plan

## Default Recommendation

Unless a new architectural question appears, keep the rebuild branch as:
- a long-lived reference experiment
- a source of patterns to harvest into `main`
- not a cutover-ready replacement frontend

## Exit Conditions

This checklist can be considered satisfied when either:
1. the remaining high-confidence rebuild patterns have migration plans in `main`, and the rebuild branch is clearly documented as a reference experiment, or
2. a new explicit decision is made to continue parity work for a fresh architectural reason
