---
status: complete
priority: p3
issue_id: "030"
tags: [code-review, frontend, ux, accessibility]
dependencies: []
---

# 테이블 행 포인터/호버 affordance가 현재 동작과 불일치

## Problem Statement

회원/상품 목록이 `행 클릭` 기반에서 `편집 버튼` 기반으로 변경됐지만, 전역 테이블 스타일은 여전히 모든 `tbody tr`을 클릭 가능한 것처럼 표시한다. 사용자는 행 어디를 눌러도 동작할 것으로 오해할 수 있어 UX 일관성이 깨진다.

## Findings

- 전역 스타일에서 모든 테이블 행에 `cursor: pointer`가 적용됨.
  - `/Users/abc/projects/GymCRM_V2/frontend/src/styles.css:594`
- 전역 스타일에서 행 hover 배경이 클릭 affordance처럼 동작함.
  - `/Users/abc/projects/GymCRM_V2/frontend/src/styles.css:599`
- 실제 편집 진입은 행이 아니라 `편집` 버튼으로만 연결되어 있음.
  - `/Users/abc/projects/GymCRM_V2/frontend/src/features/members/MemberManagementPanels.tsx:151`
  - `/Users/abc/projects/GymCRM_V2/frontend/src/features/products/ProductManagementPanels.tsx:210`

## Proposed Solutions

### Option 1: 전역 row 클릭 affordance 제거 + 필요한 테이블에만 opt-in (권장)

**Approach:**
- `tbody tr { cursor: pointer; }`, `tbody tr:hover` 전역 적용을 제거
- 실제 row-click 상호작용이 필요한 경우에만 별도 클래스(`.is-clickable-row`)로 opt-in

**Pros:**
- 동작-시각 피드백 일치
- 향후 회귀 방지에 유리

**Cons:**
- 기존에 row-click을 의도한 다른 테이블이 있다면 추가 보정 필요

**Effort:** Small

**Risk:** Low

---

### Option 2: members/products 테이블만 row affordance override

**Approach:**
- 전역 스타일은 유지하고 회원/상품 테이블 컨텍스트에서만 `cursor: default`/hover 무효화

**Pros:**
- 영향 범위가 작음

**Cons:**
- 스타일 예외가 늘어나며 장기적으로 복잡도 증가

**Effort:** Small

**Risk:** Medium

## Recommended Action

(Review triage needed)

## Technical Details

**Affected files:**
- `/Users/abc/projects/GymCRM_V2/frontend/src/styles.css`
- (선택) `/Users/abc/projects/GymCRM_V2/frontend/src/features/members/MemberManagementPanels.tsx`
- (선택) `/Users/abc/projects/GymCRM_V2/frontend/src/features/products/ProductManagementPanels.tsx`

## Acceptance Criteria

- [x] 회원/상품 목록에서 행 hover/cursor가 클릭 가능한 동작처럼 보이지 않는다.
- [x] 편집 진입 트리거가 버튼으로 명확히 유지된다.
- [x] 실제 row-click을 사용하는 다른 화면이 있다면 스타일 회귀가 없다.

## Work Log

### 2026-02-27 - Review finding created

**By:** Codex

**Actions:**
- PR #10 머지 이후 members/products 편집 진입 패턴(버튼 기반) 확인
- 전역 테이블 row affordance 스타일과 실제 상호작용 불일치 확인

**Learnings:**
- 접근성 개선 이후에는 상호작용 단서를 함께 정리해야 UX 회귀를 막을 수 있다.

### 2026-02-27 - Fix implemented

**By:** Codex

**Actions:**
- 전역 `tbody tr`에서 `cursor: pointer` 제거
- hover 배경 강조를 `tbody tr.is-clickable-row:hover` opt-in으로 제한
- 현재 코드베이스에서 row 자체 클릭 진입 사용처가 없는지 점검

**Validation:**
- `npm run build` (`/frontend`) 통과
