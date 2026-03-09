# 2026-03-09 bundle/query/auth lifecycle validation

## Scope
- branch: `codex/refactor-bundle-query-auth-lifecycle`
- focus: panel-level lazy split, shared `members/products` query ownership, `useAuthSession` extraction

## Build / Test
- `cd /Users/abc/projects/GymCRM_V2/frontend && npm test` ✅
- `cd /Users/abc/projects/GymCRM_V2/frontend && npm run build` ✅

## Build Notes
- `App.tsx` line count: `2220 -> 2099`
- removed static panel imports from `App.tsx` for:
  - `MembershipOperationsPanels`
  - `ReservationManagementPanels`
  - `AccessManagementPanels`
  - `LockerManagementPanels`
  - `CrmMessagePanels`
  - `SettlementReportPanels`
  - `ProductManagementPanels`
- current split chunks from Vite build:
  - `MembershipOperationsPanels-DQbxGUoz.js` `10.70 kB`
  - `ProductManagementPanels-C0T8CnRS.js` `6.75 kB`
  - `LockerManagementPanels-CqOyCd3Q.js` `6.24 kB`
  - `ReservationManagementPanels-Cnm0E27E.js` `5.89 kB`
  - `AccessManagementPanels-w8u_pdDK.js` `5.00 kB`
  - `SettlementReportPanels-Qiha43ET.js` `3.41 kB`
  - `CrmMessagePanels-dh7IyHOK.js` `3.28 kB`
  - main entry `index-BB0fNHM_.js` `219.17 kB`

## Hook Coverage Added
- `frontend/src/shared/hooks/useAuthSession.test.tsx`
  - jwt bootstrap restores session
  - logout triggers protected UI reset
  - unauthorized callback clears session and triggers protected UI reset
- `frontend/src/features/members/useMembersQuery.test.tsx`
  - shared members query loads from canonical source and explicit reset clears rows/loading/error

## Query Ownership Extraction Completed
- shared canonical queries
  - `/Users/abc/projects/GymCRM_V2/frontend/src/features/members/useMembersQuery.ts`
  - `/Users/abc/projects/GymCRM_V2/frontend/src/features/products/useProductsQuery.ts`
- workspace-local read queries
  - `/Users/abc/projects/GymCRM_V2/frontend/src/features/reservations/useReservationSchedulesQuery.ts`
  - `/Users/abc/projects/GymCRM_V2/frontend/src/features/settlements/useSettlementReportQuery.ts`
  - `/Users/abc/projects/GymCRM_V2/frontend/src/features/crm/useCrmHistoryQuery.ts`

State ownership changes:
- `useReservationWorkspaceState` no longer owns reservation schedules/loading
- `useSettlementWorkspaceState` no longer owns settlement report/loading
- `useCrmWorkspaceState` no longer owns CRM history/loading
- `App.tsx` now composes these query hooks instead of owning inline loaders for those read paths

## Browser Smoke
Tool:
- `agent-browser` at `/opt/homebrew/bin/agent-browser`

Environment:
- backend health: `http://127.0.0.1:8080/api/v1/health`
- observed mode: `prototype`
- frontend dev server: `http://127.0.0.1:4173`
- session: `bundle-query-auth`

Validated:
1. dashboard renders normally under prototype mode after auth hook extraction
2. sidebar `회원권 업무` direct entry opens the in-workspace member picker
3. member selection transitions into the lazy-loaded membership operations panel without blank shell regressions
4. selected member context carries into `예약 관리` and the lazy-loaded reservation panel renders schedules/actions

Artifacts:
- `/Users/abc/projects/GymCRM_V2/docs/testing/artifacts/refactor-bundle-query-auth-memberships.png`
- `/Users/abc/projects/GymCRM_V2/docs/testing/artifacts/refactor-bundle-query-auth-membership-panel.png`
- `/Users/abc/projects/GymCRM_V2/docs/testing/artifacts/refactor-bundle-query-auth-reservations.png`

## Remaining Gap
- jwt-mode browser smoke is not covered in this local run because the backend is currently reporting `securityMode=prototype` on `2026-03-09`.
- reservations/settlements long-list `content-visibility` follow-up is still a separate pending phase.

## JWT Mode Validation
Environment:
- backend: `http://127.0.0.1:8082`
- frontend proxy: `http://127.0.0.1:4175`
- health response on `2026-03-09`: `securityMode=jwt`, `prototypeNoAuth=false`

Browser smoke (`agent-browser`):
- login screen/auth gate rendered correctly in jwt mode
- saved artifact:
  - `/Users/abc/projects/GymCRM_V2/docs/testing/artifacts/refactor-bundle-query-auth-jwt-dashboard.png`
- note: `agent-browser` session in this environment did not successfully trigger the controlled React login form submit despite the button being interactable. Because of that, authenticated browser navigation was validated via API session cycle plus login-screen rendering, not post-login dashboard rendering.

Proxy/API auth cycle:
1. `POST /api/v1/auth/login` via `http://127.0.0.1:4175` with `center-admin / dev-admin-1234!` → `200`, access token + refresh cookie issued
2. `POST /api/v1/auth/refresh` with stored cookie jar → `200`, token reissued
3. `POST /api/v1/auth/logout` with stored cookie jar → `200`
4. `POST /api/v1/auth/refresh` after logout → `401 TOKEN_INVALID`

Interpretation:
- jwt bootstrap surface is present
- proxy path keeps auth endpoints reachable from the frontend origin
- refresh cookie lifecycle and logout invalidation work as expected
- `useAuthSession` test coverage remains the source of truth for protected reset behavior on logout/unauthorized callbacks
