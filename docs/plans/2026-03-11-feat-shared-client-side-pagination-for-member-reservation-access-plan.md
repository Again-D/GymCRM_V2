---
title: feat: Add shared client-side pagination for member, reservation, and access lists
type: feat
status: active
date: 2026-03-11
---

# feat: Add shared client-side pagination for member, reservation, and access lists

## Enhancement Summary

**Deepened on:** 2026-03-11  
**Sections enhanced:** solution boundary, shared hook contract, UI contract, reset rules, testing plan

### Key Improvements
1. `client-side pagination`을 유지하되, 공통화 범위를 `state 계산 + controls UI`까지만 제한했다.
2. 각 목록별 `page reset trigger`를 명확히 정의해서 빈 페이지/잘못된 페이지 유지 회귀를 막는다.
3. 접근성, 모바일 배치, 향후 `server pagination` 전환 기준까지 문서에 고정했다.

## Overview
회원관리, 예약 관리, 출입 관리의 목록에 공통 `client-side pagination`을 적용한다.

이번 범위는 서버 API를 `offset/limit` 구조로 바꾸지 않는다. 이미 화면별로 제한된 목록을 받아오고 있으므로, 공통 훅과 공통 UI 컴포넌트를 만들어 세 화면에서 재사용하는 방식으로 정리한다.

### Research Insights

**Current repo fit**
- 회원 목록은 backend에서 최근 100건 제한을 이미 사용한다.
- 출입 이벤트도 frontend에서 `limit=100`으로 제한된 데이터를 가져온다.
- 예약 목록은 선택된 회원 기준 하위 목록이라 현재 단계에서 server pagination 비용이 과하다.

**Decision**
- 지금 단계는 `client-side pagination`이 맞다.
- 공통 훅은 데이터 fetch를 몰라야 한다. fetch ownership을 알기 시작하면 재사용 범위가 무너진다.

## Problem Statement / Motivation
현재 목록 화면은 데이터가 길어질수록 한 화면에 너무 많은 행이 쌓인다. 화면별로 임시 pagination을 각각 넣으면 UX와 코드가 쉽게 갈라진다.

이번 작업의 목적은 다음 두 가지다.
- 목록 가독성과 조작성을 개선한다.
- pagination state/UI를 공통화해서 회원관리, 예약 관리, 출입 관리에 같은 패턴을 적용한다.

### Research Insights

**Likely failure modes**
- 필터 변경 후 이전 page index가 유지돼 빈 테이블처럼 보이는 문제
- 각 화면이 서로 다른 버튼 레이블/배치를 가져 UX가 갈라지는 문제
- 공통 컴포넌트가 각 화면의 로딩/빈 상태까지 먹으려다 props가 비대해지는 문제

## Proposed Solution
작게 구현한다.

1. 공통 훅 `usePagination`을 만든다.
2. 공통 UI `PaginationControls`를 만든다.
3. 각 화면은 원본 rows를 유지하고, 렌더 직전에 `paginatedRows`만 계산한다.
4. 필터/검색/선택 상태가 바뀌면 현재 페이지는 1로 리셋한다.

초기 구현은 `client-side pagination`으로 고정한다.

### Research Insights

**Recommended hook contract**
- `items`
- `page`
- `pageSize`
- `totalItems`
- `totalPages`
- `pagedItems`
- `setPage`
- `setPageSize`
- `resetPage`

**Recommended UI contract**
- `page`
- `totalPages`
- `pageSize`
- `totalItems`
- `onPageChange`
- `onPageSizeChange`

**Why this boundary**
- 훅은 계산과 상태 전이만 담당
- UI는 버튼/표시만 담당
- 실제 `rows` 선택, `loading`, `EmptyTableRow`는 각 화면에 남긴다.

## Scope
적용 대상:
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/members/MemberManagementPanels.tsx`
  - 회원 목록
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/reservations/ReservationManagementPanels.tsx`
  - 선택 회원 예약 목록
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/access/AccessManagementPanels.tsx`
  - 회원 검색 결과
  - 현재 입장중 회원
  - 최근 출입 이벤트

공통화 대상:
- `/Users/abc/projects/GymCRM_V2/frontend/src/shared/hooks/usePagination.ts`
- `/Users/abc/projects/GymCRM_V2/frontend/src/shared/ui/PaginationControls.tsx`

이번 범위에서 제외:
- 서버 `offset/limit/page` API 추가
- URL query param 기반 페이지 상태 동기화
- infinite scroll
- workspace picker, 상품/정산/CRM 목록까지 확대 적용

### Research Insights

**Do not expand in this step**
- `ReservationsSection.tsx` 상단의 예약 대상 회원 리스트까지 같이 넣으면 범위가 커진다.
- 이번 범위는 사용자가 직접 언급한 세 화면의 주요 목록에 한정한다.
- 추후 같은 패턴이 안정화되면 상품/정산/CRM에 수평 확장한다.

## Technical Considerations
- 회원관리 목록은 backend에서 기본 100건 제한이 있다.
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberQueryRepository.java`
- 출입 이벤트도 frontend query에서 `limit=100`을 사용한다.
  - `/Users/abc/projects/GymCRM_V2/frontend/src/features/access/useAccessQueries.ts`
