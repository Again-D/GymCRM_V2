---
title: feat: Auth revoke operational event connection
type: feat
status: completed
date: 2026-03-10
origin: docs/brainstorms/2026-03-10-backend-architecture-stack-alignment-remaining-work-brainstorm.md
---

# feat: Auth revoke operational event connection

## Enhancement Summary

**Deepened on:** 2026-03-10
**Sections enhanced:** 6
**Research sources used:** Spring Security 6.5 reference, Spring Data Redis docs, existing Redis rollout notes, auth/audit code paths

### Key Improvements
1. `jti denylist only`가 왜 forced revoke를 해결하지 못하는지 구조적으로 분리해 설명했다.
2. `users.access_revoked_after + Redis runtime mirror` 모델을 추천 canonical로 구체화했다.
3. JWT filter에서 `token claim + current user state + revoke-after`를 함께 보는 enforcement 원칙을 추가했다.
4. role downgrade / deactivation / refresh revoke / audit log를 한 transaction boundary로 묶는 방향을 명시했다.
5. Redis read miss, Redis unavailable, DB canonical mismatch 같은 failure policy를 phase별로 더 구체화했다.

## Overview

Found brainstorm from 2026-03-10: backend architecture stack alignment remaining work. Using as foundation for planning.

이번 계획은 Redis auth denylist 후속 범위 중 아직 deferred로 남아 있는 연결 작업을 실제 구현 가능한 단위로 정리한다.

대상 범위:

- admin forced revoke
- role downgrade 시 access revoke 연결
- user deactivation 시 access revoke 연결

기준 문서:

- Redis execution plan은 `auth denylist phase에 TTL alignment와 운영 이벤트 write 후보를 명시`했고, write 후보로 `forced revoke`, `role downgrade`, `user deactivation`을 남겼다 (see brainstorm: `docs/brainstorms/2026-03-10-backend-architecture-stack-alignment-remaining-work-brainstorm.md`)
- Redis rollout note는 이 세 항목을 deferred scope로 남겼다
  - [2026-03-10-redis-runtime-rollout-validation.md](/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-10-redis-runtime-rollout-validation.md)

이 계획의 목표는 “logout만 즉시 무효화되는 상태”를 넘어서, 운영자가 사용자 상태를 바꿀 때도 access token enforcement가 따라오도록 만드는 것이다.

## Problem Statement / Motivation

현재 구현은 다음 수준까지 완료됐다.

- logout 시 현재 요청의 access token `jti`를 Redis denylist에 기록
- JWT filter에서 denylisted access token 차단
- refresh token canonical source는 PostgreSQL `auth_refresh_tokens` 유지

하지만 이 구조만으로는 운영 이벤트를 충분히 커버하지 못한다.

1. `forced revoke`
- 관리자가 다른 사용자를 강제로 로그아웃시키려 해도, 서버는 그 사용자가 현재 들고 있는 access token의 `jti`를 모른다.
- 즉, `jti denylist`만으로는 “현재 들고 있는 미제출 access token 전체”를 무효화할 수 없다.

2. `role downgrade`
- 사용자의 `role_code`를 낮춰도 이미 발급된 access token에는 이전 role claim이 남아 있을 수 있다.
- 현재 filter는 token claim의 role을 그대로 사용하므로, downgrade 직후에도 구토큰이 계속 허용될 수 있다.

3. `user deactivation`
- `user_status=INACTIVE` 또는 유사 상태로 바뀌어도 기존 access token을 즉시 끊지 못하면 운영/보안 요구와 어긋난다.

즉, 현재 denylist는 “self logout의 현재 token revoke”에는 맞지만, “user-scope operational revoke”에는 구조적으로 부족하다.

## Proposed Solution

추천안은 `two-layer revoke model`이다.

1. 현재 구조 유지
- self logout은 계속 `jti denylist`로 처리한다.
- 이유: 현재 요청이 들고 온 token의 `jti`를 알고 있으므로 가장 직접적이고 간단하다.

