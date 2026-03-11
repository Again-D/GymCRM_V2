---
title: "feat: Trainer scoped reservation management"
type: feat
status: active
date: 2026-03-10
origin: docs/brainstorms/2026-03-10-trainer-scoped-reservation-management-brainstorm.md
---

# feat: Trainer scoped reservation management

## Enhancement Summary

**Deepened on:** 2026-03-11  
**Focus:** React + TypeScript 초심자용 구현 순서, 파일 단위 출발점, state 배치 기준  
**Research sources used:** local codebase, internal learnings, official React docs, Vercel React best practices

### Key Improvements
1. 구현 순서를 `데이터 모델 -> 권한 -> 조회 API -> 화면 재구성 -> 정책 검증`으로 더 잘게 쪼갰다.
2. 실제로 먼저 열어야 할 파일 경로를 명시했다.
3. React 초심자가 가장 많이 헷갈리는 `state를 어디에 둘지`를 구체적으로 적었다.

### New Considerations Discovered
- `/Users/abc/projects/GymCRM_V2/frontend/src/shared/hooks/useAuthSession.ts` 는 아직 `ROLE_CENTER_ADMIN | ROLE_DESK`만 타입으로 다루므로, `ROLE_TRAINER`를 먼저 열지 않으면 이후 UI 작업이 막힌다.
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/membership/MemberMembershipEntity.java` 에는 `assigned_trainer_id`가 아직 없으므로, trainer scope는 UI보다 migration부터 시작해야 한다.
- React 공식 문서 기준으로 검색 필터 입력은 controlled input으로 유지하고, 선택된 회원/모달 open 상태만 상위로 올리는 편이 구현과 디버깅이 쉽다.

## Overview
`/Users/abc/projects/GymCRM_V2/docs/05_추가_요구사항.md`를 현재 코드베이스에 맞는 실행 단위로 정리한다. 이번 작업의 목표는 `트레이너 전용 전체 포털`을 만드는 것이 아니라, `트레이너 스코프 예약 업무`를 도입하는 것이다. 즉, 트레이너 계정이 로그인 가능하고, 본인에게 할당된 회원권을 가진 회원만 예약 관리에서 조회/조정할 수 있게 만들며, 회원관리에는 `트레이너별`, `상품별`, `기간별` 필터를 추가한다 (see brainstorm: docs/brainstorms/2026-03-10-trainer-scoped-reservation-management-brainstorm.md).

이번 계획에서는 아래 세 가지를 고정한다.
- `기간별` 필터는 `회원권 유효기간(start_date/end_date)과 선택 구간이 겹치는 회원권` 기준으로 동작한다.
- 담당 트레이너는 `member`가 아니라 `membership`에 연결한다.
- 트레이너는 `assigned_trainer_id = currentUserId` 인 회원권/예약에 대해서만 예약 일정을 조회/조정할 수 있다.

기간 필터 UI는 `빠른 기간 프리셋 + 직접 날짜 선택` 조합으로 설계한다.
- 빠른 프리셋: `1주일`, `1개월`, `3개월`, `6개월`
- 직접 선택: `dateFrom`, `dateTo`
- 프리셋 의미: `today ~ today + preset duration`
- 최종 조회 규칙은 동일하게 `회원권 유효기간과 선택 구간이 겹치는 회원권`이다.

초기 공통화 범위도 함께 고정한다.
- 공통화 대상: `기간 프리셋 + dateFrom/dateTo` 규칙
- 화면별 유지 대상: `trainerId`, `productId`, 기타 검색어
- 즉, 초기 구현에서는 `기간 필터 전용 hook + 얇은 UI 컴포넌트`까지만 공통화하고, 전체 필터 폼을 한 번에 shared abstraction으로 올리지는 않는다.

### Research Insights

**Best Practices:**
- 초심자일수록 기능을 가로로 넓게 건드리기보다, 한 기능을 세로로 끝까지 연결하는 편이 낫다.
- React에서는 필터 입력값, 선택된 회원, 모달 open 상태를 분리하면 디버깅이 쉬워진다.

**Implementation Details:**
```text
1. backend: assigned_trainer_id 저장 가능하게 만들기
2. backend: trainer role 조회 제한 만들기
3. frontend: ROLE_TRAINER 로그인 상태 읽기
4. frontend: 회원관리 필터 UI 추가
5. frontend: 예약 관리 리스트형 화면으로 재구성
```

**References:**
- React docs: controlled inputs
- React docs: sharing state between components
- `/Users/abc/projects/GymCRM_V2/.agents/skills/vercel-react-best-practices/SKILL.md`

## Problem Statement / Motivation
현재 프런트는 예약 관리를 `선택된 회원 기반 후속 업무`로 다루고 있고, auth 세션 타입도 실질적으로 `ROLE_CENTER_ADMIN`, `ROLE_DESK` 중심이다. 반면 요구사항은 `예약권 보유 회원 리스트`를 중심으로 예약 관리를 재구성하고, 트레이너 계정에서는 `본인 담당 회원`만 보이게 하길 요구한다.

이 차이를 메우려면 단순 UI 변경만으로는 부족하다. `assigned_trainer_id` 데이터 경계가 실제 membership 구현에 들어와야 하고, 예약 조회/조정 경로에서 role + tenant scope + trainer scope를 동시에 검증해야 한다. 이 부분을 빼면 프런트는 트레이너 필터를 보여주더라도 실제 데이터 보호 경계가 생기지 않는다.

또한 예약 도메인은 이미 `current_count`, 차감 이벤트, 교차센터 접근 차단, `NO_SHOW` 타이밍 같은 정합성 규칙이 중요하게 정리된 영역이다. 따라서 이번 기능도 UI만 열고 서버를 느슨하게 두는 접근은 피해야 한다.

## Research Foundation
### Relevant brainstorm decisions
- `트레이너 계정`은 이번 단계에서 `트레이너 스코프 예약 업무`까지만 포함한다 (see brainstorm: docs/brainstorms/2026-03-10-trainer-scoped-reservation-management-brainstorm.md).
- `담당 회원` 경계는 membership 기준으로 잡는다 (see brainstorm: docs/brainstorms/2026-03-10-trainer-scoped-reservation-management-brainstorm.md).
- 예약 관리는 `예약권 보유 회원 리스트 워크스페이스` 방향으로 재구성한다 (see brainstorm: docs/brainstorms/2026-03-10-trainer-scoped-reservation-management-brainstorm.md).
- `기간별` 필터는 회원권 축과 같은 의미를 갖도록 `회원권 유효기간` 기준으로 잡는다.
- 담당 트레이너 지정은 선택값이다.
- 트레이너는 본인 담당 회원의 일정 조정이 가능해야 한다.

### Relevant internal learnings
- `/Users/abc/projects/GymCRM_V2/docs/solutions/database-issues/reservation-capacity-and-usage-deduction-integrity-gymcrm-20260225.md`
  - 예약 권한은 RBAC만으로 닫히지 않고 center scope와 서비스 검증이 함께 필요하다.
  - 예약 가능 조건과 실제 예약/완료 정책은 서버에서 정합성 있게 강제해야 한다.
- `/Users/abc/projects/GymCRM_V2/docs/solutions/database-issues/reservation-checkin-noshow-usage-event-integrity-gymcrm-20260225.md`
  - `NO_SHOW`, 체크인, 완료 같은 일정 조정 정책은 UI 가드와 서버 전이를 같이 고정해야 한다.
- `/Users/abc/projects/GymCRM_V2/docs/brainstorms/2026-03-09-membership-reservation-member-selection-flow-brainstorm.md`
  - 예약 관리는 워크스페이스형 화면으로 유지하는 것이 정보 구조상 안정적이다.

## Scope
### In scope
- `ROLE_TRAINER` 프런트 세션 타입 및 기본 내비게이션 활성화
- membership 데이터 모델에 `assigned_trainer_id` 추가
- 회원관리 상단 필터 확장
  - 담당 트레이너
  - 상품
  - 기간(회원권 유효기간 기준)
- 예약 관리를 `예약권 보유 회원 리스트` 중심 워크스페이스로 재구성
- 관리자/데스크와 트레이너 간 예약 대상 리스트 범위 차등 적용
- 회원 상세 모달에서 회원정보/상품정보/예약상태/예약일정 표시
- 트레이너의 본인 담당 일정 조회/조정 허용
- 예약 조정 정책을 프런트/백엔드에서 함께 강제
- RBAC/tenant scope/trainer scope 테스트 추가

### Out of scope
- 트레이너 전용 대시보드
- 트레이너 스케줄 생성/편집 전체 UI
- PT 일지/상담 메모
- 트레이너 정산 화면
- 회원-트레이너 자동 배정
- 알림 정책 확장

## Proposed Solution
### 1. Membership ownership boundary 확장
`member_memberships`에 `assigned_trainer_id`를 도입하고, 담당 트레이너는 회원권별 선택값으로 저장한다. 이로써 “트레이너 담당 회원”의 기준을 member 전역이 아니라 예약권/회원권 컨텍스트에서 정의할 수 있다. 현재 요구사항이 `예약권 보유 회원`을 중심으로 서술돼 있으므로, 이 축이 더 자연스럽다.

필수 변경:
- DB migration: nullable `assigned_trainer_id`
- entity/domain/repository 반영
- membership 생성/수정 command/API 반영
- trainer 필터용 인덱스 추가

### Research Insights

**Beginner Notes:**
- 여기서는 `왜 member가 아니라 membership인가`를 먼저 받아들여야 한다. 요구사항이 `예약권 보유 회원` 기준이라서 같은 회원도 회원권별로 담당 트레이너가 달라질 수 있다.
- 따라서 `member` 테이블에 trainer를 붙이면 너무 넓고, `member_memberships`에 붙이면 요구사항과 정확히 맞는다.

**File Entry Points:**
- `/Users/abc/projects/GymCRM_V2/backend/src/main/resources/db/migration/`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/membership/MemberMembershipEntity.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/membership/MemberMembership.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/membership/MemberMembershipRepository.java`

