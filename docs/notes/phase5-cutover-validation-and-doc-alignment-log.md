# Phase 5-6 Cutover Validation & Documentation Log

- Date: 2026-02-24
- Scope: Phase 5-6 (Cutover Validation & Documentation)

## Objective

`prototype(no-auth)` 중심 개발 흐름에서 `jwt` 모드 운영 기본기로 전환 가능한 상태인지 검증하고, 실행 가이드/문서 정합성을 업데이트한다.

## Completed Items

### 1) JWT Mode Core Flow Re-Validation (Login Included)

- 상태: ✅ 완료
- 근거 문서:
  - `/Users/abc/projects/GymCRM_V2/docs/notes/phase5-frontend-auth-transition-validation-log.md`
  - `/Users/abc/projects/GymCRM_V2/docs/notes/phase5-auth-api-validation-log.md`
  - `/Users/abc/projects/GymCRM_V2/docs/notes/phase5-rbac-authorization-validation-log.md`

요약:
- 로그인 → 회원권 구매 → 홀딩 → 해제 → 환불 플로우를 `jwt` 모드에서 재검증 완료
- refresh rotation / logout / replay 차단 확인
- `ROLE_DESK` 권한 매트릭스 통합테스트로 고정

### 2) Security Manual Checklist Added

- 상태: ✅ 완료
- 추가 문서:
  - `/Users/abc/projects/GymCRM_V2/docs/testing/gym-crm-phase5-auth-rbac-manual-test-checklist.md`

포함 범위:
- 로그인/로그아웃/세션복구
- refresh replay 차단
- RBAC (`CENTER_ADMIN`/`DESK`)
- jwt 모드 핵심 업무 E2E
- `traceId` 상관관계
- no-auth 개발옵션 제한 유지

### 3) Dev/Run Guide Updated

- 상태: ✅ 완료
- 갱신 문서:
  - `/Users/abc/projects/GymCRM_V2/README.md`
  - `/Users/abc/projects/GymCRM_V2/docs/notes/local-run-phase1.md`

반영 내용:
- `jwt` 모드 백엔드 실행 예시
- dev/staging seed 계정 정보
- Access/Refresh 기본 만료 정책 및 env override 키
- Vite dev proxy(`/api`) 설명

### 4) Documentation Alignment (JWT expiry / roles / center terminology)

- 상태: ✅ 완료
- 갱신 문서:
  - `/Users/abc/projects/GymCRM_V2/docs/notes/prototype-scope-deviations.md`
  - `/Users/abc/projects/GymCRM_V2/docs/notes/local-run-phase1.md`

정렬 내용:
- JWT 기본 만료 정책: `15분 / 7일` 명시
- Phase 5 최소 역할 구현 표준: `ROLE_CENTER_ADMIN`, `ROLE_DESK`
- 테넌트 canonical 용어: `center` / `centerId` (`gym/gymId`는 레거시 표기)

## Outcome

- `jwt` 모드 기준 핵심 업무/인증/권한/추적성 검증 증빙이 문서화되었고,
- 개발자가 no-auth 또는 jwt 모드 중 목적에 맞는 실행 경로를 선택할 수 있으며,
- 문서 간 표현 혼선을 줄이기 위한 최소 canonical 정렬이 완료되었다.