2. 운영 이벤트용 revoke marker 추가
- 강제 revoke / role downgrade / user deactivation은 사용자 단위 revoke marker로 처리한다.
- 추천 canonical:
  - PostgreSQL: `users.access_revoked_after` 또는 동등한 revocation timestamp/version
  - Redis: `auth:revoke-after:user:{userId}` 캐시/런타임 복제

3. JWT filter enforcement 확장
- access token parse 후 아래 둘 다 확인한다.
  - `jti denylist`
  - `user revoke-after marker`
- token `iat`가 `access_revoked_after` 이전이면 `TOKEN_REVOKED`로 차단한다.

4. 운영 이벤트 연결
- admin forced revoke
  - revoke-after timestamp 갱신
  - active refresh token revoke
  - audit log 기록
- role downgrade
  - `role_code` 변경
  - revoke-after timestamp 갱신
  - audit log `ACCOUNT_ROLE_CHANGE`
- user deactivation
  - `user_status` 변경
  - revoke-after timestamp 갱신
  - 필요 시 refresh token revoke
  - audit log `ACCOUNT_STATUS_CHANGE` 또는 기존 이벤트명 확장

이 접근은 Redis를 런타임 enforcement에 활용하면서도 canonical source는 PostgreSQL에 두기 때문에, 기존 auth 전략과 충돌이 적다.

## Why This Approach

이 접근을 추천하는 이유:

- `jti denylist only`로는 미제출 토큰 전체 revoke가 불가능하다.
- refresh token revoke만으로는 이미 발급된 access token을 즉시 끊지 못한다.
- user-scope revoke marker는 role downgrade와 deactivation까지 같은 모델로 묶을 수 있다.
- PostgreSQL canonical + Redis runtime cache라는 현재 Redis 전략과 일관된다.

## Research Summary

### Local repo findings

- 현재 denylist는 `jti` key 기반이다.
  - [RedisAccessTokenDenylistService.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/auth/RedisAccessTokenDenylistService.java)
- logout은 현재 access token만 best-effort revoke한다.
  - [AuthService.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/auth/AuthService.java)
- JWT filter는 token claim 기반 role을 그대로 principal에 넣고 있다.
  - [JwtAuthenticationFilter.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/auth/JwtAuthenticationFilter.java)
- 사용자 상태는 이미 `users.role_code`, `users.user_status`로 모델링돼 있다.
  - [AuthUserEntity.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/auth/AuthUserEntity.java)
- audit는 이미 `ACCOUNT_ROLE_CHANGE`를 다룰 수 있다.
  - [AuditLogService.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/audit/AuditLogService.java)
  - [AuditLogController.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/audit/AuditLogController.java)
- 하지만 현재 사용자 role/status를 바꾸는 admin API는 없다.
  - 코드 검색 기준 `users.role_code`, `users.user_status` update controller/service 부재

### Institutional learnings

- 문서/체크리스트 drift는 plan과 실행 문서에서 같은 마일스톤으로 닫아야 한다.
  - [prototype-plan-checklist-status-drift-gymcrm-20260227.md](/Users/abc/projects/GymCRM_V2/docs/solutions/documentation-gaps/prototype-plan-checklist-status-drift-gymcrm-20260227.md)
- rollback trigger, audit validation, executable verification query를 같은 문서에서 관리하는 편이 안전하다.
  - [post-phase11-plan-rollback-control-and-audit-retention-validation-gymcrm-20260304.md](/Users/abc/projects/GymCRM_V2/docs/solutions/documentation-gaps/post-phase11-plan-rollback-control-and-audit-retention-validation-gymcrm-20260304.md)
- JWT 모드 권한/센터 경계는 token claim만 믿지 말고 현재 사용자/센터 상태와 함께 검증하는 쪽이 안전하다.
  - [reservation-capacity-and-usage-deduction-integrity-gymcrm-20260225.md](/Users/abc/projects/GymCRM_V2/docs/solutions/database-issues/reservation-capacity-and-usage-deduction-integrity-gymcrm-20260225.md)

