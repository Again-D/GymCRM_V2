---
status: complete
priority: p2
issue_id: "107"
tags: [code-review, frontend, backend, quality]
dependencies: []
---

# Member status filter is rendered in the UI but not connected to the list query contract

## Problem Statement

[`frontend/src/pages/members/components/MemberListSection.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/MemberListSection.tsx) now renders a `회원상태` filter with `ACTIVE` and `INACTIVE` options, but changing that control does not affect the loaded member list.

The local `memberStatus` state is never included in the default filters passed to [`useMembersQuery`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/modules/useMembersQuery.ts), the query filter type does not define `memberStatus`, the query serializer never sends it, the mock filter ignores it, and the backend list endpoint does not currently accept it.

## Findings

- [`MemberListSection.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/MemberListSection.tsx) defines `memberStatus` state and renders a `회원상태` select, but `getDefaultFilters()` omits that value.
- [`frontend/src/pages/members/modules/types.ts`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/modules/types.ts) defines `MemberQueryFilters` without a `memberStatus` field.
- [`frontend/src/pages/members/modules/useMembersQuery.ts`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/modules/useMembersQuery.ts) serializes `name`, `phone`, `membershipOperationalStatus`, `dateFrom`, and `dateTo`, but never `memberStatus`.
- [`frontend/src/api/mockData.ts`](/Users/abc/projects/GymCRM_V2/frontend/src/api/mockData.ts) filters mock members by `name`, `phone`, and `membershipOperationalStatus` only.
- [`backend/src/main/java/com/gymcrm/member/MemberController.java`](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberController.java) does not accept `memberStatus` on `GET /api/v1/members`.
- The reset action in [`MemberListSection.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/MemberListSection.tsx) also leaves `memberStatus` untouched, so even a later query-wire-up would still have an incomplete reset contract.

## Proposed Solutions

1. Wire `memberStatus` through the full query contract.
   - Pros: the filter behaves consistently in live and mock modes and matches operator expectations.
   - Cons: requires frontend type changes, mock parity, backend endpoint/service support, and tests.
   - Effort: medium.

2. Apply `memberStatus` as a frontend-only post-filter after list load.
   - Pros: fast to ship.
   - Cons: diverges from live query semantics, wastes bandwidth, and can drift from pagination expectations.
   - Effort: small.

3. Remove or disable the `회원상태` control until the contract exists.
   - Pros: avoids a misleading dead control.
   - Cons: defers a legitimate filter capability.
   - Effort: small.

## Recommended Action


## Technical Details

- Filter UI: [`frontend/src/pages/members/components/MemberListSection.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/MemberListSection.tsx)
- Query type: [`frontend/src/pages/members/modules/types.ts`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/modules/types.ts)
- Query serialization and cache key inputs: [`frontend/src/pages/members/modules/useMembersQuery.ts`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/modules/useMembersQuery.ts)
- Mock filtering parity: [`frontend/src/api/mockData.ts`](/Users/abc/projects/GymCRM_V2/frontend/src/api/mockData.ts)
- Live endpoint contract: [`backend/src/main/java/com/gymcrm/member/MemberController.java`](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberController.java)

## Acceptance Criteria

- [ ] Changing `회원상태` to `활성` loads only active members.
- [ ] Changing `회원상태` to `비활성` loads only inactive members.
- [ ] The filter works in both mock mode and live mode.
- [ ] The reset action clears `memberStatus` together with the other member filters.
- [ ] Query tests cover `memberStatus` serialization or filtering behavior.

## Work Log

### 2026-03-20 - Review finding captured

**By:** Codex

**Actions:**
- Reviewed the newly added `회원상태` filter in [`MemberListSection.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/MemberListSection.tsx).
- Traced the members list query path through [`useMembersQuery.ts`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/modules/useMembersQuery.ts) and [`types.ts`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/modules/types.ts).
- Checked mock filtering in [`mockData.ts`](/Users/abc/projects/GymCRM_V2/frontend/src/api/mockData.ts).
- Confirmed the live list endpoint in [`MemberController.java`](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberController.java) has no `memberStatus` request parameter.

**Learnings:**
- The issue is not a rendering bug in the select control; it is a disconnected filter contract.
- Even if the frontend query layer is updated, reset behavior still needs to be fixed because `memberStatus` is not currently cleared.

### 2026-03-20 - Filter contract wired through frontend, mock, and backend

**By:** Codex

**Actions:**
- Added `memberStatus` to [`MemberQueryFilters`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/modules/types.ts) and serialized it in [`useMembersQuery.ts`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/modules/useMembersQuery.ts).
- Updated [`MemberListSection.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/MemberListSection.tsx) to include `memberStatus` in default filters, pagination reset dependencies, and reset payloads.
- Added mock parity in [`mockData.ts`](/Users/abc/projects/GymCRM_V2/frontend/src/api/mockData.ts) so `/api/v1/members?memberStatus=...` filters correctly in prototype mode.
- Extended the live contract through [`MemberController.java`](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberController.java), [`MemberService.java`](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberService.java), [`MemberRepository.java`](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberRepository.java), and [`MemberQueryRepository.java`](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberQueryRepository.java).
- Added regression coverage in [`useMembersQuery.test.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/modules/useMembersQuery.test.tsx), [`MemberListSection.test.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/MemberListSection.test.tsx), [`mockData.test.ts`](/Users/abc/projects/GymCRM_V2/frontend/src/api/mockData.test.ts), and [`MemberSummaryApiIntegrationTest.java`](/Users/abc/projects/GymCRM_V2/backend/src/test/java/com/gymcrm/member/MemberSummaryApiIntegrationTest.java).

**Learnings:**
- Once `MemberQueryFilters` changed, auxiliary consumers such as access, lockers, and member-context fallback also needed explicit `memberStatus: ""` defaults to keep the frontend build green.
- Repository signature changes affected backend integration tests outside the member feature, so the compile surface was slightly wider than the original finding suggested.

## Resources

- [`frontend/src/pages/members/components/MemberListSection.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/MemberListSection.tsx)
- [`frontend/src/pages/members/modules/useMembersQuery.ts`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/modules/useMembersQuery.ts)
- [`frontend/src/pages/members/modules/types.ts`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/modules/types.ts)
- [`frontend/src/api/mockData.ts`](/Users/abc/projects/GymCRM_V2/frontend/src/api/mockData.ts)
- [`backend/src/main/java/com/gymcrm/member/MemberController.java`](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberController.java)
