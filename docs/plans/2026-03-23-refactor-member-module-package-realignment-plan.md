---
title: refactor: Realign member module package structure and enum typing
type: refactor
status: completed
date: 2026-03-23
origin: docs/brainstorms/2026-03-23-member-package-realignment-brainstorm.md
---

# refactor: Realign member module package structure and enum typing

## Enhancement Summary

**Deepened on:** 2026-03-23  
**Deepened with:** architecture, data-integrity, pattern, performance, security review passes; Spring Boot and Hibernate documentation

### Key Improvements
1. DTO, service, repository, entity의 소유 경계를 문서 구조에 맞게 단순화했다.
2. enum 파싱/직렬화 계약과 DB 문자열 유지 전략을 더 엄격하게 고정했다.
3. `JpaRepository + QueryDSL + facade repository` 3중 구조를 정리하는 저장소 통합 단계를 추가했다.
4. QueryDSL 재생성, 빠른/느린 검증 분리, legacy row 호환 테스트를 계획에 추가했다.

### New Considerations Discovered
- 첫 시범 모듈인 `member`가 현 저장소의 평평한 패턴과 다를 수 있으므로, 이번 구조는 `pilot convention`으로 다루고 후속 문서에서 repo-wide 확장 여부를 결정해야 한다.
- DTO 추출 시 `phoneEncrypted`, `birthDateEncrypted`, `piiKeyVersion` 같은 내부 PII 필드가 외부 응답으로 새지 않도록 명시적 경계가 필요하다.

## Overview
`member` 백엔드 모듈을 [02_시스템_아키텍처_설계서.md](/Users/abc/projects/GymCRM_V2/docs/02_%EC%8B%9C%EC%8A%A4%ED%85%9C_%EC%95%84%ED%82%A4%ED%85%8D%EC%B2%98_%EC%84%A4%EA%B3%84%EC%84%9C.md)의 목표 패키지 구조에 가깝게 점진 정렬한다. 이번 작업은 첫 시범 모듈로 `member`만 다루며, 이후 `trainer`, `reservation` 정렬의 기준 패턴을 만드는 것이 목적이다.

브레인스토밍에서 합의한 범위대로 `(see brainstorm: docs/brainstorms/2026-03-23-member-package-realignment-brainstorm.md)` 단순 폴더 이동이 아니라 `controller/service/repository/entity/dto/enums` 재배치, `MemberController` 내부 DTO 분리, `memberStatus`와 `gender`의 Java enum 전환, 후속 모듈 적용 기준 문서화까지 포함한다. DB 저장 형식은 문자열 유지로 제한해 스키마 마이그레이션 리스크는 이번 범위에서 제외한다.

## Problem Statement
현재 `member` 모듈은 도메인 단위 패키지는 갖고 있지만 내부 구조가 평평하다. [MemberController.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberController.java), [MemberService.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberService.java), [MemberRepository.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberRepository.java), [MemberEntity.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberEntity.java) 같은 핵심 타입이 한 패키지에 섞여 있고, controller와 service 내부에 request/response/summary record가 함께 들어 있다.

이 구조는 현재 동작에는 문제가 없지만 다음 문제가 있다.
- 계층 경계가 파일 위치로 드러나지 않아 탐색 비용이 높다.
- `memberStatus`, `gender`가 문자열로 흩어져 검증과 매핑이 반복된다.
- QueryDSL projection, repository 로직, API DTO가 서로 다른 계층에 섞여 있어 변경 영향이 넓어진다.
- `MemberJpaRepository`, `MemberQueryRepository`, `MemberRepository`가 역할은 다르지만 저장소 경계가 3단으로 나뉘어 있어 읽기/쓰기 책임이 한눈에 보이지 않는다.
- 이후 `trainer`, `reservation` 정렬에 재사용할 기준 패턴이 아직 없다.

## Proposed Solution
브레인스토밍에서 결정한 방향을 그대로 따른다 `(see brainstorm: docs/brainstorms/2026-03-23-member-package-realignment-brainstorm.md)`.

