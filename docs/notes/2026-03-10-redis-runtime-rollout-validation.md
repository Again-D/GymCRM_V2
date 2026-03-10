---
title: Redis runtime rollout and validation
status: active
date: 2026-03-10
author: Codex
origin:
  - docs/plans/2026-03-10-feat-redis-runtime-adoption-execution-plan.md
  - docs/plans/2026-03-09-feat-redis-runtime-adoption-boundary-plan.md
  - docs/notes/2026-03-10-backend-architecture-stack-alignment-umbrella-plan-status.md
---

# Redis Runtime Rollout And Validation

## Responsibility Status Matrix

| Responsibility | Feature flag | Current state | Canonical source | Rollback action | Notes |
|---|---|---|---|---|---|
| Redis foundation | `app.redis.enabled` | implemented | n/a | `app.redis.enabled=false` | health, timeout, runtime config only |
| QR token store | `app.redis.qr-token-store.enabled` | implemented | Redis | disable QR Redis flag | verify path is fail-closed on store failure |
| Reservation lock | `app.redis.reservation-lock.enabled` | implemented | PostgreSQL business state + Redis lock coordinator | disable reservation lock flag | lock contention/unavailable returns conflict |
| Access denylist | `app.redis.auth-denylist.enabled` | implemented | PostgreSQL refresh token + Redis access denylist | disable auth denylist flag | logout writes denylist, JWT filter rejects denylisted token |
| Refresh token store migration | none | deferred | PostgreSQL `auth_refresh_tokens` | n/a | explicit non-goal in this milestone |
| Redis-backed CRM/settlement state | `CRM processPending dispatch claim lock`, `sales dashboard short TTL cache`, `sales report export snapshot cache` | active follow-up | PostgreSQL | Redis lease claim + short TTL caches | deferred inventory follow-up track |

## Rollout Order

고정 순서:

1. QR token store
2. reservation lock
3. auth denylist

이 순서를 유지하는 이유:

- QR은 ephemeral state 전용이라 canonical business source 변경 없이 먼저 올릴 수 있다.
- reservation lock은 business state를 PostgreSQL에 유지한 채 조정자만 Redis로 추가한다.
- auth denylist는 보안 의미가 크므로 foundation과 earlier Redis paths가 안정화된 뒤 올리는 것이 맞다.

## Rollout And Rollback Rules

### Phase A: QR token store

- Enable:
  - `app.redis.enabled=true`
  - `app.redis.qr-token-store.enabled=true`
- Healthy signals:
  - QR issue/verify smoke passes
  - reused token이 `TOKEN_REUSED` 또는 대응 denied code로 일관되게 기록된다
  - health payload에서 Redis flags가 기대값으로 노출된다
- Failure signals:
  - valid QR가 `QR_STORE_UNAVAILABLE`로 반복 거절된다
  - one-time consume 후 재사용 판정이 누락된다
  - Redis timeout/connection error 로그가 연속 발생한다
- Rollback trigger:
  - fail-closed 오탐으로 정상 입장이 반복 차단될 때
  - reused/expiry semantics drift가 검증 윈도우에서 재현될 때
- Rollback action:
  - `app.redis.qr-token-store.enabled=false`

### Phase B: Reservation lock

- Enable:
  - `app.redis.enabled=true`
  - `app.redis.reservation-lock.enabled=true`
- Healthy signals:
  - concurrent create/cancel path가 overbooking 없이 통과한다
  - conflict 응답이 contention 상황에서만 발생한다
  - lock wait/lease timeout 로그가 임계치 아래에 머문다
- Failure signals:
  - 정상 단일 요청에서도 `409 CONFLICT`가 비정상적으로 증가한다
  - lock release failure 또는 lease expiry mismatch가 관측된다
  - 예약 write latency가 validation window 동안 지속 증가한다
- Rollback trigger:
  - lock contention false positive가 운영 흐름을 막을 때
  - lock outage로 예약 생성/수정이 광범위하게 차단될 때
- Rollback action:
  - `app.redis.reservation-lock.enabled=false`

### Phase C: Auth denylist

