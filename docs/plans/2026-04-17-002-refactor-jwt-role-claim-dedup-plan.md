---
title: "refactor: Remove duplicate JWT role claim and keep canonical role model"
type: refactor
status: active
date: 2026-04-17
origin: docs/brainstorms/2026-04-15-role-admin-manager-rbac-alignment-requirements.md
---

# refactor: Remove duplicate JWT role claim and keep canonical role model

## Overview

JWT payload에서 역할 정보를 `role + primaryRole + roles[]`로 중복 저장하는 현재 상태를 정리한다.  
신규 토큰은 `primaryRole + roles[]`를 canonical로 유지하고 `role` claim은 제거한다.  
동시에 파싱 경로는 기존 토큰 호환을 일정 기간 유지해 무중단 전환을 보장한다.

## Problem Frame

RBAC alignment 작업으로 backend authority, auth DTO, frontend role gating, 문서는 `roleCode + primaryRole + roles[]` 모델로 정렬되었다.  
하지만 JWT claim은 여전히 `role`을 중복 포함하고 있어 계약 의미가 분산된다.

이 중복은 단기적으로 큰 기능 버그를 만들지는 않지만, 아래 리스크를 만든다.

- 어떤 claim이 source of truth인지 혼동된다.
- 토큰 크기가 불필요하게 커진다.
- 이후 멀티 롤 확장 시 `role`과 `roles[]` 간 드리프트 가능성이 열린다.

본 계획은 역할 모델을 단일 의미로 고정하면서도, 기존 발급 토큰과의 호환을 깨지 않도록 단계적 정리를 수행한다.

## Requirements Trace

- R11, R12 (origin): RBAC 문서/계약의 용어와 경계 일관성 유지
- R14 (origin): 서버 측 권한 경계의 신뢰성 유지
- Request-derived C1: 신규 JWT payload에서 역할 중복 claim(`role`) 제거
- Request-derived C2: backend authority 해석은 전환 후에도 동일하게 유지
- Request-derived C3: auth DTO와 frontend role gating 계약이 전환 후에도 동일하게 유지
- Request-derived C4: 테스트와 아키텍처/API 문서를 같은 canonical role 모델로 동기화

## Scope Boundaries

- `ROLE_SUPER_ADMIN/ADMIN/MANAGER/DESK/TRAINER` 역할 모델 자체는 변경하지 않는다.
- 권한 정책(`AccessPolicies`, `@PreAuthorize`)은 변경하지 않는다.
- 로그인/리프레시 TTL, 토큰 저장 전략, revoke/denylist 설계는 변경하지 않는다.
- DB schema 및 migration은 포함하지 않는다.
- JWT 알고리즘(HS256/HS512 전환)은 본 계획 범위에서 제외한다.

## Context & Research

### Relevant Code and Patterns

- JWT 발급/파싱 단일 진입점은 `backend/src/main/java/com/gymcrm/common/auth/service/JwtTokenService.java`다.
- 권한 부여는 `JwtAuthenticationFilter`가 `JwtTokenService.AccessTokenClaims.roleCode`를 `GrantedAuthority`로 매핑한다.
  - `backend/src/main/java/com/gymcrm/common/auth/JwtAuthenticationFilter.java`
- auth 응답 DTO는 `roleCode + primaryRole + roles[]`를 이미 제공한다.
  - `backend/src/main/java/com/gymcrm/common/auth/controller/AuthController.java`
- frontend는 auth payload에서 `primaryRole`과 `roles[]`를 기반으로 gating한다.
  - `frontend/src/app/auth.tsx`
  - `frontend/src/app/roles.ts`

### Institutional Learnings

- 권한 경계는 UI 노출과 별개로 서버 검증이 source of truth여야 한다.
  - `docs/brainstorms/2026-04-15-role-admin-manager-rbac-alignment-requirements.md`

### External References

- 외부 리서치는 생략한다. 본 변경은 라이브러리 신규 도입이 아닌 기존 JWT 계약 정리이며, repo 내 구현 패턴과 테스트 자산이 충분하다.

## Key Technical Decisions