핵심 원칙:
- 패키지 구조만 정리하는 데서 멈추지 않고, 타입 안정성을 위해 Java enum을 함께 도입한다.
- DB 컬럼은 계속 `VARCHAR`로 유지하고 Java 레벨에서만 enum을 사용한다.
- 기존 REST API JSON 계약은 유지한다.
- repository는 최종적으로 service가 의존하는 진입점 하나로 정리하고, JPA/QueryDSL 구현 세부사항은 내부 구현으로 밀어 넣는다.
- `member`에서 정한 규칙을 후속 모듈에 반복 적용할 수 있게 문서화한다.
- 이번 구조는 `member`의 pilot convention으로 두고, repo-wide backend standard 채택 여부는 후속 문서에서 판단한다.

목표 구조 예시:

```text
backend/src/main/java/com/gymcrm/member/
├── controller/
│   └── MemberController.java
├── dto/
│   ├── request/
│   │   ├── MemberCreateRequest.java
│   │   └── MemberUpdateRequest.java
│   └── response/
│       ├── MemberDetailResponse.java
│       └── MemberSummaryResponse.java
├── enums/
│   ├── Gender.java
│   └── MemberStatus.java
├── entity/
│   ├── Member.java
│   └── MemberEntity.java
├── repository/
│   ├── MemberJpaRepository.java
│   ├── MemberQueryRepository.java
│   └── MemberRepository.java
└── service/
    └── MemberService.java
```

변환 책임은 아래처럼 단일 경계로 고정한다.
- controller: API request/response DTO 소유
- service: 서비스 로직과 summary 모델 소유
- repository: service가 의존하는 단일 member 저장소 경계 소유
- repository 내부: JPA write/find-by-id와 QueryDSL summary query 구현 세부사항 소유
- enum 파싱: request DTO 바인딩 또는 enum factory 한 곳에서만 수행
- DB 문자열 <-> enum 변환: repository/entity 경계 한 곳에서만 수행

## Technical Approach

### Architecture
`member` 모듈은 현재도 controller -> service -> repository -> entity 흐름을 이미 사용한다. 이번 리팩터링은 동작 모델을 바꾸기보다 표현과 경계를 정렬하는 작업이다.

핵심 설계 선택:
- `Member` 도메인 레코드는 유지하되 `gender`, `memberStatus`를 enum으로 바꾼다.
- `MemberEntity`는 컬럼 타입을 문자열로 유지하고 persistence 경계에서만 enum과 문자열을 오간다.
- request DTO는 기존 문자열 필드를 유지하고, enum 파싱은 service에서 enum factory 한 곳으로 모은다.
- response DTO는 기존 JSON wire format을 유지한다. 즉 `gender`, `memberStatus`는 canonical uppercase 문자열(`FEMALE`, `ACTIVE`)로 직렬화한다.
- request/response DTO는 controller 밖으로 분리하되 PII 외부 노출 경계를 유지한다.
- service 내부 summary record는 별도 파일로 분리해 import 경계를 명확히 한다.
- service는 `MemberRepository` 하나만 의존하고, `MemberJpaRepository`와 `MemberQueryRepository`는 repository 내부 구현 세부사항으로 숨긴다.
- QueryDSL projection과 summary 계산 로직은 behavior 변경 없이 enum 매핑만 흡수한다.

추가 규칙:
- `phoneEncrypted`, `birthDateEncrypted`, `piiKeyVersion`는 repository/entity 내부에만 머무르고 response DTO에 노출하지 않는다.
- 상세 조회의 `auditLogService.recordPiiRead(...)` 호출은 refactor 후에도 유지한다.
- 저장소 통합 방식은 `MemberRepository` 클래스를 유지하고, 내부에서 `MemberJpaRepository + MemberQueryRepository`를 조합하는 방식을 채택한다.

### Implementation Phases

