# Phase 3 Membership Status Transition Rules (P3-2)

Date: 2026-02-23
Scope: 프로토타입 회원권 상태 전이 최소 규칙 정의

## Status Enum (Minimum Set)
- `ACTIVE`
- `HOLDING`
- `REFUNDED`
- `EXPIRED`

## Allowed Transitions

| From | To | Allowed | Notes |
|---|---|---|---|
| `ACTIVE` | `HOLDING` | Yes | 홀딩 시작 |
| `ACTIVE` | `REFUNDED` | Yes | 환불 처리 완료 |
| `ACTIVE` | `EXPIRED` | Yes | 기간 만료/정책 만료 처리 |
| `ACTIVE` | `ACTIVE` | No | same-state 요청은 전이로 보지 않음 |
| `HOLDING` | `ACTIVE` | Yes | 홀딩 해제 |
| `HOLDING` | `REFUNDED` | Yes | 홀딩 중 환불 허용 (프로토타입 정책) |
| `HOLDING` | `EXPIRED` | Yes | 홀딩 상태에서 만료 처리 |
| `HOLDING` | `HOLDING` | No | same-state 요청 차단 |
| `REFUNDED` | any | No | terminal state |
| `EXPIRED` | any | No | terminal state |

## Error Strategy
- 입력 상태값 누락(`null`) -> `VALIDATION_ERROR`
- 허용되지 않은 전이 요청 -> `BUSINESS_RULE`
  - 메시지에 `from/to` 상태 포함 (디버깅 용이성)

## Implementation Notes
- Service: `com.gymcrm.membership.MembershipStatusTransitionService`
- API/DB 레벨 enum 문자열과 정렬되는 Java enum `MembershipStatus` 사용
- 실제 회원권 구매/홀딩/환불 서비스(`P3-3+`)에서 상태 변경 전 항상 이 서비스 호출

## Follow-ups (P3-3+)
- 상태 전이 실행 시점별 부가 검증 추가
  - `ACTIVE -> HOLDING`: 상품 홀딩 정책/기간/횟수 검증
  - `* -> REFUNDED`: 재환불 차단, 결제/환불 레코드 원자성 검증
  - `* -> EXPIRED`: 만료 기준 시각/잔여횟수 정책 정리
