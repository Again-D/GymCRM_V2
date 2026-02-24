---
status: complete
priority: p2
issue_id: "013"
tags: [code-review, backend, security, auth, jwt]
dependencies: []
---

# Refresh Replay Rejection Does Not Revoke the Token Family

## Problem Statement

The refresh token flow stores `token_family_id` and rotates tokens, but replay detection only rejects the reused token itself. When a revoked/rotated refresh token is replayed, the implementation returns `TOKEN_REVOKED` without revoking other active tokens in the same family.

This limits breach containment: a replay event strongly suggests token theft, yet descendant refresh tokens in the same family can remain valid.

## Findings

- Replay detection path returns immediately on `stored.isRevoked()` without family-wide revocation:
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/auth/AuthService.java:72`
- Rotation reuses `stored.tokenFamilyId()` for the next refresh token, so tokens are explicitly chained as a family:
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/auth/AuthService.java:92`
- Schema stores and indexes `token_family_id`, but repository exposes no family revoke operation:
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/resources/db/migration/V6__create_users_and_auth_refresh_tokens.sql:35`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/resources/db/migration/V6__create_users_and_auth_refresh_tokens.sql:53`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/auth/AuthRefreshTokenRepository.java:47`

## Proposed Solutions

### Option 1: Revoke active tokens in the family on replay detection (Recommended)

On replay (`stored.isRevoked()` or failed conditional rotate), revoke all active tokens with the same `token_family_id` and return `TOKEN_REVOKED`.

Pros:
- Stronger compromise containment
- Uses already stored `token_family_id`

Cons:
- Requires additional repository update and tests

Effort: Medium
Risk: Low-Medium

### Option 2: Keep current behavior but document as prototype limitation

Pros:
- No code change

Cons:
- Security posture weaker than expected for family-based rotation

Effort: Small
Risk: Medium

## Recommended Action

<!-- Fill during triage -->

## Technical Details

Affected files:
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/auth/AuthService.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/auth/AuthRefreshTokenRepository.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/resources/db/migration/V6__create_users_and_auth_refresh_tokens.sql`

Acceptance Criteria:
- [ ] Replayed/rotated refresh token usage revokes the active token family (or explicit limitation is documented)
- [ ] Integration test covers replay-after-rotation and verifies family revoke behavior
- [ ] Error response remains deterministic (`401 TOKEN_REVOKED`)

## Work Log

### 2026-02-24 - Review Finding Created

**By:** Codex

**Actions:**
- Reviewed refresh rotation flow, schema, and repository capabilities
- Confirmed `token_family_id` is persisted and propagated but not used for replay containment
