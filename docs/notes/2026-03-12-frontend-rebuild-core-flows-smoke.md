# 2026-03-12 frontend rebuild core flows smoke

## Environment
- worktree: `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1`
- prototype app: `frontend-rebuild`
- dev server: `VITE_REBUILD_MOCK_DATA=1 npm run dev`
- actual dev URL during smoke: `http://localhost:5176`
- browser tool: `agent-browser`

## Desktop smoke
### Covered flow
1. `/members` direct entry
2. member selection from members list
3. handoff to `/memberships`
4. handoff to `/reservations`
5. reservation create surface visibility and action buttons visibility

### Result
- pass

### Observations
- `selectedMember` handoff stayed intact when moving from `/members` to `/memberships` to `/reservations`.
- `/memberships` renders purchase form, selected-member memberships list, and hold/resume/refund action surface in the rebuilt structure.
- `/reservations` renders reservation target list, selected-member reservation form, selected-member reservation list, and schedule list in one flow.

## Mobile smoke
### Viewport
- iPhone 14 Pro Max equivalent: `430 x 932`

### Covered flow
1. `/members` full-page mobile rendering
2. `/reservations` full-page mobile rendering
3. pagination controls and filter blocks visibility
4. no clipped shell navigation or broken table shell containment

### Result
- pass

### Observations
- `/members` mobile layout stacked vertically and stayed navigable without clipped pagination controls.
- `/reservations` direct entry correctly fell back to target selection state on mobile.
- page controls remained visible and scrollable within the viewport.

## Evidence
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/testing/artifacts/rebuild-prototype-members-full-smoke.png`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/testing/artifacts/rebuild-prototype-memberships-full-smoke.png`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/testing/artifacts/rebuild-prototype-reservations-full-smoke.png`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/testing/artifacts/rebuild-prototype-members-mobile-smoke.png`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/testing/artifacts/rebuild-prototype-reservations-mobile-smoke.png`

## Remaining gap after smoke
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/plans/2026-03-12-refactor-frontend-rebuild-in-worktree-plan.md`의 남은 큰 항목은 `새 구조의 설명 문서가 실제 디렉터리와 맞는다.` 뿐이다.
