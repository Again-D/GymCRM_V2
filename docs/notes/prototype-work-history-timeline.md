# Gym CRM Prototype Work History Timeline

- Document Date: 2026-02-24
- Coverage Period: 2026-02-23 ~ 2026-02-24
- Project: `/Users/abc/projects/GymCRM_V2`

## Purpose

프로토타입 작업 진행 내역을 날짜 기준으로 남겨, 이후 재참조(핸드오프/후속 계획/PR 리뷰)에 사용할 수 있도록 정리한다.

## 2026-02-23 (Planning / Scope Fixing / Foundation Setup)

### 1) 브레인스토밍 및 범위 확정

- 관리자 포털만 / 외부 연동 없음 / 핵심 데스크 업무(회원/상품/회원권 구매·홀딩·환불) 범위 확정
- `ADMIN` 단일 역할, no-auth 프로토타입 모드, 숫자 PK 우선 전략 확정
- 장기 역할 체계와 완료 기준 방향 확정

관련 문서:
- `/Users/abc/projects/GymCRM_V2/docs/brainstorms/2026-02-23-gym-crm-product-brainstorm.md`

### 2) 프로토타입 구현 계획 및 실행 체크리스트 작성

- Phase 1~4 계획 문서 작성
- 실행용 체크리스트(P1-1 ~ P4-5) 작성
- 문서 불일치(JWT/역할명/center vs gym/식별자) 대응 규칙 정리

관련 문서:
- `/Users/abc/projects/GymCRM_V2/docs/plans/2026-02-23-feat-gym-crm-admin-portal-core-prototype-plan.md`
- `/Users/abc/projects/GymCRM_V2/docs/plans/2026-02-23-feat-gym-crm-admin-portal-core-prototype-execution-checklist-plan.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/prototype-canonical-rules.md`

### 3) Phase 1 기반 구현 착수

- 백엔드/프론트 스캐폴딩 생성
- 공통 API 응답/예외 처리, no-auth 가드, health API, Flyway 초기 마이그레이션 작성
- 로컬 실행 가이드/추적 노트 작성

관련 문서/파일:
- `/Users/abc/projects/GymCRM_V2/docs/notes/local-run-phase1.md`
- `/Users/abc/projects/GymCRM_V2/todos/phase1-foundation-tracking.md`

### 4) Gradle 표준화 계획 수립 및 Phase 1.5 통합

- 설계서 대비 `Maven vs Gradle` 불일치 확인
- Gradle 표준화 계획 문서 작성 및 실행 체크리스트에 `Phase 1.5` 통합

관련 문서:
- `/Users/abc/projects/GymCRM_V2/docs/plans/2026-02-23-refactor-backend-build-tool-gradle-standardization-plan.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/phase15-gradle-standardization-log.md`

### 5) 개발 DB 전략 결정 (Docker 표준, 로컬 DB fallback)

- 개발 DB provisioning 전략 검토 후 Docker(PostgreSQL 컨테이너) 표준 채택
- `compose.yaml` 도입 방향 확정

관련 문서:
- `/Users/abc/projects/GymCRM_V2/docs/plans/2026-02-23-refactor-prototype-dev-db-provisioning-strategy-plan.md`

## 2026-02-24 (Implementation / Validation / Hardening / Handoff)

### 1) Phase 1 / 1.5 완료

- Gradle wrapper 추가 및 실행 검증 (`tasks`, `test`, `bootRun`)
- Docker PostgreSQL 기반 Flyway 실제 적용/재실행 검증
- no-auth `dev/staging` 허용 + `prod` 차단 런타임 검증
- API 응답/예외 샘플 검증

관련 문서:
- `/Users/abc/projects/GymCRM_V2/docs/notes/phase1-db-validation-log.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/phase15-gradle-standardization-log.md`

### 2) 리뷰 findings 반영 (공통 기반 품질 보강)

- JDBC starter 추가로 DataSource/Flyway 경로 실제 활성화
- API timestamp UTC 고정
- no-auth 기본값/가드 강화
- 내부 예외 메시지 노출 제거
- 회원 create/update validation 일관성 및 공백값 저장 방지 수정

관련 todo(완료):
- `/Users/abc/projects/GymCRM_V2/todos/001-complete-p1-missing-jdbc-starter-breaks-flyway-datasource.md`
- `/Users/abc/projects/GymCRM_V2/todos/002-complete-p2-no-auth-guard-relies-only-on-prod-profile.md`
- `/Users/abc/projects/GymCRM_V2/todos/003-complete-p2-internal-exception-message-leakage.md`
- `/Users/abc/projects/GymCRM_V2/todos/004-complete-p2-apiresponse-timestamp-not-forced-utc.md`
- `/Users/abc/projects/GymCRM_V2/todos/007-complete-p2-member-create-status-gender-case-handling-inconsistent-with-controller.md`
- `/Users/abc/projects/GymCRM_V2/todos/008-complete-p2-member-update-allows-blank-name-phone.md`

### 3) Phase 2 구현 완료 (회원/상품 CRUD + 관리자 포털 UI)

- `members`, `products` 스키마 및 기본 센터 시드 추가
- 회원 API / 상품 API 구현 및 수동 검증
- 관리자 포털 UI(회원/상품 CRUD) 구현
- CORS 설정 추가 및 UI 브라우저 검증 완료
- reset stale-state 버그 및 GET Content-Type preflight 유발 이슈 수정

관련 문서:
- `/Users/abc/projects/GymCRM_V2/docs/notes/phase2-schema-bootstrap-decisions.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/phase2-member-api-validation-log.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/phase2-product-api-validation-log.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/phase2-admin-portal-ui-validation-log.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/phase2-api-ui-route-map-and-phase3-seed-scenarios.md`

