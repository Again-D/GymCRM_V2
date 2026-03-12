# 2026-03-12 frontend rebuild membership hardening

## Scope
- `frontend-rebuild/src/pages/memberships/MembershipsPage.tsx`
- `frontend-rebuild/src/pages/memberships/modules/useMembershipPrototypeState.ts`
- `frontend-rebuild/src/pages/member-context/modules/useSelectedMemberMembershipsQuery.ts`
- `frontend-rebuild/src/pages/members/modules/types.ts`

## What changed
- memberships prototype를 placeholder에서 실제 action surface로 확장했다.
- selected member memberships는 query module이 계속 소유하고, purchase / hold / resume / refund는 page-owned prototype state hook이 local mutation layer로 붙는 구조로 정리했다.
- prototype session 결제 이력도 memberships page 내부 state로 분리해, member-context ownership과 mutation ownership이 섞이지 않도록 했다.

## Why this boundary matters
- rebuilt app에서도 `selectedMember` canonical owner는 members domain에만 남겨둬야 한다.
- memberships page가 member-context를 다시 소유하기 시작하면, 원래 앱에서 줄이려던 coordinator drift가 다시 생긴다.
- 그래서:
  - member selection: `SelectedMemberContext`
  - memberships read data: `useSelectedMemberMembershipsQuery`
  - memberships mutation surface: `useMembershipPrototypeState`
  로 ownership을 분리했다.

## Prototype parity covered
- 회원권 구매 form + preview
- 선택 회원 회원권 목록
- ACTIVE membership hold
- HOLDING membership resume
- ACTIVE membership refund preview / refund submit
- prototype session payment history

## Validation
- `frontend-rebuild && npm test -- --run src/pages/memberships/modules/useMembershipPrototypeState.test.tsx src/pages/reservations/modules/useSelectedMemberReservationsState.test.tsx src/pages/members/modules/useMembersQuery.test.tsx src/pages/reservations/modules/useReservationTargetsQuery.test.tsx src/pages/members/modules/SelectedMemberContext.test.tsx src/pages/reservations/modules/useReservationSchedulesQuery.test.tsx src/pages/reservations/modules/reservableMemberships.test.ts src/App.routing.test.tsx`
- `frontend-rebuild && npm run build`

## Remaining gaps
- 실제 backend mutation parity는 아직 붙지 않았다.
- hold/resume/refund preview 수식은 prototype 설명용이며, 운영 계산식과 1:1 parity는 아직 아니다.
- mobile viewport smoke와 members/memberships/reservations full smoke는 후속 단계다.
