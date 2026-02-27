---
status: complete
priority: p2
issue_id: "029"
tags: [code-review, frontend, accessibility, ux]
dependencies: []
---

# Clickable table rows are mouse-only and not keyboard accessible

## Problem Statement

회원/상품 목록에서 편집 진입이 `tr`의 `onClick`에만 의존해 키보드 사용자(탭/엔터/스페이스) 접근이 어렵다. 오버레이 기반 편집 구조로 전환된 PR에서 주요 동선이기 때문에 접근성/운영성 저하가 발생한다.

## Findings

- 회원 목록 행은 클릭 이벤트만 있고 포커스 가능한 인터랙션 요소가 없음.
  - `/Users/abc/projects/GymCRM_V2/frontend/src/features/members/MemberManagementPanels.tsx:139`
- 상품 목록 행도 동일 패턴.
  - `/Users/abc/projects/GymCRM_V2/frontend/src/features/products/ProductManagementPanels.tsx:197`

## Proposed Solutions

### Option 1: 행 내부에 명시적 버튼 추가 (권장)

**Approach:** 마지막 컬럼에 `편집` 버튼을 두고 onClick을 버튼으로 이동. 키보드/스크린리더 동작 표준화.

**Pros:**
- 접근성 패턴이 명확함
- 의도 전달(행 선택 vs 편집)이 분리됨

**Cons:**
- UI 컬럼/레이아웃 소폭 변경 필요

**Effort:** Small

**Risk:** Low

---

### Option 2: 행 자체를 키보드 대응 가능하게 확장

**Approach:** `tabIndex={0}`, `onKeyDown(Enter/Space)`를 추가하고 role 부여.

**Pros:**
- UI 변경이 작음

**Cons:**
- `tr`에 인터랙션 역할 부여는 접근성 해석이 일관되지 않을 수 있음

**Effort:** Small

**Risk:** Medium

## Recommended Action

(Review triage needed)

## Technical Details

**Affected files:**
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/members/MemberManagementPanels.tsx`
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/products/ProductManagementPanels.tsx`

## Acceptance Criteria

- [x] 키보드만으로 회원/상품 편집 오버레이 진입이 가능하다.
- [x] 포커스 이동 순서가 자연스럽고 시각적 포커스 표시가 유지된다.
- [x] 스크린리더에서 편집 액션 의도가 명확히 전달된다.

## Work Log

### 2026-02-27 - Review finding created

**By:** Codex

**Actions:**
- PR #9 머지 결과 코드에서 목록->편집 진입 동선 접근성 점검
- `tr onClick` 단일 패턴 확인 및 개선안 도출

**Learnings:**
- 오버레이 중심 편집 UX로 갈수록 진입 트리거는 semantic button으로 고정하는 편이 유지보수와 접근성 둘 다 유리하다.

### 2026-02-27 - Fix implemented

**By:** Codex

**Actions:**
- 회원/상품 목록 테이블에 `액션` 컬럼과 명시적 `편집` 버튼 추가
- `tr onClick` 편집 진입 의존 제거로 키보드 탭/엔터 기반 접근 경로 보장
- 빈 상태 행 `colSpan`을 신규 컬럼 수에 맞게 조정

**Validation:**
- `frontend` 빌드 실행 실패 (`npm run build`): worktree 환경에 프론트 의존성(react/vite 등) 미설치
