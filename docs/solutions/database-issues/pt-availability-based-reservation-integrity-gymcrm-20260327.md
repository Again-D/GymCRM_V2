---
module: Gym CRM PT Reservation Integrity
date: 2026-03-27
problem_type: database_issue
component: database
symptoms:
  - "기존 예약 생성은 미리 존재하는 `scheduleId`가 필요해서 GX에는 맞았지만 PT처럼 availability에서 즉석으로 시간을 고르는 흐름을 표현할 수 없었다"
  - "PT 예약은 트레이너 가능 시간 안의 60분 블록을 30분 단위로 계산해야 했고, 트레이너/회원 시간 겹침도 함께 막아야 했다"
  - "활성 PT 횟수제 회원권이어도 미래 확정 PT 예약이 이미 남아 있으면 `remaining_count`만으로는 과다 선점이 가능했다"
  - "PT 확정 시 생성되는 `trainer_schedules` 행의 `created_at`/`updated_at`가 실제 생성 시각이 아니라 미래 `start_at`로 저장될 수 있었다"
root_cause: logic_error
resolution_type: code_fix
severity: high
tags: [reservations, pt, trainer-availability, trainer-schedules, overlap-check, membership-count, audit-timestamps]
---

# Troubleshooting: PT Reservation Must Be Availability-Driven but Still Persist as Concrete Reservation Data

## Problem

기존 예약 모델은 GX를 기준으로 설계되어 있었다. 운영자는 이미 등록된 [`trainer_schedules`](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/reservation/entity/TrainerScheduleEntity.java) 슬롯을 고르고, 예약은 그 슬롯에 배정하는 방식이었다. 이 모델은 고정 수업인 GX에는 맞았지만, 트레이너 availability를 기준으로 회원과 시간을 조율한 뒤 예약 시점에 1시간 블록을 확정해야 하는 PT에는 맞지 않았다.

문제를 단순히 “PT도 슬롯 하나 더 추가”로 풀면 안 됐다. availability는 예약 후보 계산의 입력일 뿐이고, 실제 운영 기록은 여전히 concrete schedule + reservation으로 남아야 했다. 그렇지 않으면 중복 방지, 출석/취소/차감, 담당 트레이너 scope, 감사 로그가 모두 불안정해진다.

## Environment

- Module: Gym CRM PT Reservation Integrity
- Affected Component:
  - [/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/reservation/service/PtReservationService.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/reservation/service/PtReservationService.java)
  - [/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/reservation/controller/ReservationController.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/reservation/controller/ReservationController.java)
  - [/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/reservation/repository/ReservationQueryRepository.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/reservation/repository/ReservationQueryRepository.java)
  - [/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/reservation/repository/TrainerScheduleQueryRepository.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/reservation/repository/TrainerScheduleQueryRepository.java)
  - [/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/reservation/repository/TrainerScheduleRepository.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/reservation/repository/TrainerScheduleRepository.java)
  - [/Users/abc/projects/GymCRM_V2/backend/src/main/resources/db/migration/V27__add_trainer_user_id_to_trainer_schedules.sql](/Users/abc/projects/GymCRM_V2/backend/src/main/resources/db/migration/V27__add_trainer_user_id_to_trainer_schedules.sql)
  - [/Users/abc/projects/GymCRM_V2/frontend/src/pages/reservations/ReservationsPage.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/pages/reservations/ReservationsPage.tsx)
  - [/Users/abc/projects/GymCRM_V2/frontend/src/pages/reservations/modules/usePtReservationCandidatesQuery.ts](/Users/abc/projects/GymCRM_V2/frontend/src/pages/reservations/modules/usePtReservationCandidatesQuery.ts)
  - [/Users/abc/projects/GymCRM_V2/frontend/src/pages/reservations/modules/useSelectedMemberReservationsState.ts](/Users/abc/projects/GymCRM_V2/frontend/src/pages/reservations/modules/useSelectedMemberReservationsState.ts)
- Date: 2026-03-27

## Symptoms

- PT 예약은 미리 존재하는 `scheduleId`가 없어서 기존 `POST /api/v1/reservations`만으로는 생성할 수 없었다.
- PT는 `60분 고정`, `30분 단위 시작`, `트레이너 availability 안에서만 생성`이라는 별도 정책이 필요했다.
- `remaining_count > 0`만 보면 미래 확정 PT를 여러 건 선점할 수 있어 회원권 잔여 횟수보다 더 많이 예약할 수 있었다.
- 트레이너와 회원 모두 다른 GX/PT 예약과 겹치지 않아야 했고, trainer actor는 본인 담당 회원권만 다룰 수 있어야 했다.
- 새 PT schedule row는 overlap 검사와 운영 추적을 위해 `trainer_user_id`가 필요했고, audit timestamp도 실제 생성 시각이어야 했다.

## What Didn't Work

**Attempted Solution 1:** PT도 GX처럼 기존 예약 생성 API에 `scheduleId`만 넘기면 된다고 가정
- **Why it failed:** PT는 사전에 확정된 슬롯이 아니라 availability 기반의 계산 결과를 예약 시점에 concrete row로 만들어야 했다. 기존 API는 후보 계산과 트랜잭션 생성 책임을 전혀 가지지 않았다.

