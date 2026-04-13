---
title: "refactor: Remove ROLE_CENTER_ADMIN and consolidate center manager role"
type: refactor
status: completed
date: 2026-04-10
origin: docs/brainstorms/2026-03-23-role-model-alignment-with-database-design-brainstorm.md
---

# refactor: Remove ROLE_CENTER_ADMIN and consolidate center manager role

## Overview

현재 코드베이스는 문서상 canonical 역할을 `ROLE_MANAGER`로 정리했지만, 실제 런타임에는 `ROLE_CENTER_ADMIN`이 여전히 남아 있다. 이번 작업은 `ROLE_CENTER_ADMIN`을 완전히 제거하고 센터 매니저 역할을 `ROLE_MANAGER` 하나로 수렴시키는 컷오버 리팩터다.

이번 범위는 문서 재정리가 아니라 실제 동작 정렬에 초점을 둔다. 저장 데이터, Spring Security policy, auth validation, backend 서비스 분기, frontend route gating, 테스트 fixture까지 한 번에 정리해 더 이상 `ROLE_CENTER_ADMIN`이 허용되지 않는 상태를 목표로 한다.

## Problem Frame

브레인스토밍에서 센터 매니저의 canonical role을 `ROLE_MANAGER`로 확정했고 `ROLE_CENTER_ADMIN`은 제거하기로 결정했다 (see origin: `docs/brainstorms/2026-03-23-role-model-alignment-with-database-design-brainstorm.md`). 하지만 현재 구현은 여전히 다음과 같은 이중 상태를 갖고 있다.

- `roles` seed와 migration validation이 `ROLE_CENTER_ADMIN`을 허용한다.
- `AccessPolicies`, `OpenApiConfig`, `SecurityConfig`가 `CENTER_ADMIN` 이름을 보안 경계에 포함한다.
- 여러 서비스와 controller가 `ROLE_CENTER_ADMIN`을 직접 비교하거나 해당 policy 상수 이름을 사용한다.
- frontend auth mock state, routes, 화면 gating, 테스트 fixture가 `ROLE_CENTER_ADMIN`을 중심으로 작성되어 있다.

이 상태를 두면 문서와 런타임 권한 모델이 다시 어긋나고, 이후 역할 확장이나 관리자 권한 정리가 계속 `CENTER_ADMIN`/`MANAGER` 이중 네이밍 문제를 되풀이하게 된다.

## Requirements Trace

- R1. 센터 매니저의 canonical runtime role은 `ROLE_MANAGER` 하나만 사용한다.
- R2. `ROLE_CENTER_ADMIN`은 DB seed, auth validation, backend policy, frontend gating, 테스트 fixture에서 제거한다.
- R3. 기존 `ROLE_CENTER_ADMIN` 사용자와 `user_roles` 데이터는 안전하게 `ROLE_MANAGER`로 정규화한다.
- R4. 센터 매니저가 현재 운영 중인 기능 범위, 특히 정산 생성/확정 포함 운영 권한을 유지한다.
- R5. JWT/`/auth/me`/route gating 등 외부 계약은 단일 역할 모델을 유지하면서 role 값만 `ROLE_MANAGER`로 정렬한다.

## Scope Boundaries

- `ROLE_SUPER_ADMIN`, `ROLE_TRAINER`, `ROLE_DESK`의 의미 재정의는 이번 범위에 포함하지 않는다.
- 다중 역할 허용으로의 정책 확장은 이번 계획에 포함하지 않는다.
- 프론트 권한 모델을 배열 중심으로 재설계하지 않는다. 현재 단일 primary role 계약을 유지한다.
- 과거 감사 로그나 이미 생성된 비정형 텍스트 출력물의 role 문구까지 일괄 재기록하지 않는다.

## Context & Research

### Relevant Code and Patterns

- `backend/src/main/resources/db/migration/V24__create_roles_and_user_roles.sql`
  - 역할 카탈로그 seed와 `user_roles` backfill의 기준점이다.
- `backend/src/test/java/com/gymcrm/auth/RoleStorageMigrationIntegrationTest.java`
  - canonical roles seed와 1인 1역할 invariant를 검증하는 기존 migration safety test다.