#### Phase 1: Package Skeleton and Naming Rules
목표: 새 구조의 뼈대를 만들고 이동 기준을 확정한다.

작업:
- [x] `member/controller`, `member/dto/request`, `member/dto/response`, `member/entity`, `member/enums`, `member/repository`, `member/service` 패키지 생성
- [x] 기존 `member` 모듈 파일을 계층별로 어디로 이동할지 inventory 작성
- [x] repository 3종(`MemberJpaRepository`, `MemberQueryRepository`, `MemberRepository`)의 최종 역할과 공개 경계를 확정
- [x] package declaration 변경 순서를 정리해 대규모 import 충돌을 줄임
- [x] 이름 충돌이 예상되는 내부 DTO/summary 타입의 새 이름 규칙 확정
- [x] 빠른 검증 단계와 느린 검증 단계를 분리해 phase별 checkpoint 정의

성공 기준:
- 최종 대상 파일 목록과 이동 경로가 명확하다.
- 후속 구현에서 임시 중복 타입을 최소화할 네이밍 기준이 정해진다.
- 각 phase가 끝날 때 실행할 compile/test checkpoint가 정의된다.
- service가 최종적으로 의존할 repository 진입점이 하나로 정해진다.

#### Phase 2: DTO Extraction and Package Relocation
목표: `MemberController`와 `MemberService` 내부 record를 파일로 분리하고 패키지 재배치한다.

작업:
- [x] [MemberController.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberController.java)의 `CreateMemberRequest`, `UpdateMemberRequest`, `MemberResponse`, `MemberSummaryResponse`를 `MemberCreateRequest`, `MemberUpdateRequest`, `MemberDetailResponse`, `MemberSummaryResponse`로 별도 DTO 파일 분리
- [x] [MemberService.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberService.java)의 내부 `MemberCreateRequest`, `MemberUpdateRequest`, `MemberSummary`를 외부 DTO 또는 summary 타입으로 분리
- [x] [Member.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/Member.java), [MemberEntity.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberEntity.java)를 `entity` 패키지로 이동
- [x] [MemberRepository.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberRepository.java), [MemberQueryRepository.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberQueryRepository.java), [MemberJpaRepository.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberJpaRepository.java)를 `repository` 패키지로 이동
- [x] [MemberController.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/controller/MemberController.java), [MemberService.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/service/MemberService.java)를 각각 `controller`, `service`로 이동
- [x] service가 직접 사용하는 저장소를 `MemberRepository` 하나로 고정하고, JPA/QueryDSL 구현 호출은 repository 내부로 감춘다
- [x] package move 후 즉시 `compileJava` 또는 동급 빠른 검증을 먼저 수행
- [x] package move가 끝난 시점에 QueryDSL generated source를 `clean` 후 재생성

성공 기준:
- `member` 루트 패키지에는 더 이상 계층 혼합 파일이 남지 않는다.
- controller/service 내부 중첩 record가 제거된다.
- 컴파일이 통과한다.
- DTO 추출 후에도 응답 DTO에 내부 PII 필드가 추가되지 않는다.
- service에서 `MemberJpaRepository` 또는 `MemberQueryRepository`를 직접 참조하지 않는다.

#### Phase 3: Repository Consolidation with Jpa + QueryDSL
목표: `MemberJpaRepository`, `MemberQueryRepository`, `MemberRepository`의 역할을 `Jpa + QueryDSL` 기반 단일 저장소 경계로 재정렬한다.

작업:
- [x] `MemberJpaRepository`는 Spring Data JPA 기반 기본 영속화/단건 조회 구현으로 제한
- [x] `MemberQueryRepository`는 QueryDSL 기반 복합 조회/summary query 구현으로 제한
- [x] `MemberRepository`는 service가 의존하는 최종 저장소 facade로 유지하거나, 필요 시 이름을 유지한 채 JPA/QueryDSL 조합 저장소로 재정의
- [x] create/update/findById/findAllSummaries/existsActiveTrainerScopedMembership의 공개 surface를 `MemberRepository` 한 곳으로 모은다
- [x] `MemberRepository` 밖에서 `MemberJpaRepository`, `MemberQueryRepository`를 주입받는 코드가 없는지 확인한다
- [x] 저장소 통합 후에도 기존 쿼리 의미와 refresh 흐름이 유지되는지 검증한다