- **Decision: JWT role canonical claim은 `primaryRole + roles[]`로 고정한다.**
  - Rationale: auth DTO/frontend gating과 동일 모델을 유지해 역할 의미를 단일화한다.

- **Decision: 신규 발급 토큰에서 `role` claim은 제거한다.**
  - Rationale: 중복 데이터 제거로 계약 단순화 및 토큰 크기 소폭 절감.

- **Decision: 파싱은 호환 창구를 유지한다 (`primaryRole -> roles[0] -> role` fallback).**
  - Rationale: 이미 발급된 토큰(전환 전)을 즉시 무효화하지 않고도 무중단 전환이 가능하다.

- **Decision: auth API 응답의 `roleCode`는 유지한다.**
  - Rationale: API consumer 계약 안정성과 프론트 타입 안정성을 위해 응답 계약은 유지하고, JWT 내부 claim만 정리한다.

## Open Questions

### Resolved During Planning

- Q. 내부 코드가 raw `role` claim에 직접 의존하는가?
  - Resolution: 내부 권한 해석은 `JwtTokenService` 경유이므로, parser fallback만 유지하면 내부 호환은 보장된다.

### Deferred to Implementation

- Q. 외부 시스템(사내 스크립트/게이트웨이/관측 파이프라인)이 JWT raw `role` claim을 직접 참조하는가?
  - Reason deferred: repo 외부 소비자 정보는 코드베이스만으로 단정할 수 없다. 릴리즈 노트와 운영 확인이 필요하다.

## High-Level Technical Design

> This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.

| 단계 | Access/Refresh 발급 claim | 파싱 roleCode 해석 순서 | 목적 |
|---|---|---|---|
| 현재 | `role + primaryRole + roles[]` | `primaryRole -> role -> roles[0]` | 기존 상태 |
| 전환 후 | `primaryRole + roles[]` | `primaryRole -> roles[0] -> role` | 신규 발급은 중복 제거, 구토큰 호환 유지 |
| 호환 종료(후속) | `primaryRole + roles[]` | `primaryRole -> roles[0]` | fallback 제거로 계약 완전 단일화 |

## Implementation Units

- [ ] **Unit 1: JWT 발급 claim 단순화 + parser 호환 순서 정렬**

**Goal:** 신규 토큰에서 `role` claim을 제거하고, parser를 canonical 중심(`primaryRole`, `roles[]`)으로 정렬한다.

**Requirements:** C1, C2

**Dependencies:** 없음

**Files:**
- Modify: `backend/src/main/java/com/gymcrm/common/auth/service/JwtTokenService.java`
- Test: `backend/src/test/java/com/gymcrm/auth/JwtTokenServiceClaimCompatibilityTest.java`

**Approach:**
- access/refresh 토큰 발급 claim에서 `role` 제거.
- roleCode 파싱 우선순위를 `primaryRole -> roles[0] -> role`로 변경.
- fallback `role`은 호환 창구로만 유지하고, parser 코드에 제거 기준(후속 cleanup 조건)을 주석/문서로 남긴다.

**Patterns to follow:**
- 기존 claim 검증/예외 처리 패턴(`ApiException(ErrorCode.TOKEN_INVALID, ...)`) 유지.
- `AuthControllerIntegrationTest`의 계약 검증 방식과 일관된 assertion 스타일 유지.

**Test scenarios:**
- Happy path: 신규 발급 access token에 `primaryRole`, `roles[]`는 존재하고 `role`은 없다.
- Happy path: 신규 발급 refresh token에 `primaryRole`, `roles[]`는 존재하고 `role`은 없다.
- Edge case: `primaryRole` 누락 + `roles[0]`만 존재하는 토큰에서도 roleCode가 복원된다.
- Error path: `primaryRole`, `roles`, `role` 모두 없는 토큰은 `TOKEN_INVALID`로 거부된다.
- Compatibility: legacy `role` only 토큰도 호환 기간 동안 roleCode 해석이 가능하다.

**Verification:**
- JWT 발급 claim contract가 중복 없이 정렬되고, 인증/인가 성공률 회귀가 없다.

