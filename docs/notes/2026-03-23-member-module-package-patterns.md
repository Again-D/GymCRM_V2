# Member Module Package Patterns

## Purpose
- `member` 모듈 리팩터링에서 확정한 패키지 구조와 경계 규칙을 `trainer`, `reservation` 후속 정렬에 재사용하기 위한 기준 문서다.
- 이 문서는 현재 저장소 전체 표준이 아니라 `pilot convention`이다.

## Target Package Layout
```text
backend/src/main/java/com/gymcrm/member/
├── controller/
├── dto/
│   ├── request/
│   └── response/
├── entity/
├── enums/
├── repository/
└── service/
```

## Ownership Rules
- `controller`: HTTP 요청/응답 경계와 validation annotation을 소유한다.
- `dto/request`: API wire contract를 표현한다. 이름은 `Member*Request` 형식을 사용한다.
- `dto/response`: API 응답 전용 타입을 둔다. 내부 필드는 노출하지 않는다.
- `service`: 비즈니스 흐름, 권한 검사, PII 복호 fallback, enum parse 진입점을 소유한다.
- `entity`: 도메인 record와 JPA entity를 둔다.
- `enums`: Java 타입 안정성이 필요한 상태값을 둔다.
- `repository`: service가 의존하는 facade repository와 내부 JPA/QueryDSL 구현을 둔다.

## Naming Rules
- request DTO: `MemberCreateRequest`, `MemberUpdateRequest`
- response DTO: `MemberDetailResponse`, `MemberSummaryResponse`
- summary/service model: `MemberSummary`
- enum: `MemberStatus`, `Gender`
- facade repository: `MemberRepository`
- internal repositories: `MemberJpaRepository`, `MemberQueryRepository`

## Enum Boundary Rules
- DB 컬럼은 계속 문자열을 유지한다.
- service/domain/repository command는 enum을 사용한다.
- DB 문자열 <-> enum 변환은 `MemberRepository`와 `MemberQueryRepository` 경계로 모은다.
- response는 기존 계약을 유지하기 위해 uppercase 문자열로 직렬화한다.
- request DTO는 기존 문자열 필드를 유지하고, service에서 enum factory를 통해 단일 parse path를 사용한다.

## Validation Rules
- API validation 메시지는 기존 메시지를 유지한다.
- 소문자 입력은 허용한다.
- 앞뒤 공백이 있는 enum 입력도 허용하고 service에서 trim 후 enum으로 변환한다.
- 잘못된 enum 값은 `VALIDATION_ERROR`로 일관되게 거부한다.

## PII Rules
- `phoneEncrypted`, `birthDateEncrypted`, `piiKeyVersion`는 response DTO에 노출하지 않는다.
- 상세 조회의 `recordPiiRead(...)` 호출은 유지한다.
- plaintext가 비어 있고 encrypted 값이 있으면 service에서 복호 fallback을 수행한다.

## Repository Rules
- service는 `MemberRepository` 하나만 주입받는다.
- `MemberJpaRepository`는 저장/단건 조회에 집중한다.
- `MemberQueryRepository`는 QueryDSL 조회와 summary projection에 집중한다.
- QueryDSL projection에서 enum이 필요한 경우 row projection을 먼저 받고 이후 Java에서 enum으로 변환한다.

## Legacy Data Policy
- 현재 `members.gender`, `members.member_status`는 DB CHECK 제약으로 canonical uppercase 값만 저장된다.
- 따라서 현행 스키마에서는 mixed-case legacy row가 새로 저장되지는 않는다.
- 그래도 Java enum factory는 `trim + uppercase`를 적용해, 과거 데이터 백필이나 외부 주입 데이터가 들어올 경우를 대비한다.
- 알 수 없는 문자열은 조용히 보정하지 않고 명시적으로 실패시킨다.

## Validation Checklist For Next Modules
- 패키지 이동 후 `./gradlew clean compileJava`
- 서비스 단위 테스트
- API 통합 테스트
- QueryDSL/성능 테스트
- 응답 DTO에 내부 필드 노출이 없는지 확인
- 권한 경로와 감사 로그 경로가 유지되는지 확인

## Promotion Criteria
- `trainer`, `reservation`에도 같은 구조를 1회 이상 적용해 중복 패턴이 확인될 것
- facade repository + internal JPA/QueryDSL 구조가 실제로 유지 가능할 것
- DTO naming과 enum boundary 규칙이 다른 모듈에서도 과하지 않다고 확인될 것
- 위 조건을 만족하면 pilot convention에서 repo-wide backend standard로 승격할 수 있다

## Relation To AGENTS
- `AGENTS.md`는 현재 저장소의 작업 규칙과 협업 규칙을 정의한다.
- 이 문서는 `member` 리팩터링으로 검증된 점진 목표 구조를 설명한다.
- 즉 `AGENTS.md`와 충돌하지 않고, 후속 구조 정렬 작업에서 참조하는 구현 가이드로 사용한다.