**Implementation Details:**
```java
@Column(name = "assigned_trainer_id")
private Long assignedTrainerId;
```

**Anti-Patterns to Avoid:**
- `member`와 `membership` 둘 다에 trainer 필드를 넣는 것
- migration 없이 코드만 먼저 바꾸는 것

### 2. Auth + role handling 정렬
프런트 auth 세션 타입과 role 분기에서 `ROLE_TRAINER`를 실제 지원한다. 이때 권한 설계는 단순 메뉴 숨김이 아니라 데이터 범위 제어와 같이 가야 한다.

정책:
- `ROLE_CENTER_ADMIN`: 전체 대상 조회/조정 가능
- `ROLE_DESK`: 관리자와 같은 조회 범위를 유지할지 별도 결정 필요. 초기 범위에서는 기존 desk 운영 UX를 깨지 않기 위해 전체 대상 유지
- `ROLE_TRAINER`: `assigned_trainer_id = currentUserId` 인 대상만 조회/조정 가능

추가로, 이번 플랜에서는 trainer가 통과해야 하는 member read surface도 명시적으로 고정한다.

- trainer는 예약 관리 워크스페이스와 회원관리 필터에 필요한 `member summary list` read를 사용할 수 있어야 한다.
- trainer는 예약 관리 상세 모달/패널에 필요한 `member detail` read를 사용할 수 있어야 한다.
- 다만 이 read surface는 기존 admin/desk read를 그대로 무제한 개방하는 것이 아니라, service/query 레벨에서 trainer scope를 강제하는 조건부 surface여야 한다.
- 구현 방식은 둘 중 하나로 고정해야 한다.
  - 기존 `/api/v1/members` / `/api/v1/members/{memberId}` 를 trainer까지 열고 service 레벨에서 scope 강제
  - 또는 trainer 전용 read DTO/endpoint를 별도로 두고 예약 관리 워크스페이스는 그 surface만 사용

