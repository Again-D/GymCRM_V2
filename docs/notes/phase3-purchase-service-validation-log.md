# Phase 3 Purchase Service Validation Log (P3-3)

Date: 2026-02-23
Scope: `P3-3 구매 계산/생성 로직`
Implementation: `MembershipPurchaseService` + `MemberMembershipRepository` + `PaymentRepository`

## Implemented
- 기간제 상품 구매 계산
  - 시작일/만료일 계산 (`endDate = startDate + validityDays - 1`)
- 횟수제 상품 구매 계산
  - `total_count`, `remaining_count` 초기화
  - 유효기간 정보가 없으면 `endDate = null`
- 구매 전 검증
  - 회원 ACTIVE 여부
  - 상품 ACTIVE 여부
  - 회원/상품 center 일치 여부
  - 상품 유형/필드 shape 검증 (`DURATION`, `COUNT`)
- 수기 결제 기록 생성
  - `payments` row with `PURCHASE`, `COMPLETED`, configurable payment method (`CASH/CARD/TRANSFER/ETC`)
- 트랜잭션 경계
  - 회원권(`member_memberships`) 생성 + 결제(`payments`) 생성을 `@Transactional` 단일 서비스 메서드로 처리

## Tests Run
- Unit + integration tests (membership package only)
  - Command: `./gradlew test --no-daemon --tests 'com.gymcrm.membership.*'`
  - Result: success

## Verified Scenarios
- Unit
  - 기간제 만료일 계산
  - 횟수제 잔여횟수 초기화 계산
  - 잘못된 상품 shape 차단 (`BUSINESS_RULE`)
  - 비활성 상품 구매 차단 (`BUSINESS_RULE`)
- Integration (PostgreSQL local docker)
  - 구매 성공 시 `member_memberships` + `payments` row 각각 1건 생성
  - 결제 저장 실패 시 회원권 insert 롤백 (부분 저장 없음)

## Notes
- 통합 테스트는 로컬 Docker PostgreSQL(`5433`)를 사용 (`dev` profile).
- `@SpyBean` deprecation warning 존재 (Spring Boot); 현재 테스트 결과에는 영향 없음.
- API/UI 노출은 `P3-4`에서 구현 예정.
