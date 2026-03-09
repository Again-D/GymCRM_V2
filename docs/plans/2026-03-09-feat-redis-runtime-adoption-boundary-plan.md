---
title: feat: Redis Runtime Adoption Boundary
type: feat
status: active
date: 2026-03-09
---

# feat: Redis Runtime Adoption Boundary

## Enhancement Summary

**Deepened on:** 2026-03-09
**Sections enhanced:** 5
**Research sources used:** Spring Boot 3.4.1 docs, Spring Data Redis docs, Redisson docs, existing project plans

### Key Improvements
1. Redis foundation phase에 health indicator, timeout, profile gating 기준을 추가했다.
2. QR token 저장은 단순 key/value + TTL 중심으로, reservation lock은 Redisson 계열 lock coordinator 중심으로 역할을 분리했다.
3. denylist TTL, lock leaseTime, watchdog 등 운영 파라미터를 plan에 더 구체적으로 반영했다.
4. 책임별 outage behavior를 fail-closed / block / degraded guarantee 관점으로 더 선명히 적었다.
5. Redis client 선택을 “하나로 통일”이 아니라 책임별 도구 선택으로 정리했다.

## Overview

이 계획은 Redis를 `JPA/QueryDSL + OpenAPI` 정렬 플랜과 분리된 후속 단계로 도입하기 위한 실행 계획이다.

핵심 목적은 아키텍처 문서가 기대하는 Redis 사용처를 한 번에 다 구현하는 것이 아니라, 현재 운영 중인 canonical 상태 저장소를 깨지 않으면서 Redis를 책임별로 점진 도입하는 것이다. 우선순위는 기존 실행계획 문서의 정렬을 유지한다.

1. QR one-time token 소비 저장소
2. 예약 분산 락
3. Auth access denylist 또는 후속 인증 상태 확장

## Problem Statement / Motivation

현재 프로젝트는 Redis 의존성과 런타임 저장소를 도입하지 않은 상태다.

- QR token은 메모리 구현(`InMemoryQrTokenStore`)이다.
- 인증 refresh token은 PostgreSQL `auth_refresh_tokens`가 canonical이다.
- 예약 동시성 제어는 Redis 락 기준으로 정리되어 있지 않다.

이 상태는 현재 단계에서는 합리적이지만, 다음과 같은 운영 한계를 남긴다.

- 다중 인스턴스 환경에서 QR one-time consume semantics를 메모리 구현만으로 보장하기 어렵다.
- 예약 트래픽이 커지면 동시 요청 제어가 취약해질 수 있다.
- access token 즉시 revoke/denylist가 필요해지면 PostgreSQL refresh rotation만으로는 한계가 있다.

반대로 Redis를 저장소 기술 전환과 함께 한 번에 넣으면 cutover 축이 늘어나 리스크가 커진다. 따라서 Redis는 별도 플랜으로 분리하고, 책임별 canonical source와 failure policy를 먼저 고정해야 한다.

## Proposed Solution

Redis 도입은 “인프라 추가”가 아니라 “상태 저장 책임의 단계적 이전”으로 다룬다.

핵심 원칙:

- Redis는 처음부터 canonical source가 아니라 보조 저장소 또는 특정 책임 전용 저장소로 시작한다.
- 인증 refresh token canonical은 당분간 PostgreSQL을 유지한다.
- 각 책임마다 cutover 방식과 outage fallback을 별도로 정의한다.
- QR, 예약 락, auth denylist는 같은 릴리즈 단위로 묶지 않는다.

## Research Summary

### Local repo findings

- Redis 도입 경계는 이미 기존 실행계획 문서에서 정리돼 있다.
  - `docs/plans/2026-03-04-feat-post-phase11-requirements-architecture-execution-plan.md`
- QR token 인터페이스는 이미 분리돼 있다.
  - `backend/src/main/java/com/gymcrm/access/QrTokenStore.java`
