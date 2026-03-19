---
status: complete
priority: p3
issue_id: "102"
tags: [code-review, frontend, quality, styling]
dependencies: []
---

# Problem Statement

`SelectedMemberSummaryCard`는 `selected-member-grid` 클래스를 사용하지만, 현재 글로벌 CSS 어디에도 이 클래스 정의가 없습니다. 즉 레이아웃 훅은 남아 있는데 실제 스타일은 없는 상태라, 코드 의도와 결과가 어긋나 있고 유지보수자가 존재하지 않는 스타일 계약을 추적하게 만듭니다.

# Findings

- `/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/SelectedMemberSummaryCard.tsx` 에 `className="selected-member-grid"` 가 사용됩니다.
- 그러나 `/Users/abc/projects/GymCRM_V2/frontend/src/index.css` 및 현재 `frontend/src` 검색 결과에는 `selected-member-grid` selector 정의가 없습니다.
- 이 상태는 런타임 오류는 아니지만 dead styling hook에 가깝습니다.

# Proposed Solutions

## Option 1: 클래스를 제거하고 existing utility class로 정리

### Pros
- 가장 단순합니다.
- dead hook를 제거합니다.

### Cons
- 현재 desired layout을 다시 utility로 표현해야 할 수 있습니다.

### Effort
Small

### Risk
Low

## Option 2: `SelectedMemberSummaryCard.module.css` 를 만들고 클래스 의미를 명확히 구현

### Pros
- page/component-local ownership에 맞는 구조로 정리됩니다.

### Cons
- 파일이 하나 더 생깁니다.

### Effort
Small

### Risk
Low

# Recommended Action

정의되지 않은 `selected-member-grid` 글로벌 hook를 제거하고, `SelectedMemberSummaryCard.module.css` 로 카드 전용 레이아웃 ownership을 명확히 옮긴다.

# Technical Details

- Affected file:
  - `/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/SelectedMemberSummaryCard.tsx`
- Missing selector search:
  - `rg -n "selected-member-grid" frontend/src/index.css frontend/src`

# Acceptance Criteria

- [x] `SelectedMemberSummaryCard` 에서 존재하지 않는 스타일 hook가 제거되거나 실제 정의가 생긴다.
- [x] summary card 레이아웃 의도가 코드만 봐도 분명하다.

# Work Log

### 2026-03-19 - Review Finding Created

**By:** Codex

**Actions:**
- `SelectedMemberSummaryCard`의 markup과 관련 CSS selector 존재 여부를 확인했습니다.
- `selected-member-grid`가 정의 없이 사용되고 있음을 확인했습니다.

**Learnings:**
- 이런 dead styling hook는 작은 문제지만, 리팩터링 시 불필요한 추적 비용을 키웁니다.

### 2026-03-19 - Styling Hook Cleaned Up

**By:** Codex

**Actions:**
- `/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/SelectedMemberSummaryCard.module.css` 를 추가해 상세 정보 그리드 레이아웃을 컴포넌트 전용 스타일로 옮겼습니다.
- `SelectedMemberSummaryCard.tsx` 에서 정의되지 않은 `selected-member-grid` 문자열 hook를 제거하고 module class를 사용하도록 바꿨습니다.

**Learnings:**
- 작은 컴포넌트라도 dead class hook보다 local module ownership이 읽기와 유지보수에 더 명확합니다.

# Resources

- `/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/SelectedMemberSummaryCard.tsx`
