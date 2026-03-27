---
status: complete
priority: p2
issue_id: "127"
tags: [feature, reservation, gx, schedule, backend, frontend]
dependencies: []
---

# Implement GX recurring schedule registration

## Problem Statement

GX 예약은 가능하지만, 운영자가 반복 규칙 기반으로 GX 수업을 등록하고 특정 회차 예외를 관리하는 기능이 없다. 현재는 실제 예약 슬롯인 `trainer_schedules`만 존재해 운영 편의 레이어가 비어 있다.

## Findings

- `trainer_schedules`와 `reservations`는 이미 예약 정합성의 핵심 source of truth다.
- `trainer.availability` 모듈은 반복 규칙 + 예외 + 월간 snapshot 패턴을 이미 사용 중이다.
- 계획 문서와 브레인스토밍 문서에서 4주 롤링 슬롯, 매니저 전용 반복 규칙, 제한적 트레이너 예외 권한이 확정됐다.

## Proposed Solutions

### Option 1: reservation 하위 gx 모듈 추가

**Approach:** `com.gymcrm.reservation.gx` 하위에 규칙/예외/API를 두고 실제 슬롯은 기존 `trainer_schedules`를 계속 사용한다.

**Pros:**
- 기존 예약 정합성 구조를 유지한다.
- `reservation` 책임 경계와 잘 맞는다.

**Cons:**
- `trainer.availability`와 일부 개념 중복이 생긴다.

**Effort:** 1-2일

**Risk:** Medium

---

### Option 2: trainer.availability 확장

**Approach:** 기존 트레이너 availability를 GX 운영 규칙으로 확장한다.

**Pros:**
- 반복 규칙/예외 구조를 재사용한다.

**Cons:**
- 예약 가능한 GX 클래스와 개인 availability가 섞여 도메인 경계가 흐려진다.

**Effort:** 1-2일

**Risk:** High

## Recommended Action

Option 1로 진행한다. GX 운영 규칙은 `reservation.gx`에 두고, 실제 예약 슬롯은 계속 `trainer_schedules`에 생성한다.

## Technical Details

**Affected files:**
- `docs/plans/2026-03-27-feat-gx-recurring-schedule-registration-plan.md`
- `backend/src/main/java/com/gymcrm/reservation/...`
- `frontend/src/pages/...`

**Database changes (if any):**
- GX 규칙/예외 테이블 추가
- `trainer_schedules`에 생성 출처 추적 컬럼 추가

## Resources

- [docs/plans/2026-03-27-feat-gx-recurring-schedule-registration-plan.md](/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-27-feat-gx-recurring-schedule-registration-plan.md)
- [docs/brainstorms/2026-03-27-gx-recurring-schedule-registration-brainstorm.md](/Users/abc/projects/GymCRM_V2/docs/brainstorms/2026-03-27-gx-recurring-schedule-registration-brainstorm.md)

## Acceptance Criteria

- [x] GX 반복 규칙 CRUD가 동작한다.
- [x] 4주 롤링 GX 슬롯 생성이 동작한다.
- [x] 특정 날짜 예외 수정이 동작한다.
- [x] 기존 예약 화면과 GX 슬롯 목록이 호환된다.
- [x] 관련 테스트가 통과한다.

## Work Log

### 2026-03-27 - Initial execution

**By:** Codex

**Actions:**
- 계획 문서를 구현 대상으로 확정했다.
- feature 브랜치를 생성했다.
- trainer availability와 reservation 모듈의 기존 패턴을 조사했다.

**Learnings:**
- 반복 규칙/예외 패턴은 trainer availability에서 가져오되 도메인 배치는 reservation 아래가 맞다.
- 실제 예약 정합성은 계속 `trainer_schedules`를 중심으로 유지해야 한다.

### 2026-03-27 - Implementation complete

**By:** Codex

**Actions:**
- `backend`에 GX 규칙/예외 테이블, `reservation.gx` 하위 서비스/API, 슬롯 동기화 로직을 추가했다.
- `frontend`에 `GX 스케줄` 화면과 mock mode 지원, 스모크 테스트를 추가했다.
- 백엔드 GX API 통합 테스트와 trainer availability 회귀 테스트, 프론트 페이지 테스트와 빌드를 통과시켰다.

**Learnings:**
- 예약이 있는 미래 회차 차단 규칙을 슬롯 동기화 단계에서 일관되게 강제하는 편이 가장 단순했다.
- 트레이너는 예외만 다루고 규칙은 관리자만 다루게 한 분리가 UI와 서비스 모두에서 명확했다.