- Enable:
  - `app.redis.enabled=true`
  - `app.redis.auth-denylist.enabled=true`
- Healthy signals:
  - logout 직후 동일 access token 재사용이 `TOKEN_REVOKED`로 차단된다
  - refresh token rotation/replay detection은 기존과 동일하게 동작한다
  - denylist key TTL이 access token 잔여 수명과 정렬된다
- Failure signals:
  - logout 이후 access token이 계속 허용된다
  - denylist read/write 예외가 반복 발생한다
  - Redis 장애 시 revoke guarantee degradation이 로그로 과도하게 발생한다
- Rollback trigger:
  - 정상 토큰 오차단 또는 denylist write 실패가 반복될 때
  - logout flow가 사용자 관점에서 불안정해질 때
- Rollback action:
  - `app.redis.auth-denylist.enabled=false`

## Validation Window And Owner

| Responsibility | Validation window | Primary owner | Healthy signal | Failure signal |
|---|---|---|---|---|
| QR token store | enable 직후 + 당일 오픈/피크 시간 | backend owner | issue/verify/reuse smoke stable | 정상 QR 오차단, reuse miss |
| Reservation lock | enable 직후 + 예약 집중 시간대 | backend owner | no overbooking, conflict rate stable | false conflict spike, write latency spike |
| Auth denylist | enable 직후 + logout/re-login smoke | backend owner | logout token reuse blocked | revoke miss, false revoke, repeated denylist errors |

현재 문서에서는 owner를 역할 기준 `backend owner`로 둔다. 실제 배포 시점에는 PR의 `Post-Deploy Monitoring & Validation` 섹션에 담당자 이름을 채운다.

## Validation Commands And Checks

애플리케이션 기준:

- `./gradlew test --tests com.gymcrm.access.AccessQrApiIntegrationTest`
- `./gradlew test --tests com.gymcrm.reservation.ReservationServiceIntegrationTest --tests com.gymcrm.reservation.ReservationApiIntegrationTest`
- `./gradlew test --tests com.gymcrm.auth.AuthAccessDenylistIntegrationTest --tests com.gymcrm.auth.AuthControllerIntegrationTest`
- `./gradlew test`

운영 smoke 기준:

- QR:
  - issue -> verify -> reused verify
- reservation:
  - create -> duplicate contention check -> cancel
- auth:
  - login -> logout -> same access token `/api/v1/auth/me` 재호출

## Deferred Scope

현재 마일스톤에서 의도적으로 남긴 항목:

- refresh token canonical source Redis 이전
- Redis 기반 CRM/settlement deferred inventory 후속
  - inventory:
    - [2026-03-10-redis-deferred-scope-inventory.md](/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-10-redis-deferred-scope-inventory.md)
  - 현재 구현 완료:
    - `CRM processPending dispatch claim lock`
    - `sales dashboard short TTL cache`
    - `sales report export snapshot cache`
  - remaining:
    - retry backoff scheduler wheel (`later`)

구현 완료로 deferred scope에서 제거된 항목:

- 강제 revoke 전용 admin API
- role downgrade / user deactivation event와 denylist write 연결
- 상세 validation note:
  - [2026-03-10-auth-operational-revoke-rollout-validation.md](/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-10-auth-operational-revoke-rollout-validation.md)

## Cross-Document Status

- umbrella plan:
  - [2026-03-09-refactor-backend-architecture-stack-alignment-plan.md](/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-09-refactor-backend-architecture-stack-alignment-plan.md)
  - historical umbrella plan으로 유지
- Redis boundary plan:
  - [2026-03-09-feat-redis-runtime-adoption-boundary-plan.md](/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-09-feat-redis-runtime-adoption-boundary-plan.md)
  - boundary/reference 문서로 유지
- Redis execution plan:
  - [2026-03-10-feat-redis-runtime-adoption-execution-plan.md](/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-10-feat-redis-runtime-adoption-execution-plan.md)
  - 실제 구현 기준 문서
- architecture document:
  - [02_시스템_아키텍처_설계서.md](/Users/abc/projects/GymCRM_V2/docs/02_시스템_아키텍처_설계서.md)
  - 목표 상태 문서로 그대로 유지
