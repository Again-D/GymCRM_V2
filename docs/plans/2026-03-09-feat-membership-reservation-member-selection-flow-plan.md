---
title: "feat: Membership and reservation member selection flow"
type: feat
status: active
date: 2026-03-09
origin: docs/brainstorms/2026-03-09-membership-reservation-member-selection-flow-brainstorm.md
---

# feat: Membership and reservation member selection flow

## Enhancement Summary

**Deepened on:** 2026-03-09  
**Sections enhanced:** 5  
**Research sources used:** internal learnings, React official docs, local frontend pattern review

### Key Improvements

1. 탭 내부 회원 선택 UI의 상태 소유권을 `workspace-local` 로 고정해 회원관리 탭과의 상태 오염 리스크를 명확히 분리했다.
2. `회원 변경`을 컨텍스트 전환 액션으로 정의하고, 폼/미리보기 초기화 정책을 React의 state reset 패턴과 맞춰 문서화했다.
3. 비동기 검색/선택 흐름에서 발생할 수 있는 stale response, 중복 요청, 모바일 정보 밀도 문제를 구현 단계 체크리스트로 추가했다.

### New Considerations Discovered

- React 공식 문서 기준으로 “공유 상태”와 “리셋되는 상태”를 분리해야 하므로, 선택된 회원은 상위 상태에 두되 검색 입력/결과는 탭 내부에 남겨야 한다.
- 회원 컨텍스트 변경 시 수동 effect reset보다 컴포넌트 경계 또는 `key` 기반 reset 전략이 더 예측 가능하다.

## Overview

회원권 업무와 예약 관리 탭의 진입 흐름을 리팩토링해, 회원관리 탭을 먼저 거치지 않아도 각 탭 내부에서 대상 회원을 선택하고 바로 업무를 시작할 수 있게 한다. 현재는 전역 `selectedMember`가 없으면 두 탭이 모두 "회원 선택 필요" 플레이스홀더만 보여주기 때문에, 실제 운영 흐름에서 불필요한 왕복 이동이 발생한다.

이번 작업은 사이드바 정보구조를 유지한 채, 회원 미선택 상태의 초기 진입 UX만 보강하는 범위로 제한한다. 회원관리 탭의 빠른 진입 액션은 그대로 유지하고, 회원권 업무/예약 관리 탭에는 `간단 검색 + 단일 선택 리스트` 기반의 경량 선택 UI를 추가한다 (see brainstorm: docs/brainstorms/2026-03-09-membership-reservation-member-selection-flow-brainstorm.md).

## Problem Statement / Motivation

현재 워크플로우는 `회원 선택 -> 회원권 업무/예약 관리 이동`을 강하게 전제한다. 이 구조는 회원관리 탭에서 시작할 때는 자연스럽지만, 사용자가 사이드바에서 직접 업무 탭으로 진입한 경우에는 회원 선택을 위해 다시 회원관리 탭으로 이동해야 한다.

이 왕복은 운영 UX에서 비용이 크다. 다만 기존 사이드바 리팩토링의 핵심 결정은 `회원권 업무`와 `예약 관리`를 독립 워크스페이스로 유지하는 것이었으므로, 이번 작업은 그 방향을 유지해야 한다. 즉, 탭을 숨기거나 회원관리 하위 메뉴로 격하하지 않고, 미선택 상태에서도 각 워크스페이스 안에서 시작 가능한 진입 모델로 보완해야 한다 (see brainstorm: docs/brainstorms/2026-03-09-membership-reservation-member-selection-flow-brainstorm.md).

## Proposed Solution

전역 `selectedMember` 상태는 유지한다. 회원관리 탭에서 회원을 선택하고 이동하는 현재 경로는 그대로 두고, 회원권 업무/예약 관리 탭에 직접 진입했을 때 `selectedMember === null`이면 각 탭 상단에서 자체 회원 검색/선택 UI를 렌더링한다.

회원 선택 UI는 회원관리 탭 전체를 복제하지 않고, 다음 범위로 제한한다.

- 검색 입력 1개 또는 2개 (`이름/연락처` 또는 단일 통합 검색)
- 검색 결과 단일 선택 리스트
- 선택 완료 시 `selectedMember`를 갱신하고 기존 업무 패널로 전환
- 현재 선택 회원이 있으면 상단 요약 + `회원 변경` 액션 제공

