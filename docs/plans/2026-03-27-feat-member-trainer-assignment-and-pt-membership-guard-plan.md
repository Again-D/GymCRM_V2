---
title: "feat: Member trainer assignment and PT membership guard"
type: feat
status: active
date: 2026-03-27
origin: docs/brainstorms/2026-03-27-member-trainer-assignment-brainstorm.md
---

# feat: Member trainer assignment and PT membership guard

## Overview

회원권 신규 등록 플로우에 담당 트레이너 선택을 연결하고, PT 회원권의 중복 활성 생성은 서버 정책으로 차단한다. 이번 작업은 이미 존재하는 `member_memberships.assigned_trainer_id` 축을 실제 운영 입력과 연결하는 마감 작업이며, 트레이너의 담당 회원 조회 및 예약 scope가 실제 데이터 입력과 자연스럽게 이어지게 만드는 것이 목적이다 (see brainstorm: docs/brainstorms/2026-03-27-member-trainer-assignment-brainstorm.md).

범위는 명확하다.

- 회원권 등록 모달에 담당 트레이너 선택 추가
- 회원권 구매 API payload에 `assignedTrainerId` 반영
- PT 상품 구매 시 담당 트레이너 필수화
- 활성 PT 회원권 중복 생성 차단
- 관련 백엔드/프론트 테스트 보강

이번 범위에는 담당 변경/해제 UI를 넣지 않는다. 트레이너 상세 화면은 조회 전용으로 유지한다 (see brainstorm: docs/brainstorms/2026-03-27-member-trainer-assignment-brainstorm.md).

## Problem Statement / Motivation

현재 상태는 입력 경로와 권한/조회 경로가 분리돼 있다.

- 백엔드 구매 API는 이미 `assignedTrainerId`를 받을 수 있다.
- 예약 대상 조회와 트레이너 예약 권한은 `assigned_trainer_id` 기준으로 이미 동작한다.
- 하지만 프론트 회원권 등록 모달에는 담당 트레이너 선택 UI가 없고, 실제 구매 요청 payload에도 `assignedTrainerId`가 빠져 있다.
- PT 회원권 중복 활성 생성도 현재 구매 서비스에서 막지 않는다.

이 상태는 두 가지 운영 문제를 만든다.

1. 담당 트레이너 개념이 데이터 모델과 예약 scope에는 존재하지만 운영자가 화면에서 일관되게 입력할 수 없다.
2. 한 회원에게 활성 PT 회원권이 중복 생성되면 “가급적 한 명의 담당 트레이너”라는 운영 원칙이 흐려지고, PT 예약/회원권 운영 해석이 복잡해진다.

## Proposed Solution

### 1. 회원권 등록 모달을 1차 배정 입력 지점으로 고정

회원권 신규 등록 모달에 담당 트레이너 선택 필드를 추가한다. 이 필드는 PT 상품 선택 시 필수, 그 외 상품에서는 선택사항 또는 숨김 처리로 둔다.

이 결정은 현재 저장 단위가 `member`가 아니라 `member_memberships.assigned_trainer_id`이기 때문이며, 별도 배정 관리 화면보다 기존 구매 흐름 안에 넣는 것이 최소 변경이다 (see brainstorm: docs/brainstorms/2026-03-27-member-trainer-assignment-brainstorm.md).

### 2. 트레이너 선택 데이터는 기존 lightweight surface를 우선 재사용

가능하면 기존 트레이너 picker/list surface를 사용해 회원권 등록 모달의 선택 옵션을 채운다. 다만 구매 모달이 의존하는 계약은 최소 DTO로 고정한다. 필요한 필드는 `userId`, `userName`이며, 그 외 계정성 정보는 구매 흐름에 싣지 않는다. 새 전용 API는 기존 응답이 이 최소 계약을 못 맞출 때만 추가한다.

우선 검토 대상:

- `GET /api/v1/auth/trainers`
- 이미 존재하는 trainer management read DTO

원칙은 두 가지다.

- 목록 조회를 위해 trainer admin detail API를 끌어오지 않는다.
- trainer picker는 least-privilege 계약(`userId`, `userName`)으로 고정하고, `loginId` 같은 계정 식별자는 포함하지 않는다.

