# Phase 7 Reservation / Usage Deduction Validation Log

Date: 2026-02-25
Branch: `codex/feat-phase7-reservations-usage-deduction-foundation`

## Scope Covered (this pass)
- `P7-1` Reservation schema foundation (`V7`, `V8`)
- `P7-2` Reservation domain services (`create/cancel/complete`)
- `P7-3` Reservation API (backend only, RBAC annotation wiring)

## Implemented
- `backend/src/main/resources/db/migration/V7__create_trainer_schedules_and_reservations.sql`
  - `trainer_schedules`
  - `reservations`
  - `membership_id NOT NULL`
  - `uk_reservations_member_schedule_confirmed` (partial unique index)
- `backend/src/main/resources/db/migration/V8__seed_reservation_schedules_dev.sql`
  - dev seed PT/GX schedule rows (`center_id=1`)
- `backend/src/main/java/com/gymcrm/reservation/ReservationStatus.java`
- `backend/src/main/java/com/gymcrm/reservation/ReservationStatusTransitionService.java`
- `backend/src/main/java/com/gymcrm/reservation/TrainerSchedule.java`
- `backend/src/main/java/com/gymcrm/reservation/Reservation.java`
- `backend/src/main/java/com/gymcrm/reservation/TrainerScheduleRepository.java`
- `backend/src/main/java/com/gymcrm/reservation/ReservationRepository.java`
- `backend/src/main/java/com/gymcrm/reservation/ReservationService.java`
- `backend/src/main/java/com/gymcrm/reservation/ReservationController.java`
- `backend/src/test/java/com/gymcrm/reservation/ReservationStatusTransitionServiceTest.java`
- `backend/src/test/java/com/gymcrm/reservation/ReservationServiceIntegrationTest.java`
- `backend/src/test/java/com/gymcrm/reservation/ReservationApiIntegrationTest.java`
- `backend/src/main/java/com/gymcrm/membership/MemberMembershipRepository.java`
  - COUNT 회원권 1회 차감용 `consumeOneCountIfEligible(...)` 추가
- `backend/src/test/java/com/gymcrm/auth/RbacAuthorizationIntegrationTest.java`
  - 공유 로컬 DB fixture 안정화 (`desk-user` reset/upsert)

## Validation Performed

### 1) Backend tests (regression)
- `GRADLE_USER_HOME=/Users/abc/projects/GymCRM_V2/.gradle-local ./gradlew test --no-daemon` ✅
- `GRADLE_USER_HOME=/Users/abc/projects/GymCRM_V2/.gradle-local ./gradlew test --no-daemon --tests com.gymcrm.auth.RbacAuthorizationIntegrationTest` ✅
- `GRADLE_USER_HOME=/Users/abc/projects/GymCRM_V2/.gradle-local ./gradlew test --no-daemon --tests com.gymcrm.reservation.ReservationStatusTransitionServiceTest` ✅
- `GRADLE_USER_HOME=/Users/abc/projects/GymCRM_V2/.gradle-local ./gradlew test --no-daemon --tests 'com.gymcrm.reservation.*'` ✅
- `ReservationApiIntegrationTest` 포함 검증 항목:
  - `DESK` 예약 생성/목록/상세/완료/취소 API 허용 ✅
  - `CENTER_ADMIN` 예약 목록 API 허용 ✅
  - 비인증 예약 생성 요청 `401 AUTHENTICATION_FAILED` ✅
- `GRADLE_USER_HOME=/Users/abc/projects/GymCRM_V2/.gradle-local ./gradlew test --no-daemon` ✅

Note:
- During Phase 7 start, `RbacAuthorizationIntegrationTest` failed due to shared local DB fixture flakiness (`desk-user` existing row with mismatched password hash). Test fixture was hardened to update/reset the desk user before login.

### 2) Flyway migration apply (real DB)
Runtime command (dev+jwt against Docker PostgreSQL on `5433`):
- `SPRING_PROFILES_ACTIVE=dev DB_URL=jdbc:postgresql://localhost:5433/gymcrm_dev DB_USERNAME=gymcrm DB_PASSWORD=gymcrm APP_SECURITY_MODE=jwt ./gradlew bootRun --no-daemon`

Observed:
- Flyway validated 8 migrations
- Schema migrated from `v7` to `v8`
- `V8__seed_reservation_schedules_dev` applied successfully ✅

Note:
- Application startup later failed because `port 8080` was already in use, but Flyway migration had already completed successfully before shutdown.

### 3) SQL verification (Docker Postgres)
- `flyway_schema_history` contains `v7`, `v8` with `success=true` ✅
- `trainer_schedules` seed rows present (`PT 체험 슬롯`, `GX 그룹 클래스`) with `current_count=0` ✅

## Current Status
- `P7-1`: done 수준 (schema + dev seed + Flyway/SQL 검증 완료)
- `P7-2`: done 수준 (상태전이 + create/cancel/complete 서비스 + COUNT 차감 트랜잭션 구현/테스트)
- `P7-3`: in progress (백엔드 Controller/DTO/RBAC + 자동 통합검증 완료, 수동 API 검증 로그 미완료)

## Next Recommended Step
1. `P7-3` 마무리: 예약 API 수동 검증 + RBAC(센터관리자/데스크) 통합 검증
2. `P7-4` 프론트 `예약 관리` 탭 추가 및 JWT 모드 브라우저 검증
3. SQL 정합성 검증 + 계획/제약사항 문서 업데이트
