---
status: complete
priority: p1
issue_id: "009"
tags: [code-review, backend, concurrency, data-integrity, membership]
dependencies: []
---

# Membership Hold Race Can Create Duplicate Active Holds

## Problem Statement

`MembershipHoldService.hold()` uses an application-level pre-check (`findActiveByMembershipId`) to block duplicate active holds, but the database schema does not enforce uniqueness for active holds. Under concurrent requests for the same `membershipId`, both requests can pass the pre-check and insert separate `ACTIVE` rows into `membership_holds`.

This creates data corruption (multiple active holds for one membership) and can cascade into incorrect resume/refund behavior.

## Findings

- Hold flow only checks for existing active hold before insert (non-atomic across concurrent requests):
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/membership/MembershipHoldService.java:52`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/membership/MembershipHoldService.java:211`
- `membership_holds` table has indexes but no partial unique index on `(membership_id)` for `hold_status='ACTIVE'` + `is_deleted=FALSE`:
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/resources/db/migration/V4__create_membership_payment_and_history_tables.sql:130`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/resources/db/migration/V4__create_membership_payment_and_history_tables.sql:156`
- Membership status update is also unconditional on current state (`WHERE membership_id = ...` only), so a second concurrent hold can still succeed even after first request sets status to `HOLDING`:
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/membership/MemberMembershipRepository.java:66`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/membership/MemberMembershipRepository.java:73`

## Proposed Solutions

### Option 1: Add DB Unique Constraint for Active Holds + Map Constraint Error (Recommended)

**Approach:** Add a partial unique index on `membership_holds (membership_id)` where `hold_status='ACTIVE' AND is_deleted=FALSE`, then map unique-constraint violations to `CONFLICT`.

**Pros:**
- Prevents corruption at the database layer
- Safe under concurrent requests
- Small schema + error-mapping change

**Cons:**
- Requires migration and repository/service error mapping work

**Effort:** Small-Medium

**Risk:** Low

---

### Option 2: Conditional Membership Status Update (Optimistic Guard) + Existing Pre-check

**Approach:** Update membership status with `WHERE membership_status = 'ACTIVE'` and fail if no row updated.

**Pros:**
- Reduces duplicate hold success window
- Helpful business-state guard even with DB constraint

**Cons:**
- Alone it does not prevent duplicate active hold rows if insert happens first in both requests
- Still needs DB uniqueness for full protection

**Effort:** Medium

**Risk:** Medium

## Recommended Action

<!-- Fill during triage -->

## Technical Details

**Affected files:**
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/membership/MembershipHoldService.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/membership/MemberMembershipRepository.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/resources/db/migration/V4__create_membership_payment_and_history_tables.sql`

**Acceptance Criteria**

- [ ] DB enforces at most one active hold per membership (`ACTIVE`, non-deleted)
- [ ] Concurrent hold requests for same membership result in at most one success
- [ ] Loser request returns deterministic API error (`CONFLICT` or business-rule equivalent)
- [ ] Add integration test covering concurrent/duplicate hold attempt behavior (or deterministic duplicate path via seeded active hold)

## Work Log

### 2026-02-24 - Review Finding Created

**By:** Codex

**Actions:**
- Reviewed hold service, repository, and V4 schema
- Confirmed application-level duplicate hold pre-check without DB uniqueness
- Confirmed membership status update query is not state-conditional

**Learnings:**
- Membership state-machine checks must be backed by DB constraints for concurrent request safety