성공 기준:
- service 계층은 `MemberRepository` 하나만 의존한다.
- JPA와 QueryDSL 구현 세부사항은 repository 패키지 내부로 숨겨진다.
- 저장소 경계만 봐도 write/read/query 역할이 구분된다.

#### Phase 4: Enum Typing Without DB Migration
목표: `gender`, `memberStatus`를 Java enum으로 바꾸되 DB 스키마는 유지한다.

작업:
- [x] `member/enums/Gender`, `member/enums/MemberStatus` 추가
- [x] 각 enum에 canonical value와 단일 parse factory를 둔다. 허용 입력은 `trim + uppercase` 기준으로 정규화된 기존 값만 받는다.
- [x] request DTO는 기존 문자열/검증 계약을 유지하고, service에서 enum factory를 통해 단일 parse path를 사용한다.
- [x] response DTO는 기존과 같은 uppercase 문자열 응답을 유지하도록 `@JsonValue` 또는 명시적 DTO mapping을 사용한다.
- [x] service validation 로직의 문자열 비교를 enum 기반으로 치환한다.
- [x] repository는 persistence string, service/domain은 enum을 사용하도록 경계를 고정한다.
- [x] repository, entity, service summary, QueryDSL 결과 매핑에 enum 반영
- [x] `MemberEntity`는 DB 문자열 저장을 유지하되 enum 변환 경계가 한 곳으로 모이게 정리한다.
- [x] legacy row 호환성 방침을 명시한다. `null`은 nullable field에서만 허용하고, 알 수 없는 문자열은 조회 시 명시적 예외 또는 안전한 실패로 처리한다.

성공 기준:
- 코드 내부에서는 `gender`, `memberStatus`를 문자열 상수로 직접 비교하지 않는다.
- API 요청에서 `active`, ` ACTIVE ` 같은 입력이 기존과 동일하게 허용되고, 잘못된 값은 일관된 validation error로 거부된다.
- DB 컬럼 타입 변경이나 신규 migration 없이 동작한다.
- enum 직렬화 결과가 기존 API 응답과 동일하다.

#### Phase 5: Regression Hardening and Test Realignment
목표: 구조 변경이 API 동작과 권한/조회 의미를 깨지 않았음을 검증한다.

작업:
- [x] 빠른 검증 단계: `compileJava`, member unit tests, enum parsing tests를 각 phase checkpoint마다 수행
- [x] 느린 검증 단계: package move와 QueryDSL regeneration이 안정화된 뒤 integration/performance tests 수행
- [x] [MemberServiceTest.java](/Users/abc/projects/GymCRM_V2/backend/src/test/java/com/gymcrm/member/MemberServiceTest.java)에서 enum 전환과 trim/normalize 규칙을 검증하도록 수정
- [x] [MemberSummaryApiIntegrationTest.java](/Users/abc/projects/GymCRM_V2/backend/src/test/java/com/gymcrm/member/MemberSummaryApiIntegrationTest.java)에서 create/list/detail/update API 계약이 유지되는지 확인
- [x] [MemberSummaryQueryPerformanceIntegrationTest.java](/Users/abc/projects/GymCRM_V2/backend/src/test/java/com/gymcrm/member/MemberSummaryQueryPerformanceIntegrationTest.java)와 [MemberPiiEncryptionIntegrationTest.java](/Users/abc/projects/GymCRM_V2/backend/src/test/java/com/gymcrm/member/MemberPiiEncryptionIntegrationTest.java) import/package 경로 정렬
- [x] invalid enum input이 일관된 400/validation error로 떨어지는지 검증
- [x] lowercase, trimmed 입력 경로와 legacy mixed-case 데이터 정책을 검증/명시한다
- [x] 상세 응답에 encrypted/PII internal field가 포함되지 않음을 검증하고, audit log read path가 유지되는지 확인
- [x] 저장소 통합 후에도 create/update/list/detail 경로가 기존처럼 동작하는지 검증
- [x] 수동 검증 기준을 [phase2-member-api-validation-log.md](/Users/abc/projects/GymCRM_V2/docs/notes/phase2-member-api-validation-log.md) 범위에 맞춰 재확인

