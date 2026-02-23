# Gym CRM Prototype Manual Test Checklist

- Date: 2026-02-24
- Scope: Prototype Phase 1 ~ Phase 3 (관리자 포털, no-auth, 외부 연동 없음)
- Purpose: 수동/시연 검증 항목을 표준화하고 실제 실행 결과를 기록한다.

## Environment (Execution Baseline)

- DB: Docker Postgres (`gymcrm-postgres`, `localhost:5433`)
- Backend: Spring Boot (`dev` profile)
- Frontend: Vite (`127.0.0.1:5173`)

## Result Legend

- `PASS`: 기대 결과 충족
- `FAIL`: 기대 결과 불충족
- `PARTIAL`: 일부만 검증됨
- `SKIP`: 이번 실행에서 제외

## A. 회원 관리 (CRUD)

### A-1. 회원 등록 (정상)

- [x] 실행
- 입력 예시: `회원명`, `연락처`, 상태 `ACTIVE`
- 기대결과:
  - 목록에 신규 row 추가
  - 상세 패널 동기화
  - 성공 메시지 표시
- 결과: `PASS`
- 근거:
  - `/Users/abc/projects/GymCRM_V2/docs/notes/phase3-integrated-e2e-and-data-integrity-validation-log.md`
  - `/Users/abc/projects/GymCRM_V2/docs/notes/phase2-admin-portal-ui-validation-log.md`

### A-2. 회원 조회/상세 (정상)

- [x] 실행
- 기대결과:
  - 목록 조회 가능
  - row 선택 시 상세 패널 표시
- 결과: `PASS`
- 근거:
  - `/Users/abc/projects/GymCRM_V2/docs/notes/phase2-member-api-validation-log.md`
  - `/Users/abc/projects/GymCRM_V2/docs/notes/phase2-admin-portal-ui-validation-log.md`

### A-3. 회원 수정 (정상)

- [x] 실행
- 기대결과:
  - 수정 저장 성공
  - 목록/상세 값 동기화
- 결과: `PASS`
- 근거:
  - `/Users/abc/projects/GymCRM_V2/docs/notes/phase2-member-api-validation-log.md`
  - `/Users/abc/projects/GymCRM_V2/docs/notes/phase2-admin-portal-ui-validation-log.md`

### A-4. 회원 중복 연락처 등록 (예외)

- [x] 실행
- 기대결과:
  - `409 CONFLICT` 기반 오류 메시지 표시
- 결과: `PASS`
- 근거:
  - `/Users/abc/projects/GymCRM_V2/docs/notes/phase2-member-api-validation-log.md`
  - `/Users/abc/projects/GymCRM_V2/docs/notes/phase2-admin-portal-ui-validation-log.md`

## B. 상품 관리 (CRUD)

### B-1. 상품 등록 (정상)

- [x] 실행
- 기대결과:
  - 목록에 신규 row 추가
  - 상세 패널 동기화
  - 성공 메시지 표시
- 결과: `PASS`
- 근거:
  - `/Users/abc/projects/GymCRM_V2/docs/notes/phase3-integrated-e2e-and-data-integrity-validation-log.md`
  - `/Users/abc/projects/GymCRM_V2/docs/notes/phase2-product-api-validation-log.md`

### B-2. 상품 조회/상세 (정상)

- [x] 실행
- 기대결과:
  - 목록/상세 조회 성공
- 결과: `PASS`
- 근거:
  - `/Users/abc/projects/GymCRM_V2/docs/notes/phase2-product-api-validation-log.md`
  - `/Users/abc/projects/GymCRM_V2/docs/notes/phase2-admin-portal-ui-validation-log.md`

### B-3. 상품 수정 (정상)

- [x] 실행
- 기대결과:
  - 수정 저장 성공
  - 목록/상세 동기화
- 결과: `PASS`
- 근거:
  - `/Users/abc/projects/GymCRM_V2/docs/notes/phase2-product-api-validation-log.md`
  - `/Users/abc/projects/GymCRM_V2/docs/notes/phase2-admin-portal-ui-validation-log.md`

### B-4. 상품 상태 토글 (정상)

- [x] 실행
- 기대결과:
  - `ACTIVE/INACTIVE` 토글 반영
- 결과: `PASS`
- 근거:
  - `/Users/abc/projects/GymCRM_V2/docs/notes/phase2-product-api-validation-log.md`
  - `/Users/abc/projects/GymCRM_V2/docs/notes/phase2-admin-portal-ui-validation-log.md`

### B-5. 상품 정책 입력 예외 (예: COUNT + 총횟수 미입력)

- [x] 실행
- 기대결과:
  - 클라이언트 검증 메시지 표시
- 결과: `PASS`
- 근거:
  - `/Users/abc/projects/GymCRM_V2/docs/notes/phase2-admin-portal-ui-validation-log.md`

### B-6. 상품명 중복 등록 (예외)

- [x] 실행
- 기대결과:
  - `409 CONFLICT` 기반 오류 처리
- 결과: `PASS`
- 근거:
  - `/Users/abc/projects/GymCRM_V2/docs/notes/phase2-product-api-validation-log.md`

## C. 회원권 구매 / 홀딩 / 해제 / 환불

### C-1. 회원권 구매 (정상)

- [x] 실행
- 기대결과:
  - 구매 계산 미리보기 표시
  - 회원권 row 생성
  - 결제 이력 `PURCHASE` row 생성
