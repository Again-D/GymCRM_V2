---
module: Gym CRM Reservation
date: 2026-02-25
problem_type: database_issue
component: database
symptoms:
  - "Reservation capacity (`trainer_schedules.current_count`) could drift from actual confirmed reservations if lifecycle semantics are unclear"
  - "Reservation completion could deduct COUNT usage without sufficient traceability unless domain/API/UI rules are aligned"
  - "Cross-center reservation detail/mutation access risk exists if `center_id` scoping is not enforced in service/repository paths"
root_cause: state_policy_and_scope_misalignment
resolution_type: code_fix
severity: high
tags: [reservation, capacity, current-count, usage-deduction, rbac, tenant-scope, state-integrity]
---

# Troubleshooting: Reservation Capacity and Usage Deduction Integrity in Gym CRM

## Problem

예약(PT/GX)과 횟수제 사용 차감 기능을 도입하는 과정에서, 단순히 API를 추가하는 것만으로는 운영 정합성이 보장되지 않았다. 특히 아래 위험이 있었다.

- `trainer_schedules.current_count`의 의미/증감 규칙이 모호하면 정원 카운트가 실제 예약 상태와 어긋날 수 있음
- COUNT 회원권 예약 생성 가능 조건과 완료 차감 조건이 불일치하면 “완료 불가능한 예약”이 생성될 수 있음
- JWT 도입 환경에서 `reservation_id` 단독 조회/수정 경로는 센터 경계(authz scope)를 깨뜨릴 수 있음

## Environment

- Module: Gym CRM Reservation (Phase 7)
- Affected Components:
  - `trainer_schedules`, `reservations`
  - reservation service/controller/repositories
  - reservation workspace UI (`예약 관리` 탭)
- Date: 2026-02-25

## Symptoms

- 예약 상태 전이 규칙이 문서/구현/테스트마다 달라질 수 있는 위험 (`current_count` 증감 타이밍 불일치)
- API 직접 호출 시 `remaining_count=0`인 COUNT 회원권으로 예약이 생성되는 케이스 가능 (완료 시 차감 실패)
- 교차 센터 `reservation_id`를 알면 상세/취소/완료가 가능해질 수 있는 위험 (JWT 모드)
- 회원 변경 후 예약 폼 값이 남아 잘못된 조합으로 요청되는 UX 실패 가능성

## What Didn't Work

### Attempted Pattern 1: 프론트 가드만으로 예약 가능 회원권 제어
- **Why it failed:** UI는 COUNT 잔여횟수 0 회원권을 숨기더라도, API 직접 호출 또는 stale UI state로는 서버에 요청이 들어올 수 있다. 서버 eligibility가 같아야 한다.

### Attempted Pattern 2: RBAC만 있으면 멀티센터 접근도 안전하다고 가정
- **Why it failed:** 역할(`DESK`, `CENTER_ADMIN`) 검증은 “무엇을 할 수 있는가”를 다루고, `center_id` 스코핑은 “어느 데이터에 할 수 있는가”를 다룬다. 둘은 별개다.

### Attempted Pattern 3: `current_count` 규칙을 코드에서 암묵적으로 유지
- **Why it failed:** 문서에 규칙이 고정되지 않으면 구현/테스트/운영 검증이 서로 다른 기대값을 가질 수 있다.

## Solution

Phase 7에서는 예약/정원/차감 정합성을 **정책 문서 + DB 제약 + 서비스 검증 + UI 가드 + 테스트**로 함께 정렬했다.

### 1) Canonical rule 고정 (`current_count = CONFIRMED 예약 수`)

문서에서 먼저 규칙을 고정했다.

- `CONFIRMED`만 정원 점유
- `create`: `current_count + 1`
- `CONFIRMED -> CANCELLED`: `current_count - 1`
- `CONFIRMED -> COMPLETED`: `current_count - 1`

이 규칙을 기준으로 서비스/통합 테스트/SQL 검증을 작성했다.

### 2) DB 레벨 invariant + 제약 활용

- `trainer_schedules.current_count` CHECK 제약:
  - `0 <= current_count <= capacity`
- `reservations` partial unique index:
  - 동일 회원의 동일 슬롯 `CONFIRMED` 중복 예약 방지

