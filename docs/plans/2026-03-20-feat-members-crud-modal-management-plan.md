---
title: "feat: Members CRUD modal management"
type: feat
status: active
date: 2026-03-20
origin: docs/brainstorms/2026-03-13-frontend-field-ops-redesign-brainstorm.md
---

# feat: Members CRUD modal management

## Enhancement Summary

**Deepened on:** 2026-03-20

이번 보강에서 plan은 다음 지점을 더 명확히 고정했다.

1. mutation ownership을 `products` 패턴처럼 domain hook으로 두고, UI는 orchestration만 맡긴다.
2. `members` query invalidation과 `selectedMember` refresh/clear 정책을 분리해 stale detail 리스크를 줄인다.
3. role gating을 `prototype-admin / jwt-admin / jwt-trainer / jwt-anon` 기준으로 검증 가능한 표로 구체화한다.
4. 상세/등록/수정/비활성화 모달의 open state를 하나의 discriminated union으로 관리하는 방향을 명시한다.
5. 구현 전에 live backend CRUD endpoint 가용성 여부를 Gate 0로 확인하도록 추가했다.

### Key Improvements

- shared modal contract를 members CRUD에 그대로 이식하기 위한 focus/close/initial-focus 규칙을 plan에 넣었다.
- member mutation 성공 후 list/detail/selectedMember 동기화 순서를 단계별로 구체화했다.
- browser validation을 데스크톱뿐 아니라 태블릿 width까지 대표 시나리오로 분리했다.

## Overview

회원관리 탭에 회원 `등록`, `수정`, `비활성화` 기능을 추가한다. 기본 페이지는 여전히 회원 목록 스캔과 빠른 handoff에 집중하고, 생성/편집/상태 변경은 모달에서 처리한다. 이 작업은 `Members` 화면을 “목록 중심 + 집중 작업은 모달”로 유지하면서 운영자에게 필요한 회원 CRUD를 제공하는 것이 목표다 (see brainstorm: `docs/brainstorms/2026-03-13-frontend-field-ops-redesign-brainstorm.md`).

현재까지 결정된 UX는 다음과 같다.

- 상단에 `회원 등록` 버튼을 둔다.
- 행 전체 클릭은 상세 모달 오픈으로 사용한다.
- 행 버튼은 `회원권`, `예약`만 유지한다.
- `수정`, `비활성화`는 상세 모달 안으로 이동한다.
- `삭제` 대신 `비활성화`를 사용하고, 비활성 회원은 목록에서 계속 보이되 상태로 구분한다.

이 구조는 회원관리 탭의 역할을 “전체 탐색/편집 중심 화면”으로 유지하면서도, 회원권/예약으로의 빠른 handoff 패턴은 그대로 보존한다 (see brainstorm: `docs/brainstorms/2026-03-09-membership-reservation-member-selection-flow-brainstorm.md`).

## Problem Statement / Motivation

