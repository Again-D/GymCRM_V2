---
date: 2026-03-12
topic: post-shell-routing-followups
---

# Post Shell Routing Follow-ups

## What We're Building
`/Users/abc/projects/GymCRM_V2/frontend`에 shell-only routing을 도입한 뒤, 다음 후속으로 어떤 라우팅 작업을 처리하는 것이 가장 가치가 큰지 정리한다.

이번 문서의 목적은 "React Router를 더 어디까지 확장할지"를 결정하는 것이다. 구현 세부보다, 현재 코드 구조와 운영 UX 기준으로 어떤 URL 상태가 실제 가치를 주는지에 집중한다.

## Why This Approach
현재 shell route는 이미 정리됐다. `/dashboard`, `/members`, `/memberships`, `/reservations`, `/access`, `/lockers`, `/products`, `/crm`, `/settlements`는 직접 진입, refresh, back/forward가 된다.

남은 불편은 대부분 `selectedMember` 같은 업무 컨텍스트가 URL에 없어서 생긴다. 특히 `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`는 아직 `selectedMemberId`, `selectedMember`, `loadMemberDetail`, `openMembershipOperationsForMember`, `openReservationManagementForMember` 같은 member-context 흐름을 중앙에서 조합한다. 따라서 다음 라우팅 작업은 섹션 전체가 아니라, 이 member-context를 어떤 범위까지 URL에 올릴지 결정하는 것이 핵심이다.

## Approaches

### Approach A: shell-only를 유지하고 후속 라우팅은 당장 하지 않음
현재 구조를 유지한다. 섹션 URL만 계속 쓰고, `selectedMember`, 검색어, 모달, 상세 패널은 모두 React state에 둔다.

**Pros**
- 가장 안전하다.
- 최근 정리한 shell routing 계약을 흔들지 않는다.
- `App.tsx`의 selected member/reset/query 조합을 다시 건드리지 않는다.

**Cons**
- `/memberships`, `/reservations` 새로고침 시 member context가 사라진다.
- 회원 기반 업무 링크 공유가 불가능하다.
- 현재 가장 자주 왕복하는 member-context UX 문제를 그대로 둔다.

**Best when**
- 당분간 deep link 요구가 섹션 수준만으로 충분할 때.
- `App.tsx` state ownership을 더 줄인 뒤에만 URL 확장을 하고 싶을 때.

### Approach B: memberships / reservations만 member-context query param 도입
`/memberships?memberId=123`, `/reservations?memberId=123`처럼 회원 기반 업무 섹션에만 `memberId`를 올린다. `selectedMember`의 canonical source는 여전히 현재 loader 흐름이지만, route 진입 시 query param이 있으면 해당 회원을 로드한다.

**Pros**
- 가장 큰 UX gap을 직접 줄인다.
- 회원관리에서 회원권/예약 업무로 넘어가는 흐름이 deep link 가능해진다.
- shell-only보다 한 단계 확장하지만, full routing보다 범위가 작다.

**Cons**
- `App.tsx`의 selected member/reset 규칙을 다시 점검해야 한다.
- 잘못 설계하면 route change와 local selected member가 어긋날 수 있다.
- `/memberships`와 `/reservations`에서 query param parsing, invalid member fallback, stale selection reset 계약이 필요하다.

**Best when**
- 현재 실제 불편이 `회원 선택 후 업무 섹션 이동`과 `새로고침 시 member context 손실`에 몰려 있을 때.
- full routing 전 단계로 가장 높은 가치를 작은 범위로 얻고 싶을 때.

### Approach C: detail / preview route를 정식 확장
기존 `routePreviewRoutes`를 실제 상세 route로 키운다. 예: `/members/:memberId`, 이후 `/products/new`, `/members/:memberId/reservations` 같은 구조로 발전시킨다.

**Pros**
- URL 의미가 더 명확해진다.
- 장기적으로 full routing에 가까운 정보 구조를 만든다.
- preview/detail use case와 shell route의 경계가 더 분명해진다.

**Cons**
- 지금 구조에서는 비용이 크다.
- `selectedMember`를 route param과 어떻게 동기화할지 다시 설계해야 한다.
- memberships/reservations만의 문제를 해결하기엔 범위가 넓다.

