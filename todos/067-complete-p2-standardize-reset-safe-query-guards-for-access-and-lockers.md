---
status: complete
priority: p2
issue_id: "067"
tags: [code-review, architecture, quality, frontend, react]
dependencies: []
---

# Standardize reset-safe query guards for access and lockers

## Problem Statement

The plan for `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-09-refactor-frontend-access-locker-query-ownership-and-validation-plan.md` leaves the stale-write guard strategy too open by allowing either request-version guards or `shouldCommit`/commit-guard style protection for the new access and locker query hooks. That ambiguity matters because the team already hit a real regression where commit gating alone did not invalidate in-flight preload requests after protected reset, allowing late responses to repopulate cleared UI. If this plan is implemented as written, the same bug class can be reintroduced under a different hook name.

## Findings

- The plan's core principles say stale-write prevention should use either `request-version` or `shouldCommit` for access/lockers.
- Phase 1 repeats the same looseness for access query ownership and late-response protection.
- Prior fixes for `members/products/reservation schedules` closed this exact regression by incrementing a request id during reset and ignoring late success/error/finally writes.
- `shouldCommit`-only protection was previously insufficient for authenticated preload/reset flows because reset did not automatically invalidate the in-flight request source.

## Proposed Solutions

### Option 1: Require request-version plus explicit reset invalidation

**Approach:** Update the plan so all new access/locker query hooks must own a `requestIdRef`/version counter, increment it in reset/invalidate paths, and gate success/error/finally commits on the active request id.

**Pros:**
- Matches the repo's most recently proven fix pattern
- Closes the exact post-reset stale-write class directly
- Makes acceptance criteria and test expectations unambiguous

**Cons:**
- Slightly narrows implementation freedom
- Requires documenting reset ownership more explicitly

**Effort:** 20-30 minutes

**Risk:** Low

---

### Option 2: Keep both patterns but require preload-specific invalidation rules

**Approach:** Allow `shouldCommit` only if the plan also defines how protected reset invalidates every in-flight access/locker preload request and how tests prove late writes are dropped.

**Pros:**
- Preserves flexibility for hook composition
- Could reuse existing workspace loader abstractions

**Cons:**
- Easier to misread or partially implement
- More review overhead because correctness depends on multiple moving parts

**Effort:** 30-45 minutes

**Risk:** Medium

---

### Option 3: Centralize query guard behavior in a shared helper first

**Approach:** Add a shared reset-safe query lifecycle helper, then point the plan to that helper for access/locker extraction.

**Pros:**
- Reduces duplication across future query hooks
- Makes stale-write policy consistent across features

**Cons:**
- Expands scope beyond the current plan review
- Risks delaying the immediate follow-up refactor

**Effort:** 2-4 hours

**Risk:** Medium

## Recommended Action

Require `request-version + explicit reset/invalidate` as the mandatory stale-write strategy for new access/locker query hooks. Keep `shouldCommit` only as an optional upper-layer coordination guard, not as the query hook's primary reset-safety mechanism.

## Technical Details

**Affected files:**
- `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-09-refactor-frontend-access-locker-query-ownership-and-validation-plan.md:91`
- `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-09-refactor-frontend-access-locker-query-ownership-and-validation-plan.md:110`
- `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-09-refactor-frontend-access-locker-query-ownership-and-validation-plan.md:148`
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/members/useMembersQuery.ts`
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/products/useProductsQuery.ts`
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/reservations/useReservationSchedulesQuery.ts`

**Related components:**
- Protected UI reset flow in `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`
- Auth reset flow in `/Users/abc/projects/GymCRM_V2/frontend/src/shared/hooks/useAuthSession.ts`
- Workspace loader coordination in `/Users/abc/projects/GymCRM_V2/frontend/src/shared/hooks/useWorkspaceLoaders.ts`

**Database changes (if any):**
- Migration needed? No
- New columns/tables? None

## Resources

- **Documentation:** `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-09-refactor-frontend-access-locker-query-ownership-and-validation-plan.md`
- **Validation note:** `/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-09-bundle-query-auth-lifecycle-validation.md`
- **Completed related todos:**
  - `/Users/abc/projects/GymCRM_V2/todos/065-complete-p2-guard-shared-query-hooks-from-stale-post-reset-writes.md`
  - `/Users/abc/projects/GymCRM_V2/todos/066-complete-p2-guard-reservation-schedule-query-from-post-reset-stale-writes.md`

## Acceptance Criteria

- [ ] The plan no longer treats `request-version` and `shouldCommit` as interchangeable for access/locker query hooks.
- [ ] Reset/invalidate ownership for access and locker queries is explicit.
- [ ] Validation guidance requires tests that prove late success/error/finally writes are ignored after protected reset.
- [ ] The revised plan aligns with the existing `members/products/reservation schedules` query hook pattern.

## Work Log

### 2026-03-09 - Initial Discovery

**By:** Codex

**Actions:**
- Reviewed the plan against the merged stale-write fixes for `members/products/reservation schedules`
- Identified that the plan re-opened implementation ambiguity by allowing `request-version` or `shouldCommit`
- Documented a concrete todo so the plan can be tightened before implementation

**Learnings:**
- This repo already has a proven reset-safe query pattern
- Leaving both guard styles as equal options is risky because they are not equivalent under protected reset

---

### 2026-03-09 - Resolution

**By:** Codex

**Actions:**
- Updated the plan's core principles to require `request-version + explicit reset/invalidate` for access/locker query hooks
- Clarified that `shouldCommit` is only an upper-layer coordination guard, not the primary stale-write defense
- Tightened Phase 1 and Phase 2 implementation language so success/error/finally writes are version-gated after reset

**Learnings:**
- The plan now matches the merged `members/products/reservation schedules` reset-safe pattern
- Review ambiguity is much lower when reset invalidation ownership is explicit in the plan itself

## Notes

- Protected artifacts rule respected: this finding does not recommend deleting or cleaning up any file under `docs/plans/` or `docs/solutions/`.
