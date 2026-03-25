---
status: complete
priority: p1
issue_id: "115"
tags: [code-review, backend, architecture, product, build]
dependencies: []
---

# Complete Product Package Split Before Other Modules Depend On It

`product` 모듈도 reservation 작업과 함께 부분적으로 패키지 정렬이 진행됐지만, 현재는 일부 파일만 새 package를 사용하고 나머지는 옛 package를 유지하고 있습니다. 이 때문에 membership/product/controller 간 import가 동시에 깨지고 있습니다.

## Problem Statement

`ProductQueryRepository`와 controller/DTO는 새 구조를 기준으로 움직였지만, `Product`, `ProductService`, `ProductRepository`, `ProductJpaRepository`는 여전히 `com.gymcrm.product` 패키지를 유지하고 있습니다.

이 결과:
- controller와 membership 서비스가 `com.gymcrm.product.entity.Product`, `com.gymcrm.product.service.ProductService`를 import하지만 실제 타입이 존재하지 않습니다.
- product 저장소 계층도 `ProductEntity`, `ProductQueryRepository`를 서로 다른 패키지 가정으로 참조해 compile이 깨집니다.
- reservation 리팩터링 브랜치가 product 모듈까지 동시에 불안정하게 만듭니다.

## Findings

- 새 구조를 기대하는 import:
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/product/controller/ProductController.java:8`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/product/controller/ProductController.java:9`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/membership/service/MembershipPurchaseService.java:18`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/membership/service/MembershipHoldService.java:12`
- 실제 타입 선언은 옛 패키지에 남아 있습니다:
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/product/entity/Product.java:1`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/product/service/ProductService.java:1`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/product/repository/ProductRepository.java:1`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/product/repository/ProductJpaRepository.java:1`
- staged diff에서는 `ProductQueryRepository`만 `com.gymcrm.product.repository`로 바뀌어 있어 저장소 계층도 내부 정합성이 깨집니다:
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/product/repository/ProductQueryRepository.java:1`
- `compileJava` 오류에도 product 타입 미해결이 함께 포함됩니다.

## Proposed Solutions

### Option 1: Product 모듈을 reservation과 같은 기준으로 끝까지 정렬

**Approach:** `entity / repository / service` 전 파일의 package 선언과 import를 새 구조로 정렬하고, controller/DTO/membership import도 같이 맞춥니다.

**Pros:**
- 현재 import 불일치를 근본적으로 해결합니다.
- reservation/membership가 기대하는 product 경계와 일치합니다.

**Cons:**
- 이번 브랜치 범위가 reservation에서 product까지 넓어집니다.
- product 테스트 회귀까지 같이 확인해야 합니다.

**Effort:** 2-4 hours

**Risk:** Medium

---

### Option 2: 이번 브랜치에서는 ProductQueryRepository 변경을 제외

**Approach:** reservation 구조 정렬이 목적이라면, product 패키지 변경은 되돌리고 product 모듈은 별도 브랜치에서 다룹니다.

**Pros:**
- 현재 브랜치의 범위를 줄일 수 있습니다.
- reservation compile 오류를 product와 분리해 해결할 수 있습니다.

**Cons:**
- 이미 바뀐 import를 다시 조정해야 합니다.
- product 구조 정렬은 다시 계획이 필요합니다.

**Effort:** 1-2 hours

**Risk:** Low

## Recommended Action

완료:
- `Product`, `ProductService`, `ProductRepository`, `ProductJpaRepository`, `ProductQueryRepository`의 package/import를 새 구조에 맞춤
- membership/controller/test import를 새 product 경계로 정리함
- `compileJava`, `compileTestJava` 통과로 cross-module import 복구 확인

## Technical Details

**Affected files:**
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/product/controller/ProductController.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/product/entity/Product.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/product/entity/ProductEntity.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/product/repository/ProductJpaRepository.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/product/repository/ProductQueryRepository.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/product/repository/ProductRepository.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/product/service/ProductService.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/membership/service/MembershipPurchaseService.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/membership/service/MembershipHoldService.java`

## Resources

- Branch: `feature/refactor-reservation-module-structure-alignment`
- Validation command: `cd backend && ./gradlew compileJava --stacktrace`

## Acceptance Criteria

- [x] product 모듈의 파일 위치와 `package` 선언이 일치한다.
- [x] `ProductController`, membership 서비스, product 저장소 간 import가 실제 타입 선언과 일치한다.
- [x] `ProductQueryRepository`와 `ProductRepository`가 같은 패키지 경계를 공유한다.
- [x] `cd backend && ./gradlew compileJava`가 통과한다.

## Work Log

### 2026-03-25 - Review Finding

**By:** Codex

**Actions:**
- current branch의 staged product 변경을 reservation 변경과 함께 검토했다.
- product controller/service/repository/entity의 package 선언과 import를 대조했다.
- compileJava 실패 로그에서 product 타입 해석 오류를 확인했다.

**Learnings:**
- product는 일부 파일만 새 패키지 구조를 따르고 있어 cross-module import가 동시에 깨진다.
- reservation 브랜치라도 product 변경을 함께 스테이징하면 build blocker가 된다.

### 2026-03-25 - Fix Complete

**By:** Codex

**Actions:**
- product `entity`, `service`, `repository` 선언을 파일 위치와 일치하도록 정리했다.
- `QProductEntity` static import를 새 entity 경계로 수정했다.
- membership, access, crm, settlement, persistence, reservation 테스트의 product import를 새 경계로 정리했다.
- `cd backend && ./gradlew compileJava --stacktrace`
- `cd backend && ./gradlew compileTestJava --stacktrace`

**Learnings:**
- product처럼 다른 모듈이 넓게 참조하는 타입은 테스트 import까지 같이 손봐야 구조 정렬이 완료된다.