### External research decision

이 주제는 인증/권한/운영 이벤트를 건드리는 high-risk 영역이지만, 현재 코드베이스와 기존 Redis 실행계획이 이미 방향을 충분히 고정하고 있다.

이번 계획에서는 추가 웹 리서치보다 아래 로컬 제약이 더 중요하다.

- refresh token canonical은 PostgreSQL 유지
- Redis는 runtime enforcement 역할
- architecture document는 목표 상태 문서로 유지

따라서 이번 단계는 외부 리서치 없이 로컬 문맥 기준으로 계획을 고정한다.

추가 보강 기준:

- Spring Security reference는 stateless JWT라도 request authentication 시점에 current user/account state를 확인하는 방향이 자연스럽다는 점을 뒷받침한다.
- Spring Data Redis는 `StringRedisTemplate` 기반 TTL key/value 저장을 가장 단순한 runtime state 패턴으로 제공하므로, user revoke marker mirror도 같은 계열로 두는 것이 일관적이다.

## Technical Approach

### Architecture

추천 구조:

| Responsibility | Canonical source | Runtime source | Purpose |
|---|---|---|---|
| Self logout token revoke | Redis jti denylist | Redis | current presented token revoke |
| Forced revoke / role downgrade / deactivation | PostgreSQL revoke-after marker | Redis mirror/cache | user-scope operational revoke |
| Refresh token revoke | PostgreSQL `auth_refresh_tokens` | PostgreSQL | session family invalidation |

권장 데이터 모델:

- `users.access_revoked_after TIMESTAMPTZ NULL`
  또는
- `users.token_version BIGINT NOT NULL DEFAULT 0`

이 계획에서는 timestamp 방식이 더 자연스럽다.

이유:

- JWT에는 이미 `iat`가 존재한다.
- filter에서 `iat < access_revoked_after` 비교가 직관적이다.
- forced revoke, role downgrade, deactivation 모두 “지금 이후 토큰만 유효” 규칙으로 통일된다.

### Research Insights

**Best practices:**

- Spring Security 쪽에서는 JWT claim만 principal에 복사하는 것보다, authentication 시점에 현재 user/account 상태를 다시 확인하는 구조가 더 안전하다.
- Redis revoke state는 cache abstraction보다 `StringRedisTemplate` direct ops가 TTL, key contract, failure behavior를 더 분명하게 드러낸다.
- self logout과 user-scope revoke를 같은 자료구조로 억지로 합치기보다 `jti denylist`와 `revoke-after marker`를 분리하는 편이 semantics가 명확하다.

**Implementation details:**

- `revoke-after` 비교는 token `iat` 기준으로 고정하고, claim이 없거나 파싱 해상도가 애매하면 비교 규칙을 테스트로 먼저 고정해야 한다.
- Redis key는 `auth:revoke-after:user:{userId}`처럼 user scope가 드러나는 문자열 키가 적합하다.
- Redis write는 canonical DB update 후 mirror write, read는 Redis 우선 + miss 시 DB fallback 여부를 명확히 정해야 한다.

**Edge cases:**

- role downgrade와 deactivation은 old token을 `403`이 아니라 `401 TOKEN_REVOKED`로 볼지 early decision이 필요하다.
- forced revoke 직후 이미 진행 중인 요청을 어디까지 허용할지 경계가 필요하다.
- revoke-after timestamp와 JWT `iat`가 같은 초 단위로 맞물릴 때 비교 연산(`before`, `<=`)을 테스트로 닫아야 한다.

### Implementation Phases

#### Phase 1: Revocation Marker Foundation

- Deliverables:
  - `users.access_revoked_after` migration
  - auth user repository update methods
  - Redis key contract for user revoke marker
- Success criteria:
  - 특정 userId에 대해 revoke-after를 canonical + runtime 양쪽에서 표현할 수 있다.