파일:
- `/Users/abc/projects/GymCRM_V2/backend/src/main/resources/db/migration/V7__create_trainer_schedules_and_reservations.sql`

### 3) 서비스 레벨 정합성 검증

#### 예약 생성 (`create`)
- 회원/회원권/스케줄 센터 일치 검증
- 회원/회원권 상태 검증 (`ACTIVE`)
- 과거 슬롯 차단
- COUNT 회원권 `remaining_count > 0` 검증 (후속 하드닝)
- 정원 증가 성공 후 예약 insert (동일 트랜잭션)

#### 예약 완료 (`complete`)
- 상태 전이 검증 (`CONFIRMED -> COMPLETED`)
- 정원 감소
- COUNT 회원권 1회 차감 (`remaining_count - 1`, `used_count + 1`)
- 재완료(이중차감) 방지

파일:
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/reservation/ReservationService.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/membership/MemberMembershipRepository.java`

### 4) JWT 모드 actor-center 스코핑 보강 (authz scope)

RBAC와 별도로, 예약 데이터 접근에 actor center 스코핑을 추가했다.

- `CurrentUserProvider.currentCenterId()` 추가
- JWT principal에 `centerId` 포함
- 예약 `list/schedules/detail/cancel/complete`를 actor center 기준으로 조회/수정
- cross-center `reservation_id` 접근 시 `NOT_FOUND` 처리

파일:
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/common/security/CurrentUserProvider.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/auth/JwtAuthenticationFilter.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/reservation/ReservationRepository.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/reservation/ReservationService.java`

### 5) UI 가드 및 스모크 회귀 방지

- 예약 관리 탭에서 `membershipId` 필수 선택 UI 유지
- 회원 변경 시 예약 생성 폼(`membershipId/scheduleId/memo`) 초기화
  - stale hidden value로 인한 mismatch 요청 방지
- 예약/회원권 UI 스모크 체크리스트 추가 + 브라우저 검증 로그 기록

파일:
- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`
- `/Users/abc/projects/GymCRM_V2/docs/testing/gym-crm-phase7-reservation-membership-ui-smoke-checklist.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/phase7-reservation-membership-ui-smoke-validation-log.md`

## Why This Works

1. **정책 먼저 고정**
- `current_count` 의미와 증감 규칙을 문서에서 고정해 구현/테스트 기준을 일치시킨다.

2. **DB + 서비스의 역할 분리**
- DB는 invariant와 중복 방지(제약) 담당
- 서비스는 상태 전이/도메인 정책/에러 메시지 담당

3. **RBAC와 tenant scope 분리**
- 역할 허용 여부와 센터 데이터 범위는 별개 검증으로 다뤄야 안전하다.

4. **UI 가드 + 서버 검증 이중화**
- UI는 사용성, 서버는 최종 정합성 보장을 담당한다.

## Prevention

- **정원 카운트 캐시 컬럼은 lifecycle rule을 문서로 고정** (`current_count = 무엇인가?`) 
- **예약 가능 조건과 완료 가능 조건을 분리했다면 둘의 차이를 의도적으로 문서화**
  - 의도하지 않은 경우 서버 eligibility를 맞춰라
- **RBAC 도입 후에도 tenant scope 쿼리 조건 누락 점검**
  - `id` 단독 조회/수정 메서드를 우선 리뷰
- **UI stale state는 브라우저 스모크 체크리스트에 넣어 재현 가능하게 유지**
- **통합 테스트 + SQL 검증을 함께 남겨서 운영 데이터 의미를 확인**

## Validation Evidence

- `/Users/abc/projects/GymCRM_V2/docs/notes/phase7-reservation-usage-deduction-validation-log.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/phase7-reservation-membership-ui-smoke-validation-log.md`
- `/Users/abc/projects/GymCRM_V2/docs/testing/artifacts/phase7-reservation-membership-smoke.png`
- `/Users/abc/projects/GymCRM_V2/todos/020-complete-p1-reservation-endpoints-not-scoped-to-actor-center.md`
- `/Users/abc/projects/GymCRM_V2/todos/021-complete-p2-reservation-create-allows-unusable-membership-state.md`
- `/Users/abc/projects/GymCRM_V2/todos/022-complete-p3-reservation-form-state-persists-when-switching-member.md`

## Related Issues

No separate issue tracker references documented yet.
