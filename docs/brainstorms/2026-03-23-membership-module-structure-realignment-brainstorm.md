---
date: 2026-03-23
topic: membership-module-structure-realignment
---

# Membership Module Structure Realignment

## What We're Building
`membership` 백엔드 모듈을 `member`처럼 독립 모듈로 유지하면서, 내부 구조를 `controller / dto / service / repository / entity / enums` 기준으로 다시 정렬한다.

이번 1차 범위는 패키지 정리만이 아니라 enum 경계 정리까지 포함한다. 다만 `Payment`는 이번 범위에서 제외하고, `MembershipHold`, `MembershipRefund`, `MembershipTransferHistory`는 `membership` 내부 서브도메인으로 유지한다.

## Why This Approach
설계서는 `membership`을 `member` 하위처럼 표현하고 있지만, 현재 실제 코드는 구매/홀드/환불/상태전이 규칙이 많은 독립 모듈로 분화돼 있다. 이 상태에서 `membership`을 억지로 `member` 아래로 흡수하면 책임이 커지고 경계가 다시 흐려질 가능성이 높다.

따라서 1차 목표는 도메인 분리를 유지한 채 내부 구조만 정리하는 것이다. `member`에서 이미 검증한 구조 정렬 + enum 경계 패턴을 재사용하면, 저장소 전반의 일관성을 높이면서도 범위를 통제할 수 있다.

## Key Decisions
- `membership`은 `member` 하위로 흡수하지 않고 독립 모듈로 유지한다.
- 내부 구조는 `controller / dto / service / repository / entity / enums` 기준으로 정렬한다.
- request/response DTO는 분리된 상태를 유지한다.
- `MembershipHold`, `MembershipRefund`, `MembershipTransferHistory`는 `membership` 내부 서브도메인으로 유지한다.
- `Payment`는 이번 범위에서 제외한다. `settlement` 이동 여부는 후속 작업으로 분리한다.
- 1차 enum 범위는 `membershipStatus`, `holdStatus`, `refundStatus`로 제한한다.
- 구조 변경과 enum 경계 정리는 함께 진행하되, DB 저장 형식은 현행 문자열 유지 전략을 우선 검토한다.

## Recommended Shape
- `membership/controller`
  - 구매, 홀드, 환불 관련 controller를 배치
- `membership/dto/request`
  - 구매/홀드/환불 요청 DTO
- `membership/dto/response`
  - 구매 결과, 홀드 결과, 환불 결과, 목록 응답 DTO
- `membership/service`
  - 외부 진입 서비스와 상태 전이/정책 서비스
- `membership/repository`
  - facade repository와 JPA/QueryDSL/Native query 구현
- `membership/entity`
  - `MemberMembership`, `MembershipHold`, `MembershipRefund`, `MembershipTransferHistory`
- `membership/enums`
  - `MembershipStatus`, `HoldStatus`, `RefundStatus`

## Resolved Questions
- `membership`은 `member` 하위로 다시 묶지 않는다.
- 이번 1차 작업은 `구조 + enum 정리`로 간다.
- 범위는 구매/목록/홀드/환불 전체 흐름을 포함한다.
- request/response DTO는 분리된 상태를 유지한다.
- `MembershipHold`, `MembershipRefund`, `MembershipTransferHistory`는 `membership` 내부에 유지한다.
- `Payment`는 이번 범위에서 제외한다.
- enum 1차 대상은 `membershipStatus`, `holdStatus`, `refundStatus`다.

## Open Questions
- 없음

## Next Steps
→ `/prompts:workflows-plan`으로 `membership` 구조 정렬 및 enum 경계 정리 계획 수립
