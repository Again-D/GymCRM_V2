---
title: Backend alignment and Redis work summary
status: completed
date: 2026-03-10
author: Codex
origin:
  - docs/plans/2026-03-09-refactor-backend-jpa-querydsl-openapi-alignment-plan.md
  - docs/plans/2026-03-10-feat-redis-runtime-adoption-execution-plan.md
  - docs/plans/2026-03-10-feat-auth-revoke-operational-event-connection-plan.md
  - docs/plans/2026-03-10-feat-redis-deferred-scope-follow-up-plan.md
---

# Backend Alignment And Redis Work Summary

## Summary

이번 작업군은 세 축으로 마감됐다.

1. 백엔드 저장소/문서화 기준을 `JPA + Query Repository + SpringDoc/OpenAPI`로 정렬
2. Redis runtime adoption을 QR, 예약 락, auth denylist까지 실제 런타임 책임으로 도입
3. Redis deferred scope 후속을 CRM/settlement까지 확장하고 auth 운영 revoke 연결까지 마감

현재 기준으로 구현 가능한 후속 범위는 닫혔고, 남은 것은 `no-go` 또는 `reject` 판단 항목뿐이다.

## Timeline

### 1. Backend alignment

완료 내용:
- `JPA + Query Repository + selective native SQL` 구조 정렬
- `SpringDoc/OpenAPI` dev-only 노출, bearer auth / public endpoint override / common error response 문서화
- 핵심 저장소(`member`, `product`, `locker`, `membership`, `reservation`, `access`, `auth`, `audit`, `integration`) 전환
- parity test, startup smoke test, heavy query/native SQL 예외 inventory 추가
- `AccessServiceIntegrationTest` 격리 문제 정리로 전체 테스트 기준선 복구

관련 문서:
- [2026-03-09-refactor-backend-jpa-querydsl-openapi-alignment-plan.md](/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-09-refactor-backend-jpa-querydsl-openapi-alignment-plan.md)
- [2026-03-10-jpa-querydsl-phase2-mapping-rules.md](/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-10-jpa-querydsl-phase2-mapping-rules.md)
- [2026-03-10-phase3-jdbc-native-sql-inventory.md](/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-10-phase3-jdbc-native-sql-inventory.md)
- [2026-03-10-phase6-heavy-query-boundary-and-exceptions.md](/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-10-phase6-heavy-query-boundary-and-exceptions.md)

머지 결과:
- PR [#63](https://github.com/Again-D/GymCRM_V2/pull/63)
- PR [#64](https://github.com/Again-D/GymCRM_V2/pull/64)

### 2. Redis runtime adoption base

완료 내용:
- Redis foundation, health/status, feature flag 구조 추가
- QR token Redis migration
- reservation lock coordination
- access token denylist
- rollout/rollback/validation 문서화

주요 feature flag:
- `app.redis.qr-token-store.enabled`
- `app.redis.reservation-lock.enabled`
- `app.redis.auth-denylist.enabled`

관련 문서:
- [2026-03-10-feat-redis-runtime-adoption-execution-plan.md](/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-10-feat-redis-runtime-adoption-execution-plan.md)
- [2026-03-10-redis-runtime-rollout-validation.md](/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-10-redis-runtime-rollout-validation.md)
- [2026-03-10-backend-architecture-stack-alignment-umbrella-plan-status.md](/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-10-backend-architecture-stack-alignment-umbrella-plan-status.md)

머지 결과:
- PR [#65](https://github.com/Again-D/GymCRM_V2/pull/65)

### 3. Auth operational revoke follow-up

완료 내용:
- `users.access_revoked_after` canonical revoke marker 도입
- Redis runtime mirror 연결
- JWT filter enforcement 확장
- admin 운영 endpoint 추가
  - `POST /api/v1/auth/users/{userId}/revoke-access`
  - `POST /api/v1/auth/users/{userId}/role`
  - `POST /api/v1/auth/users/{userId}/status`
- refresh revoke / audit log 연결

관련 문서:
- [2026-03-10-feat-auth-revoke-operational-event-connection-plan.md](/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-10-feat-auth-revoke-operational-event-connection-plan.md)
- [2026-03-10-auth-operational-revoke-rollout-validation.md](/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-10-auth-operational-revoke-rollout-validation.md)
- [2026-03-10-auth-operational-revoke-work-summary.md](/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-10-auth-operational-revoke-work-summary.md)

머지 결과:
- PR [#66](https://github.com/Again-D/GymCRM_V2/pull/66)

### 4. Redis deferred scope follow-up

완료 내용:
- CRM `processPending` dispatch claim lock
- CRM retry backoff scheduler wheel
- settlement sales dashboard short TTL cache
- settlement sales report export snapshot cache
- deferred inventory / rollout note / follow-up plan 마감

주요 feature flag:
- `app.redis.crm-dispatch-claim.enabled`
- `app.redis.crm-retry-wheel.enabled`
- `app.redis.settlement-dashboard-cache.enabled`
- `app.redis.settlement-report-cache.enabled`

관련 문서:
- [2026-03-10-feat-redis-deferred-scope-follow-up-plan.md](/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-10-feat-redis-deferred-scope-follow-up-plan.md)
- [2026-03-10-redis-deferred-scope-inventory.md](/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-10-redis-deferred-scope-inventory.md)
- [2026-03-10-redis-runtime-rollout-validation.md](/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-10-redis-runtime-rollout-validation.md)

머지 결과:
- PR [#67](https://github.com/Again-D/GymCRM_V2/pull/67)

## Current State

- `main`은 `origin/main`과 동기화되어 있다.
- backend 저장소 구조는 `JPA + Query Repository + selective native SQL` 기준으로 정렬됐다.
- Redis는 현재 아래 책임에 실제 사용된다.
  - QR token store
  - reservation lock coordinator
  - access token denylist
  - auth revoke-after runtime mirror
  - CRM dispatch claim
  - CRM retry wheel
  - settlement sales dashboard cache
  - settlement sales report cache
- [02_시스템_아키텍처_설계서.md](/Users/abc/projects/GymCRM_V2/docs/02_시스템_아키텍처_설계서.md)는 요청대로 목표 상태 문서로 유지됐다.

## Remaining Scope

추가 구현이 필요한 후속 범위는 없다.

남은 것은 판단 보류/비대상만 있다.
- refresh token canonical migration
  - `no-go unless clear bottleneck`
- trigger-time pre-dedupe cache
  - `reject`
- trainer payroll/export coordination
  - `reject for now`

## One-Line Summary

백엔드 구조 정렬, Redis 런타임 도입, auth 운영 revoke, CRM/settlement deferred scope 후속까지 모두 main에 반영되어 현재 목표 범위의 실행 가능한 backend/Redis 트랙은 마감된 상태다.
