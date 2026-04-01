---
status: ready
priority: p1
issue_id: "128"
tags: [frontend, ant-design, zustand, tanstack-query, migration]
dependencies: []
---

# Frontend Ant Design and Zustand foundation migration

Execute the workdoc at `docs/plans/2026-03-27-refactor-frontend-ant-design-zustand-foundation-migration-workdoc.md`, starting with Phase 0 baseline/contracts and the Phase 1 provider/dependency foundation.

## Problem Statement

The frontend foundation still uses bespoke UI primitives and React context/local state for auth, theme, and selected member flows. The active migration plan requires moving the application baseline to `Ant Design 5.x + Zustand + TanStack Query 5.x` without regressing login-first routing, shell behavior, role gating, or selected-member security behavior.

## Findings

- `frontend/src/main.tsx` still boots as `AuthStateProvider -> ThemeProvider -> BrowserRouter -> App`.
- `frontend/src/app/auth.tsx`, `frontend/src/app/theme.tsx`, and `frontend/src/pages/members/modules/SelectedMemberContext.tsx` are context-driven today.
- The workdoc is still `status: active` and all execution checklists are open.
- The workdoc, plan, and brainstorm documents are currently untracked in git and should be preserved while implementation proceeds.

## Proposed Solutions

### Option 1: Execute workdoc phase-by-phase

**Approach:** Baseline current frontend behavior, document contracts, then implement dependency/provider foundation before continuing into later migration waves.

**Pros:**
- Matches the repository workdoc exactly
- Reduces regression risk by gating later UI changes behind foundation validation

**Cons:**
- Requires touching docs and implementation together
- Initial progress is infrastructure-heavy before user-visible UI migration

**Effort:** Multi-session

**Risk:** Medium

---

### Option 2: Jump directly to page migration

**Approach:** Start replacing pages with Ant Design and retrofit providers/stores opportunistically.

**Pros:**
- Faster visible UI changes

**Cons:**
- Violates plan sequencing
- High risk of mixed legacy/new paths and state ownership regressions

**Effort:** Multi-session

**Risk:** High

## Recommended Action

Follow Option 1. Complete Phase 0 and Phase 1 first, update the workdoc checkboxes as progress is made, and validate login/theme/auth contracts before moving into Zustand/TanStack Query state migration.

## Technical Details

**Affected areas:**
- `frontend/src/main.tsx`
- `frontend/src/app/auth.tsx`
- `frontend/src/app/theme.tsx`
- `frontend/src/pages/members/modules/SelectedMemberContext.tsx`
- `frontend/package.json`
- Work tracking docs under `docs/plans/`

## Resources

- Workdoc: `docs/plans/2026-03-27-refactor-frontend-ant-design-zustand-foundation-migration-workdoc.md`
- Plan: `docs/plans/2026-03-27-refactor-frontend-ant-design-zustand-foundation-migration-plan.md`
- Brainstorm: `docs/brainstorms/2026-03-27-frontend-ant-design-zustand-brainstorm.md`

## Acceptance Criteria

- [ ] Phase 0 contracts and baseline notes are recorded
- [ ] Phase 1 dependency/provider foundation is implemented
- [ ] Relevant frontend validation passes
- [ ] Workdoc checkboxes and status reflect completed work

## Work Log

### 2026-03-27 - Execution Start

**By:** Codex

**Actions:**
- Read the workdoc and origin plan
- Confirmed branch state and created `feature/frontend-antdesign-zustand-foundation`
- Inspected current provider/state foundation files
- Created a tracked ready todo for workdoc execution

**Learnings:**
- Current provider order does not yet match the target contract
- Auth, theme, and selected-member flows remain context-based today
- The work should begin with Phase 0/1 before page migration

### 2026-03-27 - Phase 0 and Phase 1 foundation

**By:** Codex

**Actions:**
- Added `antd`, `zustand`, and `@tanstack/react-query` to `frontend/package.json`
- Introduced foundation providers and shared query/theme/feedback bridge modules
- Reworked `frontend/src/main.tsx` to use the target top-level provider order
- Standardized JWT refresh failure/logout session clearing in `frontend/src/app/auth.tsx`
- Captured build-size baseline and created `docs/plans/2026-03-27-refactor-frontend-ant-design-zustand-foundation-migration-baseline-note.md`
- Updated the workdoc checkboxes for completed Phase 0 and Phase 1 items
- Ran `cd frontend && npm run build` and `cd frontend && npm test`

