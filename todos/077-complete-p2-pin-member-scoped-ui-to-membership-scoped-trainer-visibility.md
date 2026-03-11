---
status: complete
priority: p2
issue_id: "077"
tags: [code-review, architecture, security, quality, backend, frontend]
dependencies: []
---

# Pin member scoped UI to membership scoped trainer visibility

## Problem Statement

플랜은 trainer scope의 canonical source를 `membership.assigned_trainer_id` 로 잡아 두었지만, 예약 관리 UI는 여전히 `회원 리스트 -> 회원 상세 모달 -> 예약 일정` 처럼 member 단위 화면으로 설명돼 있습니다. 이 상태로 구현하면 트레이너가 “담당 회원권 하나 때문에 회원은 보이지만, 같은 회원의 다른 비담당 회원권/예약까지 같이 보이는” 과노출이 생길 수 있습니다. 플랜은 member 단위 UI가 membership 단위 권한을 어떻게 좁혀서 보여줄지 더 명확히 고정해야 합니다.

## Findings

- 플랜은 `담당 회원` 경계를 membership 기준으로 고정했습니다.
- 동시에 예약 관리 워크스페이스를 `예약권 보유 회원 리스트 + 상세 패널 + 회원 상세 모달` 구조로 설명합니다.
- member summary는 중복 회원 제거를 요구하고 있어, 여러 membership을 하나의 member row로 압축합니다.
- 이때 trainer가 한 회원의 여러 membership 중 일부만 담당하는 경우, 단순 member row 선택은 trainer에게 비담당 membership/예약까지 노출하는 경로가 될 수 있습니다.
- 현재 플랜은 상세 모달과 예약 일정이 “member 기준 전체”인지, “trainer에게 허용된 membership/예약 subset만”인지 명시하지 않습니다.

## Proposed Solutions

### Option 1: member row는 유지하되 detail payload를 trainer-scoped subset으로 제한

**Approach:** 리스트는 member 단위로 보여주되, trainer가 들어오는 detail/membership/reservation 데이터는 `assigned_trainer_id = currentUserId` 범위만 내려줍니다.

**Pros:**
- UI를 크게 복잡하게 만들지 않습니다.
- 요구사항의 member list 형태를 유지할 수 있습니다.

**Cons:**
- “같은 회원인데 일부 정보만 보이는” 구조를 UI에서 명확히 설명해야 합니다.
- detail DTO 설계가 섬세해야 합니다.

**Effort:** Medium

**Risk:** Medium

---

### Option 2: 예약 관리 리스트를 member row가 아니라 membership-backed row로 바꾼다

**Approach:** 리스트 한 줄이 사실상 `member + scoped membership` 조합이 되도록 바꿉니다.

**Pros:**
- trainer scope와 UI 단위가 일치합니다.
- 과노출 위험이 낮습니다.

**Cons:**
- 한 회원이 여러 줄로 보일 수 있어 UX가 무거워집니다.
- 요구사항의 “회원 리스트” 감각과 조금 멀어집니다.

**Effort:** Medium-Large

**Risk:** Low-Medium

## Recommended Action


## Technical Details

**Affected files:**
- `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-10-feat-trainer-scoped-reservation-management-plan.md`
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/reservations/ReservationsSection.tsx`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberController.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/reservation/ReservationService.java`

**Related components:**
- member summary query
- reservation detail modal DTO
- trainer-scoped reservation queries

**Database changes (if any):**
- None beyond `assigned_trainer_id`, but all detail queries must consistently use it as scope source.

## Resources

- **Plan:** `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-10-feat-trainer-scoped-reservation-management-plan.md`
- **Brainstorm:** `/Users/abc/projects/GymCRM_V2/docs/brainstorms/2026-03-10-trainer-scoped-reservation-management-brainstorm.md`

## Acceptance Criteria

- [ ] 플랜에 trainer가 member row를 눌렀을 때 어떤 membership/reservation subset을 보는지 명시돼 있다.
- [ ] member summary의 중복 제거와 detail payload scope가 서로 모순되지 않는다.
- [ ] trainer가 비담당 membership/예약을 보지 못한다는 규칙이 문서에 명확히 들어간다.
- [ ] 상세 모달/상세 패널의 데이터 단위(member 전체 vs scoped membership subset)가 구현 전에 고정된다.

## Work Log

### 2026-03-11 - Initial Discovery

**By:** Codex

**Actions:**
- 플랜의 membership canonical source 결정과 member 단위 UI 설명을 함께 검토했습니다.
- member row 압축과 trainer scope 사이에 과노출 가능성이 남는다는 점을 정리했습니다.
- 상세 모달/패널의 데이터 단위를 플랜에서 먼저 고정해야 한다고 판단했습니다.

**Learnings:**
- `canonical source = membership` 라는 결정을 했더라도, UI가 member 단위면 scope 규칙을 추가로 적어야 합니다.
- 이 부분을 미리 고정하지 않으면 구현자가 편한 쪽으로 전체 member detail을 열 가능성이 큽니다.

### 2026-03-11 - Plan Updated

**By:** Codex

**Actions:**
- 플랜에 member row는 유지하되 trainer detail payload는 trainer-scoped membership/reservation subset만 보여준다고 명시했습니다.
- Phase, technical considerations, edge cases, acceptance criteria에 동일 규칙을 반영했습니다.

**Learnings:**
- member 단위 UI를 유지하더라도 detail payload scope를 따로 고정하면 membership canonical source와 충돌하지 않습니다.
