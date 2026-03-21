---
status: complete
priority: p1
issue_id: "109"
tags: [code-review, security, backend, auth]
dependencies: []
---

# Block center-admin to super-admin role escalation

## Problem Statement

The PR added `ROLE_SUPER_ADMIN` to the generic account role-update surface without tightening who may assign that role. As shipped, a `CENTER_ADMIN` can call the existing `/api/v1/auth/users/{userId}/role` endpoint and promote any same-center account, including themselves, to `ROLE_SUPER_ADMIN`. That is a direct privilege-escalation path and must be closed before relying on the new role model in production.

## Findings

- `backend/src/main/java/com/gymcrm/auth/AuthController.java:111` still gates the role-update endpoint with `AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN`, which admits center admins.
- `backend/src/main/java/com/gymcrm/auth/AuthController.java:200` expanded the accepted payload values to include `ROLE_SUPER_ADMIN`.
- `backend/src/main/java/com/gymcrm/auth/AuthAccessRevocationService.java:74` updates the target role after only center scoping via `requireScopedUser(...)`; it never checks whether the actor is allowed to assign `ROLE_SUPER_ADMIN`.
- `backend/src/main/java/com/gymcrm/auth/AuthAccessRevocationService.java:131` allows any non-super-admin actor to target same-center users, so self-promotion and peer promotion are both possible.

## Proposed Solutions

### Option 1: Restrict `ROLE_SUPER_ADMIN` assignment in the service

**Approach:** Keep the broader endpoint policy if needed for other role changes, but add an explicit guard in `updateRoleAndRevoke(...)` that only an existing super admin may assign or retain `ROLE_SUPER_ADMIN`.

**Pros:**
- Closes the escalation at the business-logic boundary.
- Preserves existing center-admin flows for non-super-admin role changes.

**Cons:**
- Requires careful tests for actor/target combinations.
- OpenAPI role matrix may still need clarification if endpoint policy stays broad.

**Effort:** 1-2 hours

**Risk:** Low

---

### Option 2: Split role-assignment endpoints by privilege tier

**Approach:** Keep the current endpoint for center-scoped role changes and introduce a separate super-admin-only path for assigning `ROLE_SUPER_ADMIN`.

**Pros:**
- Makes privilege boundaries explicit in API shape and docs.
- Easier to reason about long term.

**Cons:**
- More API surface area.
- Requires client/doc updates.

**Effort:** 3-5 hours

**Risk:** Medium

## Recommended Action

Enforce the `ROLE_SUPER_ADMIN` boundary inside `AuthAccessRevocationService.updateRoleAndRevoke(...)` so only an existing super admin may assign or modify super-admin roles, and back it with an integration test that proves a center admin receives `ACCESS_DENIED` when attempting the escalation.

## Technical Details

**Affected files:**
- `backend/src/main/java/com/gymcrm/auth/AuthController.java`
- `backend/src/main/java/com/gymcrm/auth/AuthAccessRevocationService.java`
- Relevant integration tests for auth role updates

**Related components:**
- JWT/role-based access control
- Account operations audit logging

**Database changes (if any):**
- No schema change required

## Resources

- **PR:** [#88](https://github.com/Again-D/GymCRM_V2/pull/88)
- **Review target:** merged commit `5f9e1e2b893fb30d9011a2cb83c0f73c6c491b22`

## Acceptance Criteria

- [x] A `CENTER_ADMIN` cannot assign `ROLE_SUPER_ADMIN` to self or any peer account.
- [x] Existing `SUPER_ADMIN` users can still assign `ROLE_SUPER_ADMIN` when required by product policy.
- [x] Integration coverage asserts allowed and denied role transitions explicitly.
- [x] OpenAPI / authorization docs match the enforced behavior.

## Work Log

### 2026-03-20 - Initial Discovery

**By:** Codex

**Actions:**
- Reviewed PR #88 auth role-management changes.
- Traced the role-update controller and service path.
- Confirmed `ROLE_SUPER_ADMIN` was added to validation without a corresponding actor-permission guard.

**Learnings:**
- The new trainer-management role support widened the generic auth role-update surface as a side effect.
- Center scoping alone is insufficient once global roles are assignable.

### 2026-03-21 - Fix Applied

**By:** Codex

**Actions:**
- Added a service-level guard in `AuthAccessRevocationService` to deny any super-admin role assignment or mutation unless the actor is already `ROLE_SUPER_ADMIN`.
- Added an integration test proving `CENTER_ADMIN` receives `ACCESS_DENIED` when trying to promote a same-center user to `ROLE_SUPER_ADMIN`.
- Ran `cd backend && ./gradlew test --tests com.gymcrm.auth.AuthOperationalAccessRevokeIntegrationTest`.

**Learnings:**
- The correct boundary is the business-service layer, not controller validation, because the same endpoint still supports non-super-admin role updates.
- Protecting both the requested role and current target role keeps future super-admin demotion/edit paths from silently reopening the escalation gap.
