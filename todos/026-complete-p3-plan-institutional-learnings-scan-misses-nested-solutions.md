---
status: complete
priority: p3
issue_id: "026"
tags: [code-review, planning, documentation, process]
dependencies: []
---

# Plan claims no docs/solutions learnings due to shallow path scan

계획 문서의 Institutional Learnings 섹션이 `docs/solutions/*.md`만 조회한 결과를 기반으로 “학습 문서 없음”으로 기록되어, 실제 존재하는 하위 디렉터리 솔루션 문서들을 놓치고 있다.

## Problem Statement

계획 문서는 로컬/기관 학습 기반으로 리스크를 줄이려는 목적이 있는데, `docs/solutions/`를 1-depth glob으로만 탐색한 결과 “관련 문서 없음”으로 결론 내렸다. 현재 저장소에는 `docs/solutions/database-issues/...` 형태의 문서가 존재하므로, 이 결론은 조사 방법의 한계에서 나온 오탐(false negative)이다.

이 문제는 이번 계획 자체를 막는 치명적 이슈는 아니지만, 향후 유사한 워크플로우에서 반복되면 과거 해결 패턴을 놓치게 된다.

## Findings

- 계획 문서가 `docs/solutions/*.md` 기준으로 “확인 가능한 문서 없음”이라고 명시함: `/Users/abc/projects/GymCRM_V2/docs/plans/2026-02-25-refactor-frontend-app-tsx-component-extraction-plan.md:372`
- 실제 저장소에는 하위 디렉터리 솔루션 문서가 존재함 (예: `/Users/abc/projects/GymCRM_V2/docs/solutions/database-issues/reservation-capacity-and-usage-deduction-integrity-gymcrm-20260225.md`)

## Proposed Solutions

### Option 1: 계획 문서 문구 수정 + 탐색 범위 보정 (권장)

**Approach:** Institutional Learnings 섹션 문구를 “top-level glob 기준 없음”으로 정정하거나, `docs/solutions/**/*.md`/`find docs/solutions -type f` 기준으로 재탐색 후 관련 문서를 반영한다.

**Pros:**
- 문서 정확성 개선
- 향후 재사용 가능한 조사 방식 정리 가능

**Cons:**
- 이번 리팩터링 계획에 직접 연결되는 학습 문서가 없을 수도 있음

**Effort:** 10-20 min

**Risk:** Low

---

### Option 2: workflows-plan 템플릿/운영 규칙에서 `docs/solutions` 재귀 탐색 표준화

**Approach:** 로컬 리서치 단계에서 `docs/solutions` 탐색 명령을 재귀 기준으로 표준화한다.

**Pros:**
- 동일한 오류 재발 방지
- 계획 품질의 일관성 향상

**Cons:**
- 개별 계획 수정을 넘어 워크플로우 개선 작업이 필요

**Effort:** 30-60 min

**Risk:** Low

## Recommended Action

Option 1 적용 완료. Institutional Learnings 섹션에 `docs/solutions/` 하위 디렉터리 문서 존재 및 초기 top-level glob 누락 사실을 반영했다.

## Technical Details

**Affected files:**
- `/Users/abc/projects/GymCRM_V2/docs/plans/2026-02-25-refactor-frontend-app-tsx-component-extraction-plan.md`

**Related components:**
- `workflows-plan` 로컬 리서치 습관/명령 패턴

**Database changes (if any):**
- 없음

## Resources

- **Plan under review:** `/Users/abc/projects/GymCRM_V2/docs/plans/2026-02-25-refactor-frontend-app-tsx-component-extraction-plan.md`
- **Existing solution doc example:** `/Users/abc/projects/GymCRM_V2/docs/solutions/database-issues/reservation-capacity-and-usage-deduction-integrity-gymcrm-20260225.md`

## Acceptance Criteria

- [x] 계획 문서의 Institutional Learnings 섹션 문구가 사실과 일치하도록 수정된다
- [x] `docs/solutions` 탐색 방식이 재귀 디렉터리 구조를 고려하도록 보정된다 (문서 또는 워크플로우 수준)
- [x] 관련 학습 문서가 실제로 무관하면 그 판단 근거가 간단히 기록된다

## Work Log

### 2026-02-25 - Plan Review Finding Created

**By:** Codex

**Actions:**
- 계획 문서 Institutional Learnings 섹션 검토
- 저장소 내 `docs/solutions` 하위 디렉터리 문서 존재 여부 확인
- 조사 범위 누락에 대한 문서 정확성 finding 기록

**Learnings:**
- top-level glob만 사용하면 `docs/solutions/<category>/*.md` 구조를 놓칠 수 있음

### 2026-02-25 - Completed

**By:** Codex

**Actions:**
- 계획 문서 Institutional Learnings 섹션을 재확인
- 하위 디렉터리 솔루션 문서 존재 및 초기 탐색 누락 설명 문구 반영 상태 확인
- todo 상태를 `complete`로 전환
