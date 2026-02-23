---
status: complete
priority: p2
issue_id: "005"
tags: [code-review, frontend, quality, react]
dependencies: []
---

# Reset Search Uses Stale State In UI

Reset buttons in the member/product list toolbars can trigger a reload with the **previous** search/filter values instead of the cleared values.

## Problem Statement

The UI clears local state and then calls `setTimeout(() => loadX(), 0)` to re-query. However, the timeout callback closes over the old render's state, so `loadMembers()` / `loadProducts()` may still use the stale search/filter values. This makes the `초기화` button unreliable and confusing during demos.

## Findings

- Member reset handler clears state and then calls `setTimeout(() => void loadMembers(), 0)` in the same closure.
- Product reset handler uses the same pattern with `loadProducts()`.
- `loadMembers()` and `loadProducts()` read `memberSearchName/memberSearchPhone` and `productFilters` from closure state, so the timeout does not guarantee fresh values.
- Affected locations:
  - `frontend/src/App.tsx:539`
  - `frontend/src/App.tsx:817`

## Proposed Solutions

### Option 1: Add explicit reload helpers that accept query/filter params (Recommended)

**Approach:** Refactor `loadMembers` / `loadProducts` to accept optional explicit parameters; reset handlers call them with empty values immediately.

**Pros:**
- Deterministic behavior
- Eliminates timing dependency
- Keeps reset action instant and simple

**Cons:**
- Small refactor touches multiple callers

**Effort:** 30-60 minutes

**Risk:** Low

---

### Option 2: Trigger reload via `useEffect` on search/filter state changes

**Approach:** Make list loading reactive and let reset only update state.

**Pros:**
- Centralized data loading behavior
- Removes manual reload timing hacks

**Cons:**
- Changes UX semantics (may auto-query on every state change)
- More refactor scope than needed for prototype

**Effort:** 1-2 hours

**Risk:** Medium

---

### Option 3: Defer callback to next render with state refs

**Approach:** Store latest filter/search state in refs and read from refs in `load*`.

**Pros:**
- Minimal visible behavior changes

**Cons:**
- Adds indirection and complexity
- Less clear than explicit parameters

**Effort:** 45-90 minutes

**Risk:** Medium

## Recommended Action
Completed in frontend UI by making `loadMembers`/`loadProducts` accept explicit filter overrides and using those explicit empty values from reset handlers (removing timeout-based timing workaround).

## Technical Details

**Affected files:**
- `frontend/src/App.tsx`

**Related components:**
- Member list toolbar reset flow
- Product list toolbar reset flow

**Database changes (if any):**
- No

## Resources

- **Review context:** Local code review after `P2-6/P2-7` completion

## Acceptance Criteria

- [x] Clicking member `초기화` clears inputs and requests member list with empty `name`/`phone` filters
- [x] Clicking product `초기화` clears filters and requests product list with empty `category`/`status` filters
- [x] No `setTimeout(...loadMembers/loadProducts...)` timing workaround remains in reset handlers
- [x] Manual verification confirms reset behavior is deterministic

## Work Log

### 2026-02-23 - Review Finding Created

**By:** Codex

**Actions:**
- Reviewed `frontend/src/App.tsx` reset handlers after P2-6 UI implementation
- Identified stale-closure risk from timeout callbacks referencing prior render state
- Documented remediation options and acceptance criteria

**Learnings:**
- `setTimeout` does not guarantee React state freshness when callback closes over previous render values

### 2026-02-23 - Fix Implemented

**By:** Codex

**Actions:**
- Refactored `loadMembers` to accept optional explicit `{name, phone}` filters in `frontend/src/App.tsx`
- Refactored `loadProducts` to accept optional explicit filter object in `frontend/src/App.tsx`
- Updated member/product reset handlers to call loaders with explicit empty filters (removed `setTimeout` workaround)
- Verified no remaining `setTimeout(...loadMembers/loadProducts...)` reset pattern in `frontend/src/App.tsx`
- Ran `npm run build` in `frontend/` successfully

**Learnings:**
- Passing explicit query/filter values to loaders is simpler and more deterministic than scheduling a deferred reload against React state

## Notes

- This is user-visible and can make demos appear flaky even when backend APIs are correct.
