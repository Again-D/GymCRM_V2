---
status: complete
priority: p2
issue_id: "050"
tags: [code-review, architecture, planning, redis]
dependencies: []
---

# Redis architecture assumptions are not explicitly stage-aligned with current implementation

## Problem Statement

`docs/02_시스템_아키텍처_설계서.md`는 Redis를 세션/캐시/분산락/JWT 로그아웃 블랙리스트 핵심으로 기술하지만, 현재 backend 구현은 PostgreSQL 기반 refresh token rotation이며 Redis 의존성이 없다.
문서-구현 간 단계 정렬이 명시되지 않으면, 현 시점 구현 필요 여부 판단과 다음 phase 진입 기준이 혼란스러워진다.

## Findings

- 아키텍처 문서의 Redis 사용 명시:
  - 세션/캐시/실시간 예약 현황: `docs/02_시스템_아키텍처_설계서.md:251`
  - reservation 분산락(`ReservationLockService`): `docs/02_시스템_아키텍처_설계서.md:659`
  - refresh token 저장/로그아웃 블랙리스트: `docs/02_시스템_아키텍처_설계서.md:1003-1007`
  - QR 1회 사용 토큰 삭제: `docs/02_시스템_아키텍처_설계서.md:1293`
- 현재 구현은 Redis 미도입:
  - Redis 관련 Spring 의존성/설정 부재: `backend/build.gradle`, `backend/src/main/resources/application.yml`
  - refresh token은 DB 테이블 기반: `backend/src/main/resources/db/migration/V6__create_users_and_auth_refresh_tokens.sql`
  - AuthService도 repository(DB) 기반 revoke/rotation: `backend/src/main/java/com/gymcrm/auth/AuthService.java`
- 기존 계획 문서는 Redis 도입을 후속 단계로 유보한 이력이 있음:
  - `docs/plans/2026-02-24-feat-phase5-jwt-rbac-operational-basics-plan.md:110-114,391-392`

## Proposed Solutions

### Option 1: 단계 정렬 문구를 아키텍처/플랜에 명시 (권장)

**Approach:**
- 아키텍처 문서에 "Prototype/Phase11까지는 DB 기반, Redis는 Phase12+ 단계적 도입" 주석 추가
- Post-Phase11 실행 플랜에 Redis 도입 트리거(ACC 게이트 실연동/분산락 필요 시점)와 최소 도입 범위 명시

**Pros:**
- 지금 구현해야 할 것과 후속 구현의 경계가 명확해짐
- 문서-코드 불일치 오해 감소

**Cons:**
- 문서 보완 작업 필요

**Effort:** Small

**Risk:** Low

---

### Option 2: Redis 기반 기능 일부를 즉시 선반영

**Approach:**
- Redis 의존성/설정 + healthcheck만 먼저 도입하고 기능은 feature flag로 비활성

**Pros:**
- 다음 phase 진입 시 인프라 리스크 감소

**Cons:**
- 지금 단계 범위 증가, 운영 복잡도 조기 유입

**Effort:** Medium

**Risk:** Medium

## Recommended Action

Option 1 채택: 아키텍처 문서는 유지하고 실행계획 문서에 Redis 도입 경계(현 단계 보류/후속 도입 트리거/우선순위)를 명시해 단계 정렬을 완료한다.

## Technical Details

**Affected files:**
- `docs/02_시스템_아키텍처_설계서.md`
- `docs/plans/2026-03-04-feat-post-phase11-requirements-architecture-execution-plan.md`
- `backend/build.gradle`
- `backend/src/main/resources/application.yml`

## Acceptance Criteria

- [x] Redis 사용처별(인증, 예약 락, QR 토큰) "도입 phase"가 문서에 명시된다.
- [x] 현 단계에서 필수 구현/유보 구현 경계가 실행 계획에 반영된다.
- [x] 문서-코드 불일치 해소를 위한 후속 작업 티켓이 연결된다.

## Work Log

### 2026-03-06 - Review Finding Captured

**By:** Codex

**Actions:**
- Reviewed Redis references in architecture doc
- Cross-checked backend dependencies/config/auth persistence implementation
- Compared with prior phase5 plan decisions

**Learnings:**
- 인프라 컴포넌트는 "최종 아키텍처"와 "현재 단계"를 분리 표기해야 구현 우선순위 혼선을 막을 수 있다.

## Resources

- Architecture: `docs/02_시스템_아키텍처_설계서.md`
- Plan: `docs/plans/2026-02-24-feat-phase5-jwt-rbac-operational-basics-plan.md`

### 2026-03-06 - Execution Complete

**By:** Codex

**Actions:**
- Updated `docs/plans/2026-03-04-feat-post-phase11-requirements-architecture-execution-plan.md` only (architecture doc excluded)
- Added `Redis Adoption Boundary (Stage Alignment)` section with current-stage defer policy and adoption triggers
- Added acceptance criterion to ensure Redis usage stage alignment remains explicit

**Learnings:**
- 단계별 인프라 도입 경계가 계획서에 명시되면 구현 우선순위 판단과 리뷰 합의 비용이 크게 줄어든다.