- 따라서 지금 단계에서는 client-side pagination으로 충분하다.
- pagination은 데이터 fetch ownership을 건드리지 않고, 렌더 계층에서만 적용해야 한다.
- 각 화면별 기본 page size는 다르게 둘 수 있다.
  - 회원관리: `20`
  - 예약 목록: `10`
  - 출입 관리 목록들: `10` 또는 `20`

### Research Insights

**Reset rules**
- 회원관리:
  - 이름 검색어 변경
  - 연락처 검색어 변경
  - 담당 트레이너 변경
  - 상품 변경
  - 회원권 상태 변경
  - 기간 필터 변경
  - `loadMembers()` 결과 길이 변경
- 예약 관리:
  - `selectedMemberId` 변경
  - 예약 생성/취소/완료/노쇼 후 목록 재조회
- 출입 관리:
  - `accessMemberQuery` 변경 시 검색 결과 목록 page reset
  - `accessPresence` 재조회 후 open sessions 목록 page clamp
  - `accessEvents` 재조회 후 이벤트 목록 page clamp

**Clamp rule**
- 현재 page가 새 `totalPages`보다 크면 마지막 페이지로 자동 이동
- `totalPages === 0`이면 내부 상태는 page `1` 유지, UI는 `0건`으로 표시

**Suggested file shape**
- `/Users/abc/projects/GymCRM_V2/frontend/src/shared/hooks/usePagination.ts`
- `/Users/abc/projects/GymCRM_V2/frontend/src/shared/ui/PaginationControls.tsx`
- 필요한 경우 스타일만 `/Users/abc/projects/GymCRM_V2/frontend/src/styles.css`에 추가

**Accessibility**
- 이전/다음 버튼에 `aria-label`
- 페이지 상태 텍스트는 스크린리더가 읽을 수 있게 유지
- `page size select`는 label 포함
- 버튼 비활성화 상태를 명확히 표현

**Mobile**
- controls는 한 줄 강제보다 `wrap` 허용
- 작은 화면에서는 `총 N건`, `페이지당 N개`, `이전/다음`만 우선 보이고 숫자 버튼은 제한
- 번호 버튼은 현재 페이지 기준 양옆 1~2개까지만 노출하는 단순 규칙이 적절

## System-Wide Impact
- **Interaction graph**: 화면별 필터/검색/선택 변경 → rows 재계산 → pagination reset → 현재 페이지 slice 렌더.
- **Error propagation**: pagination 자체는 fetch 에러를 만들지 않는다. 기존 query loading/error 경로를 그대로 사용한다.
- **State lifecycle risks**: 필터 변경 후 이전 page index가 남으면 빈 페이지처럼 보일 수 있으므로 page reset 규칙이 중요하다.
- **API surface parity**: 세 화면이 같은 pagination UI vocabulary를 공유해야 한다.
- **Integration test scenarios**:
  - rows 길이가 page size를 넘을 때 다음 페이지로 이동 가능
  - 필터/검색 변경 시 page가 1로 리셋
  - 마지막 페이지에서 row 수가 줄어들어도 invalid page index가 남지 않음

### Research Insights

**Additional edge cases**
- 페이지 크기를 20 → 50으로 바꿀 때 현재 선택 페이지가 자연스럽게 clamp되는지
- page size 변경이 각 화면마다 독립 상태인지
- `selectedMemberId`가 바뀐 뒤 이전 회원의 예약 목록 page가 남지 않는지
- 출입 관리에서 검색 결과 pagination과 이벤트 pagination이 서로 상태를 공유하지 않는지

## Acceptance Criteria
- [x] 회원관리 목록에 공통 pagination controls가 보인다.
- [x] 예약 관리의 선택 회원 예약 목록에 같은 pagination controls가 보인다.
- [x] 출입 관리의 세 목록에 같은 pagination controls가 보인다.
- [x] 필터/검색/선택 상태가 바뀌면 현재 페이지가 1로 리셋된다.
- [x] 페이지네이션은 fetch 로직이 아니라 렌더 직전 rows slicing으로만 적용된다.
- [x] 각 화면의 기존 정렬/empty state/loading 문구는 유지된다.
- [x] 페이지 수 감소 시 현재 페이지가 자동 보정된다.
- [ ] 모바일 좁은 화면에서도 controls가 줄바꿈되거나 축약되어 레이아웃이 깨지지 않는다.
- [x] `cd /Users/abc/projects/GymCRM_V2/frontend && npm run build` 통과

### Quality Gates
- [x] `usePagination` 단위 테스트 추가
- [x] 최소 1개 화면에서 page reset 회귀 테스트 추가
- [ ] 수동 확인:
  - 회원관리
  - 예약 관리
  - 출입 관리

