---
status: complete
priority: p2
issue_id: "068"
tags: [code-review, frontend, react, quality]
dependencies: []
---

# Reset locker query error on reload

## Problem Statement

`/Users/abc/projects/GymCRM_V2/frontend/src/features/lockers/useLockerQueries.ts` does not clear `lockerQueryError` when a new slots or assignments load starts. That regresses the previous inline-loader behavior in `App.tsx`, where each locker read load cleared panel error state before retrying. As a result, a prior locker fetch failure can remain visible even after a successful retry populates fresh data.

## Findings

- `loadLockerSlots()` sets `lockerSlotsLoading(true)` but does not clear `lockerQueryError`.
- `loadLockerAssignments()` sets `lockerAssignmentsLoading(true)` but does not clear `lockerQueryError`.
- `App.tsx` now renders `effectiveLockerPanelError = lockerPanelError ?? lockerQueryError`, so stale query errors can continue surfacing after the next successful query.
- The old inline implementation cleared `setLockerPanelError(null)` at the start of both locker read loaders.

## Proposed Solutions

### Option 1: Clear query error at the start of both locker read loaders

**Approach:** Call `setLockerQueryError(null)` at the start of `loadLockerSlots()` and `loadLockerAssignments()`.

**Pros:**
- Restores previous retry behavior
- Small, local change
- Keeps query error lifecycle consistent with success-after-retry UX

**Cons:**
- Shared error state remains coarse-grained across two loaders

**Effort:** 10-15 minutes

**Risk:** Low

---

### Option 2: Split locker query errors per loader

**Approach:** Track independent `lockerSlotsError` and `lockerAssignmentsError` values and compose them at the panel boundary.

**Pros:**
- More precise error ownership
- Better future debugging when only one query fails

**Cons:**
- Larger refactor than needed for this review finding
- Requires panel-level composition changes

**Effort:** 30-60 minutes

**Risk:** Medium

## Recommended Action

Clear `lockerQueryError` at the start of both locker read loaders and add a success-after-failure regression test so retry behavior matches the old inline loader contract.

## Technical Details

**Affected files:**
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/lockers/useLockerQueries.ts`
- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`

**Related components:**
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/lockers/LockerManagementPanels.tsx`

**Database changes (if any):**
- Migration needed? No
- New columns/tables? None

## Resources

- **PR:** [#62](https://github.com/Again-D/GymCRM_V2/pull/62)
- **Plan:** `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-09-refactor-frontend-access-locker-query-ownership-and-validation-plan.md`

## Acceptance Criteria

- [ ] `loadLockerSlots()` clears stale query error before starting a new fetch
- [ ] `loadLockerAssignments()` clears stale query error before starting a new fetch
- [ ] Successful retry no longer leaves an old locker query error visible in the UI
- [ ] Tests cover the error-clear-on-retry behavior or an equivalent success-after-failure scenario

## Work Log

### 2026-03-09 - Initial Discovery

**By:** Codex

**Actions:**
- Reviewed PR #62 diff for query ownership regressions
- Compared new locker query hook lifecycle against removed inline loader behavior
- Identified stale error persistence on successful retry as a behavioral regression

**Learnings:**
- Query ownership moved correctly, but error lifecycle parity with the old implementation still matters

---

### 2026-03-09 - Resolution

**By:** Codex

**Actions:**
- Updated `useLockerQueries` to clear `lockerQueryError` at the start of both slot and assignment loads
- Added a regression test covering failure followed by successful retry
- Re-ran frontend tests/build to confirm no follow-on regression

**Learnings:**
- Retry UX parity needs to be preserved explicitly when moving inline loader logic into query hooks

## Notes

- Protected artifact rule respected.
