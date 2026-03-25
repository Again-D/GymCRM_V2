---
status: complete
priority: p1
issue_id: "116"
tags: [code-review, backend, auth, build, architecture]
dependencies: []
---

# Complete Auth Package Realignment Before Merging

`auth` 패키지를 `com.gymcrm.common.auth` 하위로 옮기려는 staged 변경이 중간 상태로 남아 있습니다. 일부 파일만 새 패키지로 바뀌고, 나머지는 여전히 `com.gymcrm.auth`를 유지해서 `compileJava`가 바로 깨집니다.

## Problem Statement

물리적 경로는 `/common/auth/...`로 이동했지만, 컨트롤러/저장소/서비스 다수가 여전히 옛 package 선언과 import를 사용하고 있습니다.

이 결과:
- `AuthUserJpaRepository`, `AuthUserRepository`, `RoleJpaRepository`, `AuthRefreshTokenQueryRepository`, `AuthController`가 새 경로 아래 있으면서도 `com.gymcrm.auth` 패키지에 남아 있습니다.
- 새 패키지로 옮긴 `AuthService`, `AuthRefreshTokenRepository`, `RedisAccessTokenDenylistService`가 이 타입들을 찾지 못합니다.
- QueryDSL static import도 여전히 `com.gymcrm.auth.QAuthRefreshTokenEntity`를 가리켜 빌드가 차단됩니다.

## Findings

- 파일 경로와 package 선언이 어긋난 대표 예:
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/common/auth/repository/AuthUserJpaRepository.java:1`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/common/auth/repository/AuthRefreshTokenQueryRepository.java:1`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/common/auth/controller/AuthController.java:1`
- 새 패키지 기준 구현은 이미 이 타입들을 `com.gymcrm.common.auth...`로 기대합니다:
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/common/auth/repository/AuthRefreshTokenRepository.java:1`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/common/auth/service/AuthService.java:1`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/common/auth/service/RedisAccessTokenDenylistService.java:1`
- QueryDSL import도 이전 패키지에 고정돼 있습니다:
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/common/auth/repository/AuthRefreshTokenQueryRepository.java:9`

## Proposed Solutions

### Option 1: auth 모듈 전체를 새 패키지로 끝까지 정렬

**Approach:** `common/auth` 아래로 이동한 파일들의 `package` 선언, 상호 import, QueryDSL Q-type import를 전부 `com.gymcrm.common.auth...` 기준으로 맞춥니다.

**Pros:**
- staged 변경 의도와 실제 코드 경계가 일치합니다.
- `compileJava` 실패를 직접 해소합니다.

**Cons:**
- auth를 참조하는 보안 설정/테스트 import까지 함께 확인해야 합니다.

**Effort:** 2-4 hours

**Risk:** Medium

---

### Option 2: 이번 브랜치에서는 auth 이동을 되돌림

**Approach:** `common/auth`로 옮긴 staged 변경을 취소하고, auth 구조 정렬은 별도 브랜치에서 다시 진행합니다.

**Pros:**
- 현재 빌드 차단을 빠르게 해소할 수 있습니다.
- settlement 변경과 auth 변경을 분리할 수 있습니다.

**Cons:**
- 이번 staged 변경 목표가 축소됩니다.
- auth 구조 정렬은 다시 계획이 필요합니다.

**Effort:** 1-2 hours

**Risk:** Low

## Recommended Action

먼저 `auth` 모듈 하나만 기준으로 package/import/Q-type 정합성을 맞춰 `compileJava`를 복구해야 합니다. 현재 상태로는 PR 생성 전 단계도 넘기면 안 됩니다.

## Technical Details

**Affected files:**
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/common/auth/controller/AuthController.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/common/auth/repository/AuthUserJpaRepository.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/common/auth/repository/AuthUserRepository.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/common/auth/repository/RoleJpaRepository.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/common/auth/repository/AuthRefreshTokenQueryRepository.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/common/auth/repository/AuthRefreshTokenRepository.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/common/auth/service/AuthService.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/common/auth/service/RedisAccessTokenDenylistService.java`

## Resources

- Branch: `codex/review-auth-settlement-package-alignment`
- Validation command: `cd backend && ./gradlew compileJava --stacktrace`

## Acceptance Criteria

- [x] `common/auth` 아래 파일들의 경로와 `package` 선언이 일치한다.
- [x] auth 내부 상호 import가 새 패키지 기준으로 일치한다.
- [x] QueryDSL Q-type import가 실제 생성 위치와 일치한다.
- [x] `cd backend && ./gradlew compileJava --stacktrace`가 통과한다.

## Work Log

### 2026-03-25 - Review Finding

**By:** Codex

**Actions:**
- staged auth 이동 변경을 검토했다.
- `compileJava`를 실행해 build 상태를 확인했다.
- package 선언, import, QueryDSL static import의 불일치를 대조했다.

**Learnings:**
- auth 구조 이동은 일부 파일만 새 패키지를 사용하고 있어 즉시 build blocker가 된다.
- 경로 이동과 package/import/Q-type 갱신은 한 번에 끝내야 한다.

### 2026-03-25 - Fix Complete

**By:** Codex

**Actions:**
- `common/auth` 아래 root/controller/entity/repository/service 파일들의 `package` 선언을 실제 경로와 일치하도록 정리했다.
- `AuthController`, `AuthUserRepository`, `AuthRefreshTokenQueryRepository` 등에서 새 auth 경계 import와 QueryDSL static import를 정리했다.
- `SecurityConfig`, `OpenApiConfig`, `MemberService`, `TrainerService`, `ReservationService`, `MembershipPurchaseService` 등 외부 참조 import를 새 auth 경계로 맞췄다.
- auth 관련 테스트들의 import를 새 경계 기준으로 정리했다.
- `cd backend && ./gradlew compileJava --stacktrace`
- `cd backend && ./gradlew compileTestJava --stacktrace`
- `cd backend && ./gradlew test --tests com.gymcrm.auth.AccessRevocationMarkerConfigTest --tests com.gymcrm.auth.AccessTokenDenylistConfigTest --tests com.gymcrm.auth.AuthControllerIntegrationTest --tests com.gymcrm.membership.service.MembershipPurchaseServiceTest --tests com.gymcrm.membership.service.MembershipRefundServiceTest --tests com.gymcrm.membership.MembershipPurchaseServiceIntegrationTest --stacktrace`

**Learnings:**
- auth처럼 횡단 참조가 많은 모듈은 내부 패키지 정리만으로 끝나지 않고, 보안 설정과 연계 서비스, 테스트 import까지 같이 맞춰야 한다.
- QueryDSL 정적 import와 테스트의 same-package 가정이 남아 있으면 compile은 복구돼도 compileTest가 다시 깨진다.
