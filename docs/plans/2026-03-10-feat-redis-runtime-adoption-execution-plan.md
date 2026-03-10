---
title: feat: Redis Runtime Adoption Execution
type: feat
status: active
date: 2026-03-10
origin: docs/brainstorms/2026-03-10-backend-architecture-stack-alignment-remaining-work-brainstorm.md
---

# feat: Redis Runtime Adoption Execution

## Enhancement Summary

**Deepened on:** 2026-03-10
**Sections enhanced:** 6
**Research sources used:** Spring Data Redis official docs, Redisson official docs, existing project Redis boundary plan

### Key Improvements
1. Redis foundation phase에 feature flag, health indicator, timeout, profile gating 기준을 더 구체화했다.
2. QR token migration에 key space 설계와 TTL/reuse marker semantics를 추가했다.
3. reservation lock phase에 `tryLock(waitTime, leaseTime)` 및 watchdog 관점을 반영했다.
4. auth denylist phase에 TTL alignment와 운영 이벤트 write 후보를 명시했다.
5. rollout/rollback 기준을 responsibility별로 더 선명하게 나눴다.

## Overview

Found brainstorm from 2026-03-10: `backend-architecture-stack-alignment-remaining-work`. Using as foundation for planning.

이번 계획은 Redis 도입을 실제 구현 가능한 실행 단위로 다시 정리한 것이다. 이미 완료된 `JPA + QueryDSL + SpringDoc/OpenAPI` 축과 분리해, 남아 있는 런타임 상태 저장 책임만 다룬다.

브레인스토밍에서 확정된 기준은 다음과 같다 (see brainstorm: `docs/brainstorms/2026-03-10-backend-architecture-stack-alignment-remaining-work-brainstorm.md`).

- 아키텍처 문서는 목표 상태 문서로 유지한다.
- 현재 구현과 목표 아키텍처의 갭은 실행계획과 후속 플랜에서 관리한다.
- Redis 도입 순서는 `QR token -> reservation lock -> auth denylist`로 유지한다.

이 계획은 기존 경계 문서인 `docs/plans/2026-03-09-feat-redis-runtime-adoption-boundary-plan.md`를 실행 가능한 형태로 구체화한 후속 plan이다.

## Problem Statement / Motivation

현재 코드베이스에서 Redis gap은 여전히 명확하다.

- QR one-time token은 메모리 구현(`backend/src/main/java/com/gymcrm/access/InMemoryQrTokenStore.java`)이다.
- 예약 동시성은 Redis lock coordinator 없이 서비스/DB semantics에 의존한다.
- 인증은 PostgreSQL `auth_refresh_tokens`가 canonical이며, access token 즉시 revoke용 denylist는 없다.

이 상태는 단일 인스턴스 또는 낮은 트래픽에선 감당 가능하지만, 목표 아키텍처와 운영 요구를 생각하면 다음 한계를 남긴다.

- 다중 인스턴스에서 QR token one-time consume semantics 보장이 약하다.
- 예약 동시 요청이 커지면 race/overbooking 보호 경계가 불분명하다.
- 강제 로그아웃, 권한 강등, 계정 비활성화 같은 운영 이벤트에 대한 즉시 revoke 수단이 부족하다.

반대로 Redis를 한 번에 전면 도입하면 cutover 축이 너무 많아진다. 따라서 이번 계획은 책임별로 경계를 자르고, canonical source와 outage behavior를 먼저 고정한 뒤 순차적으로 적용한다.

## Proposed Solution

Redis는 “새 저장소를 넣는다”가 아니라 “책임별 런타임 상태를 분리한다”는 관점으로 도입한다.

핵심 원칙:

- PostgreSQL business source는 유지한다.
- auth refresh token canonical은 계속 PostgreSQL `auth_refresh_tokens`다.
- Redis는 ephemeral runtime state부터 시작한다.
- 단계별로 기능 flag, rollback, outage behavior를 따로 둔다.
- 아키텍처 문서는 목표 상태 문서로 유지하고, 현재 도입 상태는 plan/runbook/notes로 관리한다 (see brainstorm: `docs/brainstorms/2026-03-10-backend-architecture-stack-alignment-remaining-work-brainstorm.md`).