예약 관리 탭은 검색 대상을 미리 `예약 가능 회원`으로 제한하지 않는다. 검색은 전체 회원 기준으로 하되, 선택 후 `예약 가능 회원권 없음` 같은 상태 메시지로 정책을 설명한다. 이는 UI 검색 조건과 실제 예약 생성 검증 조건이 어긋나는 위험을 줄이기 위한 결정이다 (see brainstorm: docs/brainstorms/2026-03-09-membership-reservation-member-selection-flow-brainstorm.md).

탭 내부 회원 선택 UI는 회원관리 탭의 전역 `members`, `memberSearchName`, `memberSearchPhone`, `memberPanelError` 상태를 그대로 공유하지 않는다. 검색 입력, 결과 리스트, 로딩, 에러 상태는 각 워크스페이스 전용 상태로 분리하고, 최종 회원 확정 시점에만 기존 `loadMemberDetail` / `selectedMember` 경로로 합류한다. 이 원칙으로 회원관리 탭의 검색/목록/메시지가 업무 탭 직접 진입 검색에 오염되지 않게 한다.

`회원 변경`은 단순 탐색 액션이 아니라 현재 회원 컨텍스트를 교체하는 액션으로 정의한다. 초기 범위에서는 회원 변경 시 진행 중인 회원권 구매 폼, 예약 생성 폼, 미리보기/메시지 상태를 기존 `loadMemberDetail` 동작과 동일하게 초기화한다. 추가 dirty-state 확인 모달이나 회원별 draft 보존은 이번 범위에 포함하지 않으며, 대신 UI 문구와 테스트에서 이 초기화 정책을 명시한다.

### Research Insights

**Best Practices:**
- React 공식 가이드의 `sharing state between components` 원칙에 맞춰, “선택된 회원”만 상위 공통 상태로 두고 검색 입력/검색 결과는 각 탭 내부 상태로 유지한다.
- React의 `preserving and resetting state` 가이드에 맞춰 회원 컨텍스트 변경은 “다른 작업 대상”으로 취급하고, 폼 상태는 reset 가능한 경계로 분리한다.
- 내부 학습상 `회원권 업무`와 `예약 관리`는 독립 워크스페이스로 유지해야 하므로, 회원관리 탭의 검색 UX를 복제하지 않고 경량 진입 UI만 추가한다.

**Implementation Details:**
```tsx
function ReservationsWorkspace({ selectedMember }: Props) {
  if (!selectedMember) {
    return <ReservationMemberPicker />;
  }

  return <ReservationPanels key={selectedMember.memberId} member={selectedMember} />;
}
```

**Edge Cases:**
- 검색 응답이 느릴 때 이전 쿼리 결과가 나중에 도착해 최신 입력을 덮어쓰지 않도록 요청 순서 보호가 필요하다.
- 회원 변경 직후 이전 회원의 구매/예약 폼 내부 상태가 남으면 “다른 사람에게 예약/구매를 전송하는” 값비싼 UX 사고가 된다.

**References:**
- React docs: sharing state between components
- React docs: preserving and resetting state
- Internal learning: [admin-portal-sidebar-workspace-reorg-login-first-gymcrm-20260225.md](/Users/abc/projects/GymCRM_V2/docs/solutions/ui-bugs/admin-portal-sidebar-workspace-reorg-login-first-gymcrm-20260225.md)

## Technical Considerations

- 상태 관리:
  - 현재 `App.tsx`의 `selectedMemberId`, `selectedMember`, `loadMemberDetail` 흐름을 재사용한다.
  - 탭 내부 선택 UI는 회원관리 탭과 분리된 별도 로컬 입력, 결과 리스트, 로딩, 에러 상태를 가진다.
  - 탭 내부 회원 검색은 전역 `members` / `loadMembers` 상태를 직접 공유하지 않거나, 공유하더라도 독립 인스턴스로 캡슐화해 회원관리 탭 상태를 오염시키지 않게 한다.
  - 선택 완료 시 최종 상태만 기존 전역 `selectedMember`로 수렴시킨다.
- UI 책임 분리:
  - 회원관리 탭은 전체 탐색/편집 중심 역할을 유지한다.
  - 회원권 업무/예약 관리 탭은 대상 회원 확정 후 후속 업무 처리에 집중한다.
- 데이터 로딩:
  - 회원 검색은 기존 회원 목록 API 엔드포인트 패턴을 재사용하되, 워크스페이스 전용 검색 상태/결과 모델로 호출한다.
  - 예약 관리에서 회원 선택 후에는 기존 `loadReservationsForMember`, `selectedMemberMemberships`, `reservableMemberships` 흐름이 이어져야 한다.
