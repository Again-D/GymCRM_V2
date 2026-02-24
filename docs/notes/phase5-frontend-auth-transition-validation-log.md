# Phase 5-4 Frontend Auth Transition Validation Log

- Date: 2026-02-24
- Scope: Phase 5-4 (Frontend Auth Transition / Admin Portal)

## Implemented (This Turn)

- 로그인 게이트 UI 추가 (JWT 모드에서 미인증 시 보호 화면 대신 로그인 화면 표시)
- 보안 모드 부트스트랩 (`/api/v1/health`) + 모드별 화면 분기
  - `prototype` 모드: 기존 no-auth 동작 유지
  - `jwt` 모드: 로그인 필요
- access token 메모리 저장 + refresh cookie 기반 세션 복구 부트스트랩
- API client 인증 확장
  - `Authorization: Bearer` 자동 주입
  - `credentials: include`
  - `401` 시 refresh 1회 재시도 + unauthorized 콜백
- 로그아웃 처리 (`/api/v1/auth/logout`) 및 로컬 보호 UI 상태 초기화
- Vite dev proxy(`/api`) 추가 (`VITE_DEV_PROXY_TARGET` 지원)
- 안전 가드: 보안 모드 확인 실패(`unknown`) 시 보호 화면 노출 금지

## Build Verification

Command:

```bash
cd /Users/abc/projects/GymCRM_V2/frontend
npm run build
```

Result:
- ✅ PASS

## Runtime Verification (Manual Browser via agent-browser)

Runtime setup:
- Backend: `dev + jwt`, `PORT=8080`
- Frontend: Vite dev server `127.0.0.1:5173` (proxy `/api` → backend)

Validated flows:

1. **로그인 전 보호 화면 접근 차단**
- `http://127.0.0.1:5173/` 진입 시 로그인 폼 노출 확인
- 회원/상품 CRUD 화면 요소 미노출 확인

2. **로그인 성공 후 보호 화면 접근**
- `center-admin / dev-admin-1234!` 로그인
- 회원/상품 탭 및 기존 관리자 화면 요소 노출 확인
- 상단 `로그아웃` 버튼 노출 확인

3. **로그아웃 후 재차단**
- 로그아웃 클릭
- 로그인 폼으로 복귀 확인

4. **refresh cookie 기반 세션 복구**
- 로그인 후 페이지 새로고침
- 로그인 화면이 아닌 보호 화면으로 자동 복귀 확인 (silent refresh 성공)

## Bug Found During Validation (Fixed)

- 증상: 로그인 화면 대신 보호 화면이 노출됨
- 원인:
  - API client 기본 base URL을 `/api`로 변경하면서 기존 호출 경로(`/api/v1/...`)와 중복되어 `/api/api/v1/...` 요청 발생
  - health bootstrap 실패 시 `securityMode=unknown` 상태에서 보호 화면으로 fallthrough
- 조치:
  - 기본 base URL을 `""`로 수정 (호출 경로 그대로 사용)
  - `unknown` 모드 전용 오류 화면 추가 (보호 화면 노출 차단)
- 재검증: 로그인 화면 정상 노출 확인

## Additional Bug Found During JWT Core E2E (Fixed)

- 증상: 회원권 구매/홀딩/환불 액션 중 `토큰이 만료되었습니다.` 메시지가 반복되고 액션 재시도가 실패할 수 있음
- 원인 (2단계):
  - `401` 후 재시도 시 기존 `Authorization` 헤더(만료 토큰)가 유지됨
  - refresh 성공 후에도 같은 렌더의 stale closure가 이전 access token을 읽어 재시도 요청에 사용
- 조치 (`frontend/src/shared/api/client.ts`)
  - 요청 생성 시 `Authorization` 헤더를 항상 최신 토큰으로 덮어쓰기
  - 재시도 시 refresh 결과의 새 access token을 `overrideAccessToken`으로 직접 주입
- 빌드 재검증:
  - ✅ `npm run build`

## JWT Core E2E Re-Validation (Login Included) - PASS

검증 목적:
- `jwt` 모드에서 로그인 포함 핵심 업무 플로우가 실제로 끝까지 동작하는지 확인

Runtime setup:
- Backend: `dev + jwt`, `PORT=8080`
- Frontend: Vite dev server `127.0.0.1:5173`

Test data:
- Member: `member_id=140` (`JWT회원-182228`)
- Product: `product_id=147` (`JWT-E2E-상품-182228`)

Validated flow (agent-browser):
- ✅ 로그인 (`center-admin / dev-admin-1234!`)
- ✅ 회원 검색 및 상세 진입 (`JWT회원-182228`)
- ✅ 회원권 구매 (상품 `#147`)
- ✅ 홀딩 (`2026-02-25 ~ 2026-02-26`)
- ✅ 홀딩 해제 (`2026-02-26`)
- ✅ 환불 미리보기 + 환불 확정

Final UI confirmation:
- ✅ 대상 회원권 row 상태 `REFUNDED`
- ✅ 안내 문구 `환불 불가 상태입니다. 현재 상태: REFUNDED`
- ✅ 성공 메시지 `회원권 환불이 완료되었습니다.`

DB verification (PostgreSQL):
- ✅ latest membership (`member_id=140`, `product_id=147`) = `membership_id=144`, `REFUNDED`
- ✅ `hold_days_used=2`, `hold_count_used=1`, `end_date=2026-03-27`
- ✅ `membership_holds` latest row = `membership_hold_id=51`, `RESUMED`, `actual_hold_days=2`
- ✅ `membership_refunds` latest row = `membership_refund_id=33`, `COMPLETED`, `refund_amount=110700.00`
- ✅ `payments` rows for `membership_id=144`:
  - `PURCHASE` `123000.00`
  - `REFUND` `110700.00`

## Remaining Validation (Phase 5-4 closeout)

- `DESK` 계정 프론트 UX에서 권한 실패(403) 메시지 동작 확인
