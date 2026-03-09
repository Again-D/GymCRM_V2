---
status: complete
priority: p2
issue_id: "064"
tags: [code-review, frontend, react, architecture, quality]
dependencies: []
---

# Specify protected UI reset ownership in auth hook refactor

## Problem Statement

The auth hook phase says `useAuthSession` should own bootstrap, refresh, logout, unauthorized cleanup, and `configureApiAuth` wiring, but it does not define who triggers the existing protected UI reset when auth state is cleared. That reset currently touches workspace-local bundles outside the auth surface. Without an explicit callback/ownership contract, the implementation can either duplicate reset logic inside the auth hook or accidentally drop the current logout/401 cleanup behavior.

## Findings

- Phase 3 includes `unauthorized reset behavior` in scope, but the hook API example does not include any reset callback or boundary to the rest of the app.
- The plan says `App.tsx` should only compose auth results, which leaves it unclear whether protected UI reset stays in `App.tsx` or moves into the hook.
- Previous lifecycle refactors depended on preserving logout-driven reset behavior across workspace-local hooks, so this ambiguity is likely to cause implementation drift.

## Proposed Solutions

### Option 1: Keep reset ownership in `App.tsx` via auth hook callbacks

**Approach:** `useAuthSession` accepts callbacks such as `onUnauthorized` / `onLogoutComplete`, and `App.tsx` continues to own protected UI reset.

**Pros:**
- Preserves current workspace reset boundary
- Avoids coupling auth hook to workspace internals

**Cons:**
- Hook API is slightly broader
- Requires documenting callback timing clearly

**Effort:** 1-3 hours

**Risk:** Low

---

### Option 2: Create a separate protected-ui reset coordinator hook

**Approach:** Keep auth state in `useAuthSession`, and let a second top-level hook observe auth transitions and run protected UI reset.

**Pros:**
- Clear separation between auth and workspace reset concerns
- Easier to test auth transitions independently

**Cons:**
- Adds another orchestration layer
- More moving parts for a relatively small boundary

**Effort:** 3-4 hours

**Risk:** Medium

## Recommended Action

**To be filled during triage.**

## Technical Details

**Affected files:**
- `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-09-refactor-frontend-bundle-boundaries-query-and-auth-lifecycle-plan.md:201`
- `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-09-refactor-frontend-bundle-boundaries-query-and-auth-lifecycle-plan.md:232`
- `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-09-refactor-frontend-bundle-boundaries-query-and-auth-lifecycle-plan.md:317`
- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`

**Related components:**
- auth bootstrap/login/logout
- protected UI reset path
- workspace-local reset helpers

**Database changes:**
- No

## Resources

- **Plan:** `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-09-refactor-frontend-bundle-boundaries-query-and-auth-lifecycle-plan.md`
- **Related note:** `/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-09-react-workspace-lifecycle-validation.md`

## Acceptance Criteria

- [ ] The plan explicitly states who owns protected UI reset after auth state clears
- [ ] The `useAuthSession` API or adjacent coordinator boundary is documented
- [ ] Logout and unauthorized flows preserve the current workspace reset contract

## Work Log

### 2026-03-09 - Initial Discovery

**By:** Codex

**Actions:**
- Reviewed Phase 3 auth lifecycle extraction scope and API sketch
- Compared it to the existing protected UI reset contract
- Identified missing ownership definition for logout/unauthorized cleanup

**Learnings:**
- Auth extraction is safe only if the reset boundary remains explicit; otherwise the hook starts leaking workspace concerns or drops current behavior

### 2026-03-09 - Resolution

**By:** Codex

**Actions:**
- Updated the plan to keep protected UI reset ownership outside `useAuthSession`
- Added callback-boundary guidance (`onUnauthorized` / `onLogoutComplete`) so auth hook and workspace reset concerns stay separated
- Extended acceptance criteria and quality gates to require parity between logout and unauthorized reset behavior