- 현재 구현은 메모리 저장소다.
  - `backend/src/main/java/com/gymcrm/access/InMemoryQrTokenStore.java`
- 인증 refresh token canonical은 PostgreSQL이다.
  - `backend/src/main/java/com/gymcrm/auth/AuthService.java`
  - `backend/src/main/java/com/gymcrm/auth/AuthRefreshTokenRepository.java`

### Existing architectural decisions

- Post-Phase11 계획은 Redis를 현재 기본값이 아닌 후속 단계 trigger로 정의했다.
- Phase 5 JWT 계획은 refresh rotation / logout / replay detection을 PostgreSQL 트랜잭션 기준으로 설계했다.

### External research decision

이번 문서는 내부 상태 책임 분리와 cutover 계획이 핵심이지만, Spring Boot / Spring Data Redis / Redisson 공식 문서를 기준으로 다음 구현 원칙을 보강한다.

- Spring Boot는 Redis health indicator와 profile-specific config를 기본 패턴으로 제공하므로, 도입 초기부터 `dev/staging/prod`별 enable/disable과 health visibility를 분리하는 것이 안전하다.
- ephemeral token 저장은 `StringRedisTemplate` + TTL 기반 key/value 패턴이 단순하고 검증 가능성이 높다.
- distributed lock은 단순 key TTL 직접 구현보다 Redisson의 `RLock`, `tryLock`, watchdog/leaseTime 규칙을 쓰는 편이 실패 semantics를 덜 직접 구현하게 된다.

## Technical Approach

### Architecture

- Redis는 `runtime state service`로 취급한다.
- PostgreSQL은 비즈니스 canonical DB 역할을 유지한다.
- auth refresh token은 PostgreSQL 유지, Redis는 denylist 또는 ephemeral auth state부터 시작한다.
- QR one-time consume은 Redis 단독 책임으로 승격 가능하다.
- reservation lock은 Redis를 canonical “lock coordinator”로 사용하되, DB 상태를 canonical business source로 유지한다.

### Research Insights

**Best practices:**
- Redis foundation은 먼저 `health + timeout + profile gating`을 넣고, 그 다음 책임별 기능을 붙이는 순서가 안전하다.
- QR token과 denylist는 TTL이 본질인 데이터라서 `StringRedisTemplate` 중심 구현이 운영 설명과 테스트에 유리하다.
- reservation lock은 key/value 수동 구현보다 lock abstraction을 쓰는 편이 unlock/lease/watchdog semantics를 명확하게 유지하기 쉽다.

**Implementation details:**
- QR token/reuse marker는 key 단위 TTL을 각각 다르게 줄 수 있어야 하므로 cache abstraction보다 direct Redis ops가 적합하다.
- denylist TTL은 access token 만료 시간과 정확히 정렬되어야 한다. 그보다 짧으면 revoke leak, 길면 메모리 낭비가 생긴다.
- lock leaseTime은 business transaction timeout보다 짧으면 안 되고, indefinite lock은 watchdog 없이는 위험하다.

**Edge cases:**
- Redis health는 살아 있어도 high latency 상태일 수 있으므로 `UP/DOWN`만이 아니라 timeout/latency alert도 필요하다.
- single-node safe mode는 “운영자가 인지한 상태에서만 허용되는 degraded mode”인지, “자동 fallback”인지 구분해야 한다.

### Canonical Source Rules

| Responsibility | Current Canonical | Redis Introduction Mode | Final Rule |
|---|---|---|---|
| QR token consume | In-memory store | Replace with Redis single store | Redis canonical for ephemeral QR consume |
| Reservation lock | None/DB workflow semantics | Add Redis lock coordinator | Redis lock only, DB remains business source |
| Refresh token | PostgreSQL `auth_refresh_tokens` | Keep PostgreSQL | PostgreSQL remains canonical |
| Access denylist | None | Add Redis denylist if required | Redis ephemeral denylist |

### Failure Policy Rules

