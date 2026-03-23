---
status: complete
priority: p2
issue_id: "112"
tags: [backend, auth, performance, role-storage]
dependencies: []
---

# Avoid full-user scan in auth trainer listing after role cutover

## Problem Statement

The role-storage cutover replaced `users.role_code` with `user_roles`, but the trainer listing path still resolves trainers by loading every user entity and filtering roles in memory. This keeps `/api/v1/auth/trainers` functionally correct, but it turns a previously simple query path into a full-table scan plus lazy role lookups, which will degrade noticeably as account volume grows.

## Findings

- In [AuthUserRepository.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/auth/AuthUserRepository.java#L50), `findActiveByCenterAndRoleCode` now calls `authUserJpaRepository.findAll()` and filters by `entity.getRoles()` in memory.
- [AuthUserJpaRepository.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/auth/AuthUserJpaRepository.java#L8) only defines entity-graph methods for point lookups, so the `findAll()` path does not prefetch roles and relies on lazy collection access.
- [AuthService.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/auth/AuthService.java#L139) exposes this through `listActiveTrainers`, so every caller of `/api/v1/auth/trainers` now scans all users in the center-independent table and loads role rows one user at a time.
- Impact: query count and latency now scale with total user count instead of matching only active trainers in the requested center.

## Proposed Solutions

### Option 1: Add a repository query that joins `user_roles` and `roles`

**Approach:** Replace the `findAll()` stream filter with a dedicated JPA query or Spring Data derived query that constrains `centerId`, `userStatus`, `isDeleted`, and `roles.roleCode` in SQL.

**Pros:**
- Eliminates the N+1 lazy role lookup pattern.
- Keeps auth trainer listing cost proportional to matching rows.
- Aligns the repository with the new normalized schema.

**Cons:**
- Requires a new repository method and test coverage around the query.

**Effort:** 1-2 hours

**Risk:** Low

---

### Option 2: Move trainer listing to `JdbcClient`

**Approach:** Mirror the style used in `TrainerQueryRepository` and query trainer users through a small SQL projection.

**Pros:**
- Explicit SQL and predictable execution plan.
- Easy to tune with indexes if needed.

**Cons:**
- Adds another query style to the auth module.
- More manual mapping than the repository approach.

**Effort:** 2-3 hours

**Risk:** Low

## Recommended Action

Implemented Option 1. `AuthUserJpaRepository` now resolves active users by `centerId`, `userStatus`, and `roles.roleCode` in SQL, and `AuthUserRepository` no longer uses `findAll()` for trainer listing.

## Technical Details

**Affected files:**
- [AuthUserRepository.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/auth/AuthUserRepository.java#L50)
- [AuthUserJpaRepository.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/auth/AuthUserJpaRepository.java#L8)
- [AuthService.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/auth/AuthService.java#L139)

**Related components:**
- `/api/v1/auth/trainers`
- Reservation and trainer-management UI flows that consume trainer lookup data

**Database changes (if any):**
- Migration needed: No
- New indexes: likely not required initially because `user_roles.user_id` already has a unique index and `roles.role_code` is unique

## Resources

- **Commit under review:** `c9a35a6`

## Acceptance Criteria

- [x] `findActiveByCenterAndRoleCode` no longer loads all users via `findAll()`
- [x] Trainer listing filters by role in SQL rather than in-memory role traversal
- [x] Existing auth trainer listing behavior remains unchanged
- [x] Relevant backend tests pass

## Work Log

### 2026-03-23 - Review Finding Capture

**By:** Codex

**Actions:**
- Reviewed commit `c9a35a6` for the role-storage cutover
- Traced `/api/v1/auth/trainers` from controller to repository
- Identified a full-table scan plus lazy role lookup regression introduced by the new `user_roles` mapping

**Learnings:**
- The cutover updated point lookups to eager-load roles but left the role-based listing path on `findAll()`
- The regression is performance-focused rather than functional, so it is a good candidate for a follow-up fix

### 2026-03-23 - Fix Applied

**By:** Codex

**Actions:**
- Added a role-aware Spring Data query in [AuthUserJpaRepository.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/auth/AuthUserJpaRepository.java)
- Replaced the in-memory `findAll()` filtering path in [AuthUserRepository.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/auth/AuthUserRepository.java)
- Extended [AuthControllerIntegrationTest.java](/Users/abc/projects/GymCRM_V2/backend/src/test/java/com/gymcrm/auth/AuthControllerIntegrationTest.java) to verify non-trainer users are excluded from `/api/v1/auth/trainers`
- Ran `cd backend && ./gradlew test --tests com.gymcrm.auth.AuthControllerIntegrationTest`

**Learnings:**
- The existing auth controller integration suite was enough to cover the regression once a non-trainer control user was added
- `@EntityGraph` on the new repository method keeps the domain mapping unchanged while removing the full scan

## Notes

- Do not revert the normalized role-storage model; tighten the repository query around it.