- Estimated effort:
  - medium

Phase 1 checklist:
- [x] `users`에 revoke marker 컬럼(`access_revoked_after`)을 추가한다.
- [x] `AuthUserRepository`에 role/status/revoke marker update 경로를 추가한다.
- [x] Redis key contract `auth:revoke-after:user:{userId}`를 정의한다.
- [x] PostgreSQL canonical + Redis mirror/write policy를 문서화한다.

Phase 1 research insights:

- canonical source는 PostgreSQL이고 Redis는 runtime mirror라는 점을 문서에 먼저 못 박아야 later rollback이 쉽다.
- schema는 `TIMESTAMPTZ NULL`이 현재 JWT `iat` 비교 모델과 가장 잘 맞는다.
- role/status change update와 revoke marker update는 같은 repository/service unit으로 묶어 partial write를 피해야 한다.

#### Phase 2: JWT Filter Enforcement

- Deliverables:
  - filter revoke-after check
  - runtime cache read path
  - fallback policy
- Success criteria:
  - 운영 이벤트 직후 이전 access token이 `TOKEN_REVOKED`로 차단된다.
- Estimated effort:
  - medium

Phase 2 checklist:
- [x] `JwtAuthenticationFilter`에 revoke-after check를 추가한다.
- [x] token `iat`와 revoke-after 비교 규칙을 고정한다.
- [x] Redis read miss 시 DB fallback 여부를 결정한다.
- [x] Redis unavailable 시 failure policy를 문서화한다.

Phase 2 research insights:

- filter는 최소한 `jti denylist -> revoke-after -> current user active/status` 순서로 검사하는 편이 설명 가능성이 높다.
- Redis read miss는 곧바로 “허용”이 아니라 DB canonical fallback을 먼저 검토하는 것이 auth risk에 더 안전하다.
- Redis unavailable 시 완전 fail-closed는 운영 충격이 크므로, canonical DB read 가능 여부를 함께 보는 hybrid degrade 정책이 현실적이다.

#### Phase 3: Operational Event Connection

- Deliverables:
  - admin forced revoke service/API
  - role change + deactivation hook
  - refresh revoke + audit integration
- Success criteria:
  - 강제 revoke / 역할 강등 / 사용자 비활성화가 같은 revocation model로 묶인다.
- Estimated effort:
  - high

Phase 3 checklist:
- [x] admin-only forced revoke API 또는 동등한 service entry point를 추가한다.
- [x] role change 시 revoke-after marker를 갱신한다.
- [x] user deactivation 시 revoke-after marker와 refresh revoke를 수행한다.
- [x] audit log를 role/status 변경 이벤트에 맞게 연결한다.

Phase 3 research insights:

- role change와 deactivation은 단순 user column update가 아니라 auth lifecycle event로 다뤄야 한다.
- refresh revoke가 빠지면 old access token은 막아도 새 access token을 재발급받을 수 있으므로, user-scope revoke와 refresh revoke를 함께 수행해야 한다.
- audit는 `ACCOUNT_ROLE_CHANGE` 외에 status change 이벤트명 확장 여부를 초기에 정해야 한다.

#### Phase 4: Validation, Rollback, Closure

- Deliverables:
  - integration tests
  - rollout/rollback note
  - deferred scope refresh
- Success criteria:
  - 운영 이벤트 기반 revoke가 테스트와 문서로 닫힌다.
- Estimated effort:
  - medium

Phase 4 checklist:
- [x] logout denylist와 forced revoke marker가 충돌 없이 동작하는 integration test를 추가한다.
- [x] role downgrade 직후 기존 access token이 차단되는 테스트를 추가한다.
- [x] deactivation 직후 기존 access token이 차단되는 테스트를 추가한다.
- [x] rollout/rollback/validation note를 갱신한다.

Phase 4 research insights:

