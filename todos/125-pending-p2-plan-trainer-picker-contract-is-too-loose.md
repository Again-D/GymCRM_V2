---
status: completed
priority: p2
issue_id: "125"
tags: [code-review, plan, api, frontend, security, auth]
dependencies: []
---

# Tighten trainer picker contract in the plan

## Problem Statement

The plan says the purchase modal should reuse a lightweight trainer surface “if possible”, and lists `GET /api/v1/auth/trainers` as the first candidate. But that surface currently returns `loginId` even though the purchase modal only needs `userId` and `displayName`.

Leaving the picker contract this loose increases the chance that implementation will couple a membership purchase UI to an auth-oriented endpoint and carry account identifiers through a workflow that does not need them.

## Findings

- The plan recommends reusing an existing lightweight surface and lists `GET /api/v1/auth/trainers` at [docs/plans/2026-03-27-feat-member-trainer-assignment-and-pt-membership-guard-plan.md](/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-27-feat-member-trainer-assignment-and-pt-membership-guard-plan.md#L47).
- The current `/api/v1/auth/trainers` response includes `loginId` in `TrainerSummaryResponse` at [AuthController.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/common/auth/controller/AuthController.java#L194).
- The same endpoint is also reachable by `ROLE_TRAINER`, not just desk/admin, at [AuthController.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/common/auth/controller/AuthController.java#L97).
- The plan never pins the minimal picker contract (`userId`, `displayName`) as a requirement, so an unnecessarily broad response shape can become the default implementation.

## Proposed Solutions

### Option 1: Pin a minimal trainer picker DTO in the plan

**Approach:** Update the plan so the purchase flow must use a picker contract that exposes only the fields the modal needs.

**Pros:**
- Reduces accidental data exposure
- Makes frontend integration simpler
- Keeps auth and purchase concerns cleaner

**Cons:**
- May require a small adapter or a dedicated endpoint

**Effort:** 1-3 hours

**Risk:** Low

---

### Option 2: Reuse `/api/v1/auth/trainers` unchanged

**Approach:** Accept the broader DTO and let the frontend ignore extra fields.

**Pros:**
- Lowest implementation effort

**Cons:**
- Keeps unnecessary `loginId` exposure in the flow
- Tightens coupling to auth-oriented response shapes
- Makes later least-privilege cleanup harder

**Effort:** 0-1 hours

**Risk:** Medium

## Recommended Action

trainer picker 계약을 `userId`, `displayName`으로 고정하고, `/api/v1/auth/trainers`도 이 최소 DTO만 반환하도록 축소한다.

## Technical Details

**Affected files:**
- [docs/plans/2026-03-27-feat-member-trainer-assignment-and-pt-membership-guard-plan.md](/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-27-feat-member-trainer-assignment-and-pt-membership-guard-plan.md)
- [backend/src/main/java/com/gymcrm/common/auth/controller/AuthController.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/common/auth/controller/AuthController.java)

**Related components:**
- Auth controller lightweight trainer list
- Membership purchase modal trainer picker
- Frontend form state and options loading

**Database changes (if any):**
- No

## Resources

- **Plan:** [docs/plans/2026-03-27-feat-member-trainer-assignment-and-pt-membership-guard-plan.md](/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-27-feat-member-trainer-assignment-and-pt-membership-guard-plan.md)
- **Related plan:** [docs/plans/2026-03-20-feat-trainer-management-and-account-operations-plan.md](/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-20-feat-trainer-management-and-account-operations-plan.md)

## Acceptance Criteria

- [x] The plan specifies the minimal data contract required for trainer selection in membership purchase.
- [x] The plan does not leave `loginId` exposure as an incidental implementation choice.
- [x] The frontend purchase flow can be built against a stable picker DTO without depending on trainer admin detail shapes.

### 2026-03-27 - Resolution

**By:** Codex

**Actions:**
- Tightened the plan to require a minimal trainer picker contract.
- Reduced `/api/v1/auth/trainers` to `userId`, `centerId`, `displayName`.
- Added backend test coverage to ensure `loginId` no longer appears in the trainer picker payload.

**Outcome:**
- Closed as implemented.

## Work Log

### 2026-03-27 - Initial Discovery

**By:** Codex

**Actions:**
- Reviewed the plan’s trainer picker section.
- Traced the current `/api/v1/auth/trainers` endpoint and response shape.
- Compared the endpoint payload to the actual needs of the purchase modal.

**Learnings:**
- The current candidate endpoint is lightweight in route shape, but not minimal in payload shape.
- This is a plan-quality issue because the current wording leaves too much room for accidental overexposure.

## Notes

- This is a P2 because it does not block the core business flow, but it should be clarified before implementation.
