# Gym CRM Phase 5 Auth/RBAC Manual Test Checklist

- Date: 2026-02-24
- Scope: Phase 5 (`JWT + Refresh Token + RBAC + traceId`)
- Runtime Baseline: `dev + jwt`, Docker PostgreSQL, Vite dev proxy(`/api`)

## A. Auth Login / Session

### A-1. 로그인 성공 (`center-admin`)

- Steps
  - 로그인 화면에서 `center-admin / dev-admin-1234!` 입력
  - 로그인 버튼 클릭
- Expected
  - 보호 화면(회원/상품 탭) 진입
  - 상단 사용자/로그아웃 UI 노출
- Result
  - `PASS` (근거: `/Users/abc/projects/GymCRM_V2/docs/notes/phase5-frontend-auth-transition-validation-log.md`)

### A-2. 로그인 실패 (잘못된 비밀번호)

- Steps
  - 잘못된 비밀번호로 로그인 시도
- Expected
  - `401` 기반 오류 메시지 표시
- Result
  - `PASS` (근거: `/Users/abc/projects/GymCRM_V2/docs/notes/phase5-auth-api-validation-log.md`)

### A-3. 새로고침 후 세션 복구 (refresh cookie)

- Steps
  - 로그인 후 페이지 새로고침
- Expected
  - 로그인 화면으로 튕기지 않고 보호 화면 유지
- Result
  - `PASS` (근거: `/Users/abc/projects/GymCRM_V2/docs/notes/phase5-frontend-auth-transition-validation-log.md`)

### A-4. 로그아웃 후 refresh 재사용 차단

- Steps
  - 로그인 → refresh → logout
  - 이전 refresh cookie로 `/auth/refresh` 재호출
- Expected
  - `401` (`TOKEN_REVOKED`)
- Result
  - `PASS` (근거: `/Users/abc/projects/GymCRM_V2/docs/notes/phase5-auth-api-validation-log.md`)

## B. RBAC (ROLE_CENTER_ADMIN / ROLE_DESK)

### B-1. `ROLE_DESK` 상품 조회 허용

- Expected
  - 상품 목록/상세 조회 허용
- Result
  - `PASS` (근거: RBAC 통합테스트 `/Users/abc/projects/GymCRM_V2/docs/notes/phase5-rbac-authorization-validation-log.md`)

### B-2. `ROLE_DESK` 상품 변경 금지

- Expected
  - 상품 등록/수정/상태변경 `403 ACCESS_DENIED`
- Result
  - `PASS` (근거: RBAC 통합테스트 `/Users/abc/projects/GymCRM_V2/docs/notes/phase5-rbac-authorization-validation-log.md`)

### B-3. `ROLE_DESK` 회원/회원권 업무 허용

- Expected
  - 회원 등록/수정, 구매/홀딩/해제/환불 허용
- Result
  - `PASS` (근거: RBAC 통합테스트 `/Users/abc/projects/GymCRM_V2/docs/notes/phase5-rbac-authorization-validation-log.md`)

## C. JWT Mode Core Business E2E (Login Included)

### C-1. 핵심 업무 흐름 재검증

- Flow
  - 로그인 → 회원 선택 → 회원권 구매 → 홀딩 → 해제 → 환불
- Expected
  - 각 단계 성공 + 최종 상태 `REFUNDED`
- Result
  - `PASS` (근거: `/Users/abc/projects/GymCRM_V2/docs/notes/phase5-frontend-auth-transition-validation-log.md`)

## D. Traceability (`traceId`)

### D-1. 성공 응답 traceId

- Steps
  - `GET /api/v1/health` with `X-Trace-Id`
- Expected
  - 응답 헤더/본문에 동일 `traceId`
- Result
  - `PASS` (근거: `/Users/abc/projects/GymCRM_V2/docs/notes/phase5-traceid-alignment-validation-log.md`)

### D-2. 에러 응답 + 로그 traceId 상관관계

- Steps
  - 인증 후 malformed JSON 요청 전송
- Expected
  - 에러 응답 헤더/본문 + 서버 로그에 동일 `traceId`
- Result
  - `PASS` (근거: `/Users/abc/projects/GymCRM_V2/docs/notes/phase5-traceid-alignment-validation-log.md`)

## E. no-auth 개발 옵션 제한 유지

### E-1. `dev/staging` no-auth 허용 / `prod` 차단

- Expected
  - `dev/staging` 허용
  - `prod + APP_PROTOTYPE_NO_AUTH_ENABLED=true` 기동 실패
- Result
  - `PASS` (근거: `/Users/abc/projects/GymCRM_V2/docs/testing/gym-crm-prototype-manual-test-checklist.md`, `/Users/abc/projects/GymCRM_V2/docs/notes/phase5-auth-rbac-foundation-validation-log.md`)

## Summary

- Total checks: `10`
- Result: `10 PASS`
- Note: 일부 항목은 UI 수동검증, 일부는 API 수동검증/통합테스트 로그를 근거로 통합 판정함.