**Attempted Solution 2:** availability를 곧바로 예약 슬롯처럼 저장하거나 재사용
- **Why it failed:** availability는 “가능한 시간대”이고, 예약은 “실제 점유된 운영 레코드”다. 둘을 합치면 예외 처리, 중복 방지, 취소 후 상태, capacity/current_count semantics가 흐려진다.

**Attempted Solution 3:** `remaining_count > 0`만 보고 PT 예약 허용
- **Why it failed:** 아직 완료되지 않은 미래 PT가 여러 건 남아 있는 경우 `remaining_count`만으로는 선점 수를 제한할 수 없다. 예약 시점에 `outstanding confirmed PT`를 반영해야 했다.

**Attempted Solution 4:** PT schedule row의 `created_at`/`updated_at`에 `start_at` 사용
- **Why it failed:** 미래 수업일수록 감사 로그와 운영 검증 쿼리가 왜곡된다. 생성 시각과 수업 시각은 분리돼야 한다.

## Solution

해결은 PT를 GX의 변형으로 다루지 않고, **availability 기반 후보 계산 + 확정 시 concrete schedule/reservation 생성**이라는 별도 흐름으로 분리하는 것이었다.

### 1) PT 후보 조회와 확정 생성을 전용 서비스로 분리

[`PtReservationService.java`](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/reservation/service/PtReservationService.java) 를 추가해서 PT 예약 전용 규칙을 한 곳에 모았다.

- 후보 조회: `membershipId + trainerUserId + date`를 받아 availability에서 60분 후보를 계산
- 확정 생성: 선택된 `startAt`으로 `trainer_schedules + reservations`를 같은 트랜잭션에서 생성
- GX는 기존 `scheduleId` 기반 흐름 유지

```text
PT booking flow:
trainer + date -> candidate starts -> confirm -> create PT schedule row + reservation row
```

### 2) availability는 read-only 입력으로만 사용

PT 후보는 weekly rule + exception을 반영한 effective day에서만 계산했다. 후보 자체는 저장하지 않고, 확정 시점에만 concrete PT schedule row를 만든다.

- duration: `60분 고정`
- start boundary: `30분 단위`
- allowed window: effective availability 안에서만 허용
- past start: 금지

### 3) membership/ownership/overlap 규칙을 서버에서 강제

PT 예약은 다음 조건을 모두 만족해야 한다.

- 회원권이 `ACTIVE`
- `product_category_snapshot = PT`
- `product_type_snapshot = COUNT`
- 회원권이 만료되지 않음
- `remaining_count - outstanding_confirmed_pt_reservations > 0`
- 트레이너 시간 겹침 없음
- 회원의 다른 GX/PT 예약과 시간 겹침 없음
- trainer actor인 경우 `assigned_trainer_id`가 본인과 일치

```text
bookable_count = membership.remaining_count - active_confirmed_pt_reservations_for_membership
if bookable_count <= 0: reject booking
```

### 4) `trainer_schedules.trainer_user_id`를 추가해 PT 운영 주체를 명시

PT overlap 검사와 운영 조회는 trainer name 문자열로 하면 불안정하다. [`V27__add_trainer_user_id_to_trainer_schedules.sql`](/Users/abc/projects/GymCRM_V2/backend/src/main/resources/db/migration/V27__add_trainer_user_id_to_trainer_schedules.sql) 로 `trainer_user_id`를 추가하고, PT 생성 시 이 값을 채우도록 했다.

이렇게 하면 다음이 가능해진다.

- trainer 기준 overlap query
- trainer actor scope 검증
- PT 생성 row에 대한 명확한 소유자 추적

### 5) 프런트는 GX/PT 예약 UX를 명시적으로 분기

