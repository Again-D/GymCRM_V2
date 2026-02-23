---
status: complete
priority: p2
issue_id: "008"
tags: [code-review, backend, api, validation, data-integrity]
dependencies: []
---

# Member Update Allows Blank Name/Phone Strings

## Problem Statement

`PATCH /api/v1/members/{memberId}` can persist empty-string values for `memberName` and `phone`. The update request DTO does not apply `@NotBlank` validation, and `MemberService#update()` trims incoming strings but does not reject blank results. Since the DB schema only enforces `NOT NULL` (not non-empty), `''` values can be stored.

This is a user-visible data integrity issue and creates inconsistency with create validation, which requires non-blank `memberName` and `phone`.

## Findings

- `UpdateMemberRequest` has no `@NotBlank` on `memberName` or `phone`:
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberController.java:101`
- `MemberService#update()` trims provided values but does not re-validate blanks:
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberService.java:73`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberService.java:74`
- `members` table only requires `NOT NULL`, so empty strings are still valid at DB level:
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/resources/db/migration/V3__create_members_and_products.sql:4`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/resources/db/migration/V3__create_members_and_products.sql:5`

## Proposed Solutions

### Option 1: Validate Non-Blank in Service for Updated Effective Values (Recommended)

**Approach:** After resolving `next` values in `update()`, explicitly reject blank `memberName` / `phone` (post-trim) before repository update.

**Pros:**
- Protects integrity regardless of controller annotation gaps
- Keeps partial update semantics intact
- Aligns create/update behavior

**Cons:**
- Requires a small amount of duplicated validation logic unless extracted

**Effort:** Small

**Risk:** Low

---

### Option 2: Add DTO Validation Constraints to `UpdateMemberRequest`

**Approach:** Add `@NotBlank` to update fields.

**Pros:**
- Fails fast at controller boundary
- Consistent with create DTO

**Cons:**
- `@NotBlank` on optional PATCH fields can reject omitted/null values unless combined carefully (custom validation or conditional handling needed)
- Still worth pairing with service validation for safety

**Effort:** Small-Medium

**Risk:** Medium (PATCH semantics edge cases)

## Recommended Action

<!-- Fill during triage -->

## Technical Details

**Affected files:**
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberController.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberService.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/resources/db/migration/V3__create_members_and_products.sql`

**Acceptance Criteria**

- [ ] `PATCH /api/v1/members/{memberId}` rejects `memberName: "   "` with validation/business error
- [ ] `PATCH /api/v1/members/{memberId}` rejects `phone: "   "` with validation/business error
- [ ] Omitted `memberName`/`phone` in PATCH remains allowed (partial update semantics preserved)
- [ ] Add test coverage for blank-string PATCH payloads

## Work Log

### 2026-02-24 - Review Finding Created

**By:** Codex

**Actions:**
- Reviewed member PATCH validation path during local code review
- Confirmed DTO does not constrain optional `memberName`/`phone`
- Confirmed service trims values but can persist empty strings
- Confirmed DB `NOT NULL` constraints do not prevent blank strings

**Learnings:**
- PATCH endpoints need explicit post-trim validation for required persisted fields even when DTO fields are optional
