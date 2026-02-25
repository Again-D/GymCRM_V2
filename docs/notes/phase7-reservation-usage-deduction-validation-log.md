# Phase 7 Reservation / Usage Deduction Validation Log

Date: 2026-02-25
Branch: `codex/feat-phase7-reservations-usage-deduction-foundation`

## Scope Covered (this pass)
- `P7-1` Reservation schema foundation (`V7`, `V8`)
- `P7-2` Reservation domain services (`create/cancel/complete`)
- `P7-3` Reservation API (backend only, RBAC annotation wiring)
- `P7-4` Frontend reservation workspace (`예약 관리` 탭)

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
- `frontend/src/App.tsx`
  - 사이드바 `예약 관리` 탭
  - 예약 생성 폼 (회원권/스케줄 선택, memo)
  - 예약 스케줄 목록
  - 선택 회원 예약 목록 + 완료/취소 액션
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

### 4) Frontend build + browser validation (`P7-4`)
- `frontend`: `npm run build` ✅
- Runtime for validation:
  - backend: `dev + jwt`, `SERVER_PORT=8084`
  - frontend: `VITE_DEV_PROXY_TARGET=http://127.0.0.1:8084 npm run dev -- --host 127.0.0.1 --port 5173` (actual port `5174`)
  - backend CORS allowlist temporarily expanded to include `127.0.0.1:5174` for this validation run

Browser flow (agent-browser) ✅
1. JWT login (`center-admin`)
2. `회원 관리` 탭에서 테스트 회원 생성: `P7예약UI회원-1422`
3. `회원권 업무` 탭에서 COUNT 상품 구매 (`P7API상품-4015ab2f`)
4. `예약 관리` 탭에서 예약 생성 (schedule `#1`) → `완료`
5. `예약 관리` 탭에서 예약 생성 (schedule `#33`) → `취소`

Observed UI behavior ✅
- `예약 관리` 탭 렌더링/회원 선택 가드 정상
- 예약 생성 후 스케줄 option의 정원 표시 증가 (`0/1 -> 1/1`)
- 완료 후 스케줄 정원 표시 복원 (`1/1 -> 0/1`)
- 취소 후 스케줄 정원 표시 복원 (`1/1 -> 0/1`)
- 예약 목록 행 액션 버튼이 상태에 따라 비활성화됨 (`COMPLETED`, `CANCELLED`)

### 5) SQL verification (P7-4 browser scenario)
Test member: `P7예약UI회원-1422` (`member_id=263`)

Confirmed via SQL ✅
- Membership usage deduction after complete:
  - `membership_id=268` → `remaining_count=4`, `used_count=1`
- Reservation rows:
  - `reservation_id=53`, `schedule_id=1`, `reservation_status=COMPLETED`
  - `reservation_id=54`, `schedule_id=33`, `reservation_status=CANCELLED`
- Schedule counts restored:
  - `trainer_schedules.schedule_id IN (1,33)` → `current_count=0`

### 6) Manual API error-path validation (`P7-5`)
Runtime:
- backend `dev + jwt`, `8084`
- helper scripts (local only, not committed): `/tmp/p7_manual_api_checks.sh`, `/tmp/p7_capacity_conflict_check.sh`

Validated cases ✅
- `membershipId` 누락 요청 차단
  - `POST /api/v1/reservations` with `{memberId, scheduleId}` only
  - `400 VALIDATION_ERROR`
  - 응답 헤더 `X-Trace-Id`와 본문 `traceId` 동시 확인
- 회원-회원권 소유 불일치 차단
  - `memberId=263`, `membershipId=261` (타 회원 소유)
  - `422 BUSINESS_RULE`
- 동일 회원 동일 슬롯 중복 예약 차단
  - 동일 payload 재호출
  - `409 CONFLICT`
- 정원 초과 슬롯 예약 차단 (`capacity=1`)
  - `schedule_id=1`을 먼저 점유 후 타 회원으로 재시도
  - `409 CONFLICT`, detail=`예약 가능한 정원이 없습니다.`

Traceability ✅
- 위 4개 에러 응답 모두 `X-Trace-Id` 헤더 + 본문 `traceId` 필드 확인

### 7) Frontend DESK UX consistency check (`P7-5`)
Browser validation (`agent-browser`) ✅
- `desk-user` 로그인 성공
- 사이드바 `예약 관리` 탭 접근 가능 (백엔드 RBAC의 DESK 허용과 정렬)
- `상품 관리` 탭에서 변경 UX 제한 유지 확인:
  - `신규 등록` disabled
  - 상품 폼/저장 버튼 disabled

Result:
- 프론트 UX와 백엔드 RBAC 정책이 모순되지 않음 (상품 변경 제한 유지 + 예약 업무 허용)

## Current Status
- `P7-1`: done 수준 (schema + dev seed + Flyway/SQL 검증 완료)
- `P7-2`: done 수준 (상태전이 + create/cancel/complete 서비스 + COUNT 차감 트랜잭션 구현/테스트)
- `P7-3`: done 수준 (백엔드 Controller/DTO/RBAC + 자동 통합검증 완료)
- `P7-4`: done 수준 (프론트 예약 탭 구현 + 브라우저/SQL 핵심 흐름 검증 완료)
- `P7-5`: done 수준 (수동 에러 케이스/traceId/DESK UX 검증 + 문서 반영 완료)

## Next Recommended Step
1. Phase 7 브랜치 최종 리뷰 및 PR 준비
2. 필요 시 예약 탭 스크린샷/데모 아티팩트 추가
3. Phase 7 학습 문서(`docs/solutions/`) 추가 여부 결정