관련 todo(완료):
- `/Users/abc/projects/GymCRM_V2/todos/005-complete-p2-reset-search-uses-stale-state-in-ui.md`
- `/Users/abc/projects/GymCRM_V2/todos/006-complete-p3-get-requests-always-send-json-content-type.md`

### 4) Phase 3 구현 완료 (구매/홀딩/해제/환불)

- `member_memberships`, `payments`, `membership_holds`, `membership_refunds` 스키마 추가
- 회원권 상태 전이 규칙 정의/테스트
- 구매 계산/생성 로직 + API/UI
- 홀딩/해제 로직 + API/UI
- 환불 계산/처리 로직 + API/UI
- 통합 E2E 및 데이터 정합성(SQL) 검증 완료

관련 문서:
- `/Users/abc/projects/GymCRM_V2/docs/notes/phase3-schema-validation-log.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/phase3-membership-status-transition-rules.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/phase3-purchase-service-validation-log.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/phase3-purchase-api-ui-validation-log.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/phase3-hold-resume-service-validation-log.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/phase3-hold-resume-api-ui-validation-log.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/phase3-refund-service-validation-log.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/phase3-refund-api-ui-validation-log.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/phase3-integrated-e2e-and-data-integrity-validation-log.md`

### 5) Phase 4 완료 (데모/수동/자동테스트/완료 판정)

- 데모 시나리오 문서 작성
- 수동 테스트 체크리스트 작성 및 실행 기록 (`PASS 17`)
- 최소 자동 테스트 보강 및 runbook 작성
- 프로토타입 제한사항/차이 문서화
- 완료 판정 문서 작성 (Prototype Complete)

관련 문서:
- `/Users/abc/projects/GymCRM_V2/docs/testing/gym-crm-prototype-demo-scenarios.md`
- `/Users/abc/projects/GymCRM_V2/docs/testing/gym-crm-prototype-manual-test-checklist.md`
- `/Users/abc/projects/GymCRM_V2/docs/testing/gym-crm-prototype-automated-test-runbook.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/prototype-scope-deviations.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/prototype-completion-readiness-decision.md`

### 6) 리뷰 findings 반영 (홀딩 동시성 / HOLDING 환불 정책)

- `V5` partial unique index로 활성 홀딩 중복 방지
- 홀딩 상태 변경 조건부 업데이트 + unique violation `CONFLICT` 매핑
- `HOLDING` 환불 금지로 정책 단순화/정합성 확보
- UI 환불 가드 정렬 (`HOLDING`에서 환불 버튼 숨김 + 안내 문구)
- 브라우저 회귀 검증 및 스크린샷 증빙 추가

관련 todo(완료):
- `/Users/abc/projects/GymCRM_V2/todos/009-complete-p1-membership-hold-race-can-create-duplicate-active-holds.md`
- `/Users/abc/projects/GymCRM_V2/todos/010-complete-p2-refund-during-holding-leaves-active-hold-orphaned.md`

관련 증빙:
- `/Users/abc/projects/GymCRM_V2/docs/testing/artifacts/holding-refund-message-validation.png`
- `/Users/abc/projects/GymCRM_V2/docs/testing/artifacts/holding-refund-message-validation-after-hold.png`
- `/Users/abc/projects/GymCRM_V2/docs/notes/phase3-refund-api-ui-validation-log.md`

### 7) 핸드오프/릴리즈/PR 준비 문서 작성

- 최종 핸드오프 요약
- 공유용 릴리즈 노트
- 커밋 전략 문서 (baseline-first)
- PR 본문 초안 문서

관련 문서:
- `/Users/abc/projects/GymCRM_V2/docs/notes/prototype-final-handoff-summary.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/prototype-release-notes.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/prototype-commit-strategy.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/prototype-pr-body-draft.md`

### 8) Git baseline 정리 및 원격 브랜치 준비

- 브랜치 생성: `codex/prototype-baseline`
- baseline 커밋 생성 후 `.gitignore` 보강 커밋 추가
- 원격 `origin` 추적 설정 확인 (`codex/prototype-baseline`)

커밋:
- `e4dc102` `feat(prototype): add gym crm admin portal core prototype baseline`
- `fbfd2d6` `chore(git): ignore local build artifacts`
- `8d392d1` `docs(prototype): add pr body draft for baseline handoff`

### 9) 지식 축적(Compounding) 문서화

- 해결된 비정합 이슈(홀딩 동시성 + HOLDING 환불 정책/UI 가드) 문서를 `docs/solutions/`에 기록

관련 문서:
- `/Users/abc/projects/GymCRM_V2/docs/solutions/database-issues/membership-hold-refund-state-integrity-gymcrm-20260224.md`

## Current Status (as of 2026-02-24)

- Prototype status: **Complete** (Phase 1 ~ Phase 4 완료 판정)
- Branch: `codex/prototype-baseline`
- Working tree: clean
- Remote tracking: `origin/codex/prototype-baseline`
- PR automation status: `gh` CLI 부재로 로컬 자동 생성 미실행 (비교 URL + PR 본문 초안 준비 완료)

## Quick Reference

- 실행 체크리스트(완료 기준):
  - `/Users/abc/projects/GymCRM_V2/docs/plans/2026-02-23-feat-gym-crm-admin-portal-core-prototype-execution-checklist-plan.md`
- 최종 완료 판정:
  - `/Users/abc/projects/GymCRM_V2/docs/notes/prototype-completion-readiness-decision.md`
- 최종 핸드오프:
  - `/Users/abc/projects/GymCRM_V2/docs/notes/prototype-final-handoff-summary.md`
- 릴리즈 노트:
  - `/Users/abc/projects/GymCRM_V2/docs/notes/prototype-release-notes.md`