- `backend/src/main/java/com/gymcrm/common/security/AccessPolicies.java`
  - 대부분의 backend 권한 체크가 이 상수 집합을 경유한다.
- `backend/src/main/java/com/gymcrm/common/config/OpenApiConfig.java`
  - 보안 정책명을 OpenAPI role matrix로 다시 노출하므로 policy rename과 같이 정리해야 한다.
- `backend/src/main/java/com/gymcrm/common/auth/repository/AuthUserRepository.java`
  - 현재 단일 primary role projection을 유지하는 auth persistence path다.
- `frontend/src/app/auth.tsx`
  - auth bootstrap mock/default state가 role fixture를 제공한다.
- `frontend/src/app/routes.ts`
  - 화면 노출/접근 가능 role matrix의 중심 파일이다.

### Institutional Learnings

- `docs/plans/2026-03-23-refactor-role-storage-alignment-with-database-design-plan.md`
  - 역할 저장 구조를 `roles` + `user_roles`로 바꾼 이후에도 runtime role contract는 단일 role string으로 유지하는 방향을 이미 정리했다.
- `docs/brainstorms/2026-03-23-role-model-alignment-with-database-design-brainstorm.md`
  - 센터 매니저의 canonical role을 `ROLE_MANAGER`로 정하고 `ROLE_CENTER_ADMIN` 제거를 명시했다.

### External References

- 없음. 이번 작업은 외부 베스트 프랙티스보다 현재 repo의 role contract, migration safety, auth 경계 정리가 핵심이다.

## Key Technical Decisions

- 기존 applied migration은 수정하지 않고 새 forward migration으로 `ROLE_CENTER_ADMIN` 제거를 수행한다.
  - 이유: 이미 적용된 migration을 재작성하면 환경별 drift 위험이 커진다. 현재 데이터 상태를 안전하게 정규화하는 새 migration이 더 안전하다.

- 단일 역할 계약은 유지하고 primary role 값만 `ROLE_MANAGER`로 통일한다.
  - 이유: JWT, auth response, frontend state, route guard가 모두 단일 역할 전제를 사용하고 있어 이번 작업을 alias 제거에 집중할 수 있다.

- backend policy 상수도 `CENTER_ADMIN` 중심 이름을 버리고 `MANAGER` 중심 이름으로 재명명한다.
  - 이유: 허용 role만 바꾸고 상수 이름을 남겨두면 읽는 사람이 여전히 `CENTER_ADMIN` 개념이 살아 있다고 오해한다.

- 센터 매니저의 현재 운영 범위는 유지하며, 정산 create/confirm도 `ROLE_MANAGER`가 담당한다.
  - 이유: 문서에서 센터 매니저를 canonical 운영 역할로 정리했고, 최근 API 설계서도 정산 생성/확정에 `MANAGER`를 포함하도록 맞춰 두었다.

## Open Questions

### Resolved During Planning

- `ROLE_CENTER_ADMIN`을 alias로 일정 기간 남길지?
  - 결론: 아니다. 이번 작업의 목표는 완전 제거다.

- 기존 센터 관리자 계정은 어떤 role로 수렴할지?
  - 결론: 모두 `ROLE_MANAGER`로 정규화한다.

- 기존 센터 관리자 권한 범위는 줄일지 유지할지?
  - 결론: 의미상 센터 매니저가 담당하던 운영 범위는 `ROLE_MANAGER`로 그대로 승계한다.

### Deferred to Implementation

- production/개발 데이터에 `ROLE_CENTER_ADMIN`과 `ROLE_MANAGER`가 같은 사용자에게 동시에 매핑된 예외 케이스가 있는지
  - 이유: 새 migration에서 dedupe 규칙으로 해결해야 하지만, 실제 데이터 분포는 execution 시점 쿼리 확인이 필요하다.

- Dev/admin bootstrap 계정의 초기 login id나 seed naming을 함께 바꿀지
  - 이유: 기능 동작과 직접 무관하며, naming cleanup은 구현 중 파급 범위를 보고 결정하는 편이 낫다.

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