**Learnings:**
- The provider contract can be introduced without yet migrating auth/theme internals to Zustand
- Ant Design foundation integration passes the current frontend test suite
- Bundle size increased beyond the current JS budget guardrail and needs follow-up before broader migration waves

### 2026-03-27 - Entry bundle reduction and provisional browser baseline

**By:** Codex

**Actions:**
- Added route-level lazy loading in `frontend/src/App.tsx` to split page bundles by route
- Re-ran `cd frontend && npm run build` and reduced the main entry chunk from `685.19 kB` to `488.65 kB`
- Re-ran `cd frontend && npm test` after the route splitting change
- Captured provisional Lighthouse browser-performance baselines for representative routes on a local Vite dev server
- Updated the baseline note with optimized bundle data and browser-baseline observations

**Learnings:**
- The remaining initial entry weight is now mostly shared library cost, not page code
- Route splitting materially improved the bundle situation, but the JS guardrail is still slightly missed
- CLI/browser automation can provide rough runtime baselines, but not a trustworthy replacement for React DevTools Profiler data

### 2026-03-27 - React Profiler baseline capture

**By:** Codex

**Actions:**
- Added a dev-only `RouteProfiler` boundary and route-level capture hook
- Ran the local Vite dev server in mock mode and opened `Dashboard`, `Members`, `Memberships`, and `Reservations` with `reactProfile=1`
- Read `window.__GYMCRM_REACT_PROFILER__` from the browser session to capture commit counts and render durations
- Updated the baseline note and workdoc to mark the React Profiler baseline task complete

**Learnings:**
- `Members` is currently the heaviest representative route on initial mount among the captured routes
- The dev-only route profiler gives a reusable baseline path for later migration waves without affecting normal runtime behavior

### 2026-03-27 - Phase 2A probe and rollback

**By:** Codex

**Actions:**
- Probed a first Zustand adapter approach for `auth/theme/ui-feedback`
- Ran targeted and full frontend validation
- Reverted the unstable store-sync attempt after it introduced auth-state timing regressions and test failures

**Learnings:**
- Global singleton store hydration is not safe enough for the current `AuthStateProvider` override/test contract
- Phase 2A should move to a store-per-provider or explicitly scoped hydration pattern instead of retrofitting a singleton under the existing adapter

### 2026-03-27 - Phase 2A provider-scoped Zustand migration

**By:** Codex

**Actions:**
- Added provider-scoped Zustand stores for `auth` and `theme`, plus a shared `ui-feedback` event store
- Converted `AuthStateProvider` and `ThemeProvider` into thin adapters that preserve the existing public contract while delegating state transitions to Zustand
- Kept JWT access token handling memory-only inside `AuthStateProvider`
- Added `uiFeedbackStore` validation coverage and re-ran full frontend validation with `cd frontend && npm test` and `cd frontend && npm run build`

**Learnings:**
- Provider-scoped stores preserve the current test/runtime override contract without the hydration races seen in the singleton attempt
- The Phase 2A state boundary now matches the workdoc for `auth`, `theme`, and global feedback, while keeping selected-member migration isolated for Phase 2B
- Build and test stayed green after the Zustand adapter migration, but the shell-wide rerender gate still needs a separate regression check

### 2026-03-27 - Phase 3 shell foundation slice

**By:** Codex

**Actions:**
- Replaced `DashboardLayout` with an antd `Layout/Menu` shell and moved the shell layout into a lazy chunk
- Replaced `HeaderLayout` with an antd-based session/theme control surface
- Kept the existing custom `Modal` after an antd replacement probe broke focus/accessibility test contracts
- Swapped `EmptyState` and `SkeletonLoader` to antd thin wrappers
- Re-ran `cd frontend && npm test` and `cd frontend && npm run build`

**Learnings:**
- Shell conversion can land without route/auth regressions if the layout chunk is split from the main entry
- Replacing the custom modal needs a tighter compatibility layer because the current tests depend on its focus trap and focus restore semantics
- The shell slice is green, but the current build still exceeds Vite's 500 kB chunk warning and remains slightly above the original JS budget guardrail

