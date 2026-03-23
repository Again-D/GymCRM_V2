---
title: "refactor: Frontend role model follow-up"
type: refactor
status: completed
date: 2026-03-23
origin: docs/brainstorms/2026-03-23-frontend-role-model-follow-up-brainstorm.md
---

# refactor: Frontend role model follow-up

## Overview

백엔드 role storage cutover 이후에도 프론트는 여전히 `authUser.role` 단일 문자열 계약을 중심으로 동작한다. 이 후속 작업의 목적은 프론트 auth 계약을 `primaryRole + roles[]` 구조로 확장하고, route/sidebar visibility, page capability gate, member-context scoping, mock/live parity, 테스트를 새 모델에 맞게 정렬하는 것이다.

이번 작업은 프론트가 다중 역할 정보를 소비할 수 있도록 만드는 리팩터다. 계정 관리 화면에서 `user_roles`를 직접 편집하는 UX는 포함하지 않는다. 그 결정은 브레인스토밍에서 명시적으로 분리됐다 (see brainstorm: docs/brainstorms/2026-03-23-frontend-role-model-follow-up-brainstorm.md).

## Problem Statement

현재 프론트는 저장 구조 전환과 무관하게 단일 role string을 전제로 권한을 해석한다.

- [auth.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/app/auth.tsx)는 `PrototypeAuthUser.role` 단일 필드와 `roleCode` 응답만 사용한다.
- [routes.ts](/Users/abc/projects/GymCRM_V2/frontend/src/app/routes.ts)는 `allowedRoles` / `visibleRoles`를 갖고 있지만 실제 평가는 현재 role 하나와의 비교다.
- [App.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx)는 route access와 sidebar 계산에 단일 role을 넘긴다.
- [TrainersPage.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/pages/trainers/TrainersPage.tsx), [ProductsPage.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/pages/products/ProductsPage.tsx), [LockersPage.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/pages/lockers/LockersPage.tsx), [CrmPage.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/pages/crm/CrmPage.tsx), [AccessPage.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/pages/access/AccessPage.tsx)는 페이지별 직접 role 비교를 사용한다.
- [useMemberManagementState.ts](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/modules/useMemberManagementState.ts), [SelectedMemberContext.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/modules/SelectedMemberContext.tsx), [trainerScope.ts](/Users/abc/projects/GymCRM_V2/frontend/src/pages/member-context/modules/trainerScope.ts)는 trainer/member scoped behavior를 단일 role 전제로 판단한다.
- [auth.test.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/app/auth.test.tsx), [App.test.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/App.test.tsx), 여러 page tests가 단일 role mock shape에 결합돼 있다.

이 상태에서는 백엔드가 `user_roles`를 저장소로 사용해도 프론트는 여전히 다중 역할을 소비하지 못한다. 후속 다중 역할 정책이 실제로 승인되면 auth bootstrap, route access, page gates, member-context reset semantics가 동시에 흔들릴 수 있다.

## Proposed Solution

브레인스토밍에서 확정한 방향은 다음과 같다.

- 프론트 auth 계약은 `primaryRole + roles[]`로 확장한다 (see brainstorm: docs/brainstorms/2026-03-23-frontend-role-model-follow-up-brainstorm.md).
- 실제 인가와 메뉴 노출은 `roles[]`와 `allowedRoles`/`visibleRoles`의 교집합 OR 규칙으로 판단한다 (see brainstorm: docs/brainstorms/2026-03-23-frontend-role-model-follow-up-brainstorm.md).
- `primaryRole`은 표시/정렬/기본 UX 용도에 한정한다 (see brainstorm: docs/brainstorms/2026-03-23-frontend-role-model-follow-up-brainstorm.md).
- 관리자 계정 관리 UI의 `user_roles` 편집 UX는 이번 범위에서 제외한다 (see brainstorm: docs/brainstorms/2026-03-23-frontend-role-model-follow-up-brainstorm.md).
- 구현은 단계적으로 나누어 auth contract -> route guard -> page/member-context -> tests 순으로 전환한다 (see brainstorm: docs/brainstorms/2026-03-23-frontend-role-model-follow-up-brainstorm.md).

### Target Frontend Auth Shape

