---
status: complete
priority: p2
issue_id: "007"
tags: [code-review, backend, api, validation, consistency]
dependencies: []
---

# Member Create Rejects Lowercase Status/Gender Despite Controller Allowing It

## Problem Statement

`POST /api/v1/members` accepts case-insensitive `memberStatus`/`gender` at the controller layer (`@Pattern(..., ?i)`), but `MemberService#create()` validates those fields **before** normalization. As a result, lowercase or mixed-case inputs that pass controller validation are rejected in the service with `VALIDATION_ERROR`.

This creates inconsistent behavior between API contract and service implementation, and also makes create/update behavior inconsistent (`update()` normalizes before validate, `create()` does not).

## Findings

- `MemberController.CreateMemberRequest` allows case-insensitive values:
  - `memberStatus`: `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberController.java:92`
  - `gender`: `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberController.java:89`
- `MemberService#create()` calls `validateStatus(request.memberStatus())` and `validateGender(request.gender())` before normalization:
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberService.java:27`
- The same method normalizes later when building repository command (`normalizeStatus`, `normalizeUpperOrNull`), which suggests normalization was intended:
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberService.java:36`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberService.java:38`
- `MemberService#update()` normalizes first, then validates, so create/update behavior is inconsistent:
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberService.java:65`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberService.java:67`

## Proposed Solutions

### Option 1: Normalize Before Validate in `create()` (Recommended)

**Approach:** Mirror the `update()` flow in `create()` by normalizing `memberStatus` and `gender` first, then validating normalized values.

**Pros:**
- Aligns with controller contract (`(?i)` patterns)
- Makes create/update behavior consistent
- Small, low-risk code change

**Cons:**
- Requires touching service logic (but minimal)

**Effort:** Small

**Risk:** Low

---

### Option 2: Tighten Controller Validation to Uppercase-Only

**Approach:** Remove `(?i)` from controller regex patterns and document uppercase-only input requirement.

**Pros:**
- Keeps service as-is
- Clearer strict contract (if desired)

**Cons:**
- Worse DX / less forgiving API
- Breaks existing clients that send lowercase values
- Create/update still differ unless update path is also changed

**Effort:** Small

**Risk:** Medium (API behavior change)

## Recommended Action

<!-- Fill during triage -->

## Technical Details

**Affected files:**
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberService.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberController.java`

**Acceptance Criteria**

- [ ] `POST /api/v1/members` accepts lowercase/mixed-case `memberStatus` and `gender` values that match controller regex
- [ ] `MemberService#create()` and `MemberService#update()` use consistent normalize/validate order
- [ ] Add/adjust unit test covering lowercase create input (e.g., `active`, `female`)

## Work Log

### 2026-02-24 - Review Finding Created

**By:** Codex

**Actions:**
- Reviewed member create/update validation flow during local code review
- Confirmed controller is case-insensitive while `create()` service path validates before normalization
- Verified `update()` path behaves differently (normalize then validate)

**Learnings:**
- Create/update parity regressions can slip in when validation/normalization order diverges between methods

