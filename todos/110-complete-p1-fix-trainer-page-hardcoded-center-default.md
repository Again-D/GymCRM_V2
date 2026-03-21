---
status: complete
priority: p1
issue_id: "110"
tags: [code-review, frontend, backend-contract, regression]
dependencies: []
---

# Fix trainer page hardcoded center default

## Problem Statement

The new trainer-management UI hardcodes `centerId: 1` as the default filter and create-form value. Because the backend rejects non-super-admin requests when the requested center does not match the actor's own center, every `CENTER_ADMIN` or `DESK` user outside center 1 will hit access-denied errors on initial load, reset, and trainer creation. This turns the feature into a center-1-only flow in live mode.

## Findings

- `frontend/src/pages/trainers/modules/types.ts:37` initializes the default trainer filters with `centerId: 1`.
- `frontend/src/pages/trainers/modules/types.ts:45` initializes the empty trainer form with `centerId: 1`.
- `frontend/src/pages/trainers/modules/useTrainersQuery.ts:37` always sends `centerId` whenever it is positive, so non-super-admin users do not fall back to actor-derived scoping.
- `frontend/src/pages/trainers/TrainersPage.tsx:37` and `frontend/src/pages/trainers/TrainersPage.tsx:107` consume those hardcoded defaults directly for page load, reset, and create.
- `backend/src/main/java/com/gymcrm/trainer/TrainerService.java:192` rejects non-super-admin requests when `requestedCenterId` does not equal `actor.centerId()`, so the frontend default causes deterministic failures for centers other than 1.

## Proposed Solutions

### Option 1: Seed defaults from the authenticated actor

**Approach:** Initialize trainer filters and create-form state from `authUser.centerId` for non-super-admin users, while keeping the field editable only for super admins.

**Pros:**
- Matches the backend contract cleanly.
- Fixes load, reset, and create in one place.

**Cons:**
- Requires threading actor context into the state factory helpers or replacing them with page-local initialization.

**Effort:** 1-2 hours

**Risk:** Low

---

### Option 2: Omit `centerId` for non-super-admin requests

**Approach:** Leave the form/filter state as UI-only, but only include `centerId` in list/create requests for super admins.

**Pros:**
- Smaller frontend patch.
- Preserves actor-derived backend scoping.

**Cons:**
- State shape still carries misleading hardcoded values.
- Easier to regress later in form submission paths.

**Effort:** 1 hour

**Risk:** Medium

## Recommended Action

Initialize trainer filters and the create-form state from `authUser.centerId` for non-super-admin users, keep the super-admin override behavior intact, and lock the regression with a live-mode test that exercises a non-center-1 admin flow.

## Technical Details

**Affected files:**
- `frontend/src/pages/trainers/modules/types.ts`
- `frontend/src/pages/trainers/modules/useTrainersQuery.ts`
- `frontend/src/pages/trainers/TrainersPage.tsx`
- `frontend/src/pages/trainers/TrainersPage.test.tsx`
- `backend/src/main/java/com/gymcrm/trainer/TrainerService.java` (contract reference only)

**Related components:**
- Auth state bootstrapping
- Trainer page filters and create modal

**Database changes (if any):**
- No schema change required

## Resources

- **PR:** [#88](https://github.com/Again-D/GymCRM_V2/pull/88)
- **Review target:** merged commit `5f9e1e2b893fb30d9011a2cb83c0f73c6c491b22`

## Acceptance Criteria

- [x] `CENTER_ADMIN` and `DESK` users in any center can load `/trainers` without passing a mismatched `centerId`.
- [x] Non-super-admin trainer creation submits the actor's center, not a hardcoded fallback.
- [x] Resetting filters does not reintroduce center 1 for non-super-admin users.
- [x] Frontend tests cover at least one non-center-1 role scenario.

## Work Log

### 2026-03-20 - Initial Discovery

**By:** Codex

**Actions:**
- Reviewed trainer page state initialization and request serialization.
- Compared frontend defaults with backend center-scope enforcement in `TrainerService`.
- Confirmed the live request path always sends `centerId=1` unless a super admin manually changes it.

**Learnings:**
- The page currently works only for center 1 by accident.
- This regression is not covered by the new UI tests because they only exercise visibility and mock-friendly paths.

### 2026-03-21 - Fix Applied

**By:** Codex

**Actions:**
- Extended frontend auth user normalization to retain `centerId` from live auth responses.
- Updated trainer page default filter/form factories to accept a runtime center and seeded them from `authUser.centerId`.
- Added a live-mode trainer page test that verifies a center-admin in center 2 loads the page and submits trainer creation with `centerId: 2`.
- Ran `cd frontend && npm test -- --run src/pages/trainers/TrainersPage.test.tsx`.

**Learnings:**
- The cleanest fix was to align the frontend auth model with the existing backend contract rather than special-casing request serialization.
- The bug hid because the original tests never exercised a non-center-1 authenticated path.