- 전환 정책:
  - 회원 변경 시 현재 회원 컨텍스트에 종속된 예약 생성 폼, 회원권 구매 폼, 관련 미리보기/메시지 상태는 초기화한다.
  - 이 초기화는 예약 관리뿐 아니라 회원권 업무에도 동일하게 적용한다.
  - 초기 범위에서는 경고 모달보다 명시적 문구와 테스트로 동작을 고정한다.
- 정책 정렬:
  - 예약 가능 여부를 검색 단계에서 숨기지 않는다.
  - 예약 생성 가능성은 기존 서버/프론트 가드가 계속 최종 판단한다.
- 스타일/레이아웃:
  - 기존 테마, 패널, 리스트 셸, notice 패턴을 따른다.
  - 회원 선택 UI는 워크스페이스 안에서 가볍게 보이되, 모바일에서 기존 반응형 레이아웃을 깨지 않게 해야 한다.

### Research Insights

**Best Practices:**
- controlled input 은 워크스페이스 전용 검색 폼에 적합하며, 입력값과 결과를 한 컴포넌트 경계 안에 두는 편이 디버깅과 테스트가 쉽다.
- 로컬 상태를 유지할 컴포넌트와 상위 공통 상태로 올릴 데이터를 엄격히 나누면, 기존 `App.tsx` 전역 상태 비대화를 억제할 수 있다.
- `key={selectedMember.memberId}` 같은 reset 경계는 예약/회원권 패널의 하위 폼 상태를 예측 가능하게 비우는 데 유용하다.

**Performance Considerations:**
- 회원 검색은 입력 변경마다 바로 요청하지 말고, 명시적 조회 버튼 또는 짧은 debounce 중 하나로 고정하는 편이 현재 API와 맞다.
- 결과 리스트는 상위 5~10건 중심으로 제한하면 모바일 밀도와 렌더 비용을 같이 줄일 수 있다.
- 이미 로드한 회원 상세를 재선택하는 경우 불필요한 반복 fetch 여부를 구현 단계에서 점검해야 한다.

**Anti-Patterns to Avoid:**
- `memberSearchName`, `memberSearchPhone`, `memberPanelError` 를 직접 재사용해 두 탭을 members workspace 에 결합시키는 것
- 회원 변경 시 여러 폼 상태를 개별 effect 로 수동 리셋해 reset 규칙이 분산되는 것
- 검색 요청이 겹칠 때 마지막 응답만 반영한다는 규칙 없이 `setState` 하는 것

**Implementation Details:**
```tsx
type WorkspaceMemberPickerState = {
  query: string;
  rows: MemberSummary[];
  loading: boolean;
  error: string | null;
};
```

**References:**
- React docs: controlled inputs
- React docs: lifting state up
- Skill lens: `pattern-recognition-specialist`, `performance-oracle`, `julik-frontend-races-reviewer`

## System-Wide Impact

- **Interaction graph**:
  - 사이드바 탭 진입 -> `MembershipsSection` 또는 `ReservationsSection` 렌더 -> 회원 미선택이면 진입용 선택 UI 노출 -> 회원 선택 시 `loadMemberDetail` 호출 -> 전역 `selectedMember` 갱신 -> 기존 업무 패널 렌더.
  - 회원관리 탭 액션 버튼 -> `openMembershipOperationsForMember` 또는 `openReservationManagementForMember` -> `loadMemberDetail` 후 탭 전환. 이 빠른 경로는 그대로 유지한다.
- **Error propagation**:
  - 회원 검색 실패는 진입용 선택 UI 내부에서 사용자에게 노출되어야 하며, 회원관리 탭의 `memberPanelError` 나 기존 업무 패널 오류 메시지와 섞이지 않아야 한다.
  - 회원 상세 로딩 실패 시 탭 전환 후 불완전한 상태가 남지 않도록 기존 `loadMemberDetail` 실패 처리와 정렬해야 한다.
- **State lifecycle risks**:
  - 예약 관리 탭은 회원 변경 시 폼 stale state를 초기화해 온 기존 가드를 유지해야 한다.
  - 회원권 업무의 구매 폼, 환불 미리보기, 메시지 상태도 회원 변경 시 초기화되는지 명시하고 검증해야 한다.
  - 탭 내부 검색 입력 상태와 전역 선택 회원 상태가 충돌하지 않도록 전환 규칙을 명확히 해야 한다.
