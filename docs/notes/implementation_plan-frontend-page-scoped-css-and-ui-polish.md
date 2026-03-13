# Implementation Plan: Frontend Page-Scoped CSS and UI Polish

The goal is to implement the changes outlined in [docs/plans/2026-03-13-refactor-frontend-page-scoped-css-and-ui-polish-plan.md](file:///Users/abc/projects/GymCRM_V2/docs/plans/2026-03-13-refactor-frontend-page-scoped-css-and-ui-polish-plan.md). We will separate page-specific, component-specific, and layout-specific CSS from the global `index.css` into modular `*.module.css` files, improving both the hierarchy and maintainability of the frontend's visual design.

## Proposed Changes

### 1. Global Baseline Definition & CSS Modules Setup

First, we will define exactly what selectors stay in `index.css` (primitives, reset rules, shared cards/buttons) and what selectors move.

#### [MODIFY] frontend/src/index.css
- Keep: `:root` variables, reset rules, typography basics.
- Keep: `.primary-button`, `.secondary-button`, `.panel-card`, `.selected-member-card`, `.members-table`, `.status-pill`, `.pagination-button`.
- Move: Shell layout rules (e.g., sidebar, topnav).
- Move: Page-specific rules (e.g., reservations grid, access summaries, products layout).

### 2. Phase 1: Shell and Entry Surfaces

We will isolate the app shell (DashboardLayout) and the primary entry view (Login, Dashboard) into their own modules.

#### [NEW] frontend/src/components/layout/DashboardLayout.module.css
- Move shell layout, sidebar navigation, and header styling from `index.css`.

#### [MODIFY] frontend/src/components/layout/DashboardLayout.tsx
- Add `import styles from "./DashboardLayout.module.css";`
- Update `className` props to use `styles.*`.

#### [NEW] frontend/src/pages/Login.module.css
- Move login page rhythm and text styling from `index.css`.

#### [MODIFY] frontend/src/pages/Login.tsx
- Add `import styles from "./Login.module.css";`
- Update `className` props to use `styles.*`.

#### [NEW] frontend/src/pages/Dashboard.module.css
- Move dashboard rhythm from `index.css`.

#### [MODIFY] frontend/src/pages/Dashboard.tsx
- Add `import styles from "./Dashboard.module.css";`
- Update `className` props to use `styles.*`.

### 3. Phase 2: First-Wave Workspace Migration

We will move the busiest operational screens onto page-scoped CSS modules.

#### [NEW] frontend/src/pages/access/AccessPage.module.css
#### [MODIFY] frontend/src/pages/access/AccessPage.tsx
- Extract and applying `.summaryCard`, responsive grid adjustments specifically for the access panel from `index.css`.

#### [NEW] frontend/src/pages/products/ProductsPage.module.css
#### [MODIFY] frontend/src/pages/products/ProductsPage.tsx
- Move the complex editor pane classes and layout rules.

#### [NEW] frontend/src/pages/reservations/ReservationsPage.module.css
#### [MODIFY] frontend/src/pages/reservations/ReservationsPage.tsx
- Extract layout logic for the two-column calendar/target view from `index.css`.

### 4. Phase 3: Remaining Workspace Migration

We will finish migrating the remaining secondary pages out of the global stylesheet.

#### [NEW] frontend/src/pages/crm/CrmPage.module.css
#### [MODIFY] frontend/src/pages/crm/CrmPage.tsx

#### [NEW] frontend/src/pages/lockers/LockersPage.module.css
#### [MODIFY] frontend/src/pages/lockers/LockersPage.tsx

#### [NEW] frontend/src/pages/settlements/SettlementsPage.module.css
#### [MODIFY] frontend/src/pages/settlements/SettlementsPage.tsx

- Note: If we find `placeholder-*` classes used uniformly across these, we will consider creating a `workspace.module.css` or keeping them clearly marked as shared workspace primitives.

## Verification Plan

### Automated Tests
- Run existing frontend tests: `cd frontend && npm test` to ensure that standard JSX/TSX rendering is not broken by `className` updates.
- Check the Vite development build output (`cd frontend && npm run build`) for CSS syntax or resolving errors in the new modules.

### Manual Verification
1. Open the Vite dev server (`cd frontend && npm run dev`) and visually inspect the **Login** and **Dashboard** states. Check both logged-out state (navigating to login) and logged-in state.
2. Navigate to **Access**, **Reservations**, and **Products**. Specifically verify the structural integrity of dense tables, split panes, and summary cards.
3. Test a narrow viewport on the **Reservations** and **Dashboard** pages to ensure mobile/responsive breakpoints defined within the CSS Modules continue to function as expected.
4. Verify that elements that purposely rely on shared globals (e.g., standard `.primary-button` inside a `.panel-card`) still inherit styling properly despite their parent's layout originating from a `*.module.css` file.
