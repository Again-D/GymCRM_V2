---
status: complete
priority: p1
issue_id: "114"
tags: [code-review, backend, architecture, reservation, build]
dependencies: []
---

# Finish Reservation Package Realignment Before Merge

현재 `reservation` 모듈은 파일 위치만 `config / controller / dto / entity / enums / repository / service`로 옮겨졌고, 핵심 클래스들의 `package` 선언과 import 그래프가 이전 경계를 그대로 유지하고 있습니다. 이 상태로는 컴파일이 깨져 작업 브랜치가 빌드 불가능합니다.

## Problem Statement

`reservation` 구조 정렬이 부분 적용 상태로 남아 있습니다. controller와 DTO는 새 패키지 기준을 사용하지만, service/repository/entity/config 다수는 여전히 `com.gymcrm.reservation` 패키지에 머물러 있습니다.

이로 인해:
- 새 DTO/컨트롤러가 기대하는 `com.gymcrm.reservation.entity.*`, `service.*` 타입을 찾지 못합니다.
- QueryDSL static import 경로가 실제 엔티티 패키지와 어긋납니다.
- `./gradlew compileJava`가 실패하므로 현재 브랜치는 머지 가능 상태가 아닙니다.

## Findings

- controller는 새 패키지 타입을 import하지만 대상 타입 패키지는 아직 옛 경계입니다:
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/reservation/controller/ReservationController.java:11`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/reservation/controller/ReservationController.java:13`
- 실제 service/repository/config 파일은 새 경로에 있으면서도 `package com.gymcrm.reservation;`를 유지합니다:
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/reservation/service/ReservationService.java:1`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/reservation/repository/ReservationRepository.java:1`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/reservation/config/ReservationLockConfig.java:1`
- entity도 일부는 새 디렉터리에 있으나 옛 패키지를 유지합니다:
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/reservation/entity/Reservation.java:1`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/reservation/entity/TrainerSchedule.java:1`
- 컴파일 확인 결과 `QReservationEntity`, `ReservationEntity`, `ReservationService`, `TrainerSchedule` 등을 찾지 못해 `compileJava`가 실패합니다.
  - 실행 명령: `cd backend && ./gradlew compileJava --stacktrace`

## Proposed Solutions

### Option 1: Reservation 모듈 전체 package/import를 한 번에 정합화

**Approach:** `entity / enums / repository / service / config` 하위의 모든 reservation 파일에 대해 package 선언과 import, QueryDSL static import를 새 구조에 맞게 전면 수정합니다.

**Pros:**
- 구조 정렬 목표와 실제 코드가 일치합니다.
- 컴파일 오류를 가장 직접적으로 해소합니다.
- 이후 DTO/controller 분리 작업과도 경계가 맞습니다.

**Cons:**
- 영향 파일 수가 많아 한번에 검증 범위가 넓습니다.
- reservation 관련 테스트와 membership 연동 import까지 같이 확인해야 합니다.

**Effort:** 2-4 hours

**Risk:** Medium

---

### Option 2: 구조 정렬 커밋을 되돌리고 DTO 분리만 유지

**Approach:** package move를 일단 취소하고 controller DTO extraction만 유지한 뒤, 패키지 리팩터링은 별도 브랜치에서 다시 진행합니다.

**Pros:**
- 빠르게 빌드 가능 상태로 되돌릴 수 있습니다.
- 리뷰 범위가 줄어듭니다.

**Cons:**
- 이번 브랜치의 구조 정렬 목표를 달성하지 못합니다.
- 같은 파일을 다시 두 번 건드리게 됩니다.

**Effort:** 1-2 hours

**Risk:** Medium

## Recommended Action

완료:
- `config / entity / enums / repository / service` 하위 reservation 파일의 `package` 선언을 실제 경로와 일치시킴
- controller, access, QueryDSL static import가 새 reservation 경계를 바라보도록 정리함
- `compileJava`, `compileTestJava` 통과로 빌드 차단 해소 확인

## Technical Details

**Affected files:**
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/reservation/controller/ReservationController.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/reservation/config/ReservationLockConfig.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/reservation/service/ReservationService.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/reservation/service/ReservationStatusTransitionService.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/reservation/repository/ReservationRepository.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/reservation/repository/ReservationJpaRepository.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/reservation/repository/ReservationQueryRepository.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/reservation/repository/TrainerScheduleRepository.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/reservation/entity/Reservation.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/reservation/entity/TrainerSchedule.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/reservation/enums/ReservationStatus.java`

## Resources

- Branch: `feature/refactor-reservation-module-structure-alignment`
- Validation command: `cd backend && ./gradlew compileJava --stacktrace`

## Acceptance Criteria

- [x] reservation 모듈의 파일 위치와 `package` 선언이 일치한다.
- [x] controller/DTO가 참조하는 `entity`, `service`, `repository` 타입이 새 패키지 기준으로 resolve된다.
- [x] QueryDSL static import가 새 Q타입 패키지와 일치한다.
- [x] `cd backend && ./gradlew compileJava`가 통과한다.

## Work Log

### 2026-03-25 - Review Finding

**By:** Codex

**Actions:**
- 현재 브랜치의 staged reservation 구조 정렬 변경을 리뷰했다.
- controller, service, repository, entity, config 파일의 package 선언을 대조했다.
- `compileJava`를 실행해 실제 빌드 실패를 확인했다.

**Learnings:**
- 이번 변경은 단순 rename이 아니라 package/import 정합화가 함께 필요하다.
- reservation 모듈은 controller만 새 패키지 기준으로 전환되어 있어 중간 상태로 남아 있다.

### 2026-03-25 - Fix Complete

**By:** Codex

**Actions:**
- reservation `config`, `entity`, `enums`, `repository`, `service` 하위 파일의 package 선언을 새 경로와 맞췄다.
- `AccessService`와 controller/DTO/QueryDSL import를 새 reservation 경계로 정리했다.
- `cd backend && ./gradlew compileJava --stacktrace`
- `cd backend && ./gradlew compileTestJava --stacktrace`

**Learnings:**
- package move는 파일 이동만으로 끝나지 않고, cross-module import와 Q-type 경로까지 동시에 맞춰야 한다.