## Research Summary

### Local repo findings

- QR token 경계는 이미 인터페이스로 분리돼 있다.
  - `backend/src/main/java/com/gymcrm/access/QrTokenStore.java`
  - `backend/src/main/java/com/gymcrm/access/InMemoryQrTokenStore.java`
  - `backend/src/main/java/com/gymcrm/access/QrCodeService.java`
- 인증 refresh token canonical은 PostgreSQL이다.
  - `backend/src/main/java/com/gymcrm/auth/AuthService.java`
  - `backend/src/main/java/com/gymcrm/auth/AuthRefreshTokenRepository.java`
- Redis boundary와 도입 순서는 기존 plan에 이미 정리돼 있다.
  - `docs/plans/2026-03-09-feat-redis-runtime-adoption-boundary-plan.md`
- JPA/OpenAPI 축은 이미 main에 반영되었고, Redis만 별도 후속 축으로 남았다.
  - `docs/plans/2026-03-09-refactor-backend-jpa-querydsl-openapi-alignment-plan.md`

### Institutional learnings

- 문서-코드 드리프트는 한 문서에서 모든 걸 해결하려 하지 말고, 실행 트랙별로 닫는 편이 안전하다.
  - `docs/solutions/documentation-gaps/prototype-plan-checklist-status-drift-gymcrm-20260227.md`
- DB/운영 리스크는 기능 구현과 분리하지 말고 같은 마일스톤에서 체크리스트로 닫아야 한다.
  - `docs/solutions/database-issues/member-summary-index-deployment-lock-mitigation-gymcrm-20260305.md`

### External research decision

Redis 도입은 인증/출입/동시성에 직접 영향을 주는 high-risk topic이라 외부 공식 문서 기준을 유지하는 것이 맞다. 다만 기존 boundary plan이 이미 Spring Boot, Spring Data Redis, Redisson 공식 문서 결론을 반영하고 있으므로 이번 문서에서는 그 결론을 재사용하고 새 웹 리서치는 생략한다.

핵심 반영 원칙:

- ephemeral key/value + TTL은 `StringRedisTemplate` 계열이 단순하고 검증 가능성이 높다.
- distributed lock은 직접 `SET NX PX`보다 Redisson `tryLock` 계열이 실패 semantics를 설명하기 쉽다.
- foundation 단계에서 health indicator, timeout, profile gating을 먼저 넣고 책임별 기능을 붙인다.

### Research Insights

**Best practices:**
- Spring Data Redis는 ephemeral token/denylist 같은 문자열 기반 TTL 저장에 `StringRedisTemplate`이 가장 단순하다.
- Redisson lock은 `leaseTime`을 직접 줄 수도 있고, `leaseTime` 없이 watchdog 기반 자동 연장을 사용할 수도 있으므로 둘 중 무엇을 쓸지 responsibility별로 고정해야 한다.
- Redis 도입 초기에는 cache abstraction보다 direct Redis operations가 TTL/atomicity semantics를 더 명확하게 드러낸다.

**Implementation details:**
- QR token/denylist는 `opsForValue().set(key, value, ttl, unit)` 계열로 구현하면 key별 TTL이 분명하다.
- Redisson은 `tryLock(waitTime, leaseTime, unit)` 패턴과 `remainTimeToLive()` 같은 introspection을 제공하므로 lock observability를 붙이기 쉽다.
- foundation 단계에서 `spring.data.redis` profile gating과 actuator health를 먼저 정리해야 later cutover가 단순해진다.

**Edge cases:**
- lock을 `leaseTime`과 함께 획득하면 watchdog이 개입하지 않으므로 business transaction이 lease보다 길어지지 않게 관리해야 한다.
- QR token old/new active token swap은 member별 active pointer와 token payload key가 분리되면 부분 실패 가능성이 생기므로 원자성 단위를 먼저 정해야 한다.
- denylist TTL이 access token 잔여 수명보다 길거나 짧으면 각각 메모리 낭비 또는 revoke leak이 생긴다.

## Technical Approach

### Architecture

Redis 책임을 다음 네 가지로 분리한다.