- **API surface parity**:
  - 회원 선택은 회원관리 행 클릭, 회원관리 액션 버튼, 탭 내부 검색 선택 세 경로로 들어오게 된다.
  - 세 경로 모두 최종적으로 같은 `loadMemberDetail` / `selectedMember` 갱신 경로를 써야 한다.
- **Integration test scenarios**:
  - 회원 미선택 상태에서 사이드바 `회원권 업무` 직접 진입 후 회원 검색/선택/구매 패널 진입.
  - 회원 미선택 상태에서 사이드바 `예약 관리` 직접 진입 후 회원 검색/선택/예약 패널 진입.
  - 예약 관리에서 회원 변경 후 예약 폼 stale state 초기화 유지.
  - 회원관리 탭 액션 버튼을 통한 기존 빠른 진입 경로 회귀 없음.

### Research Insights

**Race / Timing Considerations:**
- 검색 요청이 중첩될 수 있으므로 “현재 요청 토큰과 일치하는 응답만 반영” 규칙 또는 취소 가능한 fetch 래퍼가 필요하다.
- 회원 선택 직후 `loadMemberDetail` 와 예약 목록 로딩이 연쇄 호출되므로, 중간에 회원을 다시 바꾸는 경우 마지막 선택만 살아남게 해야 한다.
- React가 data race 를 막아주지 않으므로, 로딩 boolean 하나로 충분한지 검토하고 필요하면 `idle/loading/selected/error` 수준의 상태 머신으로 승격한다.

**Operational Notes:**
- 예약 탭은 기존 solution 문서에서 stale form reset 이 핵심 회귀 포인트였으므로, 이번 작업에서도 같은 검증을 baseline 으로 삼는다.
- 워크스페이스 직접 진입은 새 진입 경로이므로, 기존 Phase 7 스모크 로그에 없던 “direct entry -> search -> select” 시나리오를 추가해야 한다.

**References:**
- Internal learning: [reservation-capacity-and-usage-deduction-integrity-gymcrm-20260225.md](/Users/abc/projects/GymCRM_V2/docs/solutions/database-issues/reservation-capacity-and-usage-deduction-integrity-gymcrm-20260225.md)
- Validation baseline: [phase7-reservation-membership-ui-smoke-validation-log.md](/Users/abc/projects/GymCRM_V2/docs/notes/phase7-reservation-membership-ui-smoke-validation-log.md)

## SpecFlow Analysis

주요 사용자 흐름과 경계 조건은 다음과 같다.

- Happy path 1:
  - 사용자가 사이드바 `회원권 업무` 탭 진입
  - 회원 검색/선택
  - 선택 회원 요약과 기존 회원권 패널 렌더
- Happy path 2:
  - 사용자가 사이드바 `예약 관리` 탭 진입
  - 회원 검색/선택
  - 예약 대상 회원 요약, 예약 생성 폼, 스케줄/예약 목록 렌더
- Existing fast path:
  - 회원관리 탭에서 회원 선택 후 액션 버튼으로 직접 회원권/예약 탭 이동
  - 기존처럼 즉시 업무 화면 진입
- Edge cases:
  - 검색 결과 없음
  - 회원 상세 로딩 실패
  - 예약 관리에서 선택한 회원의 예약 가능 회원권이 0개
  - 회원권 업무에서 구매 폼 입력 또는 환불 미리보기 도중 회원 변경
  - 탭 내부에서 회원 변경 후 이전 폼 값이 남는 경우
  - 업무 탭 검색이 회원관리 탭의 검색 입력/목록/메시지 상태를 바꾸는 경우
  - 좁은 화면에서 선택 리스트와 패널이 과밀해지는 경우

이 분석을 기준으로 acceptance criteria와 회귀 테스트 범위를 확장한다.

## Acceptance Criteria

