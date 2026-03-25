# Membership Module Package Patterns

Date: 2026-03-25
Scope: `membership` 모듈 구조 정렬 재사용 규칙

## Package Shape

`membership` 모듈은 아래 구조를 기준으로 유지한다.

```text
com.gymcrm.membership
├── controller
├── dto
│   ├── request
│   └── response
├── entity
├── enums
├── repository
└── service
```

## Boundary Rules

- `controller`는 HTTP path guard, request validation, response mapping만 담당한다.
- `dto/request`는 wire input만 표현한다.
- `dto/response`는 API response contract만 표현한다.
- `service`는 구매/홀드/환불/상태 전이 정책을 담당한다.
- `repository`는 JDBC/JPA/QueryDSL 경계를 감싼다.
- `entity`는 DB row와 가까운 membership 도메인 모델을 둔다.

## Enum Rules

- DB 컬럼은 문자열 유지
- Java 내부 타입은 enum 사용
- 현재 enum 적용 대상:
  - `MembershipStatus`
  - `HoldStatus`
  - `RefundStatus`
- 문자열 -> enum 변환 책임은 repository가 가진다.
- response는 기존 API 계약을 위해 uppercase 문자열을 그대로 반환한다.

## Integrity Rules

- 활성 홀딩은 회원권당 1건만 허용한다.
- `HOLDING` 상태 회원권은 환불할 수 없다.
- 상태 전이는 `MembershipStatusTransitionService`를 단일 진입점으로 사용한다.
- 홀드/환불 controller는 `memberId` ownership guard를 유지한다.

## DTO Naming Rules

- request/response는 `Membership*Request`, `Membership*Response` 형식을 사용한다.
- 동사-앞 형식(`CreateMembershipRequest`)은 사용하지 않는다.
- 공통 membership 조회 응답은 `MembershipSummaryResponse`를 기준 타입으로 둔다.

## Test Rules

- `compileJava`, `compileTestJava` 기준으로 package move 후 import 정합성을 먼저 확인한다.
- package-private helper를 검증하는 단위 테스트는 대상 service와 같은 package에 둔다.
- 통합 테스트는 API/DB/transaction 경계를 유지한 채 기존 흐름을 검증한다.

## Out of Scope

- `Payment`, `PaymentEntity`, `PaymentRepository`, `PaymentJpaRepository`는 현재 `membership` 루트에 남긴다.
- `Payment -> settlement` 이동은 별도 작업으로 다룬다.

## Pilot Decision

- 이 구조는 현재 `member`, `membership`에 적용된 pilot convention이다.
- 이후 `trainer`, `reservation` 정렬 시 같은 shape를 우선 적용하되, 모듈 특성 때문에 예외가 필요하면 문서로 남긴다.
