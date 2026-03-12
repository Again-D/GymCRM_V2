# frontend-rebuild folder structure

This document describes the **current** structure of the rebuild prototype app in this worktree.

- worktree: `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1`
- app root: `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/frontend-rebuild`

## Structure principles

- `src/App.tsx`
  - app shell, top-level route composition, provider wiring only
- `src/app/*`
  - route metadata and auth/provider modules
- `src/api/*`
  - API client and mock/baseline transport helpers
- `src/components/*`
  - feature-neutral layout components only
- `src/pages/*`
  - route entry pages and page-local composition
- `src/pages/*/modules/*`
  - page-owned state/query/business helpers
- `src/pages/*/components/*`
  - page-owned presentational components
- `src/shared/*`
  - cross-page shared helpers, hooks, and UI

## Current `src` tree

```text
src
├── App.routing.test.tsx
├── App.tsx
├── api
│   ├── axiosClient.ts
│   ├── client.ts
│   └── mockData.ts
├── app
│   ├── auth.tsx
│   └── routes.ts
├── assets
├── components
│   └── layout
│       └── DashboardLayout.tsx
├── index.css
├── main.tsx
├── pages
│   ├── Dashboard.tsx
│   ├── Login.tsx
│   ├── ShellPlaceholderPage.tsx
│   ├── member-context
│   │   ├── MemberContextFallback.tsx
│   │   └── modules
│   │       ├── trainerScope.ts
│   │       └── useSelectedMemberMembershipsQuery.ts
│   ├── members
│   │   ├── MemberList.tsx
│   │   ├── components
│   │   │   ├── MemberListSection.tsx
│   │   │   ├── MembershipPeriodFilter.tsx
│   │   │   ├── SelectedMemberContextBadge.tsx
│   │   │   └── SelectedMemberSummaryCard.tsx
│   │   └── modules
│   │       ├── SelectedMemberContext.test.tsx
│   │       ├── SelectedMemberContext.tsx
│   │       ├── types.ts
│   │       ├── useMembersQuery.test.tsx
│   │       ├── useMembersQuery.ts
│   │       └── useMembershipDateFilter.ts
│   ├── memberships
│   │   ├── MembershipsPage.tsx
│   │   └── modules
│   │       ├── useMembershipPrototypeState.test.tsx
│   │       └── useMembershipPrototypeState.ts
│   └── reservations
│       ├── ReservationsPage.tsx
│       └── modules
│           ├── reservableMemberships.test.ts
│           ├── reservableMemberships.ts
│           ├── useReservationSchedulesQuery.test.tsx
│           ├── useReservationSchedulesQuery.ts
│           ├── useReservationTargetsQuery.test.tsx
│           ├── useReservationTargetsQuery.ts
│           ├── useSelectedMemberReservationsState.test.tsx
│           └── useSelectedMemberReservationsState.ts
├── shared
│   ├── format.ts
│   ├── hooks
│   │   ├── useDebouncedValue.ts
│   │   └── usePagination.ts
│   └── ui
│       └── PaginationControls.tsx
└── vite-env.d.ts
```

## Current ownership rules

- `selectedMemberId` / `selectedMember`
  - canonical owner: `src/pages/members/modules/SelectedMemberContext.tsx`
- memberships read data
  - `src/pages/member-context/modules/useSelectedMemberMembershipsQuery.ts`
- memberships mutation prototype state
  - `src/pages/memberships/modules/useMembershipPrototypeState.ts`
- reservation target search
  - `src/pages/reservations/modules/useReservationTargetsQuery.ts`
- selected member reservation list/action surface
  - `src/pages/reservations/modules/useSelectedMemberReservationsState.ts`

## Intended next growth

- keep new sections under `src/pages/<section>`
- keep page-specific query/state logic in `modules/`
- move anything reused across sections into `src/shared`
- keep `src/components` reserved for layout or feature-neutral UI only
