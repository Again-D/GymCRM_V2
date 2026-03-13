---
status: complete
priority: p2
issue_id: "090"
tags: [code-review, frontend, performance, access, member-search]
dependencies: []
---

# Debounce live access member search

## Problem Statement

The access workspace fires a member search request on every keystroke in live mode. Caching and in-flight dedupe prevent exact duplicate fetches, but every intermediate search string still hits `/api/v1/members`. This recreates the request-churn problem that was already documented for other member pickers and will degrade responsiveness as the member base grows.

## Findings

- `frontend/src/pages/access/AccessPage.tsx:90` triggers `loadMembers` whenever `accessMemberQuery` changes.
- `frontend/src/pages/access/AccessPage.tsx:94` passes the raw input directly, so typing `김`, `김민`, `김민수` causes three live requests.
- `frontend/src/pages/members/modules/useMembersQuery.ts` does cache and in-flight dedupe, but it cannot avoid unique-query churn without debounce.
- The team already documented this pattern in `docs/solutions/performance-issues/workspace-member-search-request-churn-gymcrm-20260309.md`, so this is a known regression pattern.

## Proposed Solutions

### Option 1: Add debounce in AccessPage

**Approach:** Use `useDebouncedValue` on `accessMemberQuery` and load members only from the debounced value.

**Pros:**
- Smallest fix.
- Matches the proven pattern already used in other direct-entry flows.

**Cons:**
- Leaves debounce behavior duplicated at the page layer.

**Effort:** 30-60 minutes

**Risk:** Low

---

### Option 2: Add optional debounce support to `useMembersQuery`

**Approach:** Move debounce/timing behavior into a shared member-query orchestration helper used by search-based pages.

**Pros:**
- Centralizes the anti-churn rule.
- Makes future search surfaces harder to regress.

**Cons:**
- Broader refactor.
- Higher chance of changing pages that currently rely on explicit submit behavior.

**Effort:** 2-3 hours

**Risk:** Medium

## Recommended Action

**To be filled during triage.**

## Technical Details

**Affected files:**
- `frontend/src/pages/access/AccessPage.tsx`
- `frontend/src/pages/members/modules/useMembersQuery.ts`

**Related components:**
- Access workspace member picker
- Shared member query hook

**Database changes (if any):**
- Migration needed? No

## Resources

- `docs/solutions/performance-issues/workspace-member-search-request-churn-gymcrm-20260309.md`
- `frontend/src/pages/access/AccessPage.tsx:90`

## Acceptance Criteria

- [ ] Access member search does not hit the API on every keystroke
- [ ] The page still supports immediate manual refresh/search when needed
- [ ] Existing member-query tests continue to pass
- [ ] Add or update a test that proves debounced search behavior

## Work Log

### 2026-03-13 - Initial Discovery

**By:** Codex

**Actions:**
- Reviewed access workspace search flow and shared member-query hook
- Compared current behavior against the documented member-search churn solution
- Confirmed the page issues live fetches from raw input changes

**Learnings:**
- Hook-level cache/dedupe is not enough when every keystroke creates a new cache key
- This is the same performance pattern the team already fixed in a prior workspace picker

### 2026-03-13 - Resolution

**By:** Codex

**Actions:**
- Added `useDebouncedValue` to the live access member search flow in `frontend/src/pages/access/AccessPage.tsx`
- Added a regression test that verifies no extra member request is sent before the debounce window elapses
- Re-ran frontend tests and production build

**Learnings:**
- Shared query caching still needs page-level input throttling when search strings change frequently
- The existing direct-entry workspace pattern was reusable with only a small page-level change
