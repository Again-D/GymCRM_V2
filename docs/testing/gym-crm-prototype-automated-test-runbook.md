# Gym CRM Prototype Automated Test Runbook (P4-3)

- Date: 2026-02-24
- Scope: Prototype minimum backend automated tests (Phase 4 / P4-3)

## 목적

- 체크리스트의 “최소 자동 테스트” 항목을 어떤 테스트 파일이 커버하는지 명시한다.
- 로컬에서 반복 실행 가능한 명령을 표준화한다.

## Prerequisites

- Java 21
- Docker Postgres running for integration tests
  - `docker compose up -d postgres`
- Gradle local cache path (권장)
  - `GRADLE_USER_HOME=/Users/abc/projects/GymCRM_V2/.gradle-local`

## Recommended Commands

### 1) 최소 자동 테스트 전체 실행 (권장)

```bash
cd /Users/abc/projects/GymCRM_V2/backend
GRADLE_USER_HOME=/Users/abc/projects/GymCRM_V2/.gradle-local ./gradlew test --no-daemon
```

### 2) 멤버십 중심 회귀만 빠르게 실행 (개발 중)

```bash
cd /Users/abc/projects/GymCRM_V2/backend
GRADLE_USER_HOME=/Users/abc/projects/GymCRM_V2/.gradle-local ./gradlew test --no-daemon --tests 'com.gymcrm.membership.*'
```

### 3) 회원/상품 서비스 테스트만 빠르게 실행

```bash
cd /Users/abc/projects/GymCRM_V2/backend
GRADLE_USER_HOME=/Users/abc/projects/GymCRM_V2/.gradle-local ./gradlew test --no-daemon \
  --tests 'com.gymcrm.member.MemberServiceTest' \
  --tests 'com.gymcrm.product.ProductServiceTest'
```

## Checklist Coverage Mapping (P4-3)

### 1. 회원 연락처 중복 검증 테스트

- Covered by:
  - `/Users/abc/projects/GymCRM_V2/backend/src/test/java/com/gymcrm/member/MemberServiceTest.java`
- Key case:
  - DB unique constraint 메시지(`uk_members_center_phone_active`)를 `CONFLICT`로 매핑

### 2. 상품 정책 검증 테스트

- Covered by:
  - `/Users/abc/projects/GymCRM_V2/backend/src/test/java/com/gymcrm/product/ProductServiceTest.java`
- Key cases:
  - 기간제 `validityDays` 누락
  - 횟수제 `totalCount` 누락
  - 홀딩 정책 음수값(`maxHoldDays < 0`)

### 3. 회원권 상태 전이 테스트

- Covered by:
  - `/Users/abc/projects/GymCRM_V2/backend/src/test/java/com/gymcrm/membership/MembershipStatusTransitionServiceTest.java`

### 4. 홀딩 만료일 재산정 테스트

- Covered by:
  - `/Users/abc/projects/GymCRM_V2/backend/src/test/java/com/gymcrm/membership/MembershipHoldServiceTest.java`
  - `/Users/abc/projects/GymCRM_V2/backend/src/test/java/com/gymcrm/membership/MembershipHoldServiceIntegrationTest.java`

### 5. 환불 계산 테스트 (기간제/횟수제)

- Covered by:
  - `/Users/abc/projects/GymCRM_V2/backend/src/test/java/com/gymcrm/membership/MembershipRefundServiceTest.java`

### 6. 구매/환불 트랜잭션 원자성 테스트(가능 범위)

- Covered by:
  - 구매 원자성:
    - `/Users/abc/projects/GymCRM_V2/backend/src/test/java/com/gymcrm/membership/MembershipPurchaseServiceIntegrationTest.java`
  - 환불 원자성:
    - `/Users/abc/projects/GymCRM_V2/backend/src/test/java/com/gymcrm/membership/MembershipRefundServiceIntegrationTest.java`

## Notes

- 일부 통합 테스트는 Docker Postgres(`localhost:5433`)가 필요하다.
- 샌드박스 환경에서는 Gradle 실행 시 소켓 제한으로 권한 상승이 필요할 수 있다.
