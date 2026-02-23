# Phase 3 Refund Service Validation Log (P3-7)

Date: 2026-02-23
Scope: `P3-7 환불 계산/처리 로직`
Implementation: `MembershipRefundService` + `MembershipRefundRepository` + `PaymentRepository` refund/purchase lookup extension

## Implemented
- 프로토타입 고정 환불 정책
  - 계산식: `refund = max(0, original - used - penalty)`
  - 위약금: `original * 10%`
- 기간제 사용분 계산
  - `used = original * (usedDays / totalDays)`
  - inclusive 일수 계산 기반
  - `hold_days_used` 반영(완료된 홀딩일수 차감)
- 횟수제 사용분 계산
  - `used = original * (usedCount / totalCount)`
  - `usedCount`와 `total-remaining` 중 큰 값을 사용해 방어적 계산
- 음수 환불액 방지 (`max(0, ...)`)
- 환불 처리 트랜잭션
  - `payments` 수기 환불 결제기록 생성 (`payment_type=REFUND`)
  - `membership_refunds` 이력 생성
  - 회원권 상태 `REFUNDED` 전이
- 중복 환불 방지
  - `membership_refunds` 조회 기반 선제 차단 (DB unique index와 함께 방어)
- 환불 미리보기/확정 공통 계산 경로 사용 (`preview`, `refund`)

## Tests Run
- Command
  - `GRADLE_USER_HOME=/Users/abc/projects/GymCRM_V2/.gradle-local ./gradlew test --no-daemon --tests 'com.gymcrm.membership.*'`
- Result: success

## Verified Scenarios
- Unit (`MembershipRefundServiceTest`)
  - 기간제 비례 사용분 + 위약금 계산
  - 횟수제 비례 사용분 계산
  - 음수 환불액 `0` clamp
  - `REFUNDED` 상태 재환불 불가(상태 전이 규칙)
- Integration (`MembershipRefundServiceIntegrationTest`)
  - 동일 입력에서 미리보기/확정 환불액 일치
  - 환불 성공 시 `payments(REFUND)` + `membership_refunds` 생성 및 회원권 상태 `REFUNDED`
  - 재환불 요청 차단 (`CONFLICT` 경로)
  - 환불 이력 insert 실패 시 트랜잭션 롤백(환불 결제기록/상태변경 미반영)

## Notes
- `P3-7`은 서비스/리포지토리 레벨 구현까지 포함하며, 환불 API/UI는 `P3-8` 범위입니다.
- 환불 기준 금액(`originalAmount`)은 `payments`의 최신 완료 구매 결제기록(`PURCHASE/COMPLETED`)을 사용합니다.
