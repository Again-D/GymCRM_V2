---
status: complete
priority: p1
issue_id: "027"
tags: [phase9, access, backend, frontend, operations]
dependencies: []
---

# Phase 9 출입/체크인 운영 고도화 구현

## Problem Statement

Phase 8까지 예약/체크인/노쇼/차감은 구현되었지만, 운영 관점의 독립 출입 이벤트(`ENTRY_GRANTED`, `EXIT`, `ENTRY_DENIED`)와 현재 입장중 상태(open session) 모델이 없어 데스크 운영/감사 추적/확장(게이트 연동) 기반이 부족하다.

## Findings

- 현재 백엔드는 `reservations` 중심 체크인만 존재하며 출입 이벤트 테이블과 API가 없음.
- 운영자가 예약 없이 방문한 회원의 입장/퇴장을 처리할 워크스페이스가 프론트에 없음.
- RBAC/center scope 패턴은 `ReservationService/Controller`가 이미 정착되어 재사용 가능.

## Proposed Solutions

### Option 1: 출입 이벤트 + open session 별도 테이블 + API/UI 동시 도입 (권장)

**Approach:** `access_events`, `member_access_sessions`를 추가하고 서비스/컨트롤러/프론트 탭을 한 번에 구현.

**Pros:**
- 계획 범위를 end-to-end로 충족
- 운영/감사 데이터 즉시 확보

**Cons:**
- 변경 범위가 넓어 테스트 범위 증가

**Effort:** 1~2일

**Risk:** Medium

---

### Option 2: 백엔드 선반영 후 UI 후속

**Approach:** 스키마+서비스+API만 먼저 머지하고 UI는 다음 PR.

**Pros:**
- 리스크 분리 가능

**Cons:**
- 사용자 가시성이 낮고 즉시 운영 개선 체감이 약함

**Effort:** 0.5~1일

**Risk:** Low

## Recommended Action

Option 1 기준으로 진행하되, 구현은 P9-1(스키마) → P9-2/3(서비스/API) → P9-4(프론트) 순으로 분할하고 각 단계에서 통합 테스트를 붙인다.

## Technical Details

**Affected files:**
- `backend/src/main/resources/db/migration/V10__create_access_events_and_open_sessions.sql`
- `backend/src/main/java/com/gymcrm/access/*`
- `backend/src/test/java/com/gymcrm/access/*`
- `frontend/src/App.tsx`
- `frontend/src/features/access/*`

**Database changes (if any):**
- `access_events` 테이블 신설
- `member_access_sessions` 테이블 신설

## Acceptance Criteria

- [x] 출입 API(입장/퇴장/이벤트조회/현재입장조회)가 동작한다.
- [x] ENTRY_DENIED 포함 출입 이벤트가 append-only로 기록된다.
- [x] 회원별 open session 1개 제약이 보장된다.
- [x] 센터 스코프 및 RBAC(`CENTER_ADMIN`,`DESK`)가 적용된다.
- [x] 관리자 포털에 출입 관리 탭이 추가되고 기본 동선이 동작한다.
- [x] 관련 백엔드/프론트 테스트가 통과한다.

## Work Log

### 2026-02-27 - Initial execution setup

**By:** Codex

**Actions:**
- Phase 9 계획 문서(`docs/plans/2026-02-27-feat-phase9-access-checkin-operational-hardening-plan.md`)를 실행 대상으로 확정
- `git-worktree` 스킬로 `codex/phase9-access-checkin` 워크트리 생성
- 구현 추적용 todo 생성 및 실행 순서 정의

**Learnings:**
- 기존 예약/회원권 패턴이 잘 정리되어 있어 출입 도메인도 동일한 서비스/리포지토리 구조로 확장 가능

### 2026-02-27 - P9 access implementation (schema/service/api/ui)

**By:** Codex

**Actions:**
- `V10__create_access_events_and_open_sessions.sql`로 출입 이벤트/오픈세션 스키마 추가
- `com.gymcrm.access` 도메인(컨트롤러/서비스/리포지토리/모델) 구현
- `ENTRY_DENIED` 이벤트를 롤백 없이 남기기 위해 `AccessDeniedApiException` 기반 트랜잭션 정책 적용
- 관리자 포털에 `출입 관리` 탭 및 UI(`frontend/src/features/access/*`) 추가
- 백엔드 검증 실행:
  - `./gradlew test --tests com.gymcrm.access.AccessPhase9SchemaFoundationIntegrationTest --tests com.gymcrm.access.AccessServiceIntegrationTest --tests com.gymcrm.access.AccessApiIntegrationTest` ✅
- 프론트 검증 실행:
  - `npm run build` ❌ (의존성 미설치 환경으로 `react/vite` 모듈 해석 실패)

**Learnings:**
- 거절 이벤트를 남기면서 오류 응답을 유지하려면 단순 `REQUIRES_NEW`보다 도메인 전용 no-rollback 예외 전략이 테스트/운영 모두 안전하다.

### 2026-02-27 - Validation pass and operational SQL checks

**By:** Codex

**Actions:**
- 프론트 의존성 설치: `npm ci`
- 백엔드 전체 테스트 통과: `./gradlew test`
- access 보강 테스트 통과: `./gradlew test --tests com.gymcrm.access.AccessApiIntegrationTest --tests com.gymcrm.access.AccessServiceIntegrationTest`
- 프론트 빌드 통과: `npm run build`
- SQL 검증 쿼리 실행 및 결과 문서화:
  - `docs/solutions/database-issues/access-events-and-open-session-integrity-gymcrm-20260227.md`
- 브라우저 동선 검증 시도(`npm run dev`, `./gradlew bootRun`) 과정에서 런타임 DB role(`gymcrm`) 부재로 backend 기동 실패 확인

**Learnings:**
- 로컬 통합 동선 검증은 테스트 DB와 별도로 runtime DB 계정/권한 준비가 선행되어야 안정적으로 재현된다.