| Surface | Current | Target |
|---|---|---|
| Roles catalog | `ROLE_CENTER_ADMIN`, `ROLE_MANAGER` 공존 | `ROLE_MANAGER`만 센터 매니저로 유지 |
| `user_roles` data | 일부 사용자가 `ROLE_CENTER_ADMIN` 보유 | 기존 매핑을 `ROLE_MANAGER`로 정규화 |
| Backend policies | `PROTOTYPE_OR_CENTER_ADMIN*` 계열 | `PROTOTYPE_OR_MANAGER*` 계열 |
| Auth validation | `ROLE_CENTER_ADMIN` 허용 | `ROLE_MANAGER`만 허용 |
| Frontend gating | `ROLE_CENTER_ADMIN` fixture/route 노출 | `ROLE_MANAGER` fixture/route 노출 |

## Implementation Units

- [x] **Unit 1: Normalize persisted roles and remove the old catalog entry**

**Goal:** 저장된 역할 데이터에서 `ROLE_CENTER_ADMIN`을 제거하고 모든 센터 매니저 사용자를 `ROLE_MANAGER`로 정규화한다.

**Requirements:** R1, R2, R3

**Dependencies:** None

**Files:**
- Create: `backend/src/main/resources/db/migration/V37__remove_role_center_admin_and_align_manager.sql`
- Modify: `backend/src/test/java/com/gymcrm/auth/RoleStorageMigrationIntegrationTest.java`

**Approach:**
- 새 forward migration에서 `roles` 테이블의 `ROLE_CENTER_ADMIN` row를 기준으로 기존 `user_roles`를 `ROLE_MANAGER`에 재매핑한다.
- 같은 사용자가 이미 `ROLE_MANAGER`도 가지고 있다면 충돌 없이 하나의 `user_roles`만 남기도록 dedupe 규칙을 둔다.
- 정규화가 끝난 뒤 `ROLE_CENTER_ADMIN` catalog row를 삭제하고, 더 이상 runtime seed에 나타나지 않도록 한다.
- 과거 `V6`/`V16`/`V23` 같은 applied migration은 수정하지 않는다. 현재 상태를 수렴시키는 새 migration만 추가한다.
- `RoleStorageMigrationIntegrationTest`의 canonical roles assertion은 **역전** 방향으로 수정한다. 기존 테스트가 `ROLE_CENTER_ADMIN`을 허용 목록에 포함해 통과하는 구조라면, migration 후에는 `roles` 카탈로그에 `ROLE_CENTER_ADMIN`이 **존재하지 않음**을 단언하도록 assertion을 바꿔 제거 검증으로 전환한다.

**Patterns to follow:**
- `backend/src/main/resources/db/migration/V24__create_roles_and_user_roles.sql`
- `backend/src/main/resources/db/migration/V25__drop_users_role_code.sql`
- `backend/src/test/java/com/gymcrm/auth/RoleStorageMigrationIntegrationTest.java`

**Test scenarios:**
- Happy path: 기존 `ROLE_CENTER_ADMIN` 매핑만 가진 사용자가 migration 후 `ROLE_MANAGER` 하나만 가진다.
- Edge case: 동일 사용자가 `ROLE_CENTER_ADMIN`과 `ROLE_MANAGER`를 모두 가진 상태에서도 migration 후 `user_roles`가 중복 없이 1개만 남는다.
- Error path: `ROLE_MANAGER` catalog row가 없거나 role 정규화 전제가 깨진 상태라면 migration이 fail-fast 한다.
- Integration: migration 적용 후 canonical roles seed 검증이 `ROLE_MANAGER`만 포함하고 `ROLE_CENTER_ADMIN`은 포함하지 않는다.

**Verification:**
- migration 적용 후 active user마다 정확히 하나의 `user_roles` row가 존재한다.
- `roles.role_code` 목록에 `ROLE_CENTER_ADMIN`이 남지 않는다.

- [x] **Unit 2: Remove `CENTER_ADMIN` from backend auth and security contracts**

**Goal:** Spring Security, auth validation, OpenAPI role matrix, 운영 bootstrap이 더 이상 `ROLE_CENTER_ADMIN`을 허용하지 않도록 정리한다.

**Requirements:** R1, R2, R4, R5

**Dependencies:** Unit 1

