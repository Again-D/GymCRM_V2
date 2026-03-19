---
title: "feat: Members selected member summary modal"
type: feat
status: completed
date: 2026-03-19
origin: docs/brainstorms/2026-03-13-frontend-field-ops-redesign-brainstorm.md
---

# feat: Members selected member summary modal

## Overview

회원관리 탭의 우측 `선택된 회원 정보` 패널을 제거하고, 선택된 회원 상세 컨텍스트를 모달로 옮긴다. 목표는 회원 목록 테이블의 가로폭을 회복해 스캔 가독성을 높이고, `선택된 회원 확인 → 다음 업무 이동` 흐름은 유지하는 것이다.

이 변경은 field-ops redesign의 핵심 결정인 “기본 페이지는 조회/스캔 중심, 집중 작업은 모달에서 수행” 원칙을 members 화면에도 일관되게 적용하는 작업이다 (see brainstorm: `docs/brainstorms/2026-03-13-frontend-field-ops-redesign-brainstorm.md`). 또한 members에서 memberships/reservations로 이어지는 selected-member handoff 구조는 그대로 보존한다.

## Problem Statement / Motivation

현재 [`frontend/src/pages/members/MemberList.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/MemberList.tsx) 는 `members-prototype-layout` 2열 구조를 사용해 좌측 회원 목록과 우측 `SelectedMemberSummaryCard`를 함께 렌더링한다. 이 구조는 다음 문제를 만든다.

- 회원 목록 테이블 컬럼 수가 많아 우측 패널이 상시 공간을 차지하면 행 내용이 세로로 꺾이기 쉽다.
- members 화면의 주 작업은 목록 스캔과 회원 선택인데, secondary surface가 항상 떠 있어 정보 밀도를 해친다.
- selected member 정보는 “항상 고정해서 읽는 정보”보다 “선택 후 잠깐 확인하는 컨텍스트”에 가깝다.
- 현재 field-ops redesign은 모달 중심 상호작용을 기준으로 굳어졌는데, members만 side-by-side detail panel을 유지하면 visual contract가 다시 흔들린다.

결론적으로, members 화면은 목록 스캔 성능을 최우선으로 두고, 선택된 회원 상세 정보는 집중형 surface로 분리하는 편이 더 맞다.

## Proposed Solution

### Chosen Direction

`우측 상세 패널 제거 + 선택 회원 정보 모달 + 작은 선택 컨텍스트 표시` 조합으로 간다.

- `MemberList`는 2열 레이아웃을 버리고 members list 중심의 1열 구조로 단순화한다.
- `SelectedMemberSummaryCard`는 독립 우측 패널이 아니라 modal content component로 재사용하거나, 같은 책임을 가진 modal surface로 바꾼다.
- 회원 선택 상태 자체는 계속 `SelectedMemberProvider`가 소유한다.
- members 화면 상단 KPI/헤더 또는 테이블 상단에 작은 `선택된 컨텍스트` 표시를 남겨, 현재 선택 회원이 누군지와 다음 업무 연결성을 잃지 않게 한다.
- row action은 다음처럼 재구성한다.
  - `선택`: 선택 상태만 갱신하고 summary modal을 연다.
  - `회원권`, `예약`: 현재처럼 해당 업무 화면으로 바로 이동한다. 선택 상태는 그대로 재사용한다.

이 방향은 “조회/스캔은 기본 페이지, 집중 확인은 모달”이라는 redesign 결정과 맞고 (see brainstorm: `docs/brainstorms/2026-03-13-frontend-field-ops-redesign-brainstorm.md`), 현재 members-to-memberships/reservations handoff도 그대로 유지한다.

## Local Research Summary

### Relevant Files

- layout entry:
  - [`frontend/src/pages/members/MemberList.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/MemberList.tsx)