- rollback 기본값은 Redis feature flag off가 아니라 “운영 이벤트 enforcement를 old behavior로 되돌리는 것”까지 포함해야 한다.
- validation 문서에는 SQL, auth smoke, audit query가 함께 있어야 한다.
- `full ./gradlew test` 외에 auth-focused targeted suite를 PR 본문에 별도로 남기는 편이 운영 가독성이 좋다.

## Alternative Approaches Considered

### Option A: `jti denylist`만 계속 확장

장점:

- 현재 구조를 그대로 쓴다.

단점:

- 강제 revoke 대상 사용자의 현재 access token `jti`를 알 수 없다.
- user-scope revoke를 일반화할 수 없다.

배제 이유:

- 구조적으로 forced revoke/role downgrade/deactivation을 해결하지 못한다.

### Option B: refresh token revoke만 수행

장점:

- PostgreSQL canonical만 사용한다.

단점:

- 이미 발급된 access token은 만료 전까지 계속 살아 있다.

배제 이유:

- “즉시 revoke” 요구를 충족하지 못한다.

### Option C: user revoke-after marker + existing jti denylist 병행

추천안.

장점:

- self logout과 운영 이벤트 revoke를 각각 맞는 단위로 처리할 수 있다.
- role downgrade / deactivation까지 같은 enforcement 모델로 묶인다.
- Redis runtime adoption 전략과 일관된다.

단점:

- JWT filter와 user lifecycle write path를 같이 건드려야 한다.

## System-Wide Impact

### Interaction Graph

- admin forced revoke
  - `AdminAuthController -> AuthAdminService -> AuthUserRepository + AuthRefreshTokenRepository + RevokeMarkerService -> Redis/PostgreSQL`
- role downgrade
  - `AdminUserController/Service -> AuthUserRepository.updateRole -> RevokeMarkerService -> AuditLogService`
- deactivation
  - `AdminUserController/Service -> AuthUserRepository.updateStatus -> RevokeMarkerService -> AuthRefreshTokenRepository -> AuditLogService`
- request auth
  - `JwtAuthenticationFilter -> JwtTokenService.parse -> jti denylist check -> revoke-after check -> AuthUserRepository.findActiveById`

### Error & Failure Propagation

- Redis write 실패:
  - runtime marker miss 가능
  - canonical DB write가 성공해도 immediate enforcement가 약해질 수 있음
- PostgreSQL write 실패:
  - role/status/revoke marker update 전체 rollback 필요
- filter read path 실패:
  - degraded open / degraded closed 중 선택 필요
  - 이 선택은 auth risk라 문서로 고정해야 함

권장 기본값:

- DB canonical write 실패: 전체 rollback
- DB 성공 + Redis mirror 실패: 성공 응답 가능하되 degraded revoke 경고/audit 남김
- Redis read miss: DB fallback
- Redis + DB 모두 revoke state read 실패: `TOKEN_INVALID` 계열 fail-closed 여부를 별도 결정 항목으로 남김

### State Lifecycle Risks

- role/status 변경은 성공했는데 revoke marker가 빠지면 구토큰이 계속 살 수 있다.
- revoke marker는 갱신됐는데 refresh revoke가 누락되면 refresh로 새 access token을 다시 발급받을 수 있다.
- role change와 audit log가 분리돼 있으면 운영 추적이 깨진다.
- self logout denylist와 user revoke-after marker가 서로 다른 이유로 차단할 때, 에러 코드는 하나로 통일하는 편이 API 표면이 단순하다.

### API Surface Parity

- `POST /api/v1/auth/logout`
- 신규 admin revoke endpoint
- 신규 admin role/status mutation endpoint 또는 기존 user-admin surface
- audit 조회 API (`ACCOUNT_ROLE_CHANGE`, 신규 status change event)

### Integration Test Scenarios

1. login -> admin forced revoke -> same access token `/me` -> `401 TOKEN_REVOKED`
2. login as manager -> admin downgrades to desk -> old token으로 manager-only API 호출 -> `403` 또는 `401 TOKEN_REVOKED` 규칙 고정
3. login -> admin deactivates user -> old token `/me` 호출 -> revoke
4. deactivation 후 refresh 시도 -> refresh revoked 또는 authentication failed
5. logout denylist와 revoke-after marker가 동시에 있는 경우에도 old token은 일관되게 차단

