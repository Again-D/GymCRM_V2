# Gym CRM Prototype Final Handoff Summary

- Date: 2026-02-24
- Status: **Prototype Complete (Phase 1 ~ Phase 4)**
- Scope: 관리자 포털 핵심 데스크 업무 프로토타입

## 1) What Is Delivered

현재 구현본은 아래 범위를 실제 동작 가능한 프로토타입으로 제공한다.

- 관리자 포털 UI (단일 페이지 앱)
- 회원 관리
  - 등록 / 목록 / 상세 / 수정
- 상품 관리
  - 등록 / 목록 / 상세 / 수정 / 상태 토글
- 회원권 구매
  - 기간제/횟수제 계산
  - 결제 이력 생성 (수기 결제 기록)
- 회원권 홀딩 / 해제
  - 상태 전이
  - 만료일 재산정
  - 홀딩 이력 기록
- 회원권 환불
  - 미리보기 / 확정
  - 환불 이력 + 환불 결제 기록
  - 재환불 차단

## 2) Key Technical Decisions (Prototype)

- 인증/인가:
  - no-auth 프로토타입 모드 사용
  - `dev/staging`만 허용, `prod` 차단
- 테넌트/식별자 표준:
  - `centerId` 사용
  - 숫자 PK 기반 (`memberId`, `productId`, `membershipId`)
- 외부 연동:
  - PG / QR 게이트 / 알림톡 미연동 (내부 플로우 검증 중심)
- 환불 정책:
  - `기준금액 - 사용분 - 10% 위약금`, 음수 0 clamp

## 3) Recent Review-Driven Hardening (Important)

### A. Membership Hold Concurrency Protection

- 활성 홀딩 중복 생성 방지용 DB partial unique index 추가:
  - `uk_membership_holds_membership_active`
- 홀딩 상태 변경 시 현재 상태 조건부 업데이트 적용
- unique violation을 API `CONFLICT`로 매핑

Related files:
- `/Users/abc/projects/GymCRM_V2/backend/src/main/resources/db/migration/V5__enforce_single_active_hold_per_membership.sql`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/membership/MembershipHoldService.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/membership/MemberMembershipRepository.java`

### B. Refund Policy Tightening for HOLDING Memberships

- 백엔드 환불 eligibility를 `ACTIVE` 상태만 허용하도록 제한
- `HOLDING` 상태 환불 시도는 business-rule 에러 반환

Related file:
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/membership/MembershipRefundService.java`

### C. UI Refund Guard Alignment

- `HOLDING` 상태에서 환불 폼/버튼 비노출
- 안내 문구 표시:
  - `홀딩 상태 회원권은 먼저 해제 후 환불해주세요.`

Related file:
- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`

## 4) How To Run Locally

### Prerequisites

- Docker (PostgreSQL 컨테이너 구동용)
- Java 21
- Node.js / npm

### 1. Start DB

```bash
cd /Users/abc/projects/GymCRM_V2
docker compose up -d postgres
```

### 2. Start Backend

```bash
cd /Users/abc/projects/GymCRM_V2/backend
SPRING_PROFILES_ACTIVE=dev \
DB_URL=jdbc:postgresql://localhost:5433/gymcrm_dev \
DB_USERNAME=gymcrm \
DB_PASSWORD=gymcrm \
./gradlew bootRun
```

### 3. Start Frontend

```bash
cd /Users/abc/projects/GymCRM_V2/frontend
npm run dev -- --host 127.0.0.1 --port 5173
```

### 4. Open

- `http://127.0.0.1:5173`

## 5) Validation Summary (Evidence)

### Shareable Release Notes (Short Version)

- `/Users/abc/projects/GymCRM_V2/docs/notes/prototype-release-notes.md`

### Completion / Exit Decision

- `/Users/abc/projects/GymCRM_V2/docs/notes/prototype-completion-readiness-decision.md`

### Integrated End-to-End + Data Integrity

- `/Users/abc/projects/GymCRM_V2/docs/notes/phase3-integrated-e2e-and-data-integrity-validation-log.md`

### Demo / Manual / Automated Test Artifacts

- Demo scenarios:
  - `/Users/abc/projects/GymCRM_V2/docs/testing/gym-crm-prototype-demo-scenarios.md`
- Manual checklist:
  - `/Users/abc/projects/GymCRM_V2/docs/testing/gym-crm-prototype-manual-test-checklist.md`
- Automated test runbook:
  - `/Users/abc/projects/GymCRM_V2/docs/testing/gym-crm-prototype-automated-test-runbook.md`

### Refund UI Validation + HOLDING Guard Regression

- `/Users/abc/projects/GymCRM_V2/docs/notes/phase3-refund-api-ui-validation-log.md`
- Screenshots:
  - `/Users/abc/projects/GymCRM_V2/docs/testing/artifacts/holding-refund-message-validation.png`
  - `/Users/abc/projects/GymCRM_V2/docs/testing/artifacts/holding-refund-message-validation-after-hold.png`

## 6) Latest Quality Check Snapshot (2026-02-24)

- Backend:
  - `GRADLE_USER_HOME=/Users/abc/projects/GymCRM_V2/.gradle-local ./gradlew test --no-daemon` ✅
- Frontend:
  - `npm run build` ✅
- DB migration/runtime:
  - Flyway `version=5` applied ✅
  - `uk_membership_holds_membership_active` index exists ✅

## 7) Known Constraints (Intentional)

운영 출시 준비 완료가 아니라 프로토타입 완료 상태다.

- JWT/RBAC 미구현
- 외부 연동(PG/QR/알림톡) 미구현
- 회원 앱/예약/출입/라커/정산/CRM 미구현
- 멀티 센터 운영 UI/권한 미구현

See:
- `/Users/abc/projects/GymCRM_V2/docs/notes/prototype-scope-deviations.md`

## 8) Suggested Next Phase (Recommended)

1. Phase 5: JWT + Refresh Token + RBAC 최소 도입
2. 공통 API 응답 표준 정렬 (`traceId`, 에러 구조)
3. 예약(PT/GX) + 횟수제 사용 차감 로직 확장

## 9) Handoff Notes

- 프로토타입 검증용 데이터가 로컬 DB에 누적되어 있음 (반복 시나리오 테스트 흔적 포함)
- UI 회원권/결제 목록은 “이번 세션 생성분” 표시 기준이므로 브라우저 새로고침 시 비워지는 것이 정상
- 리뷰 기반 보강사항(`V5`, 환불 정책/UI 가드)은 이미 테스트/브라우저 검증 및 로그 문서화 완료
- Git 커밋 정리가 필요하면 아래 전략 문서 참고:
  - `/Users/abc/projects/GymCRM_V2/docs/notes/prototype-commit-strategy.md`
- PR 생성 전 본문 초안 참고:
  - `/Users/abc/projects/GymCRM_V2/docs/notes/prototype-pr-body-draft.md`
- `main` 최신 통합 상태(Phase 5~8, PR #6/#7 반영) 요약:
  - `/Users/abc/projects/GymCRM_V2/docs/notes/main-branch-release-change-summary-2026-02-25.md`
- `main` 경영진 3줄 요약:
  - `/Users/abc/projects/GymCRM_V2/docs/notes/main-branch-release-change-summary-executive-3line-2026-02-25.md`
