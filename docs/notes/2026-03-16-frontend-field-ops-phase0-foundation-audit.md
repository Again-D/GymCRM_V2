# 2026-03-16 Frontend Field Ops Phase 0 Foundation Audit

## Scope

- Theme foundation re-check and contract restoration
- Shared modal contract hardening
- Shared token and primitive ownership tightening
- Shell/tablet breakpoint baseline refinement

## What Was Completed

### Theme Foundation

- Restored the canonical persisted preference key in [`frontend/src/app/theme.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/app/theme.tsx) to `gymcrm.themePreference`.
- Added legacy-key migration support for the temporary `gymcrm-theme-preference` key.
- Added `initializeThemeOnDocument()` in [`frontend/src/main.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/main.tsx) so `data-theme` is set before the first visible React paint.
- Added dedicated regression tests in [`frontend/src/app/theme.test.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/app/theme.test.tsx).

### Modal Contract

- Hardened [`frontend/src/shared/ui/Modal.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/shared/ui/Modal.tsx) to:
  - remove the invalid hidden wrapper pattern
  - use unique dialog label IDs
  - trap focus inside the modal
  - restore focus to the trigger on close
  - preserve pre-existing `body.style.overflow` on cleanup
- Added focused coverage in [`frontend/src/shared/ui/Modal.test.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/shared/ui/Modal.test.tsx).

### Token / Primitive Tightening

- Expanded shared semantic token coverage in [`frontend/src/index.css`](/Users/abc/projects/GymCRM_V2/frontend/src/index.css):
  - surface-muted token
  - focus ring token
  - radius / spacing primitives
  - shell width token
- Added shared focus-visible treatment for button/link/input/select/textarea.
- Added `field-ops-note` primitives for restricted/info surfaces that can be reused in phase 1 and phase 2.

### Shell / Breakpoint Baseline

- Replaced a few shell-local inline styles in [`frontend/src/components/layout/DashboardLayout.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/components/layout/DashboardLayout.tsx) with module-owned selectors in [`frontend/src/components/layout/DashboardLayout.module.css`](/Users/abc/projects/GymCRM_V2/frontend/src/components/layout/DashboardLayout.module.css).
- Added shell main-area compression rules for narrower tablet widths.
- Added a global members/workspace single-column fallback at `max-width: 1200px` to establish the first tablet breakpoint contract.

## Ownership Snapshot

### `index.css` should own

- semantic color, spacing, radius, shadow tokens
- shared primitives:
  - buttons
  - pills
  - tables
  - filter grids
  - form inputs
  - utility stacks/margins already in shared use
- shared feedback surfaces:
  - `error-text`
  - `field-ops-note*`

### `*.module.css` should own

- shell-local layout and nav presentation
- page-only density, rhythm, and responsive compression
- modal visual details specific to the modal primitive
- workspace-specific arrangements and polish

## Validation Matrix Baseline

Current validated via automated checks:

- Theme persistence and first-paint bootstrap
- Shared modal accessibility basics
- Existing frontend regression suite
- Production build

Still pending for Gate A / browser validation:

- desktop light screenshot baseline
- desktop dark screenshot baseline
- tablet light screenshot baseline
- representative modal overlay screenshots in both themes

## Gate A Status

### Completed

- theme foundation audit complete
- modal accessibility contract implemented in shared primitive
- token ownership partially tightened
- supporting docs updated

### Remaining

- baseline browser artifacts capture
- explicit representative modal IA sketch
- final token ownership review after first representative surface pass

## Commands Run

```bash
cd /Users/abc/projects/GymCRM_V2/frontend && npm test
cd /Users/abc/projects/GymCRM_V2/frontend && npm run build
```

## Result

- `31` test files passed
- `87` tests passed
- production build passed

## Next Suggested Step

- Move into Phase 1 representative surfaces:
  - `DashboardLayout`
  - `Login`
  - `Members`
  - `Memberships`
  - `Reservations`

- While doing so, capture the browser artifact baseline that is still missing for Gate A.
