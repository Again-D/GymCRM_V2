---
status: complete
priority: p2
issue_id: "056"
tags: [code-review, frontend, ux, quality]
dependencies: []
---

# Define member-change behavior for in-progress workspace forms

## Problem Statement

플랜은 회원권 업무/예약 관리 탭에서 `회원 변경` 액션을 제공하도록 적고 있지만, 이미 입력 중인 구매/예약 폼과 미리보기 상태를 어떻게 처리할지 정의하지 않는다. 현재 `loadMemberDetail` 는 예약 폼과 구매 폼, 관련 메시지를 즉시 초기화하므로, 새 진입 경로를 추가하면 사용자가 작성 중이던 값을 경고 없이 잃는 UX가 생길 수 있다.

## Findings

- 플랜은 `docs/plans/2026-03-09-feat-membership-reservation-member-selection-flow-plan.md:32` 에서 현재 선택 회원이 있으면 상단 요약 + `회원 변경` 액션을 제공한다고 적는다.
- 플랜은 예약 폼 stale-state 초기화는 언급하지만(`docs/plans/2026-03-09-feat-membership-reservation-member-selection-flow-plan.md:63`, `docs/plans/2026-03-09-feat-membership-reservation-member-selection-flow-plan.md:107`), 회원권 업무에서 입력 중인 구매 폼/환불 미리보기 같은 in-progress 상태를 어떻게 다룰지는 정의하지 않는다.
- 현재 `loadMemberDetail` 는 예약 폼, 구매 폼, 구매 상세, 패널 메시지를 즉시 초기화한다. 참조: `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx:996`.
- 따라서 탭 내부 `회원 변경`이 쉬워질수록, 사용자에게는 “회원 변경”이 단순 탐색처럼 보이지만 실제로는 작성 중 데이터 폐기 액션이 된다.

## Proposed Solutions

### Option 1: Explicit reset behavior in plan and UI copy

**Approach:** 회원 변경 시 현재 입력 중인 구매/예약 폼과 미리보기 상태를 초기화한다고 플랜과 UI 문구에 명시한다.

**Pros:**
- 구현이 단순하다.
- 현재 코드 경로와 잘 맞는다.

**Cons:**
- 사용자가 입력값을 잃을 수 있다.
- 실수 방지가 약하다.

**Effort:** 1-2 hours

**Risk:** Medium

---

### Option 2: Dirty-state confirmation before member switch

**Approach:** 폼이 수정된 상태에서만 확인 모달 또는 경고 단계를 거쳐 회원 변경을 진행한다.

**Pros:**
- 의도치 않은 데이터 손실을 줄인다.
- 운영 UX가 더 안전하다.

**Cons:**
- dirty-state 추적이 추가된다.
- 구현 복잡도가 올라간다.

**Effort:** 3-5 hours

**Risk:** Medium

---

### Option 3: Preserve draft per member

**Approach:** 회원별로 임시 폼 초안을 캐시해 회원 변경 후 돌아오면 복원한다.

**Pros:**
- 사용성은 가장 좋다.

**Cons:**
- 이번 범위를 크게 벗어난다.
- 상태 관리가 빠르게 복잡해진다.

**Effort:** 6-10 hours

**Risk:** High

## Recommended Action

플랜에서 `회원 변경`을 현재 회원 컨텍스트 교체 액션으로 정의하고, 초기 범위에서는 구매/예약 폼, 미리보기, 메시지 상태를 기존 `loadMemberDetail` 과 동일하게 초기화한다고 명시한다. 예약 관리뿐 아니라 회원권 업무도 같은 정책 범위에 포함하고, 수동 스모크 항목에 입력 중 회원 변경 시나리오를 추가한다.

## Technical Details

**Affected files:**
- `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-09-feat-membership-reservation-member-selection-flow-plan.md:32`
- `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-09-feat-membership-reservation-member-selection-flow-plan.md:63`
- `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-09-feat-membership-reservation-member-selection-flow-plan.md:107`
- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx:996`

**Related components:**
- `MembershipsSection`
- `ReservationsSection`
- `MembershipOperationsPanels`
- `ReservationManagementPanels`

**Database changes (if any):**
- No

## Resources

- **Plan:** `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-09-feat-membership-reservation-member-selection-flow-plan.md`
- **Validation baseline:** `/Users/abc/projects/GymCRM_V2/docs/notes/phase7-reservation-membership-ui-smoke-validation-log.md`

## Acceptance Criteria

- [x] 플랜이 `회원 변경` 시 기존 폼/미리보기 상태를 어떻게 처리할지 명시한다.
- [x] 예약 관리뿐 아니라 회원권 업무의 입력 중 상태도 전환 정책 범위에 포함된다.
- [x] 수동 스모크 또는 테스트 시나리오에 “입력 중 회원 변경” 검증 항목이 추가된다.

## Work Log

### 2026-03-09 - Initial Discovery

**By:** Codex

**Actions:**
- 플랜의 `회원 변경` 액션 설명과 현재 `loadMemberDetail` 초기화 로직을 대조 검토했다.
- 예약 폼 초기화는 언급돼 있지만 회원권 업무 입력 중 상태에 대한 정책은 빠져 있음을 확인했다.
- 입력 중 상태 손실 가능성을 문서 보강 항목으로 정리했다.

**Learnings:**
- 현재 코드 경로는 회원 변경을 사실상 “폼 초기화 + 컨텍스트 전환”으로 처리한다.
- 직접 진입형 선택 UI가 추가되면 이 동작은 더 자주 노출되므로, 플랜 단계에서 명시해야 구현 중 해석 차이가 줄어든다.

### 2026-03-09 - Plan Updated

**By:** Codex

**Actions:**
- 플랜의 `Proposed Solution`, `Technical Considerations`, `State lifecycle risks`, `Acceptance Criteria` 를 보강했다.
- 회원 변경 시 폼/미리보기/메시지 초기화 정책과 관련 검증 시나리오를 문서에 추가했다.

**Learnings:**
- 현재 구현 경로를 유지할 경우, 경고 모달보다 먼저 정책 명시가 필요하다.
- 입력 중 상태 손실은 구현 결함보다 정책 미정의에서 더 자주 발생한다.