성공 기준:
- member 관련 단위/통합 테스트가 통과한다.
- `POST /api/v1/members`, `GET /api/v1/members`, `GET /api/v1/members/{memberId}`, `PATCH /api/v1/members/{memberId}` 계약이 유지된다.
- 중복 연락처 `CONFLICT`와 trainer scoped access가 깨지지 않는다.
- QueryDSL generated source stale 문제 없이 clean build가 통과한다.

#### Phase 6: Reusable Pattern Documentation
목표: `trainer`, `reservation` 정렬에 재사용할 기준 문서를 남긴다.

작업:
- [x] 이번 리팩터링에서 확정한 패키지 규칙, enum 경계, DTO 분리 기준, 네이밍 원칙, 검증 포인트를 문서화
- [x] 이번 layered 구조가 `member` pilot convention인지, repo-wide backend standard로 승격할 조건이 무엇인지 기록
- [x] 문서는 `docs/notes/` 또는 `docs/plans/`가 아니라 재사용이 쉬운 위치에 남긴다. 예: `docs/notes/2026-03-23-member-module-package-patterns.md`
- [x] AGENTS.md와 충돌하지 않게 “현재 코드 규칙”과 “점진 목표 구조”를 구분해서 서술

성공 기준:
- 다음 모듈 작업 시 “이번에 어떻게 했는지”를 다시 해석할 필요가 없다.
- `trainer`, `reservation` 후속 계획에서 그대로 참조 가능한 문서가 생긴다.
- 이 구조가 현재 저장소의 예외적 파일 배치인지, 앞으로의 기준인지 판단 기준이 남는다.

## Alternative Approaches Considered

### 1. 문서만 현실 구조에 맞춰 수정
장점:
- 가장 싸고 빠르다.
- 런타임 리스크가 거의 없다.

단점:
- 실제 구조 문제와 타입 안전성 문제는 남는다.
- 후속 모듈 정렬 기준을 만들 수 없다.

배제 이유:
- 브레인스토밍에서 목표는 문서 보정이 아니라 실제 정렬로 합의했다 `(see brainstorm: docs/brainstorms/2026-03-23-member-package-realignment-brainstorm.md)`.

### 2. 패키지 이동만 하고 enum 전환은 미룸
장점:
- 구현 난이도가 낮다.
- 컴파일 회귀 리스크가 더 작다.

단점:
- 문자열 비교와 검증 중복이 그대로 남는다.
- 같은 모듈을 다시 건드려야 한다.

배제 이유:
- 첫 시범 모듈에서 구조와 타입 기준을 같이 정착시키는 것이 후속 작업 비용을 줄인다.

### 3. DB까지 enum으로 전환
장점:
- 모델 일관성이 가장 높다.

단점:
- migration, 롤백, 데이터 호환성까지 고려해야 한다.
- 이번 목표 대비 비용이 과하다.

배제 이유:
- 브레인스토밍에서 DB는 문자열 유지로 범위를 제한했다 `(see brainstorm: docs/brainstorms/2026-03-23-member-package-realignment-brainstorm.md)`.

### 4. Spring Data Custom Repository 조합으로 전면 전환
장점:
- 저장소 이름을 하나로 더 강하게 통일할 수 있다.
- Spring Data 관례에는 더 가깝다.

