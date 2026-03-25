---
status: complete
priority: p2
issue_id: "117"
tags: [code-review, backend, settlement, membership, architecture]
dependencies: []
---

# Finish Payment Responsibility Move Or Keep It In Membership

`Payment*` 파일이 물리적으로는 `settlement` 아래로 이동했지만, 실제 Java package는 여전히 `com.gymcrm.membership`입니다. 지금 상태는 책임 이동이 아니라 파일 위치만 바꾼 중간 단계라서, 모듈 경계를 더 혼란스럽게 만듭니다.

## Problem Statement

`Payment`, `PaymentEntity`, `PaymentJpaRepository`, `PaymentRepository`는 모두 `/settlement/...` 경로에 있지만 package 선언은 그대로 `com.gymcrm.membership`입니다.

이 결과:
- membership 서비스는 계속 `com.gymcrm.membership.PaymentRepository`를 import하므로 실제 책임 이동 효과가 없습니다.
- settlement 디렉터리 안에 membership package가 공존하게 되어 구조 정렬 목적과 어긋납니다.
- 다음 QueryDSL 재생성이나 후속 패키지 정리 때 경로/패키지 기준이 다시 충돌할 가능성이 큽니다.

## Findings

- settlement 경로에 있으나 membership package를 선언하는 파일:
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/settlement/entity/Payment.java:1`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/settlement/entity/PaymentEntity.java:1`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/settlement/repository/PaymentJpaRepository.java:1`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/settlement/repository/PaymentRepository.java:1`
- membership 서비스는 여전히 옛 membership 경계를 사용합니다:
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/membership/service/MembershipPurchaseService.java:11`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/membership/service/MembershipRefundService.java:6`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/membership/dto/response/MembershipPaymentResponse.java:3`

## Proposed Solutions

### Option 1: Payment를 실제 settlement 패키지로 끝까지 이동

**Approach:** `Payment*`의 `package` 선언과 참조 import를 `com.gymcrm.settlement.entity` / `com.gymcrm.settlement.repository`로 맞추고, membership 서비스는 settlement 경계를 통해 사용하게 정리합니다.

**Pros:**
- 파일 경로와 Java package가 일치합니다.
- payment 책임이 settlement로 이동했다는 의도가 코드에 반영됩니다.

**Cons:**
- membership, settlement, QueryDSL, 테스트 import를 같이 손봐야 합니다.

**Effort:** 2-4 hours

**Risk:** Medium

---

### Option 2: 이번 브랜치에서는 Payment를 membership 경계에 유지

**Approach:** `Payment*` 파일을 다시 membership 경로로 되돌리고, settlement 이동은 별도 계획으로 분리합니다.

**Pros:**
- 현재 staged 구조와 실제 책임 경계를 다시 일치시킬 수 있습니다.
- half-move 상태를 제거합니다.

**Cons:**
- settlement 정렬 범위가 줄어듭니다.
- payment 이동 의도는 후속 작업으로 미뤄집니다.

**Effort:** 1-2 hours

**Risk:** Low

## Recommended Action

이번 브랜치에서 `Payment` 책임 이동까지 할 생각이 아니라면, 우선 물리적 경로 이동을 되돌리는 편이 더 안전합니다. 반대로 이동을 유지하려면 package와 import를 끝까지 따라가야 합니다.

## Technical Details

**Affected files:**
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/settlement/entity/Payment.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/settlement/entity/PaymentEntity.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/settlement/repository/PaymentJpaRepository.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/settlement/repository/PaymentRepository.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/membership/service/MembershipPurchaseService.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/membership/service/MembershipRefundService.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/membership/dto/response/MembershipPaymentResponse.java`

## Resources

- Branch: `codex/review-auth-settlement-package-alignment`
- Validation command: `cd backend && ./gradlew compileJava --stacktrace`

## Acceptance Criteria

- [x] `Payment*` 파일의 경로와 `package` 선언이 일치한다.
- [x] payment를 참조하는 membership/settlement 코드가 단일 경계를 사용한다.
- [x] 후속 QueryDSL 재생성 시 경로-패키지 혼선이 없다.

## Work Log

### 2026-03-25 - Review Finding

**By:** Codex

**Actions:**
- staged settlement/payment 이동 변경을 검토했다.
- `Payment*` 파일의 실제 경로와 package 선언을 대조했다.
- membership 서비스 import가 어느 경계를 계속 사용하는지 확인했다.

**Learnings:**
- 물리적 이동만 하고 Java package를 유지하면 모듈 경계가 더 헷갈린다.
- payment 책임 이동은 경로만이 아니라 참조 그래프 전체를 같이 바꿔야 의미가 있다.

### 2026-03-25 - Fix Complete

**By:** Codex

**Actions:**
- `Payment`, `PaymentEntity`, `PaymentJpaRepository`, `PaymentRepository`를 `com.gymcrm.settlement.entity` / `com.gymcrm.settlement.repository`로 실제 이동 완료했다.
- `MembershipPurchaseService`, `MembershipRefundService`, `MembershipPaymentResponse`, 관련 테스트 import를 새 settlement payment 경계로 정리했다.
- 패키지 분리 이후 막힌 `PaymentEntity` 생성자 접근을 최소 수정으로 해결했다.
- `cd backend && ./gradlew compileJava --stacktrace`
- `cd backend && ./gradlew compileTestJava --stacktrace`
- `cd backend && ./gradlew test --tests com.gymcrm.auth.AccessRevocationMarkerConfigTest --tests com.gymcrm.auth.AccessTokenDenylistConfigTest --tests com.gymcrm.auth.AuthControllerIntegrationTest --tests com.gymcrm.membership.service.MembershipPurchaseServiceTest --tests com.gymcrm.membership.service.MembershipRefundServiceTest --tests com.gymcrm.membership.MembershipPurchaseServiceIntegrationTest --stacktrace`

**Learnings:**
- entity와 repository를 서로 다른 패키지로 분리하면, 기존 same-package 접근 제어도 함께 점검해야 한다.
- payment 책임 이동은 사용처 import까지 같이 정리해야 비로소 구조 변경으로서 의미가 생긴다.