**Best when**
- member detail page 자체를 독립 라우트로 다뤄야 하는 요구가 생겼을 때.
- `App.tsx` selected-member 조합을 더 분리한 이후.

### Approach D: filter / pagination state를 query param으로 올림
회원관리, 예약관리, 출입관리의 검색/필터/페이지 상태를 URL query param에 동기화한다.

**Pros**
- 공유/복원 관점은 좋다.
- 최근 추가한 pagination과 자연스럽게 연결된다.
- 목록 상태를 다시 찾기 쉬워진다.

**Cons**
- member-context보다 사용자 가치가 덜 직접적이다.
- query param churn이 커지고 state sync 실수가 늘어난다.
- shell-only 직후 단계로는 과하다.

**Best when**
- 운영자가 특정 필터 상태를 저장/공유해야 하는 요구가 분명할 때.
- member-context URL화가 먼저 정리된 이후.

## Recommendation
추천은 **Approach B: `memberships` / `reservations`만 member-context query param 도입**이다.

이유는 단순하다. shell-only routing 이후 남은 가장 큰 UX 공백은 "섹션은 복원되지만 어떤 회원 업무를 하던 중이었는지는 복원되지 않는 것"이다. 이 문제는 모든 화면에 공통으로 있는 게 아니라, 주로 `/memberships`와 `/reservations`에서 크다. 반면 `/access`, `/crm`, `/settlements`는 지금 단계에서 memberId를 URL에 올려도 가치가 상대적으로 낮다.

즉 다음 단계는:
- 전면 routing 확장 아님
- detail route 전체 확장도 아님
- 우선 `memberships?memberId=`와 `reservations?memberId=`만 도입
- invalid `memberId`, unauthorized member, refresh, direct-entry fallback 계약을 같이 정하는 것

## Reasons Not To Do More Yet
다음 단계에서 바로 full routing이나 filter query sync까지 가면 범위가 커진다.

- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`는 아직 `selectedMember`와 업무별 loader/reset을 중앙에서 조합한다.
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/memberships/MembershipsSection.tsx`와 `/Users/abc/projects/GymCRM_V2/frontend/src/features/reservations/ReservationsSection.tsx`는 member picker와 selected member fallback이 이미 있다. 즉 작은 확장으로도 충분히 가치가 난다.
- filter/pagination query sync는 직관적이지만, 지금 해결해야 할 핵심 UX는 아니다.
- `/members/:memberId` 같은 detail route는 좋지만, 현재 member detail이 독립 페이지가 아니라 app-shell state에 가까워 바로 키우기엔 비용이 크다.

## Key Decisions
- 다음 후속 라우팅 작업은 full routing이 아니라 `member-context URL화`를 좁게 검토한다.
- 1차 대상은 `/memberships`와 `/reservations` 두 섹션만 본다.
- `memberId`는 query param으로 시작한다.
- `selectedMember` 전체 상태를 URL source of truth로 바꾸지는 않는다.
- filter/pagination query sync는 후속 후보로 남기되 우선순위는 낮다.
- `/members/:memberId` 같은 detail route 확장은 state ownership이 더 정리된 이후 다시 본다.

## Resolved Questions
- shell-only 다음 단계가 필요한가: 예.
- 바로 full routing으로 가야 하는가: 아니오.
- 가장 가치가 큰 다음 확장 범위는 무엇인가: `memberships` / `reservations`의 `memberId` query param.

## Open Questions
- `memberId` query param이 잘못되거나 권한 밖 회원이면 섹션을 비운 상태로 둘지, picker/list로 fallback할지.
- 회원관리에서 다른 회원을 선택했을 때 URL을 즉시 덮어쓸지, explicit navigation일 때만 바꿀지.

## Next Steps
- `/Users/abc/.codex/skills/workflows-plan/SKILL.md`로 `member-context query param routing` 작은 플랜을 만들 수 있다.
- 범위는 `/memberships?memberId=`와 `/reservations?memberId=`만 포함하고, filter/pagination query sync는 제외한다.
