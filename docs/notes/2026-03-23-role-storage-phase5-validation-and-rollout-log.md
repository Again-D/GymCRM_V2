# Phase 5 Validation and Rollout Safety Log

- Date: 2026-03-23
- Scope: `docs/plans/2026-03-23-refactor-role-storage-alignment-with-database-design-plan.md` Phase 5
- Branch: `codex/plan-role-model-alignment`

## Objective

`users.role_code` 기반 권한 저장 구조를 `roles` + `user_roles`로 전환한 뒤에도 인증, JWT, RBAC, trainer flow가 기존 계약을 유지하는지 검증하고, 배포 후 이상 징후를 빠르게 감지할 수 있는 운영 확인 기준을 남긴다.

## Current Status

- Phase 5는 독립 실행 단계가 아니다.
- 현재 브랜치에는 `user_roles` 참조 코드가 일부 들어와 있지만, 이를 뒷받침하는 DB migration과 fixture 정리가 아직 완료되지 않았다.
- 따라서 이번 문서는 "즉시 실행 가능한 검증 체크리스트"와 "배포 후 관찰 기준"을 먼저 고정하는 용도다.
- 2026-03-23 기준 현재 확인 완료:
  - `AuthControllerIntegrationTest`
  - `AuthOperationalAccessRevokeIntegrationTest`
  - `RbacAuthorizationIntegrationTest`
  - `TrainerManagementApiIntegrationTest`
  - `RoleStorageMigrationIntegrationTest`
  - `frontend/src/App.test.tsx`
  - `cd backend && ./gradlew test`
  - 핵심 회귀/검증 스위트와 전체 backend test suite는 `roles` / `user_roles` 기반 migration 추가와 auth fixture 정리 후 통과했다.

## Verification Checklist

### 1. Migration / Cutover

- legacy `users.role_code` 데이터가 canonical role catalog로 전부 매핑되는지 확인한다.
- 모든 활성 사용자에 대해 `user_roles`가 정확히 1건인지 확인한다.
- unknown role, duplicate mapping, orphaned user가 있으면 migration은 실패해야 한다.
- `users.role_code` 제거 이후에도 auth query path가 fallback 없이 동작해야 한다.

예상 검증 SQL:

```sql
SELECT u.user_id, u.login_id
FROM users u
LEFT JOIN user_roles ur ON ur.user_id = u.user_id
WHERE u.is_deleted = FALSE
GROUP BY u.user_id, u.login_id
HAVING COUNT(ur.user_role_id) <> 1;
```

```sql
SELECT r.role_name, COUNT(*)
FROM user_roles ur
JOIN roles r ON r.role_id = ur.role_id
GROUP BY r.role_name
ORDER BY r.role_name;
```

### 2. Auth / JWT Contract

- `/api/v1/auth/login`이 기존처럼 단일 `roleCode`를 반환하는지 확인한다.
- `/api/v1/auth/refresh`가 rotation/replay 차단을 유지하는지 확인한다.
- `/api/v1/auth/me`가 기존과 동일한 사용자/센터/단일 역할 계약을 유지하는지 확인한다.
- stale token이 role 변경 또는 revoke 이후 거부되는지 확인한다.

핵심 테스트 대상:

- `com.gymcrm.auth.AuthControllerIntegrationTest`
- `com.gymcrm.auth.AuthOperationalAccessRevokeIntegrationTest`
- `com.gymcrm.auth.AuthAccessRevokeAfterIntegrationTest`

### 3. RBAC Boundaries

- `ROLE_SUPER_ADMIN`
- `ROLE_CENTER_ADMIN`
- `ROLE_MANAGER`
- `ROLE_DESK`
- `ROLE_TRAINER`

각 역할이 기존과 동일한 API surface만 허용하는지 확인한다.

핵심 테스트 대상:

- `com.gymcrm.auth.RbacAuthorizationIntegrationTest`

### 4. Trainer Regression

- trainer list/create/update/status flow가 role storage 전환 이후에도 유지되는지 확인한다.
- membership assigned trainer validation과 reservation/member 조회 권한이 기존과 동일한지 확인한다.

핵심 테스트 대상:

- `com.gymcrm.trainer.TrainerManagementApiIntegrationTest`
- `com.gymcrm.membership.MembershipPurchaseServiceIntegrationTest`
- `com.gymcrm.reservation.ReservationApiIntegrationTest`
- `com.gymcrm.member.MemberSummaryApiIntegrationTest`

### 5. Fixture / Seeder Audit

- `role_code` 직접 insert/update fixture를 전부 찾아서 `roles`/`user_roles` 기준으로 전환한다.
- `DevAdminUserSeeder`가 새 구조에서 JWT 모드 계정을 정상 시드하는지 확인한다.
- historical migration fixture 외 runtime fixture에서 `users.role_code`를 더 이상 쓰지 않아야 한다.

현재 우선 감사 대상:

- `backend/src/test/java/com/gymcrm/auth`
- `backend/src/test/java/com/gymcrm/trainer`
- `backend/src/test/java/com/gymcrm/membership`
- `backend/src/test/java/com/gymcrm/reservation`
- `backend/src/test/java/com/gymcrm/member`
- `backend/src/test/java/com/gymcrm/access`
- `backend/src/main/java/com/gymcrm/auth/bootstrap/DevAdminUserSeeder.java`

## Post-Deploy Monitoring & Validation

### What to Monitor

- Logs
  - `AUTHENTICATION_FAILED`
  - `TOKEN_INVALID`
  - `TOKEN_REVOKED`
  - `ACCESS_DENIED`
  - `user_roles`
  - `roles`
- Metrics / dashboards
  - auth 401/403 rate
  - `/api/v1/auth/login`, `/api/v1/auth/refresh`, `/api/v1/auth/me` 5xx rate
  - trainer-related 4xx/5xx rate

### Expected Healthy Signals

- 로그인/리프레시 성공률이 배포 전 기준과 유사하다.
- `/me`와 trainer-related endpoints에서 role-resolution 관련 5xx가 발생하지 않는다.
- role change 이후 이전 토큰이 예상대로 거부된다.

### Failure Signals / Immediate Trigger

- auth endpoints 5xx 증가
- 정상 계정 로그인 실패 증가
- trainer/member/reservation 화면에서 401/403 또는 500 회귀
- `user_roles` missing/duplicate로 인한 data integrity 예외

위 신호가 확인되면 즉시 cutover migration 및 auth query path를 점검하고, 필요 시 배포를 중단하거나 rollback 판단을 진행한다.

### Validation Window / Owner

- Window: 배포 직후 30분 집중 확인 + 영업시간 첫 1일 추적
- Owner: 배포 담당 backend engineer

## Blocking Gaps Before Phase 5 Execution

- `roles` / `user_roles` migration 부재
- runtime code와 fixture의 `role_code` 혼용 상태
- branch 내 일부 auth/JWT 변경이 중간 상태라 compile/test 기준선이 아직 안정적이지 않음

## Next Step

Phase 5를 실제 완료로 넘기려면 먼저 Phase 1-4 구현을 빌드 가능 상태로 정리한 뒤, 위 체크리스트 기준으로 통합 테스트와 fixture 전환을 순차적으로 통과시켜야 한다.