초기 구현 난도와 기존 프런트 재사용성을 고려하면, 이번 범위의 권장안은 “기존 member read endpoint를 trainer까지 열되, service/query 레벨에서 `assigned_trainer_id` scope와 center scope를 함께 강제하는 방식”이다.

### Research Insights

**Beginner Notes:**
- 이 단계는 UI를 숨기는 작업이 아니라, 로그인한 사용자의 role을 프런트 타입이 이해하게 만드는 작업이다.
- 먼저 타입을 열고, 그 다음에 화면 분기를 하는 순서가 안전하다.

**File Entry Points:**
- `/Users/abc/projects/GymCRM_V2/frontend/src/shared/hooks/useAuthSession.ts`
- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/common/security/AccessPolicies.java`

**Implementation Details:**
```ts
roleCode: "ROLE_CENTER_ADMIN" | "ROLE_DESK" | "ROLE_TRAINER";
```

**Edge Cases:**
- prototype 모드에서는 role이 느슨하므로, jwt 모드에서만 실제 role-based visibility를 확인하는 검증이 꼭 필요하다.

### 3. Member management filter 확장
회원관리 목록 조회를 membership join 기반으로 확장한다.

필터 정책:
- `trainerId`: 특정 담당 트레이너가 지정된 회원권 보유 회원
- `productId`: 해당 상품 회원권 보유 회원
- `dateFrom/dateTo`: 회원권 유효기간 구간과 겹치는 회원
  - overlap rule: `membership.start_date <= filterEnd && membership.end_date >= filterStart`
- `presetRange`: `1주일`, `1개월`, `3개월`, `6개월` 중 하나를 누르면 내부적으로 `dateFrom/dateTo` 를 자동 채움

주의:
- 한 회원이 여러 회원권을 가질 수 있으므로 member summary 중복 제거 규칙이 필요하다.
- 필터가 membership 기준으로 동작한다는 사실을 UI 문구에서 드러내야 한다.
- trainer가 보는 member summary는 “member row는 하나지만, 그 row를 보게 만든 근거는 trainer-scoped membership subset”이라는 점을 기준으로 설계해야 한다.

### Research Insights

**Best Practices:**
- React 필터 폼은 controlled input으로 두고, 서버 요청에 보낼 값만 query object로 정리하면 코드가 단순하다.
- 조건이 여러 개여도 `useState`를 여러 개로 쪼개기보다 작은 객체 하나로 관리하는 편이 읽기 쉽다.

**Beginner Notes:**
- `기간별`은 예약일이 아니라 회원권 유효기간이다. 이 부분을 헷갈리면 백엔드 쿼리와 UI 라벨이 계속 어긋난다.
- 필터 state는 `MembersSection` 또는 members query hook 가까이에 두고, `App.tsx`까지 올리지 않는 편이 낫다.
- 빠른 프리셋 버튼은 별도 API 파라미터를 만들기보다 `dateFrom/dateTo` 를 채우는 UI 헬퍼로 구현하는 편이 단순하다.
- trainer/product까지 한 번에 공통 훅으로 묶지 말고, 기간 필터만 먼저 공통화하는 편이 구현 난도가 낮다.

**Implementation Details:**
```ts
type MemberFilters = {
  keyword: string;
  trainerId: string;
  productId: string;
  presetRange: "1w" | "1m" | "3m" | "6m" | "";
  dateFrom: string;
  dateTo: string;
};
```

```ts
type MembershipDateFilterState = {
  presetRange: "1w" | "1m" | "3m" | "6m" | "";
  dateFrom: string;
  dateTo: string;
};
```

```text
shared hook 후보:
- /Users/abc/projects/GymCRM_V2/frontend/src/shared/hooks/useMembershipDateFilter.ts

