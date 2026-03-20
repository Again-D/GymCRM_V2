---
title: "feat: Members CRUD modal management for qwen packets"
type: feat
status: active
date: 2026-03-20
origin: docs/plans/2026-03-20-feat-members-crud-modal-management-plan.md
---

# feat: Members CRUD modal management for qwen packets

## Purpose

이 문서는 [`2026-03-20-feat-members-crud-modal-management-plan.md`](/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-20-feat-members-crud-modal-management-plan.md) 를 `qwen2.5-coder:7b-instruct` 의 `context 8k`, `output 2k` 제약에 맞게 잘게 쪼갠 실행용 packet plan이다.

목표는 한 번에 큰 refactor를 맡기지 않고, 각 packet이 독립적으로 이해 가능하고 검증 가능한 단위가 되게 만드는 것이다.

## Qwen Execution Rules

- 한 번에 하나의 packet만 실행한다.
- 각 packet에서는 명시된 파일만 우선적으로 읽는다.
- 한 packet의 변경 파일 수는 가능하면 `3~6개` 안에 유지한다.
- 한 packet의 결과 설명은 `무엇을 바꿨는지`, `왜 바꿨는지`, `검증 결과`만 짧게 출력한다.
- packet이 끝나면 바로 다음 packet으로 넘기지 말고, 테스트와 diff를 기준으로 끊는다.
- API 계약이 불명확하면 UI 구현으로 넘어가지 말고 `Packet 0` 결과를 먼저 확정한다.

## Shared Constraints

- `삭제`는 구현하지 않는다. `비활성화`만 구현한다.
- 비활성 회원은 목록에서 제거하지 않고 `비활성` 상태로 남긴다.
- 행 전체 클릭은 상세 모달 오픈이다.
- 행 버튼은 `회원권`, `예약`만 유지한다.
- `수정`, `비활성화`는 상세 모달 내부로 이동한다.
- mutation 성공 후에는 `members` invalidation과 `selectedMember` 동기화가 필요하다.
- modal은 기존 [`Modal.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/shared/ui/Modal.tsx) 계약을 그대로 따른다.

## Packet 0

### Goal

members CRUD가 실제로 구현 가능한 backend/frontend 계약인지 먼저 확인한다.

### Read First

- [`frontend/src/pages/members/modules/useMembersQuery.ts`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/modules/useMembersQuery.ts)
- [`frontend/src/pages/members/modules/types.ts`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/modules/types.ts)
- [`frontend/src/app/auth.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/app/auth.tsx)
- [`frontend/src/api/queryInvalidation.ts`](/Users/abc/projects/GymCRM_V2/frontend/src/api/queryInvalidation.ts)

### Tasks

1. 현재 members 도메인에서 이미 존재하는 API 호출 경로를 확인한다.
2. `POST /api/v1/members`, `PATCH /api/v1/members/:memberId`, 상태 변경용 endpoint 또는 status patch 가능 여부를 확인한다.
3. role gating 기준을 `prototype-admin / jwt-admin / jwt-trainer / jwt-anon` 으로 정리한다.
4. endpoint가 없으면 UI 구현 대신 mock/prototype fallback 계획을 문서에 남긴다.

### Done Criteria

- CRUD 가능/불가능 여부가 명시돼 있다.
- 사용할 endpoint shape 또는 fallback 전략이 문서로 남아 있다.
- 이후 packet에서 참조할 mutation naming이 고정돼 있다.

### Output Contract

- 확인된 endpoint 목록
- 권한 정책 요약
- 다음 packet 진행 가능 여부

## Packet 1

### Goal

member management state와 mutation ownership을 members domain에 추가한다.

### Read First

- [`frontend/src/pages/members/modules/types.ts`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/modules/types.ts)
- [`frontend/src/pages/products/modules/useProductPrototypeState.ts`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/products/modules/useProductPrototypeState.ts)
- [`frontend/src/api/queryInvalidation.ts`](/Users/abc/projects/GymCRM_V2/frontend/src/api/queryInvalidation.ts)

### Target Files

- `frontend/src/pages/members/modules/types.ts`
- `frontend/src/pages/members/modules/useMemberManagementState.ts`
- 필요 시 `frontend/src/pages/members/modules/index.ts` 또는 import 경로 파일

### Tasks

