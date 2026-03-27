---
status: completed
priority: p1
issue_id: "123"
tags: [code-review, plan, backend, data-integrity, concurrency, membership]
dependencies: []
---

# Make PT duplicate guard concurrency-safe in the plan

## Problem Statement

The plan says PT duplicate membership creation should be blocked, but the proposed implementation only mentions a service-level existence check before insert. That is not enough to enforce the policy under concurrent purchase requests.

If two desk/admin requests hit the same member at roughly the same time, both can pass the pre-check and both can insert an `ACTIVE` PT membership. The plan currently describes a business rule as if it were canonical, but does not include a concurrency-safe enforcement mechanism.

## Findings

- The plan defines the policy as “동일 회원에게 `ACTIVE` 상태의 PT 회원권이 이미 있으면 새 PT 회원권 생성 차단” in [docs/plans/2026-03-27-feat-member-trainer-assignment-and-pt-membership-guard-plan.md](/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-27-feat-member-trainer-assignment-and-pt-membership-guard-plan.md#L58).
- The technical notes explicitly prefer a service-layer policy over a DB uniqueness guarantee at [docs/plans/2026-03-27-feat-member-trainer-assignment-and-pt-membership-guard-plan.md](/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-27-feat-member-trainer-assignment-and-pt-membership-guard-plan.md#L77).
- The state lifecycle section mentions only “validate before insert” and does not specify locking or uniqueness at [docs/plans/2026-03-27-feat-member-trainer-assignment-and-pt-membership-guard-plan.md](/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-27-feat-member-trainer-assignment-and-pt-membership-guard-plan.md#L85).
- Current purchase flow is a plain read/validate/insert transaction in `MembershipPurchaseService` and `MemberMembershipRepository`, with no locking around “one active PT membership per member”.

## Proposed Solutions

### Option 1: Partial unique index for active PT memberships

**Approach:** Add a database constraint or partial unique index that guarantees at most one active PT membership per member, then catch and map the resulting conflict cleanly.

**Pros:**
- Enforces the rule correctly under concurrency
- Keeps the policy canonical at the storage layer
- Simplifies reasoning for later feature work

**Cons:**
- Requires migration design and data-cleanup strategy if duplicates already exist
- Status-conditional uniqueness can be slightly more complex to model

**Effort:** 4-6 hours

**Risk:** Medium

---

### Option 2: Pessimistic lock on member-scoped purchase flow

**Approach:** Lock the member row or an equivalent guard row during PT purchase validation and insert.

**Pros:**
- Can enforce the policy without a new unique index
- Keeps the existing service-oriented structure

**Cons:**
- Easier to get wrong than a DB constraint
- Adds transactional complexity and lock-ordering concerns
- Harder to audit later

**Effort:** 4-8 hours

**Risk:** Medium

---

### Option 3: Keep service check only

**Approach:** Do nothing beyond the planned pre-check.

**Pros:**
- Lowest implementation effort

**Cons:**
- Does not actually guarantee the policy
- Leaves a race that can violate the user-visible business rule
- Likely to reappear as production data cleanup later

**Effort:** 0-1 hours

**Risk:** High

## Recommended Action

partial unique index를 canonical guard로 채택하고, service pre-check는 사용자 친화 메시지용 보조 검증으로 유지한다.

## Technical Details

**Affected files:**
- [docs/plans/2026-03-27-feat-member-trainer-assignment-and-pt-membership-guard-plan.md](/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-27-feat-member-trainer-assignment-and-pt-membership-guard-plan.md)
- [backend/src/main/java/com/gymcrm/membership/service/MembershipPurchaseService.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/membership/service/MembershipPurchaseService.java)
- [backend/src/main/java/com/gymcrm/membership/repository/MemberMembershipRepository.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/membership/repository/MemberMembershipRepository.java)

**Related components:**
- Membership purchase transaction
- PT reservation ownership policy
- Data integrity around membership lifecycle

**Database changes (if any):**
- Likely yes if the fix uses a partial unique index or equivalent canonical storage guard

## Resources

- **Plan:** [docs/plans/2026-03-27-feat-member-trainer-assignment-and-pt-membership-guard-plan.md](/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-27-feat-member-trainer-assignment-and-pt-membership-guard-plan.md)
- **Brainstorm:** [docs/brainstorms/2026-03-27-member-trainer-assignment-brainstorm.md](/Users/abc/projects/GymCRM_V2/docs/brainstorms/2026-03-27-member-trainer-assignment-brainstorm.md)
- **Related learning:** [docs/solutions/database-issues/pt-availability-based-reservation-integrity-gymcrm-20260327.md](/Users/abc/projects/GymCRM_V2/docs/solutions/database-issues/pt-availability-based-reservation-integrity-gymcrm-20260327.md)

## Acceptance Criteria

- [x] The plan specifies a concurrency-safe enforcement mechanism for “one active PT membership per member”.
- [x] The chosen mechanism is reflected in implementation notes and risks.
- [x] The plan includes at least one concurrent creation test scenario or equivalent verification strategy.
- [x] The business rule remains true even under simultaneous purchase requests.

### 2026-03-27 - Resolution

**By:** Codex

**Actions:**
- Updated the plan to require a persistence-level invariant in addition to service validation.
- Implemented `V28__enforce_single_non_terminal_pt_membership_per_member.sql` with a partial unique index on non-terminal PT memberships.
- Added integration coverage that verifies the unique index blocks a second non-terminal PT membership.

**Outcome:**
- Closed as implemented.

## Work Log

### 2026-03-27 - Initial Discovery

**By:** Codex

**Actions:**
- Reviewed the generated plan and traced the proposed PT duplicate guard.
- Compared the plan’s “service-layer first” wording against the current purchase flow.
- Identified that the plan never closes the race between duplicate validation and insert.

**Learnings:**
- This is a plan-level correctness gap, not just an implementation detail.
- A user-facing invariant should not be left to a best-effort read-before-write check.

## Notes

- This finding is about the plan being incomplete for a canonical business rule, not about deleting or de-scoping the plan artifact.