## Implementation Steps
1. `usePagination` 훅 추가
   - 기본 page, pageSize, clamp, reset 규칙 포함
2. `PaginationControls` 컴포넌트 추가
   - 이전/다음, 페이지 정보, page size select
3. 회원관리 목록에 적용
   - 필터 변경 시 reset
4. 예약 관리의 선택 회원 예약 목록에 적용
   - `selectedMemberId` 변경과 목록 재조회 시 reset
5. 출입 관리 3개 목록에 개별 적용
   - 검색 결과 목록
   - 현재 입장중 회원
   - 최근 출입 이벤트
6. 스타일 추가
   - desktop/mobile 공통 배치
7. 단위 테스트 및 빌드 검증

### Suggested Defaults
- 회원관리 목록: `20`
- 예약 목록: `10`
- 출입 검색 결과: `10`
- 현재 입장중 회원: `10`
- 최근 출입 이벤트: `20`

## Risks & Dependencies
- 테이블마다 데이터 source와 reset 기준이 달라서, 공통 컴포넌트가 너무 많은 화면별 조건을 받기 시작하면 오히려 복잡해질 수 있다.
- 따라서 공통화는 `page 계산 + controls 렌더`까지만 제한하고, 실제 rows 선택과 empty state는 각 화면에 남겨야 한다.
- 이번 단계에서 서버 pagination까지 같이 넣으면 범위가 불필요하게 커진다.

### Research Insights

**Migration trigger to server pagination later**
- member summary limit를 100보다 높여야 하는 요구가 생길 때
- access events를 100건 이상 탐색해야 하는 운영 요구가 생길 때
- reservation list도 선택 회원 기준을 넘어 더 긴 이력을 직접 탐색해야 하는 요구가 생길 때
- initial fetch cost가 UX 병목이 될 때
- 모바일 또는 저사양 환경에서 first render 비용이 체감되기 시작할 때

그 전까지는 client-side가 더 단순하고 안전하다.

## Server Pagination Transition Criteria
이번 작업은 의도적으로 `client-side pagination`으로 끝낸다. 아래 조건이 하나라도 실제 운영 요구로 올라오면, 별도 후속 작업으로 `server-side pagination` 전환을 검토한다.

1. 회원관리
   - `/api/v1/members`의 기본 `100건` 제한이 운영상 부족해져 더 많은 결과 탐색이 필요해질 때
   - `membershipOperationalStatus`, trainer, product, 기간 필터를 조합한 검색에서 100건 초과 결과를 정확히 탐색해야 할 때
2. 출입 관리
   - 최근 출입 이벤트 `100건` 제한을 넘어 더 긴 기간을 UI에서 직접 넘겨보는 요구가 생길 때
   - 현재 입장중 회원 수나 검색 결과가 커져 initial fetch가 느려질 때
3. 예약 관리
   - 선택 회원의 예약 이력이나 예약 대상 회원 리스트가 길어져 client-side slice만으로 UX를 유지하기 어려울 때
4. 공통 성능 신호
   - 첫 조회 payload가 커져 네트워크 대기 시간이 눈에 띄게 길어질 때
   - 브라우저 메모리 사용이나 테이블 초기 렌더가 체감 성능 이슈로 올라올 때

전환 시에는 `offset/limit` 또는 cursor 방식을 화면별로 따로 넣지 말고, 목록별 정렬 기준과 총 개수 응답 구조를 함께 설계하는 별도 계획 문서로 분리한다.

## Follow-up Work
이번 플랜의 구현 이후에도 아래 항목은 `후속 작업`으로 남긴다.

- 서버 페이지네이션 전환 검토 문서 작성
  - 대상: 회원관리, 예약 관리, 출입 관리
  - 조건: 위 `Server Pagination Transition Criteria` 중 하나라도 충족될 때
- 운영 데이터 규모 점검
  - 회원 수, 출입 이벤트 수, 예약 이력 길이가 현재 `client-side pagination` 가정 범위를 넘는지 주기적으로 확인
- 필요 시 후속 플랜 분리
  - 예시: `feat: add server-side pagination for member summaries`
  - 예시: `feat: add server-side pagination for access events`

## Sources & References
- Members list: `/Users/abc/projects/GymCRM_V2/frontend/src/features/members/MemberManagementPanels.tsx`
- Reservation list: `/Users/abc/projects/GymCRM_V2/frontend/src/features/reservations/ReservationManagementPanels.tsx`
- Access lists: `/Users/abc/projects/GymCRM_V2/frontend/src/features/access/AccessManagementPanels.tsx`
- Existing member list limiting: `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberQueryRepository.java`
- Existing access event limiting: `/Users/abc/projects/GymCRM_V2/frontend/src/features/access/useAccessQueries.ts`
- Existing table shell styling: `/Users/abc/projects/GymCRM_V2/frontend/src/styles.css`
- Existing empty-row pattern: `/Users/abc/projects/GymCRM_V2/frontend/src/shared/ui/EmptyTableRow.tsx`