1. `MembersModalState` discriminated union을 추가한다.
2. `MemberFormState`를 추가한다.
3. create/edit/deactivate를 다루는 state hook 골격을 만든다.
4. submitting/error/success reset 규칙을 hook 안에서 정의한다.

### Done Criteria

- UI 없이도 modal state 전환 함수가 명확하다.
- form draft 초기화 함수가 있다.
- mutation 성공 후 어떤 invalidation/refresh가 필요한지 hook 수준에서 주석 또는 함수 이름으로 드러난다.

### Output Contract

- 새 hook/타입 추가 내용
- 아직 연결되지 않은 TODO

## Packet 2

### Goal

회원 목록 화면의 row click과 secondary action 분리를 먼저 안정화한다.

### Read First

- [`frontend/src/pages/members/components/MemberListSection.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/MemberListSection.tsx)
- [`frontend/src/pages/members/MemberList.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/MemberList.tsx)
- [`frontend/src/pages/members/modules/SelectedMemberContext.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/modules/SelectedMemberContext.tsx)

### Tasks

1. 행 전체 클릭이 상세 모달 open state를 열도록 정리한다.
2. `회원권`, `예약` 버튼이 row click과 충돌하지 않도록 propagation을 분리한다.
3. 기존 `선택` 중심 액션을 제거하고 행 interaction을 단순화한다.

### Done Criteria

- row click으로만 상세 모달이 열린다.
- `회원권`, `예약` 버튼 클릭 시 상세 모달이 열리지 않는다.
- 목록 스캔 레이아웃이 유지된다.

### Tests

- `MemberListSection.test.tsx` 에 row click / nested button propagation 테스트

## Packet 3

### Goal

상세 모달을 CRUD entry point로 정리한다.

### Read First

- [`frontend/src/pages/members/components/SelectedMemberSummaryCard.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/SelectedMemberSummaryCard.tsx)
- [`frontend/src/shared/ui/Modal.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/shared/ui/Modal.tsx)
- [`frontend/src/pages/members/modules/SelectedMemberContext.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/modules/SelectedMemberContext.tsx)

### Tasks

1. 상세 모달 footer 또는 action zone에 `수정`, `비활성화`, `회원권`, `예약`을 배치한다.
2. 상세 surface와 편집 surface의 책임을 분리한다.
3. 상세 모달에서 edit/deactivate modal로 넘어가는 open state 전환을 연결한다.

### Done Criteria

- 상세 모달은 읽기 중심이고, 관리 액션의 진입점 역할만 한다.
- 목록에는 더 이상 edit/deactivate 버튼이 없다.
- `SelectedMemberSummaryCard` 가 상세 모달 안에서 자연스럽게 재사용된다.

## Packet 4

### Goal

회원 등록 모달을 추가한다.

### Read First

- [`frontend/src/pages/members/MemberList.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/MemberList.tsx)
- [`frontend/src/pages/members/components/MemberListSection.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/MemberListSection.tsx)
- [`frontend/src/shared/ui/Modal.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/shared/ui/Modal.tsx)
- [`frontend/src/pages/members/modules/useMemberManagementState.ts`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/modules/useMemberManagementState.ts)

### Tasks

1. 상단 `회원 등록` 버튼을 추가한다.
2. create modal을 추가한다.
3. 1차 폼 필드만 넣는다:
   - 이름
   - 연락처
   - 성별
   - 생년월일
   - 메모
4. 성공 시 목록 invalidation이 일어나도록 연결한다.

### Done Criteria

- 등록 버튼이 보인다.
- 등록 모달이 열리고 닫힌다.
- 성공 후 목록이 새 상태로 갱신된다.

### Tests

- 등록 버튼 노출/권한
- 모달 open/close
- 성공 시 invalidate 호출 또는 목록 재조회 계약

## Packet 5

### Goal

회원 수정 모달을 추가한다.

### Read First

- [`frontend/src/pages/members/components/SelectedMemberSummaryCard.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/SelectedMemberSummaryCard.tsx)
- [`frontend/src/pages/members/modules/useMemberManagementState.ts`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/modules/useMemberManagementState.ts)
- [`frontend/src/pages/members/modules/SelectedMemberContext.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/modules/SelectedMemberContext.tsx)

### Tasks

1. 상세 모달에서 `수정`을 누르면 edit modal이 열린다.
2. 기존 회원 정보로 form draft를 초기화한다.
3. 성공 시 목록과 selected member detail을 함께 갱신한다.

### Done Criteria

- edit modal 진입이 가능하다.
- 수정 후 목록과 상세가 같은 값을 보여준다.
- 현재 선택 회원이 stale 상태로 남지 않는다.

### Tests

- draft preload
- 성공 후 selected member refresh

## Packet 6

### Goal

회원 비활성화 flow를 추가한다.

### Read First

- [`frontend/src/pages/members/modules/types.ts`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/modules/types.ts)
- [`frontend/src/pages/members/modules/useMemberManagementState.ts`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/modules/useMemberManagementState.ts)
- [`frontend/src/pages/members/components/SelectedMemberSummaryCard.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/SelectedMemberSummaryCard.tsx)