```ts
type AuthUser = {
  userId: number;
  centerId?: number;
  username: string;
  primaryRole: string;
  roles: string[];
  email?: string;
};
```

원칙:
- 접근 제어: `roles[]`
- 표시/기본 UX: `primaryRole`
- migration bridge 기간에는 내부 helper를 통해 기존 `authUser.role` 사용처를 단계적으로 제거

## Technical Considerations

- React state shape가 바뀌므로 auth bootstrap, mock preset, localStorage/session restore, test fixtures를 함께 다뤄야 한다.
- route access와 sidebar visibility는 중앙 helper로 모아야 페이지별 직접 비교를 줄일 수 있다.
- member-context는 권한 변경뿐 아니라 auth identity key reset semantics에 관여하므로, `primaryRole` 단순 비교로 남기면 stale context가 생길 수 있다.
- mock/live parity를 맞추지 않으면 테스트만 통과하고 실서비스에서 role-set semantics가 어긋날 수 있다.
- 계정 관리 UX는 범위에서 제외하므로 plan과 acceptance criteria에서도 명시적으로 비포함 처리한다.

## Research Findings

### Repo Patterns

- [auth.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/app/auth.tsx)
  - `PrototypeAuthUser.role` 단일 필드와 `AuthTokenResponse.user.roleCode` 단일 응답만 사용한다.
  - runtime preset도 사실상 `jwt-admin` vs `jwt-trainer` 두 분기로 축약돼 있다.
- [routes.ts](/Users/abc/projects/GymCRM_V2/frontend/src/app/routes.ts)
  - route metadata는 이미 role array를 갖지만, 평가 함수는 단일 `role` 하나와만 비교한다.
- [App.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx)
  - shell route access와 sidebar route selection이 `authUser?.role`에 직접 의존한다.
- [useMemberManagementState.ts](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/modules/useMemberManagementState.ts)
  - desk/center-admin 관리 권한을 단일 role 비교로 계산한다.
- [SelectedMemberContext.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/modules/SelectedMemberContext.tsx)
  - auth identity key를 `userId:role`로 계산해 selected member reset에 사용한다.
- [trainerScope.ts](/Users/abc/projects/GymCRM_V2/frontend/src/pages/member-context/modules/trainerScope.ts)
  - mock-mode trainer scope를 `authUser.role === "ROLE_TRAINER"`로 판단한다.

### Institutional Learnings

- 별도의 `docs/solutions/` 기록은 발견되지 않았다.
- 직전 role-storage cutover 산출물 [2026-03-23-role-model-frontend-follow-up-backlog.md](/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-23-role-model-frontend-follow-up-backlog.md) 에서 frontend migration 범위를 auth/navigation, page gates, member/trainer scope, tests로 분리해 inventory를 남겨두었다.
- 기존 role-storage plan [2026-03-23-refactor-role-storage-alignment-with-database-design-plan.md](/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-23-refactor-role-storage-alignment-with-database-design-plan.md) 는 프론트 follow-up을 “consumer-side transition”으로 분리했으므로, 이번 계획은 그 후속으로 읽혀야 한다.

### Research Decision

이 작업은 새로운 프레임워크 도입이 아니라 현재 프론트 권한 소비 계약 정렬 문제다. 브레인스토밍 결정과 로컬 코드 패턴이 충분히 명확하므로 외부 리서치는 생략한다.

## System-Wide Impact

### Interaction Graph

- 로그인/부트스트랩
  - `/api/v1/auth/login` 또는 `/api/v1/auth/me`
  - [auth.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/app/auth.tsx) normalize
  - auth context state 저장
  - [App.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx) route gate 계산
  - [DashboardLayout](/Users/abc/projects/GymCRM_V2/frontend/src/components/layout/DashboardLayout.tsx) sidebar route 표시

- 회원 컨텍스트
  - auth state 변경
  - [SelectedMemberContext.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/modules/SelectedMemberContext.tsx) auth identity key 재계산
  - selected member clear
  - memberships/reservations/lockers/access 화면의 member-context badge와 fallback 영향

- 페이지 capability
  - auth context
  - route allowed/visible role 계산
  - 각 page component의 mutation/read gating
  - mock/live API 호출 가능 범위 결정