단점:
- 현재 facade 클래스 기반 구조를 인터페이스 + custom impl 구조로 함께 바꿔야 해서 변경 폭이 커진다.
- 이번 작업의 핵심인 패키지 정렬, DTO 분리, enum 전환과 동시에 진행하기에는 범위가 넓다.

배제 이유:
- 이번 단계는 `MemberRepository` 클래스를 유지한 채 `Jpa + QueryDSL` 역할을 내부 구현으로 정리하는 점진 접근을 채택한다.

## System-Wide Impact

### Interaction Graph
- `POST /api/v1/members` 요청
  -> controller request DTO validation/binding
  -> service 처리
  -> `MemberRepository` 호출
  -> 내부에서 JPA 또는 QueryDSL 구현 사용
  -> `MemberEntity` 저장
  -> refresh 후 domain `Member` 반환
  -> response DTO 변환
- `GET /api/v1/members`
  -> controller query param 수집
  -> service filter normalization 및 trainer scope 적용
  -> `MemberRepository.findAllSummaries(...)`
  -> 내부에서 `MemberQueryRepository` QueryDSL 조회 사용
  -> summary projection 계산 및 membershipOperationalStatus 도출
  -> response DTO 변환

### Error & Failure Propagation
- 잘못된 `memberStatus`, `gender` 입력은 validation error로 응답되어야 한다.
- DB unique constraint `uk_members_center_phone_active`는 계속 `CONFLICT`로 매핑되어야 한다.
- trainer scoped access 위반은 service에서 `ACCESS_DENIED`로 유지되어야 한다.
- enum 변환 시 `IllegalArgumentException`이 raw로 새어 나오지 않게 공통 예외로 매핑해야 한다.
- legacy DB row에 예상 밖 enum 문자열이 있으면 조용히 왜곡하지 말고 명시적으로 실패해야 한다.

### State Lifecycle Risks
- enum 변환 경계가 controller, service, repository에 중복되면 한쪽에서만 normalize되고 다른 쪽은 깨질 수 있다.
- `MemberEntity`와 domain `Member` 사이 타입 불일치가 생기면 QueryDSL projection 또는 response mapping에서 null/직렬화 문제가 날 수 있다.
- DTO 파일 분리 중 이름 충돌을 잘못 다루면 Spring MVC 바인딩 대상이 엉킬 수 있다.
- QueryDSL generated source가 stale 상태로 남으면 로컬/CI에서 진단하기 어려운 컴파일 오류가 날 수 있다.
- DTO 추출 중 응답 DTO에 내부 필드를 잘못 포함하면 PII surface가 넓어질 수 있다.
- 저장소 통합 중 facade와 구현 저장소의 역할이 다시 섞이면 오히려 경계가 더 모호해질 수 있다.

### API Surface Parity
- 대상 API:
  - `POST /api/v1/members`
  - `GET /api/v1/members`
  - `GET /api/v1/members/{memberId}`
  - `PATCH /api/v1/members/{memberId}`
- 같은 member summary를 소비하는 프론트 회원 관리 화면은 직접 수정 대상은 아니지만, 응답 shape가 바뀌면 즉시 영향받는다.
- auth/audit/security 계층은 직접 구조 변경 대상은 아니지만 controller/service import 경로가 바뀐다.

### Integration Test Scenarios
1. `POST /api/v1/members`에 소문자 `active`, `female` 입력 시 기존처럼 성공하고 응답은 canonical 값으로 반환된다.
2. `PATCH /api/v1/members/{memberId}`에서 `memberStatus=INACTIVE` 변경이 그대로 반영된다.
3. `GET /api/v1/members?memberStatus=ACTIVE`가 enum 전환 후에도 기존과 동일하게 필터링된다.
4. trainer role로 타인 회원 상세를 조회하면 기존처럼 `ACCESS_DENIED`가 난다.
5. 중복 연락처 등록은 계속 `409 CONFLICT`를 반환한다.
6. invalid enum 입력은 일관된 400/validation error를 반환한다.
7. legacy mixed-case/null DB row가 조회 경로에서 어떻게 처리되는지 테스트로 고정된다.
8. service가 `MemberRepository` 단일 경계만 사용해도 create/update/list/detail가 모두 유지된다.