- members list surface:
  - [`frontend/src/pages/members/components/MemberListSection.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/MemberListSection.tsx)
- selected member summary surface:
  - [`frontend/src/pages/members/components/SelectedMemberSummaryCard.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/SelectedMemberSummaryCard.tsx)
  - [`frontend/src/pages/members/components/SelectedMemberSummaryCard.module.css`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/SelectedMemberSummaryCard.module.css)
- selected member state ownership:
  - [`frontend/src/pages/members/modules/SelectedMemberContext.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/modules/SelectedMemberContext.tsx)
- shared modal primitive:
  - [`frontend/src/shared/ui/Modal.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/shared/ui/Modal.tsx)

### Existing Conventions

- selected member state는 이미 `members` 도메인이 소유하고 있고, memberships/reservations/access 등은 그 컨텍스트를 소비한다.
- modal은 shared primitive를 사용하며 focus trap, `aria-modal`, ESC close, scroll lock이 이미 정리돼 있다.
- 2026-03-13 field-ops redesign은 members도 representative surfaces에 포함했고, 주요 처리/집중 상호작용을 모달 중심으로 정리하기로 결정했다 (see brainstorm: `docs/brainstorms/2026-03-13-frontend-field-ops-redesign-brainstorm.md`).

### Institutional Learnings

- selected member ownership은 shell 전역이 아니라 `members` domain에서 소유하는 편이 맞다는 결정이 이미 정리돼 있다:
  - [`docs/plans/2026-03-13-refactor-main-selected-member-ownership-harvest-plan.md`](/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-13-refactor-main-selected-member-ownership-harvest-plan.md)
- modal surface는 focus trap, ESC close, scroll lock, labelled dialog contract를 공통 규약으로 유지해야 한다:
  - [`docs/plans/2026-02-27-feat-members-products-list-form-surface-separation-plan.md`](/Users/abc/projects/GymCRM_V2/docs/plans/2026-02-27-feat-members-products-list-form-surface-separation-plan.md)
- redesign 이후에도 shell/login-first/member handoff 구조는 유지되어야 한다:
  - [`docs/plans/2026-03-13-feat-frontend-field-ops-redesign-plan.md`](/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-13-feat-frontend-field-ops-redesign-plan.md)

### External Research Decision

외부 리서치는 생략한다. 이 작업은 새 라이브러리나 표준 도입이 아니라, 현재 코드베이스의 established modal contract와 selected member ownership을 members 화면에 다시 적용하는 범위다. local repo context와 existing plans가 충분하다.

## SpecFlow Analysis

### Primary User Flow

1. 운영자가 members 화면에 진입한다.
2. 회원 목록을 스캔하고 필터/검색으로 대상을 좁힌다.
3. `선택` 클릭 시 selected member state가 갱신된다.
4. summary modal이 열려 선택된 회원 정보를 집중형 surface에서 보여 준다.
5. 운영자는 모달에서 정보를 확인한 뒤:
   - 닫고 목록으로 돌아가거나
   - `회원권` / `예약` 같은 다음 업무로 이동하거나
   - 상단 작은 선택 배지를 통해 현재 컨텍스트를 인지한 채 목록을 계속 본다.

### Edge Cases To Handle

- selected member가 없을 때 summary modal open trigger가 노출되지 않거나 안전하게 disabled 되어야 한다.
- `selectMember(memberId)` 실패 시 modal이 열리면 안 된다.
- auth identity 변경으로 selected member가 clear 되면 modal도 stale 상태로 남지 않아야 한다.
- members list에서 선택한 뒤 memberships/reservations로 바로 이동하는 기존 빠른 경로는 유지되어야 한다.
- tablet 폭에서도 modal이 테이블보다 읽기 쉬운 surface가 되어야 하고, 목록 스캔성이 실제로 나아져야 한다.

## Technical Approach

### Architecture

이 작업은 state ownership을 바꾸지 않는다. 바꾸는 것은 members 화면의 surface composition이다.

- 유지:
  - `SelectedMemberProvider` ownership
  - `selectMember` / `clearSelectedMember` contract
  - row action을 통한 memberships/reservations handoff
