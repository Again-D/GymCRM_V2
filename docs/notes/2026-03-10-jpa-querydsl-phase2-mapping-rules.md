# JPA QueryDSL Phase 2 Mapping Rules

Date: 2026-03-10

## Goal

This document fixes the baseline rules for the Phase 2 migration from `JdbcClient` repositories to `JPA + QueryDSL`. The purpose is to keep repository structure, transaction boundaries, and response contracts stable before domain-by-domain conversion starts.

## Entity Rules

- Use `@Entity` and `@Table(name = "...")` with the existing physical table names.
- Use `@Id` and `@GeneratedValue(strategy = GenerationType.IDENTITY)` for `BIGSERIAL` primary keys.
- Keep `center_id` as an explicit field on every center-scoped entity. Repository methods must always receive `centerId` for scoped lookups.
- Keep soft delete columns (`is_deleted`, `deleted_at`, `deleted_by`) as explicit fields. Do not introduce Hibernate-wide soft delete features in this phase.
- Map timestamps as `OffsetDateTime` in UTC for `TIMESTAMPTZ` columns.
- Map constrained string columns to enums with `@Enumerated(EnumType.STRING)` only when the enum values exactly match the current database values.
- Keep encrypted PII columns as explicit entity fields. Encryption and fallback logic remain in the service layer.

## Repository Split

- `JpaRepository` is used for create, update, delete, and simple `findById` style lookups.
- Query-heavy reads move to a separate `{Domain}QueryRepository` using QueryDSL.
- Native SQL remains allowed only for heavy reporting or database-specific query plans that are not a good fit for QueryDSL.

Example target pattern:

```text
com.gymcrm.member
|- MemberEntity.java
|- MemberJpaRepository.java
|- MemberQueryRepository.java
|- MemberService.java
```

## Transaction Rules

- Service methods own `@Transactional` boundaries.
- Write flows use one service-level transaction unless there is a documented reason to split them.
- Read flows use `@Transactional(readOnly = true)` at service level.
- Repository interfaces should stay free of transaction annotations by default.

## Anti-Corruption Rules

- Controllers continue to exchange request/response DTOs, not entities.
- Services may map between entity and DTO, but controllers must not depend on JPA entity shape.
- Query repositories should return either DTO projections or service-local projection records that preserve current API contracts.
- Existing service-level validation, normalization, and PII handling stay in the service layer during the migration.

## JdbcClient to JPA QueryDSL Example

Current pattern:

- One `MemberRepository` owns raw SQL inserts, updates, detail lookup, and list/search queries.

Target pattern:

- `MemberJpaRepository` owns insert/update/delete and simple ID lookups.
- `MemberQueryRepository` owns member list, summary search, expiry-near queries, and dynamic filters.
- `MemberService` keeps status normalization, phone validation, PII encryption, and DTO mapping.

## Deferred Decisions

- `@Version` is opt-in per entity. Do not add optimistic locking everywhere by default.
- Heavy reporting domains may stay on native SQL if the reason is documented in the query repository.
- Soft delete filtering stays explicit in repository predicates until the team has validated a safer shared rule.
