# Gym CRM Phase 7 Reservation/Membership UI Smoke Checklist

## Purpose

Phase 7(예약/차감) 및 Phase 6(사이드바 UI) 이후 회귀를 빠르게 확인하기 위한 최소 UI 스모크 체크리스트.

대상 범위:
- JWT 로그인 진입
- 회원 선택 흐름
- `회원권 업무` 탭 기본 렌더
- `예약 관리` 탭 기본 렌더 및 액션 패널 표시
- 권한/레이아웃 치명 회귀(탭 미노출, 패널 붕괴, 버튼 비활성 오동작) 빠른 탐지

## Preconditions

- Docker Postgres 실행 (`5433`)
- Backend 실행 (`dev + jwt`, `8080`)
- Frontend Vite 실행 (`127.0.0.1:5173`)
- 테스트 계정
  - `center-admin / dev-admin-1234!`

## Smoke Scenarios

### S1. JWT Login Gate
- [ ] 로그인 화면만 노출된다 (미인증 상태)
- [ ] `center-admin` 로그인 성공 후 사이드바 레이아웃이 렌더링된다
- [ ] 상단 모드 배지에 JWT 모드/사용자 정보가 표시된다

### S2. Member Selection -> Membership Workspace
- [ ] `회원 관리` 탭에서 회원 목록이 표시된다
- [ ] 회원 row 클릭 시 상세 패널/선택 상태가 갱신된다
- [ ] `회원권 업무` 탭으로 이동 가능하다
- [ ] 구매 패널/회원권 목록/결제 이력 패널이 렌더링된다

### S3. Reservation Workspace (selected member context)
- [ ] `예약 관리` 탭으로 이동 가능하다
- [ ] 선택 회원 요약 패널이 렌더링된다
- [ ] `예약 생성` 패널에 `회원권`, `예약 스케줄` 선택 필드가 보인다
- [ ] `예약 스케줄 목록`, `선택 회원 예약 목록` 패널이 렌더링된다
- [ ] 회원 변경 후 예약 생성 폼 값이 초기화된다 (stale `membershipId/scheduleId/memo` 없음)

## Recommended Frequency

- PR 생성 전 1회
- 머지 직전(큰 UI 리팩터링/권한 변경 포함 시)
- 예약/회원권/사이드바 관련 회귀 리포트 발생 시

## Evidence (Execution Log)

- 실행 결과는 검증 로그에 기록:
  - `/Users/abc/projects/GymCRM_V2/docs/notes/phase7-reservation-membership-ui-smoke-validation-log.md`