- QR token Redis unavailable:
  - default: fail closed for gate verify path
  - fallback only if explicit fail-safe policy exists per center
- Reservation lock Redis unavailable:
  - default: block create/modify path or degrade to single-node safe mode
- Auth denylist Redis unavailable:
  - default: continue with current PostgreSQL refresh policy and log degraded revoke guarantees

### Implementation Phases

#### Phase 1: Redis Foundation and Operational Guardrails

- Deliverables:
  - Redis dependency/runtime config
  - local/staging Redis provisioning
  - health check, timeout, metrics, alert baseline
  - profile별 enable/disable feature flags
- Success criteria:
  - 애플리케이션이 Redis 연결 실패를 명시적으로 감지하고 degrade/fail 정책을 따른다.
- Quality gates:
  - Redis unavailable startup/runtime behavior documented
  - dev/staging connection validation completed

Phase 1 checklist:
- [ ] `backend/build.gradle`에 Redis client 의존성을 추가한다.
- [ ] `application.yml`에 Redis 연결/timeout/profile 설정을 추가한다.
- [ ] Redis health indicator와 핵심 timeout/logging 정책을 문서화한다.
- [ ] local/staging 실행 문서를 갱신한다.

Phase 1 research insights:
- Spring Boot Actuator는 `RedisHealthIndicator`를 제공하므로, foundation 단계에서 health visibility를 먼저 붙이는 것이 자연스럽다.
- 연결 설정은 `spring.data.redis.url` 또는 host/port보다 profile별 문서 분리와 secret 주입 방식까지 같이 고정해야 한다.
- foundation 단계에서 이미 `management.health.redis.enabled`, timeout, connect/read timeout, connection pool 관찰 지표를 문서화해 두는 편이 후속 단계 비용이 낮다.
- 이 단계에서 feature flag를 책임별(`qr-token-store.enabled`, `reservation-lock.enabled`, `auth-denylist.enabled`)로 분리하는 것이 좋다.

#### Phase 2: QR Token Store Migration

- Deliverables:
  - Redis 기반 `QrTokenStore` 구현
  - token issue/consume/reuse marker TTL 정책 이식
  - gate verify 장애 시 응답 정책 문서화
- Success criteria:
  - 다중 인스턴스에서도 one-time consume / reuse detection semantics가 유지된다.
- Quality gates:
  - issue/consume parity test
  - expired/reused/invalid 시나리오 통과
  - Redis outage 시 expected failure behavior 검증

Phase 2 checklist:
- [ ] `InMemoryQrTokenStore`와 동일한 의미론을 Redis 구현으로 옮긴다.
- [ ] member별 active token 교체 정책을 유지한다.
- [ ] reused marker grace window를 TTL로 재현한다.
- [ ] gate verify path에서 Redis 장애 시 fail-closed/fail-safe 정책을 확정한다.

Phase 2 research insights:
- QR token 저장은 Redis hash보다 key/value + explicit TTL이 단순하다.
- `active token`과 `reused marker`는 TTL이 다르므로 서로 다른 key space를 쓰는 편이 명확하다.
- member별 active token 교체는 old token cleanup과 new token set이 논리적으로 한 operation unit처럼 보여야 하므로, 필요 시 Lua/script 또는 transaction 수준 원자성을 검토해야 한다.
- QR path는 보안/출입 정책 특성상 기본 fail-closed가 맞지만, 센터별 fail-safe 운영 정책이 있다면 문서상 예외로 분리해야 한다.

#### Phase 3: Reservation Distributed Lock

- Deliverables:
  - reservation lock service
  - lock key 규칙(center/schedule/member 범위) 확정
  - lock timeout / retry / unlock 보장 정책
- Success criteria:
  - 동시 예약 요청에서 overbooking/race risk가 감소한다.
- Quality gates:
  - concurrent reservation test
  - lock release failure handling test
  - duplicate submit/drift 시나리오 검증

