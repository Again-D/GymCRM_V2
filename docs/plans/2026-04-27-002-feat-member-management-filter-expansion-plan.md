---
title: feat: Expand member management top filters
type: feat
status: active
date: 2026-04-27
origin: docs/brainstorms/2026-04-27-member-management-top-filter-expansion-requirements.md
---

# feat: Expand member management top filters

## Overview

Member management already supports name, phone, member status, membership operational status, and expiry-window filtering. This plan adds two more top-level operational filters, trainer and product, without changing the existing `만료 기간` behavior or expanding the scope beyond the member list screen.

---

## Problem Frame

The roadmap slice is specifically the member management top filter row. Operators need a faster way to narrow the member list by who owns the membership and which product the membership came from, while preserving the existing expiry-window filter and current member actions.

The backend list contract already has the right membership-based filter hooks. The remaining work is to expose those filters in the member list UI, keep the shared query contract backward-compatible, and make mock-mode filtering behave the same way as live mode.

---

## Requirements Trace

- R1. Add a trainer filter to member management.
- R2. Add a product filter to member management.
- R3. Keep the existing expiry-window filter unchanged.
- R4. New filters must combine with the existing member list filters.
- R5. Trainer/product filtering must follow membership-backed semantics and stay consistent with the member summary rules when a member has multiple memberships.
- R6. Changing filters must update the member list query result.
- R7. Reset must clear the new filters together with the existing ones.
- R8. Pagination must continue to reset and behave predictably as filters change.
- R9. The trainer/product labels must be understandable in the existing member-management vocabulary.
- R10. The existing expiry-window filter must keep its current "expiring soon" meaning.

---

## Scope Boundaries

- No backend controller/service/repository changes are expected in this slice.
- No changes to the member detail modal or member row actions.
- No changes to member table columns.
- No changes to the meaning or label of `만료 기간`.
- No new shared search surface for access, lockers, reservations, or memberships.

---

## Context & Research

### Relevant Code and Patterns

- `frontend/src/pages/members/components/MemberListSection.tsx` already owns filter state, reset behavior, and pagination reset dependencies.
- `frontend/src/pages/members/modules/useMembersQuery.ts` already serializes member filters into `/api/v1/members`.
- `frontend/src/api/mockData.ts` owns the mock `/api/v1/members` response path and the existing member filter behavior.
- `backend/src/main/java/com/gymcrm/member/controller/MemberController.java`, `backend/src/main/java/com/gymcrm/member/service/MemberService.java`, and `backend/src/main/java/com/gymcrm/member/repository/MemberQueryRepository.java` already accept `trainerId`, `productId`, `dateFrom`, and `dateTo` for live member queries.
- `frontend/src/pages/trainers/modules/useTrainersQuery.ts`, `frontend/src/pages/products/modules/useProductsQuery.ts`, and `frontend/src/pages/memberships/modules/useTrainerOptionsQuery.ts` are the existing reference-data patterns to reuse for select options.
- `frontend/src/pages/members/modules/useMembersQuery.test.tsx`, `frontend/src/pages/members/components/MemberListSection.test.tsx`, and `frontend/src/api/mockData.test.ts` are the right regression points for contract, UI, and mock parity coverage.
- `docs/solutions/integration-issues/member-status-filter-not-affecting-results-gymcrm-20260320.md` captures the main lesson for this area: a visible filter is not real until the shared query contract, reset path, and mock/live parity all carry it end to end.

### Institutional Learnings

- Treat member list filter additions as contract changes, not just UI edits.
- Keep reset logic and pagination dependencies in step with the filter state.
- Preserve mock/live parity for list filters so local validation matches production behavior.

---

## Key Technical Decisions

- Make the new trainer and product fields optional in the shared `MemberQueryFilters` contract, then normalize them inside `useMembersQuery` so existing consumers stay source-compatible.
- Reuse the existing live members endpoint contract and its membership-backed semantics; the backend already supports the needed query params, so this slice does not add new API routes or server-side filter logic.
- Populate the new selects from existing reference-data hooks instead of introducing a new members-specific lookup layer.
- Keep `MembershipPeriodFilter` intact and add the new controls beside it, rather than redefining the expiry-window filter.
- Use searchable, clearable selects for trainer and product so the top filter row stays usable once the option lists grow.

