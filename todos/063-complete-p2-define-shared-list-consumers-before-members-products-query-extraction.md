---
status: complete
priority: p2
issue_id: "063"
tags: [code-review, frontend, react, architecture, quality]
dependencies: []
---

# Define shared list consumers before members/products query extraction

## Problem Statement

The plan extracts `members` and `products` into query hooks, but it does not define how existing cross-workspace consumers keep reading those lists. Access, lockers, dashboard counts, direct-entry flows, and member/product management screens already share these datasets today. Without an explicit ownership contract, the refactor can create duplicate list stores or leave some surfaces subscribed to stale app-level arrays while others move to hook-managed data.

## Findings

- Phase 2 lists `members` and `products` as first-wave query extraction targets but does not say whether they remain app-shared lists or become feature-local hook state.
- The plan also keeps `selectedMember`, auth session, and nav section in `App.tsx`, which implies shared consumers still exist at the top level.
- Existing code already has non-member/product workspaces that consume the `members` list indirectly (`access`, `lockers`, dashboard counts), so this is not a purely local extraction.

## Proposed Solutions

### Option 1: Keep `members/products` as app-shared query hooks

**Approach:** Create `useMembersQuery()` and `useProductsQuery()` at the top level, and pass results to all current consumers while removing inline fetch logic from `App.tsx`.

**Pros:**
- Preserves current shared-consumer contract
- Minimizes duplicate caches and conflicting invalidation paths

**Cons:**
- `App.tsx` still owns some cross-workspace wiring
- Less aggressive extraction than a fully feature-local design

**Effort:** 2-4 hours

**Risk:** Medium

---

### Option 2: Split app-shared list hooks from feature-local derivative hooks

**Approach:** Keep canonical app-shared members/products queries at the top level, and let feature-local hooks derive filtered/secondary data from them.

**Pros:**
- Clear ownership boundary
- Compatible with current cross-workspace consumers

**Cons:**
- Slightly more hook surface area
- Requires documenting derivation rules carefully

**Effort:** 3-5 hours

**Risk:** Medium

## Recommended Action

**To be filled during triage.**

## Technical Details

**Affected files:**
- `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-09-refactor-frontend-bundle-boundaries-query-and-auth-lifecycle-plan.md:155`
- `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-09-refactor-frontend-bundle-boundaries-query-and-auth-lifecycle-plan.md:176`
- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`

**Related components:**
- access workspace
- locker workspace
- dashboard counts
- members/products management screens

**Database changes:**
- No

## Resources

- **Plan:** `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-09-refactor-frontend-bundle-boundaries-query-and-auth-lifecycle-plan.md`
- **Related note:** `/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-09-frontend-query-layer-decision.md`

## Acceptance Criteria

- [ ] The plan explicitly defines whether `members/products` remain app-shared queries or move to feature-local ownership
- [ ] All current consumers of `members/products` are enumerated or grouped by contract
- [ ] Invalidation/reload behavior after mutations is defined for shared consumers

## Work Log

### 2026-03-09 - Initial Discovery

**By:** Codex

**Actions:**
- Reviewed the query ownership phase of the plan
- Compared proposed extraction targets with current cross-workspace consumers
- Identified a missing shared ownership contract for `members/products`

**Learnings:**
- The current app still depends on shared top-level list data even after workspace-local state extraction

### 2026-03-09 - Resolution

**By:** Codex

**Actions:**
- Updated the plan to define `members/products` as app-shared canonical queries in the first extraction wave
- Added explicit consumer groups and invalidation ownership for shared list data
- Extended acceptance criteria and quality gates to cover same-source shared-query validation
