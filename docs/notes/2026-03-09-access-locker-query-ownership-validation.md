# 2026-03-09 access/locker query ownership validation

## Scope
- branch: `codex/refactor-access-locker-query-ownership`
- focus:
  - `access`/`lockers` read query ownership extraction
  - reset-safe request-version invalidation parity
  - jwt auth gate validation fallback clarification
  - reservations/settlements long-list rendering guard decision

## Build / Test
- `cd /Users/abc/projects/GymCRM_V2/frontend && npm test` ✅
- `cd /Users/abc/projects/GymCRM_V2/frontend && npm run build` ✅

## Query Ownership Extraction

Added query hooks:
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/access/useAccessQueries.ts`
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/lockers/useLockerQueries.ts`

Added regression tests:
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/access/useAccessQueries.test.tsx`
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/lockers/useLockerQueries.test.tsx`

State ownership changes:
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/access/useAccessWorkspaceState.ts`
  - keeps member query, selected member, action submitting, message/error
  - no longer owns `accessEvents`, `accessPresence`, or read loading state
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/lockers/useLockerWorkspaceState.ts`
  - keeps filters, assign form, submitting ids, message/error
  - no longer owns `lockerSlots`, `lockerAssignments`, or read loading state
- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`
  - removed inline access/locker read loaders
  - composes query hook state and reset methods
  - protected reset now calls `resetAccessQueries()` and `resetLockerQueries()`

Reset-safety contract:
- access/locker query hooks both use request-version invalidation
- `resetAccessQueries()` / `resetLockerQueries()` increment request ids and clear data/loading/error
- late success/error/finally writes are ignored after protected reset

Mutation reload parity:
- `handleAccessEntry()` / `handleAccessExit()` still reload access presence + events together
- `handleLockerAssignSubmit()` / `handleLockerReturn()` still reload locker slots + assignments together

## Auth Gate Validation Hardening Decision

Files reviewed:
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/auth/LoginScreen.tsx`
- `/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-09-bundle-query-auth-lifecycle-validation.md`

Decision:
- no UI code change to `LoginScreen`
- current `form onSubmit`, labeled inputs, and submit button semantics are already the correct baseline
- `agent-browser` submit instability is documented as a tooling limitation, not an app regression

Validation ladder for future checks:
1. browser auth gate render + basic input interaction
2. semantic submit or keyboard submit if the tool supports it
3. proxy/API session cycle (`login` → `refresh` → `logout` → invalidated `refresh`)
4. hook/unit tests for protected reset behavior

Rationale:
- changing DOM structure purely to satisfy the browser tool would degrade clarity
- the existing fallback stack already proved jwt correctness more reliably than brittle browser submit automation

## Rendering Guard Decision

Files reviewed:
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/reservations/ReservationManagementPanels.tsx`
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/settlements/SettlementReportPanels.tsx`
- `/Users/abc/projects/GymCRM_V2/frontend/src/styles.css`

Decision:
- no additional `deferred-list-surface` applied to reservations or settlements in this branch

Reasoning:
- reservations mixes creation form, schedule table, and member reservation actions in one dense workflow; extra deferred rendering risks scroll/focus regressions for limited gain
- settlements keeps filter controls and report table tightly coupled; immediate readability after submit matters more than speculative deferred rendering
- existing notes already established that `content-visibility` should stay limited to long, low-interaction list surfaces

Rollback / revisit trigger:
- if profiler data or real fixture volume later shows these panels dominating initial render cost, re-evaluate with concrete long-list data rather than preemptive styling

## App Composition Impact
- `App.tsx` no longer owns access/locker inline read loader implementations
- query ownership is now aligned across:
  - members
  - products
  - reservation schedules
  - settlement report
  - CRM history
  - access
  - lockers

## Residual Risk
- jwt authenticated post-login browser navigation is still gated by `agent-browser` submit capability; keep treating API session cycle + hook tests as the source of truth until the tool path improves
- if access or locker queries gain caching later, reset invalidation must remain stronger than cache reuse