shared UI 후보:
- /Users/abc/projects/GymCRM_V2/frontend/src/shared/ui/MembershipPeriodFilter.tsx
```

**References:**
- React docs: controlled inputs
- Vercel rule: `rerender-derived-state-no-effect`

### 4. Reservation workspace 재구성
현재 `selectedMember` 중심 예약 워크스페이스를 `예약권 보유 회원 리스트 + 상세 패널` 구조로 재구성한다.

추천 구조:
- 리스트 영역: 예약권 보유 회원 목록 + 검색/필터
- 상세 영역: 선택 회원의 회원정보, 회원권/상품 정보, 예약 상태, 예약 일정, 조정 액션
- 회원명 클릭 시 상세 모달도 함께 제공

이 화면은 역할별로 UI를 분기하지 않고, 데이터 소스만 분기하는 것이 좋다. 즉 같은 화면을 쓰되, admin/desk는 전체 대상, trainer는 본인 담당 대상만 내려준다.

여기서 가장 중요한 건 `member row` 와 `detail payload` 의 scope를 같은 규칙으로 고정하는 것이다.

- 리스트는 계속 member 단위 row를 유지한다.
- 하지만 trainer가 member row를 클릭했을 때 detail modal / detail panel 에 내려오는 membership 목록, reservation 목록, 예약 상태 데이터는 `assigned_trainer_id = currentUserId` 로 제한된 subset만 보여준다.
- 즉 “같은 회원 전체 정보”를 보여주는 것이 아니라, “트레이너에게 허용된 membership/reservation subset을 포함한 회원 정보”를 보여주는 구조로 고정한다.
- 이 원칙을 지키면 요구사항의 `회원 리스트` 형태는 유지하면서도 membership canonical source와 UI scope가 어긋나지 않는다.
- 반대로 trainer에게 member 전체 membership/예약을 보여주는 구현은 이번 플랜에서 금지한다.

### Research Insights

**Best Practices:**
- 역할별로 컴포넌트를 둘로 나누지 말고, 동일한 리스트/상세 컴포넌트에 role-scoped data만 주입하는 편이 유지보수가 쉽다.
- 조건부 렌더링은 복잡한 `&&` 체인보다 early return 또는 명시적인 분기가 읽기 쉽다.
- member row를 재사용하더라도 detail payload는 role-scoped subset으로 좁혀야 membership 단위 권한 경계가 유지된다.

**Beginner Notes:**
- 이 화면을 한 번에 크게 바꾸지 말고, 먼저 `리스트 패널`만 만들고 기존 상세 패널을 옆에 붙이는 방식으로 가는 편이 안전하다.
- 현재 `/Users/abc/projects/GymCRM_V2/frontend/src/features/reservations/ReservationsSection.tsx` 가 시작점이다.

**File Entry Points:**
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/reservations/ReservationsSection.tsx`
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/reservations/ReservationManagementPanels.tsx`
- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`