1. foundation/config/observability
2. QR token one-time consume store
3. reservation distributed lock coordinator
4. auth access denylist

canonical source는 다음처럼 유지한다.

| Responsibility | Canonical source | Redis role |
|---|---|---|
| QR token consume | Redis | ephemeral single-use token store |
| Reservation business state | PostgreSQL | lock coordinator only |
| Refresh token | PostgreSQL `auth_refresh_tokens` | no canonical change |
| Access revoke state | Redis | ephemeral denylist |

### System-Wide Impact

- **Interaction graph**
  - QR: `QrController -> QrCodeService -> QrTokenStore -> Redis`
  - Reservation: `ReservationController -> ReservationService -> ReservationLockService -> Redis -> DB`
  - Auth: `AuthController/logout or admin revoke -> DenylistService -> Redis`, `JwtAuthenticationFilter -> DenylistService -> Redis`
- **Error propagation**
  - QR는 기본 `fail-closed`
  - Reservation은 기본 `block or explicit degraded mode`
  - Auth denylist는 `degraded revoke guarantee`로 문서화
- **State lifecycle risks**
  - QR token issue/consume/reuse marker TTL drift
  - lock acquire 후 business failure 시 unlock/lease handling
  - auth revoke write 실패 시 즉시 무효화 보장 저하
- **API surface parity**
  - QR verify/gate path
  - reservation create/cancel path
  - logout/admin revoke/JWT filter path
- **Integration test scenarios**
  - QR issue/consume/reuse/expiry parity
  - concurrent reservation double-submit race
  - denylisted access token rejection
  - Redis outage 시 책임별 expected failure mode

## Implementation Phases

### Phase 1: Redis Foundation

- Deliverables:
  - Redis dependencies/config/profile gating
  - feature flags per responsibility
  - health, timeout, log baseline
  - local/staging run notes
- Success criteria:
  - 앱이 Redis 연결 여부를 명확히 감지하고, 기능별 enable/disable을 구분한다.
- Quality gates:
  - startup/runtime behavior documented
  - dev/staging connection verified

Phase 1 checklist:
- [x] `backend/build.gradle`에 Spring Data Redis 및 Redisson 의존성을 추가한다.
- [x] `application.yml`에 Redis 연결, timeout, profile별 enable/disable 설정을 추가한다.
- [x] 책임별 feature flag(`qr-token-store`, `reservation-lock`, `auth-denylist`)를 정의한다.
- [x] Redis health indicator, timeout, logging 정책과 로컬 실행 문서를 갱신한다.

Phase 1 research insights:
- `spring.data.redis` 연결 설정과 actuator health visibility를 foundation 단계에서 먼저 추가하는 것이 후속 책임 분리에 유리하다.
- feature flag는 단일 `redis.enabled`보다 `app.redis.qr-token-store.enabled`, `app.redis.reservation-lock.enabled`, `app.redis.auth-denylist.enabled`처럼 responsibility별로 나누는 편이 rollback이 쉽다.
- connection timeout과 command timeout을 분리해 두고, 로그에는 responsibility 이름과 exception class를 같이 남겨야 운영에서 원인 분리가 쉽다.
- local/staging 문서에는 “Redis down일 때 startup 허용 여부”와 “runtime degrade 정책”을 분리해서 적는 것이 좋다.

Phase 1 execution notes (2026-03-10):
- `backend/build.gradle`에 `spring-boot-starter-data-redis`, `org.redisson:redisson`을 추가했다.
- `application.yml`에 `spring.data.redis.*`, `management.health.redis.enabled`, `app.redis.*` feature flag를 추가했다.
- `compose.yaml`에 `redis` 서비스를 추가했고, `README.md`, `docs/notes/local-run-phase1.md`를 Redis foundation 기준으로 갱신했다.
- `HealthController` payload에 Redis feature flag 상태를 노출해 앱 레벨에서 foundation enable/disable을 확인할 수 있게 했다.
- 검증:
  - `./gradlew test --tests com.gymcrm.health.HealthControllerRedisStatusTest --tests com.gymcrm.health.Phase1SampleControllerWebMvcTest --tests com.gymcrm.auth.ActuatorSecurityIntegrationTest --tests com.gymcrm.common.config.OpenApiExposureIntegrationTest`
  - `./gradlew test`

