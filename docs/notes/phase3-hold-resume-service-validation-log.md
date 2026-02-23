# Phase 3 Hold/Resume Service Validation Log (P3-5)

Date: 2026-02-23
Scope: `P3-5 홀딩/해제 로직`
Implementation: `MembershipHoldService` + `MembershipHoldRepository` + `MemberMembershipRepository` updates

## Implemented
- 홀딩 처리 서비스 (`hold`)
  - 홀딩 기간 검증 (`holdStartDate`, `holdEndDate`)
  - 홀딩 가능 여부 검증
    - 상품 `allowHold`
    - 회원권 상태 전이 (`ACTIVE -> HOLDING`)
    - 횟수제 잔여횟수 체크
    - 기간제 만료 여부 체크(`endDate < holdStartDate` 차단)
    - 상품 `maxHoldDays`, `maxHoldCount` 제한 체크
  - `membership_holds` 이력 생성 + `member_memberships.membership_status=HOLDING`
- 해제 처리 서비스 (`resume`)
  - 활성 홀딩 이력 조회 (`hold_status=ACTIVE`)
  - 상태 전이 (`HOLDING -> ACTIVE`)
  - 실제 홀딩일수 계산 (inclusive)
  - 회원권 만료일 재산정 (`endDate + actualHoldDays`)
  - `hold_days_used`, `hold_count_used` 누적 반영
  - 홀딩 이력 `RESUMED` 처리 (`resumed_at`, `actual_hold_days`)
- 트랜잭션 경계
  - `hold`, `resume` 모두 `@Transactional`

## Tests Run
- Command: `GRADLE_USER_HOME=/Users/abc/projects/GymCRM_V2/.gradle-local ./gradlew test --no-daemon --tests 'com.gymcrm.membership.*'`
- Result: success

## Verified Scenarios
- Unit (`MembershipHoldServiceTest`)
  - 홀딩 시작/종료일 역전 입력 차단 (`VALIDATION_ERROR`)
  - 상품 홀딩 불가(`allowHold=false`) 차단 (`BUSINESS_RULE`)
  - 횟수제 잔여횟수 0인 회원권 홀딩 차단 (`BUSINESS_RULE`)
  - 실제 홀딩일수 계산(inclusive) 확인
  - 해제 시 만료일 재산정 계산 확인
- Integration (`MembershipHoldServiceIntegrationTest`)
  - 홀딩 성공 시 회원권 상태 `HOLDING`, 홀딩 이력 `ACTIVE` 생성
  - 해제 성공 시 회원권 상태 `ACTIVE` 복귀, `actualHoldDays=3`, 만료일 `+3일` 반영
  - 홀딩 이력 `RESUMED`, `resumed_at`, `actual_hold_days` 저장 확인
  - 홀딩 이력 insert 실패 시 트랜잭션 롤백되어 회원권 상태 변경 미반영(`ACTIVE` 유지)

## Notes
- `P3-5`는 서비스/리포지토리 레벨 구현 및 검증까지 포함하며, API/UI 노출은 `P3-6` 범위입니다.
- 해제 시 실제 홀딩일수는 `holdStartDate`와 `resumeDate`를 포함하는 inclusive 계산을 사용합니다.
