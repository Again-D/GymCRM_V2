---
title: "refactor: Frontend state ownership and query lifecycle"
type: refactor
status: active
date: 2026-03-09
---

# refactor: Frontend state ownership and query lifecycle

## Enhancement Summary

**Deepened on:** 2026-03-09  
**Sections enhanced:** 5  
**Research sources used:** local frontend pattern review, recent internal solution documents, `vercel-react-best-practices`

### Key Improvements
1. cache invalidation을 단순 todo 수준이 아니라 `쓰기 성공 이벤트 → cache/helper invalidation → members list refresh` 체인으로 구체화했다.
2. render profiling 단계를 “Profiler를 돌린다” 수준이 아니라, 어떤 시나리오에서 어떤 컴포넌트를 보고 어떤 산출물을 남길지로 구체화했다.
3. 공통 query layer 검토를 “도입 여부 판단”이 아니라 `SWR` 도입 조건과 현 구조 유지 조건을 나누는 의사결정 게이트로 강화했다.

### New Considerations Discovered

- `useDeferredValue`는 렌더 우선순위 완화일 뿐 네트워크 debounce를 대체하지 않으므로, query lifecycle 설계에서 별도 네트워크 경계를 유지해야 한다.
- 현재 프로젝트는 `apiGet` 레벨에서 auth refresh dedupe만 제공하고, 도메인 query dedupe/cache는 화면별로 흩어져 있으므로, 공통 query layer 도입 시 “공유 원격 상태”와 “workspace-local state”를 먼저 구분해야 한다.

## Overview

최근 `회원권 업무`/`예약 관리` 직접 진입 picker 개선으로 워크스페이스 UX와 검색 성능은 한 단계 정리됐다. 다음 단계는 이 기능을 임시 최적화로 남기지 않고, `App.tsx`에 집중된 상태 소유권과 화면별 데이터 패칭 수명을 재정리해 이후 기능 추가가 성능 회귀와 상태 오염으로 이어지지 않게 만드는 것이다.

이번 작업은 새 기능 추가보다 **프론트엔드 상태 구조와 query lifecycle의 정리**에 초점을 둔다. 우선순위는 `workspace member search cache invalidation`, `렌더 프로파일링`, `업무별 state ownership 분리`, `공통 query layer 방향 결정` 순서로 둔다.

### Research Insights

**Best Practices:**
- Vercel 가이드 기준으로, 현재 주제는 `client-side data fetching`, `rerender-dependencies`, `advanced-use-latest` 카테고리와 직접 맞닿아 있다.
- 직접 진입 picker처럼 좁은 범위의 fetch는 app-wide query abstraction을 무리하게 도입하기보다, 먼저 state ownership과 invalidation 경계를 분리하는 쪽이 안전하다.

**Implementation Details:**
- `/Users/abc/projects/GymCRM_V2/frontend/src/shared/api/client.ts`는 auth refresh dedupe만 책임지고 있으므로, domain query lifecycle 정리는 `App.tsx` 또는 workspace-local hook에서 추가로 설계해야 한다.
- `/Users/abc/projects/GymCRM_V2/docs/solutions/performance-issues/workspace-member-search-request-churn-gymcrm-20260309.md`에서 이미 `debounce + cache + in-flight dedupe`가 기록돼 있으므로, 이번 플랜은 그 다음 단계인 invalidation/state split에 집중하는 게 맞다.

## Problem Statement / Motivation

현재 프론트엔드에서 가장 큰 구조적 리스크는 `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`에 다수의 업무 상태와 로더 함수가 집중되어 있다는 점이다. 직접 진입 picker 성능 문제는 `debounce + cache + dedupe`로 완화됐지만, 캐시 무효화 정책과 상태 소유권 경계가 아직 명시적이지 않다.

이 상태로 기능을 계속 누적하면 다음 문제가 커질 수 있다.
- 회원 생성/수정 뒤 workspace picker cache가 stale 상태를 유지할 수 있음
- `selectedMember` 변경 시 관련 없는 패널까지 재렌더될 수 있음
- 데이터 패칭 패턴이 각 섹션마다 흩어져 dedupe/cache/retry 정책이 중복될 수 있음
- `App.tsx` 수정 범위가 계속 넓어져 회귀 위험이 커짐

이번 리팩토링은 이 구조를 단계적으로 정리하는 안전한 중간 단계다. 직접 진입 플로우와 기존 운영 UX는 유지하면서, 후속 확장에 필요한 최소 구조 개선을 먼저 고정한다.

### Research Insights