## SpecFlow Analysis

핵심 사용자 흐름:

1. 운영자가 보안 사고/퇴사/권한 오설정으로 특정 계정을 즉시 차단해야 한다.
2. 운영자가 역할을 낮춘 즉시 이전 고권한 access token이 더 이상 쓰이면 안 된다.
3. 사용자를 비활성화하면 access/refresh 모두 실질적으로 세션 종료 상태가 되어야 한다.

누락되기 쉬운 edge cases:

- 자기 자신을 강제 revoke하는 경우 현재 요청을 어떻게 처리할지
- role downgrade 직후 OpenAPI role matrix와 실제 enforcement가 잠시 어긋나는 경우
- prototype 모드에서 이 경로를 어떻게 비활성화/우회할지
- Redis down 상태에서 admin revoke가 DB만 반영되고 runtime enforcement가 늦어지는 경우

## Acceptance Criteria

### Functional Requirements

- [x] 운영 이벤트(`forced revoke`, `role downgrade`, `user deactivation`)가 access revoke enforcement와 연결된다.
- [x] logout 기존 경로는 그대로 유지되며 regression이 없다.
- [x] refresh token canonical source는 계속 PostgreSQL이다.
- [x] admin 경로는 center scope와 RBAC를 유지한다.

## Execution Notes

- 2026-03-10:
  - `users.access_revoked_after` migration과 Redis mirror key `auth:revoke-after:user:{userId}`를 추가했다.
  - `JwtAuthenticationFilter`는 `jti denylist -> current user lookup -> revoke-after marker` 순서로 access revoke를 검사한다.
  - Redis read miss는 DB canonical fallback으로 처리하고, Redis runtime exception은 canonical value 기준으로 degrade한다.
  - admin-only `POST /api/v1/auth/users/{userId}/revoke-access` endpoint를 추가했다.
  - forced revoke는 center scope 안의 활성 사용자만 대상으로 하며 `access_revoked_after` 갱신, active refresh token bulk revoke(`FORCED_REVOKE`), audit event(`ACCOUNT_ACCESS_REVOKE`)를 한 흐름으로 묶는다.
  - admin-only `POST /api/v1/auth/users/{userId}/role` endpoint를 추가했다.
  - admin-only `POST /api/v1/auth/users/{userId}/status` endpoint를 추가했다.
  - role change는 `role_code` 변경, revoke-after 갱신, refresh revoke(`ROLE_CHANGED`), audit event(`ACCOUNT_ROLE_CHANGE`)를 한 흐름으로 묶는다.
  - deactivation은 `user_status` 변경, revoke-after 갱신, refresh revoke(`STATUS_CHANGED`), audit event(`ACCOUNT_STATUS_CHANGE`)를 한 흐름으로 묶는다.
  - 통합 검증:
    - `AuthAccessRevokeAfterIntegrationTest`
    - `AuthOperationalAccessRevokeIntegrationTest`
    - `AuthAccessDenylistIntegrationTest`
    - `AuthControllerIntegrationTest`
    - `AuditLogApiIntegrationTest`
    - `./gradlew test`
    - `docs/notes/2026-03-10-auth-operational-revoke-rollout-validation.md`

### Non-Functional Requirements

- [x] revoke enforcement 규칙이 문서화된다.
- [x] audit log와 rollback 기준이 함께 정리된다.
- [x] Redis failure policy가 운영자가 이해 가능한 수준으로 고정된다.

### Quality Gates

- [x] forced revoke integration test
- [x] role downgrade integration test
- [x] deactivation integration test
- [x] logout + forced revoke parity test
- [x] full `./gradlew test` 통과

## Success Metrics