## Acceptance Criteria

### Functional Requirements
- [x] `member` 모듈이 `controller/service/repository/model/entity/dto/enums` 구조로 재배치된다.
- [x] `MemberController` 내부 request/response record가 별도 DTO 파일로 분리된다.
- [x] `MemberService` 내부 create/update/summary record가 별도 타입으로 분리된다.
- [x] `memberStatus`, `gender`가 Java enum으로 전환된다.
- [x] DB 컬럼은 문자열 저장을 유지한다.
- [x] 기존 member API 응답 필드명과 의미가 유지된다.
- [x] `gender`, `memberStatus` wire format은 기존과 같은 uppercase 문자열을 유지한다.
- [x] `phoneEncrypted`, `birthDateEncrypted`, `piiKeyVersion`는 외부 응답으로 노출되지 않는다.

### Non-Functional Requirements
- [x] 구조 정리 중 동작 변경은 최소화한다.
- [x] enum 도입으로 문자열 상수 비교가 제거되거나 최소화된다.
- [x] 이후 `trainer`, `reservation` 정렬에 재사용 가능한 기준 문서가 남는다.

### Quality Gates
- [x] `backend` member 관련 테스트 통과
- [x] QueryDSL clean regeneration 후 빌드 통과
- [x] 최소 한 번의 member API 회귀 검증 수행
- [x] 문서화 산출물 작성
- [x] 저장소 공개 경계가 `MemberRepository` 하나로 정리된다.

## Success Metrics
- member 관련 파일을 열 때 패키지 위치만으로 계층 역할을 추론할 수 있다.
- 문자열 기반 상태/성별 검증 로직이 enum 기반으로 일관화된다.
- 기존 member API 회귀 없이 통과한다.
- 후속 모듈 계획 문서에서 이번 패턴 문서를 직접 참조할 수 있다.
- 빠른 검증과 느린 검증이 분리되어 refactor 반복 비용이 통제된다.

## Dependencies & Prerequisites
- QueryDSL generated Q classes가 새 package declaration과 맞게 재생성 가능해야 한다.
- 현재 member API 테스트가 로컬에서 재실행 가능해야 한다.
- auth/audit/common 패키지 import가 새 위치를 허용해야 한다.
- Jackson enum binding 또는 명시적 enum factory 전략을 현재 공통 예외 처리와 함께 사용할 수 있어야 한다.

## Risk Analysis & Mitigation
- **리스크: enum 직렬화/역직렬화 회귀**
  - 대응: request DTO 변환과 response serialization을 통합 테스트로 고정
- **리스크: package 이동 후 import 대량 깨짐**
  - 대응: Phase 1에서 naming/inventory를 먼저 고정하고, 계층별로 순차 이동
- **리스크: QueryDSL projection 깨짐**
  - 대응: projection 타입 전환은 behavior 변경 없이 mapping layer에서 먼저 흡수하고, package move 직후 `clean` + generated source 재생성을 강제
- **리스크: repository 통합 후 역할 중복 유지**
  - 대응: service가 의존하는 저장소를 `MemberRepository`로 고정하고, 다른 저장소는 구현 세부사항으로만 남긴다
- **리스크: DB string과 enum canonical value 불일치**
  - 대응: enum factory를 단일 지점에 두고 허용/거부 입력을 명시적 테스트로 고정
- **리스크: DTO 추출 중 PII 응답 surface 확대**
  - 대응: response DTO allowlist와 detail endpoint audit call 유지 여부를 테스트와 리뷰 체크리스트에 포함
- **리스크: 첫 모듈에서 과도한 규칙 설계**
  - 대응: `member`에 실제 필요한 규칙만 문서화하고, 나머지는 후속 모듈에서 검증 후 확장

