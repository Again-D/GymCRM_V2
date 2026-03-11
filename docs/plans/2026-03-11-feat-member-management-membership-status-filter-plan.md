---
title: feat: Add member management membership status filter
type: feat
status: completed
date: 2026-03-11
---

# feat: Add member management membership status filter

## Overview
회원 관리 화면에 `회원권 상태` 필터를 추가한다. 이 필터는 회원 목록에 이미 표시되는 요약 상태값을 그대로 사용한다.

대상 상태:
- `전체`
- `정상`
- `홀딩중`
- `만료임박`
- `만료`
- `없음`

## Problem Statement / Motivation
현재 회원 관리 화면은 이름, 연락처, 담당 트레이너, 상품, 기간 필터까지 제공하지만, 운영에서 자주 필요한 `홀딩중 회원만 보기`, `만료임박 회원만 보기` 같은 상태 기준 조회가 불가능하다.

이미 백엔드는 `membershipOperationalStatus`를 계산해 목록에 내려주고 있으므로, 같은 개념을 필터로 노출하는 것이 가장 자연스럽다.

## Proposed Solution
작게 구현한다.

1. 프런트 회원 관리 툴바에 `회원권 상태` select를 추가한다.
2. `/api/v1/members`에 `membershipOperationalStatus` query param을 추가한다.
3. 백엔드 member summary를 기존처럼 먼저 계산한다.
4. 계산된 summary 결과에서 상태가 일치하는 회원만 최종 반환한다.

핵심 원칙:
- raw membership status(`ACTIVE`, `HOLDING`) 기준 필터가 아니다.
- 회원 목록에 실제로 보이는 `membershipOperationalStatus` 기준 필터다.
- 상태 계산 로직은 기존 summary 계산을 재사용하고, 필터는 그 결과에 적용한다.

## Technical Considerations
- 프런트 변경 대상:
  - `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`
  - `/Users/abc/projects/GymCRM_V2/frontend/src/features/members/MemberManagementPanels.tsx`
  - `/Users/abc/projects/GymCRM_V2/frontend/src/features/members/useMembersQuery.ts`
- 백엔드 변경 대상:
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberController.java`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberService.java`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberQueryRepository.java`
- 이미 summary status는 `정상/홀딩중/만료임박/만료/없음`으로 계산된다.
- `홀딩중` 우선 규칙과 기존 trainer/product/date 필터 의미를 깨지 않아야 한다.

## System-Wide Impact
- **Interaction graph**: 회원 관리 툴바 필터 변경 → `loadMembers()` → `/api/v1/members` → member summary 계산 → status filter 적용 → 목록 렌더.
- **Error propagation**: 새 필터는 선택형 문자열 하나만 추가되므로 기존 members query error 경로를 그대로 따른다.
- **State lifecycle risks**: hold/resume 후 summary 재조회가 이미 들어가 있으므로, 상태 필터가 추가돼도 같은 reload 경로를 재사용해야 한다.
- **API surface parity**: member summary를 쓰는 회원 관리 목록이 1차 대상이다. workspace picker에는 이번 변경을 퍼뜨리지 않는다.
- **Integration test scenarios**:
  - `membershipOperationalStatus=홀딩중`이면 홀딩 회원만 반환
  - `membershipOperationalStatus=없음`이면 회원권 없는 회원만 반환
  - trainer/product/date 필터와 조합돼도 최종 summary status 기준으로 필터됨

## Acceptance Criteria
- [x] 회원 관리 화면에 `회원권 상태` 필터 select가 보인다.
- [x] 옵션은 `전체/정상/홀딩중/만료임박/만료/없음`이다.
- [x] 상태 필터 선택 후 조회하면 목록 summary 상태와 같은 기준으로 필터링된다.
- [x] `홀딩중` 필터는 holding membership이 있는 회원만 반환한다.
- [x] `없음` 필터는 visible membership이 없는 회원만 반환한다.
- [x] 기존 이름/연락처/담당 트레이너/상품/기간 필터와 함께 동작한다.
- [x] `cd /Users/abc/projects/GymCRM_V2/backend && ./gradlew test --tests com.gymcrm.member.MemberSummaryApiIntegrationTest` 통과
- [x] `cd /Users/abc/projects/GymCRM_V2/frontend && npm run build` 통과

## Risks & Dependencies
- 상태 필터를 raw DB status 기준으로 구현하면 현재 UI 의미와 어긋난다.
- `trainer/product/date` 필터를 membership inclusion 용도와 summary 계산 용도로 혼동하면 다시 상태 우선순위 회귀가 생길 수 있다.
- 따라서 `summary 계산 후 최종 상태 필터 적용` 규칙을 유지해야 한다.

## Implementation Steps
1. `App.tsx`에 `memberMembershipStatusFilter` state 추가
2. `MemberManagementPanels.tsx`에 select UI 추가
3. `useMembersQuery.ts`에 `membershipOperationalStatus` query param 연결
4. `MemberController`와 `MemberService`에 새 필터 인자 추가
5. `MemberQueryRepository.findAllSummaries(...)`에서 summary 계산 후 최종 상태 필터 적용
6. `MemberSummaryApiIntegrationTest`에 상태 필터 시나리오 추가
7. 프런트 빌드와 백엔드 테스트로 검증

## Sources & References
- Existing member filters: `/Users/abc/projects/GymCRM_V2/frontend/src/features/members/MemberManagementPanels.tsx`
- Members query wiring: `/Users/abc/projects/GymCRM_V2/frontend/src/features/members/useMembersQuery.ts`
- Summary API surface: `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberController.java`
- Summary calculation: `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberQueryRepository.java`
- Related learning: `/Users/abc/projects/GymCRM_V2/docs/solutions/database-issues/membership-hold-refund-state-integrity-gymcrm-20260224.md`
