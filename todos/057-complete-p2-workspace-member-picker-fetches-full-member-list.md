---
status: complete
priority: p2
issue_id: "057"
tags: [code-review, frontend, performance, scalability, ui]
dependencies: []
---

# Workspace Member Picker Fetches the Full Member List on Every Open

## Problem Statement

`회원권 업무`와 `예약 관리`의 직접 진입 picker가 열릴 때마다 `/api/v1/members` 전체 목록을 가져와 클라이언트에서만 필터링하고 있다. 현재는 동작하지만 센터 회원 수가 커질수록 초기 진입 latency와 payload 크기가 함께 증가해, 이번 UX 개선이 실제 운영 규모에서는 느린 화면으로 바뀔 수 있다.

## Findings

- `loadWorkspaceMembers()`는 검색어나 limit 없이 항상 `GET /api/v1/members`를 호출한다: `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx:998`
- `WorkspaceMemberPicker`는 응답 전체를 `rows`에 저장한 뒤 클라이언트에서 필터링하고, 표시만 8건으로 자른다: `/Users/abc/projects/GymCRM_V2/frontend/src/shared/ui/WorkspaceMemberPicker.tsx:40`, `/Users/abc/projects/GymCRM_V2/frontend/src/shared/ui/WorkspaceMemberPicker.tsx:77`
- 즉, 사용자에게 8건만 보여도 네트워크/메모리 비용은 회원 수 전체에 비례한다.
- 이 PR의 검증 로그는 prototype/jwt 수동 브라우저 확인 중심이라 대량 회원 기준 성능 회귀를 커버하지 않는다.

## Proposed Solutions

### Option 1: Server-Side Search Endpoint Reuse

**Approach:** picker query를 서버 검색 파라미터(`name`, `phone`, 필요 시 `limit`)로 보내고, 결과만 렌더링한다.

**Pros:**
- 네트워크 비용을 검색 결과 수에 비례하게 줄일 수 있다.
- 대량 회원 환경에서도 초기 직접 진입 속도가 안정적이다.

**Cons:**
- 입력 debounce와 검색 호출 타이밍을 정리해야 한다.
- 백엔드 API 계약을 확인하거나 일부 확장해야 할 수 있다.

**Effort:** 3-5 hours

**Risk:** Medium

---

### Option 2: Lightweight Cached Snapshot with Explicit Refresh

**Approach:** 첫 진입에서만 전체 목록을 받아 캐시하고, picker 재오픈 시 재사용한다. 필요 시 수동 새로고침을 제공한다.

**Pros:**
- 현재 구조를 크게 바꾸지 않고 반복 fetch를 줄일 수 있다.
- 구현 난이도가 상대적으로 낮다.

**Cons:**
- 최초 payload가 여전히 크다.
- 데이터 freshness와 캐시 무효화 정책이 필요하다.

**Effort:** 2-4 hours

**Risk:** Medium

---

### Option 3: Hybrid Search Threshold

**Approach:** 소규모 목록에서는 현재 방식을 유지하고, 응답 수가 임계치를 넘으면 서버 검색 모드로 전환한다.

**Pros:**
- 소규모 개발/데모 환경의 단순함을 유지할 수 있다.
- 운영 규모에서만 비용을 줄일 수 있다.

**Cons:**
- 동작 방식이 환경별로 달라져 복잡성이 늘어난다.
- 테스트 축이 늘어난다.

**Effort:** 4-6 hours

**Risk:** Medium

## Recommended Action

목록 API에 `keyword` 검색을 추가해 picker가 `memberId/memberCode/name/phone/status` 기준으로 서버 검색을 사용하도록 전환하고, 프론트 picker는 query 변경 시 서버 결과만 렌더링하도록 변경한다.

## Technical Details

**Affected files:**
- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx:998`
- `/Users/abc/projects/GymCRM_V2/frontend/src/shared/ui/WorkspaceMemberPicker.tsx:40`
- `/Users/abc/projects/GymCRM_V2/frontend/src/shared/ui/WorkspaceMemberPicker.tsx:77`

**Related components:**
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/memberships/MembershipsSection.tsx`
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/reservations/ReservationsSection.tsx`
- member summary API `/api/v1/members`

**Database changes (if any):**
- Migration needed? No
- New columns/tables? None expected

## Resources

- **PR:** [#57](https://github.com/Again-D/GymCRM_V2/pull/57)
- **Validation log:** `/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-09-workspace-member-picker-validation-log.md`
- **Related pattern:** `/Users/abc/projects/GymCRM_V2/docs/solutions/ui-bugs/admin-portal-sidebar-workspace-reorg-login-first-gymcrm-20260225.md`

## Acceptance Criteria

- [x] Picker does not fetch the full member list for every direct-entry open in large datasets
- [x] Search result loading cost scales with query/result size rather than total member count
- [x] Membership and reservation direct-entry flows remain usable in jwt/prototype modes
- [x] Relevant validation notes or tests cover large member list behavior

## Work Log

### 2026-03-09 - Resolution

**By:** Codex

**Actions:**
- Added `keyword` search support to `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberController.java`, `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberService.java`, and `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberRepository.java`
- Updated `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx` and `/Users/abc/projects/GymCRM_V2/frontend/src/shared/ui/WorkspaceMemberPicker.tsx` so the workspace picker queries the server instead of loading and filtering a large local snapshot
- Added keyword coverage to `/Users/abc/projects/GymCRM_V2/backend/src/test/java/com/gymcrm/member/MemberSummaryApiIntegrationTest.java` and fixed the repository signature call in `/Users/abc/projects/GymCRM_V2/backend/src/test/java/com/gymcrm/member/MemberSummaryQueryPerformanceIntegrationTest.java`
- Verified with `npm run build` and `./gradlew test --tests com.gymcrm.member.MemberSummaryApiIntegrationTest`

**Learnings:**
- The existing member summary API already had the right building blocks; adding a single keyword path was enough to keep the picker simple while moving filtering cost back to the server

---

### 2026-03-09 - Initial Discovery

**By:** Codex

**Actions:**
- Reviewed PR #57 direct-entry picker implementation
- Traced data flow from `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx:998` into `/Users/abc/projects/GymCRM_V2/frontend/src/shared/ui/WorkspaceMemberPicker.tsx`
- Confirmed the UI only truncates rendered rows while still loading the entire dataset

**Learnings:**
- The current UX is correct for small fixtures but does not yet have an operating-scale loading strategy
- This is a performance/scalability issue rather than a correctness failure in the happy path

## Notes

- This finding should not block merge for small demo data, but it is worth triaging before larger staging/production datasets are relied on.
