# Gym CRM Main Branch Release / Change Summary

- Date: 2026-02-25
- Branch: `main`
- Status: **Integrated Through Phase 8 + Frontend Refactor**

## Summary

`main` 브랜치 기준으로 Gym CRM 관리자 포털은 프로토타입 핵심 데스크 업무(회원/상품/회원권) 이후 다음 확장까지 통합된 상태다.

- Phase 5: JWT + Refresh Token + RBAC + `traceId`
- Phase 6: 사이드바 기반 워크스페이스 UI 재구성 (로그인 우선 진입)
- Phase 7: 예약(PT/GX) + COUNT 회원권 완료 시 사용 차감
- Phase 8: 체크인 / 노쇼 / 사용 이벤트 무결성 강화
- PR #6: `App.tsx` 컴포넌트 분리 리팩터링
- PR #7: Phase 7 스모크 검증 산출물/리뷰 todo 정리 반영

## What Is Now Included (Main)

### Auth / Security / Observability

- JWT 로그인/로그아웃/토큰 재발급(회전) 기본 흐름
- Refresh replay 차단 + token family revoke 보강
- RBAC (`ROLE_CENTER_ADMIN`, `ROLE_DESK`) 적용
- `traceId` 응답/로그 정렬 (`X-Trace-Id`, body `traceId`)

### Admin Portal UI

- 로그인 우선 진입 (`jwt` 모드)
- 사이드바 기반 워크스페이스
  - 대시보드
  - 회원 관리
  - 회원권 업무
  - 예약 관리
  - 상품 관리
- `ROLE_DESK` 상품 변경 UX 제한 유지
- App 분해 리팩터링으로 `frontend/src/App.tsx` 책임 축소

### Core Desk Operations

- 회원 관리: 등록 / 목록 / 상세 / 수정
- 상품 관리: 등록 / 목록 / 상세 / 수정 / 상태 토글
- 회원권 업무:
  - 구매(기간제/횟수제)
  - 홀딩 / 해제
  - 환불(미리보기/확정)

### Reservation / Attendance (Phase 7~8)

- 예약 생성 / 목록 / 상세 / 완료 / 취소
- 예약 체크인 (`checked_in_at`)
- 예약 노쇼 (`NO_SHOW`, `no_show_at`)
- 예약 완료 시 COUNT 회원권 1회 차감
- `membership_usage_events` 기반 사용 이벤트 기록 (`RESERVATION_COMPLETE`)

## Key Integrity / Policy Rules (Current Main)

- `current_count = CONFIRMED 예약 수`
  - 생성 `+1`
  - 취소(`CONFIRMED -> CANCELLED`) `-1`
  - 완료(`CONFIRMED -> COMPLETED`) `-1`
  - 노쇼(`CONFIRMED -> NO_SHOW`) `-1`
- `membershipId`는 예약 생성 시 필수
- COUNT 회원권은 `remaining_count > 0`일 때만 예약 생성 허용
- 체크인은 `CONFIRMED` 상태에서 1회만 허용, 재체크인 `CONFLICT`
- `checked_in_at`가 있으면 `NO_SHOW` 불가
- `NO_SHOW`는 `schedule.end_at` 이후에만 허용
- 체크인/노쇼는 COUNT 차감 없음 (완료만 차감)
- `membership_usage_events`는 `(reservation_id, usage_event_type)` unique invariant로 중복 방지

## Recent Merged PRs Reflected in Main

### PR #5 (Phase 8)

- 체크인/노쇼/사용 이벤트 무결성 강화
- 예약 탭 UI에 체크인/노쇼 액션 및 가드 추가
- 검증 로그/스크린샷/계획 문서 완료 반영

### PR #6 (Frontend Refactor)

- `App.tsx` 대형 탭 렌더링을 feature/layout/shared 컴포넌트로 분리
- 기능 parity 유지 전제의 구조 리팩터링

### PR #7 (Documentation / Artifact Preservation)

- Phase 7 예약/회원권 UI 스모크 체크리스트 + 검증 로그 + 스크린샷 보존
- 관련 review todo(`025`, `026`) 추적 유지

## Validation Snapshot (Main Baseline)

- Backend reservation tests: `./gradlew test --no-daemon --tests 'com.gymcrm.reservation.*'` ✅
- Frontend build: `npm run build` ✅
- Phase 8 browser + SQL validation logs documented ✅
- Phase 7 reservation/membership UI smoke artifacts documented ✅

## Important Reference Documents

### Current Feature/Validation Logs

- Phase 7 reservation/usage deduction:
  - `/Users/abc/projects/GymCRM_V2/docs/notes/phase7-reservation-usage-deduction-validation-log.md`
- Phase 7 UI smoke:
  - `/Users/abc/projects/GymCRM_V2/docs/testing/gym-crm-phase7-reservation-membership-ui-smoke-checklist.md`
  - `/Users/abc/projects/GymCRM_V2/docs/notes/phase7-reservation-membership-ui-smoke-validation-log.md`
- Phase 8 attendance/check-in/no-show:
  - `/Users/abc/projects/GymCRM_V2/docs/notes/phase8-attendance-checkin-usage-foundation-validation-log.md`

### Plans / Institutional Learnings

- Phase 8 plan (completed):
  - `/Users/abc/projects/GymCRM_V2/docs/plans/2026-02-25-feat-phase8-attendance-checkin-and-usage-event-hardening-plan.md`
- Reservation capacity/usage integrity solution:
  - `/Users/abc/projects/GymCRM_V2/docs/solutions/database-issues/reservation-capacity-and-usage-deduction-integrity-gymcrm-20260225.md`
- Reservation check-in/no-show usage-event integrity solution:
  - `/Users/abc/projects/GymCRM_V2/docs/solutions/database-issues/reservation-checkin-noshow-usage-event-integrity-gymcrm-20260225.md`

## Known Constraints (Still Out of Scope)

- 외부 연동 미구현 (PG / QR 게이트 / 알림톡)
- 회원 모바일 앱 미구현
- 출입/라커/정산/CRM 전체 업무 미구현 (출석/노쇼는 예약 도메인 범위만 확장)
- 멀티센터 운영 확장 전면 완료 아님 (예약 도메인 중심 스코핑 보강은 반영됨)

## Suggested Next Steps

1. 예약/회원권 탭 브라우저 E2E 스모크 자동화 (수동/로그 의존 축소)
2. Phase 8 이후 `membership_usage_events` 이벤트 타입 확장 전략 수립
3. 다음 기능 확장 Phase 계획 (출입/체크인 운영 고도화 or 정산/CRM 방향 결정)
