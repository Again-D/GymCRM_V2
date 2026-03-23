# Role Model Frontend Follow-up Backlog

- Date: 2026-03-23
- Source plan: [2026-03-23-refactor-role-storage-alignment-with-database-design-plan.md](/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-23-refactor-role-storage-alignment-with-database-design-plan.md)
- Scope: deferred frontend work after backend/DB/JWT role-storage alignment

## Why This Is Deferred

이번 단계의 목표는 저장 구조를 `roles` + `user_roles`로 옮기면서도 런타임 계약은 단일 `roleCode`로 유지하는 것이다. 따라서 프론트는 현재 `authUser.role` 단일 값 계약을 그대로 사용하고, 다중 역할을 전제로 한 상태/route/auth 모델 재설계는 후속 작업으로 분리한다.

## Backlog Items

1. `authUser.role` 단일 문자열 계약을 `roles[]` 또는 richer auth payload로 확장할지 결정한다.
2. [auth.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/app/auth.tsx) bootstrap/type과 runtime preset 모델을 다중 역할 또는 primary-role + secondary-role 구조를 수용하도록 재설계한다.
3. [routes.ts](/Users/abc/projects/GymCRM_V2/frontend/src/app/routes.ts)와 [App.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx)의 `allowedRoles` / `visibleRoles` / route access 평가가 단일 값 비교가 아니라 role-set 평가를 지원하도록 바꾼다.
4. 페이지별 capability gate를 role-set semantics에 맞게 재정의한다. 최소 대상은 [TrainersPage.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/pages/trainers/TrainersPage.tsx), [ProductsPage.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/pages/products/ProductsPage.tsx), [LockersPage.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/pages/lockers/LockersPage.tsx), [CrmPage.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/pages/crm/CrmPage.tsx), [AccessPage.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/pages/access/AccessPage.tsx)다.
5. 회원/트레이너 스코프와 auth identity reset 로직을 role-set 기준으로 재설계한다. 최소 대상은 [useMemberManagementState.ts](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/modules/useMemberManagementState.ts), [SelectedMemberContext.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/modules/SelectedMemberContext.tsx), [trainerScope.ts](/Users/abc/projects/GymCRM_V2/frontend/src/pages/member-context/modules/trainerScope.ts)다.
6. 관리자 계정 관리 UI에서 `user_roles` 구조를 직접 편집할 UX가 필요한지 결정하고, 필요하다면 primary role/secondary roles 편집 정책까지 정의한다.
7. mock/live auth payload parity를 다시 정의하고 관련 프론트 테스트를 보강한다. 특히 [auth.test.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/app/auth.test.tsx), [App.test.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/App.test.tsx), role-dependent page tests를 같이 정리한다.

## Implementation Inventory

### Shared auth and navigation

- [auth.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/app/auth.tsx): auth bootstrap payload, mock preset, stored session shape, live user normalization
- [routes.ts](/Users/abc/projects/GymCRM_V2/frontend/src/app/routes.ts): sidebar visibility, route access, allowed/visible role evaluation
- [App.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx): route redirect and shell access enforcement

### Page-level capability gates

- [TrainersPage.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/pages/trainers/TrainersPage.tsx): super admin, center admin, desk 권한 분기
- [ProductsPage.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/pages/products/ProductsPage.tsx): read/mutate capability gate
- [LockersPage.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/pages/lockers/LockersPage.tsx): live read capability gate
- [CrmPage.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/pages/crm/CrmPage.tsx): live read capability gate
- [AccessPage.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/pages/access/AccessPage.tsx): live read capability gate

### Member and trainer scoped behavior

- [useMemberManagementState.ts](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/modules/useMemberManagementState.ts): 데스크/센터 관리자 여부 판단
- [SelectedMemberContext.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/modules/SelectedMemberContext.tsx): auth identity 변경 시 selected member reset 기준
- [trainerScope.ts](/Users/abc/projects/GymCRM_V2/frontend/src/pages/member-context/modules/trainerScope.ts): 트레이너 한정 member access semantics

### Tests that assume a single role string

- [auth.test.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/app/auth.test.tsx)
- [App.test.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/App.test.tsx)
- members/trainers/products/crm/lockers/access 관련 role-dependent tests

## Suggested Follow-up Workstreams

1. Auth payload and state contract
2. Route/sidebar authorization semantics
3. Page capability and mutation/read gating
4. Member-context trainer scope and reset behavior
5. Mock/live parity and frontend test refresh

## Current Rule Until Follow-up

- 프론트는 계속 단일 `authUser.role`만 사용한다.
- 백엔드는 `user_roles`를 저장소로 사용하되, 단일 effective role만 응답/JWT claim으로 노출한다.
- 다중 역할이 실제 제품 정책으로 승인되기 전까지 프론트는 role-set semantics를 가정하지 않는다.
- 이 문서에 적힌 inventory는 후속 전환 범위를 축소 해석하지 않기 위한 최소 목록이며, 구현 시작 시 최신 `authUser.role` 사용처를 다시 grep해서 보강한다.
