# Role Model Frontend Follow-up Backlog

- Date: 2026-03-23
- Source plan: [2026-03-23-refactor-role-storage-alignment-with-database-design-plan.md](/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-23-refactor-role-storage-alignment-with-database-design-plan.md)
- Scope: deferred frontend work after backend/DB/JWT role-storage alignment

## Why This Is Deferred

이번 단계의 목표는 저장 구조를 `roles` + `user_roles`로 옮기면서도 런타임 계약은 단일 `roleCode`로 유지하는 것이다. 따라서 프론트는 현재 `authUser.role` 단일 값 계약을 그대로 사용하고, 다중 역할을 전제로 한 상태/route/auth 모델 재설계는 후속 작업으로 분리한다.

## Backlog Items

1. `authUser.role` 단일 문자열 계약을 `roles[]` 또는 richer auth payload로 확장할지 결정한다.
2. [auth.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/app/auth.tsx) bootstrap/type을 다중 역할 또는 primary-role + secondary-role 구조를 수용하도록 재설계한다.
3. [routes.ts](/Users/abc/projects/GymCRM_V2/frontend/src/app/routes.ts)의 `allowedRoles` / `visibleRoles` 평가가 단일 값 비교가 아니라 role-set 평가를 지원하도록 바꾼다.
4. 관리자 계정 관리 UI에서 `user_roles` 구조를 직접 편집할 수 있는 UX가 필요한지 결정한다.
5. mock/live auth payload parity를 다시 정의하고 관련 프론트 테스트를 보강한다.

## Current Rule Until Follow-up

- 프론트는 계속 단일 `authUser.role`만 사용한다.
- 백엔드는 `user_roles`를 저장소로 사용하되, 단일 effective role만 응답/JWT claim으로 노출한다.
- 다중 역할이 실제 제품 정책으로 승인되기 전까지 프론트는 role-set semantics를 가정하지 않는다.