- 관리자가 특정 계정을 즉시 revoke할 수 있다.
- 역할 강등 후 기존 고권한 token 사용이 차단된다.
- 비활성화된 사용자의 기존 token이 더 이상 보호 API를 통과하지 못한다.
- Redis denylist 후속 범위가 “deferred”에서 “implemented”로 줄어든다.

## Dependencies & Risks

Dependencies:

- `users` schema 변경
- admin user lifecycle entry point 설계
- audit event naming 확정
- current role/status UX와의 정책 합의

Risks:

- revoke-after timestamp와 token `iat` 비교 경계(동일 초/밀리초)
- Redis/DB dual-write 성격으로 인한 부분 실패
- role downgrade 시 응답 코드를 `401`과 `403` 중 어떻게 고정할지 혼선
- admin user management surface가 아직 없어서 scope가 커질 가능성
- current token claim role과 DB current role이 다를 때 어떤 값을 principal에 넣을지 결정 필요

Mitigations:

- timestamp 비교 규칙을 테스트로 고정
- canonical DB first + Redis mirror 전략 명시
- response semantics를 early decision으로 고정
- admin API가 없으면 최소 surface만 별도 phase로 도입
- principal authority는 current DB role을 우선하고, old token claim role은 revoke 판정 전에만 참고하는 방향을 우선 검토

## Documentation Plan

- Redis rollout note에 deferred scope 업데이트
  - [2026-03-10-redis-runtime-rollout-validation.md](/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-10-redis-runtime-rollout-validation.md)
- 실행 후속 문서 추가
  - revoke marker contract
  - admin revoke / role change / deactivation validation log
- 필요 시 audit event 목록 문서 갱신

## Sources & References

### Origin

- **Brainstorm document:** [2026-03-10-backend-architecture-stack-alignment-remaining-work-brainstorm.md](/Users/abc/projects/GymCRM_V2/docs/brainstorms/2026-03-10-backend-architecture-stack-alignment-remaining-work-brainstorm.md)
  - carried-forward decisions:
  - architecture doc stays aspirational
  - Redis is the highest-priority remaining implementation track
  - rollout order stays `QR token -> reservation lock -> auth denylist`

### Internal References

- Redis execution plan: [2026-03-10-feat-redis-runtime-adoption-execution-plan.md](/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-10-feat-redis-runtime-adoption-execution-plan.md)
- Redis rollout note: [2026-03-10-redis-runtime-rollout-validation.md](/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-10-redis-runtime-rollout-validation.md)
- Current denylist service: [RedisAccessTokenDenylistService.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/auth/RedisAccessTokenDenylistService.java)
- Current logout handling: [AuthService.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/auth/AuthService.java)
- JWT enforcement path: [JwtAuthenticationFilter.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/auth/JwtAuthenticationFilter.java)
- Auth user model: [AuthUserEntity.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/auth/AuthUserEntity.java)
- Audit event validation path: [AuditLogService.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/audit/AuditLogService.java)

### Related Work

- JWT/RBAC baseline: [2026-02-24-feat-phase5-jwt-rbac-operational-basics-plan.md](/Users/abc/projects/GymCRM_V2/docs/plans/2026-02-24-feat-phase5-jwt-rbac-operational-basics-plan.md)
- Rollback/audit documentation learning: [post-phase11-plan-rollback-control-and-audit-retention-validation-gymcrm-20260304.md](/Users/abc/projects/GymCRM_V2/docs/solutions/documentation-gaps/post-phase11-plan-rollback-control-and-audit-retention-validation-gymcrm-20260304.md)
- Authz scope learning: [reservation-capacity-and-usage-deduction-integrity-gymcrm-20260225.md](/Users/abc/projects/GymCRM_V2/docs/solutions/database-issues/reservation-capacity-and-usage-deduction-integrity-gymcrm-20260225.md)

### External References

- Spring Security reference 6.5: custom JWT authentication/resource server and current authentication checks
- Spring Data Redis docs: `StringRedisTemplate` string/TTL operation patterns