### Error Propagation

- auth payload shape mismatch는 대부분 bootstrapping 실패 또는 `authUser` null 처리로 올라온다.
- role helper를 잘못 바꾸면 route access에서 조용히 과도 허용/과도 차단이 생길 수 있다.
- member-context reset key를 잘못 설계하면 사용자가 권한 변경 뒤 이전 selected member를 그대로 유지할 수 있다.

### State Lifecycle Risks

- local storage/runtime preset이 새 shape를 못 읽으면 mock mode에서 오래된 세션 데이터가 깨질 수 있다.
- `primaryRole`과 `roles[]` 사이의 drift를 프론트에서 허용하면 page gate와 표시값이 다른 상태가 될 수 있다.
- 테스트 fixture를 부분적으로만 전환하면 live path와 test path가 서로 다른 auth contract를 보게 된다.

### API Surface Parity

동일한 auth contract를 소비하는 표면:
- login response
- me/bootstrap response
- mock runtime preset users
- test providers에서 주입하는 `authUser`
- route helpers
- page-level role branches

이번 계획은 위 표면을 동시에 정렬하는 것을 목표로 한다.

### Integration Test Scenarios

1. 다중 역할 사용자(`primaryRole=ROLE_CENTER_ADMIN`, `roles=[ROLE_CENTER_ADMIN, ROLE_DESK]`)가 trainers/products/access route에 정상 접근하는지
2. `primaryRole=ROLE_TRAINER`이지만 `roles`에 manager/admin 권한이 함께 있는 경우, route/sidebar/page gate가 `roles[]` 기준으로 동작하는지
3. 동일 `userId`에서 `roles[]`가 바뀌면 selected member context가 적절히 reset되는지
4. mock mode와 live mode 모두에서 auth bootstrap이 같은 auth shape를 노출하는지
5. route metadata와 page-level 직접 비교가 서로 다른 결과를 내지 않는지

## Technical Approach

### Architecture

핵심은 role interpretation을 중앙 helper로 끌어올리고, page/component는 그 helper를 소비하도록 재배선하는 것이다.

추천 구조:

```ts
type AuthUser = {
  userId: number;
  centerId?: number;
  username: string;
  primaryRole: string;
  roles: string[];
  email?: string;
};

function hasAnyRole(authUser: AuthUser | null, expectedRoles: string[]) {
  if (!authUser) return false;
  return expectedRoles.some((role) => authUser.roles.includes(role));
}
```

원칙:
- `authUser.primaryRole` 직접 비교는 최소화
- route/page/member-context는 helper를 통해 `roles[]`를 사용
- `primaryRole`은 label, preset labeling, default UX decision에만 남김

### Implementation Phases

#### Phase 1: Auth Contract Expansion

목표: 프론트 auth state가 `primaryRole + roles[]`를 안정적으로 보유하게 만든다.

작업:
- [auth.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/app/auth.tsx)
  - `PrototypeAuthUser`를 `primaryRole + roles[]` shape로 확장
  - `AuthTokenResponse.user`를 새 payload에 맞게 확장
  - `normalizeLiveUser()`가 `primaryRole`, `roles[]`를 모두 채우도록 변경
  - mock preset users도 동일 shape로 재정의
  - runtime preset과 stored session restore가 새 shape를 읽도록 정리
- auth helper 유틸 추가 여부 결정
  - `hasAnyRole`, `hasRole`, `resolvePrimaryRoleDisplay` 같은 공용 함수로 role 해석 로직 중앙화

성공 기준:
- 모든 auth state consumer가 `authUser.roles`를 안전하게 읽을 수 있음
- mock/live/user session shape가 일관됨
- `primaryRole`과 `roles[]` drift 방지 규칙이 정의됨

#### Phase 2: Route and Sidebar Authorization Semantics

목표: route access와 navigation visibility를 `roles[]` 기반으로 전환한다.

작업:
- [routes.ts](/Users/abc/projects/GymCRM_V2/frontend/src/app/routes.ts)
  - `canAccessShellRoute`, `canSeeShellRoute`, `getSidebarRoutes`, `getDashboardRoutes`가 단일 role 대신 role-set을 받도록 변경
  - `allowedRoles` / `visibleRoles` 판정을 교집합 OR 규칙으로 구현