**Best Practices:**
- `App.tsx` 같은 상위 셸에 상태가 과도하게 몰리면 기능 추가 시 성능보다 “리셋 정책 drift”와 “수정 영향 범위 확대”가 먼저 문제가 된다.
- Vercel 가이드의 `rerender-derived-state-no-effect`와 `rerender-dependencies` 관점에서는, 전역 상태는 “정말 여러 surface가 공유하는 것”만 남기고 나머지는 화면 경계 안으로 내리는 쪽이 맞다.

**Edge Cases:**
- 회원 생성 후 members 탭은 최신 목록인데 memberships/reservations picker는 stale cache를 보여줄 수 있다.
- 회원 변경 시 폼은 초기화됐는데, 분리 도중 message/error 상태가 다른 경계에 남아 있으면 사용자 입장에서는 이전 회원의 실패 메시지가 새 회원 화면에 섞여 보일 수 있다.

## Proposed Solution

네 단계로 나눠 진행한다.

### Phase 1: Workspace Search Cache Invalidation

`workspaceMemberSearchCacheRef`와 `workspaceMemberSearchInFlightRef`의 수명 정책을 명확히 한다.

핵심 작업:
- 회원 생성 성공 시 workspace search cache invalidate
- 회원 수정 성공 시 workspace search cache invalidate
- 필요하면 members list 재조회와 workspace picker cache 초기화를 동일 이벤트로 묶음
- invalidate 범위를 helper 함수로 추출해 쓰기 작업마다 일관되게 적용

대상 파일:
- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx:898`
- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx:1533`

### Research Insights

**Best Practices:**
- 캐시 무효화는 개별 성공 핸들러에서 중복 호출하지 말고 helper 하나로 모아야 drift를 막을 수 있다.
- invalidate는 “전체 캐시 폐기”로 먼저 단순하게 시작하고, 실제 비용이 문제일 때만 부분 invalidation으로 세분화하는 편이 안전하다.

**Implementation Details:**
- helper 예시:
```tsx
function invalidateWorkspaceMemberSearchCache() {
  workspaceMemberSearchCacheRef.current.clear();
  workspaceMemberSearchInFlightRef.current.clear();
}
```
- 적용 지점 후보:
  - `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx:1543` 회원 생성 성공 직후
  - `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx:1553` 회원 수정 성공 직후

**Edge Cases:**
- create/update 중 실패하면 invalidate하지 않아야 한다.
- invalidate 후 members list refresh가 실패하더라도 picker cache는 이미 비워져 있어야 stale 재사용이 막힌다.

### Phase 2: Render Profiling and Hotspot Identification

지금 구조에서 실제로 불필요한 렌더가 어디서 일어나는지 수치로 확인한다. 막연한 분리보다 먼저 hotspot을 확인해야 한다.

프로파일링 대상 시나리오:
- 회원 관리에서 회원 선택
- 회원권 업무 직접 진입 후 회원 선택
- 예약 관리 직접 진입 후 회원 변경
- 예약 생성/새로고침

확인 포인트:
- `selectedMember` 변경 시 어떤 섹션이 함께 렌더되는지
- `ContentHeader`, `SidebarNav`, `DashboardSection`이 과도하게 다시 렌더되는지
- picker 입력 중 전체 포털 셸이 다시 그려지는지

산출물:
- 간단한 profiling note 또는 작업 로그
- “분리 우선순위가 높은 상태 묶음” 목록

### Research Insights

**Best Practices:**
- profiler는 “무엇이 느린가”보다 “무엇이 불필요하게 다시 그려지는가”를 보는 용도로 써야 한다.
- 측정 전부터 `memo`를 도입하지 말고, 먼저 hotspot을 기록한 뒤 ownership split 또는 dependency 정리를 우선한다.

**Implementation Details:**
- 최소 기록 항목:
  - 시나리오 이름
  - commit SHA
  - interaction 시작 이벤트
  - 과도하게 다시 렌더된 컴포넌트 목록
  - 개선 우선순위
- 우선 추적 대상:
  - `SidebarNav`
  - `ContentHeader`
  - `DashboardSection`
  - `MembershipOperationsPanels`
  - `ReservationManagementPanels`

**Edge Cases:**
- picker 입력 중 렌더 횟수와 네트워크 호출 수를 분리해서 봐야 한다. 둘은 같은 문제가 아니다.
- `selectedMember` 변경은 정상적인 재렌더를 발생시키므로, “다시 그려짐” 자체보다 “관련 없는 패널까지 같이 그려짐”을 봐야 한다.

### Phase 3: State Ownership Split

프로파일링 결과를 바탕으로 `App.tsx`의 상태를 업무 단위로 옮긴다. 목표는 전면 재설계가 아니라, 가장 영향 범위가 큰 상태 묶음부터 이동하는 것이다.

우선 후보:
- reservation form/loading/message state
- membership purchase form/loading/message state
- access query/result state

