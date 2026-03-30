---
status: complete
priority: p2
issue_id: "133"
tags: [code-review, frontend, error-handling, selected-member, phase3]
dependencies: []
---

# Remove raw selected-member error leakage

## Problem Statement

공유 selected-member surface에서 raw error 문자열이 그대로 노출되고 있다. phase3의 에러 표면 정리 목표와 맞지 않는다.

## Findings

- [`/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/SelectedMemberSummaryCard.tsx:25`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/SelectedMemberSummaryCard.tsx#L25)~[`:30`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/SelectedMemberSummaryCard.tsx#L30)에서 `selectedMemberError`가 `Alert.description`으로 그대로 렌더링된다.
- baseline note는 phase3에서 backend detail/trace/error message 직접 노출을 줄였다고 기록하지만, shared selected-member surface는 그 규칙을 재도입한다.
- 이 컴포넌트는 member context 여러 화면에서 재사용되므로 영향 범위가 넓다.

## Proposed Solutions

### Option 1: Map selected-member errors to safe UI copy

**Approach:** shared mapper나 공통 fallback 문구를 사용해 사용자용 메시지만 노출한다.

**Pros:**
- phase3 에러 표면 정책과 일치한다.
- 재사용 surface 전체에 바로 적용된다.

**Cons:**
- 디버깅 정보는 로그/개발자 경로로 분리해야 한다.

**Effort:** 1-2 hours

**Risk:** Low

---

### Option 2: Keep raw detail behind debug-only conditions

**Approach:** 기본은 안전 문구를 보여주고, 개발/테스트 환경에서만 상세 문자열을 노출한다.

**Pros:**
- 운영 노출을 줄이면서 디버깅 편의도 남긴다.

**Cons:**
- 조건 분기가 추가된다.

**Effort:** 2 hours

**Risk:** Medium

## Recommended Action

## Technical Details

**Affected files:**
- `frontend/src/pages/members/components/SelectedMemberSummaryCard.tsx`

## Resources

- Baseline note: `docs/plans/2026-03-27-refactor-frontend-ant-design-zustand-foundation-migration-baseline-note.md`

## Acceptance Criteria

- [x] selected-member summary surface가 raw backend/detail 문자열을 직접 노출하지 않는다.
- [x] 사용자에게는 일관된 안전 문구만 보인다.
- [x] selected-member 관련 테스트 또는 smoke path가 유지된다.

## Work Log

### 2026-03-30 - Initial Discovery

**By:** Codex

**Actions:**
- shared selected-member summary surface 점검
- raw error string direct render 지점 확인

**Learnings:**
- 공통 surface 하나의 예외가 phase3 전체 error hygiene 주장을 무너뜨릴 수 있다.

### 2026-03-30 - Implemented

**By:** Codex

**Actions:**
- `SelectedMemberSummaryCard.tsx`에서 raw `selectedMemberError` description 렌더링을 제거
- 공통 surface에 안전한 fallback 문구를 적용
- `cd frontend && npx vitest run src/pages/members/components/SelectedMemberSummaryCard.test.tsx`로 기본 동작 유지 확인

**Learnings:**
- shared selected-member surface는 화면별 예외를 두지 말고 항상 동일한 안전 문구 규칙을 따르는 편이 낫다.
