---
date: 2026-04-01
topic: membership-holding
status: active
---

# feat: Membership Holding Options & Auto-Resume Batch

## Problem Frame
This plan details the implementation of the membership holding enhancements defined in `docs/brainstorms/2026-04-01-membership-holding-requirements.md`. The overall goals are to transition the current strict hold-limit blocking into a soft-warning/override model on the frontend, and to automate the manual "resume" step by implementing a daily Spring Batch/Scheduled Task that auto-resumes expired holds and sends SMS notifications.

## Origin Document
(see origin: docs/brainstorms/2026-04-01-membership-holding-requirements.md)

## Success Criteria
- The frontend `MembershipsPage` Hold Modal presents accurate holding balances to operators, allowing them to bypass strict checks via a warning override.
- A scheduled backend job running daily picks up all `ACTIVE` holds that have passed their `holdEndDate`, smoothly transitioning them to `RESUMED` status and shifting the membership expiry date.
- An SMS notification is triggered to the user when auto-resume occurs.

## Scope Boundaries
- This plan will implement a simple `@Scheduled` chron job instead of a heavy framework like Spring Batch, optimizing for the current architectural scale.
- We will rely on the existing `SmsAdapter` for SMS dispatching; extending the vendor adapter logic itself is out of scope.

## Dependencies / Assumptions
- The `SmsAdapter` is properly configured or has a Sandbox environment for testing SMS dispatch.
- Currently, `PurchasedMembership` response contains `holdCountUsed` and `holdDaysUsed`, and the `products` list is easily accessible in the frontend `MembershipsPage` context.

---

## Implementation Units

### [ ] 1. Backend Integration - `overrideLimits` Policy Bypass
- **Goal**: Add bypass capabilities to the backend hold validation constraints in `MembershipHoldService`.
- **Requirements**: R2, R3
- **Dependencies**: None
- **Files**:
  - `backend/src/main/java/com/gymcrm/membership/service/MembershipHoldService.java`
  - `backend/src/main/java/com/gymcrm/api/controller/v1/membership/HoldMembershipRequestDto.java` (or matching controller DTO)
- **Approach**: 
  - Update frontend-facing Hold DTOs and `MembershipHoldService.HoldRequest` record to accept an optional `Boolean overrideLimits`.
  - In `validateHoldEligibility()`, skip the `product.maxHoldDays()` and `product.maxHoldCount()` checks if `overrideLimits` is true.
- **Patterns to follow**: Standard Java record extensions and domain validation flow.
- **Test scenarios**:
  - *Happy Path*: A HoldRequest specifying `overrideLimits=true` successfully registers an `ACTIVE` hold even when counts/days exceed max values.
  - *Error Path*: A HoldRequest specifying `overrideLimits=false/null` when limits are exceeded should still correctly throw an `ApiException` (ErrorCode: `BUSINESS_RULE`).

### [ ] 2. Frontend UI - Visual Bounds & Soft Override
- **Goal**: Expose remaining hold balances in the Hold Modal and warn instead of disable when bounds are violated.
- **Requirements**: R1, R2, R3
- **Dependencies**: Unit 1
- **Files**:
  - `frontend/src/pages/member-context/modules/useSelectedMemberMembershipsQuery.ts`
  - `frontend/src/pages/memberships/modules/useMembershipPrototypeState.ts`
  - `frontend/src/pages/memberships/MembershipsPage.tsx`
- **Approach**:
  - Extend `holdMembership` API clients and mock handlers to accept `overrideLimits?: boolean`.
  - In the `MembershipsPage` hold modal, find the matching `targetProduct` by joining `targetMembership.productNameSnapshot` (or category/type) with the loaded products list to get `maxHoldDays` and `maxHoldCount`.
  - Calculate `remainingDays = product.maxHoldDays - targetMembership.holdDaysUsed` and similarly for counts. Display this context visually (e.g., using `Typography.Text`).
  - If the user selects dates exceeding these boundaries, trigger a confirmation dialog (Soft Warning: "한도를 초과했습니다. 진행하시겠습니까?"). If confirmed, submit with `overrideLimits: true`.
- **Test scenarios**:
  - *Edge case*: Product limits are unlimited (null). Ensure calculation doesn't crash or display "NaN".
  - *Integration*: Exceeding the dates and answering 'No' to the popup prevents API dispatch; answering 'Yes' dispatches with `overrideLimits=true`.

### [ ] 3. Backend Scheduling - Auto-Resume Job and Notification
- **Goal**: Implement a nightly job that automatically resumes expired holds and notifies members.
- **Requirements**: R4, R5
- **Dependencies**: None (Can be worked in parallel)
- **Files**:
  - `backend/src/main/java/com/gymcrm/GymCRMApplication.java`
  - `backend/src/main/java/com/gymcrm/membership/repository/MembershipHoldRepository.java`
  - `backend/src/main/java/com/gymcrm/membership/service/MembershipHoldAutoResumeScheduler.java` (create)
- **Approach**:
  - Add `@EnableScheduling` to the main Application class.
  - Add `findExpiredActiveHolds(LocalDate referenceDate)` to `MembershipHoldRepository`: Queries for `ACTIVE` status hooks where `hold_end_date < referenceDate`.
  - Create `MembershipHoldAutoResumeScheduler` component. Inject `MembershipHoldService`, `MembershipHoldRepository`, `MemberRepository`, and `SmsAdapter`.
  - Setup a `@Scheduled(cron = "0 5 0 * * *", zone = "Asia/Seoul")` routine (Runs at 00:05 AM).
  - Loop over expired holds, calling `MembershipHoldService.resume(new ResumeRequest(membershipId, holdEndDate.plusDays(1)))`.
  - Send SMS sequentially using `SmsAdapter`: "회원님의 홀딩 기간이 종료되어 오늘부터 회원권의 정상 이용이 재개되었습니다."
- **Execution note**: Ensure error handling wraps the body of the iteration loop, so one failure doesn't halt the entire batch of resumes.
- **Test scenarios**:
  - *Happy path*: Setup mock data where `holdEndDate` is yesterday. Run the schedule method manually in a test, verify hold transitions to `RESUMED` and the SMS sender receives a dispatch payload.
  - *Error path*: Single failure resilience; if resuming one membership throws an error or SMS fails, the loop continues processing subsequent memberships seamlessly.

## Outstanding Questions
### Deferred to implementation
- Are `PurchasedMembership` identifiers robust enough to instantly link to the original `ProductRecord` via `productId`? If `productId` is not exposed in the `PurchasedMembership` UI model, how will the frontend fetch max limits without a new API query? (May require adding `productId` to `PurchasedMembership` or falling back to existing `productNameSnapshot` comparisons in Unit 2).
