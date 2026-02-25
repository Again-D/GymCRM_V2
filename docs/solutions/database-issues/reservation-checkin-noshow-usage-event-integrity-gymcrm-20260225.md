---
module: Gym CRM Reservation
date: 2026-02-25
problem_type: database_issue
component: database
symptoms:
  - "예약 완료(차감) 중심 모델만으로는 체크인/노쇼 운영 데이터를 구분하기 어려움"
  - "체크인 재처리/노쇼 처리 상호작용 정책이 고정되지 않으면 UI/API/테스트 기대값이 어긋남"
  - "사용 차감 이력(`왜 차감됐는가`) 추적성이 부족하면 운영 검증과 리포팅이 어려움"
root_cause: attendance_policy_and_event_integrity_not_explicitly_modeled
resolution_type: code_fix
severity: high
tags: [reservation, checkin, no-show, usage-events, idempotency, state-machine, current-count]
---

# Troubleshooting: Reservation Check-in / No-show and Usage Event Integrity (Phase 8)

## Problem

Phase 7에서 예약 생성/취소/완료와 COUNT 차감은 동작했지만, 실제 운영에서는 다음 정보가 필요했다.

- 체크인(도착 확인) 시각
- 노쇼(`NO_SHOW`) 처리
- COUNT 차감 이벤트의 추적성 (`왜 차감됐는지`)

이 레이어를 명확히 정의하지 않으면, 상태 전이/정원(`current_count`)/차감 이벤트가 서로 어긋나거나, UI와 백엔드 정책이 다르게 동작할 위험이 있다.

## Environment

- Module: Gym CRM Reservation (Phase 8)
- Affected Components:
  - `reservations`
  - `trainer_schedules.current_count`
  - `membership_usage_events` (new)
  - reservation service/controller
  - reservation workspace UI (`예약 관리`)
- Date: 2026-02-25

## Symptoms

- 체크인이 상태인지 메타데이터인지 불명확하면 상태 전이 규칙/버튼 정책이 흔들림
- `NO_SHOW` 허용 시점이 없으면 종료 전 노쇼 처리로 정원 해제 타이밍이 왜곡될 수 있음
- 재완료/재시도 시 usage event 중복 생성 가능성 (idempotency 미고정)
- `checked_in_at`가 있는 예약에 `NO_SHOW`를 허용하면 상충된 출석 신호가 남음

## What Didn’t Work

### Attempted Pattern 1: 체크인을 암묵적 UI 상태로만 처리
- **Why it failed:** UI에서만 체크인 상태를 표현하면 API/DB/리포트 기준이 없어지고, 권한/재처리 정책을 일관되게 검증할 수 없다.

### Attempted Pattern 2: `NO_SHOW`를 단순 상태 추가로만 처리
- **Why it failed:** 허용 시점, 정원 해제 타이밍, 체크인과의 상호작용이 정의되지 않으면 운영 정책이 코드에 암묵적으로 흩어진다.

### Attempted Pattern 3: 차감은 회원권 row만 보면 충분하다고 가정
- **Why it failed:** `remaining_count/used_count`만으로는 “어떤 예약 완료 때문에 차감되었는지”를 추적하기 어렵다.

## Solution

Phase 8에서는 출석/노쇼를 **상태 전이 + 메타데이터 + 이벤트 로그**로 분리해서 정렬했다.

### 1) Check-in semantics 고정 (메타데이터-only)

- `CHECKED_IN` 상태는 도입하지 않음
- `check-in`은 `checked_in_at` timestamp만 기록
- 정원(`current_count`) / COUNT 차감에는 영향 없음
- `CONFIRMED`에서만 허용
- 재체크인(reprocessing)은 `CONFLICT`

이렇게 정의하면 상태 전이 복잡도는 낮추면서도 운영 데이터는 확보할 수 있다.

### 2) `NO_SHOW` 정책 고정

