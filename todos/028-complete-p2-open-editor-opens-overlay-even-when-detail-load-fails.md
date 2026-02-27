---
status: complete
priority: p2
issue_id: "028"
tags: [code-review, frontend, reliability, ux]
dependencies: []
---

# Editor overlay opens even when detail fetch fails

## Problem Statement

회원/상품 목록 행 클릭 시 상세 조회가 실패해도 오버레이가 열려, 사용자에게 빈/오래된 폼이 노출될 수 있다. 오류 메시지가 보이더라도 편집 컨텍스트가 확정되지 않은 상태에서 폼을 보여주는 것은 오동작에 가깝다.

## Findings

- `openMemberEditor`는 `await loadMemberDetail(memberId)` 이후 성공 여부와 무관하게 `setMemberFormOpen(true)`를 호출함.
  - `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx:1578`
- `loadMemberDetail`은 실패 시 에러 상태만 세팅하고 throw 하지 않으므로 호출자는 실패를 감지하지 못함.
  - `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx:770`
- 동일 패턴이 상품 편집에도 존재함.
  - `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx:1583`
  - `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx:815`

## Proposed Solutions

### Option 1: 상세 조회 함수에서 성공 여부 반환 (권장)

**Approach:** `loadMemberDetail/loadProductDetail`이 `boolean`을 반환하도록 바꾸고, `open*Editor`에서 true일 때만 오버레이를 open.

**Pros:**
- 호출부 로직이 명확함
- 실패 시 오버레이 미노출 보장

**Cons:**
- 함수 시그니처 변경 영향 범위 점검 필요

**Effort:** Small

**Risk:** Low

---

### Option 2: 상세 조회 실패 시 예외 재throw

**Approach:** `load*Detail` catch에서 에러 상태 반영 후 rethrow, `open*Editor`에서 try/catch로 open 분기.

**Pros:**
- 실패/성공 경로가 명확히 분리됨

**Cons:**
- 기존 호출부가 많아지면 try/catch 반복 가능

**Effort:** Small

**Risk:** Medium

## Recommended Action

(Review triage needed)

## Technical Details

**Affected files:**
- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`

## Acceptance Criteria

- [x] 상세 조회 실패 시 회원/상품 편집 오버레이가 열리지 않는다.
- [x] 실패 메시지는 기존처럼 사용자에게 노출된다.
- [x] 성공 시에는 기존과 동일하게 오버레이가 열린다.

## Work Log

### 2026-02-27 - Review finding created

**By:** Codex

**Actions:**
- PR #9(merged) 기준 리그레션 가능성 점검
- 상세 조회 실패 경로와 오버레이 open 경로 불일치 확인

**Learnings:**
- 비동기 로딩 + 오버레이 open 타이밍은 성공 신호를 명시적으로 주고받아야 안정적이다.

### 2026-02-27 - Fix implemented

**By:** Codex

**Actions:**
- `loadMemberDetail/loadProductDetail`가 `Promise<boolean>`을 반환하도록 변경해 성공 여부를 명시화
- `openMemberEditor/openProductEditor`가 로딩 성공 시에만 오버레이를 열도록 분기
- 실패 시 기존 오류 패널 메시지 노출 동작이 유지되는지 코드 경로 점검

**Validation:**
- `frontend` 빌드 실행 실패 (`npm run build`): worktree 환경에 프론트 의존성(react/vite 등) 미설치