- [App.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx)
  - route access와 sidebar route 계산에 새 helper/roles[] 전달
- 필요한 경우 route helper 전용 tests 추가

성공 기준:
- route guard와 sidebar visibility가 `roles[]` 기준으로 일치
- `primaryRole`이 달라도 `roles[]`가 같으면 접근 판단이 동일

#### Phase 3: Page Capability Gate Migration

목표: 페이지별 직접 role 비교를 role-set helper 기반으로 치환한다.

작업:
- 우선 대상:
  - [TrainersPage.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/pages/trainers/TrainersPage.tsx)
  - [ProductsPage.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/pages/products/ProductsPage.tsx)
  - [LockersPage.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/pages/lockers/LockersPage.tsx)
  - [CrmPage.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/pages/crm/CrmPage.tsx)
  - [AccessPage.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/pages/access/AccessPage.tsx)
- 각 페이지의 read/mutate/manage flags를 `hasAnyRole` helper로 치환
- 직접 `authUser?.role === ...` 비교를 최소화

성공 기준:
- page-level read/mutate gating이 route-level semantics와 충돌하지 않음
- 다중 역할 사용자에서 capability가 축소 해석되지 않음

#### Phase 4: Member Context and Trainer Scope Migration

목표: trainer/member scoped behavior를 role-set semantics로 전환한다.

작업:
- [useMemberManagementState.ts](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/modules/useMemberManagementState.ts)
  - 관리 가능 권한 계산을 role-set helper로 변경
- [trainerScope.ts](/Users/abc/projects/GymCRM_V2/frontend/src/pages/member-context/modules/trainerScope.ts)
  - trainer 판정을 `roles[]` 기준으로 변경
- [SelectedMemberContext.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/modules/SelectedMemberContext.tsx)
  - auth identity key를 `userId + effective role set` 기준으로 재설계
  - 단순 `userId:role` 문자열 대신 role-set 정렬/직렬화 기준 확정
- member-context를 소비하는 reservations/memberships/lockers/access 흐름이 새 reset semantics 아래에서 유지되는지 검증

성공 기준:
- 권한 집합이 바뀌면 selected member context가 적절히 reset
- trainer-scoped member filtering이 role-set 기준으로 유지
- related pages의 member context badge/fallback이 깨지지 않음

#### Phase 5: Mock/Live Parity and Test Migration

목표: 테스트와 mock data가 새 auth contract를 정확히 반영하게 만든다.

작업:
- [auth.test.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/app/auth.test.tsx)
  - login/me bootstrap assertions를 `primaryRole + roles[]` 기준으로 업데이트
- [App.test.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/App.test.tsx)
  - route access/redirect tests를 새 semantics로 업데이트
- role-dependent page tests 정리
  - trainers/products/crm/lockers/access/members 관련 auth fixtures 갱신
- mock auth payload와 runtime preset parity 재확인

성공 기준:
- mock/live auth contract mismatch 없음
- route/page/member-context 관련 테스트가 새 semantics를 설명 가능하게 검증

## Alternative Approaches Considered

### 1. `roles[]` only

장점:
- 개념적으로 가장 단순하다.

기각 이유:
- 기존 UI/mock/test 전제를 너무 많이 한 번에 깨뜨린다.
- 브레인스토밍에서 점진 전환을 위해 `primaryRole + roles[]`를 선택했다 (see brainstorm: docs/brainstorms/2026-03-23-frontend-role-model-follow-up-brainstorm.md).

### 2. Keep `authUser.role` as primary contract and add `roles[]` as secondary metadata

장점:
- 초기 변경량이 작다.

기각 이유:
- role-set 기반 전환이 계속 지연될 가능성이 높다.
- 현재 follow-up의 목적이 “multi-role consumer transition”인데, 계약 중심이 여전히 단일 role이면 효과가 제한적이다 (see brainstorm: docs/brainstorms/2026-03-23-frontend-role-model-follow-up-brainstorm.md).

### 3. Include admin account role-editing UX in the same effort

장점:
- 사용자 관점에서는 다중 역할 소비와 편집 UX를 한 번에 맞출 수 있다.

