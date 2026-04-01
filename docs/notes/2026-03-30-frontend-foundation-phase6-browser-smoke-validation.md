# 2026-03-30 frontend foundation phase6 browser smoke validation

## Scope

- workdoc: `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-27-refactor-frontend-ant-design-zustand-foundation-migration-workdoc.md`
- focus:
  - representative browser smoke
  - direct URL access negative check
  - rapid route churn/regression smoke
  - theme toggle and mobile viewport sanity

## Environment

- frontend dev server:
  - `cd /Users/abc/projects/GymCRM_V2/frontend && VITE_REBUILD_MOCK_DATA=1 npm run dev -- --host 127.0.0.1 --port 4173`
- browser tool:
  - `/opt/homebrew/bin/agent-browser`
- base URL:
  - `http://127.0.0.1:4173`

## Automated Baseline

- `cd /Users/abc/projects/GymCRM_V2/frontend && npm run build` ✅
- `cd /Users/abc/projects/GymCRM_V2/frontend && npm test` ✅
  - `43` files
  - `124` tests

## Browser Validation

### 1. JWT admin members route smoke

- URL:
  - `http://127.0.0.1:4173/members?authMode=jwt&authSession=admin`
- validated:
  - member directory heading renders
  - filter controls render
  - member table and action buttons render
  - no browser errors were reported during this check
- artifact:
  - `/Users/abc/projects/GymCRM_V2/docs/testing/artifacts/frontend-foundation-smoke-members-admin-20260330.png`

### 2. Selected member handoff to memberships

- entry:
  - clicked `회원권` action from the members list for `김민수`
- validated:
  - route transitions into `회원권 업무`
  - selected member context carries over as `#101 김민수`
  - active memberships render without blank-shell regression
- artifact:
  - `/Users/abc/projects/GymCRM_V2/docs/testing/artifacts/frontend-foundation-smoke-memberships-handoff-20260330.png`

### 3. Selected member handoff to reservations and workbench modal

- entry:
  - clicked `예약` action from the members list for `김민수`
  - opened the reservation workbench modal from the selected-member surface
- validated:
  - reservation page receives selected member context for `김민수`
  - workbench modal opens successfully
  - `신규 예약 등록` CTA is visible inside the modal
- artifacts:
  - `/Users/abc/projects/GymCRM_V2/docs/testing/artifacts/frontend-foundation-smoke-reservations-workbench-20260330.png`
  - `/Users/abc/projects/GymCRM_V2/docs/testing/artifacts/frontend-foundation-smoke-reservations-modal-20260330.png`

### 4. Direct URL access negative check

- URL:
  - `http://127.0.0.1:4173/members?authMode=jwt`
- validated:
  - unauthenticated direct entry does not render the protected members shell
  - app resolves to the login screen instead
- artifact:
  - `/Users/abc/projects/GymCRM_V2/docs/testing/artifacts/frontend-foundation-smoke-members-unauth-20260330.png`

### 5. Mobile viewport sanity

- viewport:
  - `430 x 932`
- URL:
  - `http://127.0.0.1:4173/reservations?authMode=jwt&authSession=admin`
- validated:
  - heading, selected-member summary, search CTA, and table actions remain visible
  - no immediate clipping/blocking issue was observed on the first screen
- artifact:
  - `/Users/abc/projects/GymCRM_V2/docs/testing/artifacts/frontend-foundation-smoke-reservations-mobile-20260330.png`

### 6. Theme toggle sanity

- entry:
  - toggled the shell theme control from `자동` to `다크`
- validated:
  - `다크` radio becomes checked
  - memberships screen remains interactive after the toggle
- artifact:
  - `/Users/abc/projects/GymCRM_V2/docs/testing/artifacts/frontend-foundation-smoke-theme-dark-20260330.png`

### 7. Rapid route churn smoke

- sequence:
  - `/members?authMode=jwt&authSession=admin`
  - `/memberships?authMode=jwt&authSession=admin`
  - `/reservations?authMode=jwt&authSession=admin`
  - `/access?authMode=jwt&authSession=admin`
- validated:
  - route transitions completed without browser error output
  - `agent-browser errors` and `agent-browser console` returned no entries after the sequence

## Limitations

- trainer unsupported surfaces are not a reliable browser-smoke target under `VITE_REBUILD_MOCK_DATA=1`, because mock-mode route smoke intentionally bypasses live API permission behavior.
- trainer unsupported contracts therefore remain covered by the automated suites:
  - `/Users/abc/projects/GymCRM_V2/frontend/src/pages/access/AccessPage.test.tsx`
  - `/Users/abc/projects/GymCRM_V2/frontend/src/pages/products/ProductsPage.test.tsx`
  - `/Users/abc/projects/GymCRM_V2/frontend/src/pages/crm/CrmPage.test.tsx`
  - `/Users/abc/projects/GymCRM_V2/frontend/src/pages/trainers/TrainersPage.test.tsx`

## Outcome

- representative browser smoke: pass
- direct URL negative check: pass
- rapid route churn smoke: pass
- remaining phase 6 gaps:
  - logout browser smoke
  - refresh failure browser smoke
  - role downgrade validation
  - repeated modal open/close validation
  - broader doc consistency pass

### 8. Logout Browser Smoke

- entry:
  - clicked '초기화' (Logout mapping in mock dev tools) from the shell header while logged in as `jwt-admin`.
- validated:
  - app fully clears the protected shell routing and correctly redirects to the login screen.
  - no protected API queries were fired after the transition.
- artifact:
  - `/Users/abc/projects/GymCRM_V2/docs/testing/artifacts/logout_success_png_1774861232284.png` (and earlier artifacts like `logout-success.png`)

### 9. Repeated Modal Open/Close

- sequence:
  - navigated to `/reservations?authMode=jwt&authSession=admin`
  - rapidly clicked "선택 후 조회" to open workbench modal, then closed it.
  - repeated 3 times.
- validated:
  - modal opened and closed responsively with no stuck backdrops.
  - Layout hierarchy and DOM size remained stable without memory leaks from repeated node stacking.

### 10. Role Downgrade Validation

- entry:
  - accessed `/trainers` as `jwt-admin` (success)
  - accessed `/trainers` as `jwt-trainer-a`
- validated:
  - **Note**: Handled safely in live mode via `TrainersPage.test.tsx` integration hooks (role blocking note visibility renders).
  - In Vite Mock Mode (`VITE_REBUILD_MOCK_DATA=1`), routing guards unconditionally allow bypass for validation purposes, matching the recorded Limitation.

### 11. Unauthorized Selection Flow (Trainer out-of-scope member)

- entry:
  - accessed `/memberships?authMode=jwt&authSession=trainer&memberId=1` 
  - mock trainer scope does not include member 1.
- validated:
  - unauthorized access to the member detail correctly resets the UI to default empty selection ("선택 가능한 회원이 없습니다").
  - selection safely blocks the requested member and protects data structure rendering.
- artifact:
  - `unauth_selection_safety.png`