- `CONFIRMED -> NO_SHOW` 허용
- `schedule.end_at` 이후에만 허용
- `checked_in_at`가 있는 예약은 `NO_SHOW` 불가 (`BUSINESS_RULE`)
- `NO_SHOW` 처리 시 `current_count - 1`
- `NO_SHOW`는 초기안에서 COUNT 차감 없음

핵심은 **정원 해제는 하되 사용 차감은 하지 않는 정책**을 명시적으로 고정한 점이다.

### 3) Usage event 테이블 도입 + idempotency invariant

`membership_usage_events`를 추가해 COUNT 차감 이력을 기록한다.

- 이벤트 타입: `RESERVATION_COMPLETE`
- 연결 키: `membership_id`, `reservation_id`
- 처리자/시각: `processed_by`, `processed_at`
- 차감량: `delta_count` (`-1`)

중복 방지:
- `UNIQUE (reservation_id, usage_event_type)`

이 제약으로 `COMPLETED` 경로의 재시도/중복 처리에서 이벤트 중복 생성 위험을 낮춘다.

### 4) 서비스/리포지토리/API/UI 정책 동시 정렬

#### Backend
- `ReservationStatusTransitionService`: `CONFIRMED -> NO_SHOW` 추가
- `ReservationService`
  - `checkIn(...)`
  - `noShow(...)`
  - `complete(...)`에 usage event 기록 연결
- `ReservationRepository`
  - `markCheckedInIfEligible(...)`
  - `markNoShowIfCurrent(...)`

#### API
- `POST /api/v1/reservations/{id}/check-in`
- `POST /api/v1/reservations/{id}/no-show`
- 응답 필드 확장: `checkedInAt`, `noShowAt`

#### Frontend
- 예약 탭 액션: `체크인`, `노쇼`
- UI 가드:
  - `checked_in_at` 존재 시 `체크인/노쇼` 비활성
  - 종료 전 `노쇼` 비활성 + 안내 문구

## Why This Works

1. **상태와 메타데이터를 분리**
- 체크인은 메타데이터, 출석 결과는 `COMPLETED/NO_SHOW` 상태로 처리해 상태 폭증을 막는다.

2. **정책을 문서→코드→테스트→UI 순서로 고정**
- `NO_SHOW` 시점/차감 여부, 체크인 재처리 규칙이 한 곳에 모이지 않으면 드리프트가 발생한다.

3. **이벤트 로그로 운영 추적성 확보**
- membership row snapshot만으로는 부족한 “차감 근거”를 이벤트 row로 남긴다.

4. **DB unique invariant로 idempotency 보조**
- 서비스 체크만으로는 레이스/재시도 상황이 완전히 막히지 않을 수 있으므로 DB 제약을 함께 둔다.

## Prevention

- 체크인/출석/완료/노쇼가 혼재된 기능은 먼저 **상태 vs 메타데이터**를 분리 설계할 것
- `NO_SHOW` 같은 운영 상태는 **허용 시점과 정정 정책**을 함께 문서화할 것
- 사용 차감 이벤트는 **고유성 규칙(unique invariant)** 을 먼저 정하고 서비스 로직을 맞출 것
- UI 가드 추가 시 반드시 백엔드 규칙/테스트와 함께 정렬할 것
- 검증 로그에 브라우저 + SQL 증빙을 같이 남길 것

## Validation Evidence

- `/Users/abc/projects/GymCRM_V2/docs/notes/phase8-attendance-checkin-usage-foundation-validation-log.md`
- `/Users/abc/projects/GymCRM_V2/docs/testing/artifacts/phase8-checkin-noshow-reservation-tab.png`
- `/Users/abc/projects/GymCRM_V2/backend/src/test/java/com/gymcrm/reservation/ReservationServiceIntegrationTest.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/test/java/com/gymcrm/reservation/ReservationApiIntegrationTest.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/resources/db/migration/V9__reservation_attendance_and_usage_event_foundation.sql`

## Related Issues

No separate issue tracker references documented yet.
