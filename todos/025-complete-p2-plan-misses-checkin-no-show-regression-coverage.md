---
status: complete
priority: p2
issue_id: "025"
tags: [code-review, planning, frontend, quality, reservation]
dependencies: []
---

# Refactor plan omits reservation check-in/no-show flows from parity coverage

계획 문서가 현재 프론트 예약 기능 범위를 `생성/완료/취소` 중심으로 정의하고 있어, 이미 추가된 `체크인/노쇼` 액션의 회귀 검증이 수용 기준과 테스트 시나리오에서 빠져 있다.

## Problem Statement

이 계획은 `App.tsx` 컴포넌트 분리 리팩터링을 다루며 “기능 변경 없음”과 “화면 동등성(parity)”를 핵심 목표로 둔다. 그런데 현재 앱에 존재하는 예약 액션 중 `check-in`/`no-show`가 주요 플로우, 통합 시나리오, 수동 회귀 항목에 명시되지 않았다.

이 누락은 구현자가 계획을 그대로 따를 경우, 새로 추가된 예약 출석 기능의 버튼 활성화 조건/메시지/API wiring 회귀를 검증하지 않고 리팩터링을 마무리하게 만들 수 있다.

## Findings

- 예약 상호작용 보존 항목이 `예약 생성/완료/취소`까지만 서술됨: `/Users/abc/projects/GymCRM_V2/docs/plans/2026-02-25-refactor-frontend-app-tsx-component-extraction-plan.md:134`
- Primary Flows도 `예약 생성/완료/취소`까지만 포함하고 `체크인/노쇼` 미포함: `/Users/abc/projects/GymCRM_V2/docs/plans/2026-02-25-refactor-frontend-app-tsx-component-extraction-plan.md:172`
- Quality Gates의 수동 회귀 테스트 항목이 예약 액션을 뭉뚱그려 표현하여 신규 액션 누락 가능성이 큼: `/Users/abc/projects/GymCRM_V2/docs/plans/2026-02-25-refactor-frontend-app-tsx-component-extraction-plan.md:292`
- 현재 실제 UI에는 `체크인`/`노쇼` 버튼 및 관련 안내 문구가 존재함: `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx:2494`

## Proposed Solutions

### Option 1: 계획 문서에 예약 출석 액션을 명시적으로 추가 (권장)

**Approach:** `Interaction Graph`, `Primary Flows`, `Integration Test Scenarios`, `Quality Gates`에 `check-in/no-show`를 구체적으로 추가한다.

**Pros:**
- 리팩터링 중 회귀 검증 범위가 명확해짐
- 현재 기능과 계획 문서의 동기화 유지
- 구현자/리뷰어 간 해석 차이 감소

**Cons:**
- 문서 업데이트가 필요함

**Effort:** 15-30 min

**Risk:** Low

---

### Option 2: 별도 “현재 기능 스냅샷” 체크리스트 문서를 생성

**Approach:** 계획 문서는 고수준으로 유지하고, 예약 액션 포함 전체 수동 회귀 체크리스트를 별도 파일/PR 템플릿에 작성한다.

**Pros:**
- 계획 문서 밀도 증가를 줄일 수 있음
- 반복 사용 가능한 회귀 체크리스트 자산 확보

**Cons:**
- 문서가 분산되어 추적 비용 증가
- 계획 문서 단독으로는 누락 리스크가 남음

**Effort:** 30-60 min

**Risk:** Low

## Recommended Action

Option 1 적용 완료. 계획 문서에 예약 액션 parity 범위를 `생성/체크인/완료/취소/노쇼`로 명시 반영했다.

## Technical Details

**Affected files:**
- `/Users/abc/projects/GymCRM_V2/docs/plans/2026-02-25-refactor-frontend-app-tsx-component-extraction-plan.md`

**Related components:**
- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx` 예약 액션 UI (`체크인/완료/취소/노쇼`)

**Database changes (if any):**
- 없음 (문서 수정)

## Resources

- **Plan under review:** `/Users/abc/projects/GymCRM_V2/docs/plans/2026-02-25-refactor-frontend-app-tsx-component-extraction-plan.md`
- **Current reservation UI actions:** `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx:2472`

## Acceptance Criteria

- [x] 계획 문서의 예약 관련 플로우/회귀 시나리오에 `체크인`과 `노쇼`가 명시된다
- [x] 수동 회귀 테스트 항목이 `예약 생성/체크인/완료/취소/노쇼` 수준으로 구체화된다
- [x] “기능 변경 없음” 기준에서 예약 액션 버튼 정책/메시지 parity가 검증 범위에 포함된다

## Work Log

### 2026-02-25 - Plan Review Finding Created

**By:** Codex

**Actions:**
- 리팩터링 계획 문서의 예약 관련 범위/수용 기준 검토
- 현재 `App.tsx` 예약 액션 UI와 계획 문서의 parity 범위 비교
- 누락된 `check-in/no-show` 회귀 커버리지를 finding으로 기록

**Learnings:**
- 리팩터링 계획은 기능 동등성 목표가 강한 만큼, 최근 추가된 액션의 명시 누락이 곧 테스트 누락으로 이어질 가능성이 높음

### 2026-02-25 - Completed

**By:** Codex

**Actions:**
- 계획 문서의 Interaction Graph / Integration Test Scenarios / Primary Flows / Quality Gates를 확인
- 예약 액션 parity 범위에 `체크인`, `노쇼`가 포함된 상태임을 검증
- todo 상태를 `complete`로 전환