### 3. PT 회원권 구매 정책을 서버에서 강제

`MembershipPurchaseService`에 PT 구매 전용 검증을 추가한다.

- PT 상품이면 `assignedTrainerId` 필수
- 동일 회원에게 비종결(non-terminal) PT 회원권이 이미 있으면 새 PT 회원권 생성 차단

차단 기준은 운영 정책을 반영해 “회원당 PT 회원권 1개”로 둔다. 1차에서는 `ACTIVE`와 `HOLDING`을 모두 단일 PT 슬롯을 점유하는 상태로 본다. 반대로 `REFUNDED`, `EXPIRED`는 종결 상태로 간주해 새 PT 회원권 생성 차단 대상에서 제외한다.

이 규칙은 단순 service pre-check로 끝내지 않는다. canonical enforcement는 동시성 안전하게 닫아야 하므로, 계획 단계에서 아래 둘을 함께 가져간다.

- 앱 레이어: 구매 전 명시적 중복 검증 및 사용자 친화 메시지
- 저장소 레이어: `member_memberships`에 대해 PT 비종결 상태(`ACTIVE`, `HOLDING`) 중복을 막는 partial unique index 또는 동등한 concurrency-safe guard

기본 권장안은 partial unique index다. 이유는 사용자에게 보이는 핵심 정책을 read-before-write 관례가 아니라 저장소 invariant로 고정할 수 있기 때문이다. 구현 전 기존 중복 데이터가 있으면 정리 전략을 함께 포함한다.

### 4. 예약/트레이너 scope는 기존 흐름 재사용

이번 작업은 예약 서비스 규칙을 새로 설계하지 않는다. 이미 구현된 trainer scope는 계속 `assigned_trainer_id`를 기준으로 동작한다.

- 트레이너 예약 대상 조회
- 트레이너의 담당 회원 예약 생성 제한
- PT availability 기반 예약 ownership 체크

즉, 배정값이 정상 저장되면 downstream behavior는 별도 수정 없이 대부분 일관되게 동작해야 한다.

## Technical Considerations

- 백엔드 canonical rule은 UI가 아니라 서비스 레이어에서 강제해야 한다. PT 예약 무결성 학습과 동일하게, 운영 규칙은 서버 검증으로 닫아야 한다.
- 백엔드 canonical rule은 UI가 아니라 서비스 + 저장소 레이어에서 함께 강제해야 한다. PT 예약 무결성 학습과 동일하게, 운영 규칙은 서버 검증과 동시성 안전한 persistence invariant로 닫아야 한다.
- `assignedTrainerId`는 프론트 optional field처럼 보여도, PT 상품 선택 시에는 submit gating과 서버 validation을 동시에 가져가야 한다.
- 중복 PT 회원권 차단은 비종결 PT 상태(`ACTIVE`, `HOLDING`)를 대상으로 정의한다. `HOLDING`은 운영상 여전히 살아 있는 PT 회원권이므로 단일 PT 슬롯을 점유한다고 본다.
- 동시성 안전성을 위해 read-before-write 검증만으로 끝내지 않는다. partial unique index 같은 저장소 invariant를 우선 검토하고, 불가할 때만 명시적 member-scoped lock 대안을 사용한다.
- 트레이너 목록 로드는 최소 권한 surface를 사용해야 한다. 회원권 구매 모달이 trainer management detail에 의존하면 과한 데이터와 권한 coupling이 생긴다.
- trainer picker는 `userId`, `userName`만 보장하는 최소 응답 계약을 plan에서 먼저 고정한다. 기존 `/api/v1/auth/trainers`를 재사용하더라도 이 계약에 맞는 축소 응답 또는 adapter가 필요하다.
- mock/live parity도 챙겨야 한다. 테스트 및 mock 데이터 경로에서 trainer picker와 assigned trainer 저장 흐름이 어긋나면 프론트 회귀가 생긴다.

## System-Wide Impact

