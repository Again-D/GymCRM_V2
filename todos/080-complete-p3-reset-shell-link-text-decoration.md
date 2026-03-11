---
status: complete
priority: p3
issue_id: "080"
tags: [code-review, frontend, quality, ux]
dependencies: []
---

# Reset shell link text decoration

## Problem Statement

`/Users/abc/projects/GymCRM_V2/frontend/src/components/layout/SidebarNav.tsx` and `/Users/abc/projects/GymCRM_V2/frontend/src/features/dashboard/DashboardSection.tsx` were converted from `button` navigation to `NavLink`/`Link`. The shell styles still treat these elements like button surfaces, but they never reset the browser's default anchor underline styling. As a result, sidebar labels and dashboard quick actions can render with underlines that were not part of the original visual design.

## Findings

- `SidebarNav` now renders `NavLink` elements with `className="sidebar-tab"`.
- `DashboardSection` now renders `Link` elements with `className="secondary-button"`.
- `/Users/abc/projects/GymCRM_V2/frontend/src/styles.css:414` defines `.sidebar-tab` visual styles but does not set `text-decoration: none`.
- `/Users/abc/projects/GymCRM_V2/frontend/src/styles.css:824` and `/Users/abc/projects/GymCRM_V2/frontend/src/styles.css:854` define `.secondary-button` styles but also do not set `text-decoration: none`.
- There is no global `a { text-decoration: none; }` reset in the frontend stylesheet, so these link-based navigation surfaces inherit the browser underline.

## Proposed Solutions

### Option 1: Add explicit link reset to shell surface classes

**Approach:** Add `text-decoration: none;` to `.sidebar-tab` and `.secondary-button`, and preserve that reset on hover/active states if needed.

**Pros:**
- Smallest change
- Targets only the components that intentionally look like buttons/cards
- Preserves normal link styling elsewhere

**Cons:**
- Requires remembering the same reset for future link-like button surfaces

**Effort:** 10-15 minutes

**Risk:** Low

---

### Option 2: Add a scoped reset for navigation/action link containers

**Approach:** Reset anchor styling inside sidebar/dashboard navigation containers, for example `.sidebar-nav a` and `.quick-actions-grid a`.

**Pros:**
- Covers current navigation surfaces with fewer repeated declarations
- Makes route-link migration less fragile inside those containers

**Cons:**
- Slightly broader scope
- Easier to affect future links unintentionally inside the same containers

**Effort:** 10-20 minutes

**Risk:** Low

## Recommended Action

Add `text-decoration: none;` to the shell link surface classes so route-based navigation keeps the previous button-like presentation without changing global anchor behavior.


## Technical Details

**Affected files:**
- `/Users/abc/projects/GymCRM_V2/frontend/src/components/layout/SidebarNav.tsx`
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/dashboard/DashboardSection.tsx`
- `/Users/abc/projects/GymCRM_V2/frontend/src/styles.css:414`
- `/Users/abc/projects/GymCRM_V2/frontend/src/styles.css:824`

**Related components:**
- `/Users/abc/projects/GymCRM_V2/frontend/src/app/routes.tsx`
- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`

**Database changes (if any):**
- Migration needed? No
- New columns/tables? None

## Resources

- **Merged PR:** [#72](https://github.com/Again-D/GymCRM_V2/pull/72)
- **Sidebar component:** `/Users/abc/projects/GymCRM_V2/frontend/src/components/layout/SidebarNav.tsx`
- **Dashboard quick actions:** `/Users/abc/projects/GymCRM_V2/frontend/src/features/dashboard/DashboardSection.tsx`

## Acceptance Criteria

- [x] Sidebar navigation labels no longer render with default link underlines
- [x] Dashboard quick action links no longer render with default link underlines
- [x] Regular links outside these shell surfaces keep their intended styling
- [x] `/Users/abc/projects/GymCRM_V2/frontend && npm run build` passes

## Work Log

### 2026-03-11 - Initial Discovery

**By:** Codex

**Actions:**
- Reviewed the merged shell-only routing change after a visual regression report about underlined sidebar text
- Confirmed `SidebarNav` now uses `NavLink` and `DashboardSection` uses `Link`
- Compared the route-link components with current shell styles and found no `text-decoration` reset on `.sidebar-tab` or `.secondary-button`

**Learnings:**
- The regression is not in routing logic itself; it is a styling gap introduced by replacing button surfaces with anchor elements
- The safest fix is a class-level reset instead of a global anchor reset

## Notes

- This is a UI polish regression, not a functional routing defect.


### 2026-03-11 - Resolution

**By:** Codex

**Actions:**
- Added `text-decoration: none` to `.sidebar-tab` and `.secondary-button` in `/Users/abc/projects/GymCRM_V2/frontend/src/styles.css`
- Rebuilt the frontend to confirm the route-link styling fix did not regress the shell build

**Learnings:**
- Button-to-link refactors need explicit anchor style resets when the visual contract stays button-like
