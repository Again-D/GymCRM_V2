---
status: complete
priority: p2
issue_id: "061"
tags: [code-review, frontend, react, architecture, performance]
dependencies: []
---

# Define shared preload ownership before loader hook split

## Problem Statement

The plan splits workspace initialization effects into per-workspace loader hooks, but it does not define ownership for shared preload data such as members and other cross-workspace lists. Without an explicit preload contract, the refactor can move logic out of `App.tsx` while still reintroducing duplicate fetches, inconsistent dedupe behavior, or confusing ownership between shared app state and workspace-local loader hooks.

## Findings

- The plan says each loader hook should receive `enabled`, shared identifiers, fetcher references, and error setters, but it does not define which data stays app-shared versus which hook is allowed to preload or cache shared lists.
- Evidence in the plan:
  - `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-09-refactor-react-workspace-orchestration-and-theme-lifecycle-plan.md:136`
  - `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-09-refactor-react-workspace-orchestration-and-theme-lifecycle-plan.md:163`
  - `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-09-refactor-react-workspace-orchestration-and-theme-lifecycle-plan.md:390`
- In the current app, `access` and `lockers` already rely on shared `members` preload behavior before their own workspace fetches. If the split happens without a clear shared preload rule, rapid tab changes can still cause redundant `loadMembers()` calls or ownership drift.
- This is especially relevant because the plan explicitly avoids a shared query layer for now, so the preload boundary needs to be stated more carefully.

## Proposed Solutions

### Option 1: Add a shared preload ownership section to the plan

**Approach:** Explicitly define which lists remain app-shared (`members`, `products`, other shared summaries) and which workspace loader hooks may only consume, not own, those fetches.

**Pros:**
- Clarifies architecture before implementation
- Avoids duplicated fetch logic in multiple hooks
- Keeps the no-SWR decision coherent

**Cons:**
- Requires slightly more detailed planning upfront

**Effort:** 20-30 minutes

**Risk:** Low

---

### Option 2: Add a dedicated preload coordinator hook

**Approach:** Introduce a lightweight shared preload helper in the plan, so workspace loader hooks call a single shared preload boundary instead of each deciding independently.

**Pros:**
- More explicit implementation path
- Better dedupe and ownership clarity

**Cons:**
- Slightly larger refactor scope
- May be unnecessary if the current shared preloads stay very small

**Effort:** 1-2 hours

**Risk:** Medium

---

### Option 3: De-scope shared preload users from Phase 1

**Approach:** Keep access/locker members preload in `App.tsx` for now and only extract strictly workspace-local loaders in the first pass.

**Pros:**
- Lowest implementation risk
- Preserves current preload semantics while still shrinking some effects

**Cons:**
- Leaves some orchestration in `App.tsx`
- Slower path to the target structure

**Effort:** 30-60 minutes planning adjustment

**Risk:** Low

## Recommended Action


## Technical Details

**Affected files:**
- `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-09-refactor-react-workspace-orchestration-and-theme-lifecycle-plan.md`
- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`

**Related components:**
- `frontend/src/features/access/useAccessWorkspaceState.ts`
- `frontend/src/features/lockers/useLockerWorkspaceState.ts`
- `frontend/src/shared/hooks/useWorkspaceMemberSearchLoader.ts`

**Database changes (if any):**
- Migration needed? No
- New columns/tables? None

## Resources

- **Plan under review:** `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-09-refactor-react-workspace-orchestration-and-theme-lifecycle-plan.md`
- **Related decision note:** `/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-09-frontend-query-layer-decision.md`
- **Recent state ownership note:** `/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-09-product-locker-crm-settlement-state-ownership-validation.md`

## Acceptance Criteria

- [ ] The plan explicitly states which data remains app-shared preload state versus workspace-local loader state
- [ ] Shared preload users (at minimum `members`) have a dedupe/ownership rule before the loader split starts
- [ ] Phase ordering or scope is adjusted so access/locker preloads do not regress during extraction

## Work Log

### 2026-03-09 - Initial Discovery

**By:** Codex

**Actions:**
- Reviewed the loader-hook extraction phase for architecture drift risks
- Cross-checked the plan against the existing access/locker preload pattern in `App.tsx`
- Identified missing ownership rules for shared preload data during hook extraction

**Learnings:**
- State ownership split is mostly complete, but shared preload ownership is a separate architectural concern
- Avoiding SWR app-wide makes the preload boundary more important, not less

## Notes

- This finding is about architectural ambiguity in the plan.
- If unresolved, implementation will likely make an ad hoc decision during extraction and encode it in code rather than in the plan.
