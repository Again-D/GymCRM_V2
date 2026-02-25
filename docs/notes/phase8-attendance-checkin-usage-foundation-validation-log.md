# Phase 8 Attendance/Check-in/Usage Foundation Validation Log

Date: 2026-02-25
Phase: `P8-1 ~ P8-3` (Schema & Event Foundation + Domain Rules/Services + API/RBAC)

## Scope

- Flyway `V9` migration for reservation attendance fields and usage event table
- Reservation domain/repository compatibility after schema extension
- Schema-level invariants existence checks (no-show constraint, usage event unique index)

## Changes Validated

- `reservations` table extended with:
  - `no_show_at`
  - `checked_in_at`
- `reservations.reservation_status` check includes `NO_SHOW`
- `membership_usage_events` table created
- Unique invariant added:
  - `uk_membership_usage_events_reservation_type` (`reservation_id`, `usage_event_type`)
- Reservation Java mapping/repository select-returning clauses updated to include new columns

## Automated Validation

Command:

```bash
cd /Users/abc/projects/GymCRM_V2/backend
GRADLE_USER_HOME=/Users/abc/projects/GymCRM_V2/.gradle-local ./gradlew test --no-daemon --tests 'com.gymcrm.reservation.*'
```

Result:
- ✅ PASS
- Includes `ReservationPhase8SchemaFoundationIntegrationTest`

Covered checks:
- `reservations.checked_in_at` / `reservations.no_show_at` column existence
- `chk_reservations_no_show_at` constraint existence
- `membership_usage_events` table existence
- `uk_membership_usage_events_reservation_type` index existence
- `chk_membership_usage_events_type` constraint existence

## Runtime Flyway Validation (dev + jwt)

Command (verification run):

```bash
cd /Users/abc/projects/GymCRM_V2/backend
SPRING_PROFILES_ACTIVE=dev APP_SECURITY_MODE=jwt PORT=8086 \
DB_URL=jdbc:postgresql://localhost:5433/gymcrm_dev DB_USERNAME=gymcrm DB_PASSWORD=gymcrm \
GRADLE_USER_HOME=/Users/abc/projects/GymCRM_V2/.gradle-local ./gradlew bootRun --no-daemon
```

Observed logs:
- ✅ `Successfully validated 9 migrations`
- ✅ `Current version of schema "public": 9`
- ✅ `Schema "public" is up to date. No migration necessary.`

## Notes / Next Step

## P8-2 Domain Service Validation (2026-02-25)

Implemented:
- `ReservationService.checkIn(...)`
- `ReservationService.noShow(...)`
- `ReservationService.complete(...)` usage event write on COUNT deduction
- `ReservationStatusTransitionService` extended with `CONFIRMED -> NO_SHOW`

Automated validation:

```bash
cd /Users/abc/projects/GymCRM_V2/backend
GRADLE_USER_HOME=/Users/abc/projects/GymCRM_V2/.gradle-local ./gradlew test --no-daemon --tests 'com.gymcrm.reservation.*'
```

Result:
- ✅ PASS

Covered checks (service/integration):
- `check-in` timestamp 기록
- `check-in` 재호출 `CONFLICT`
- `NO_SHOW` 종료시각 이전 차단 / 이후 허용
- `checked_in_at` 존재 예약 `NO_SHOW` 차단
- `NO_SHOW` 시 COUNT 차감 없음 / usage event 미생성
- `COMPLETED` 시 COUNT 차감 + `membership_usage_events` 생성

## Notes / Next Step

- `P8-2`는 **도메인 서비스 레이어까지 완료**됨
- 아직 미구현:
  - `P8-4` 프론트 예약 탭 액션 UI 브라우저 검증
- Next target: `P8-4` (Frontend Reservation Workspace UX)

## P8-3 API & RBAC Validation (2026-02-25)

Implemented:
- `POST /api/v1/reservations/{reservationId}/check-in`
- `POST /api/v1/reservations/{reservationId}/no-show`
- Reservation response fields extended (`noShowAt`, `checkedInAt`)

Automated validation:

```bash
cd /Users/abc/projects/GymCRM_V2/backend
GRADLE_USER_HOME=/Users/abc/projects/GymCRM_V2/.gradle-local ./gradlew test --no-daemon --tests 'com.gymcrm.reservation.*'
```

Result:
- ✅ PASS

Covered checks (API/JWT/RBAC):
- `ROLE_DESK` 예약 생성/완료/취소 기존 경로 회귀
- `ROLE_DESK` 체크인 성공 + 재체크인 `CONFLICT`
- `ROLE_DESK` 노쇼 종료 전 `BUSINESS_RULE`, 종료 후 성공
- `NO_SHOW` 처리 후 `current_count` 복원 확인

## P8-4 Frontend UI Implementation (2026-02-25)

Implemented (build-verified):
- `예약 관리` 탭 예약 목록에 `체크인`, `노쇼` 액션 버튼 추가
- `checkedInAt`, `noShowAt` 컬럼 표시 추가
- UI guard:
  - `checked_in_at` 존재 시 `체크인`/`노쇼` 비활성
  - 스케줄 종료 전 `노쇼` 비활성 (`종료 후 가능` 안내)

Validation:

```bash
cd /Users/abc/projects/GymCRM_V2/frontend
npm run build
```

Result:
- ✅ PASS

Pending:
- 브라우저 수동/자동 검증 (`P8-4` and `P8-5`)

## P8-5 Browser + SQL Validation (2026-02-25)

Environment:
- Backend: `dev + jwt` (`8080`)
- Frontend: Vite dev server (`5173`, `/api` proxy)
- Browser: `agent-browser` session

UI scenario (center-admin):
- 로그인 후 `회원 관리`에서 `P7API카운트회원-2ec66fec` 선택
- `예약 관리` 탭 이동
- 테스트 예약 row 확인:
  - `reservation_id=114` (`CONFIRMED`, future slot)
  - `reservation_id=115` (`CONFIRMED`, ended slot)
- `reservation_id=114`:
  - `체크인` 클릭 성공
  - 성공 메시지 `체크인 처리되었습니다.` 확인
  - row에 `checked_in_at` 표시 확인
  - 안내 문구 `체크인됨: 노쇼 처리 불가` 확인
  - `노쇼` 버튼 비활성 확인
- `reservation_id=115`:
  - `노쇼` 클릭 성공
  - 성공 메시지 `노쇼 처리되었습니다.` 확인
  - 상태 `NO_SHOW` 확인
  - `no_show_at` 표시 확인

Screenshot artifact:
- `/Users/abc/projects/GymCRM_V2/docs/testing/artifacts/phase8-checkin-noshow-reservation-tab.png`

SQL verification (post-action):
- `reservations`
  - `114`: `CONFIRMED`, `checked_in_at` set, `no_show_at` null
  - `115`: `NO_SHOW`, `checked_in_at` null, `no_show_at` set
- `trainer_schedules`
  - `101.current_count = 0` (no-show 처리 후 해제)
  - `104.current_count = 1` (check-in은 정원 영향 없음)
- `membership_usage_events`
  - `reservation_id IN (114,115)` row 없음 (check-in/no-show 차감 이벤트 미생성)
- `member_memberships(317)`
  - `remaining_count=4`, `used_count=1` (no-show로 추가 차감 없음)

Result:
- ✅ `P8-5` 브라우저 + SQL 검증 완료
