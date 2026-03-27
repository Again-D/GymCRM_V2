---
status: completed
priority: p1
issue_id: "124"
tags: [code-review, plan, product, policy, membership, pt]
dependencies: []
---

# Resolve HOLDING PT exception before implementation

## Problem Statement

The plan says the business intent is effectively “one PT membership per member”, but then leaves a default assumption that a member with a `HOLDING` PT membership may still receive a new `ACTIVE` PT membership. That exception materially changes the policy and creates a second PT ownership model.

This is not a minor edge case. It changes how staff interpret “PT 회원권은 하나만” and “가급적 한명의 담당 트레이너” during real operations.

## Findings

- The plan states the duplicate rule as “회원당 활성 PT 회원권 1개” and treats broader status handling as deferred at [docs/plans/2026-03-27-feat-member-trainer-assignment-and-pt-membership-guard-plan.md](/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-27-feat-member-trainer-assignment-and-pt-membership-guard-plan.md#L62).
- The SpecFlow section then records a default assumption that a new `ACTIVE` PT can still be created while an older PT is `HOLDING` at [docs/plans/2026-03-27-feat-member-trainer-assignment-and-pt-membership-guard-plan.md](/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-27-feat-member-trainer-assignment-and-pt-membership-guard-plan.md#L116).
- The risk section already acknowledges this is operationally ambiguous at [docs/plans/2026-03-27-feat-member-trainer-assignment-and-pt-membership-guard-plan.md](/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-27-feat-member-trainer-assignment-and-pt-membership-guard-plan.md#L155).
- Existing lifecycle semantics treat `HOLDING` as a live membership state that can resume back to `ACTIVE`, and refund is blocked while holding. That makes “allow a second active PT while one is holding” a real policy fork, not a harmless temporary assumption.

## Proposed Solutions

### Option 1: Treat HOLDING as still occupying the single PT slot

**Approach:** Define the policy as “a member may have at most one non-terminal PT membership (`ACTIVE` or `HOLDING`)”.

**Pros:**
- Matches the user’s stated intent more closely
- Keeps ownership and trainer assignment semantics simple
- Avoids weird dual-membership states during hold/resume

**Cons:**
- Slightly stricter than the current draft
- May block some edge operational workflows

**Effort:** 2-4 hours

**Risk:** Low

---

### Option 2: Explicitly allow HOLDING + new ACTIVE, but document the operational model

**Approach:** Keep the exception, but state it as an intentional rule with examples and follow-on constraints.

**Pros:**
- Preserves flexibility for edge operations
- No need to revisit hold semantics right now

**Cons:**
- Conflicts with “PT membership should be one”
- Makes trainer assignment policy harder to reason about
- Likely needs more UI and operational guidance than this scope allows

**Effort:** 3-5 hours

**Risk:** Medium

---

### Option 3: Defer the HOLDING decision entirely

**Approach:** Leave it unresolved in the plan and decide during implementation.

**Pros:**
- No up-front policy work

**Cons:**
- Guarantees implementation churn
- Makes acceptance criteria ambiguous
- Risks shipping behavior that contradicts the user’s expectation

**Effort:** 0-1 hours

**Risk:** High

## Recommended Action

`HOLDING`을 `ACTIVE`와 함께 비종결 PT 상태로 정의해 단일 PT 슬롯을 점유하도록 고정한다.

## Technical Details

**Affected files:**
- [docs/plans/2026-03-27-feat-member-trainer-assignment-and-pt-membership-guard-plan.md](/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-27-feat-member-trainer-assignment-and-pt-membership-guard-plan.md)
- [backend/src/main/java/com/gymcrm/membership/service/MembershipHoldService.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/membership/service/MembershipHoldService.java)
- [backend/src/main/java/com/gymcrm/membership/service/MembershipRefundService.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/membership/service/MembershipRefundService.java)

**Related components:**
- Membership lifecycle states
- Trainer ownership policy
- Purchase validation rules

**Database changes (if any):**
- No schema change required for the plan decision itself

## Resources

- **Plan:** [docs/plans/2026-03-27-feat-member-trainer-assignment-and-pt-membership-guard-plan.md](/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-27-feat-member-trainer-assignment-and-pt-membership-guard-plan.md)
- **Brainstorm:** [docs/brainstorms/2026-03-27-member-trainer-assignment-brainstorm.md](/Users/abc/projects/GymCRM_V2/docs/brainstorms/2026-03-27-member-trainer-assignment-brainstorm.md)

## Acceptance Criteria

- [x] The plan explicitly resolves whether `HOLDING` PT memberships count toward the “single PT membership” rule.
- [x] Acceptance criteria and testing bullets use the same rule.
- [x] The chosen rule aligns with the user’s stated operating policy.
- [x] No implementation work is started with this ambiguity still open.

### 2026-03-27 - Resolution

**By:** Codex

**Actions:**
- Updated the plan so `ACTIVE` and `HOLDING` both count as non-terminal PT memberships.
- Reflected the same rule in backend validation, migration design, and integration tests.

**Outcome:**
- Closed as implemented.

## Work Log

### 2026-03-27 - Initial Discovery

**By:** Codex

**Actions:**
- Reviewed the plan’s duplicate-guard wording and edge-case section.
- Compared the draft exception for `HOLDING` against the user’s stated “PT회원권은 하나만” intent.
- Cross-checked lifecycle semantics in hold/refund services.

**Learnings:**
- The plan currently documents a policy exception that has not actually been accepted.
- `HOLDING` is treated as a live lifecycle state, so this cannot be brushed off as a minor implementation detail.

## Notes

- This finding is about clarifying policy before implementation, not about removing the plan file.
