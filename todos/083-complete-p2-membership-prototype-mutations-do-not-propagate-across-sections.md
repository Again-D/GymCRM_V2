---
status: complete
priority: p2
issue_id: "083"
tags: [code-review, frontend, prototype, state-ownership]
dependencies: []
---

# Propagate membership prototype mutations across sections

## Problem Statement

The rebuild prototype now supports purchase, hold, resume, and refund actions inside the memberships page, but those mutations only patch the local selected-member memberships query state. Members summary and reservation targets remain sourced from separate query modules and mock transport data, so navigating across sections after a mutation can show stale status/counts. That weakens the prototype's ability to prove cross-section parity.

## Findings

- `frontend-rebuild/src/pages/member-context/modules/useSelectedMemberMembershipsQuery.ts` originally created and patched memberships only in local component state.
- `frontend-rebuild/src/pages/memberships/modules/useMembershipPrototypeState.ts` performs purchase/hold/resume/refund against those local patch helpers.
- `frontend-rebuild/src/pages/members/modules/useMembersQuery.ts` and `frontend-rebuild/src/pages/reservations/modules/useReservationTargetsQuery.ts` load separate data from `apiGet(...)` and need invalidation when membership data changes.
- Result before the fix: members summary and reservation target counts could remain stale after membership mutations.

## Proposed Solutions

### Option 1: Introduce shared prototype data store

**Approach:** Move mock-backed members/memberships/reservation-target data into a shared in-memory prototype store with explicit invalidation.

**Pros:**
- Best parity for cross-section state
- Clear ownership model for prototype-wide data

**Cons:**
- Adds more architecture before full parity
- More moving parts to test

**Effort:** Medium

**Risk:** Medium

---

### Option 2: Add targeted invalidation callbacks between modules

**Approach:** Keep current modules, but after membership mutations trigger explicit cache resets/reloads for members summary and reservation targets.

**Pros:**
- Smaller change
- Preserves current module boundaries

**Cons:**
- More coordination wiring
- Easier to miss future consumers

**Effort:** Small-Medium

**Risk:** Medium

## Recommended Action

Implemented Option 1 for the prototype: `mockData.ts` is now the shared mutable source for memberships, member summaries, and reservation targets. Membership mutations update that source, and cross-section query cache keys include a mock-data version so stale cached results are not reused after mutations.

## Technical Details

**Affected files:**
- `frontend-rebuild/src/api/mockData.ts`
- `frontend-rebuild/src/api/mockData.test.ts`
- `frontend-rebuild/src/pages/member-context/modules/useSelectedMemberMembershipsQuery.ts`
- `frontend-rebuild/src/pages/members/modules/useMembersQuery.ts`
- `frontend-rebuild/src/pages/reservations/modules/useReservationTargetsQuery.ts`

## Resources

- **PR:** #73
- **Related docs:** `docs/notes/2026-03-12-frontend-rebuild-membership-hardening.md`

## Acceptance Criteria

- [x] Membership mutations update or invalidate members summary state
- [x] Membership mutations update or invalidate reservation target state
- [x] Cross-section smoke demonstrates no stale counts/status after mutation at the data layer
- [x] Tests cover the chosen invalidation strategy

## Work Log

### 2026-03-12 - Review Discovery

**By:** Codex

**Actions:**
- Reviewed prototype memberships mutation flow against members/reservations query ownership
- Identified that membership action state stays local to memberships page/query layer
- Recorded follow-up for cross-section parity hardening

**Learnings:**
- Prototype ownership is clearer than baseline, but parity still depends on shared invalidation behavior

### 2026-03-12 - Resolution

**By:** Codex

**Actions:**
- Reworked `mockData.ts` into a shared mutable source that derives member summaries and reservation targets from current memberships
- Added `createMockMembership`, `patchMockMembership`, `getMockDataVersion`, and `resetMockData`
- Updated members and reservation-target query cache keys to include the mock data version so stale cached results are discarded after membership mutations
- Added regression tests proving purchase/hold mutations propagate into `/api/v1/members` and `/api/v1/reservations/targets`

**Learnings:**
- For the prototype, a small shared mutable data source is a better fit than wiring cross-section invalidation callbacks through every page boundary
