# Phase 6 Sidebar Shell UI Validation Log

- Date: 2026-02-24
- Scope: Phase 6 frontend sidebar shell / membership workspace move / DESK product UX
- Branch: `codex/feat-phase6-frontend-sidebar-shell`

## Environment

- Backend: `dev + jwt` on `http://127.0.0.1:8084`
- Frontend: Vite dev on `http://127.0.0.1:5173`
- DB: Docker PostgreSQL (`gymcrm-postgres`, `5433`)

## Validation Summary

### 1) JWT Login Gate + Sidebar Shell (CENTER_ADMIN)

- `center-admin / dev-admin-1234!` 로그인 성공
- 로그인 후 사이드바 셸 노출 확인
  - `대시보드`
  - `회원 관리`
  - `회원권 업무`
  - `상품 관리`
- 대시보드에서 빠른 진입 버튼 노출 확인

Result: `PASS`

### 2) 회원 선택 후 회원권 업무 탭 이동 (CENTER_ADMIN)

- 회원 관리에서 기존 회원 선택 (`P3환불테스트회원-174fa070`)
- 회원권 업무 탭 이동
- 선택 회원 요약 카드 노출 확인
- 회원권 구매 폼 노출 확인
- 회원권 목록/결제 이력 패널 노출 확인
- 회원권 액션 컬럼(홀딩/해제/환불) UI 렌더링 확인

Result: `PASS`

### 3) DESK 권한 상품 변경 UX 제한

- `desk-user` 로그인 성공 (로컬 검증용으로 `center-admin`과 동일 비밀번호 해시 사용)
- 상품 관리 탭 진입
- 상품 목록 패널 안내 문구 노출 확인:
  - `DESK 권한은 상품 조회만 가능합니다. 상품 등록/수정/상태변경은 제한됩니다.`
- `신규 등록` 버튼 disabled 확인
- 상품 등록/수정 폼 전체 disabled 확인 (`fieldset`)
- 저장 버튼 disabled 확인

Result: `PASS`

### 4) JWT 모드 핵심 회원권 업무 E2E (새 사이드바/회원권 업무 탭)

- `center-admin` 로그인
- `회원 관리` 탭에서 활성 회원 선택 (`P3환불테스트회원-174fa070`)
- `회원권 업무` 탭 이동
- 구매 수행 (상품 `#171 · P3환불기간제-e4e6aa38`)
- 같은 탭에서 `홀딩` 수행
- `HOLDING` 상태에서 환불 버튼 비노출 + 안내 문구 확인
  - `홀딩 상태 회원권은 먼저 해제 후 환불해주세요.`
- `홀딩 해제` 수행 후 환불 버튼 재노출 확인
- `환불 미리보기 → 환불 확정` 수행
- 최종 상태 `REFUNDED` 및 결제 이력(`PURCHASE`, `REFUND`) 반영 확인

Observed UI result (example):
- membership row: `membership_id=165`, status `REFUNDED`
- payment rows: `PURCHASE` + `REFUND`

Result: `PASS`

### 5) 모바일(좁은 화면) 레이아웃 기본 렌더 점검 (`390x844`)

- `center-admin` 로그인 성공 후 모바일 뷰포트(`390x844`)로 전환
- 사이드바 네비게이션 버튼 스택 렌더링 확인
  - `대시보드 / 회원 관리 / 회원권 업무 / 상품 관리`
- `회원 관리` 탭 전환 후 목록/검색/등록 폼 입력 영역이 화면 폭 내에서 렌더링되는지 확인
- `상품 관리` 탭 전환 후 필터/상품 폼 입력 영역이 화면 폭 내에서 렌더링되는지 확인
- 주요 UI가 겹치거나 잘려서 조작 불가능해지는 현상 없음 확인

Artifacts:
- `/Users/abc/projects/GymCRM_V2/docs/testing/artifacts/phase6-mobile-members-view.png`
- `/Users/abc/projects/GymCRM_V2/docs/testing/artifacts/phase6-mobile-products-view.png`

Result: `PASS`

### 6) 회원/상품 CRUD UI 회귀 점검 (CENTER_ADMIN, 새 사이드바 레이아웃)

- `회원 관리` 탭
  - 신규 회원 등록 수행 (`P6회원-042746`)
  - 등록 직후 수정 모드 전환 확인 (상세/읽기 경로 유지)
  - 회원명/메모 수정 후 저장 수행 (`P6회원-042746-수정`)
  - 수정 후 폼 값 재조회로 반영 확인
- `상품 관리` 탭
  - 신규 기간제 상품 등록 수행 (`P6상품-042746`)
  - 등록 직후 수정 모드 전환 확인
  - 상품명/가격 수정 후 저장 수행 (`P6상품-042746-수정`, `88000`)
  - 상태 토글 `ACTIVE -> INACTIVE` 수행 및 버튼 라벨/상태 셀렉트 반영 확인

Observed UI result (example):
- member form value after update: `P6회원-042746-수정`
- product form value after update: `P6상품-042746-수정`
- product status toggle button label: `상태 토글 (INACTIVE)`

Result: `PASS`

## Notes / Discoveries

- `5174` 포트에서 프론트를 띄워 검증할 때 로그인 `403`이 발생했음.
- 원인: 백엔드 CORS 허용 오리진이 `127.0.0.1:5173` 기준이라 `5174`는 `Invalid CORS request`.
- 코드 회귀가 아니라 로컬 검증 포트 설정 이슈였으며, `5173`로 재기동 후 정상 검증 완료.
- `desk-user` 계정 실검증을 위해 로컬 개발 DB에서 `center-admin`과 동일 비밀번호 해시로 임시 동기화하여 로그인 검증함 (개발 DB 한정).

## Commands Used (excerpt)

```bash
# frontend build
cd /Users/abc/projects/GymCRM_V2/frontend
npm run build

# backend (jwt mode)
cd /Users/abc/projects/GymCRM_V2/backend
SPRING_PROFILES_ACTIVE=dev APP_SECURITY_MODE=jwt DB_URL=jdbc:postgresql://localhost:5433/gymcrm_dev DB_USERNAME=gymcrm DB_PASSWORD=gymcrm PORT=8084 ./gradlew bootRun

# frontend dev (vite proxy -> 8084)
cd /Users/abc/projects/GymCRM_V2/frontend
VITE_DEV_PROXY_TARGET=http://127.0.0.1:8084 npm run dev -- --host 127.0.0.1 --port 5173
```
