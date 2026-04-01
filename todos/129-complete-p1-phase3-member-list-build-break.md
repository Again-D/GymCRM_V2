---
status: complete
priority: p1
issue_id: "129"
tags: [code-review, frontend, typescript, build, phase3]
dependencies: []
---

# Restore phase3 member list buildability

## Problem Statement

`Phase 3` 산출물 상태에서 `frontend`가 빌드되지 않는다. 현재 상태로는 머지나 후속 phase 진행이 불가능하다.

## Findings

- `npm run build`가 [`/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/MemberListSection.tsx:401`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/MemberListSection.tsx#L401)에서 `MemberSummary[]`를 `Table<MemberRow>`에 넘기는 타입 불일치로 실패한다.
- 같은 파일의 [`:451`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/MemberListSection.tsx#L451)과 [`:565`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/MemberListSection.tsx#L565)에서 `modalState.kind === "none"` 케이스를 배제하지 않은 채 `modalState.memberId`를 읽어 타입 오류가 발생한다.
- `phase3` gate 중 최소 기준인 validation 통과 상태를 만족하지 못한다.

## Proposed Solutions

### Option 1: Align table and modal typing

**Approach:** `MemberRow`를 제거하거나 `MemberSummary` 기반으로 통일하고, `modalState.kind` 분기에서만 `memberId`를 읽도록 좁힌다.

**Pros:**
- 실제 원인에 직접 대응한다.
- diff가 가장 작다.

**Cons:**
- row 모델과 modal 상태 모델을 다시 한번 점검해야 한다.

**Effort:** 1-2 hours

**Risk:** Low

---

### Option 2: Add explicit view models and modal helpers

**Approach:** 테이블 전용 row mapper와 `isMemberModalWithId()` 같은 타입 가드를 도입한다.

**Pros:**
- 이후 phase에서도 타입 경계가 더 명확하다.
- modal 상태 사용 패턴을 재사용 가능하다.

**Cons:**
- 현재 이슈 해결치고는 구조가 조금 커진다.

**Effort:** 2-4 hours

**Risk:** Medium

## Recommended Action

## Technical Details

**Affected files:**
- `frontend/src/pages/members/components/MemberListSection.tsx`

## Resources

- `cd frontend && npm run build`
- Workdoc: `docs/plans/2026-03-27-refactor-frontend-ant-design-zustand-foundation-migration-workdoc.md`

## Acceptance Criteria

- [x] `frontend/src/pages/members/components/MemberListSection.tsx`가 타입 오류 없이 빌드된다.
- [x] `modalState.memberId` 접근은 `memberId`가 보장되는 분기에서만 수행된다.
- [x] `cd frontend && npm run build`가 통과한다.

## Work Log

### 2026-03-30 - Initial Discovery

**By:** Codex

**Actions:**
- `npm run build`로 phase3 변경 검증 수행
- `MemberListSection.tsx`의 테이블 generic과 modal state 사용 지점 확인
- 빌드 실패 라인을 todo로 정리

**Learnings:**
- 현재 phase3 브랜치는 타입 단계에서 이미 merge-blocked 상태다.

### 2026-03-30 - Implemented

**By:** Codex

**Actions:**
- `MemberListSection.tsx`를 `MemberSummary` 기준으로 정렬하고 테이블 generic/type mismatch를 제거
- modal title과 비활성화 대상 계산을 분기 좁히기 helper로 바꿔 `modalState.memberId`의 unsafe access 제거
- `cd frontend && npm run build` 재실행으로 빌드 복구 확인

**Learnings:**
- phase3에서 row/view model을 새 query payload로 바꿀 때, 테이블 generic과 modal state narrowing을 같이 맞추지 않으면 바로 타입 단계에서 막힌다.
