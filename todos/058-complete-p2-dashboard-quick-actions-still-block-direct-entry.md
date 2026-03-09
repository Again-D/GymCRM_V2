---
status: complete
priority: p2
issue_id: "058"
tags: [code-review, frontend, ux, navigation, quality]
dependencies: []
---

# Dashboard Quick Actions Still Block the New Direct-Entry Flow

## Problem Statement

이 PR은 회원 미선택 상태에서도 `회원권 업무`와 `예약 관리`로 직접 진입해 탭 내부에서 회원을 선택할 수 있게 만드는 작업이다. 그런데 대시보드의 빠른 진입 버튼은 여전히 `selectedMember`가 없으면 비활성화되어 있어, 앱의 대표 진입면 중 하나에서는 기존 왕복 흐름이 그대로 남는다.

## Findings

- 대시보드 quick action에서 `회원권 업무`, `예약 관리`는 `disabled: !hasSelectedMember`로 유지된다: `/Users/abc/projects/GymCRM_V2/frontend/src/features/dashboard/DashboardSection.tsx:68`
- 같은 PR에서 사이드바는 회원 미선택 상태에서도 두 탭으로 이동 가능하도록 설계되었고, 각 탭 내부에 picker UI가 추가되었다: `/Users/abc/projects/GymCRM_V2/frontend/src/features/memberships/MembershipsSection.tsx:31`, `/Users/abc/projects/GymCRM_V2/frontend/src/features/reservations/ReservationsSection.tsx:35`
- 결과적으로 사용자가 대시보드에서 시작하면 새 기능이 보이지 않고, 사이드바에서 시작할 때만 작동하는 불일치가 생긴다.
- 이 불일치는 “왕복 이동 제거”라는 기능 목적을 부분적으로만 충족시켜 UX 기대를 흔든다.

## Proposed Solutions

### Option 1: Align Dashboard Quick Actions with Sidebar Behavior

**Approach:** `회원권 업무`, `예약 관리` quick action의 disabled 조건을 제거하고 탭으로 바로 이동시킨다.

**Pros:**
- 새 직접 진입 모델이 모든 주요 내비게이션 표면에서 일관되게 동작한다.
- 사용자 학습 비용이 줄어든다.

**Cons:**
- 대시보드 문구도 함께 조정해야 한다.
- 기존 “회원 먼저 선택” 안내 문구를 재정리해야 한다.

**Effort:** 1-2 hours

**Risk:** Low

---

### Option 2: Keep Disabled Buttons but Explain Why Dashboard Differs

**Approach:** 대시보드는 의도적으로 빠른 실행 전용이라고 문서/카피로 고정하고, 사이드바 direct entry만 공식 경로로 남긴다.

**Pros:**
- 코드 변경이 작다.
- 기존 대시보드 안내 구조를 유지할 수 있다.

**Cons:**
- 기능 발견성과 UX 일관성 문제가 남는다.
- 사용자 입장에서 “여기선 왜 안 되지?”가 계속 발생한다.

**Effort:** 30-60 minutes

**Risk:** Medium

## Recommended Action

대시보드 quick action의 `회원권 업무`, `예약 관리` 비활성화 조건을 제거하고, 회원 미선택 상태 안내 문구를 직접 진입 가능한 모델로 갱신한다.

## Technical Details

**Affected files:**
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/dashboard/DashboardSection.tsx:68`
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/memberships/MembershipsSection.tsx:31`
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/reservations/ReservationsSection.tsx:35`

**Related components:**
- dashboard quick actions
- sidebar workspace navigation
- direct-entry member picker flow

**Database changes (if any):**
- Migration needed? No
- New columns/tables? None

## Resources

- **PR:** [#57](https://github.com/Again-D/GymCRM_V2/pull/57)
- **Brainstorm:** `/Users/abc/projects/GymCRM_V2/docs/brainstorms/2026-03-09-membership-reservation-member-selection-flow-brainstorm.md`
- **Plan:** `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-09-feat-membership-reservation-member-selection-flow-plan.md`
- **Related pattern:** `/Users/abc/projects/GymCRM_V2/docs/solutions/ui-bugs/admin-portal-sidebar-workspace-reorg-login-first-gymcrm-20260225.md`

## Acceptance Criteria

- [ ] Dashboard quick actions match the intended direct-entry behavior for memberships and reservations
- [ ] User can start the new flow consistently from both sidebar and dashboard entry surfaces
- [ ] Any remaining disabled state in dashboard is intentional and clearly explained in copy/tests/docs

## Work Log

### 2026-03-09 - Resolution

**By:** Codex

**Actions:**
- Updated `/Users/abc/projects/GymCRM_V2/frontend/src/features/dashboard/DashboardSection.tsx` so memberships/reservations quick actions no longer require a preselected member
- Replaced the stale dashboard notice with copy that matches the new in-workspace member picker flow
- Verified the frontend bundle with `npm run build`

**Learnings:**
- The workspace flow was already correct; the remaining issue was navigation-surface inconsistency on the post-login dashboard

---

### 2026-03-09 - Initial Discovery

**By:** Codex

**Actions:**
- Reviewed PR #57 navigation surfaces for the new member picker flow
- Compared sidebar direct-entry behavior against dashboard quick actions
- Confirmed memberships/reservations quick actions remain disabled without a selected member

**Learnings:**
- The feature is implemented correctly inside the workspaces, but one primary navigation surface still exposes the old rule set
- This is a UX consistency gap rather than a backend or data-integrity problem

## Notes

- This is important because the dashboard is the first post-login surface in jwt mode, so its affordances shape user expectations.
