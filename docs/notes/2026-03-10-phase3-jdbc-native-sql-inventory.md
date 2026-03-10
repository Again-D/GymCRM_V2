# Phase 3 JDBC and Native SQL Inventory

Date: 2026-03-10
Plan: `docs/plans/2026-03-09-refactor-backend-jpa-querydsl-openapi-alignment-plan.md`

## Purpose

Phase 3 completed the low-risk domain migration for `member`, `product`, and `locker`.
This note records:

- which JDBC repositories still remain in the backend,
- which items are the next migration targets,
- which queries are intentional exceptions that should remain JDBC/native SQL for now.

## Already migrated in Phase 3

- `member`
  - JPA: `MemberEntity`, `MemberJpaRepository`
  - Query layer: `MemberQueryRepository`
  - Intentional exception: member summary native SQL inside `MemberQueryRepository`
- `product`
  - JPA: `ProductEntity`, `ProductJpaRepository`
  - Query layer: `ProductQueryRepository`
- `locker`
  - JPA: `LockerSlotEntity`, `LockerAssignmentEntity`
  - Query layer: `LockerSlotQueryRepository`, `LockerAssignmentQueryRepository`

## Remaining JdbcClient inventory

### Phase 4 candidates: stateful domain migration

- `membership/MemberMembershipRepository.java`
- `membership/MembershipHoldRepository.java`
- `membership/MembershipRefundRepository.java`
- `membership/MembershipUsageEventRepository.java`
- `membership/PaymentRepository.java`
- `reservation/ReservationRepository.java`
- `reservation/TrainerScheduleRepository.java`
- `access/AccessEventRepository.java`
- `access/MemberAccessSessionRepository.java`

Reason:

- These repositories own state transitions, active/inactive conditions, or concurrency-sensitive writes.
- They match the next planned phase (`membership`, `reservation`, `access`).

### Later migration candidates: auth/integration/audit/CRM

- `auth/AuthUserRepository.java`
- `auth/AuthRefreshTokenRepository.java`
- `integration/ExternalIntegrationActivationPolicyRepository.java`
- `audit/AuditLogRepository.java`
- `audit/AuditRetentionJobRunRepository.java`
- `crm/CrmTargetRepository.java`
- `crm/CrmMessageEventRepository.java`
- `crm/CrmMessageTemplateRepository.java`

Reason:

- These are not blocked by Phase 3, but they are not the highest-value next slice.
- `AuthRefreshTokenRepository` is especially sensitive because PostgreSQL remains the canonical source by plan.

### Intentional JDBC-heavy query exceptions

- `access/AccessEligibilityService.java`
  - Membership eligibility resolution across status/date/count rules
  - Read-only policy query with low benefit from early ORM conversion
- `settlement/SalesDashboardRepository.java`
- `settlement/TrainerPayrollSettlementRepository.java`
- `settlement/SalesSettlementReportRepository.java`
  - Aggregate/reporting queries remain better expressed as SQL for now

Reason:

- These are query-heavy reporting/policy paths.
- The current plan allows native SQL exceptions where QueryDSL/JPA would reduce clarity or regress performance.

### Bootstrap/runtime support code

- `auth/bootstrap/DevAdminUserSeeder.java`

Reason:

- This is startup/bootstrap code, not a normal domain repository.
- It should not drive migration priority unless auth domain conversion starts.

## Native SQL exceptions currently in migrated domains

- `member/MemberQueryRepository.java`
  - Uses `EntityManager.createNativeQuery(...)` for membership summary projection
  - Keep as an explicit exception until there is a clear QueryDSL rewrite with parity and explain-plan validation

## Removal candidates after future phases

- After Phase 4:
  - `MemberMembershipRepository`
  - `MembershipHoldRepository`
  - `MembershipRefundRepository`
  - `MembershipUsageEventRepository`
  - `PaymentRepository`
  - `ReservationRepository`
  - `TrainerScheduleRepository`
  - `AccessEventRepository`
  - `MemberAccessSessionRepository`
- After auth-focused migration:
  - `AuthUserRepository`
  - `AuthRefreshTokenRepository`
- Keep as intentional exceptions unless policy changes:
  - `AccessEligibilityService`
  - settlement repositories
  - member summary native SQL

## Recommended next slice

1. Convert `membership` repositories first.
2. Convert `reservation` repositories next.
3. Convert `access` repositories after reservation semantics are stable.
4. Keep settlement/reporting and policy-heavy queries as documented SQL exceptions unless there is a measured reason to rewrite.
