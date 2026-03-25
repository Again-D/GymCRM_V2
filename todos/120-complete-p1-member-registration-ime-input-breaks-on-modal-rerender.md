---
status: complete
priority: p1
issue_id: "120"
tags: [code-review, frontend, quality, ime, modal, members]
dependencies: []
---

# Fix member registration IME input break on modal rerender

회원 등록 모달에서 한글 입력 시 한 글자씩만 들어가는 현상이 발생한다.

## Problem Statement

회원 등록 폼은 핵심 운영 입력 화면인데, 현재 한글 IME 입력이 안정적으로 유지되지 않는다. 사용자는 이름, 메모 등 텍스트 필드를 정상적으로 입력할 수 없고, 실제 등록 업무가 방해된다.

이 문제는 단순 UX 이슈가 아니라 회원 등록 핵심 플로우를 깨뜨리는 입력 장애다. 특히 한국어 입력 환경에서 재현되므로 운영 현장 영향이 크다.

## Findings

- [Modal.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/shared/ui/Modal.tsx#L41) 의 포커스 관리 `useEffect`가 `onClose`를 dependency로 가지고 있다.
- `onClose`는 [MemberListSection.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/MemberListSection.tsx#L384) 에서 `closeMemberModal`로 전달되는데, 이 함수는 hook 내부에서 `useCallback`으로 고정되지 않아 render마다 새 함수가 된다.
- 회원 등록 폼 input은 [MemberListSection.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/MemberListSection.tsx#L409) 부근에서 controlled input으로 구현돼 있어 타이핑할 때마다 parent가 rerender된다.
- 그 결과 modal effect cleanup이 매 입력마다 실행되고, cleanup에서 [Modal.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/shared/ui/Modal.tsx#L96)~[Modal.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/shared/ui/Modal.tsx#L99) 처럼 이전 포커스 요소로 포커스를 되돌린다.
- 이후 effect가 다시 실행되면서 첫 번째 포커서블 요소로 다시 focus를 이동시킨다.
- 이 포커스 왕복은 영문 타이핑보다 한글 IME 조합 입력에서 훨씬 치명적이라, 조합 중인 글자가 끊기면서 “한 글자씩만 입력되는” 현상으로 나타난다.

## Proposed Solutions

### Option 1: Stabilize modal callbacks and reduce effect churn

**Approach:** `closeMemberModal` 등 modal에 전달하는 callback을 `useCallback`으로 고정하고, `Modal`의 effect가 매 입력마다 재실행되지 않도록 한다.

**Pros:**
- 현재 구조를 가장 적게 건드린다.
- 문제 원인과 직접 연결된 수정이다.
- 다른 모달에서도 같은 증상을 예방할 가능성이 높다.

**Cons:**
- callback 안정성에 계속 의존하게 된다.
- 다른 prop 변경으로 effect가 다시 불안정해질 수 있다.

**Effort:** 1-2 hours

**Risk:** Low

---

### Option 2: Split modal lifecycle effect from escape handler

**Approach:** `Modal`의 포커스 초기화/복원 effect를 `isOpen` 기준으로만 동작하게 분리하고, `Escape` key handler는 ref나 별도 effect로 관리한다.

**Pros:**
- modal lifecycle과 callback identity를 분리해 더 구조적으로 안전하다.
- 현재와 미래의 callback churn 문제를 함께 줄인다.

**Cons:**
- `Modal` 내부 로직 수정 범위가 조금 더 커진다.
- 기존 포커스 관리 동작 회귀를 확인해야 한다.

**Effort:** 2-3 hours

**Risk:** Medium

---

### Option 3: Add IME-focused regression coverage

**Approach:** 위 수정과 함께 회원 등록 모달 입력 유지 회귀 테스트를 추가한다. 최소한 rerender 후 input value와 focus가 유지되는 테스트를 포함한다.

**Pros:**
- 재발 방지 효과가 크다.
- modal + controlled input 조합의 안정성을 문서화할 수 있다.

**Cons:**
- 테스트에서 IME 자체를 완전 재현하기는 어렵다.
- focus 유지 같은 간접 검증에 의존할 수 있다.

**Effort:** 2-4 hours

**Risk:** Medium

## Recommended Action

Stabilize modal lifecycle behavior so focus initialization and restoration run only when the modal actually opens or closes, not on every parent rerender. Keep the latest `onClose` handler in a ref so `Escape` still works without forcing the lifecycle effect to resubscribe during typing. Add a regression test that verifies focused modal inputs keep their value and focus after parent rerenders.

## Technical Details

**Affected files:**
- [Modal.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/shared/ui/Modal.tsx)
- [MemberListSection.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/MemberListSection.tsx)
- [useMemberManagementState.ts](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/modules/useMemberManagementState.ts)

**Related components:**
- 회원 등록/수정 모달
- 공용 `Modal`
- 다른 controlled form modal 화면들

**Database changes (if any):**
- No

## Resources

- **Review context:** 회원등록 폼 한글 입력 중 한 글자씩만 입력되는 현상 조사
- **Related UI:** [MemberListSection.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/MemberListSection.tsx)
- **Shared component:** [Modal.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/shared/ui/Modal.tsx)

## Acceptance Criteria

- [ ] 회원 등록 모달에서 한글 이름을 연속 입력해도 조합이 끊기지 않는다
- [ ] 입력 중 modal focus가 다른 요소로 튀지 않는다
- [ ] 회원 수정 모달에서도 동일 문제가 재현되지 않는다
- [ ] modal 변경 후 다른 화면의 ESC 닫기와 focus 복원 동작이 유지된다
- [ ] 관련 frontend 테스트가 통과한다

## Work Log

### 2026-03-25 - Initial Discovery

**By:** Codex

**Actions:**
- 회원등록 폼과 상태 훅을 검토했다
- `MemberListSection`의 controlled input 구현을 확인했다
- 공용 `Modal`의 focus-trap effect를 검토했다
- `onClose` callback identity 변화로 effect cleanup이 매 타이핑마다 실행되는 경로를 확인했다

**Learnings:**
- 입력값 자체를 trim/transform하는 문제는 아니었다
- root cause는 modal focus lifecycle이 rerender마다 흔들리는 구조에 더 가깝다
- 한글 IME 입력은 focus churn에 특히 취약해 증상이 즉시 드러난다

### 2026-03-25 - Fix Applied

**By:** Codex

**Actions:**
- `Modal`에서 `onClose`를 ref로 보관해 focus lifecycle effect dependency에서 분리했다
- modal focus-trap effect를 `isOpen` 기준으로만 동작하게 조정했다
- parent rerender 중에도 input value와 focus가 유지되는 regression test를 추가했다
- `frontend` 기준 `npm test -- src/shared/ui/Modal.test.tsx`를 실행해 통과를 확인했다

**Learnings:**
- focus initialization effect와 key handler subscription을 같은 dependency set으로 묶으면 IME 입력 회귀가 쉽게 생긴다
- 공용 modal은 callback identity churn에 둔감해야 form 화면 전체 안정성이 유지된다

## Notes

- 이 이슈는 member registration에 먼저 드러났지만, 같은 modal 패턴을 쓰는 다른 폼에도 잠재적으로 영향을 줄 수 있다.