기각 이유:
- 브레인스토밍에서 범위 분리로 결정했다.
- 권한 소비자 전환과 권한 편집 기능 확장은 성격이 다르다 (see brainstorm: docs/brainstorms/2026-03-23-frontend-role-model-follow-up-brainstorm.md).

## Acceptance Criteria

### Functional Requirements

- [x] 프론트 auth state가 `primaryRole + roles[]`를 저장하고 소비한다
- [x] route/sidebar visibility와 route access가 `roles[]` 교집합 OR 규칙으로 동작한다
- [x] page-level capability gating이 단일 role 비교 대신 role-set helper를 사용한다
- [x] member-context trainer scope와 selected-member reset semantics가 role-set 기반으로 동작한다
- [x] 관리자 계정 관리의 `user_roles` 편집 UX는 이번 계획 범위에 포함되지 않는다

### Non-Functional Requirements

- [x] mock/live auth payload parity가 유지된다
- [x] role interpretation helper가 중복 비교 로직을 줄인다
- [x] `primaryRole`과 `roles[]`가 서로 다른 의미를 가져도 drift 없이 설명 가능하다

### Quality Gates

- [x] `frontend` auth and route tests pass
- [x] role-dependent page tests pass
- [x] member-context 관련 regression tests pass
- [x] backlog/notes 문서와 실제 구현 범위가 일치한다

## Success Metrics

- 새 auth contract 도입 후 `authUser.role` 직접 비교 사용처가 중앙 helper 또는 최소 예외 지점으로 줄어든다
- 다중 역할 mock user를 주입한 route/page tests가 기대대로 통과한다
- route access와 page capability gate가 같은 user role set에 대해 같은 결론을 낸다

## Dependencies & Risks

### Dependencies

- 백엔드 auth response가 `primaryRole + roles[]`를 노출해야 한다
- mock mode/runtime preset shape가 backend live shape와 정렬돼야 한다

### Risks

- 백엔드 응답 확장 전 프론트를 먼저 바꾸면 bootstrap 호환성 문제가 생길 수 있다
- 일부 페이지가 직접 role 비교를 남기면 route access와 page capability가 불일치할 수 있다
- selected member reset key를 잘못 설계하면 권한 전환 시 stale context가 남을 수 있다

### Mitigations

- Phase 1에서 auth contract adapter를 먼저 도입하고 compatibility path를 짧게 유지
- `rg "authUser\\.role|role ===|role !=="` 기준으로 직접 비교 사용처를 점검
- member-context regression tests를 Phase 4와 함께 추가

## Documentation Plan

- 이 계획 문서를 implementation source of truth로 사용
- 후속 구현 중 범위가 바뀌면 [2026-03-23-role-model-frontend-follow-up-backlog.md](/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-23-role-model-frontend-follow-up-backlog.md) inventory를 같이 업데이트
- 계정 관리 UX가 별도 workstream으로 시작되면 별도의 brainstorm/plan 문서 생성

## Sources & References

### Origin

- **Brainstorm document:** [2026-03-23-frontend-role-model-follow-up-brainstorm.md](/Users/abc/projects/GymCRM_V2/docs/brainstorms/2026-03-23-frontend-role-model-follow-up-brainstorm.md)
  - carried-forward decisions:
  - `primaryRole + roles[]` contract
  - `roles[]` 교집합 OR 인가 규칙
  - admin role-edit UX 범위 분리
  - 단계적 전환

### Internal References

- [2026-03-23-role-model-frontend-follow-up-backlog.md](/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-23-role-model-frontend-follow-up-backlog.md)
- [2026-03-23-refactor-role-storage-alignment-with-database-design-plan.md](/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-23-refactor-role-storage-alignment-with-database-design-plan.md)
- [auth.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/app/auth.tsx)
- [routes.ts](/Users/abc/projects/GymCRM_V2/frontend/src/app/routes.ts)
- [App.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx)
- [useMemberManagementState.ts](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/modules/useMemberManagementState.ts)
- [SelectedMemberContext.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/modules/SelectedMemberContext.tsx)
- [trainerScope.ts](/Users/abc/projects/GymCRM_V2/frontend/src/pages/member-context/modules/trainerScope.ts)