Phase 3 checklist:
- [ ] 어떤 API/service path가 lock 대상인지 확정한다.
- [ ] lock key granularity를 정한다.
- [ ] lock TTL과 business transaction timeout을 정렬한다.
- [ ] Redis 장애 시 예약 생성/변경 요청의 차단 또는 degrade 정책을 정한다.

Phase 3 research insights:
- reservation lock은 수동 `SET NX PX` 구현보다 Redisson `tryLock(waitTime, leaseTime)` 패턴이 구현 복잡도를 줄여준다.
- `leaseTime`을 직접 줄 경우 비즈니스 처리 시간보다 충분히 길어야 하고, 자동 연장을 원하면 watchdog 정책을 명시해야 한다.
- lock key는 너무 넓으면 throughput이 떨어지고, 너무 좁으면 race를 막지 못하므로 `center + schedule` 또는 `center + resource + slot` 수준으로 먼저 고정하는 것이 현실적이다.
- unlock 실패/중복 unlock은 예외 처리와 observability가 중요하므로, 예약 결과보다 먼저 운영 로그/metric 설계를 붙이는 것이 좋다.

#### Phase 4: Auth Denylist Extension

- Deliverables:
  - access token denylist 저장소
  - logout / forced revoke 시 denylist write path
  - denylist TTL 정책
- Success criteria:
  - access token 즉시 revoke 요구가 생길 경우 Redis로 대응 가능하다.
- Quality gates:
  - logout/revoked token rejection test
  - Redis outage 시 existing refresh rotation guarantees 유지

Phase 4 checklist:
- [ ] refresh token canonical은 PostgreSQL에 유지한다.
- [ ] Redis는 access denylist 전용 책임으로 시작한다.
- [ ] logout/forced revoke path와 JWT filter denylist check를 연결한다.
- [ ] Redis 장애 시 보안 보장 수준이 어떻게 degrade되는지 문서화한다.

Phase 4 research insights:
- denylist는 token hash 또는 jti 기반 key 저장이 적합하며, TTL은 access token 잔여 수명과 정렬해야 한다.
- refresh token canonical을 Redis로 옮기지 않는 한, denylist는 “즉시 revoke 강화”이지 “auth source migration”이 아니라는 점을 문서에 유지해야 한다.
- logout path뿐 아니라 admin forced revoke, role downgrade, user deactivation 같은 운영 이벤트도 denylist write 후보로 분류하는 것이 좋다.
- Redis unavailable 시 “완전 즉시 revoke 보장 불가”가 어떤 보안 등급 저하인지 운영자/보안팀 언어로 표현해야 한다.

#### Phase 5: Documentation and Rollback Closure

- Deliverables:
  - architecture doc Redis section sync
  - 운영 runbook, rollback rule, validation queries
  - responsibility별 “enabled / deferred” 상태표
- Success criteria:
  - Redis 사용처와 보류 범위가 문서에 명확히 남는다.
- Quality gates:
  - same-PR 문서/체크리스트/검증 로그 동기화

Phase 5 checklist:
- [ ] `docs/02_시스템_아키텍처_설계서.md`의 Redis 사용처를 실제 도입 상태와 맞춘다.
- [ ] responsibility별 canonical source를 문서에 남긴다.
- [ ] rollback trigger와 owner를 정의한다.
- [ ] Redis 미도입 책임은 deferred로 표시한다.

## System-Wide Impact

### Interaction graph

- QR: `QrController -> QrCodeService -> QrTokenStore -> Redis`
- Reservation: `ReservationController -> ReservationService -> LockService -> Redis -> DB`
- Auth denylist: `SecurityConfig/JwtAuthenticationFilter -> DenylistService -> Redis`

### Error & Failure Propagation

- Redis timeout은 각 책임별로 다른 사용자 영향도를 가진다.
- QR은 gate verify 실패로 바로 사용자 경험에 드러난다.
- Reservation lock은 false negative/false positive 모두 business impact가 있다.
- Auth denylist는 outage 시 즉시 revoke 보장 약화로 이어질 수 있다.