**Files:**
- Modify: `backend/src/main/java/com/gymcrm/common/security/AccessPolicies.java`
- Modify: `backend/src/main/java/com/gymcrm/common/config/OpenApiConfig.java`
- Modify: `backend/src/main/java/com/gymcrm/common/config/SecurityConfig.java`
- Modify: `backend/src/main/java/com/gymcrm/common/auth/controller/AuthController.java`
- Modify: `backend/src/main/java/com/gymcrm/common/auth/service/AuthAccessRevocationService.java`
- Modify: `backend/src/main/java/com/gymcrm/common/auth/bootstrap/DevAdminUserSeeder.java`
- Test: `backend/src/test/java/com/gymcrm/auth/AuthControllerIntegrationTest.java`
- Test: `backend/src/test/java/com/gymcrm/auth/RbacAuthorizationIntegrationTest.java`
- Test: `backend/src/test/java/com/gymcrm/auth/ActuatorSecurityIntegrationTest.java`
- Test: `backend/src/test/java/com/gymcrm/common/config/OpenApiExposureIntegrationTest.java`

**Approach:**
- `PROTOTYPE_OR_CENTER_ADMIN*` 계열 상수를 `MANAGER` 중심 이름으로 재정의하고 모든 허용 role 목록에서 `CENTER_ADMIN`을 제거한다.
- OpenAPI role matrix와 request validation regex도 같은 값 집합으로 맞춰 문서/런타임 drift를 막는다.
- Dev bootstrap과 access revocation 허용 role 목록을 `ROLE_MANAGER` 기준으로 정리한다.
- **`SecurityConfig`의 actuator/prometheus 엔드포인트**: 현재 `.hasAnyRole("CENTER_ADMIN")` 단독 규칙으로 되어 있다. 이번 작업에서 `MANAGER` 승계를 기본값으로 하되, 운영 메트릭 노출 범위를 `SUPER_ADMIN`으로만 제한할지 여부를 구현 시점에 명시적으로 결정하고 코드 주석으로 의도를 남긴다. 기본값: `.hasAnyRole("SUPER_ADMIN", "MANAGER")`.

**Execution note:** 기존 auth/RBAC integration test를 먼저 characterization coverage로 보강한 뒤 policy rename을 반영한다.

**Patterns to follow:**
- `backend/src/main/java/com/gymcrm/common/security/AccessPolicies.java`
- `backend/src/main/java/com/gymcrm/common/config/OpenApiConfig.java`
- `backend/src/test/java/com/gymcrm/auth/RbacAuthorizationIntegrationTest.java`

**Test scenarios:**
- Happy path: `ROLE_MANAGER` 사용자는 기존 센터 관리자와 동일한 protected endpoint 집합에 접근할 수 있다.
- Error path: `ROLE_CENTER_ADMIN` claim 또는 요청값은 더 이상 허용되지 않고 validation/authorization에서 거부된다.
- Edge case: prototype mode에서는 no-auth 동작이 유지되면서 policy rename으로 인한 regressions가 없다.
- Integration: `/api/v1/auth/me` 및 관련 auth endpoint 응답에서 센터 매니저 계정의 primary role이 `ROLE_MANAGER`로 노출된다.

**Verification:**
- backend auth/security code search에서 runtime allowlist로 쓰이는 `ROLE_CENTER_ADMIN`이 제거된다.
- OpenAPI role matrix와 실제 method security 허용 대상이 동일하게 맞춰진다.

- [x] **Unit 3: Clean up backend business-policy callsites**

**Goal:** 서비스와 controller 전반의 `ROLE_CENTER_ADMIN` 분기와 `CENTER_ADMIN` 중심 policy 이름을 제거하면서 현재 운영 권한을 `ROLE_MANAGER`로 유지한다.

**Requirements:** R1, R2, R4

**Dependencies:** Unit 2

