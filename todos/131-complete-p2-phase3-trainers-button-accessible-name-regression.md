---
status: complete
priority: p2
issue_id: "131"
tags: [code-review, frontend, accessibility, trainers, phase3]
dependencies: []
---

# Fix trainer management button accessible names

## Problem Statement

트레이너 관리 화면의 주요 버튼들이 phase3에서 아이콘 이름을 포함한 accessible name으로 노출된다. 핵심 운영 액션 탐색성이 깨지고 기존 테스트도 실패한다.

## Findings

- [`/Users/abc/projects/GymCRM_V2/frontend/src/pages/trainers/TrainersPage.tsx:399`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/trainers/TrainersPage.tsx#L399)~[`:405`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/trainers/TrainersPage.tsx#L405)에서 `상세`, `수정` 버튼이 각각 `solution상세`, `setting수정`으로 인식된다.
- [`/Users/abc/projects/GymCRM_V2/frontend/src/pages/trainers/TrainersPage.tsx:447`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/trainers/TrainersPage.tsx#L447)~[`:449`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/trainers/TrainersPage.tsx#L449)에서 `트레이너 등록` 버튼도 `user트레이너 등록`으로 인식된다.
- `npx vitest run src/pages/trainers/TrainersPage.test.tsx`가 `"상세"`, `"트레이너 등록"` 버튼을 role/name으로 찾지 못해 실패한다.

## Proposed Solutions

### Option 1: Mark decorative icons as non-accessible

**Approach:** 버튼 레이블은 유지하고 아이콘이 accessible name에 포함되지 않도록 처리한다.

**Pros:**
- UI 디자인은 유지된다.
- 접근성과 테스트 계약을 동시에 복원한다.

**Cons:**
- 버튼 사용 패턴 전반을 한 번 점검해야 한다.

**Effort:** 1-2 hours

**Risk:** Low

---

### Option 2: Remove icons from action buttons

**Approach:** 액션 버튼의 아이콘을 제거하고 텍스트만 남긴다.

**Pros:**
- 가장 단순하다.
- 이름 오염 가능성을 제거한다.

**Cons:**
- 시각적 정보량이 줄어든다.

**Effort:** 1 hour

**Risk:** Low

## Recommended Action

## Technical Details

**Affected files:**
- `frontend/src/pages/trainers/TrainersPage.tsx`
- `frontend/src/pages/trainers/TrainersPage.test.tsx`

## Resources

- `cd frontend && npx vitest run src/pages/trainers/TrainersPage.test.tsx`

## Acceptance Criteria

- [x] `상세`, `수정`, `트레이너 등록` 등 주요 버튼의 accessible name이 기대 텍스트와 일치한다.
- [x] trainer management focused tests가 다시 통과한다.
- [x] 보조기기 기준에서 아이콘이 장식 요소로만 취급된다.

## Work Log

### 2026-03-30 - Initial Discovery

**By:** Codex

**Actions:**
- focused vitest로 Trainers phase3 시나리오 실행
- 버튼 accessible name 오염 지점을 확인

**Learnings:**
- antd 아이콘을 붙인 기본 버튼이 현재 테스트/보조기기 계약을 깨고 있다.

### 2026-03-30 - Implemented

**By:** Codex

**Actions:**
- `TrainersPage.tsx`의 주요 액션 버튼에서 이름 오염을 유발하던 아이콘을 제거
- trainer detail create flow 테스트가 현재 AntD DOM 기준으로 유지되도록 입력 selector를 정리
- `cd frontend && npx vitest run src/pages/trainers/TrainersPage.test.tsx`로 회귀 확인

**Learnings:**
- 아이콘을 유지해야 할 이유가 약한 운영 액션 버튼은 텍스트-only가 가장 안전하고 회귀 가능성도 낮다.