- **Interaction graph**: 회원권 구매 모달 입력 변경이 `useMembershipPrototypeState`를 거쳐 `useSelectedMemberMembershipsQuery.createMembership()` payload로 내려가고, backend `MembershipPurchaseController -> MembershipPurchaseService -> MemberMembershipRepository + PaymentRepository` 경로를 탄다. 저장된 `assigned_trainer_id`는 이후 `ReservationQueryRepository`와 trainer detail aggregation이 그대로 재사용한다.
- **Error propagation**: 프론트 submit gating에서 빠진 값은 즉시 차단하고, 서버에서는 `ApiException(ErrorCode.BUSINESS_RULE or VALIDATION_ERROR)`로 최종 방어한다. UI는 기존 membership panel error surface를 재사용해 구체 메시지를 보여준다.
- **State lifecycle risks**: 구매는 membership insert + payment insert가 같은 트랜잭션에 있다. PT 중복 검증은 insert 전에 이뤄져야 하고, 저장소 invariant까지 함께 있어야 한다. 실패 시 membership/payment 어느 쪽도 생성되면 안 되며, 동시 요청 두 건이 와도 PT 단일 회원권 규칙이 깨지면 안 된다.
- **API surface parity**: `POST /api/v1/members/{memberId}/memberships`가 canonical write surface다. mock mutation path, 프론트 purchase form, API 설계서, trainer scoped reads가 모두 같은 정책을 따라야 한다.
- **Integration test scenarios**: PT assigned trainer required, ACTIVE PT duplicate blocked, non-PT purchase remains allowed without trainer, assigned trainer purchase feeds trainer-scoped reservation target visibility.
- **Integration test scenarios**: PT assigned trainer required, PT duplicate blocked for both `ACTIVE` and `HOLDING`, concurrent PT create race blocked by persistence guard, non-PT purchase remains allowed without trainer, assigned trainer purchase feeds trainer-scoped reservation target visibility.

## SpecFlow Analysis

### User Flow Overview

1. 관리자/데스크가 회원권 등록 모달을 연다.
2. 상품을 선택한다.
3. 일반 회원권/GX면 기존 구매 흐름대로 진행한다.
4. PT 상품이면 담당 트레이너 선택 UI가 활성화되고, 선택 없이는 제출할 수 없다.
5. 제출 시 서버가 담당 트레이너 유효성, PT 활성 회원권 중복 여부를 검증한다.
6. 성공하면 회원권과 결제가 생성되고, 이후 트레이너 조회/예약 화면에서 해당 회원이 자연스럽게 scope 안에 들어온다.

### Missing Elements & Gaps Resolved in Plan

- PT 상품 선택 시 담당 트레이너 필수 여부: 필수로 고정
- PT 중복 기준: 동일 회원의 비종결 PT 회원권(`ACTIVE`, `HOLDING`) 존재 시 차단
- 재배정 지원 여부: 이번 범위 제외
- 배정 UI 위치: 회원권 신규 등록 모달

### Critical Questions Closed

- PT 중복 보유는 1차에서 경고가 아니라 생성 차단으로 처리한다.
- 담당 트레이너는 운영상 가급적 한 명으로 유지하는 정책을 따른다.

### Additional Edge Cases To Cover

- 이미 `HOLDING` PT 회원권이 있는 경우 새 ACTIVE PT 생성 허용 여부
  - 1차 정책: 허용하지 않음. `HOLDING`도 단일 PT 슬롯을 점유한다.
- PT가 아닌 상품 선택 후 이전 trainer selection state가 남는지
  - 상품 category 전환 시 관련 state reset 필요
- 트레이너가 비활성화된 직후 구매 요청이 들어오는 경우
  - 서버 `findActiveByCenterAndUserId()` 검증으로 차단
- 센터가 다른 트레이너를 payload로 주입하는 경우
  - 서버 center-scope 검증으로 차단
- 동일 회원에 대한 동시 PT 구매 요청 두 건이 들어오는 경우
  - 저장소 invariant 또는 동등한 lock 전략으로 한 건만 성공해야 함

## Acceptance Criteria

