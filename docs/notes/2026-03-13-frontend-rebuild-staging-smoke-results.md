# Frontend Rebuild Local Staging-Profile Smoke Results

Date: 2026-03-13

## Purpose

이 문서는 rebuild frontend의 local staging-profile smoke 실행 결과를 기록하는 자리다.

아직 실행 전이라면 이 문서는 checklist-driven run sheet 역할을 하고,
실행 후에는 cutover 논의를 위한 evidence note가 된다.

## Environment

- rebuild local URL: `http://127.0.0.1:5173`
- baseline local URL: not run side-by-side in final smoke; baseline reference taken from prior local live evidence and parity diff notes because rebuild had to occupy the backend-allowed dev origin (`5173`)
- backend target: `http://127.0.0.1:8080` with `SPRING_PROFILES_ACTIVE=staging`, `APP_SECURITY_MODE=jwt`, `APP_PROTOTYPE_NO_AUTH_ENABLED=false`
- auth mode: live JWT
- browser: agent-browser / Chromium desktop
- mobile viewport: `430 x 932` (iPhone 14 Pro Max equivalent)

## Role Matrix Results

| Role | Route | Result | Notes | Evidence |
|---|---|---|---|---|
| logged-out | `/members` | pass | direct-entry redirects to `/login` | `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/testing/artifacts/rebuild-local-staging-admin-dashboard.png` |
| admin | `/members` | pass | login succeeds; member summary list, filters, pagination render with live data | `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/testing/artifacts/rebuild-local-staging-members.png` |
| admin | `/memberships` | pass | selected member handoff works; memberships page reads live products and memberships | `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/testing/artifacts/rebuild-local-staging-memberships.png` |
| desk | `/access` | pass | global access page loads in live mode; presence/events/member search surface available | `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/testing/artifacts/rebuild-local-staging-desk-access.png` |
| trainer | `/access` | pass | unsupported state shown; live access surface intentionally blocked | `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/testing/artifacts/rebuild-local-staging-trainer-access.png` |
| trainer | `/reservations` | pass | route remains usable and target list/schedule surface loads | `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/testing/artifacts/rebuild-local-staging-trainer-reservations.png` |

## Workflow Results

### 1. 회원관리

- Result: pass
- Notes: `/members` loads with live member summary data, pagination is usable, and member selection still hands off correctly to downstream workflows.
- Evidence: `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/testing/artifacts/rebuild-local-staging-members.png`, `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/testing/artifacts/rebuild-local-staging-members-mobile.png`

### 2. 회원권 업무

- Result: pass
- Notes: selected member handoff from `/members` to `/memberships` works in live mode; product list is populated from shared live product data and write surface is available for admin.
- Evidence: `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/testing/artifacts/rebuild-local-staging-memberships.png`

### 3. 예약 관리

- Result: pass
- Notes: reservation targets, schedules, and selected-member reservation context load in live mode; trainer role can still enter `/reservations` as expected.
- Evidence: `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/testing/artifacts/rebuild-local-staging-trainer-reservations.png`, `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/testing/artifacts/rebuild-local-staging-reservations-mobile.png`

### 4. 출입 관리

- Result: pass
- Notes: `/access` now matches the baseline global workflow. Desk/admin can use the live surface; trainer gets an explicit unsupported state and stale member-search results do not leak across role changes.
- Evidence: `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/testing/artifacts/rebuild-local-staging-desk-access.png`, `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/testing/artifacts/rebuild-local-staging-trainer-access.png`, `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/testing/artifacts/rebuild-local-staging-access-mobile.png`

## Differences vs Baseline

- Difference: local smoke could not keep baseline and rebuild open side-by-side on separate dev ports because the local backend CORS allowlist effectively made `5173` the stable authenticated dev origin for this phase.
- Acceptable: yes, for local staging-profile smoke. The rebuild app is the primary target under evaluation, and baseline behavior is already captured in `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-core-workflow-parity-diff.md` plus earlier local-live evidence.
- Blocker: no. This is an execution constraint for local comparison, not a product workflow blocker.
- Evidence: `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-core-workflow-parity-diff.md`

## Blockers Found In Local Staging-Profile Smoke

| Severity | Workflow | Description | Repro | Evidence | Owner |
|---|---|---|---|---|---|
| medium | local smoke env | rebuild needs the backend-allowed dev origin (`5173`) for browser auth/session parity, so side-by-side baseline comparison is sequential rather than simultaneous | start rebuild on `5176` and browser login hits backend CORS 403; restart rebuild on `5173` and the same login succeeds | `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/testing/artifacts/rebuild-local-staging-admin-dashboard.png` | rebuild replacement-candidate phase 4 |

## Preliminary Recommendation

- `Proceed to controlled route subset evaluation`
- `Remain replacement candidate`
- `Pause and reduce blockers first`

Current selection:
- `Proceed to controlled route subset evaluation`

## Related References

- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-staging-smoke-checklist.md`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-live-api-blocker-log.md`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-migration-rollback-plan.md`