현재 [`frontend/src/pages/members/components/MemberListSection.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/MemberListSection.tsx) 에는 회원 목록 조회, 선택, 상세 모달, 회원권/예약 이동만 존재한다. 회원 자체를 관리하는 mutation 흐름은 없다.

이 상태의 문제는 다음과 같다.

- 회원관리 탭이라는 이름과 달리 실제 운영 CRUD가 빠져 있다.
- 회원 등록/수정/비활성화를 다른 화면이나 임시 도구에 의존해야 한다.
- 목록 행에 액션을 계속 추가하면 테이블 스캔성이 빠르게 무너진다.
- `selectedMember` ownership, memberships/reservations handoff, modal-centered interaction 같은 최근 구조 결정을 깨뜨리지 않고 CRUD를 넣을 설계가 필요하다.

## Proposed Solution

### Chosen Direction

Members 화면은 그대로 `목록 중심`으로 유지하고, 회원 CRUD는 `모달 중심`으로 넣는다.

- 상단 hero 또는 section header에 `회원 등록` primary action 추가
- 목록 행 클릭으로 `회원 상세 모달` 오픈
- 행 버튼은 `회원권`, `예약`만 유지
- 상세 모달 내부에서 `수정`, `비활성화` 실행
- `비활성화`는 confirm modal 또는 confirm step을 거쳐 실행
- 비활성 회원은 목록에서 제거하지 않고 `memberStatus = INACTIVE` 로 유지

이 방향은 “기본 페이지는 조회/스캔 중심, 집중 작업은 모달” 원칙과 일치한다 (see brainstorm: `docs/brainstorms/2026-03-13-frontend-field-ops-redesign-brainstorm.md`). 또한 memberships/reservations는 여전히 독립 탭으로 유지하고, 회원관리에서 해당 탭으로 빠르게 넘기는 현재 흐름도 유지한다 (see brainstorm: `docs/brainstorms/2026-03-09-membership-reservation-member-selection-flow-brainstorm.md`).

### Scope Boundaries

1차 범위는 `기본 프로필 정보 CRUD + 비활성화`까지만 포함한다.

- 포함:
  - 회원 등록
  - 회원 수정
  - 회원 비활성화
  - 목록/상세/selected member 동기화
- 제외:
  - 회원 물리 삭제
  - 회원권, 예약, 트레이너 배정 편집
  - 대량 수정
  - 별도 drawer/panel 패턴 도입

## Technical Considerations

- 현재 members query ownership은 [`useMembersQuery.ts`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/modules/useMembersQuery.ts) 에 있다.
- selected member ownership은 [`SelectedMemberContext.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/modules/SelectedMemberContext.tsx) 가 갖고 있다.
- 상세 모달 contract는 이미 [`Modal.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/shared/ui/Modal.tsx) 로 정리돼 있다.
- `memberStatus`는 이미 `ACTIVE | INACTIVE` 로 정의돼 있어, 비활성화는 별도 삭제 모델보다 상태 변경으로 처리하는 편이 자연스럽다.
- role gating은 기존 live-mode 정책을 따라 `ROLE_CENTER_ADMIN` 중심으로 mutation 허용을 검토해야 한다.
- query invalidation 인프라는 [`queryInvalidation.ts`](/Users/abc/projects/GymCRM_V2/frontend/src/api/queryInvalidation.ts) 에 있고, `members` domain versioning이 이미 준비돼 있다.
- product mutation pattern은 [`useProductPrototypeState.ts`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/products/modules/useProductPrototypeState.ts) 에 있으며, `create/edit/status-toggle -> invalidateQueryDomains(["products"]) -> selected entity sync` 흐름을 members에도 유사하게 적용할 수 있다.
- 현재 worktree에는 unrelated local edits가 있으므로, 구현 전 `frontend/src/pages/members/components/MemberListSection.tsx` 와 [`frontend/src/index.css`](/Users/abc/projects/GymCRM_V2/frontend/src/index.css) 의 pending changes를 다시 확인해야 한다.

## System-Wide Impact

- **Interaction graph**: 상단 `회원 등록` 또는 상세 모달 `수정/비활성화` -> member mutation hook 호출 -> members invalidation/reload -> 필요 시 selected member refresh or clear -> memberships/reservations handoff 유지.
- **Error propagation**: mutation 실패 시 목록 상태를 깨지 않고 modal 내부에 에러를 표시해야 한다. 성공 시에는 목록과 상세 컨텍스트가 같은 결과를 보여야 한다.
- **State lifecycle risks**: 수정 성공 후 selected member detail이 stale 상태로 남을 수 있다. 비활성화 대상이 selected member일 경우, modal close와 selected member refresh/clear 정책을 명확히 해야 한다.
- **API surface parity**: members list summary와 selected member detail은 같은 회원 상태를 표현해야 한다. 등록/수정/비활성화 후 list/detail 간 상태 차이가 없어야 한다.
- **Integration test scenarios**:
  - 회원 등록 성공 -> 목록 재조회 -> 신규 회원 표시
  - 상세 모달에서 수정 성공 -> 목록 상태/selected member 상태 동시 갱신
  - 비활성화 성공 -> 목록에 남아 있으나 `비활성` 상태로 표시
  - 비활성화 대상이 현재 selected member일 때 memberships/reservations handoff가 어떻게 동작하는지 명확히 검증

## Local Research Summary

### Relevant Files

- members list surface:
  - [`frontend/src/pages/members/components/MemberListSection.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/MemberListSection.tsx)
