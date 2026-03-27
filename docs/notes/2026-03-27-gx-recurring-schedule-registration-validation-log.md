# GX Recurring Schedule Registration Validation Log

Date: 2026-03-27
Plan: `docs/plans/2026-03-27-feat-gx-recurring-schedule-registration-plan.md`
Branch: `feature/gx-recurring-schedule-registration`

## Scope

- GX 반복 규칙 / 날짜별 예외 / 4주 롤링 슬롯 생성 기능
- `reservation.gx` 백엔드 서브모듈 추가
- `trainer_schedules` 생성 출처 추적 컬럼 추가
- 프론트 `GX 스케줄` 운영 화면 추가
- mock mode 기반 프론트 스모크 테스트 추가

## Changes Validated

- `gx_schedule_rules` / `gx_schedule_exceptions` 테이블 생성
- `trainer_schedules.source_rule_id` / `source_exception_id` 컬럼 추가
- GX 반복 규칙 생성 시 4주치 `trainer_schedules` 생성
- GX 예외 `OFF` / `OVERRIDE` 저장 시 대상 회차만 반영
- 예약이 존재하는 GX 회차 변경 시 자동 재동기화 차단
- 트레이너는 반복 규칙 생성 불가, 본인 규칙 회차 예외만 허용
- 프론트 `GX 스케줄` 화면에서 규칙/회차 예외 관리 가능

## Automated Validation

### Backend compile

```bash
cd /Users/abc/projects/GymCRM_V2/backend
./gradlew compileJava compileTestJava -x test
```

Result:
- ✅ PASS

### Backend integration

```bash
cd /Users/abc/projects/GymCRM_V2/backend
GRADLE_USER_HOME=/Users/abc/projects/GymCRM_V2/.gradle-local ./gradlew test --no-daemon --tests com.gymcrm.reservation.GxScheduleApiIntegrationTest
```

Result:
- ✅ PASS

Covered checks:
- 매니저가 GX 반복 규칙 생성 가능
- 스냅샷에 생성된 GX 슬롯 포함
- 트레이너는 반복 규칙 생성 불가
- 트레이너는 본인 GX 규칙 회차 예외 저장 가능
- 점유 중인 미래 GX 회차는 자동 규칙 변경 차단
- 점유 중인 다른 GX 규칙 충돌이 있어도 스냅샷 조회/신규 규칙 생성이 전체 실패로 전파되지 않음

### Reference regression

```bash
cd /Users/abc/projects/GymCRM_V2/backend
./gradlew test --no-daemon --tests com.gymcrm.trainer.TrainerAvailabilityApiIntegrationTest
```

Result:
- ✅ PASS

Purpose:
- 반복 규칙/예외 참고 패턴이던 trainer availability 기존 흐름 회귀 확인

### Frontend page smoke

```bash
cd /Users/abc/projects/GymCRM_V2/frontend
npm test -- GxSchedulesPage
```

Result:
- ✅ PASS

Covered checks:
- mock mode에서 GX 스케줄 화면 렌더
- manager 흐름에서 GX 규칙 생성 메시지/리스트 반영

### Frontend build

```bash
cd /Users/abc/projects/GymCRM_V2/frontend
npm run build
```

Result:
- ✅ PASS

## Operational Validation Notes

- 이번 변경은 새 운영 API와 운영 화면을 추가하지만, 기존 PT/GX 예약 생성 API 계약은 유지한다.
- 핵심 운영 리스크는 "예약이 존재하는 미래 GX 슬롯을 자동 덮어쓰는 것"이었고, 현재 구현은 이를 `CONFLICT`로 차단한다.
- `trainer_schedules.current_count` 증감 규칙은 기존 reservation lifecycle에 그대로 맡기고, GX 규칙 동기화는 `current_count == 0`인 미래 슬롯만 수정/삭제한다.

## Manual Validation Status

- 브라우저 자동 스모크: 자동화 한계로 부분 완료
- 실제 dev 서버 기반 화면 캡처: 완료
- 실제 브라우저 수동 QA: 완료

Validated:
- `center-admin / dev-admin-1234!` 로그인 후 `/dashboard` 진입 성공
- `/gx-schedules` 진입 성공
- dev DB 에 점유된 GX 회차 충돌 데이터가 있어도 화면이 비정상 종료되지 않고 기존 규칙/생성 회차 목록을 렌더링함
- 실제 브라우저 수동 클릭으로 manager 계정의 규칙 생성/수정/종료 흐름 확인 완료
- 실제 브라우저 수동 클릭으로 회차 예외 모달 저장 흐름 확인 완료
- 실제 브라우저 수동 클릭으로 규칙 모달 필수값/시간 순서 검증 메시지 확인 완료
- API 로 생성한 신규 규칙 `Manual QA API 1515` 가 브라우저 재조회 후 반복 규칙/생성 회차 목록에 모두 표시됨
- 해당 규칙에 `OFF` 예외 적용 후 브라우저 재조회 시 생성 회차 목록에서 제거됨
- 스크린샷 저장:
  - `tmp/browser-smoke/gx-schedules-smoke-2026-03-27.png`

Notes:
- 브라우저 자동화로는 `규칙 생성`, `회차 예외` 버튼 클릭 후 후속 요청/모달 동작을 안정적으로 재현하지 못했다.
- 대신 동일 payload 를 직접 API 로 호출해 성공을 확인하고, 브라우저 재조회 결과로 운영 화면 반영까지 검증했다.
- 최종 출하 전에는 실제 브라우저 수동 QA 로 생성/수정/종료/예외 저장 플로우를 별도로 완료했다.
- 대신 해당 시점에 발견된 핵심 이슈는 백엔드에서 수정했다.
  - 원인: `GET /api/v1/reservations/gx/snapshot` 가 다른 활성 규칙의 점유 충돌까지 전체 실패로 전파
  - 조치: snapshot refresh 시 `CONFLICT` 는 경고 로그로만 남기고 계속 진행하도록 변경

## Remaining Validation

- 구현/QA 종료 기준으로 필수 검증은 모두 완료했다.
- 추가 검증이 필요하다면 merge 이후 staging/dev 에서 trainer 권한 시나리오와 점유 회차 충돌 메시지 노출을 운영 회귀 점검으로 확인한다.

## Post-Deploy Monitoring & Validation

- **What to monitor/search**
  - Logs:
    - `GX 규칙을 찾을 수 없습니다`
    - `예약이 있는 GX 회차는 자동으로 변경할 수 없습니다`
    - `GX 반복 규칙을 변경할 권한이 없습니다`
  - Metrics/Dashboards:
    - 없음. 신규 메트릭 추가는 이번 범위에 포함되지 않음
- **Expected healthy behavior**
  - 관리자 규칙 저장 후 스냅샷에 4주치 회차가 일관되게 보임
  - 트레이너는 규칙 변경 대신 회차 예외만 저장 가능
  - 예약이 없는 미래 회차만 자동 동기화됨
- **Failure signals / mitigation trigger**
  - 규칙 저장 직후 생성 회차가 0건으로 보임
  - 예약이 있는 회차가 의도치 않게 사라짐
  - 트레이너가 규칙 CRUD를 수행할 수 있음
  - 발견 시 즉시 `/api/v1/reservations/gx/snapshot` 응답과 `trainer_schedules` row 상태 점검
- **Validation window & owner**
  - Window: first manual staging/dev smoke after merge
  - Owner: feature implementer or reservation module owner