- [x] 사이드바의 `회원권 업무`, `예약 관리`는 계속 독립 탭으로 노출된다.
- [x] `selectedMember`가 없는 상태로 `회원권 업무` 탭에 진입해도, 탭 내부에서 회원 검색/선택 후 바로 업무를 시작할 수 있다.
- [x] `selectedMember`가 없는 상태로 `예약 관리` 탭에 진입해도, 탭 내부에서 회원 검색/선택 후 바로 업무를 시작할 수 있다.
- [x] 탭 내부 회원 선택 UI는 회원관리 탭 전체를 복제하지 않고 `간단 검색 + 단일 선택 리스트` 수준으로 유지된다.
- [x] 회원권 업무/예약 관리 탭의 회원 선택 UI는 회원관리 탭의 전역 검색 입력/결과/메시지 상태와 분리되어 동작한다.
- [x] 회원관리 탭의 `회원권 업무`, `예약 관리` 액션 버튼을 통한 기존 빠른 진입 경로는 그대로 동작한다.
- [x] 예약 관리 탭은 회원 검색 결과를 `회원권 보유 회원만`으로 숨기지 않는다.
- [x] 예약 생성 불가 상태는 검색 단계가 아니라 선택 이후 상태 메시지/폼 상태로 명확히 설명된다.
- [x] 예약 관리에서 회원 변경 시 예약 생성 폼 stale state 초기화가 계속 보장된다.
- [x] 회원권 업무에서 회원 변경 시 구매 폼, 미리보기, 관련 메시지 상태가 의도된 정책대로 초기화됨이 문서와 구현에서 일치한다.
- [x] 회원 검색 결과 없음, 회원 상세 로딩 실패, 예약 가능 회원권 없음 상태가 각각 명확하게 표현된다.
- [ ] 기존 테마/패널/반응형 레이아웃을 깨지 않고 모바일 좁은 화면에서도 사용 가능하다.
- [x] `frontend/package.json` 기준 빌드가 성공한다.
- [x] 회원권/예약 주요 진입 동선에 대한 수동 스모크 또는 브라우저 검증 로그가 남는다.
- [x] 검증 로그에 “업무 탭 직접 진입 검색이 회원관리 탭 상태를 오염시키지 않음”과 “입력 중 회원 변경 시 폼 초기화 동작” 시나리오가 포함된다.

### Research Insights

**Quality Gates to Add During Execution:**
- [ ] 직접 진입 검색 중 연속 입력/빠른 재조회에서도 마지막 검색 결과만 보인다.
- [ ] 회원 선택 직후 곧바로 다른 회원으로 바꿔도 이전 회원의 예약/구매 데이터가 순간적으로 섞여 보이지 않는다.
- [ ] 모바일 좁은 화면에서 선택 리스트가 기존 패널 레이아웃을 밀어내지 않고 순차적으로 읽힌다.
- [ ] `ROLE_DESK` 와 `ROLE_CENTER_ADMIN` 모두에서 직접 진입 흐름이 기존 권한 UX 와 모순되지 않는다.

## Success Metrics

- 회원권 업무/예약 관리 시작 시 회원관리 탭으로 되돌아가는 왕복 동선이 제거된다.
- 사용자가 회원 미선택 상태에서도 1개 탭 안에서 대상 회원 확정 후 업무 시작까지 완료할 수 있다.
- 기존 회원관리 기반 빠른 진입 경로 회귀가 없다.
- 예약 관리에서 검색 누락 또는 정책 혼동에 대한 오해가 줄어든다.

## Dependencies & Risks

- 의존성:
  - `frontend/src/App.tsx`의 전역 `selectedMember` 및 관련 로딩 함수
  - `frontend/src/features/memberships/MembershipsSection.tsx`
  - `frontend/src/features/reservations/ReservationsSection.tsx`
  - 필요 시 공통 경량 회원 선택 UI 컴포넌트 또는 탭별 전용 UI
- 리스크:
  - 탭 내부 검색 상태와 전역 선택 상태가 충돌하면 UX가 혼란스러울 수 있음
  - 예약 관리의 기존 stale-state 초기화 로직이 회원 변경 경로 확장으로 깨질 수 있음
  - 회원관리 탭과 업무 탭 검색 상태를 잘못 공유하면 필터/에러/목록 회귀가 생길 수 있음
  - 회원 변경을 쉽게 노출한 뒤 폼 초기화 정책을 숨기면 사용자가 입력 중 상태를 예상치 못하게 잃을 수 있음
  - 회원관리 기능을 과도하게 복제하면 IA 분리 효과가 다시 약해질 수 있음
  - 모바일에서 선택 리스트 + 업무 패널이 동시에 길어져 가독성이 떨어질 수 있음

## Implementation Suggestions

### Phase 1: 진입 UX 구조 정리

- `MembershipsSection`, `ReservationsSection`의 `!selectedMember` 분기를 플레이스홀더에서 선택 UI 컨테이너로 교체
- 현재 선택 회원이 있을 때는 기존 요약 패널 유지 + `회원 변경` 액션 제공
- [App.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx)
- [MembershipsSection.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/features/memberships/MembershipsSection.tsx)
- [ReservationsSection.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/features/reservations/ReservationsSection.tsx)