### Phase 2: QR Token Store Redis Migration

- Deliverables:
  - Redis 기반 `QrTokenStore`
  - issue/consume/reuse marker TTL 정책 이식
  - gate verify outage policy 문서
- Success criteria:
  - 다중 인스턴스에서도 one-time consume semantics가 유지된다.
- Quality gates:
  - parity tests pass
  - reuse/expiry/invalid/outage scenarios pass

Phase 2 checklist:
- [x] `InMemoryQrTokenStore`와 동일 의미를 가진 Redis 구현체를 추가한다.
- [x] member active token replacement 정책과 reuse marker grace window를 TTL로 재현한다.
- [x] `QrCodeService`가 feature flag로 메모리/Redis 구현을 선택할 수 있게 한다.
- [x] Redis 장애 시 gate verify path의 기본 정책을 `fail-closed`로 고정하고 예외 운영 기준을 문서화한다.

Phase 2 research insights:
- QR token key space는 최소한 세 가지로 나누는 편이 명확하다.
  - `qr:token:{token}` -> token payload + expiresAt
  - `qr:member-active:{centerId}:{memberId}` -> latest token
  - `qr:reused:{token}` -> reuse marker
- `reused` marker TTL은 현재 메모리 구현의 grace window와 같게 두고, token payload TTL은 QR 만료 시각과 정렬해야 한다.
- member active token 교체는 old token 제거와 new active pointer set이 논리적으로 하나의 unit처럼 보여야 하므로, Redis transaction/script 필요성을 초기에 평가해야 한다.
- outage policy는 gate path 보안 특성상 기본 `fail-closed`가 맞고, fail-safe는 센터별 명시 정책이 없는 한 기본값으로 두지 않는다.

Phase 2 execution notes (2026-03-10):
- `RedisQrTokenStore`를 추가해 `qr:token:{token}`, `qr:member-active:{centerId}:{memberId}`, `qr:reused:{token}` key space를 구현했다.
- valid consume는 Redis Lua script로 처리해 token delete + member active pointer clear + reused marker set을 한 번에 수행한다.
- `QrTokenStoreConfig`를 추가해 `app.redis.enabled=true`, `app.redis.qr-token-store.enabled=true`일 때 Redis 구현을 선택하고, 그 외에는 메모리 구현으로 fallback 하도록 정리했다.
- `QrCodeService`는 `QrTokenStoreUnavailableException`을 `A104 / QR_STORE_UNAVAILABLE`로 변환해 verify path를 `fail-closed`로 처리한다.
- 검증:
  - `./gradlew test --tests com.gymcrm.access.QrCodeServiceTest --tests com.gymcrm.access.QrTokenStoreConfigTest --tests com.gymcrm.access.RedisQrTokenStoreIntegrationTest --tests com.gymcrm.access.AccessQrApiIntegrationTest`
  - `./gradlew test`

### Phase 3: Reservation Lock Adoption

- Deliverables:
  - `ReservationLockService`
  - lock key scheme
  - timeout/retry/unlock policy
  - concurrent reservation tests
- Success criteria:
  - 동시 예약에서 race/overbooking risk가 명시적으로 줄어든다.
- Quality gates:
  - race test pass
  - unlock/timeout behavior verified

Phase 3 checklist:
- [ ] lock 대상 API/service path를 확정한다.
- [ ] lock key granularity를 `center + schedule` 기준으로 시작할지 결정한다.
- [ ] `tryLock(waitTime, leaseTime)` 정책을 business timeout과 정렬한다.
- [ ] Redis 장애 시 예약 생성/변경 요청의 block 또는 degraded mode 정책을 문서화한다.