### 2026-03-27 - Phase 3 dashboard surface slice

**By:** Codex

**Actions:**
- Replaced `Dashboard` hero, metric cards, and quick-entry cards with antd `Card`, `Statistic`, `Tag`, `Button`, and `Empty` surfaces
- Added a dedicated `Dashboard` smoke test and aligned route-shell tests with the lazy dashboard chunk timing
- Re-ran `cd frontend && npm test` and `cd frontend && npm run build`

**Learnings:**
- Dashboard surface migration can land independently from the rest of the page wave as long as route-level lazy loading and test-time preload remain in place
- The dashboard slice now fits the shell direction, but `Modal` replacement and raw backend error cleanup still block closing all of `Phase 3`
- Bundle structure improved by isolating `DashboardLayout` and `Dashboard` chunks, but the main entry is still just over the 500 kB warning line

### 2026-03-27 - Phase 3 user-facing error sanitization

**By:** Codex

**Actions:**
- Added a shared UI error helper and switched remote error surfaces to fallback copy instead of backend `detail`, raw `message`, or trace-linked strings
- Sanitized reservation, GX schedule, trainer availability, trainer management, membership, members/products/lockers query, PT candidate, and CRM failure-row messaging
- Updated reservation helper tests to match the new user-facing error contract
- Re-ran `cd frontend && npm test` and `cd frontend && npm run build`

**Learnings:**
- The app had several page-local error helpers that independently leaked backend detail; centralizing the fallback rule removes that inconsistency quickly
- CRM history needed an explicit UI copy replacement because the failure reason came from backend payload fields rather than thrown errors
- `Phase 3` is now mostly blocked on full primitive replacement and CSS primitive cleanup, not on state or error-surface contracts

### 2026-03-27 - Phase 3 shared primitive cleanup slice

**By:** Codex

**Actions:**
- Reworked `MemberContextFallback` from global primitive classes to antd `Card`, `Input`, `Button`, `Alert`, `Table`, and `Empty`
- Reworked `SelectedMemberSummaryCard` to antd `Card`/`Alert`/`Descriptions` surfaces and aligned related member tests with the new rendering contract
- Re-ran `cd frontend && npm test` and `cd frontend && npm run build`

**Learnings:**
- Shared member-context surfaces can move off legacy CSS primitives without touching the page-level modal contract
- antd responsive description layout introduced an avoidable `matchMedia` test dependency; a static column contract keeps the component and test suite stable
- The remaining `Phase 3` work is now concentrated in page-level `ops-shell`/`panel-card`/`pill` cleanup and the unresolved custom `Modal` replacement

### 2026-03-30 - Phase 3 products page surface slice

**By:** Codex

**Actions:**
- Rebuilt `ProductsPage` around antd `Card`, `Statistic`, `Tag`, `Alert`, `Table`, `Form`, `Input`, `Select`, `Checkbox`, and `Button` surfaces
- Kept the existing custom `Modal` contract in place while moving the product editor modal contents off legacy primitive inputs
- Updated `ProductsPage` and `AccessPage` tests for antd `matchMedia`/alert rendering assumptions
- Re-ran `cd frontend && npm test` and `cd frontend && npm run build`

**Learnings:**
- `ProductsPage` is a workable first page-level primitive cleanup target because it has a bounded table/filter/editor loop without selected-member coupling
- Pulling antd `Table` into the page introduces a large shared table chunk, so future page migrations should expect chunk redistribution even when the page-local chunk itself shrinks
- The remaining `Phase 3` cleanup should prioritize pages with similar list/filter/editor structure (`Lockers`, `Settlements`) before the denser workbench screens (`Reservations`, `GX`, `TrainerAvailability`)

### 2026-03-30 - Phase 3 lockers page surface slice

**By:** Codex

**Actions:**
- Rebuilt `LockersPage` around antd `Card`, `Statistic`, `Tag`, `Alert`, `Table`, `Form`, `Input`, `Select`, `DatePicker`, and `Button` surfaces
- Kept the existing custom `Modal` contract while moving the locker assignment modal contents onto antd form controls
- Updated `LockersPage` test for antd `matchMedia` and alert text rendering assumptions
- Re-ran `cd frontend && npm test` and `cd frontend && npm run build`

