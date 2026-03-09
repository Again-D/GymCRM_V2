---
status: complete
priority: p2
issue_id: "055"
tags: [code-review, frontend, architecture, quality]
dependencies: []
---

# Isolate workspace member picker state from members tab state

## Problem Statement

직접 진입용 회원 선택 UI 계획이 기존 `loadMembers` / `members` 흐름 재사용을 전제로 적혀 있지만, 현재 이 상태는 회원관리 탭의 검색 입력, 결과 목록, 패널 메시지와 강하게 결합돼 있다. 이 결합을 유지한 채 회원권 업무/예약 관리 탭에 검색 UI를 붙이면, 회원관리 탭의 마지막 필터 결과가 업무 탭 검색 결과에 섞이거나, 업무 탭에서의 검색이 회원관리 탭 상태를 오염시키는 회귀가 생길 수 있다.

## Findings

- 플랜은 `docs/plans/2026-03-09-feat-membership-reservation-member-selection-flow-plan.md:38` 에서 기존 `selectedMemberId`, `selectedMember`, `loadMemberDetail`, `loadMembers` 흐름 재사용을 명시한다.
- 같은 플랜의 `docs/plans/2026-03-09-feat-membership-reservation-member-selection-flow-plan.md:145` 는 탭 내부 검색 상태를 설계하라고 적지만, 검색 결과 데이터 소스와 기존 회원관리 상태의 분리 기준은 정의하지 않는다.
- 현재 구현에서 `loadMembers` 는 전역 `members`, `memberSearchName`, `memberSearchPhone`, `memberPanelError` 상태와 연결돼 있다. 참조: `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx:814`, `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx:974`.
- 이 구조를 그대로 재사용하면 회원관리 탭 필터 결과가 업무 탭 검색 결과로 재사용되거나, 반대로 업무 탭 검색이 회원관리 탭의 목록/메시지를 바꿔 버릴 수 있다.

## Proposed Solutions

### Option 1: Workspace-local picker state and fetch path

**Approach:** 회원권 업무/예약 관리 탭 전용 검색 입력, 결과 리스트, 로딩/에러 상태를 별도 상태로 두고, 회원 상세 선택 시에만 기존 `loadMemberDetail` 로 합류한다.

**Pros:**
- 회원관리 탭 상태와 업무 탭 상태가 분리된다.
- 검색/에러 UX를 각 워크스페이스에 맞게 설계할 수 있다.

**Cons:**
- 상태와 fetch 경로가 추가된다.
- 일부 중복 로직을 정리할 필요가 있다.

**Effort:** 2-4 hours

**Risk:** Low

---

### Option 2: Shared hook/service for member search with isolated instances

**Approach:** 공통 회원 검색 로직을 훅이나 유틸로 추출하되, 회원관리 탭과 업무 탭이 각자 독립 인스턴스를 사용하게 한다.

**Pros:**
- 로직 중복을 줄이면서 상태 분리를 유지할 수 있다.
- 이후 출입 관리 등 다른 워크스페이스에도 재사용 가능하다.

**Cons:**
- 이번 범위 대비 약간 과설계가 될 수 있다.
- 추출 시점에 기존 members 탭 회귀 위험을 추가로 검증해야 한다.

**Effort:** 4-6 hours

**Risk:** Medium

---

### Option 3: Reuse global members state with strict reset rules

**Approach:** 전역 `members` 를 계속 쓰되, 탭 진입 시 필터/메시지 초기화와 복원 규칙을 세밀하게 정의한다.

**Pros:**
- 초기 구현 변경량이 적다.

**Cons:**
- 상태 충돌과 회귀 위험이 크다.
- UX가 탭 간 결합에 계속 묶인다.

**Effort:** 2-3 hours

**Risk:** High

## Recommended Action

플랜에서 회원관리 탭 상태와 업무 탭 직접 진입용 회원 선택 상태를 분리하는 원칙을 명시한다. 구현은 전역 `selectedMember` 합류 전까지 워크스페이스 전용 검색 입력/결과/에러 상태를 유지하는 방향으로 제한하고, 검증 항목에 “업무 탭 검색이 회원관리 탭 상태를 오염시키지 않음”을 추가한다.

## Technical Details

**Affected files:**
- `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-09-feat-membership-reservation-member-selection-flow-plan.md:38`
- `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-09-feat-membership-reservation-member-selection-flow-plan.md:145`
- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx:814`
- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx:974`

**Related components:**
- `MembershipsSection`
- `ReservationsSection`
- `MemberManagementPanels`

**Database changes (if any):**
- No

## Resources

- **Plan:** `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-09-feat-membership-reservation-member-selection-flow-plan.md`
- **Origin brainstorm:** `/Users/abc/projects/GymCRM_V2/docs/brainstorms/2026-03-09-membership-reservation-member-selection-flow-brainstorm.md`

## Acceptance Criteria

- [x] 플랜이 회원관리 탭 상태와 업무 탭 회원 선택 상태를 분리하는 원칙을 명시한다.
- [x] 탭 내부 검색 결과 데이터 소스와 에러/로딩 상태의 소유 주체가 정의된다.
- [x] 회원관리 탭의 검색/목록/메시지가 업무 탭 검색으로 오염되지 않는다는 검증 항목이 추가된다.

## Work Log

### 2026-03-09 - Initial Discovery

**By:** Codex

**Actions:**
- 플랜의 상태 재사용 문구와 현재 `App.tsx` 상태 구조를 대조 검토했다.
- `loadMembers` 가 전역 회원 목록/검색/에러 상태와 결합돼 있음을 확인했다.
- 업무 탭 직접 진입 검색 UI가 이 상태를 재사용할 때 발생할 수 있는 회귀를 정리했다.

**Learnings:**
- 현재 구조에서는 `selectedMember` 재사용 자체보다 `members/loadMembers` 재사용이 더 위험하다.
- 직접 진입용 검색은 상태 분리 기준이 먼저 정리돼야 구현이 단순해진다.

### 2026-03-09 - Plan Updated

**By:** Codex

**Actions:**
- 플랜의 `Proposed Solution`, `Technical Considerations`, `Acceptance Criteria`, `Implementation Suggestions` 섹션을 보강했다.
- 워크스페이스 전용 검색 상태 분리 원칙과 검증 항목을 문서에 추가했다.

**Learnings:**
- 이 이슈는 코드 변경보다 플랜 문구의 모호성이 원인이었다.
- 구현 전에 상태 소유권을 문서로 고정하면 members 탭 회귀 위험이 크게 줄어든다.
