---
status: complete
priority: p2
issue_id: "062"
tags: [code-review, frontend, react, quality, race-conditions]
dependencies: []
---

# Guard workspace loader success paths from stale responses

## Problem Statement

The new workspace loader hooks in PR #60 cancel only their error handlers. Successful async responses still flow into the underlying loaders, which mutate React state after tab switches, logout-driven protected resets, or rapid member changes. That leaves a regression window where stale access, locker, settlement, or CRM data can repopulate cleared workspace state after the user has already moved on.

## Findings

- `useAccessWorkspaceLoader` and `useLockerWorkspaceLoader` use a `cancelled` flag, but only to suppress `onError`; they still await async loaders whose success paths update state unconditionally.
- `reloadAccessData()` writes `accessPresence` and `accessEvents` after awaiting API calls with no request token or cancellation guard.
- `loadLockerSlots()` and related loaders follow the same pattern: they set loading flags, await network work, then commit data regardless of whether the triggering effect was already torn down.
- The plan and review context explicitly prioritized stale-response handling during loader extraction, so leaving success-path writes unguarded undermines the refactor’s main safety goal.

## Proposed Solutions

### Option 1: Add request-token guards inside each mutable loader

**Approach:** Introduce per-workspace request ids in `App.tsx` (or workspace hooks) and ignore late successes/finalizers when the token is no longer current.

**Pros:**
- Directly protects the actual state writes
- Covers both effect cleanup and overlapping manual refreshes

**Cons:**
- Repeats token logic across several loaders
- Slightly increases local complexity in `App.tsx`

**Effort:** 2-4 hours

**Risk:** Medium

---

### Option 2: Move async state writes fully into workspace loader hooks

**Approach:** Have loader hooks own the async orchestration and commit state only after checking an active request token/cancel flag, instead of delegating to opaque loaders that mutate state internally.

**Pros:**
- Matches the new ownership direction of PR #60
- Keeps lifecycle and stale-guard logic together

**Cons:**
- Larger refactor surface
- Requires threading setters or dispatch helpers into hooks

**Effort:** 4-6 hours

**Risk:** Medium

## Recommended Action

**To be filled during triage.**

## Technical Details

**Affected files:**
- `/Users/abc/projects/GymCRM_V2/frontend/src/shared/hooks/useWorkspaceLoaders.ts:80`
- `/Users/abc/projects/GymCRM_V2/frontend/src/shared/hooks/useWorkspaceLoaders.ts:118`
- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx:882`
- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx:907`
- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx:912`

**Related components:**
- Access workspace initialization
- Locker workspace initialization
- Settlement / CRM initialization paths if they need the same guard pattern

**Database changes:**
- No

## Resources

- **PR:** #60
- **Review context:** `/Users/abc/projects/GymCRM_V2/compound-engineering.local.md`
- **Plan:** `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-09-refactor-react-workspace-orchestration-and-theme-lifecycle-plan.md`

## Acceptance Criteria

- [ ] Workspace loader success paths ignore late responses after effect cleanup or newer requests
- [ ] Protected reset/logout does not get repopulated by stale access/locker/settlement/CRM responses
- [ ] Tests or targeted validation cover at least one overlapping request scenario
- [ ] `cd /Users/abc/projects/GymCRM_V2/frontend && npm test` passes
- [ ] `cd /Users/abc/projects/GymCRM_V2/frontend && npm run build` passes

## Work Log

### 2026-03-09 - Initial Discovery

**By:** Codex

**Actions:**
- Reviewed PR #60 after extracting workspace loader hooks from `App.tsx`
- Compared hook cancellation behavior with the underlying loader success paths
- Identified that cleanup only suppresses error reporting, not stale success commits

**Learnings:**
- The refactor improved effect ownership, but lifecycle safety is incomplete until state writes themselves are fenced
- Access and locker paths are the clearest overlap risk because they combine shared preload and multi-request refresh flows

## Notes

- Do not treat `docs/plans/` artifacts as cleanup targets.

### 2026-03-09 - Resolution

**By:** Codex

**Actions:**
- Passed a cleanup-aware commit guard from workspace loader hooks into reservation/access/locker/settlement/CRM loaders
- Updated loader success, error, and finalizer paths to skip stale state writes when the originating effect is no longer current
- Added `useWorkspaceLoaders` test coverage for guard invalidation on cleanup

**Learnings:**
- Effect-level cancellation is insufficient when the async function being called owns the actual state writes
- Passing an explicit commit guard keeps the current refactor shape while fencing late responses