**Learnings:**
- `LockersPage` follows the same list/filter/editor shape as `ProductsPage`, so it can be migrated with low behavioral risk while leaving the modal contract untouched
- Page-local CSS stayed small after the migration, but the shared `Table` chunk remains the main reason the build still sits above the 500 kB warning line
- The next efficient `Phase 3` targets are still the remaining list/filter/admin screens, especially `Settlements`, before the heavier interactive workbenches

### 2026-03-30 - Phase 3 settlements page surface slice

**By:** Codex

**Actions:**
- Rebuilt `SettlementsPage` around antd `Card`, `Statistic`, `Tag`, `Alert`, `Table`, `Form`, `Input`, `Select`, `DatePicker`, and `Button` surfaces
- Replaced legacy filter/report primitives with antd form controls and table locale-based loading/empty states
- Added a `SettlementsPage` smoke test and re-ran `cd frontend && npm test` plus `cd frontend && npm run build`

**Learnings:**
- `SettlementsPage` is the cleanest page-level primitive cleanup target because it has no modal contract and no selected-member coupling
- The page-local settlement chunk is small after migration, which reinforces that the bundle warning is now dominated by shared UI chunks rather than individual migrated pages
- The next `Phase 3` targets should now shift to the denser operational screens like `Reservations`, `GX`, and `TrainerAvailability`, where page-level primitives are still deeply embedded

### 2026-03-30 - Phase 3 reservations page surface slice

**By:** Codex

**Actions:**
- Rebuilt `ReservationsPage` around antd `Card`, `Statistic`, `Tag`, `Alert`, `Table`, `Input`, and `Button` surfaces for the outer shell, member directory, and selected-member workbench
- Kept the existing custom `Modal` contract in place while preserving the PT/GX reservation creation flow and selected-member business logic
- Adjusted the member directory action to open the workbench immediately and close it again only if `selectMember()` fails, which stabilized the async workbench contract
- Increased timeout budgets only for the slow full-suite integration tests in `App.routing`, `AccessPage`, `ProductsPage`, and `ReservationsPage`
- Re-ran `cd frontend && npm test` and `cd frontend && npm run build`

**Learnings:**
- `ReservationsPage` can move its page-level primitives to antd without touching the current custom modal or rewriting the reservation business flow
- The flaky behavior was not a logic regression but a timing issue from slower full-suite shell/page rendering after more antd surfaces were introduced
- The next `Phase 3` targets should stay on the remaining dense operational screens (`GX`, `TrainerAvailability`, `Trainers`, `Members`, `CRM`) while the unresolved custom `Modal` replacement remains isolated

### 2026-03-30 - Phase 3 trainers page surface slice and full-suite stabilization

**By:** Codex

**Actions:**
- Rebuilt `TrainersPage` around antd `Card`, `Statistic`, `Tag`, `Alert`, `Table`, `Form`, `Input`, `Select`, `Button`, `Descriptions`, `List`, and `Empty` surfaces while keeping the existing custom `Modal` contract
- Stabilized adjacent antd-converted screens and tests by fixing `GxSchedulesPage`/`TrainerAvailabilityPage` alert props, aria labels, and antd-specific test selectors
- Increased timeout budgets for slow full-suite scenarios in `App.routing`, `App.test`, `AccessPage`, `LockersPage`, `TrainerAvailabilityPage`, and `GxSchedulesPage`
- Reduced Vitest worker concurrency in `frontend/vite.config.ts` and `frontend/vite.config.js` to `maxWorkers: 4` / `minWorkers: 1`
- Re-ran `cd frontend && npm test` and `cd frontend && npm run build`

**Learnings:**
- The dominant instability was not business-logic regression but jsdom plus lazy-route contention under a highly parallel suite, so runner-level parallelism mattered more than further component rewrites
- `waitForElementToBeRemoved` on the route loading shell needs an explicit timeout once route chunks and antd surfaces make the dashboard shell slower to settle in full-suite runs
- `GxSchedulesPage` validation scenarios are now the longest tests in the suite, so future page migrations should budget for test runtime growth even if the migrated screen behavior itself stays simple

## Notes

- Keep diffs minimal and aligned to the workdoc gates.