[`ReservationsPage.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/reservations/ReservationsPage.tsx) 는 회원권의 `productCategorySnapshot`에 따라 GX와 PT 예약 흐름을 분기한다.

- GX: 기존 schedule 선택 유지
- PT: `트레이너 -> 날짜 -> 가능한 시작 시각` 순서로 선택
- trainer actor면 본인 트레이너만 선택 가능
- 필요한 값이 다 정해지기 전에는 제출 비활성화

이렇게 해서 운영자가 “PT는 availability 기반 예약”이라는 규칙을 화면에서 바로 이해할 수 있게 했다.

### 6) PT schedule audit timestamp는 실제 생성 시각으로 기록

후속 PR 리뷰에서 PT schedule insert가 `created_at/updated_at = start_at`로 저장되는 문제를 발견했다. [`TrainerScheduleRepository.java`](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/reservation/repository/TrainerScheduleRepository.java) 에서 audit timestamp를 `OffsetDateTime.now(UTC)`로 바꿨고, [`ReservationApiIntegrationTest.java`](/Users/abc/projects/GymCRM_V2/backend/src/test/java/com/gymcrm/reservation/ReservationApiIntegrationTest.java) 에 회귀 테스트를 추가했다.

## Why This Works

이 해결이 안정적인 이유는 availability와 reservation의 책임을 섞지 않았기 때문이다.

1. availability는 후보 계산의 기준만 제공한다.
2. 실제 운영 기록은 concrete PT schedule row와 reservation row로 남는다.
3. 중복 방지와 잔여 횟수 보호는 create 트랜잭션 안에서 다시 검사된다.
4. trainer ownership은 membership의 `assigned_trainer_id`와 PT row의 `trainer_user_id`로 명확해진다.
5. audit timestamp가 생성 시각을 반영해서 운영 검증 쿼리와 로그 해석이 다시 맞아진다.

즉, 이 작업은 단순히 PT 예약 UI를 추가한 것이 아니라, **availability 기반 예약을 기존 reservation persistence model과 무결하게 연결한 것**이다.

## Prevention

- availability와 concrete reservation을 같은 것으로 저장하지 않는다.
- PT 규칙은 UI 편의가 아니라 서버 규칙으로 강제한다.
  - 60분 고정
  - 30분 경계
  - 과거 시각 금지
  - trainer/member overlap 금지
- PT create는 `remaining_count`만 보지 말고 outstanding confirmed PT를 뺀 bookable count로 판단한다.
- PT candidate 응답은 최소화하고, create 시점에 availability/ownership/overlap를 다시 검사한다.
- PT schedule insert와 reservation insert는 같은 트랜잭션에서 처리해서 orphan schedule을 남기지 않는다.
- 미래 수업 row라도 `created_at`/`updated_at`는 실제 생성 시각을 사용한다.

## Commands Run

```bash
cd /Users/abc/projects/GymCRM_V2/backend
./gradlew test --tests com.gymcrm.reservation.ReservationApiIntegrationTest --tests com.gymcrm.reservation.ReservationServiceIntegrationTest
./gradlew test --tests com.gymcrm.reservation.ReservationApiIntegrationTest

cd /Users/abc/projects/GymCRM_V2/frontend
npm test -- --run src/pages/reservations/ReservationsPage.test.tsx src/pages/reservations/modules/useSelectedMemberReservationsState.test.tsx
npm run build
```

## Validation Evidence

- PT candidate/create integration tests added and passing
- malformed date/startAt/id, memo trim/length, timezone normalization 검증 추가
- PT schedule audit timestamp regression test added and passing
- frontend PT 예약 모달 분기, 안내 문구, submit gating 테스트 추가
- PR: `#101 feat: add PT availability-based reservation flow`

## Related Issues

- See also: [/Users/abc/projects/GymCRM_V2/docs/solutions/database-issues/reservation-capacity-and-usage-deduction-integrity-gymcrm-20260225.md](/Users/abc/projects/GymCRM_V2/docs/solutions/database-issues/reservation-capacity-and-usage-deduction-integrity-gymcrm-20260225.md)
- See also: [/Users/abc/projects/GymCRM_V2/docs/solutions/database-issues/reservation-checkin-noshow-usage-event-integrity-gymcrm-20260225.md](/Users/abc/projects/GymCRM_V2/docs/solutions/database-issues/reservation-checkin-noshow-usage-event-integrity-gymcrm-20260225.md)
- Background context: [/Users/abc/projects/GymCRM_V2/docs/brainstorms/2026-03-27-trainer-availability-schedule-management-brainstorm.md](/Users/abc/projects/GymCRM_V2/docs/brainstorms/2026-03-27-trainer-availability-schedule-management-brainstorm.md)
- Background context: [/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-27-feat-trainer-availability-schedule-management-plan.md](/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-27-feat-trainer-availability-schedule-management-plan.md)
- Background context: [/Users/abc/projects/GymCRM_V2/docs/brainstorms/2026-03-27-pt-availability-based-reservation-brainstorm.md](/Users/abc/projects/GymCRM_V2/docs/brainstorms/2026-03-27-pt-availability-based-reservation-brainstorm.md)
- Background context: [/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-27-feat-pt-availability-based-reservation-flow-plan.md](/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-27-feat-pt-availability-based-reservation-flow-plan.md)
- Background context: [/Users/abc/projects/GymCRM_V2/docs/brainstorms/2026-03-10-trainer-scoped-reservation-management-brainstorm.md](/Users/abc/projects/GymCRM_V2/docs/brainstorms/2026-03-10-trainer-scoped-reservation-management-brainstorm.md)
- Background context: [/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-10-feat-trainer-scoped-reservation-management-plan.md](/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-10-feat-trainer-scoped-reservation-management-plan.md)
- Validation note: [/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-11-trainer-scoped-reservation-validation.md](/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-11-trainer-scoped-reservation-validation.md)
- UI regression reference: [/Users/abc/projects/GymCRM_V2/docs/testing/gym-crm-phase7-reservation-membership-ui-smoke-checklist.md](/Users/abc/projects/GymCRM_V2/docs/testing/gym-crm-phase7-reservation-membership-ui-smoke-checklist.md)