- [x] 회원권 신규 등록 모달에 담당 트레이너 선택 UI가 추가된다.
- [x] PT 상품 선택 시 담당 트레이너를 선택하지 않으면 프론트에서 제출할 수 없다.
- [x] `POST /api/v1/members/{memberId}/memberships` 요청에 `assignedTrainerId`가 포함될 수 있다.
- [x] 백엔드는 PT 상품 구매 시 `assignedTrainerId`가 없으면 구매를 거부한다.
- [x] 백엔드는 담당 트레이너가 현재 센터의 활성 `ROLE_TRAINER` 사용자가 아니면 구매를 거부한다.
- [x] 동일 회원에게 비종결 PT 회원권(`ACTIVE` 또는 `HOLDING`)이 이미 있으면 새 PT 회원권 생성이 차단된다.
- [x] PT가 아닌 상품 구매는 기존 동작을 유지하며 담당 트레이너 없이도 생성 가능하다.
- [x] 담당 트레이너가 저장된 PT 회원권은 기존 trainer-scoped reservation target / reservation ownership 흐름과 충돌하지 않는다.
- [x] PT 중복 차단은 동시 요청에서도 깨지지 않도록 persistence invariant 또는 동등한 concurrency-safe guard로 보장된다.
- [x] trainer picker 데이터 계약은 구매 흐름에 필요한 최소 필드(`userId`, `userName`)로 고정된다.
- [x] 관련 통합 테스트와 프론트 테스트가 추가 또는 갱신된다.
- [x] API 설계 문서와 실제 정책 간 불일치가 있다면 이번 변경 범위에 맞게 문서가 갱신된다.

## Success Metrics

- 운영자가 회원권 생성 시 배정값을 별도 수기/우회 없이 입력할 수 있다.
- PT 회원권 중복 생성이 서버에서 차단되어 운영 실수가 줄어든다.
- 트레이너의 담당 회원 조회 및 예약 대상 목록이 신규 구매 직후 기대대로 반영된다.
- 변경 후 membership purchase / trainer scope / reservation scope 관련 회귀 테스트가 안정적으로 통과한다.

## Dependencies & Risks

### Dependencies

- 기존 trainer list/picker surface의 재사용 가능성 확인
- `MembershipPurchaseServiceIntegrationTest`와 reservation integration test 확장
- 프론트 mock data path가 live payload shape와 맞아야 함

### Risks

- partial unique index 도입 시 기존 중복 데이터가 있으면 migration 적용 전에 정리 전략이 필요하다.
- trainer picker surface가 구매 화면 용도로 과한 데이터를 주거나 권한 제약이 맞지 않을 수 있다.
- 기존 문서에는 “PT 상품 구매 시 assignedTrainerId 필수”가 이미 적혀 있지만, 실제 구현은 아직 그 정책을 완전히 강제하지 않는다. 문서와 코드 정렬을 놓치면 다시 혼선이 생긴다.

### Mitigations

- 기존 데이터에 비종결 PT 중복이 있는지 먼저 확인하고, 있으면 migration 전 cleanup 또는 예외 처리 전략을 포함한다.
- trainer picker는 기존 endpoint를 그대로 쓰기보다 최소 계약 adapter 또는 전용 lightweight DTO로 좁힌다.
- 계획 범위에 API 문서 정렬을 포함한다.

## Deployment Safety

`V28__enforce_single_non_terminal_pt_membership_per_member.sql` 배포 전에는 아래 preflight query가 반드시 0건을 반환해야 한다.

```sql
SELECT center_id, member_id, COUNT(*) AS non_terminal_pt_count
FROM member_memberships
WHERE product_category_snapshot = 'PT'
  AND membership_status IN ('ACTIVE', 'HOLDING')
  AND is_deleted = FALSE
GROUP BY center_id, member_id
HAVING COUNT(*) > 1
ORDER BY non_terminal_pt_count DESC, center_id, member_id;
```

배포 원칙:

- 결과가 1건 이상이면 `V28` 배포를 진행하지 않는다.
- 먼저 중복 PT 회원권 데이터를 정리한 뒤 migration을 적용한다.
- 운영 검증 결과가 0건이라는 확인 없이는 merge/deploy safe로 간주하지 않는다.

## Implementation Notes

### Backend