**Implementation Details:**
```tsx
return (
  <section>
    <ReservationMemberList />
    {selectedMember ? <ReservationDetailPanel /> : <EmptyState />}
  </section>
);
```

**Anti-Patterns to Avoid:**
- trainer용 `ReservationsSection`을 따로 만드는 것
- 상세 모달 상태와 선택 회원 상태를 한 변수에 섞는 것

### 5. Reservation adjustment policy 고정
일정 조정은 프런트 버튼 제어와 서버 상태 전이 검증을 함께 적용한다.

필수 정책:
- 과거 일정은 수정 불가
- `NO_SHOW`는 수업 종료 후에만 가능
- 이미 `CANCELLED`, `COMPLETED`, `NO_SHOW` 인 예약은 재조정 불가
- 현재 진행 중이거나 미래 일정만 조정 가능
- 트레이너는 본인 담당 범위 밖 일정 접근 불가

여기서 `일정 조정`은 우선 `취소`, `노쇼`, 예약 상태 갱신 범위로 해석한다. 일정 자체를 다른 슬롯으로 옮기는 재배정 기능은 이번 범위에 넣지 않는다. 문구상 모호성을 피하기 위해 plan/implementation에서 이를 명시한다.

### Research Insights

**Best Practices:**
- 버튼을 숨기는 것과 서버가 거절하는 것은 별개다. 이 도메인은 서버가 최종 정책을 가져야 한다.
- 예약 상태 전이는 service 한 곳에서 검증하는 편이 가장 안전하다.

**Beginner Notes:**
- 프런트에서는 `disabled + 안내 문구`
- 백엔드에서는 `ApiException`
- 테스트에서는 `허용/차단 둘 다`
이 세 줄을 같이 가져가야 한다.

**References:**
- `/Users/abc/projects/GymCRM_V2/docs/solutions/database-issues/reservation-checkin-noshow-usage-event-integrity-gymcrm-20260225.md`

## Implementation Plan
### Phase 1: Data model and auth boundary
- [x] `member_memberships.assigned_trainer_id` migration 추가
- [x] membership entity/domain/repository/command 반영
- [ ] membership create/update API에 optional trainer assignment 반영
- [x] `ROLE_TRAINER` 프런트 auth 타입 반영
- [ ] 로그인 후 role-based section gating 점검
- [ ] trainer 계정 fixture/seed/test user 준비

### Research Insights

**Recommended Commit Slice:**
1. migration + entity/domain
2. membership API create/update
3. auth session role type

**Beginner Checklist:**
- migration 작성
- entity 필드 추가
- domain record 필드 추가
- repository `toDomain()` 반영
- 컴파일 에러가 나는 파일을 따라가며 create/update command 수정
- 마지막에 auth 타입 열기

### Phase 2: Query and filter expansion
- [x] member summary API에 `trainerId`, `productId`, `dateFrom`, `dateTo` 필터 추가
- [x] 회원관리 필터 UI에 `1주일`, `1개월`, `3개월`, `6개월` 빠른 기간 프리셋 추가
- [x] member summary query를 membership join 기반으로 확장
- [ ] 중복 회원 제거 규칙 및 정렬 기준 명시
- [x] trainer role일 때 member summary 결과를 담당 회원으로 제한
- [x] trainer가 사용할 member list/detail read surface를 명시적으로 선택하고 service/query scope를 연결
- [x] 예약권 보유 회원 리스트용 reservation-target query 설계

