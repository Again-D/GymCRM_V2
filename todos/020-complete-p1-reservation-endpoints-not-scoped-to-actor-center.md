---
status: complete
priority: p1
issue_id: "020"
tags: [code-review, backend, security, authz, reservation, multi-tenant]
dependencies: []
---

# Reservation Endpoints Are Not Scoped To Authenticated User Center

## Problem Statement

The new reservation feature stores `center_id` on schedules and reservations, but reservation read/mutation paths (`detail`, `cancel`, `complete`) load by `reservation_id` only and do not verify the authenticated user's center. In JWT mode, a desk/admin user can potentially access or mutate another center's reservation if they know a valid ID.

This is a tenant-isolation / authorization boundary issue and should be fixed before relying on the feature in multi-center environments.

## Findings

- `ReservationService#get/cancel/complete` all resolve reservations via `getReservation(reservationId)` without actor center checks:
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/reservation/ReservationService.java:100`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/reservation/ReservationService.java:118`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/reservation/ReservationService.java:147`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/reservation/ReservationService.java:223`
- `ReservationRepository#findById`, `markCancelledIfCurrent`, and `markCompletedIfCurrent` key only on `reservation_id` (+ status), not `center_id`:
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/reservation/ReservationRepository.java:36`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/reservation/ReservationRepository.java:95`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/reservation/ReservationRepository.java:113`
- JWT principal used by `CurrentUserProvider` exposes `userId/username/roleCode` but not `centerId`, so service-layer tenant scoping cannot be enforced with current interface:
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/common/security/SecurityContextCurrentUserProvider.java:40`

## Proposed Solutions

### Option 1: Add center-aware principal + service/repository scoping (Recommended)

**Approach:** Extend `CurrentUserProvider` to expose `currentCenterId()`, include `centerId` in authenticated principal, and require `center_id` in reservation/schedule/member/membership fetch/update queries for JWT mode.

**Pros:**
- Correct tenant isolation at service/data boundary
- Reusable pattern for other multi-center APIs

**Cons:**
- Touches auth/security and multiple repositories/services
- Requires test fixture updates

**Effort:** Medium
**Risk:** Medium

---

### Option 2: Temporary hard guard with `DEFAULT_CENTER_ID` on reservation mutation queries

**Approach:** Add `center_id = DEFAULT_CENTER_ID` filters to reservation queries in this feature until actor center extraction is implemented.

**Pros:**
- Faster containment for current codebase
- Minimal auth stack changes

**Cons:**
- Hard-coded tenant model persists
- Not a scalable fix once multiple centers are active

**Effort:** Small-Medium
**Risk:** Medium

## Recommended Action

Implemented center-aware reservation scoping for JWT/prototype modes by extending `CurrentUserProvider` with `currentCenterId()`, propagating `centerId` into the JWT authenticated principal, and applying actor-center filters to reservation read/mutation/list paths. Added API integration coverage for cross-center access denial (`404 NOT_FOUND`).

## Technical Details

**Affected files:**
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/reservation/ReservationService.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/reservation/ReservationRepository.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/common/security/CurrentUserProvider.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/common/security/SecurityContextCurrentUserProvider.java`

**Database changes (if any):**
- No schema change strictly required (center columns already exist)
- Query contract changes likely required

## Resources

- **Branch:** `codex/feat-phase7-reservations-usage-deduction-foundation`
- **Review context:** Phase 7 reservation feature review

## Acceptance Criteria

- [ ] Reservation detail/cancel/complete paths enforce center scoping in JWT mode
- [ ] Cross-center reservation IDs cannot be read or mutated by another center user
- [ ] Integration tests cover cross-center deny scenarios (DESK and CENTER_ADMIN)

## Work Log

### 2026-02-25 - Review Finding Created

**By:** Codex

**Actions:**
- Reviewed reservation service and repository mutation paths
- Confirmed reservation queries are unscoped by `center_id`
- Confirmed JWT current-user abstraction lacks center context

### 2026-02-25 - Fix Implemented

**By:** Codex

**Actions:**
- Added `currentCenterId()` to `CurrentUserProvider` and both implementations
- Extended JWT principal to carry `centerId` from token/user record
- Scoped reservation `create/list/detail/cancel/complete/schedules` to actor center
- Added `ReservationApiIntegrationTest` case covering cross-center detail/cancel/complete denial
- Ran targeted tests:
  - `./gradlew test --no-daemon --tests 'com.gymcrm.common.security.*'`
  - `./gradlew test --no-daemon --tests 'com.gymcrm.reservation.*'`