Phase 3 research insights:
- Redisson `tryLock(waitTime, leaseTime, unit)`을 기본 패턴으로 두되, lock hold 시간이 짧고 예측 가능하면 explicit `leaseTime`이, hold 시간이 불확실하면 watchdog 기반 `lock()`이 더 적합하다.
- 이 시스템에서는 예약 write path가 request/transaction 경계 안에서 짧게 끝나는 편이므로, 1차 구현은 explicit `leaseTime` 기반이 운영 설명에 더 유리하다.
- lock key는 너무 넓으면 throughput이 떨어지고 너무 좁으면 race를 막지 못하므로 1차 기준은 `reservation:{centerId}:{scheduleId}`가 가장 현실적이다.
- unlock은 항상 `finally` 블록에서 `isHeldByCurrentThread()` 확인 후 수행하는 규칙을 plan에 고정하는 것이 좋다.

### Phase 4: Auth Denylist Extension

- Deliverables:
  - denylist store/service
  - logout/admin revoke integration
  - JWT filter denylist check
  - TTL policy
- Success criteria:
  - access token 즉시 revoke 시나리오를 Redis로 처리할 수 있다.
- Quality gates:
  - denylisted token rejection test pass
  - refresh token canonical unchanged

Phase 4 checklist:
- [ ] refresh token canonical은 PostgreSQL에 유지한다.
- [ ] Redis는 access denylist 전용 책임으로 시작한다.
- [ ] logout/forced revoke path와 JWT filter denylist check를 연결한다.
- [ ] Redis 장애 시 즉시 revoke guarantee가 어떻게 degrade되는지 문서화한다.

Phase 4 research insights:
- denylist key는 raw token 저장보다 `jti` 또는 token hash 기반 key가 더 안전하다.
- TTL은 access token 전체 수명이 아니라 “현재 시점 기준 남은 수명”과 정렬해야 한다.
- denylist write 후보는 `logout`뿐 아니라 `forced revoke`, `role downgrade`, `user deactivation`까지 같이 분류해 두는 편이 이후 확장에 유리하다.
- Redis unavailable 시에는 refresh token canonical은 유지되지만 access token 즉시 revoke 보장은 약해진다는 점을 운영/보안 언어로 분리해서 적어야 한다.

### Phase 5: Rollout, Rollback, and Closure

- Deliverables:
  - enablement matrix
  - rollout order and rollback criteria
  - validation queries/commands
  - deferred responsibilities table
- Success criteria:
  - 도입 상태와 deferred 상태가 실행 문서 기준으로 분명하다.
- Quality gates:
  - same-milestone docs/tests/validation synced

Phase 5 checklist:
- [ ] responsibility별 `enabled / deferred / canonical source` 상태표를 남긴다.
- [ ] rollout 순서(`QR -> reservation -> auth denylist`)와 rollback trigger를 정의한다.
- [ ] validation window/owner/healthy signal/failure signal을 문서화한다.
- [ ] umbrella architecture alignment plan과 Redis boundary plan의 상태를 후속 정리한다.

Phase 5 research insights:
- rollout은 responsibility별로 독립 배포가 가능해야 하므로, 각 단계의 feature flag off 상태가 rollback 기본값이어야 한다.
- validation 항목은 로그/메트릭/기능 smoke를 함께 써야 한다. Redis 도입은 “연결됨”만으로는 검증이 부족하다.
- umbrella plan은 역사 문서로 남기고, 이 문서를 실제 execution source로 승격하는 편이 이후 follow-up 관리가 쉽다.

## Alternative Approaches Considered

### Option A: QR, Reservation, Auth를 한 번에 Redis로 전환

장점:
- 문서와 구현을 가장 빨리 맞춘다.

단점:
- cutover 축이 많다.
- 장애 원인 분리가 어렵다.
- rollback 경계가 흐려진다.

배제 이유:
- 현재 코드베이스와 운영 상태에서 너무 공격적이다.

### Option B: 문서는 목표 상태로 두고 Redis는 나중으로 미룬다

장점:
- 당장 작업량이 적다.

단점:
- 목표 아키텍처와 구현 gap이 계속 남는다.
- QR/예약/auth runtime state 개선이 지연된다.

배제 이유:
- 브레인스토밍에서 Redis가 최우선 미완료 축으로 정리됐다 (see brainstorm: `docs/brainstorms/2026-03-10-backend-architecture-stack-alignment-remaining-work-brainstorm.md`).

### Option C: 책임별 순차 도입

추천안.