---

## Implementation Units

- [x] U1. **Normalize the shared members query contract**

**Goal:** Add trainer/product filter support to the shared members query path while preserving current consumers.

**Requirements:** R4, R5, R6

**Dependencies:** None

**Files:**
- Modify: `frontend/src/pages/members/modules/types.ts`
- Modify: `frontend/src/pages/members/modules/useMembersQuery.ts`
- Test: `frontend/src/pages/members/modules/useMembersQuery.test.tsx`

**Approach:**
- Add optional `trainerId` and `productId` filter fields to the shared type.
- Normalize blank values inside `useMembersQuery` before building the query key and query string so cache entries do not fragment.
- Serialize trainer/product IDs only when they are present, while preserving the existing text and expiry filters.
- Keep the hook backward-compatible for callers that do not care about the new filters yet.

**Patterns to follow:**
- Existing serialization in `useMembersQuery.ts`
- Existing filter contract shape in `frontend/src/pages/members/modules/types.ts`

**Test scenarios:**
- Happy path: trainerId and productId are present, and the request includes both params with the expected numeric values.
- Edge case: blank trainer/product values are omitted from the query string and do not change the request shape.
- Edge case: existing name, phone, member status, membership status, and expiry filters continue to serialize as before.
- Integration: the hook still returns the same `members` shape for consumers that do not pass the new fields.

**Verification:**
- The shared hook can express the new filter contract without forcing unrelated screens to change.

- [x] U2. **Align mock members filtering with the live contract**

**Goal:** Make mock mode honor the same member filtering semantics as the live backend.

**Requirements:** R5, R6, R10

**Dependencies:** U1

**Files:**
- Modify: `frontend/src/api/mockData.ts`
- Test: `frontend/src/api/mockData.test.ts`

**Approach:**
- Extend the mock `/api/v1/members` handler so it reads trainerId and productId query params and filters members by matching memberships.
- Keep the same membership-backed matching rule as live mode: a member qualifies when at least one visible membership matches the filter set.
- Preserve the existing summary derivation for operational status, expiry date, and PT count so the mock response still mirrors the live row shape.
- If the mock members endpoint is not already honoring the current expiry window, bring that contract into parity here so the existing `만료 기간` surface stays valid.

**Patterns to follow:**
- Existing `filterMembers` logic in `frontend/src/api/mockData.ts`
- Existing `deriveMembers()` membership summary derivation
- Existing member filter tests in `frontend/src/api/mockData.test.ts`

**Test scenarios:**
- Happy path: a trainer/product filter returns only members whose memberships match those IDs.
- Edge case: a member with multiple memberships still matches when any membership satisfies the filter.
- Edge case: the existing member status and membership operational status filters still work when the new filters are also present.
- Integration: the current expiry-window filter continues to produce the same member set in mock mode.

**Verification:**
- Mock responses follow the same membership-backed selection semantics as the live list endpoint.

- [x] U3. **Add member-management filter controls and reset wiring**

**Goal:** Expose the new filters in the member management UI without disturbing the existing member workflow.

**Requirements:** R1, R2, R3, R4, R6, R7, R8, R9, R10

**Dependencies:** U1, U2

**Files:**
- Modify: `frontend/src/pages/members/components/MemberListSection.tsx`
- Test: `frontend/src/pages/members/components/MemberListSection.test.tsx`

**Approach:**
- Add local state for trainer and product selection to the existing filter card.
- Reuse the existing trainer and product reference-data hooks to drive searchable select options.
- Keep `MembershipPeriodFilter` unchanged and place the new controls alongside it, rather than folding them into the expiry-window component.
- Update the `useMembersQuery` call, reset handler, and pagination reset dependencies so the new filter values behave like the existing ones.
- Leave member row actions, detail modal behavior, and table columns unchanged.

