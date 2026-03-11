---
status: complete
priority: p2
issue_id: "078"
tags: [code-review, quality, security, backend, frontend, reservations]
dependencies: []
---

# Block expired memberships from reservation selection and create

## Problem Statement

Trainer-scoped reservation management correctly limits targets to reservable memberships at the list level, but the selected-member detail flow rehydrates all visible memberships and then treats any `ACTIVE` membership as reservable. The backend create path also only checks `membershipStatus` and count balance, not the membership validity window. As a result, an expired membership that still has `membership_status = 'ACTIVE'` can reappear in the reservation detail panel and be used to create a new future reservation.

This breaks the policy the new reservation-target list is advertising and can let admins or trainers book against memberships that should already be unusable.

## Findings

- `ReservationQueryRepository.findReservationTargets()` filters reservable memberships with `mm.end_date IS NULL OR mm.end_date >= :businessDate`, so the list intentionally excludes expired memberships.
- `App.tsx` recomputes `reservableMemberships` from `/api/v1/members/{memberId}/memberships` using only `membershipStatus === "ACTIVE"` and positive count for count products, without checking `endDate`.
- `ReservationService.validateCreateEligibility()` checks `membershipStatus`, center consistency, count balance, and future schedule timing, but it never rejects an expired membership.
- This means a membership can be absent from the top-level target query yet still be selectable once a member row is opened, producing an inconsistent UI contract and invalid reservation creation.

## Proposed Solutions

### Option 1: Enforce validity in both backend create path and frontend reservable filter

**Approach:**
Add `endDate` validity checks to `ReservationService.validateCreateEligibility()` and update the frontend `reservableMemberships` filter to exclude memberships whose `endDate` is before the current business date.

**Pros:**
- Closes the policy gap at the source of truth and in the UI.
- Smallest change that preserves the current endpoint shape.

**Cons:**
- Frontend and backend both need the same business-date interpretation.
- Other consumers of `/members/{id}/memberships` can still see expired memberships unless they filter too.

**Effort:** 1-2 hours

**Risk:** Low

---

### Option 2: Add a reservation-specific memberships endpoint

**Approach:**
Keep `/members/{memberId}/memberships` generic, but add a reservation-scoped endpoint/service method that only returns memberships eligible for reservation creation, then use that endpoint in the reservation workspace.

**Pros:**
- Strong separation between generic membership history and reservation-eligible memberships.
- Removes duplicated frontend filtering logic.

**Cons:**
- Larger API surface increase.
- More code churn for a relatively focused bug.

**Effort:** 3-5 hours

**Risk:** Medium

## Recommended Action

**To be filled during triage.** Prefer Option 1 unless broader reservation-specific membership DTO work is already planned.

## Technical Details

**Affected files:**
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/reservation/ReservationService.java:331`
- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx:1720`
- `/Users/abc/projects/GymCRM_V2/backend/src/test/java/com/gymcrm/reservation/ReservationServiceIntegrationTest.java`
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/reservations/ReservationManagementPanels.tsx`

**Related components:**
- Reservation target list query
- Membership detail fetch for selected member
- Reservation creation form

**Database changes (if any):**
- No schema change required

## Resources

- **PR:** [#68](https://github.com/Again-D/GymCRM_V2/pull/68)
- **Related files:**
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/reservation/ReservationQueryRepository.java`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/membership/MembershipPurchaseService.java`

## Acceptance Criteria

- [ ] Expired memberships are excluded from reservation workspace selectable memberships.
- [ ] Reservation create rejects memberships whose `endDate` is before the current business date.
- [ ] Backend integration coverage includes an expired-but-active membership reservation attempt.
- [ ] Frontend reservation panel no longer offers expired memberships as selectable options.

## Work Log

### 2026-03-11 - Initial Discovery

**By:** Codex

**Actions:**
- Reviewed PR #68 reservation target and reservation create flows.
- Compared target-query reservable logic against selected-member detail and reservation create validation.
- Identified that expiry checks exist in the list query but are missing from the detail-derived frontend filter and backend create eligibility.

**Learnings:**
- The new trainer-scoped flow already has the right reservable rule in the target query; the regression comes from reusing a broader membership list in the detail panel.
- This is a policy consistency bug, not just a presentation mismatch, because the backend create path also accepts the expired membership.

## Notes

- Keep the business-date interpretation aligned with the existing `Asia/Seoul` reservation rules.
- Resolved on 2026-03-11 by enforcing expiry checks in both `ReservationService` and the frontend reservable-membership filter, with regression tests on both sides.
