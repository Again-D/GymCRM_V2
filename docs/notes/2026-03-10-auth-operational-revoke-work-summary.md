---
title: Auth operational revoke work summary
status: completed
date: 2026-03-10
origin:
  - docs/plans/2026-03-10-feat-auth-revoke-operational-event-connection-plan.md
  - docs/notes/2026-03-10-auth-operational-revoke-rollout-validation.md
  - docs/notes/2026-03-10-redis-runtime-rollout-validation.md
---

# Auth Operational Revoke Work Summary

## Summary

기존 Redis auth denylist는 `logout 시 현재 access token jti 차단`까지만 처리했다.
이번 작업에서는 이를 운영 이벤트까지 확장해 `forced revoke`, `role downgrade`, `user deactivation`이 모두 같은 revoke model로 동작하도록 연결했다.

## What Changed

- PostgreSQL canonical revoke marker 추가
  - `users.access_revoked_after`
- Redis runtime mirror 추가
  - `auth:revoke-after:user:{userId}`
- JWT filter enforcement 확장
  - `jti denylist -> revoke-after -> current user state` 순서로 검사
- admin auth user 운영 endpoint 추가
  - `POST /api/v1/auth/users/{userId}/revoke-access`
  - `POST /api/v1/auth/users/{userId}/role`
  - `POST /api/v1/auth/users/{userId}/status`
- refresh token revoke 연결
  - `FORCED_REVOKE`
  - `ROLE_CHANGED`
  - `STATUS_CHANGED`
- audit event 확장
  - `ACCOUNT_ACCESS_REVOKE`
  - `ACCOUNT_ROLE_CHANGE`
  - `ACCOUNT_STATUS_CHANGE`

## Key Decisions

- refresh token canonical source는 계속 PostgreSQL `auth_refresh_tokens` 유지
- user-scope revoke는 `jti denylist`가 아니라 `access_revoked_after`로 처리
- Redis는 canonical이 아니라 runtime mirror/fallback optimization 역할로 제한
- old token 차단 응답은 운영 이벤트 경로에서 `401 TOKEN_REVOKED`로 통일
- principal authority는 token claim이 아니라 current DB role 기준 유지

## Validation

Targeted:
- `AuthAccessRevokeAfterIntegrationTest`
- `AuthOperationalAccessRevokeIntegrationTest`
- `AuthAccessDenylistIntegrationTest`
- `AuthControllerIntegrationTest`
- `RbacAuthorizationIntegrationTest`
- `AuditLogApiIntegrationTest`

Full:
- `cd backend && ./gradlew test`

결과:
- targeted suite 통과
- full suite 통과

## Output Documents

- 실행 계획: [2026-03-10-feat-auth-revoke-operational-event-connection-plan.md](/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-10-feat-auth-revoke-operational-event-connection-plan.md)
- rollout/validation: [2026-03-10-auth-operational-revoke-rollout-validation.md](/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-10-auth-operational-revoke-rollout-validation.md)
- Redis 상위 rollout note: [2026-03-10-redis-runtime-rollout-validation.md](/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-10-redis-runtime-rollout-validation.md)

## Final State

- auth revoke operational follow-up plan: `completed`
- Redis rollout note의 deferred scope에서 auth operational revoke 항목 제거
- 구현 결과는 PR [#66](https://github.com/Again-D/GymCRM_V2/pull/66)로 머지 완료