## Documentation Plan
- 브레인스토밍 origin 유지: [2026-03-23-member-package-realignment-brainstorm.md](/Users/abc/projects/GymCRM_V2/docs/brainstorms/2026-03-23-member-package-realignment-brainstorm.md)
- 구현 후 재사용 규칙 문서 추가: 예시 `[docs/notes/2026-03-23-member-module-package-patterns.md](/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-23-member-module-package-patterns.md)`
- 필요 시 [AGENTS.md](/Users/abc/projects/GymCRM_V2/AGENTS.md)에 “점진 정렬 중인 백엔드 패키지 규칙” 짧은 문장 추가

## Sources & References

### Origin
- Brainstorm document: [docs/brainstorms/2026-03-23-member-package-realignment-brainstorm.md](/Users/abc/projects/GymCRM_V2/docs/brainstorms/2026-03-23-member-package-realignment-brainstorm.md)
  - carried-forward decisions: `member` 선행 정렬, 엄격 구조 재배치, DTO 분리, Java enum 전환, DB 문자열 유지, 후속 모듈용 문서화

### Internal References
- Current controller surface: [backend/src/main/java/com/gymcrm/member/MemberController.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberController.java)
- Current service logic: [backend/src/main/java/com/gymcrm/member/MemberService.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberService.java)
- Current repository boundary: [backend/src/main/java/com/gymcrm/member/MemberRepository.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberRepository.java)
- Current summary query logic: [backend/src/main/java/com/gymcrm/member/MemberQueryRepository.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberQueryRepository.java)
- Current entity string storage: [backend/src/main/java/com/gymcrm/member/MemberEntity.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberEntity.java)
- Current domain record: [backend/src/main/java/com/gymcrm/member/Member.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/Member.java)
- Existing API regression log: [docs/notes/phase2-member-api-validation-log.md](/Users/abc/projects/GymCRM_V2/docs/notes/phase2-member-api-validation-log.md)
- Related member filter work: [docs/plans/2026-03-11-feat-member-management-membership-status-filter-plan.md](/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-11-feat-member-management-membership-status-filter-plan.md)
- Related learning: [docs/solutions/integration-issues/member-status-filter-not-affecting-results-gymcrm-20260320.md](/Users/abc/projects/GymCRM_V2/docs/solutions/integration-issues/member-status-filter-not-affecting-results-gymcrm-20260320.md)
- Related deployment/process learning: [docs/solutions/database-issues/member-summary-index-deployment-lock-mitigation-gymcrm-20260305.md](/Users/abc/projects/GymCRM_V2/docs/solutions/database-issues/member-summary-index-deployment-lock-mitigation-gymcrm-20260305.md)

### Framework References
- Spring Boot JSON customization and Jackson integration: Context7 `/spring-projects/spring-boot/v3.5.3`
- Hibernate enum/string mapping examples with `@Enumerated(EnumType.STRING)` and `AttributeConverter`: Context7 `/hibernate/hibernate-orm`

### Related Tests
- [backend/src/test/java/com/gymcrm/member/MemberServiceTest.java](/Users/abc/projects/GymCRM_V2/backend/src/test/java/com/gymcrm/member/MemberServiceTest.java)
- [backend/src/test/java/com/gymcrm/member/MemberSummaryApiIntegrationTest.java](/Users/abc/projects/GymCRM_V2/backend/src/test/java/com/gymcrm/member/MemberSummaryApiIntegrationTest.java)
- [backend/src/test/java/com/gymcrm/member/MemberSummaryQueryPerformanceIntegrationTest.java](/Users/abc/projects/GymCRM_V2/backend/src/test/java/com/gymcrm/member/MemberSummaryQueryPerformanceIntegrationTest.java)
- [backend/src/test/java/com/gymcrm/member/MemberPiiEncryptionIntegrationTest.java](/Users/abc/projects/GymCRM_V2/backend/src/test/java/com/gymcrm/member/MemberPiiEncryptionIntegrationTest.java)