- selected member state:
  - [`frontend/src/pages/members/modules/SelectedMemberContext.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/modules/SelectedMemberContext.tsx)
- members list query:
  - [`frontend/src/pages/members/modules/useMembersQuery.ts`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/modules/useMembersQuery.ts)
- shared invalidation:
  - [`frontend/src/api/queryInvalidation.ts`](/Users/abc/projects/GymCRM_V2/frontend/src/api/queryInvalidation.ts)
- members types:
  - [`frontend/src/pages/members/modules/types.ts`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/modules/types.ts)
- shared modal pattern references:
  - [`frontend/src/pages/products/ProductsPage.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/products/ProductsPage.tsx)
  - [`frontend/src/pages/lockers/LockersPage.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/lockers/LockersPage.tsx)
- auth role context:
  - [`frontend/src/app/auth.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/app/auth.tsx)

### Institutional Learnings

- modal contract는 공통 접근성 규약을 따라야 한다:
  - [`docs/plans/2026-03-13-feat-frontend-field-ops-redesign-plan.md`](/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-13-feat-frontend-field-ops-redesign-plan.md)
- members는 전체 탐색/편집 중심 화면으로 남고, memberships/reservations는 후속 업무 탭 역할을 유지해야 한다:
  - [`docs/brainstorms/2026-03-09-membership-reservation-member-selection-flow-brainstorm.md`](/Users/abc/projects/GymCRM_V2/docs/brainstorms/2026-03-09-membership-reservation-member-selection-flow-brainstorm.md)
- field-ops redesign 이후 주요 입력/처리는 모달 중심으로 설계한다:
  - [`docs/brainstorms/2026-03-13-frontend-field-ops-redesign-brainstorm.md`](/Users/abc/projects/GymCRM_V2/docs/brainstorms/2026-03-13-frontend-field-ops-redesign-brainstorm.md)

### External Research Decision

외부 리서치는 생략한다. 현재 코드베이스에 modal pattern, selected member ownership, list query invalidation, role-gated workspace 패턴이 이미 충분히 축적돼 있다. 이번 작업은 새 라이브러리나 외부 서비스 연동이 아니라, members 도메인에 mutation과 modal workflow를 추가하는 범위다.

### Section Manifest

- Overview / Problem Statement
  - members 화면 역할을 유지하면서 CRUD를 추가하는 scope definition
- Proposed Solution
  - 목록/행/상세 모달 액션 분리
- Technical Approach
  - mutation hook, invalidation, selected member sync, role gating
- Implementation Phases
  - endpoint 확인 -> domain foundation -> UI modal integration -> validation
- Acceptance Criteria
  - list scanning, modal CRUD, handoff preservation, role behavior

## SpecFlow Analysis

### Primary User Flow

1. 운영자가 회원관리 탭에 진입한다.
2. 회원 목록을 검색/필터로 좁힌다.
3. 필요하면 상단 `회원 등록` 버튼으로 신규 회원 등록 모달을 연다.
4. 행을 클릭해 상세 모달을 연다.
5. 상세 모달에서:
   - 회원 정보를 확인하거나
   - `수정` 모달을 열거나
   - `비활성화` 확인 모달을 실행하거나
   - `회원권` / `예약`으로 이동한다.
6. mutation 성공 후 목록과 선택 컨텍스트가 일관되게 갱신된다.

### Edge Cases To Handle