- 결과: `PASS`
- 근거:
  - `/Users/abc/projects/GymCRM_V2/docs/notes/phase3-purchase-api-ui-validation-log.md`
  - `/Users/abc/projects/GymCRM_V2/docs/notes/phase3-integrated-e2e-and-data-integrity-validation-log.md`

### C-2. 구매 전 UI 가드 (상품 미선택 시 버튼 비활성화)

- [x] 실행
- 기대결과:
  - 구매 버튼 disabled
- 결과: `PASS`
- 근거:
  - `/Users/abc/projects/GymCRM_V2/docs/notes/phase3-purchase-api-ui-validation-log.md`

### C-3. 홀딩 (정상)

- [x] 실행
- 기대결과:
  - 상태 `ACTIVE -> HOLDING`
  - 안내 메시지 표시
- 결과: `PASS`
- 근거:
  - `/Users/abc/projects/GymCRM_V2/docs/notes/phase3-hold-resume-api-ui-validation-log.md`
  - `/Users/abc/projects/GymCRM_V2/docs/notes/phase3-integrated-e2e-and-data-integrity-validation-log.md`

### C-4. 해제 (정상)

- [x] 실행
- 기대결과:
  - 상태 `HOLDING -> ACTIVE`
  - 만료일 재산정 반영
- 결과: `PASS`
- 근거:
  - `/Users/abc/projects/GymCRM_V2/docs/notes/phase3-hold-resume-api-ui-validation-log.md`
  - `/Users/abc/projects/GymCRM_V2/docs/notes/phase3-integrated-e2e-and-data-integrity-validation-log.md`

### C-5. 홀딩 날짜 예외 (종료일 < 시작일)

- [x] 실행
- 기대결과:
  - 오류 메시지 표시
- 결과: `PASS`
- 근거:
  - `/Users/abc/projects/GymCRM_V2/docs/notes/phase3-hold-resume-api-ui-validation-log.md`

### C-6. 환불 미리보기 (정상)

- [x] 실행
- 기대결과:
  - 기준금액/사용분/위약금/환불액 표시
- 결과: `PASS`
- 근거:
  - `/Users/abc/projects/GymCRM_V2/docs/notes/phase3-refund-api-ui-validation-log.md`
  - `/Users/abc/projects/GymCRM_V2/docs/notes/phase3-integrated-e2e-and-data-integrity-validation-log.md`

### C-7. 환불 확정 (정상)

- [x] 실행
- 기대결과:
  - 상태 `REFUNDED`
  - 결제 이력 `REFUND` row 추가
- 결과: `PASS`
- 근거:
  - `/Users/abc/projects/GymCRM_V2/docs/notes/phase3-refund-api-ui-validation-log.md`
  - `/Users/abc/projects/GymCRM_V2/docs/notes/phase3-integrated-e2e-and-data-integrity-validation-log.md`

### C-8. 환불 후 불가 상태 메시지 / 재환불 방지 UX

- [x] 실행
- 기대결과:
  - 환불 불가 상태 메시지 표시
  - 동일 회원권에 추가 환불 액션 불가 상태 안내
- 결과: `PASS`
- 근거:
  - `/Users/abc/projects/GymCRM_V2/docs/notes/phase3-refund-api-ui-validation-log.md`
  - `/Users/abc/projects/GymCRM_V2/docs/notes/phase3-integrated-e2e-and-data-integrity-validation-log.md`

### C-9. 요청 중복 제출 방지 (로딩 상태)

- [x] 실행
- 기대결과:
  - 처리 중 버튼 비활성화/로딩 라벨 표시
- 결과: `PASS`
- 근거:
  - `/Users/abc/projects/GymCRM_V2/docs/notes/phase3-refund-api-ui-validation-log.md`
  - `/Users/abc/projects/GymCRM_V2/docs/notes/phase3-refund-api-ui-validation-log.md` (코드/런타임 확인)

## D. no-auth 모드 제한 (운영 안전장치)

### D-1. `dev` 프로필 no-auth 허용

- [x] 실행
- 기대결과:
  - 백엔드 기동 성공
  - UI 접근 가능
- 결과: `PASS`
- 근거:
  - `/Users/abc/projects/GymCRM_V2/docs/notes/phase1-db-validation-log.md`
  - `/Users/abc/projects/GymCRM_V2/docs/notes/phase3-integrated-e2e-and-data-integrity-validation-log.md`

### D-2. `prod` 프로필 + no-auth 활성화 시 강제 차단

- [x] 실행 (2026-02-24 재검증)
- 실행 명령:
  - `APP_PROTOTYPE_NO_AUTH_ENABLED=true SPRING_PROFILES_ACTIVE=prod ... ./gradlew bootRun --no-daemon`
- 기대결과:
  - 앱 기동 실패
  - `Prototype no-auth mode is only allowed in dev/staging profiles.` 예외
- 결과: `PASS`
- 근거:
  - 본 문서 작성 시 재실행 로그 (Codex terminal output)

## Execution Summary

- 총 항목: 17
- PASS: 17
- FAIL: 0
- PARTIAL: 0
- SKIP: 0

## Notes / Residual Risk

- 본 체크리스트는 프로토타입 범위 기준이며, JWT/RBAC/외부연동(PG/QR/알림톡) 검증은 포함하지 않는다.
- 일부 항목은 기존 Phase 검증 로그를 근거로 재사용했으며, `P3-9` 통합 검증으로 핵심 업무 플로우 연계 동작을 추가 확인했다.