### State Lifecycle Risks

- mixed mode에서 Redis와 PostgreSQL 의미론이 어긋나면 replay/reuse/race 정책이 깨질 수 있다.
- lock TTL이 business transaction보다 짧으면 duplicate commit 가능성이 생긴다.
- denylist TTL이 access token lifetime과 어긋나면 revoke leak가 생긴다.

### Integration Test Scenarios

- QR issue -> consume -> reuse -> expiry 흐름이 Redis 구현에서도 동일한지 검증
- concurrent reservation create/cancel path에서 lock이 기대대로 직렬화되는지 검증
- logout/forced revoke 후 denylist hit로 보호 API가 차단되는지 검증
- Redis unavailable 시 각 책임별 degraded behavior가 문서와 동일한지 검증

## Acceptance Criteria

- [ ] Redis 도입 책임이 `QR / reservation lock / auth denylist`로 분리된다.
- [ ] 각 책임별 canonical source와 fallback policy가 문서화된다.
- [ ] auth refresh token canonical은 PostgreSQL 유지가 명시된다.
- [ ] Redis outage behavior와 rollback policy가 정의된다.
- [ ] 단계별 검증 로그와 운영 runbook이 같은 마일스톤에서 정리된다.

## Success Metrics

- QR one-time consume 재사용 누락 0건
- reservation concurrency 관련 race/overbooking 재현률 감소
- auth revoke/denylist 시나리오 검증 통과
- Redis 도입 후에도 운영 fallback 기준이 명확함

## Dependencies & Risks

Dependencies:

- Redis local/staging provisioning
- timeout/health/metrics 표준화
- QR/reservation/auth 각 책임 owner 합의

Risks:

- Redis outage handling 미정의
- canonical source ambiguity
- lock TTL misconfiguration
- auth denylist 과신으로 보안 보장 과대평가

Mitigation:

- 책임별 단계 분리
- PostgreSQL canonical 유지 범위 명시
- outage drill / rollback runbook 선행
- same-phase validation logs required

## Client Strategy

### Recommended client split

- QR token / denylist:
  - `StringRedisTemplate` 또는 Spring Data Redis operations
  - 이유: key/value + TTL 중심, 명시적 만료가 중요
- Reservation lock:
  - `Redisson`
  - 이유: `RLock`, `tryLock`, leaseTime, watchdog semantics를 직접 재구현하지 않아도 됨

### Anti-patterns to avoid

- 모든 Redis 책임을 하나의 추상화/클라이언트로 강제 통일
- reservation lock을 plain TTL key만으로 구현하고 unlock semantics를 수동 관리
- denylist TTL을 access token lifetime과 분리
- outage 시 자동 fallback을 넣어 놓고 운영 문서에는 정상 동작처럼 적는 것

## Sources & References

- `docs/plans/2026-03-04-feat-post-phase11-requirements-architecture-execution-plan.md`
- `docs/plans/2026-02-24-feat-phase5-jwt-rbac-operational-basics-plan.md`
- `backend/src/main/java/com/gymcrm/access/QrTokenStore.java`
- `backend/src/main/java/com/gymcrm/access/InMemoryQrTokenStore.java`
- `backend/src/main/java/com/gymcrm/auth/AuthService.java`
- `backend/src/main/java/com/gymcrm/auth/AuthRefreshTokenRepository.java`
- `todos/073-pending-p2-redis-expands-plan-into-multi-axis-cutover.md`
- `todos/074-pending-p2-redis-addition-needs-explicit-state-migration-and-failure-policy.md`

### External References

- Spring Boot 3.4.1 Actuator docs: `RedisHealthIndicator`
- Spring Boot 3.4.1 Redis config docs: `spring.data.redis.*`
- Spring Data Redis docs: TTL / expiration / `StringRedisTemplate`
- Redisson docs: `RLock`, `tryLock`, `leaseTime`, watchdog timeout
