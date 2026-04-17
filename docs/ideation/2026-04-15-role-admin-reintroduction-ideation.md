---
date: 2026-04-15
topic: role-admin-reintroduction
focus: ROLE_ADMIN 재도입 가능성
---

# Ideation: ROLE_ADMIN Reintroduction

## Codebase Context
- 아키텍처 설계서의 RBAC 표에는 `ADMIN / ROLE_ADMIN`이 존재하지만, 실제 구현과 DB 설계는 `ROLE_SUPER_ADMIN`, `ROLE_MANAGER`, `ROLE_TRAINER`, `ROLE_DESK` 중심으로 정렬되어 있다.
- `AccessPolicies`, `OpenApiConfig`, `AuthController`는 현재 `ROLE_MANAGER` 중심으로 정리되어 있으며, `ROLE_ADMIN` 런타임 사용처는 없다.
- 사용자 clarification 기준으로는 `ROLE_ADMIN`이 헬스장 원장/대표용 최상위 운영 역할이고, `ROLE_MANAGER`는 그 아래의 운영 역할이다.
- 따라서 필요한 것은 `ROLE_ADMIN`과 `ROLE_MANAGER`의 경계를 다시 명시하고, 회원 삭제/시스템 설정/사용자 계정 관리 같은 admin-only 권한을 분리하는 방향이다.

## Ranked Ideas

### 1. Canonical admin split alignment
`ROLE_ADMIN`을 원장/대표용 최상위 운영 역할로 명시하고, `ROLE_MANAGER`는 부원장/매니저용 운영 역할로 고정한다. 민감 기능은 `ROLE_ADMIN` 전용으로 분리한다.

### 2. Policy and contract sync
아키텍처 설계서, OpenAPI role matrix, security policy 상수, 테스트 fixture를 `ROLE_ADMIN` / `ROLE_MANAGER` 이원 구조에 맞게 다시 정렬한다.

### 3. Admin-only surface audit
회원 삭제, 시스템 설정, 사용자 계정 관리처럼 정말 `ROLE_ADMIN`만 접근해야 하는 기능을 먼저 식별하고, `ROLE_MANAGER`에서 제거한다.

### 4. Migration-aware role normalization
기존 데이터와 seed를 검토해 `ROLE_ADMIN` / `ROLE_MANAGER`로 어떻게 정규화할지 결정한다.

### 5. Frontend surface split
프론트 라우트, 메뉴, 액션 버튼을 `ROLE_ADMIN`과 `ROLE_MANAGER` 기준으로 나누고, 민감 버튼은 admin-only로 제한한다.

## Rejection Summary

| # | Idea | Reason Rejected |
|---|------|-----------------|
| 1 | `ROLE_ADMIN`을 문서에만 추가하고 코드 경계를 유지 | 실제 권한 분리가 일어나지 않는다 |
| 2 | `ROLE_ADMIN`과 `ROLE_MANAGER`의 차이를 애매하게 남김 | 기능 경계가 불명확해진다 |
| 3 | `ROLE_SUPER_ADMIN`을 `ROLE_ADMIN`으로 재명명 | 최상위 역할과 원장/대표 역할이 섞인다 |
| 4 | 역할 체계를 다중 role로 한 번에 전환 | 이번 요구의 핵심은 role 수가 아니라 경계 재정의다 |

## Session Log
- 2026-04-15: Initial ideation — clarified `ROLE_ADMIN`/`ROLE_MANAGER` split captured after user correction

