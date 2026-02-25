---
status: complete
priority: p2
issue_id: "021"
tags: [code-review, backend, business-rule, reservation, membership]
dependencies: []
---

# Reservation Create Allows Unusable Memberships (Backend Eligibility Too Weak)

## Problem Statement

Reservation creation validates member status, ownership, center consistency, and `membership_status=ACTIVE`, but it does not validate whether the selected membership is actually usable for reservation completion. In particular, COUNT memberships with `remaining_count=0` are still accepted by the API.

This creates an inconsistent contract: the frontend hides zero-remaining COUNT memberships, but direct API callers can create reservations that occupy capacity and then fail on completion (`remaining_count > 0` required for deduction).

## Findings

- `validateCreateEligibility(...)` does not check COUNT `remaining_count > 0` (or other usage readiness beyond ACTIVE status):
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/reservation/ReservationService.java:192`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/reservation/ReservationService.java:202`
- Completion path enforces COUNT eligibility only at completion time via `consumeOneCountIfEligible(...)`, which can fail after reservation was already created:
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/reservation/ReservationService.java:171`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/membership/MemberMembershipRepository.java:144`
- Frontend already treats zero-remaining COUNT memberships as non-reservable, confirming intended business behavior is stricter than backend API:
  - `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx:1857`

## Proposed Solutions

### Option 1: Enforce "reservable membership" checks in `create()` (Recommended)

**Approach:** Extend `validateCreateEligibility(...)` to reject COUNT memberships with `remaining_count <= 0` and document the rule in Phase 7 validation notes/tests.

**Pros:**
- Aligns backend API with frontend behavior
- Prevents impossible reservations and capacity churn

**Cons:**
- Requires new integration tests and error-code assertions

**Effort:** Small
**Risk:** Low

---

### Option 2: Keep create permissive and add "soft warning" only

**Approach:** Allow create but return warning metadata/UI hints and let complete enforce deductibility.

**Pros:**
- More permissive operationally

**Cons:**
- Leaves impossible reservations in system
- Complicates UI and user expectations

**Effort:** Medium
**Risk:** Medium

## Recommended Action

Implemented backend eligibility alignment in `ReservationService#create()` to reject COUNT memberships with `remaining_count <= 0` before capacity is consumed. Added reservation service integration coverage to verify rejection and no `current_count` increment side effect.

## Technical Details

**Affected files:**
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/reservation/ReservationService.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/test/java/com/gymcrm/reservation/ReservationServiceIntegrationTest.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/test/java/com/gymcrm/reservation/ReservationApiIntegrationTest.java`

## Resources

- **Branch:** `codex/feat-phase7-reservations-usage-deduction-foundation`
- **Related UI behavior:** `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`

## Acceptance Criteria

- [ ] COUNT membership with `remaining_count <= 0` cannot create a reservation
- [ ] API returns deterministic business/validation error for non-reservable membership
- [ ] Integration tests cover zero-remaining COUNT membership create attempt
- [ ] Backend and frontend reservable-membership criteria are documented as aligned

## Work Log

### 2026-02-25 - Review Finding Created

**By:** Codex

**Actions:**
- Compared reservation create eligibility checks with completion deduction logic
- Confirmed backend API accepts cases the frontend intentionally hides
- Identified capacity occupancy risk from impossible-to-complete reservations

### 2026-02-25 - Fix Implemented

**By:** Codex

**Actions:**
- Added COUNT membership residual-count check in `validateCreateEligibility(...)`
- Added integration test for exhausted COUNT membership create attempt
- Verified reservation schedule `current_count` remains unchanged on rejection
- Ran `./gradlew test --no-daemon --tests 'com.gymcrm.reservation.*'`