**Files:**
- Modify: `backend/src/main/java/com/gymcrm/membership/controller/MembershipRefundController.java`
- Modify: `backend/src/main/java/com/gymcrm/membership/controller/MembershipPurchaseController.java`
- Modify: `backend/src/main/java/com/gymcrm/membership/controller/MembershipHoldController.java`
- Modify: `backend/src/main/java/com/gymcrm/product/controller/ProductController.java`
- Modify: `backend/src/main/java/com/gymcrm/access/AccessController.java`
- Modify: `backend/src/main/java/com/gymcrm/access/QrController.java`
- Modify: `backend/src/main/java/com/gymcrm/locker/LockerController.java`
- Modify: `backend/src/main/java/com/gymcrm/settlement/controller/SettlementController.java`
- Modify: `backend/src/main/java/com/gymcrm/settlement/controller/TrainerPayrollSettlementController.java`
- Modify: `backend/src/main/java/com/gymcrm/settlement/controller/SalesDashboardController.java`
- Modify: `backend/src/main/java/com/gymcrm/settlement/controller/SalesSettlementReportController.java`
- Modify: `backend/src/main/java/com/gymcrm/trainer/controller/TrainerController.java`
- Modify: `backend/src/main/java/com/gymcrm/trainer/availability/controller/TrainerAvailabilityController.java`
- Modify: `backend/src/main/java/com/gymcrm/reservation/controller/ReservationController.java`
- Modify: `backend/src/main/java/com/gymcrm/reservation/gx/controller/GxScheduleController.java`
- Modify: `backend/src/main/java/com/gymcrm/member/controller/MemberController.java`
- Modify: `backend/src/main/java/com/gymcrm/audit/AuditLogController.java`
- Modify: `backend/src/main/java/com/gymcrm/integration/ExternalIntegrationActivationController.java`
- Modify: `backend/src/main/java/com/gymcrm/trainer/service/TrainerService.java`
- Modify: `backend/src/main/java/com/gymcrm/trainer/availability/service/TrainerAvailabilityService.java`
- Modify: `backend/src/main/java/com/gymcrm/reservation/service/PtReservationService.java`
- Modify: `backend/src/main/java/com/gymcrm/reservation/gx/service/GxScheduleService.java`
- Modify: `backend/src/main/java/com/gymcrm/membership/service/MembershipHoldService.java`
- Test: `backend/src/test/java/com/gymcrm/trainer/TrainerManagementApiIntegrationTest.java`
- Test: `backend/src/test/java/com/gymcrm/trainer/TrainerAvailabilityApiIntegrationTest.java`
- Test: `backend/src/test/java/com/gymcrm/reservation/ReservationApiIntegrationTest.java`
- Test: `backend/src/test/java/com/gymcrm/reservation/GxScheduleApiIntegrationTest.java`
- Test: `backend/src/test/java/com/gymcrm/product/ProductApiIntegrationTest.java`
- Test: `backend/src/test/java/com/gymcrm/access/AccessApiIntegrationTest.java`
- Test: `backend/src/test/java/com/gymcrm/settlement/TrainerSettlementLifecycleServiceIntegrationTest.java`
- Test: `backend/src/test/java/com/gymcrm/settlement/TrainerPayrollSettlementServiceIntegrationTest.java`
- Test: `backend/src/test/java/com/gymcrm/membership/MembershipHoldServiceTest.java`
- Test: `backend/src/test/java/com/gymcrm/membership/MembershipSchedulerActorGuardTest.java`

**Approach:**
- controller annotation은 새 `MANAGER` 중심 policy 상수를 사용하도록 치환한다.
- 서비스 내부의 direct role comparison은 `ROLE_MANAGER`로 수렴시키고 `ROLE_CENTER_ADMIN` 상수는 제거한다.
- 정산 생성/확정, trainer 관리, 상품 관리, 출입/라커/예약 등 현재 센터 관리자 surface는 모두 `ROLE_MANAGER`가 담당하도록 유지한다.
- `ROLE_SUPER_ADMIN`의 상위 운영 경계는 그대로 유지해 manager consolidation이 super-admin 경계를 희석하지 않도록 한다.

**Patterns to follow:**
- `backend/src/main/java/com/gymcrm/common/auth/repository/AuthUserRepository.java`
- `backend/src/main/java/com/gymcrm/settlement/controller/SettlementController.java`
- `backend/src/test/java/com/gymcrm/trainer/TrainerManagementApiIntegrationTest.java`

**Test scenarios:**
- Happy path: `ROLE_MANAGER` 사용자는 회원/상품/예약/트레이너/정산 API에서 기존 센터 관리자와 동일한 동작을 수행할 수 있다.
- Error path: `ROLE_DESK` 또는 `ROLE_TRAINER`는 manager-only mutation endpoint에 계속 접근할 수 없다.
- Edge case: `ROLE_SUPER_ADMIN`는 기존 상위 권한을 유지하고 manager 전환으로 인해 접근 범위가 줄어들지 않는다.
- Integration: 정산 생성/확정 API가 `ROLE_MANAGER`로 정상 동작하며, 관련 서비스에서 `ROLE_CENTER_ADMIN` 비교가 사라져도 workflow regression이 없다.

