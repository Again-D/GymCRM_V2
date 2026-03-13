---
status: complete
priority: p3
issue_id: "095"
tags: [code-review, frontend, styling, css, maintainability]
dependencies: []
---

# Extract repeated inline frontend styles into CSS classes

## Problem Statement

The frontend currently uses a mixed styling approach: shared visual primitives live in `frontend/src/index.css`, while many page-level spacing and layout rules are still authored inline in JSX. This is not causing a runtime defect today, but it spreads styling decisions across components, makes consistency reviews slower, and raises the cost of future visual refactors.

## Findings

- `frontend/src/index.css` already defines the main shared design language: buttons, cards, filter grids, tables, pills, pagination, and responsive breakpoints.
- There are 46 inline `style={{ ... }}` occurrences across 10 React files.
- The heaviest files are `frontend/src/components/layout/DashboardLayout.tsx` (12), `frontend/src/pages/Login.tsx` (7), `frontend/src/pages/lockers/LockersPage.tsx` (6), `frontend/src/pages/access/AccessPage.tsx` (5), and `frontend/src/pages/products/ProductsPage.tsx` (4).
- Several inline patterns are repeated enough to justify CSS extraction:
  - `marginBottom: 16` appears repeatedly on card wrappers in access, products, CRM, lockers, and settlements pages.
  - `display: "grid"` helper blocks appear repeatedly in dashboard, login, and shell layout code.
  - `gridColumn: "1 / -1"` repeats in form layouts in products and reservations.
  - auth message colors (`#2f6f5e`, `#a23d4b`) repeat between login and dashboard shell.
- Some inline styles are one-off and acceptable to keep unless the team wants a stricter “no inline style” rule, especially dynamic `NavLink` active styling in `DashboardLayout.tsx`.

## Proposed Solutions

### Option 1: Extract only repeated layout tokens and helpers

**Approach:** Move repeated spacing/layout/color patterns into named CSS classes such as `.stack-md`, `.card-spacer`, `.full-span`, `.status-message`, and `.auth-panel`.

**Pros:**
- Highest ROI.
- Small, low-risk refactor.
- Preserves current visual output while reducing duplication.

**Cons:**
- Leaves some one-off inline styles in place.

**Effort:** 2-4 hours

**Risk:** Low

---

### Option 2: Remove nearly all inline styles from page components

**Approach:** Create page-scoped or shared CSS classes for almost every inline declaration, including layout shell and login/dashboard-specific blocks.

**Pros:**
- Consistent styling model.
- Easier future theming and design cleanup.

**Cons:**
- More churn across many files.
- Some dynamic cases become slightly more verbose.

**Effort:** 4-8 hours

**Risk:** Low-Medium

---

### Option 3: Introduce a lightweight utility-class layer in `index.css`

**Approach:** Add a small set of reusable utility classes for spacing, stack/grid layout, full-span form rows, and semantic text colors, then replace repeated inline style blocks with those utilities.

**Pros:**
- Fastest path to lower duplication.
- Avoids creating many page-specific selectors.

**Cons:**
- Adds a utility convention the team must keep disciplined.
- Can drift into ad hoc class soup if overused.

**Effort:** 3-5 hours

**Risk:** Low

## Recommended Action

**To be filled during triage.**

## Technical Details

**Affected files:**
- `frontend/src/index.css`
- `frontend/src/components/layout/DashboardLayout.tsx`
- `frontend/src/pages/Login.tsx`
- `frontend/src/pages/Dashboard.tsx`
- `frontend/src/pages/access/AccessPage.tsx`
- `frontend/src/pages/products/ProductsPage.tsx`
- `frontend/src/pages/crm/CrmPage.tsx`
- `frontend/src/pages/lockers/LockersPage.tsx`
- `frontend/src/pages/settlements/SettlementsPage.tsx`
- `frontend/src/pages/reservations/ReservationsPage.tsx`
- `frontend/src/App.tsx`

**Related components:**
- Shared dashboard shell
- Login page
- Workspace cards and table sections
- Form layout sections

**Database changes (if any):**
- Migration needed? No

## Resources

- Style review run on 2026-03-13
- Global stylesheet: `frontend/src/index.css`

## Acceptance Criteria

- [ ] Repeated inline layout/spacing/color styles are replaced with CSS classes
- [ ] Current visual output remains unchanged on desktop and mobile breakpoints
- [ ] Dynamic-only cases are either kept intentionally or expressed with a clear class strategy
- [ ] Frontend smoke tests still pass after the refactor

## Work Log

### 2026-03-13 - Initial Review

**By:** Codex

**Actions:**
- Reviewed the frontend styling entrypoint and shared CSS usage
- Counted inline `style={{ ... }}` occurrences across the React app
- Identified repeated inline patterns versus one-off dynamic cases

**Learnings:**
- The app already has a usable shared CSS base, so this is a cleanup refactor rather than a styling-system rewrite
- Most of the extraction cost sits in shell/login/page layout helpers, not in component visual complexity

### 2026-03-13 - Resolution

**By:** Codex

**Actions:**
- Added shared shell, spacing, stack, feedback, full-span, and centered-screen classes to `frontend/src/index.css`
- Replaced repeated inline styles in the app shell, login, dashboard, access, products, CRM, lockers, settlements, reservations, and bootstrapping screen
- Converted the sidebar `NavLink` styling to class-based active state handling instead of inline style callbacks
- Re-ran `cd frontend && npm test`

**Learnings:**
- Most inline style cleanup value came from a small set of repeated spacing and grid patterns
- The dynamic navigation active state can still stay clean without inline styles by switching to className callbacks
