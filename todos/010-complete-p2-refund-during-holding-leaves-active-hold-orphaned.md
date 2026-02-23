---
status: complete
priority: p2
issue_id: "010"
tags: [code-review, backend, data-integrity, business-rules, membership]
dependencies: []
---

# Refund During HOLDING Leaves Active Hold Orphaned and Can Distort Refund Logic

## Problem Statement

The status transition rules allow `HOLDING -> REFUNDED`, and `MembershipRefundService.refund()` updates the membership status to `REFUNDED`, but it does not close/cancel the active hold record in `membership_holds`. This can leave an `ACTIVE` hold attached to a refunded membership.

That state is internally inconsistent and can also distort duration-based refund calculation because the refund logic subtracts only `holdDaysUsed` (completed/resumed holds), not days from an in-progress active hold.

## Findings

- State machine explicitly allows `HOLDING -> REFUNDED`:
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/membership/MembershipStatusTransitionService.java:45`
- Refund service validates/executes refund and updates membership to `REFUNDED`, but never updates `membership_holds` status:
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/membership/MembershipRefundService.java:57`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/membership/MembershipRefundService.java:82`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/membership/MembershipRefundService.java:98`
- Active hold rows are first-class state (`ACTIVE`/`RESUMED`/`CANCELED`) but no refund-time cancel path exists in repository/service:
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/membership/MembershipHoldRepository.java:41`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/resources/db/migration/V4__create_membership_payment_and_history_tables.sql:148`
- Duration refund calculation subtracts `holdDaysUsed` only (completed holds), so refunding during active hold can miscompute usage depending on intended business rule:
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/membership/MembershipRefundService.java:143`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/membership/MembershipRefundService.java:152`

## Proposed Solutions

### Option 1: Disallow Refund While HOLDING (Recommended for Prototype)

**Approach:** Tighten `validateRefundEligibility()` to require `ACTIVE` only (or explicit state check before transition validation), returning a business-rule error instructing staff to resume first.

**Pros:**
- Simple and predictable behavior
- Avoids hold/refund policy ambiguity in prototype
- No schema changes required

**Cons:**
- Adds one more step for operators (resume then refund)

**Effort:** Small

**Risk:** Low

---

### Option 2: Support HOLDING Refund Fully (Cancel Active Hold in Same Transaction)

**Approach:** On refund of `HOLDING` memberships, locate active hold and mark it `CANCELED` (or `RESUMED` with explicit semantics), then continue refund.

**Pros:**
- Preserves smoother operator workflow
- Maintains state consistency if HOLDING refund is desired

**Cons:**
- Requires new repository update path and explicit policy for active hold days in refund math
- More edge cases/test coverage needed

**Effort:** Medium-Large

**Risk:** Medium

## Recommended Action

<!-- Fill during triage -->

## Technical Details

**Affected files:**
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/membership/MembershipStatusTransitionService.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/membership/MembershipRefundService.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/membership/MembershipHoldRepository.java`

**Acceptance Criteria**

- [ ] Refunding a `HOLDING` membership is either explicitly blocked or fully handled without leaving active hold rows
- [ ] `membership_holds` and `member_memberships.membership_status` remain semantically consistent after refund
- [ ] Refund calculation behavior for active-hold state is defined and tested
- [ ] Add regression test for `HOLDING` membership refund path

## Work Log

### 2026-02-24 - Review Finding Created

**By:** Codex

**Actions:**
- Reviewed status transition rules and refund service flow
- Confirmed `HOLDING -> REFUNDED` is allowed
- Confirmed refund path does not mutate active hold rows
- Identified refund calculation dependence on `holdDaysUsed` only

**Learnings:**
- Cross-entity state machines (membership + hold history) need synchronized transitions or stricter eligibility rules