### Research Insights

**Recommended Commit Slice:**
1. member summary API 필터 파라미터 추가
2. backend query 구현
3. 기간 필터 shared hook/UI 추가
4. 프런트 필터 form 추가
5. API 연결

**Implementation Details:**
```text
Controller -> Service -> Repository 순서로 내려가서 파라미터를 끝까지 전달한다.
프런트는 마지막에 붙인다.
빠른 기간 버튼은 backend에 새 의미를 만들지 말고 dateFrom/dateTo 변환으로만 처리한다.
기간 필터만 shared로 추출하고, trainer/product는 먼저 화면 로컬 상태로 둔다.
```

### Phase 3: Reservation workspace restructure
- [x] 예약 관리 탭을 `예약권 보유 회원 리스트 + 상세 패널` 구조로 재구성
- [x] 역할별 데이터 범위 연결
- [x] 회원명 클릭 상세 모달 추가
- [x] 회원정보/상품정보/예약상태/예약일정 표시
- [x] trainer detail payload가 비담당 membership/예약을 포함하지 않도록 DTO/query scope 고정
- [x] 기존 direct-entry member picker 흐름과 충돌 없이 흡수

### Research Insights

**Recommended Commit Slice:**
1. 예약 회원 리스트 더미 UI
2. 실제 데이터 연결
3. 상세 모달 연결
4. 기존 picker 제거 또는 흡수

**Beginner Checklist:**
- 먼저 리스트가 보이게 만들기
- 클릭 시 `selectedMemberId`가 바뀌는지 확인
- 그 다음 상세 패널 연결
- 마지막에 모달 추가

### Phase 4: Policy enforcement and validation
- [x] 트레이너의 본인 담당 일정 조정만 허용하도록 서비스 검증 추가
- [x] 교차센터/타 트레이너 대상 접근 차단 테스트 추가
- [ ] 과거 일정 / 종료 전 노쇼 / 완료·취소 후 재조정 차단 테스트 추가
- [ ] 프런트 액션 버튼 비활성화 및 안내 문구 정렬
- [ ] prototype/jwt 모드 스모크 검증

### Research Insights

**Best Practices:**
- 이 단계는 마지막에 몰아서 하지 말고, 각 Phase 끝에서 작은 검증을 해두는 편이 낫다.

**Beginner Checklist:**
- Phase 1 끝: backend test / frontend typecheck
- Phase 2 끝: member filter API 확인
- Phase 3 끝: 브라우저에서 리스트/상세 확인
- Phase 4 끝: role별 차단 시나리오 확인

## Beginner Execution Map

React + TypeScript를 막 배운 상태라면 아래 순서로 구현하는 것이 가장 안전하다.

### Step 1: 백엔드 데이터 모델부터 끝낸다
- 이유: 프런트는 결국 백엔드 response shape를 따라간다.
- 먼저 `assigned_trainer_id`가 저장/조회되지 않으면 이후 UI는 전부 임시 코드가 된다.

### Step 2: 프런트에서 `ROLE_TRAINER` 타입을 연다
- 이유: 로그인 후 `authUser.roleCode` 분기가 안 열리면 화면 조건을 테스트할 수 없다.

### Step 3: 회원관리 필터를 붙인다
- 이유: 비교적 작은 성공 단위다.
- 이 단계에서 `controlled input`, `query params`, `API response` 흐름을 익힐 수 있다.

### Step 4: 예약 관리를 리스트형 워크스페이스로 바꾼다
- 이유: 가장 큰 UI 변경이라 앞 단계가 끝난 뒤 해야 안전하다.

### Step 5: 정책 차단과 테스트를 닫는다
- 이유: 이 기능은 권한 누수와 상태 전이 실수가 가장 큰 리스크다.

## File-by-File Starting Points

- Auth role 확장 시작점:
  - `/Users/abc/projects/GymCRM_V2/frontend/src/shared/hooks/useAuthSession.ts`
- 회원관리 필터 UI 시작점:
  - `/Users/abc/projects/GymCRM_V2/frontend/src/features/members/MembersSection.tsx`
  - `/Users/abc/projects/GymCRM_V2/frontend/src/features/members/useMembersQuery.ts`