**Deepening notes:**
- 회원 변경 액션은 secondary CTA 로 유지하고 destructive 한 인상은 피하되, helper text 로 “현재 입력값이 초기화됩니다”를 분명히 적는다.
- 선택 UI는 `PlaceholderCard` 확장 또는 유사 패널 재사용으로 끝내고, 회원관리 탭의 복잡한 테이블 액션은 가져오지 않는다.

### Phase 2: 회원 검색/선택 흐름 추가

- 탭 내부에서 사용할 경량 검색 상태와 결과 리스트 설계
- 회원관리 탭 상태와 분리된 워크스페이스 전용 검색 입력/결과/에러 상태 정의
- 선택 시 기존 `loadMemberDetail(memberId, { syncForm: false })` 기반으로 전역 선택 상태 갱신
- 검색 결과 없음/로딩 실패/선택 중 상태 메시지 정리
- [App.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx)

**Deepening notes:**
- 결과 리스트는 `memberId`, `memberName`, `phone`, 필요 시 `membershipOperationalStatus` 정도만 보여주는 압축형 row 로 제한한다.
- 입력 즉시 자동 검색을 택한다면 debounce 와 stale response 보호를 함께 넣고, 그렇지 않으면 명시적 조회 버튼 패턴을 유지한다.
- 결과 선택 후에는 picker UI 를 접고 업무 패널로 전환해 두 UI 가 동시에 과도하게 길어지지 않게 한다.

### Phase 3: 예약 정책/회귀 보강

- 예약 관리 탭에서 회원 변경 후 기존 예약 폼 초기화 로직 재검증
- 회원권 업무 탭에서 회원 변경 후 구매 폼/미리보기/메시지 초기화 정책을 명시하고 UI 문구 정렬
- `reservableMemberships.length === 0` 상태에서 안내 문구와 폼 비활성화가 충분히 명확한지 보강
- 기존 회원관리 탭 액션 버튼 흐름 회귀 테스트
- 업무 탭 직접 진입 검색이 회원관리 탭 검색 상태를 바꾸지 않는지 회귀 테스트
- [ReservationManagementPanels.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/features/reservations/ReservationManagementPanels.tsx)
- [MembershipOperationsPanels.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/features/memberships/MembershipOperationsPanels.tsx)
- [MemberManagementPanels.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/features/members/MemberManagementPanels.tsx)

**Deepening notes:**
- 테스트는 최소한 `직접 진입`, `빠른 회원 전환`, `입력 중 회원 변경`, `예약 가능 회원권 없음`, `members 탭 회귀 없음` 다섯 축으로 나눈다.
- 브라우저 검증 로그에는 “이전 회원의 폼 값/미리보기/오류 메시지가 다음 회원에 섞이지 않음”을 명시적으로 남긴다.

## Sources & References

- **Origin brainstorm:** [docs/brainstorms/2026-03-09-membership-reservation-member-selection-flow-brainstorm.md](/Users/abc/projects/GymCRM_V2/docs/brainstorms/2026-03-09-membership-reservation-member-selection-flow-brainstorm.md)
- Similar implementation context: [App.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx)
- Existing member action pattern: [MemberManagementPanels.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/features/members/MemberManagementPanels.tsx)
- Existing memberships entry state: [MembershipsSection.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/features/memberships/MembershipsSection.tsx)
- Existing reservations entry state: [ReservationsSection.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/features/reservations/ReservationsSection.tsx)
- Related institutional learning: [admin-portal-sidebar-workspace-reorg-login-first-gymcrm-20260225.md](/Users/abc/projects/GymCRM_V2/docs/solutions/ui-bugs/admin-portal-sidebar-workspace-reorg-login-first-gymcrm-20260225.md)
  - carried-forward decision: 회원권 업무를 회원관리의 부속이 아니라 독립 워크스페이스로 유지
- Related institutional learning: [reservation-capacity-and-usage-deduction-integrity-gymcrm-20260225.md](/Users/abc/projects/GymCRM_V2/docs/solutions/database-issues/reservation-capacity-and-usage-deduction-integrity-gymcrm-20260225.md)
  - carried-forward decision: 예약 가능 여부는 UI 편의와 서버 정합성을 분리해 다루고, stale-state 회귀를 계속 점검
- Validation baseline: [phase7-reservation-membership-ui-smoke-validation-log.md](/Users/abc/projects/GymCRM_V2/docs/notes/phase7-reservation-membership-ui-smoke-validation-log.md)
