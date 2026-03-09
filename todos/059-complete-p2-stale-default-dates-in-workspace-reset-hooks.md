---
status: complete
priority: p2
issue_id: "059"
tags: [code-review, frontend, react, quality]
dependencies: []
---

# Stale Default Dates In Workspace Reset Hooks

## Problem Statement

The refactor moved membership and locker workspace reset logic into local hooks, but the default form dates for those workspaces are now derived from module-level constants instead of being recalculated at reset time. In a long-lived admin session, resetting the purchase form or locker assignment form after midnight can prefill yesterday's date, which regresses the prior behavior and can lead to operators submitting the wrong effective date without noticing.

## Findings

- `frontend/src/features/memberships/useMembershipWorkspaceState.ts:33` defines `EMPTY_PURCHASE_FORM` with `startDate` computed once at module load time.
- `frontend/src/features/memberships/useMembershipWorkspaceState.ts:73` and `frontend/src/features/memberships/useMembershipWorkspaceState.ts:86` reuse that stale constant during member-switch and protected-reset flows.
- `frontend/src/features/lockers/useLockerWorkspaceState.ts:45` defines `EMPTY_LOCKER_ASSIGN_FORM` with `startDate` and `endDate` computed once at module load time.
- `frontend/src/features/lockers/useLockerWorkspaceState.ts:71` reuses that stale constant during workspace reset.
- Before this refactor, `App.tsx` recomputed these dates inline during resets and successful submits, so the new behavior is a regression in long-lived sessions.

## Proposed Solutions

### Option 1: Replace static date defaults with factory helpers

**Approach:** Introduce functions like `createEmptyPurchaseForm()` and `createEmptyLockerAssignForm()` that compute today's date each time they are called, and use those helpers for initial state and reset paths.

**Pros:**
- Restores pre-refactor behavior precisely
- Keeps the reset logic local to each hook
- Low implementation risk

**Cons:**
- Requires touching both hook files

**Effort:** 30-45 minutes

**Risk:** Low

---

### Option 2: Accept explicit reset payloads from `App.tsx`

**Approach:** Keep the hooks generic, but have `App.tsx` pass freshly computed default values into reset calls.

**Pros:**
- Makes reset timing explicit at the orchestration layer

**Cons:**
- Pushes workspace-local concerns back into `App.tsx`
- Weakens the state-ownership refactor

**Effort:** 45-60 minutes

**Risk:** Medium

## Recommended Action


## Technical Details

**Affected files:**
- `frontend/src/features/memberships/useMembershipWorkspaceState.ts:33`
- `frontend/src/features/memberships/useMembershipWorkspaceState.ts:73`
- `frontend/src/features/memberships/useMembershipWorkspaceState.ts:86`
- `frontend/src/features/lockers/useLockerWorkspaceState.ts:45`
- `frontend/src/features/lockers/useLockerWorkspaceState.ts:71`

**Related components:**
- Membership purchase workspace
- Locker assignment workspace
- Protected UI reset flow in `frontend/src/App.tsx`

**Database changes:**
- No

## Resources

- **PR:** #59
- **Related branch:** `codex/refactor-state-ownership-query-lifecycle`
- **Prior behavior reference:** `main` branch `frontend/src/App.tsx` reset paths recomputed dates inline

## Acceptance Criteria

- [x] Membership purchase form reset computes `startDate` from the current date at reset time
- [x] Locker assign form reset computes `startDate` and `endDate` from the current date at reset time
- [x] Long-lived session behavior no longer reuses stale dates after a day boundary
- [x] `npm run build` passes after the fix

## Work Log

### 2026-03-09 - Review Discovery

**By:** Codex

**Actions:**
- Reviewed PR #59 state-ownership refactor
- Compared new hook reset logic against prior `App.tsx` reset behavior
- Identified module-load-time date constants reused during later resets

**Learnings:**
- State extraction preserved most reset behavior, but date-bearing defaults need factory helpers rather than frozen constants
- This regression is subtle and only appears in long-lived sessions, so it is easy to miss in short smoke tests

### 2026-03-09 - Resolution

**By:** Codex

**Actions:**
- Replaced frozen default objects with `createEmptyPurchaseForm()` and `createEmptyLockerAssignForm()` factory helpers
- Updated hook initialization/reset paths to recompute current dates on each reset
- Updated `App.tsx` submit success paths to use the same factory helpers
- Verified with `cd /Users/abc/projects/GymCRM_V2/frontend && npm run build`

**Learnings:**
- Date-bearing defaults should not live in module-level constants when reset behavior must reflect current wall-clock time
- The state-ownership refactor remains intact if the freshness concern is solved inside the workspace boundary
