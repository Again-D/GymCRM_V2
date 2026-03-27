# Backend Structure Rules

This document expands the backend structure defaults summarized in [AGENTS.md](/Users/abc/projects/GymCRM_V2/AGENTS.md).
If this file conflicts with [AGENTS.md](/Users/abc/projects/GymCRM_V2/AGENTS.md), follow [AGENTS.md](/Users/abc/projects/GymCRM_V2/AGENTS.md).

## Rule Intent
- The repo is in a mixed current state.
- These rules define the preferred default for new or edited backend modules.
- These rules do not claim that every existing package already matches the target structure.

## Current Enforced Backend Conventions
- Controllers stay thin and focus on request/response mapping plus authorization.
- Business logic lives in services.
- Repositories split JPA persistence responsibilities and QueryDSL custom query responsibilities.
- Use `ApiResponse<T>` for successful and error responses.
- Use Java `record` for backend request/response DTOs.
- Use `@PreAuthorize(AccessPolicies.XXX)` where the module already follows that pattern.
- Use `ApiException` and `ErrorCode` for business/application errors.
- Use `CurrentUserProvider` for current center/user context where applicable.
- Keep API routes under `/api/v1/`.
- Keep tenant naming on backend APIs and services as `center`.
- Use `Long` for backend identifiers unless surrounding code clearly requires another type.

## Preferred Default For New Or Edited Feature Packages
- `controller`
- `dto/request`
- `dto/response`
- `service`
- `repository`
- `entity`
- `enums`
- optional feature-local `config` only when the module genuinely needs it

## Repository Pattern
- Default repository pattern is `XxxRepository` + `XxxQueryRepository`.
- `XxxRepository` is the feature-facing repository that owns standard persistence entry points.
- `XxxQueryRepository` owns QueryDSL-based custom reads, searches, aggregations, and list queries.
- If Spring Data JPA is used directly, keep the interface as `XxxJpaRepository` and let `XxxRepository` wrap it.
- Example: member module uses `MemberRepository`, `MemberJpaRepository`, and `MemberQueryRepository`.

## Legacy Reality
- More aligned layered feature packages: `member`, `membership`, `product`, `reservation`, `settlement`
- More legacy or flatter modules still present: `trainer`, `access`, `locker`, `crm`, `audit`, `integration`

When editing a legacy package:
- preserve the surrounding pattern unless the task explicitly includes package realignment
- do not opportunistically rewrite a full module just to match the preferred layout

## Common Boundary
`common` is the primary home for shared platform capabilities, cross-cutting infrastructure, framework integration, security, error handling, API wrappers, and stable utilities.

## Dependency Rules
- `common` may contain shared infrastructure, platform wiring, security, error handling, API wrappers, and stable utilities.
- `common` must not depend on feature packages.
- Feature packages may depend on `common`.
- Cross-feature reuse does not automatically justify promotion into `common`.
- Only stable multi-feature utilities or infrastructure should move into `common`.

## Known Exceptions
- `common.auth` is a hybrid package and already behaves like a shared platform feature with its own `controller/entity/repository/service` shape.
- `audit` is top-level and reused across features. Do not assume every cross-cutting concern must live under `common`.

## Common Module Example
Illustration based on the architecture document and current conventions.
This is reference material, not proof that every subtree already exists exactly as shown.

```text
backend/src/main/java/com/gymcrm/common/
├── config/
│   ├── SecurityConfig.java
│   ├── JpaConfig.java
│   ├── RedisConfig.java
│   ├── SqsConfig.java
│   ├── WebConfig.java
│   ├── SwaggerConfig.java
│   └── AsyncConfig.java
├── security/
│   ├── jwt/
│   │   ├── JwtTokenProvider.java
│   │   ├── JwtAuthenticationFilter.java
│   │   └── JwtProperties.java
│   ├── CustomUserDetailsService.java
│   ├── CustomUserDetails.java
│   └── SecurityUtils.java
├── auth/
│   ├── controller/
│   │   └── AuthController.java
│   ├── dto/
│   │   ├── LoginRequest.java
│   │   ├── TokenResponse.java
│   │   └── RefreshTokenRequest.java
│   ├── service/
│   │   └── AuthService.java
│   ├── entity/
│   │   ├── User.java
│   │   └── RefreshToken.java
│   └── repository/
│       ├── UserRepository.java
│       └── RefreshTokenRepository.java
├── exception/
├── response/
├── entity/
├── util/
├── annotation/
├── event/
└── external/
    ├── kakao/
    ├── pg/
    └── sms/
```

## Feature Module Template
Illustration for new or realigned feature packages.
This is a preferred template, not a statement of universal current layout.

```text
backend/src/main/java/com/gymcrm/member/
├── controller/
│   └── MemberController.java
├── dto/
│   ├── request/
│   └── response/
├── entity/
│   └── MemberEntity.java
├── enums/
├── repository/
│   ├── MemberRepository.java
│   ├── MemberJpaRepository.java
│   └── MemberQueryRepository.java
└── service/
    └── MemberService.java
```

## Template Notes
- `dto/request` and `dto/response` are preferred for aligned modules, but some legacy modules still keep request/response records closer to controllers.
- `Entity` suffix is preferred only where the module already uses it. The repo still contains mixed naming patterns.
- Repository naming should keep JPA and QueryDSL roles explicit rather than mixing all queries into a single class.
- Match the module you are editing before applying a new structure.

## References
- [AGENTS.md](/Users/abc/projects/GymCRM_V2/AGENTS.md)
- [02_시스템_아키텍처_설계서.md](/Users/abc/projects/GymCRM_V2/docs/02_%EC%8B%9C%EC%8A%A4%ED%85%9C_%EC%95%84%ED%82%A4%ED%85%8D%EC%B2%98_%EC%84%A4%EA%B3%84%EC%84%9C.md)
- [2026-03-23-member-module-package-patterns.md](/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-23-member-module-package-patterns.md)