### Tasks

1. 상세 모달에서 `비활성화` 액션을 연다.
2. 확인 모달 또는 확인 step을 추가한다.
3. 성공 후 목록에서 회원을 제거하지 않고 상태만 `비활성`으로 남긴다.
4. selected member 처리 정책을 구현한다.

### Done Criteria

- 비활성화는 별도 확인 단계를 거친다.
- 목록에서 회원이 사라지지 않는다.
- 상태 표시는 한국어 UI 계약과 일치한다.

### Tests

- 비활성화 confirm
- 목록 상태 반영
- selected member sync 또는 clear

## Packet 7

### Goal

role gating을 붙여 live/prototype 권한 차이를 정리한다.

### Read First

- [`frontend/src/app/auth.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/app/auth.tsx)
- [`frontend/src/pages/members/MemberList.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/MemberList.tsx)
- [`frontend/src/pages/members/components/MemberListSection.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/MemberListSection.tsx)

### Tasks

1. `prototype-admin`, `jwt-admin`만 create/edit/deactivate를 보게 한다.
2. `jwt-trainer`는 조회와 handoff만 가능하게 한다.
3. `jwt-anon`은 기존 auth gating을 유지한다.

### Done Criteria

- mutation UI가 role에 따라 일관되게 숨겨지거나 비활성화된다.
- read-only role에서 row click 상세는 유지할지 여부가 정책대로 반영된다.

## Packet 8

### Goal

테스트와 문서를 정리해 회귀 신호를 고정한다.

### Read First

- 관련 members 테스트 파일 전체
- [`docs/plans/2026-03-20-feat-members-crud-modal-management-plan.md`](/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-20-feat-members-crud-modal-management-plan.md)

### Tasks

1. members CRUD packet에서 추가된 테스트를 정리한다.
2. plan 문서에 완료 상태를 반영한다.
3. 필요한 경우 browser validation note를 남긴다.

### Done Criteria

- `npm test` 통과
- `npm run build` 통과
- plan/doc status가 실제 구현 상태와 맞는다

## Recommended Prompting Pattern

각 packet을 qwen에 넘길 때는 문서 전체를 붙이지 말고 아래 형식을 추천한다.

1. 목표 한 줄
2. 대상 파일 목록
3. 고정 제약 4~6개
4. 완료 조건
5. 검증 명령

예시:

```text
Packet 4를 수행한다.

목표:
- 회원 등록 모달 추가

대상 파일:
- frontend/src/pages/members/MemberList.tsx
- frontend/src/pages/members/components/MemberListSection.tsx
- frontend/src/pages/members/modules/useMemberManagementState.ts

제약:
- 삭제는 구현하지 않는다.
- 행 버튼은 회원권/예약만 유지한다.
- 등록은 모달에서 처리한다.
- 성공 후 members invalidation이 필요하다.

완료 조건:
- 상단 등록 버튼이 보인다.
- 등록 모달이 열리고 닫힌다.
- 성공 시 목록이 갱신된다.

검증:
- npm test
- npm run build
```

## Handoff Guidance

- qwen에는 main plan과 packet plan을 동시에 전부 넣지 않는다.
- 먼저 이 문서에서 packet 하나를 고른다.
- 그 packet에 해당하는 관련 파일만 추가 컨텍스트로 준다.
- 결과가 나오면 다음 packet 전에 사람이 diff와 테스트 결과를 확인한다.