**Verification:**
- backend 비즈니스 코드에서 `ROLE_CENTER_ADMIN` direct comparison이 제거된다.
- manager 중심 authorization regression test가 주요 도메인에서 통과한다.

- [x] **Unit 4: Align frontend auth state, route gating, and UI fixtures**

**Goal:** frontend가 `ROLE_MANAGER`만을 센터 매니저 역할로 인식하도록 auth state, routes, 화면 gating, 테스트 fixture를 정리한다.

**Requirements:** R1, R2, R4, R5

**Dependencies:** Unit 2, Unit 3

**Files:**
- Modify: `frontend/src/app/auth.tsx`
- Modify: `frontend/src/app/routes.ts`
- Modify: `frontend/src/pages/dashboard/widgets/dashboardConfig.ts`
- Modify: `frontend/src/pages/access/AccessPage.tsx`
- Modify: `frontend/src/pages/products/ProductsPage.tsx`
- Modify: `frontend/src/pages/trainers/TrainersPage.tsx`
- Modify: `frontend/src/pages/gx-schedules/GxSchedulesPage.tsx`
- Modify: `frontend/src/pages/lockers/LockersPage.tsx`
- Modify: `frontend/src/pages/members/modules/useMemberManagementState.ts`
- Modify: `frontend/src/pages/crm/CrmPage.tsx`
- Modify: `frontend/src/pages/settlements/SettlementsPage.tsx`
- Test: `frontend/src/app/auth.test.tsx`
- Test: `frontend/src/pages/dashboard/widgets/dashboardConfig.test.ts`
- Test: `frontend/src/pages/access/AccessPage.test.tsx`
- Test: `frontend/src/pages/products/ProductsPage.test.tsx`
- Test: `frontend/src/pages/trainers/TrainersPage.test.tsx`
- Test: `frontend/src/pages/gx-schedules/GxSchedulesPage.test.tsx`
- Test: `frontend/src/pages/settlements/SettlementsPage.test.tsx`
- Test: `frontend/src/pages/members/modules/useMemberManagementState.test.tsx`
- Test: `frontend/src/pages/members/modules/SelectedMemberContext.test.tsx`
- Test: `frontend/src/pages/members/components/MemberListSection.test.tsx`

**Approach:**
- auth bootstrap default state와 mock user fixture를 `ROLE_MANAGER`로 교체한다.
- routes와 page-level `hasRole`/`hasAnyRole` gating에서 `ROLE_CENTER_ADMIN`을 제거하고 필요한 곳은 `ROLE_MANAGER` 또는 `ROLE_SUPER_ADMIN` 조합으로 정리한다.
- **주의:** `routes.ts` 외에도 `LockersPage.tsx`와 `CrmPage.tsx`에 page 내부 인라인 `hasAnyRole(authUser, ["ROLE_CENTER_ADMIN", "ROLE_DESK"])` 분기가 존재한다. routes 정리만으로는 제거가 완료되지 않으므로 page 내부 인라인 분기도 함께 수정한다.
- dashboard widget, trainer page, settlements page 등 운영 화면이 manager 권한에서 계속 노출되도록 current behavior를 보존한다.
- 테스트 fixture도 전부 `ROLE_MANAGER`로 맞춰 runtime contract와 동일한 언어를 쓰게 한다.

**Patterns to follow:**
- `frontend/src/app/auth.tsx`
- `frontend/src/app/routes.ts`
- `frontend/src/pages/dashboard/widgets/dashboardConfig.ts`

**Test scenarios:**
- Happy path: `ROLE_MANAGER` 사용자는 기존 센터 관리자와 동일하게 운영 화면과 정산 화면을 볼 수 있다.
- Error path: `ROLE_DESK` 또는 `ROLE_TRAINER`는 manager-only route와 action gating을 우회할 수 없다.
- Edge case: `ROLE_SUPER_ADMIN`를 함께 허용하던 화면은 계속 접근 가능해야 하며 manager 전환으로 노출 조건이 줄어들지 않는다.
- Integration: `/auth/me`에서 `ROLE_MANAGER`를 받은 후 auth store, routes, 페이지 gating이 일관되게 동작한다.