원칙:
- 전역으로 남겨야 하는 것은 `selectedMember`, 인증 세션, 전역 nav 정도로 제한
- 화면 내부에서만 쓰는 form/message/loading 상태는 해당 섹션 또는 custom hook으로 이동
- 리셋 정책은 상태 소유권이 있는 곳에서 책임지게 함

대상 파일:
- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/memberships/MembershipOperationsPanels.tsx`
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/reservations/ReservationManagementPanels.tsx`
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/access/AccessManagementPanels.tsx`

### Research Insights

**Best Practices:**
- 분리 우선순위는 “가장 많이 바뀌는 상태”보다 “리셋 규칙이 복잡한 상태”를 먼저 옮기는 편이 효과적이다.
- `selectedMember`는 상위 공유 상태로 유지하되, form/message/loading은 workspace-local로 내리는 것이 가장 자연스럽다.

**Implementation Details:**
- 1차 후보:
  - reservation form/message/loading 묶음
  - membership purchase form/message/loading 묶음
- 2차 후보:
  - access query/result 상태
- 구조 예시:
```tsx
function useReservationWorkspaceState(selectedMemberId: number | null) {
  // form, loading, panel message/error, reset policy
}
```

**Edge Cases:**
- state를 옮길 때 `key={selectedMember?.memberId ?? ...}` 기반 reset 전략이 실제로 필요한지 다시 확인해야 한다.
- ownership split 후에도 직접 진입 picker에서 회원 선택 시 기존 `loadMemberDetail` race guard와 충돌하지 않아야 한다.

### Phase 4: Common Query Layer Decision

반복되는 `apiGet + local loading/error + useEffect` 패턴에 대해 방향을 정한다. 이 단계의 목표는 즉시 전면 도입이 아니라, 공통화 가치가 높은 화면과 유지해도 되는 화면을 구분하는 것이다.

검토 항목:
- SWR 도입 여부
- 얇은 custom hook 계층으로 충분한지
- 어떤 데이터가 “공유 원격 상태”인지, 어떤 것은 “화면 로컬 상태”인지

우선 검토 후보:
- member search / member summary
- reservation schedules
- access events / presence
- products list

결정 결과는 다음 둘 중 하나여야 한다.
- “현 구조 유지 + helper/hook 보강”
- “SWR 또는 유사 query layer를 단계적으로 도입”

### Research Insights

**Best Practices:**
- Vercel 가이드의 `client-swr-dedup` 취지는 “중복 fetch, cache, revalidation 정책을 공통화하라”는 것이지, 모든 fetch를 즉시 SWR로 바꾸라는 뜻은 아니다.
- app-wide shared remote state에만 공통 query layer를 도입하고, workspace-local transient state는 로컬에 남기는 경계가 중요하다.

**Decision Gate:**
- 아래 조건이 2개 이상 맞으면 SWR 검토를 우선한다.
  - 같은 endpoint를 여러 화면이 공유한다
  - stale/retry/revalidation 정책이 반복 구현되고 있다
  - 동일 데이터에 대한 loading/error UI가 여러 곳에서 중복된다
  - background revalidation 가치가 있다
- 아래 조건이 주로 맞으면 현 구조 + hook/helper 보강으로 유지한다.
  - fetch가 화면 단위로 고립돼 있다
  - cache 수명이 매우 짧다
  - reset 정책이 도메인 액션과 강하게 결합돼 있다

**Implementation Details:**
- 우선 시범 적용 후보는 `reservation schedules`가 가장 적합하다. 여러 진입점에서 재사용 가능하고, form 상태와도 느슨하게 연결돼 있다.
- 반대로 `workspace member picker`는 현재처럼 workspace-local fetch path로 남겨도 무방하다.

## Technical Considerations

- `workspaceMemberSearchCacheRef`는 빠르지만 쓰기 작업 뒤 stale 가능성이 있다.
- `loadMemberDetail`에는 race guard가 들어갔지만 다른 로더(`loadReservationSchedules`, `loadAccessEvents`, `loadProducts`)는 동일 수준의 경쟁 상태 방어가 부족할 수 있다.
- 성능 최적화는 `useDeferredValue`만으로 끝나지 않으며, 네트워크 경계에서는 debounce/dedupe 정책이 별도로 필요하다 (see solution: `/Users/abc/projects/GymCRM_V2/docs/solutions/performance-issues/workspace-member-search-request-churn-gymcrm-20260309.md`).
- 상태를 너무 빨리 쪼개면 오히려 디버깅이 어려워질 수 있으므로, profiler 기반으로 분리 우선순위를 정해야 한다.

### Research Insights

**Performance Considerations:**
- `/Users/abc/projects/GymCRM_V2/frontend/src/shared/api/client.ts`는 401 refresh dedupe만 제공하므로, domain fetch 경쟁 상태는 각 로더가 직접 관리해야 한다.
- `loadReservationSchedules`, `loadAccessEvents`, `loadProducts`도 profiler 결과에 따라 request race guard 또는 in-flight dedupe 후보가 될 수 있다.

**References:**
- `vercel-react-best-practices`: `client-swr-dedup`, `rerender-dependencies`, `advanced-use-latest`, `rerender-transitions`

## System-Wide Impact

- **Interaction graph**: 회원 생성/수정은 members list 재조회뿐 아니라 workspace picker cache, selectedMember 요약, membership/reservation workflow 재진입 UX에도 영향을 준다.
- **Error propagation**: 각 섹션이 `apiGet/apiPost` 결과를 개별 error/message 상태로 관리하고 있어, 공통 query layer 도입 시 에러 표현 책임이 어디에 남는지 정해야 한다.
- **State lifecycle risks**: cache invalidation 누락 시 stale member summary가 남고, state split 중 reset 경계가 흐려지면 회원 변경 시 폼 초기화 정책이 깨질 수 있다.
- **API surface parity**: 회원 검색은 members 탭과 workspace picker 두 surface를 모두 통해 노출되므로, 검색 정책 변경은 둘 다 검토해야 한다.
- **Integration test scenarios**:
  - 회원 생성 후 workspace picker 재검색 시 최신 회원이 보임
  - 회원 수정 후 dashboard / memberships / reservations 진입면에서 새 정보가 일치함
  - 회원 변경 후 memberships/reservations 폼 stale state가 남지 않음
  - 빠른 탭 이동과 새로고침에서도 로더 결과가 서로 덮어쓰지 않음

### Research Insights

**Additional scenarios to include:**
- 회원 생성 직후 members 탭과 workspace picker가 서로 다른 데이터를 보여주지 않음
- direct-entry picker query cache invalidate 후 첫 검색에서 stale hit 없이 새 결과를 가져옴
- profiler 상 `SidebarNav`와 `ContentHeader`가 membership/reservation form 입력 때문에 반복 렌더되지 않음
- query layer 시범 도입 시 refresh retry 정책과 auth refresh retry가 충돌하지 않음

## Acceptance Criteria

- [x] 회원 생성/수정 이후 workspace member search cache가 명시적으로 invalidate된다.
- [x] 회원 생성/수정 직후 direct-entry picker에서 최신 회원 정보가 확인된다.
- [ ] React profiler 또는 동등한 방식으로 주요 직접 진입 시나리오의 렌더 hotspot이 기록된다.
- [ ] profiler 결과를 기준으로 최소 1개 이상의 업무 상태 묶음이 `App.tsx` 밖으로 이동한다.
- [ ] memberships / reservations / access 중 우선순위가 높은 섹션에 대해 state ownership 경계가 문서 또는 코드로 명확해진다.
- [ ] 공통 query layer 방향(유지 / custom hook / SWR 단계 도입)이 명시적으로 결정된다.
- [ ] `frontend/package.json` 기준 빌드가 성공한다.
- [ ] 변경된 데이터 패칭 또는 상태 리셋 경로에 대한 검증 로그 또는 테스트가 남는다.

## Success Metrics

- `App.tsx`의 업무별 상태 집중도가 줄어든다.
- 회원 검색/선택/변경 후 stale UI 재현 가능성이 줄어든다.
- 직접 진입 흐름에서 네트워크 호출과 렌더 회수가 불필요하게 증가하지 않는다.
- 이후 새 워크스페이스 기능 추가 시 상태 오염/리셋 회귀 위험이 줄어든다.

## Dependencies & Risks

- 의존성:
  - `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`
  - `/Users/abc/projects/GymCRM_V2/frontend/src/shared/api/client.ts`
  - `/Users/abc/projects/GymCRM_V2/frontend/src/shared/ui/WorkspaceMemberPicker.tsx`
  - memberships/reservations/access 패널 컴포넌트들
- 리스크:
  - state split 중 reset 경계가 어긋나면 기존 직접 진입 플로우가 깨질 수 있음
  - cache invalidation을 과하게 잡으면 성능 최적화 이점을 잃을 수 있음
  - 공통 query layer를 너무 빨리 도입하면 현재 프로젝트 규모 대비 복잡도가 증가할 수 있음

## Sources & References

- Similar implementation focus: `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx:898`
- Similar implementation focus: `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx:1533`
- Related solution: `/Users/abc/projects/GymCRM_V2/docs/solutions/performance-issues/workspace-member-search-request-churn-gymcrm-20260309.md`
- Related solution: `/Users/abc/projects/GymCRM_V2/docs/solutions/ui-bugs/admin-portal-sidebar-workspace-reorg-login-first-gymcrm-20260225.md`
- Recently merged optimization: PR #58
- Recently merged direct-entry flow: PR #57
