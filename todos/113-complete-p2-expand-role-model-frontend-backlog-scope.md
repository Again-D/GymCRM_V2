---
status: complete
priority: p2
issue_id: "113"
tags: [code-review, frontend, documentation, auth, architecture]
dependencies: []
---

# Expand frontend role-model backlog scope beyond auth bootstrap and routes

## Problem Statement

The frontend follow-up backlog for the role-model migration understates the actual scope of single-role assumptions in the UI. As written, it mainly calls out `auth.tsx`, `routes.ts`, admin account UI, and payload parity, which makes the follow-up look much smaller than it is. If someone executes only those listed items, the app will still contain many direct `authUser.role` comparisons and role-based reset behaviors spread across feature modules.

## Findings

- The backlog items in [2026-03-23-role-model-frontend-follow-up-backlog.md](/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-23-role-model-frontend-follow-up-backlog.md#L13) only mention a few central files.
- Actual role checks are distributed across multiple feature pages and modules, including:
  - [App.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx#L28)
  - [TrainersPage.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/pages/trainers/TrainersPage.tsx#L29)
  - [ProductsPage.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/pages/products/ProductsPage.tsx#L55)
  - [LockersPage.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/pages/lockers/LockersPage.tsx#L69)
  - [CrmPage.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/pages/crm/CrmPage.tsx#L50)
  - [AccessPage.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/pages/access/AccessPage.tsx#L77)
  - [useMemberManagementState.ts](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/modules/useMemberManagementState.ts#L74)
  - [SelectedMemberContext.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/modules/SelectedMemberContext.tsx#L76)
  - [trainerScope.ts](/Users/abc/projects/GymCRM_V2/frontend/src/pages/member-context/modules/trainerScope.ts#L9)
- Impact: this backlog can mislead the next implementer into updating shared auth plumbing but missing page-level authorization semantics, trainer-scoped member access, and auth-identity reset behavior.

## Proposed Solutions

### Option 1: Expand this backlog note into a fuller implementation inventory

**Approach:** Add a dedicated section listing all known frontend modules with direct role branching, grouped by concern: route guards, page capabilities, trainer/member scoping, selected-member reset logic, and test harnesses.

**Pros:**
- Keeps the current note useful as the handoff artifact for the deferred work.
- Reduces under-scoping risk for the next implementation pass.
- Makes follow-up estimation more realistic.

**Cons:**
- Requires auditing and periodically updating the list as frontend code changes.

**Effort:** 30-60 minutes

**Risk:** Low

---

### Option 2: Replace this note with a dedicated frontend follow-up plan

**Approach:** Keep the note short, but add a linked plan document for the full frontend role-model transition with explicit workstreams and affected files.

**Pros:**
- Better fit if the deferred work is large enough to deserve its own plan.
- Allows acceptance criteria and sequencing.

**Cons:**
- More process overhead than a simple backlog note.
- Requires a second artifact to stay in sync.

**Effort:** 1-2 hours

**Risk:** Low

## Recommended Action

Implemented Option 1. The backlog note now inventories known role-dependent frontend modules and groups the deferred work into explicit workstreams so the follow-up cannot be mistaken for an auth-plumbing-only change.

## Technical Details

**Affected files:**
- [2026-03-23-role-model-frontend-follow-up-backlog.md](/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-23-role-model-frontend-follow-up-backlog.md#L13)

**Related components:**
- Auth bootstrap and runtime preset handling
- Route/sidebar visibility checks
- Page-level capability gating
- Member-context trainer scoping and selected-member reset semantics
- Frontend auth/mock tests

**Database changes (if any):**
- No

## Resources

- **Commit context:** `c9a35a6`

## Acceptance Criteria

- [x] The backlog note explicitly mentions that role-dependent logic exists beyond `auth.tsx` and `routes.ts`
- [x] Known page/module-level role checks are inventoried or linked
- [x] The note makes it hard to mistake the follow-up as a small auth-plumbing-only task

## Work Log

### 2026-03-23 - Document Review Finding Capture

**By:** Codex

**Actions:**
- Reviewed the frontend role-model follow-up note against the current frontend codebase
- Compared the backlog bullets with real `authUser.role` call sites across pages, context providers, and route guards
- Identified scope under-documentation that could lead to partial follow-up implementation

**Learnings:**
- The deferred frontend work is materially broader than the current note suggests
- Member-context and page-level gating are part of the migration surface, not just auth bootstrap

### 2026-03-23 - Backlog Scope Expanded

**By:** Codex

**Actions:**
- Updated [2026-03-23-role-model-frontend-follow-up-backlog.md](/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-23-role-model-frontend-follow-up-backlog.md) to include shared auth/navigation, page-level capability gates, member-context logic, and test inventory
- Added explicit follow-up workstreams so later planning can estimate the frontend migration in slices instead of treating it as a small auth patch

**Learnings:**
- The note is now usable as a real handoff artifact for the deferred frontend role-model work

## Notes

- This is a documentation-scoping issue, not a current runtime bug.