**Verification:**
- frontend code/test fixture search에서 `ROLE_CENTER_ADMIN`이 제거된다.
- 대표 운영 화면의 role gating이 `ROLE_MANAGER` 기준으로 일관되게 정렬된다.

## System-Wide Impact

- **Interaction graph:** migration -> auth repository projection -> JWT/auth response -> Spring Security -> backend service role checks -> frontend auth store -> route/page gating까지 role 값이 연결된다.
- **Error propagation:** migration 정규화가 실패하면 auth login/me와 protected endpoint authorization이 흔들리므로 데이터 정규화 실패는 조용히 무시하지 않고 fail-fast 해야 한다.
- **State lifecycle risks:** 기존 사용자가 `ROLE_CENTER_ADMIN`과 `ROLE_MANAGER`를 동시에 갖는 예외 케이스를 dedupe 없이 처리하면 1인 1역할 invariant가 깨질 수 있다.
- **API surface parity:** `/api/v1/auth/login`, `/api/v1/auth/me`, OpenAPI security metadata, frontend mock auth state가 모두 같은 role vocabulary를 사용해야 한다.
- **Integration coverage:** auth + RBAC + 주요 운영 화면 gating은 단위 테스트만으로는 부족하므로 migration/integration/UI fixture 검증이 모두 필요하다.
- **Unchanged invariants:** 단일 primary role contract, `ROLE_SUPER_ADMIN` 상위 경계, `ROLE_TRAINER`/`ROLE_DESK` 역할 의미는 이번 작업에서 바꾸지 않는다.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| 데이터 정규화 중 `ROLE_CENTER_ADMIN`/`ROLE_MANAGER` 중복 매핑이 남아 unique 제약 또는 권한 해석이 꼬일 수 있음 | migration에서 dedupe를 명시하고 `RoleStorageMigrationIntegrationTest`로 active user 1역할 invariant를 재검증한다 |
| policy 이름만 바꾸고 일부 controller/service 분기가 남아 runtime authorization이 일관되지 않을 수 있음 | `rg` 기반 잔재 제거를 완료 기준에 포함하고 auth/RBAC + 주요 도메인 integration test를 함께 갱신한다 |
| frontend fixture가 뒤늦게 깨져 CI에서 대량 실패가 발생할 수 있음 | auth, routes, dashboard, settlements, trainers, members 계열 테스트를 같은 delivery unit에서 함께 갱신한다 |
| manager로 권한을 수렴하면서 super-admin 경계까지 흐려질 수 있음 | `ROLE_SUPER_ADMIN` 관련 allowlist는 별도 유지하고, manager는 기존 center-admin 범위만 승계하도록 테스트로 고정한다 |

## Documentation / Operational Notes

- 현재 작업 트리에 반영된 `docs/03_데이터베이스_설계서.md`, `docs/04_API_설계서.md`, `docs/brainstorms/2026-03-23-role-model-alignment-with-database-design-brainstorm.md` 정리는 이 구현의 선행 문서 정렬로 간주한다.
- 구현 완료 후에는 role vocabulary 변경이 반영된 API/운영 스크린샷 또는 테스트 evidence를 남겨 팀 내 혼선을 줄이는 편이 좋다.
- 개발/운영 환경에 남아 있는 센터 관리자 계정은 migration 이후 모두 `ROLE_MANAGER`로 보여야 하므로, 운영 확인 시 login/me 응답과 주요 운영 화면 접근을 함께 점검한다.

## Sources & References

- **Origin document:** `docs/brainstorms/2026-03-23-role-model-alignment-with-database-design-brainstorm.md`
- Related plan: `docs/plans/2026-03-23-refactor-role-storage-alignment-with-database-design-plan.md`
- Related code: `backend/src/main/resources/db/migration/V24__create_roles_and_user_roles.sql`
- Related code: `backend/src/main/java/com/gymcrm/common/security/AccessPolicies.java`
- Related code: `backend/src/main/java/com/gymcrm/common/config/OpenApiConfig.java`
- Related code: `frontend/src/app/routes.ts`