- 변경:
  - `MemberList`의 2열 layout
  - `SelectedMemberSummaryCard`의 rendering position
  - members 화면에서 선택된 회원 정보를 보여 주는 interaction surface

### Implementation Plan

#### Phase 1: Surface Restructure

- [`frontend/src/pages/members/MemberList.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/MemberList.tsx) 에서 `SelectedMemberSummaryCard`를 상시 2열 패널로 렌더링하지 않도록 구조를 바꾼다.
- `members-prototype-layout` 의존을 줄이거나 제거하고 members list를 1열로 정리한다.
- 필요하면 members 전용 local layout class를 `MemberList.module.css` 또는 전용 module로 정리한다.

#### Phase 2: Modal Integration

- `SelectedMemberSummaryCard`를 modal content 용도로 재사용하거나, 모달 wrapper를 가진 thin container를 새로 만든다.
- `MemberListSection`에 local modal open state를 추가한다.
- `선택` 버튼의 동작을 `await selectMember(memberId)` 성공 시 modal open 으로 정리한다.
- 상단 KPI/헤더 근처에 현재 선택 회원을 보여 주는 작은 persistent badge/summary를 추가한다.

#### Phase 3: Action and State Guardrails

- modal 안에서 `선택 해제`, `회원권`, `예약` 액션을 어떻게 배치할지 확정한다.
- 선택 해제 시 modal close + selected member clear가 같은 UX로 닫히게 한다.
- auth identity change 또는 select failure 시 stale modal이 남지 않게 guard 한다.

#### Phase 4: Validation

- component tests:
  - modal open/close
  - select success / failure
  - clearSelectedMember path
  - selected member badge visibility
- browser smoke:
  - members list width improvement
  - select row -> modal open
  - modal -> memberships 이동
  - modal -> reservations 이동
  - tablet width at least one pass

## Alternative Approaches Considered

### A. 우측 패널 유지 + width만 조정

가장 작은 수정이지만, members의 primary surface가 계속 압축된다. 테이블 폭 부족 문제는 근본적으로 해소되지 않고, redesign의 modal-centered principle과도 어긋난다.

### B. 우측 패널을 drawer로 변경

집중형 surface라는 점은 개선되지만, 현재 repo의 shared interaction contract는 modal 쪽이 더 강하게 정리돼 있다. 이번 요구는 “선택 정보 확인” 성격이 강하고, members에서 drawer를 새 규칙으로 만들 이유가 약하다.

### C. 선택 요약을 inline expandable row로 변경

목록과 상세를 한 화면에서 섞을 수 있지만, 테이블 밀도가 더 무너질 가능성이 높고, selected member handoff 액션도 row마다 무거워진다.

## System-Wide Impact

### Interaction Graph

- row `선택` 클릭
  - `selectMember(memberId)` 호출
  - selected member store 업데이트
  - members 화면 local modal open
  - modal에서 `회원권` / `예약` 클릭 시 route transition
  - downstream workspace가 기존 selected member context 소비

### Error Propagation

- `selectMember` 실패 시:
  - selected member error는 store에 남고
  - modal은 열리지 않아야 하며
  - 목록 화면은 현재 위치를 유지해야 한다.

### State Lifecycle Risks

- modal open state와 selected member clear state가 분리돼 있으면 stale modal이 남을 수 있다.
- `selectMember` 비동기 완료 전에 modal을 열면 빈/오래된 내용이 보일 수 있다.
- auth change로 selected member가 clear 되는 경우 members 화면 modal도 함께 닫혀야 한다.

### API Surface Parity

- memberships/reservations는 이미 selected member context를 기준으로 동작하므로, 이 플랜은 API나 downstream workspace contract를 바꾸지 않는다.
- members 탭의 `회원권` / `예약` 버튼은 현재와 동일한 경로를 유지한다.

### Integration Test Scenarios

- members -> row select -> modal open -> close
- members -> row select -> modal -> memberships navigation
- members -> row select -> modal -> reservations navigation
- selectMember failure -> modal 미오픈 + 오류 유지
- auth identity change -> selected member clear + modal close

## Acceptance Criteria

### Functional Requirements

- [x] members 화면은 더 이상 상시 우측 summary 패널에 의존하지 않는다.
- [x] `선택` 액션은 성공 시 selected member summary modal을 연다.
- [x] `회원권`, `예약` 빠른 이동 흐름은 유지된다.
- [x] selected member가 없는 상태에서도 members 목록 사용성은 유지된다.
- [x] current selected member context는 작은 persistent 표시로 확인 가능하다.

### Non-Functional Requirements

- [x] modal은 기존 shared modal accessibility contract를 그대로 따른다.
- [x] members list의 가로 스캔성이 현재보다 개선된다.
- [x] tablet 폭에서 목록 + modal 조합이 사용 가능하다.

### Quality Gates

- [x] affected frontend tests pass
- [x] new members modal tests added
- [x] browser smoke on members modal flow passes
- [x] memberships/reservations handoff regression이 없다

## Success Metrics

- 회원 목록의 세로 줄바꿈과 과도한 셀 압축이 줄어든다.
- 운영자가 members 화면에서 “대상 스캔”과 “선택된 회원 확인”을 더 짧은 시선 이동으로 처리한다.
- selected member handoff 구조를 유지하면서도 members 자체는 더 목록 중심 화면처럼 느껴진다.

## Dependencies & Risks

### Dependencies

- existing `SelectedMemberProvider`
- shared `Modal` primitive
- members field-ops styling primitives

### Risks

- summary modal에 액션을 너무 많이 넣으면 members 화면이 또 다른 secondary workbench가 될 수 있다.
- selected member badge가 없으면 modal close 후 현재 컨텍스트가 보이지 않아 사용자가 혼란스러울 수 있다.
- 레이아웃만 바꾸고 테이블 자체의 min-width/overflow 정책을 점검하지 않으면 기대만큼 가독성이 좋아지지 않을 수 있다.

## Documentation Plan

- 구현 후 필요 시 field-ops redesign hardening note 또는 후속 validation note에 members modal smoke를 추가
- 필요 시 browser screenshot artifact를 `docs/notes/`에 남김

## Sources & References

### Origin

- Brainstorm document: [docs/brainstorms/2026-03-13-frontend-field-ops-redesign-brainstorm.md](/Users/abc/projects/GymCRM_V2/docs/brainstorms/2026-03-13-frontend-field-ops-redesign-brainstorm.md)
  - carried-forward decisions:
    - 주요 입력/처리는 모달 중심
    - 기본 페이지는 조회/스캔 중심
    - members는 representative surface 중 하나
    - shell/login-first/member handoff 구조는 유지

### Internal References

- members entry:
  - [`frontend/src/pages/members/MemberList.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/MemberList.tsx)
- members list:
  - [`frontend/src/pages/members/components/MemberListSection.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/MemberListSection.tsx)
- selected member summary:
  - [`frontend/src/pages/members/components/SelectedMemberSummaryCard.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/SelectedMemberSummaryCard.tsx)
- selected member ownership:
  - [`frontend/src/pages/members/modules/SelectedMemberContext.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/modules/SelectedMemberContext.tsx)
- shared modal:
  - [`frontend/src/shared/ui/Modal.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/shared/ui/Modal.tsx)

### Related Plans

- [`docs/plans/2026-03-13-feat-frontend-field-ops-redesign-plan.md`](/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-13-feat-frontend-field-ops-redesign-plan.md)
- [`docs/plans/2026-03-13-refactor-main-selected-member-ownership-harvest-plan.md`](/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-13-refactor-main-selected-member-ownership-harvest-plan.md)
- [`docs/plans/2026-02-27-feat-members-products-list-form-surface-separation-plan.md`](/Users/abc/projects/GymCRM_V2/docs/plans/2026-02-27-feat-members-products-list-form-surface-separation-plan.md)
