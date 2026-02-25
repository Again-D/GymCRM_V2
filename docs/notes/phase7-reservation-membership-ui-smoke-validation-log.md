# Phase 7 Reservation/Membership UI Smoke Validation Log

- Date: 2026-02-25
- Scope: Phase 7 예약/회원권 UI 핵심 동선 스모크 + 예약 폼 stale-state 회귀 확인
- Environment:
  - Backend: `dev + jwt` (`8080`)
  - Frontend: Vite (`127.0.0.1:5173`)
  - DB: Docker PostgreSQL (`5433`)
- Account: `center-admin`
- Tooling: `agent-browser` (session: `p7-smoke`)

## Smoke Checklist Reference

- `/Users/abc/projects/GymCRM_V2/docs/testing/gym-crm-phase7-reservation-membership-ui-smoke-checklist.md`

## Executed Scenarios (Result)

### S1. JWT Login Gate
- PASS: 로그인 화면(미인증) 노출 확인
- PASS: `center-admin` 로그인 후 사이드바 앱 셸 렌더링 확인
- PASS: 사이드바 탭(`대시보드/회원 관리/회원권 업무/예약 관리/상품 관리`) 노출 확인

### S2. Member Selection -> Membership Workspace
- PASS: `회원 관리` 탭에서 회원 목록/폼 렌더링 확인
- PASS: 회원 row 클릭 후 선택 상태/상세 패널 전환 확인
- PASS: `회원권 업무` 탭 이동 및 구매 폼/회원권 관련 패널 렌더링 확인

### S3. Reservation Workspace + Stale-State Regression Check
- PASS: `예약 관리` 탭 이동 및 패널 렌더링 확인
  - 예약 대상 회원 패널
  - 예약 생성 폼
  - 예약 스케줄 목록
  - 선택 회원 예약 목록
- PASS: 예약 폼에 임시 입력(`scheduleId=33`, memo=`stale-reset-check`) 후 회원 변경 수행
- PASS: 회원 변경 후 `예약 관리` 탭 복귀 시 예약 폼 초기화 확인
  - 예약 스케줄 값: 빈 값 (default)
  - 메모 값: 빈 값

## Evidence

- Screenshot:
  - `/Users/abc/projects/GymCRM_V2/docs/testing/artifacts/phase7-reservation-membership-smoke.png`

## Notes

- 이번 스모크는 **회귀 탐지 목적의 최소 동선 검증**이며, 예약 생성/완료/취소 및 COUNT 차감 정합성은 Phase 7 메인 검증 로그에서 이미 확인됨:
  - `/Users/abc/projects/GymCRM_V2/docs/notes/phase7-reservation-usage-deduction-validation-log.md`

