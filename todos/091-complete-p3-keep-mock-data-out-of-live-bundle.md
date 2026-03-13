---
status: complete
priority: p3
issue_id: "091"
tags: [code-review, frontend, performance, bundling, mock-data]
dependencies: []
---

# Keep mock data out of live bundle

## Problem Statement

Production builds still pull mock-data modules into the main frontend bundle because several live workspace hooks statically import helpers from `mockData.ts` and branch on `isMockApiMode()` at runtime. The build succeeds, but Vite reports that dynamic imports cannot split the module, so mock fixtures stay in the shipped bundle and add unnecessary code weight.

## Findings

- `npm run build` on 2026-03-13 emitted a Vite warning that `frontend/src/api/mockData.ts` is both dynamically and statically imported, so it will not move to a separate chunk.
- Static imports exist in:
  - `frontend/src/pages/products/modules/useProductPrototypeState.ts:4`
  - `frontend/src/pages/lockers/modules/useLockerPrototypeState.ts:4`
  - `frontend/src/pages/crm/modules/useCrmPrototypeState.ts:5`
  - `frontend/src/pages/reservations/modules/useSelectedMemberReservationsState.ts:4`
  - `frontend/src/pages/member-context/modules/useSelectedMemberMembershipsQuery.ts:4`
- `frontend/src/api/client.ts` and `frontend/src/pages/member-context/modules/trainerScope.ts` already use dynamic imports, so the current mix defeats chunk splitting.

## Proposed Solutions

### Option 1: Convert mock-only helpers to lazy imports

**Approach:** Move mock-data access behind `await import("../../../api/mockData")` inside the mock-only branches for each workspace hook.

**Pros:**
- Directly addresses the Vite warning.
- Keeps live bundles smaller without changing runtime behavior.

**Cons:**
- Touches several async mutation paths.

**Effort:** 1-2 hours

**Risk:** Low

---

### Option 2: Extract mock adapters per domain

**Approach:** Create domain-specific mock adapters and load them only in mock mode, leaving live hooks free of fixture imports.

**Pros:**
- Cleaner separation between live and mock concerns.
- Easier to reason about bundle boundaries.

**Cons:**
- More refactoring than strictly necessary.

**Effort:** 3-5 hours

**Risk:** Medium

## Recommended Action

**To be filled during triage.**

## Technical Details

**Affected files:**
- `frontend/src/pages/products/modules/useProductPrototypeState.ts`
- `frontend/src/pages/lockers/modules/useLockerPrototypeState.ts`
- `frontend/src/pages/crm/modules/useCrmPrototypeState.ts`
- `frontend/src/pages/reservations/modules/useSelectedMemberReservationsState.ts`
- `frontend/src/pages/member-context/modules/useSelectedMemberMembershipsQuery.ts`
- `frontend/src/api/mockData.ts`

**Related components:**
- Vite chunking
- Mock/live mode branching

**Database changes (if any):**
- Migration needed? No

## Resources

- Build command: `cd frontend && npm run build`
- Vite warning captured during review on 2026-03-13

## Acceptance Criteria

- [ ] `npm run build` no longer reports mixed static/dynamic imports for `mockData.ts`
- [ ] Mock-only code is loaded lazily
- [ ] Live mode behavior and tests remain unchanged

## Work Log

### 2026-03-13 - Initial Discovery

**By:** Codex

**Actions:**
- Ran `npm run build`
- Captured the Vite reporter warning about `mockData.ts` chunking
- Traced static imports back to live workspace hooks

**Learnings:**
- The current mock/live split is functionally correct but still leaks mock code into the production bundle
- Existing dynamic imports are not enough if any caller keeps a static import path alive

### 2026-03-13 - Resolution

**By:** Codex

**Actions:**
- Converted remaining mock-only workspace helpers to lazy imports, including access, products, lockers, CRM, memberships, and reservations
- Rebuilt the frontend and confirmed Vite now emits a separate `mockData-*.js` chunk without the previous mixed-import warning

**Learnings:**
- Lazy loading mock fixtures is enough to restore chunk splitting without changing workspace behavior
- Build output is a useful guardrail for catching accidental mock/live coupling