- 예약 관리 레이아웃 시작점:
  - `/Users/abc/projects/GymCRM_V2/frontend/src/features/reservations/ReservationsSection.tsx`
  - `/Users/abc/projects/GymCRM_V2/frontend/src/features/reservations/ReservationManagementPanels.tsx`
- membership 데이터 모델 시작점:
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/membership/MemberMembershipEntity.java`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/membership/MemberMembership.java`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/membership/MemberMembershipRepository.java`
- member summary API 시작점:
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberController.java`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberService.java`

## Technical Considerations
- 현재 membership 도메인 구현에는 `assigned_trainer_id`가 없으므로, 설계 문서를 활성 구현으로 끌어내리는 작업이 필요하다.
- trainer scope는 `member` 전역이 아니라 `membership` 기준이다. 따라서 예약 리스트 쿼리도 membership join 또는 reservation -> membership 경로를 통해 scope를 계산해야 한다.
- 예약/노쇼/완료 정책은 이미 service 레벨에서 정합성이 중요한 도메인이다. trainer scope 검증도 repository가 아니라 service orchestration에서 최종 보장하는 편이 안전하다.
- 프런트 예약 화면은 최근 워크스페이스/쿼리 ownership 리팩토링이 끝난 상태이므로, 새 리스트 워크스페이스는 기존 hook boundary를 깨지 않도록 설계해야 한다.
- `ROLE_DESK`의 범위를 바꿀지 여부는 현재 요구사항에 없으므로 이번 범위에서는 기존 운영 권한을 유지한다.
- trainer가 접근하는 member read surface는 단순 controller annotation 확장이 아니라, `center scope + assigned_trainer_id scope` 가 함께 보장되는 service/query path여야 한다.
- member summary는 member 단위로 중복 제거하더라도, detail modal/panel 은 trainer에게 허용된 membership/reservation subset만 내려줘야 한다.
- 필터 공통화는 `기간 필터 규칙` 수준까지만 제한하고, 전체 member filter 폼 추상화는 후속 리팩토링 후보로 남긴다.

### Research Insights

**React State Placement Rules:**
- 필터 입력값: 각 섹션 컴포넌트 가까이 둔다.
- 선택된 회원: 예약 워크스페이스 상위 state로 둔다.
- 모달 open/close: 상세 모달을 여는 컴포넌트 가까이 둔다.
- 서버 응답 데이터: 기존 query hook 경계 안에 둔다.
- 예외: `기간 프리셋 + dateFrom/dateTo` 규칙은 shared hook으로 분리할 수 있다.

**Why this matters:**
- 초심자가 가장 많이 하는 실수는 모든 state를 `App.tsx`에 올리는 것이다.
- 이 프로젝트는 이미 query/workspace hook 분리 리팩토링을 마친 상태라, 새 state도 그 경계를 따라가야 덜 꼬인다.

**Vercel React Guidance Applied:**
- `rerender-derived-state-no-effect`: 파생값은 effect가 아니라 render에서 계산
- `rerender-dependencies`: effect dependency는 primitive 위주로 유지
- `bundle-conditional`: trainer 전용 분기를 위해 별도 컴포넌트를 복제하지 말고 같은 워크스페이스에서 데이터만 바꾼다

## SpecFlow Analysis
### Primary flows
1. 관리자 로그인 -> 예약 관리 진입 -> 전체 예약권 보유 회원 조회 -> 회원 상세 모달 확인 -> 예약 상태 조정
2. 트레이너 로그인 -> 예약 관리 진입 -> 본인 담당 + 예약권 보유 회원만 조회 -> 상세 모달 확인 -> 본인 담당 일정만 조정
3. 회원관리 진입 -> 트레이너/상품/기간 필터로 회원 좁히기 -> 회원 상세 이동 또는 예약 관리 진입

### Key edge cases
- 담당 트레이너가 지정되지 않은 회원권은 trainer 계정에서 보이지 않아야 함
- 한 회원이 여러 회원권을 가진 경우 trainer/product/date filter가 중복 행을 만들지 않아야 함
- 동일 회원이 여러 트레이너에게 걸쳐 있지 않더라도, membership 단위 assignment 때문에 특정 상품만 trainer scope에 걸릴 수 있음
- trainer가 member row를 클릭했을 때 비담당 membership/예약이 detail payload에 섞여 보이지 않아야 함
- 트레이너가 URL/direct API로 타 회원 예약을 조회/조정하려는 경우 차단돼야 함
- 종료 전 `NO_SHOW` 시도, 과거 예약 취소 시도, 이미 완료된 예약 재조정 시도가 모두 일관되게 막혀야 함

## Acceptance Criteria
- [ ] `ROLE_TRAINER` 계정으로 로그인 시 프런트 세션이 정상 동작한다.
- [ ] membership에 담당 트레이너를 선택적으로 저장할 수 있다.
- [ ] 회원관리 상단에 `트레이너별`, `상품별`, `기간별` 필터가 추가된다.
- [ ] `기간별` 필터는 회원권 유효기간과 선택 구간이 겹치는 회원권 기준으로 동작한다.
- [ ] `1주일`, `1개월`, `3개월`, `6개월` 빠른 기간 프리셋으로도 동일한 기간 조회가 가능하다.
- [ ] 관리자 계정은 전체 예약권 보유 회원 리스트를 본다.
- [ ] 트레이너 계정은 본인 담당 회원권을 가진 예약권 보유 회원만 본다.
- [ ] trainer가 사용하는 member list/detail read 경로가 문서에 정의돼 있고, backend scope 강제가 포함된다.
- [ ] 예약 관리에서 회원명 클릭 시 회원정보, 상품정보, 예약상태, 예약일정을 포함한 상세 모달을 볼 수 있다.
- [ ] trainer의 상세 모달/상세 패널은 비담당 membership/예약을 노출하지 않는다.
- [ ] 트레이너는 본인 담당 일정에 대해서만 취소/노쇼/허용된 상태 조정을 수행할 수 있다.
- [ ] 과거 일정, 종료 전 노쇼, 완료/취소/노쇼 후 재조정은 프런트와 백엔드에서 모두 차단된다.
- [ ] 교차센터 및 타 트레이너 데이터 접근이 차단된다.
- [ ] `frontend` 빌드와 `backend` 관련 통합 테스트가 통과한다.
- [ ] prototype/jwt 모드 검증 로그가 남는다.

## Validation Plan
### Backend
- membership assignment migration/integration test
- member summary filter integration test
- trainer scoped reservation list/detail/action integration test
- unauthorized / cross-center / cross-trainer access integration test
- no-show / cancel / complete policy regression test

### Frontend
- trainer login session smoke
- member management filter smoke
- reservation list -> detail modal -> action smoke
- admin vs trainer visibility 비교 검증
- direct entry / refresh / logout 후 stale state 회귀 확인

### Manual / Browser
- prototype mode UI 구조 점검
- jwt mode login + trainer scoped visibility 점검
- action disabled state / error banner / modal content 점검

## Risks & Mitigations
- Risk: trainer assignment를 member와 membership 양쪽에 중복 저장하면 ownership drift 발생
  - Mitigation: 이번 단계는 membership canonical source로 고정
- Risk: trainer scope를 프런트 필터만으로 구현하면 권한 누수 발생
  - Mitigation: backend service/repository path에 actor scope 강제
- Risk: 예약 관리 재구성 중 최근 member-picker/direct-entry UX와 충돌 가능
  - Mitigation: 새 리스트 워크스페이스가 기존 진입 경로를 흡수하도록 설계하고, 기존 빠른 진입 회귀 테스트 추가
- Risk: 기간 필터 의미가 UI에서 불명확할 수 있음
  - Mitigation: `회원권 유효기간` 문구로 명시

## Deliverables
- DB migration + backend/domain/API changes
- frontend auth/session role extension
- member management filter UI + query wiring
- reservation management list/detail modal workspace
- RBAC/integration tests
- validation log and screenshots

## Sources
- Origin brainstorm: `/Users/abc/projects/GymCRM_V2/docs/brainstorms/2026-03-10-trainer-scoped-reservation-management-brainstorm.md`
- Requirement note: `/Users/abc/projects/GymCRM_V2/docs/05_추가_요구사항.md`
- Internal learning: `/Users/abc/projects/GymCRM_V2/docs/solutions/database-issues/reservation-capacity-and-usage-deduction-integrity-gymcrm-20260225.md`
- Internal learning: `/Users/abc/projects/GymCRM_V2/docs/solutions/database-issues/reservation-checkin-noshow-usage-event-integrity-gymcrm-20260225.md`