**Patterns to follow:**
- Current filter/card layout in `MemberListSection.tsx`
- Existing reset and pagination handling in `MemberListSection.tsx`
- Existing member list test structure in `MemberListSection.test.tsx`

**Test scenarios:**
- Happy path: the filter card renders trainer and product controls alongside the existing filters.
- Happy path: selecting trainer/product updates the arguments passed to `useMembersQuery`.
- Edge case: reset clears trainer/product together with the current name, phone, member status, membership status, and expiry filters.
- Edge case: changing trainer/product resets the paginated member table back to page 1.
- Integration: existing row-click modal behavior and member actions still work after the filter UI changes.

**Verification:**
- The member list page has two new operational filters and still behaves like the same member management surface.

---

## System-Wide Impact

- **Interaction graph:** `MemberListSection` drives `useMembersQuery`, which drives `/api/v1/members`; the filter options themselves come from existing trainer and product reference-data hooks.
- **Error propagation:** Query failures should continue to surface through the existing members list error path; no new error surface is needed.
- **State lifecycle risks:** The main regression risks are stale query keys, pagination not resetting on filter changes, and reset handlers missing one of the new fields.
- **API surface parity:** `AccessPage`, `LockersPage`, and `MemberContextFallback` should remain source-compatible if the shared query hook normalizes new fields internally.
- **Integration coverage:** Mock mode and live mode both need to agree on the same membership-backed filter semantics so local validation remains trustworthy.
- **Unchanged invariants:** The existing `만료 기간` filter, member detail modal, and member action buttons are explicitly out of scope.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| New filter state fragments the members query cache | Normalize blank values inside `useMembersQuery` before building the query key and request string |
| Mock mode drifts from live mode on trainer/product filtering | Extend `frontend/src/api/mockData.ts` and pin it with `frontend/src/api/mockData.test.ts` |
| Filter row becomes cramped on narrower screens | Keep the existing expiry filter component separate and use responsive select controls rather than flattening everything into one line |
| Current expiry-window behavior regresses while adding new filters | Preserve the existing `MembershipPeriodFilter` component and add mock parity coverage for the current date window |

---

## Documentation / Operational Notes

- No backend route or payload change is expected from this slice, so `docs/04_API_설계서.md` should not need a functional update here.
- If a separate cleanup is later needed to align the written API contract with the already-supported member query params, handle that as its own documentation pass.

---

## Open Questions

### Resolved During Planning

- Existing `만료 기간` behavior stays untouched; the new work only adds trainer and product filters.
- The backend member query contract already supports `trainerId`, `productId`, `dateFrom`, and `dateTo`; the plan does not add server-side query logic.
- Existing shared consumers of `useMembersQuery` stay source-compatible by keeping the new fields optional and normalizing them in the hook.

### Deferred to Implementation

- Whether the trainer/product select options should include only active records or the full center-wide reference list can be finalized while wiring the dropdowns, using the existing reference-data hooks as the source.
- The final responsive breakpoint split for the filter card can be tuned during implementation if the first pass feels crowded.

---

## Sources & References

- Origin document: `docs/brainstorms/2026-04-27-member-management-top-filter-expansion-requirements.md`
- Related implementation: `frontend/src/pages/members/components/MemberListSection.tsx`
- Related implementation: `frontend/src/pages/members/modules/useMembersQuery.ts`
- Related implementation: `frontend/src/api/mockData.ts`
- Related implementation: `frontend/src/pages/trainers/modules/useTrainersQuery.ts`
- Related implementation: `frontend/src/pages/products/modules/useProductsQuery.ts`
- Related implementation: `frontend/src/pages/memberships/modules/useTrainerOptionsQuery.ts`
- Related implementation: `backend/src/main/java/com/gymcrm/member/controller/MemberController.java`
- Related implementation: `backend/src/main/java/com/gymcrm/member/service/MemberService.java`
- Related implementation: `backend/src/main/java/com/gymcrm/member/repository/MemberQueryRepository.java`
- Related learning: `docs/solutions/integration-issues/member-status-filter-not-affecting-results-gymcrm-20260320.md`