- [ ] **Unit 2: Auth API 계약 회귀 방지 테스트 강화**

**Goal:** JWT 내부 claim 정리 이후에도 API 응답 계약(`roleCode + primaryRole + roles[]`)이 동일함을 보장한다.

**Requirements:** C2, C3

**Dependencies:** Unit 1

**Files:**
- Modify: `backend/src/test/java/com/gymcrm/auth/AuthControllerIntegrationTest.java`
- Test: `backend/src/test/java/com/gymcrm/auth/AuthAccessRevokeAfterIntegrationTest.java`
- Add: `backend/src/test/java/com/gymcrm/auth/AuthTokenRoleClaimContractIntegrationTest.java`

**Approach:**
- login/me/refresh 경로에서 user payload 필드(`roleCode`, `primaryRole`, `roles[]`) 유지 검증을 강화한다.
- access revoke 이후 토큰 거부 시나리오가 claim 정리와 무관하게 유지됨을 회귀 검증한다.

**Patterns to follow:**
- 기존 integration test fixture(`center-admin`, JWT mode dev profile) 재사용.

**Test scenarios:**
- Happy path: `POST /api/v1/auth/login` 응답 user payload가 canonical role 모델을 유지한다.
- Happy path: `GET /api/v1/auth/me` 응답 user payload가 canonical role 모델을 유지한다.
- Integration: 발급된 access token raw claim에 `primaryRole`, `roles[]`는 존재하고 `role`은 없어야 하며, 해당 토큰으로 protected endpoint 접근 결과가 기존과 동일하다.
- Error path: revoke-after 이후 access token 재사용 시 `TOKEN_REVOKED`를 반환한다.

**Verification:**
- auth integration 테스트에서 역할 모델 관련 assertion과 claim contract assertion이 모두 통과한다.

- [ ] **Unit 3: Frontend role gating 안정성 회귀 검증**

**Goal:** backend JWT claim 정리와 무관하게 frontend role normalization/gating 동작이 유지됨을 보장한다.

**Requirements:** C3

**Dependencies:** Unit 2

**Files:**
- Modify: `frontend/src/app/auth.test.tsx`
- Modify: `frontend/src/app/routes.test.ts`
- Test: `frontend/src/app/auth.tsx`
- Test: `frontend/src/app/roles.ts`

**Approach:**
- auth bootstrap 테스트에서 role source 다양성(`primaryRole`, `roles[]`, `roleCode`) 케이스를 유지/보강한다.
- admin/super-admin/manager route gating 회귀를 유지한다.

**Patterns to follow:**
- 기존 `auth.test.tsx`, `routes.test.ts`의 mocked fetch + `renderHook` 테스트 패턴 재사용.

**Test scenarios:**
- Happy path: live auth payload의 `primaryRole + roles[]` 입력이 정상 normalize된다.
- Compatibility: `roleCode` only payload도 canonical 상태로 normalize된다.
- Integration: admin-only route는 `ROLE_ADMIN`/`ROLE_SUPER_ADMIN`만 접근 가능하고 `ROLE_MANAGER`는 차단된다.
- Edge case: roles 배열 정렬/중복 제거로 identity key가 안정적으로 계산된다.

**Verification:**
- auth/routes 단위 테스트가 모두 통과하고 role-gating 회귀가 없다.

- [ ] **Unit 4: 아키텍처/API 문서 및 변경 이력 동기화**

**Goal:** JWT payload와 role claim 정책을 문서에 동일하게 반영한다.

**Requirements:** R11, R12, C4

**Dependencies:** Unit 1

**Files:**
- Modify: `docs/02_시스템_아키텍처_설계서.md`
- Modify: `docs/04_API_설계서.md`

**Approach:**
- JWT payload 표/예시에서 `role` 제거 후 canonical claim(`primaryRole`, `roles[]`) 중심으로 정리.
- 부록 변경 이력에 버전/날짜/요약을 추가한다.
- 운영 호환 창구(`legacy role fallback`)의 존재 기간을 문장으로 명시해 전환 정책을 공유한다.