- 등록 성공 후 신규 회원을 자동 선택할지 여부
- 수정 성공 후 상세 모달을 유지할지 닫을지
- 비활성화한 회원이 현재 selected member일 때 상세 모달과 selected member context를 어떻게 정리할지
- trainer/read-only 역할에서 mutation UI를 숨기거나 비활성화할지
- live API가 아직 CRUD endpoint를 제공하지 않는 경우 prototype/live parity를 어떻게 나눌지
- 행 전체 클릭과 행 내부 `회원권` / `예약` 버튼 클릭이 충돌하지 않도록 event propagation을 분리해야 한다.
- 비활성 회원을 `회원권`, `예약`으로 계속 넘길지 여부를 backend/business rule과 맞춰야 한다.
- 등록/수정 모달의 initial focus를 첫 입력 필드로 줄지, 설명 텍스트로 줄지 접근성 규칙을 명확히 해야 한다.

## Technical Approach

### Architecture

members domain에 `member mutation hook` 을 추가한다. 책임은 다음처럼 분리한다.

- `useMembersQuery`
  - 목록 조회와 cache/invalidation 유지
- `SelectedMemberContext`
  - 현재 선택 회원 detail ownership 유지
- `useMemberManagementState` 또는 유사한 전용 hook
  - 등록/수정/비활성화 modal open state
  - form draft/state
  - mutation submitting/message/error
  - 성공 후 members query + selected member refresh orchestration

권장 open state shape:

```ts
type MembersModalState =
  | { kind: "none" }
  | { kind: "detail"; memberId: number }
  | { kind: "create" }
  | { kind: "edit"; memberId: number }
  | { kind: "deactivate"; memberId: number };
```

이 방식은 boolean 여러 개를 병렬로 두는 것보다 충돌 상태를 줄인다.

### Data Contracts To Add

1차 form contract는 `기본 프로필 정보`만 다룬다.

- `memberName`
- `phone`
- `gender`
- `birthDate`
- `memo`
- 필요 시 `memberStatus`는 수정에서는 read-only 또는 hidden, 비활성화는 별도 action으로만 변경

권장 type 추가:

```ts
type MemberFormState = {
  memberName: string;
  phone: string;
  gender: "MALE" | "FEMALE" | "OTHER" | "";
  birthDate: string;
  memo: string;
};
```

### Sync Contract

mutation 성공 후 sync 순서는 아래처럼 고정한다.

1. mutation 응답 수신
2. `invalidateQueryDomains(["members"])`
3. 목록 재조회 또는 invalidation-driven reload
4. 대상 회원이 현재 selected member면:
   - 수정 성공: `selectMember(memberId)`로 detail refresh
   - 비활성화 성공: 정책에 따라 `selectMember(memberId)`로 비활성 detail refresh 또는 `clearSelectedMember()`
5. 관련 modal 정리

이 순서를 지키지 않으면 list/detail 상태가 쉽게 갈라진다.

### Role Matrix

| Runtime preset / role | 목록 조회 | 상세 모달 | 회원 등록 | 회원 수정 | 회원 비활성화 |
|---|---|---|---|---|---|
| `prototype-admin` | 허용 | 허용 | 허용 | 허용 | 허용 |
| `jwt-admin` | 허용 | 허용 | 허용 | 허용 | 허용 |
| `jwt-trainer` | 권한 범위 내 조회 | 권한 범위 내 상세 | 숨김/비활성 | 숨김/비활성 | 숨김/비활성 |
| `jwt-anon` | 로그인 리다이렉트 | 없음 | 없음 | 없음 | 없음 |

### Implementation Phases

#### Phase 0: Contract Audit

- live backend가 실제로 아래 endpoint를 제공하는지 확인
  - `POST /api/v1/members`
  - `PATCH /api/v1/members/:memberId`
  - `PATCH /api/v1/members/:memberId/status` 또는 동등 endpoint
- live endpoint가 없으면:
  - prototype-only mutation으로 한정할지
  - UI를 admin prototype에서만 먼저 열지
  - live mode는 read-only로 유지할지 결정

Phase 0 note, 2026-03-20:

- backend [`MemberController.java`](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberController.java) 에서 `POST /api/v1/members`, `PATCH /api/v1/members/{memberId}` 가 확인됐다.
- 별도 status endpoint는 없고, 비활성화는 `PATCH /api/v1/members/{memberId}` 에 `memberStatus: "INACTIVE"` 를 보내는 방식으로 처리해야 한다.
- live 권한은 `PROTOTYPE_OR_CENTER_ADMIN_OR_DESK` 기준이고, trainer는 read-only 로 유지해야 한다.
- frontend mock/prototype layer에는 member mutation helper가 없어서, Phase 1 에서 mock parity를 먼저 추가해야 한다.

#### Phase 1: Domain Mutation Foundation

- members 도메인에 create/update/deactivate 인터페이스 추가
- prototype/live mode에서 사용할 mutation ownership 위치 확정
- query invalidation 키와 selected member refresh 정책 명문화
- `useProductPrototypeState` 패턴처럼 panel/form message, submitting, selected entity sync 흐름 재사용
- form input validation 규칙을 local helper로 분리
- mock mutation helper가 필요하면 `api/mockData.ts`에 추가하되, list/detail 응답 shape 일관성 유지

#### Phase 2: Members UI Surface Integration

- [`MemberListSection.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/MemberListSection.tsx) 에 상단 `회원 등록` 버튼 추가
- 행 전체 클릭 = 상세 모달 오픈 패턴 정리
- 행 버튼은 `회원권`, `예약`만 유지
- 상세 모달 footer/action zone에 `수정`, `비활성화` 이동
- row click과 내부 버튼 click 간 event propagation 차단
- 기존 selected member summary modal을 members CRUD entry point로 재구성
- read-only role에서는 행 click 상세는 유지하되 mutate CTA는 숨김 또는 disabled note 처리

#### Phase 3: Member Form & Confirm Modals

- 등록 모달
- 수정 모달
- 비활성화 확인 모달
- 기본 프로필 필드만 1차 범위로 구현
- form modal initial focus를 첫 입력 필드에 두고, confirm modal initial focus는 취소 버튼 또는 안전 버튼에 둔다
- mutation 실패 메시지는 modal 내부에 남기고, 목록 panel 에러와 섞지 않는다

#### Phase 4: Sync, Role Gating, Validation

- mutation 후 목록/상세/선택 상태 동기화
- read-only role gating
- component/integration tests
- browser smoke on desktop + tablet

### Validation Matrix

| Scenario | Expected result |
|---|---|
| 관리자 -> 회원 등록 성공 | 목록에 신규 회원 표시, 상태 `활성`, 필요 시 상세 모달 진입 가능 |
| 관리자 -> 상세 모달 -> 수정 성공 | 목록 row와 selected member detail이 함께 갱신 |
| 관리자 -> 상세 모달 -> 비활성화 성공 | 목록에 회원이 남아 있고 상태만 `비활성`으로 변경 |
| 트레이너 -> 회원 목록 진입 | 조회/선택은 가능해도 CRUD CTA는 노출되지 않음 |
| 행 click 후 `회원권` 버튼 클릭 | 상세 모달 대신 회원권 화면으로 직접 handoff |
| 행 click 후 `예약` 버튼 클릭 | 상세 모달 대신 예약 화면으로 직접 handoff |

## Alternative Approaches Considered

### A. 행 액션에 `수정`, `비활성화`까지 모두 노출

장점:
- 접근 경로가 직관적이다.

단점:
- 현재도 `회원권`, `예약`이 있어 행 액션이 금방 과밀해진다.
- 목록 스캔성과 테이블 밀도가 나빠진다.

### B. 상세 모달에서 바로 인라인 편집 모드 토글

장점:
- surface 수가 줄어든다.

단점:
- 상세 확인과 폼 입력 상태가 섞여 modal state가 복잡해진다.
- validation/error/retry가 지저분해지기 쉽다.

### C. 삭제 기능 제공

장점:
- 개념상 단순해 보인다.

단점:
- memberships/reservations/access/settlements/CRM 이력과 충돌할 가능성이 높다.
- 운영툴에서 물리 삭제는 데이터 정합성 리스크가 크다.

선택하지 않는다. `비활성화`가 더 안전하다.

## Acceptance Criteria

### Functional Requirements

- [x] 회원관리 탭 상단에서 신규 회원 등록 모달을 열 수 있다.
- [x] 회원 목록 행 클릭으로 상세 모달을 열 수 있다.
- [x] 행 버튼은 `회원권`, `예약`만 유지된다.
- [x] 상세 모달에서 `수정`, `비활성화`, `회원권`, `예약` 액션을 제공한다.
- [x] 비활성화된 회원은 목록에 계속 남고 `비활성` 상태로 구분된다.

### Non-Functional Requirements

- [x] modal은 기존 shared modal accessibility contract를 따른다.
- [x] members 목록 스캔성이 현재보다 나빠지지 않는다.
- [x] selected member context와 memberships/reservations handoff가 회귀하지 않는다.

### Quality Gates

- [x] members CRUD mutation tests added
- [x] list/detail/sync regression tests added
- [x] browser smoke on members CRUD modal flow passes
- [x] role-gated read-only behavior validated
- [x] row click vs nested action button propagation regression test added
- [x] inactive member rendering and filter compatibility verified

## Dependencies & Risks

- live backend가 member create/update/deactivate endpoint를 아직 제공하지 않을 수 있다.
- selected member refresh 정책을 잘못 잡으면 수정 직후 상세 모달과 목록 상태가 어긋날 수 있다.
- 비활성화 이후 memberships/reservations에서 해당 회원을 어떻게 다룰지 backend 정책과 합이 맞아야 한다.
- dirty worktree 상태에서 plan만 우선 작성했으므로, 구현 전 unrelated local changes 재확인이 필요하다.
- `MemberListSection.tsx` 가 최근 row click 동작으로 바뀐 상태라, nested button propagation 버그를 같이 정리하지 않으면 상세 모달과 direct handoff가 충돌할 수 있다.

## Documentation Plan

- 구현 후 members CRUD flow를 field-ops redesign 후속 note 또는 별도 validation note로 남긴다.
- backend endpoint 부재로 prototype-only 범위가 되면, plan 또는 note에 live follow-up 조건을 명시한다.
- browser artifact는 최소:
  - members list baseline
  - create member modal
  - detail -> edit modal
  - detail -> deactivate confirm
  - inactive row state

## Success Metrics

- 운영자가 members 탭에서 회원 생성/수정/비활성화를 직접 처리할 수 있다.
- 목록 행 액션이 과밀해지지 않고, 스캔 중심 화면 역할이 유지된다.
- selected member handoff 구조를 유지한 채 members가 실제 관리 화면으로 확장된다.

## Sources & References

### Origin

- **Brainstorm document:** [`docs/brainstorms/2026-03-13-frontend-field-ops-redesign-brainstorm.md`](/Users/abc/projects/GymCRM_V2/docs/brainstorms/2026-03-13-frontend-field-ops-redesign-brainstorm.md)
  - carried-forward decisions:
    - 기본 페이지는 조회/스캔 중심
    - 주요 입력/처리는 모달 중심
    - Members는 representative surface 중 하나
- **Related brainstorm:** [`docs/brainstorms/2026-03-09-membership-reservation-member-selection-flow-brainstorm.md`](/Users/abc/projects/GymCRM_V2/docs/brainstorms/2026-03-09-membership-reservation-member-selection-flow-brainstorm.md)
  - carried-forward decisions:
    - 회원관리 탭에서 memberships/reservations로의 빠른 handoff 유지
    - 각 탭의 역할 분리를 흐리지 않음

### Internal References

- [`frontend/src/pages/members/components/MemberListSection.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/MemberListSection.tsx)
- [`frontend/src/pages/members/modules/useMembersQuery.ts`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/modules/useMembersQuery.ts)
- [`frontend/src/pages/members/modules/SelectedMemberContext.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/modules/SelectedMemberContext.tsx)
- [`frontend/src/pages/products/ProductsPage.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/products/ProductsPage.tsx)
- [`frontend/src/pages/lockers/LockersPage.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/lockers/LockersPage.tsx)