장점:
- 장애/rollback 경계가 분명하다.
- QR, reservation, auth를 각각 다른 failure policy로 다룰 수 있다.
- 이미 확정된 도입 순서와 잘 맞는다.

단점:
- 문서와 실행 트랙이 여러 개로 나뉜다.

## Acceptance Criteria

### Functional Requirements

- [ ] Redis foundation이 애플리케이션 설정과 observability에 도입된다.
- [ ] QR token one-time consume이 Redis 구현으로 이전된다.
- [ ] reservation distributed lock이 Redis 기반으로 도입된다.
- [ ] auth denylist가 refresh token canonical을 바꾸지 않고 추가된다.

### Non-Functional Requirements

- [ ] Redis 장애 시 책임별 failure mode가 문서와 테스트로 고정된다.
- [ ] PostgreSQL canonical business/auth source는 유지된다.
- [ ] rollout/rollback 기준이 운영자가 실행 가능한 수준으로 정리된다.

### Quality Gates

- [ ] QR, reservation, auth denylist 각각에 대해 integration 또는 outage test가 있다.
- [ ] feature flag로 책임별 enable/disable이 가능하다.
- [ ] validation note, runbook, deferred state table이 같은 마일스톤에 정리된다.

## Success Metrics

- 다중 인스턴스 환경에서 QR one-time consume semantics 보장
- reservation race/overbooking 재현 시나리오 감소
- logout/admin revoke 이후 denylisted access token 차단 가능
- Redis 사용처와 미도입 책임이 실행 문서상 명확

## Dependencies & Risks

Dependencies:
- Redis local/staging runtime 준비
- Spring Data Redis / Redisson dependency and config
- feature flag naming and operational agreement
- QR/reservation/auth integration test fixtures

Risks:
- QR token TTL drift 또는 reuse marker semantics mismatch
- lock key granularity 설정 오류로 throughput 저하 또는 race leak
- denylist 장애 시 보안 보장 수준 오해
- plan이 다시 umbrella 문서처럼 비대해질 위험

Mitigations:
- responsibility별 rollout과 rollback 분리
- foundation 먼저, 기능은 순차 도입
- refresh token canonical 유지
- plan/notes/runbook을 함께 갱신

## Sources & References

### Origin
- **Brainstorm document:** [docs/brainstorms/2026-03-10-backend-architecture-stack-alignment-remaining-work-brainstorm.md](/Users/abc/projects/GymCRM_V2/docs/brainstorms/2026-03-10-backend-architecture-stack-alignment-remaining-work-brainstorm.md)
  - carried-forward decisions:
  - architecture doc stays aspirational
  - Redis is the highest-priority remaining implementation track
  - rollout order stays `QR token -> reservation lock -> auth denylist`

### Internal References
- Existing Redis boundary plan: [2026-03-09-feat-redis-runtime-adoption-boundary-plan.md](/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-09-feat-redis-runtime-adoption-boundary-plan.md)
- Umbrella alignment plan: [2026-03-09-refactor-backend-architecture-stack-alignment-plan.md](/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-09-refactor-backend-architecture-stack-alignment-plan.md)
- QR store interface: [QrTokenStore.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/access/QrTokenStore.java)
- Current QR memory store: [InMemoryQrTokenStore.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/access/InMemoryQrTokenStore.java)
- QR service path: [QrCodeService.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/access/QrCodeService.java)
- Auth canonical source path: [AuthService.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/auth/AuthService.java)
- Auth refresh repository: [AuthRefreshTokenRepository.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/auth/AuthRefreshTokenRepository.java)

### Related Work
- Documentation drift learning: [prototype-plan-checklist-status-drift-gymcrm-20260227.md](/Users/abc/projects/GymCRM_V2/docs/solutions/documentation-gaps/prototype-plan-checklist-status-drift-gymcrm-20260227.md)
- Deployment lock mitigation learning: [member-summary-index-deployment-lock-mitigation-gymcrm-20260305.md](/Users/abc/projects/GymCRM_V2/docs/solutions/database-issues/member-summary-index-deployment-lock-mitigation-gymcrm-20260305.md)

### External References
- Spring Data Redis docs: `/spring-projects/spring-data-redis`
- Redisson docs: `/redisson/redisson`