**Patterns to follow:**
- `docs/04_API_설계서.md` Appendix C 버전 기록 형식.
- `docs/02_시스템_아키텍처_설계서.md` 문서 이력 표 형식.

**Test scenarios:**
- Test expectation: none -- documentation-only unit.

**Verification:**
- 아키텍처/API 문서의 JWT payload 설명이 코드 계약과 일치한다.

## System-Wide Impact

- **Interaction graph:** `JwtTokenService` 변경은 `AuthService -> AuthController`, `JwtAuthenticationFilter`, `CurrentUserProvider` 경로에 간접 영향이 있다.
- **Error propagation:** parser fallback 정리로 `TOKEN_INVALID` 발생 조건이 바뀔 수 있으므로 예외 코드/메시지 일관성 유지가 필요하다.
- **State lifecycle risks:** 이미 발급된 토큰(특히 refresh)과 신규 발급 토큰이 혼재하는 기간이 존재한다.
- **API surface parity:** auth API 응답 DTO는 유지해야 하며, frontend는 JWT raw claim을 직접 의존하지 않는 상태를 유지해야 한다.
- **Integration coverage:** login -> protected call -> revoke-after call 체인을 최소 1개 이상 유지해 cross-layer 회귀를 막아야 한다.
- **Unchanged invariants:** RBAC 역할 집합, AccessPolicies, center-scoped authorization 규칙은 변경하지 않는다.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| 외부 소비자가 JWT raw `role` claim을 직접 읽는 경우 호환성 이슈 발생 | parser fallback 유지 + 릴리즈 노트로 claim 변경 공지 + 관측 구간에서 TOKEN_INVALID/401 모니터링 |
| parser fallback이 길게 남아 계약 단순화가 미완료 상태로 고착 | 문서에 fallback 제거 조건과 목표 시점을 명시하고 후속 todo/plan으로 추적 |
| 테스트가 auth DTO만 검증하고 JWT 내부 claim 변화를 놓칠 수 있음 | JWT claim 자체를 검증하는 테스트(Unit 1)와 API 계약 테스트(Unit 2)를 분리해 보강 |

## Documentation / Operational Notes

- 롤아웃 직후 401/TOKEN_INVALID 비율을 집중 관찰한다.
- 관측상 외부 legacy consumer가 없음을 확인하면 fallback `role` 파싱 제거를 별도 후속 리팩터로 진행한다.
- API/아키텍처 문서의 JWT payload 예시는 발급 코드와 동일한 필드 집합으로 유지한다.

### Fallback Removal Gate (legacy `role` claim parser 제거 조건)

- Gate 1. **관측 기간**: 배포 후 최소 7일(현재 refresh token TTL과 동일) 운영 관측을 유지한다.
- Gate 2. **오류 지표**: `TOKEN_INVALID`/401 비율이 배포 전 baseline 대비 유의미하게 증가하지 않아야 한다.
- Gate 3. **외부 consumer 확인**: JWT raw claim을 직접 읽는 외부 소비자가 없거나, 있다면 `primaryRole + roles[]`로 전환 완료 증빙이 있어야 한다.
- Gate 4. **책임자 승인**: auth owner 1인과 운영 owner 1인이 Gate 1~3 충족을 확인한 뒤 fallback 제거 PR을 승인한다.

## Sources & References

- **Origin document:** `docs/brainstorms/2026-04-15-role-admin-manager-rbac-alignment-requirements.md`
- Related code:
  - `backend/src/main/java/com/gymcrm/common/auth/service/JwtTokenService.java`
  - `backend/src/main/java/com/gymcrm/common/auth/JwtAuthenticationFilter.java`
  - `backend/src/main/java/com/gymcrm/common/auth/controller/AuthController.java`
  - `frontend/src/app/auth.tsx`
  - `frontend/src/app/roles.ts`
- Related tests:
  - `backend/src/test/java/com/gymcrm/auth/AuthControllerIntegrationTest.java`
  - `backend/src/test/java/com/gymcrm/auth/AuthAccessRevokeAfterIntegrationTest.java`
  - `frontend/src/app/auth.test.tsx`
  - `frontend/src/app/routes.test.ts`