- `MembershipPurchaseService.validatePurchaseEligibility()` 또는 인접 private validation 단계에 PT 전용 규칙 추가
- `MemberMembershipRepository`에 “회원의 비종결 PT 회원권 존재 여부” 조회 메서드 추가
- `member_memberships`에 PT 비종결 상태(`ACTIVE`, `HOLDING`) 중복을 막는 partial unique index 또는 동등한 persistence guard 설계
- 기존 데이터에 중복이 있으면 migration 전에 정리 전략 수립
- 에러는 기존 `ApiException` + `ErrorCode` 체계를 사용
- 구매 트랜잭션의 atomicity는 유지

### Frontend

- `PurchaseFormState`에 `assignedTrainerId` 추가
- 회원권 등록 모달에 trainer select 추가
- 상품 선택에 따라 PT/non-PT UI와 validation 분기
- trainer picker는 `userId`, `userName` 최소 계약 기준으로 소비
- `createMembership()` live payload와 mock path 모두 `assignedTrainerId` 반영

### Testing

- backend:
  - PT + assigned trainer + 성공 구매
  - PT + assigned trainer 없음 + 실패
  - PT + non-trainer user 지정 + 실패
  - PT + 기존 ACTIVE PT 존재 + 실패
  - PT + 기존 HOLDING PT 존재 + 실패
  - 동시 PT 구매 요청 두 건 중 한 건만 성공
  - non-PT + assigned trainer 없음 + 성공
- frontend:
  - PT 선택 시 trainer select 노출/필수
  - non-PT 선택 시 trainer select 비활성 또는 hidden
  - trainer picker 응답에서 최소 필드만 소비
  - payload에 `assignedTrainerId` 포함
  - duplicate/business rule 에러 메시지 렌더링

## Implementation Status

- 완료: 회원권 구매 모달에 PT 전용 담당 트레이너 선택 추가
- 완료: 구매 payload, mock path, backend purchase validation에 `assignedTrainerId` 연결
- 완료: PT 비종결 중복 차단 service validation + partial unique index 추가
- 완료: 관련 backend/frontend 테스트와 API 문서 갱신

## Validation Status

- 통과: `cd frontend && npm test -- --run src/pages/memberships/modules/useMembershipPrototypeState.test.tsx`
- 통과: `cd frontend && npm run build`
- 통과: `cd backend && ./gradlew test --tests com.gymcrm.membership.MembershipPurchaseServiceIntegrationTest --tests com.gymcrm.auth.AuthControllerIntegrationTest`
- 참고: 로컬 Docker PostgreSQL의 `gymcrm_dev`에 적용돼 있던 누락 migration `V27__add_trainer_user_id_to_trainer_schedules.sql`을 복원했다. 원본 checksum 불일치로 `repair` 대신 DB 백업 후 `gymcrm_dev`를 재생성했고, 현재 repo 기준으로 `V1`부터 `V28`까지 재적용해 정합성을 맞췄다.

## Sources & References

- **Origin brainstorm:** `docs/brainstorms/2026-03-27-member-trainer-assignment-brainstorm.md`
  - carried-forward decisions: 회원권 등록 모달을 1차 배정 입력 지점으로 사용, 트레이너 화면 조회 전용 유지, 재배정은 후속 범위
- Similar implementations:
  - `backend/src/main/java/com/gymcrm/membership/controller/MembershipPurchaseController.java:38`
  - `backend/src/main/java/com/gymcrm/membership/service/MembershipPurchaseService.java:63`
  - `frontend/src/pages/memberships/MembershipsPage.tsx:323`
  - `frontend/src/pages/member-context/modules/useSelectedMemberMembershipsQuery.ts:182`
  - `backend/src/main/java/com/gymcrm/reservation/repository/ReservationQueryRepository.java:76`
- Institutional learnings:
  - `docs/solutions/database-issues/pt-availability-based-reservation-integrity-gymcrm-20260327.md`
    - key insight: PT/trainer ownership and booking rules are server-enforced business rules, not UI-only hints
- Related plans:
  - `docs/plans/2026-03-20-feat-trainer-management-and-account-operations-plan.md`
  - `docs/plans/2026-03-27-feat-trainer-availability-schedule-management-plan.md`
- Documentation:
  - `docs/04_API_설계서.md:779`
  - `docs/04_API_설계서.md:826`
  - `docs/04_API_설계서.md:891`
