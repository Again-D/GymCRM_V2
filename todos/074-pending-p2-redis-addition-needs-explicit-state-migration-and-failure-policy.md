---
status: pending
priority: p2
issue_id: "074"
tags: [code-review, architecture, backend, redis, auth, reliability]
dependencies: []
---

# Redis addition needs explicit state migration and failure policy

## Problem Statement

Redis를 이 플랜에 다시 포함하려면 단순 의존성 추가로 끝나지 않는다. 특히 인증, QR token, 예약 락은 모두 "상태 저장 위치가 어디인가"를 다시 정의해야 한다. 현재 플랜은 PostgreSQL canonical과 메모리 구현을 전제로 짜여 있으므로, Redis를 넣는 순간 dual-write/read, fallback, 장애 시 동작, 운영 검증 기준이 함께 설계돼야 한다.

이 기준이 없이 Redis를 같이 넣으면 동작은 붙어도 운영 신뢰성은 오히려 떨어질 수 있다.

## Findings

- 현재 인증은 PostgreSQL `auth_refresh_tokens`를 canonical로 사용한다.
  - `backend/src/main/java/com/gymcrm/auth/AuthRefreshTokenRepository.java`
- 현재 QR token 저장은 Redis가 아니라 `InMemoryQrTokenStore`다.
  - `backend/src/main/java/com/gymcrm/access/InMemoryQrTokenStore.java`
- Phase 5 JWT 계획은 refresh token rotation, replay, logout race를 PostgreSQL 트랜잭션 기준으로 정리해 두었다.
  - `docs/plans/2026-02-24-feat-phase5-jwt-rbac-operational-basics-plan.md`
- Post-Phase11 계획은 Redis 도입 trigger를 QR one-time token, reservation lock, auth denylist 순으로 분리해 두었다.
  - `docs/plans/2026-03-04-feat-post-phase11-requirements-architecture-execution-plan.md`
- 즉, Redis 도입은 기술 선택이 아니라 상태 마이그레이션 설계 문제다.

## Proposed Solutions

### Option 1: Defer Redis until a dedicated state migration plan exists

**Approach:** Redis는 별도 플랜에서 `QR -> reservation lock -> auth` 순으로 각 책임별 cutover 전략을 정의한 후 도입한다.

**Pros:**
- 책임별 failure mode를 따로 검증할 수 있다.
- canonical source와 fallback 정책을 분명히 유지할 수 있다.

**Cons:**
- 구현 완료까지 시간이 더 필요하다.

**Effort:** Medium

**Risk:** Low

---

### Option 2: Add Redis now, but only for one isolated responsibility

**Approach:** 인증은 그대로 두고, 예를 들어 QR one-time token 소비 저장소처럼 가장 격리된 책임 하나에만 먼저 Redis를 도입한다.

**Pros:**
- 운영 리스크를 제한하면서 Redis 도입 경험을 얻을 수 있다.
- infra/monitoring/runbook을 작은 범위에서 먼저 검증할 수 있다.

**Cons:**
- 아키텍처 문서의 "Redis everywhere"와는 여전히 차이가 남는다.

**Effort:** Medium

**Risk:** Medium

---

### Option 3: Move auth/QR/reservation state to Redis in one pass

**Approach:** refresh token, QR token, reservation lock까지 같은 계획에서 한 번에 Redis로 옮긴다.

**Pros:**
- 문서상 Redis usage를 빠르게 맞출 수 있다.

**Cons:**
- dual-write drift, fallback ambiguity, Redis outage handling, rollback complexity가 한 번에 생긴다.
- auth replay/logout race와 QR reuse 정책을 동시에 다시 검증해야 한다.

**Effort:** Large

**Risk:** High

## Recommended Action


## Technical Details

**Affected components:**
- `AuthService` / `AuthRefreshTokenRepository`
- `QrTokenStore` / `InMemoryQrTokenStore`
- reservation concurrency path (future lock service)
- 운영 runbook / alerting / dev infra

**Failure paths to define if Redis is added:**
- Redis unavailable on login/refresh/logout
- Redis unavailable on QR issue/consume
- stale Redis state vs PostgreSQL canonical state
- logout/refresh replay race with mixed stores

## Resources

- [AuthRefreshTokenRepository.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/auth/AuthRefreshTokenRepository.java)
- [InMemoryQrTokenStore.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/access/InMemoryQrTokenStore.java)
- [Phase 5 JWT plan](/Users/abc/projects/GymCRM_V2/docs/plans/2026-02-24-feat-phase5-jwt-rbac-operational-basics-plan.md)
- [Post-Phase11 Redis boundary](/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-04-feat-post-phase11-requirements-architecture-execution-plan.md)

## Acceptance Criteria

- [ ] Redis를 포함하려면 책임별 canonical source와 fallback policy가 문서에 정의된다.
- [ ] auth/QR/reservation 각각에 대한 cutover 방식(dual-write/read 또는 isolated migration)이 결정된다.
- [ ] Redis outage 시 사용자/운영자 관점의 failure behavior가 정의된다.
- [ ] rollback 기준과 검증 시나리오가 함께 작성된다.

## Work Log

### 2026-03-09 - Review finding creation

**By:** Codex

**Actions:**
- 인증/QR 저장 경로와 기존 Redis 보류 결정 문서를 대조했다.
- Redis를 현재 플랜에 포함할 때 필요한 상태 마이그레이션 규칙이 문서에 있는지 점검했다.

**Learnings:**
- Redis 도입의 핵심 리스크는 캐시 추가가 아니라 state migration policy 부재다.

