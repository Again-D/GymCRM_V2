---
status: complete
priority: p2
issue_id: "119"
tags: [code-review, backend, settlement, architecture, package-structure]
dependencies: []
---

# Finish Settlement Package Realignment For Subpackages

`settlement` 모듈은 파일 경로상으로 `config/`, `controller/`, `repository/`, `service/`, `entity/` 하위로 나뉘어 있지만, `Payment*`를 제외한 대부분의 파일이 여전히 루트 package `com.gymcrm.settlement`를 선언합니다. 지금은 컴파일이 되지만, 실제 구조와 Java package가 다시 어긋나 있어 패키지 정렬 의도가 반쯤만 반영된 상태입니다.

## Problem Statement

예를 들어 [SalesDashboardCacheConfig.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/settlement/config/SalesDashboardCacheConfig.java), [SalesDashboardController.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/settlement/controller/SalesDashboardController.java), [SalesDashboardService.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/settlement/service/SalesDashboardService.java), [SalesDashboardRepository.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/settlement/repository/SalesDashboardRepository.java) 는 물리적으로는 하위 디렉터리에 있지만 모두 `package com.gymcrm.settlement;` 입니다.

이 결과:
- 파일 경로만 보고 `config/controller/service/repository` 경계가 분리된 것처럼 보이지만, 실제로는 같은 루트 package 안에 남아 있습니다.
- same-package 접근과 import 생략이 계속 허용되어, 계층 경계가 느슨하게 유지됩니다.
- 이후 다른 모듈처럼 엄격한 패키지 정렬을 계속하려 할 때, settlement만 예외 구조가 되어 다시 혼선을 만듭니다.

## Findings

- 경로와 package 선언이 어긋난 대표 파일:
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/settlement/config/SalesDashboardCacheConfig.java:1`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/settlement/controller/SalesDashboardController.java:1`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/settlement/repository/SalesDashboardRepository.java:1`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/settlement/service/SalesDashboardService.java:1`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/settlement/config/SalesSettlementReportCacheConfig.java:1`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/settlement/controller/SalesSettlementReportController.java:1`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/settlement/repository/SalesSettlementReportRepository.java:1`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/settlement/service/SalesSettlementReportService.java:1`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/settlement/controller/TrainerPayrollSettlementController.java:1`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/settlement/repository/TrainerPayrollSettlementRepository.java:1`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/settlement/service/TrainerPayrollSettlementService.java:1`
- 반면 `Payment*`는 실제로 하위 package를 사용합니다:
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/settlement/entity/Payment.java:1`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/settlement/repository/PaymentRepository.java:1`
- 현재 상태는 compile 기준으로는 통과합니다:
  - `cd backend && ./gradlew compileJava --stacktrace`
  - `cd backend && ./gradlew compileTestJava --stacktrace`

## Proposed Solutions

### Option 1: settlement 전체를 실제 하위 package 기준으로 끝까지 정렬

**Approach:** `config/controller/repository/service` 아래 파일들의 `package` 선언과 상호 import를 실제 경로에 맞게 `com.gymcrm.settlement.config`, `com.gymcrm.settlement.controller`, `com.gymcrm.settlement.repository`, `com.gymcrm.settlement.service` 로 바꿉니다.

**Pros:**
- 파일 경로와 package가 일치합니다.
- settlement도 다른 모듈과 같은 패키지 규칙을 따르게 됩니다.
- 계층 경계가 더 명확해집니다.

**Cons:**
- 컨트롤러/서비스/설정/테스트 import를 같이 손봐야 합니다.
- same-package 접근에 의존한 코드가 있으면 드러납니다.

**Effort:** 2-4 hours

**Risk:** Medium

---

### Option 2: settlement는 루트 package 유지로 명시하고 디렉터리만 정리 상태로 둠

**Approach:** 지금 구조를 의도된 예외로 받아들이고, 문서나 기준에서 settlement는 루트 package 유지라고 명시합니다.

**Pros:**
- 추가 리팩터링 비용이 없습니다.
- 현재 컴파일/테스트 상태를 그대로 유지할 수 있습니다.

**Cons:**
- 경로와 package가 불일치한 상태를 제도화하게 됩니다.
- 다른 모듈의 엄격 정렬 방향과 충돌합니다.

**Effort:** 0.5-1 hour

**Risk:** Medium

## Recommended Action

다른 모듈이 이미 `controller/service/repository/entity` 경계를 실제 package로 맞추는 방향으로 가고 있으므로, settlement도 같은 기준으로 끝까지 정렬하는 편이 일관됩니다.

## Technical Details

**Affected files:**
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/settlement/config/SalesDashboardCacheConfig.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/settlement/config/SalesSettlementReportCacheConfig.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/settlement/controller/SalesDashboardController.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/settlement/controller/SalesSettlementReportController.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/settlement/controller/TrainerPayrollSettlementController.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/settlement/repository/SalesDashboardRepository.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/settlement/repository/SalesSettlementReportRepository.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/settlement/repository/TrainerPayrollSettlementRepository.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/settlement/service/SalesDashboardService.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/settlement/service/SalesSettlementReportService.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/settlement/service/TrainerPayrollSettlementService.java`

## Resources

- Review scope: `develop` branch `settlement` package/import consistency review
- Validation commands:
  - `cd backend && ./gradlew compileJava --stacktrace`
  - `cd backend && ./gradlew compileTestJava --stacktrace`

## Acceptance Criteria

- [x] `settlement/config` 파일들이 `com.gymcrm.settlement.config`를 선언한다.
- [x] `settlement/controller` 파일들이 `com.gymcrm.settlement.controller`를 선언한다.
- [x] `settlement/repository` 파일들이 `com.gymcrm.settlement.repository`를 선언한다.
- [x] `settlement/service` 파일들이 `com.gymcrm.settlement.service`를 선언한다.
- [x] settlement 테스트/참조 import가 새 경계에 맞게 정리된다.
- [x] `compileJava`, `compileTestJava`가 통과한다.

## Work Log

### 2026-03-25 - Review Finding

**By:** Codex

**Actions:**
- settlement 하위 파일들의 실제 경로와 `package` 선언을 전수 점검했다.
- settlement 관련 import가 새 하위 package를 기대하는지 검색했다.
- `compileJava`, `compileTestJava`로 현재 빌드 상태를 확인했다.

**Learnings:**
- settlement는 파일 위치만 `config/controller/repository/service`로 나뉘고, 실제 Java package는 대부분 루트에 남아 있다.
- 이 상태는 빌드는 통과하지만, 구조 정렬 관점에서는 반쪽짜리 이동이다.

### 2026-03-25 - Implementation

**By:** Codex

**Actions:**
- `settlement/config`, `controller`, `repository`, `service` 하위 파일들의 package 선언을 실제 디렉터리와 일치하도록 정리했다.
- controller/config/service/test에서 새 subpackage import를 반영했다.
- package realignment 이후 `compileJava`, `compileTestJava`, settlement 관련 targeted test를 실행해 참조 회귀를 검증했다.

**Learnings:**
- cache service 구현체와 설정 클래스까지 함께 이동해야 settlement package 정렬이 실제로 닫힌다.
- 테스트는 루트 package에 두더라도 명시적 import만 정리하면 하위 package 경계를 유지할 수 있다.
