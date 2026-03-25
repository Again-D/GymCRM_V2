# GymCRM_V2 Agent Rules

This file is the agent-operational source of truth for this repository. Follow this document first when deciding how to branch, where to place code, and what validation is required.

## Purpose
- This is an execution rules document for agents, not a general project overview.
- If you only read the first screen, you must still be able to answer:
  - what this document is
  - which rules are mandatory
  - which branch and package conventions to follow

## Rule Hierarchy

### Non-Negotiable Rules
Current enforced rules. Agents must follow these unless the user explicitly overrides them.

### Defaults
Preferred current patterns for new or edited code. Use these unless the surrounding code clearly follows a legacy pattern that should be preserved.

### Reference
Explanatory material and example trees. Use them to understand intent, not as proof that every package already matches the example exactly.

### Future Direction
Only applies if explicitly labeled. Future direction is not binding current policy.

## Non-Negotiable Rules
- Start from the current user request. Ignore older unfinished tasks unless the user revives them.
- Make minimal diffs. Do not refactor broadly unless the user asked for it or the change cannot be completed safely otherwise.
- Do not invent files, modules, or package layouts that do not exist in the repo context.
- Use `main / develop / feature/*` as the working branch strategy for agent work.
- Do not work directly on `main` or `develop` unless the user explicitly asks for it.
- Keep backend and frontend changes separate unless the task truly requires both.
- Wrap backend API responses in `com.gymcrm.common.api.ApiResponse`.
- Use Java `record` for backend request/response DTOs.
- Run relevant validation before concluding work.
- When scope is complete, update related documentation state, checklists, and evidence in the same delivery unit.

## Git Branch Strategy
- `main`
  - Production deployment branch.
- `develop`
  - Integration branch for upcoming releases.
- `feature/*`
  - Default working branch for features, fixes, and scoped refactors.

### Agent Working Rules
- Start new implementation work from `develop`.
- Create a dedicated `feature/*` branch for each user-requested change.
- Merge `feature/*` into `develop` after review and verification.
- Merge `develop` into `main` when preparing a production release.
- Keep environment differences in configuration and deployment settings, not in long-lived environment branches.

### Release Note
- Some architecture documentation still references `release` flow for deployment control.
- For agents, `release` is a deploy/release concern, not a standard working branch.
- If a user explicitly asks for release-branch work, follow the request. Otherwise default to `develop -> feature/*`.

## Backend Dependency Rules

### Current Enforced Backend Conventions
- Controllers should stay thin and focus on request/response mapping plus authorization.
- Use `@PreAuthorize(AccessPolicies.XXX)` for protected endpoints where the module already follows that pattern.
- Put business logic in services.
- Use `ApiException` and `ErrorCode` for business/application errors.
- Use `CurrentUserProvider` for current center/user context where applicable.
- Keep API routes under `/api/v1/`.

### Preferred Default for New or Edited Feature Packages
For new work and for modules already moving in this direction, prefer feature-first layered packages:
- `controller`
- `dto/request`
- `dto/response`
- `service`
- `repository`
- `entity`
- `enums`
- optional feature-local `config` when the module genuinely needs it

This is a preferred default for new or edited feature packages. It is not a claim that every existing package in the repo already follows this layout.

### Mixed Current State
The repo is currently mixed:
- More aligned layered feature packages: `member`, `membership`, `product`, `reservation`, `settlement`
- More legacy/flat packages still present: `trainer`, `access`, `locker`, `crm`, `audit`, `integration`

When editing a legacy package:
- preserve the surrounding pattern unless the user explicitly asks for package realignment
- do not opportunistically rewrite an entire module just to match the preferred layout

## Common Boundary And Exceptions

### Primary Rule
`common` is the primary home for shared platform capabilities, cross-cutting infrastructure, and framework integration.

### Dependency Rule
- `common` may contain shared infrastructure, platform wiring, security, error handling, API wrappers, and stable utilities.
- `common` must not depend on feature packages.
- Feature packages may depend on `common`.
- Cross-feature reuse does not automatically justify promotion into `common`.
- Only stable, multi-feature utilities or infrastructure should move into `common`.

### Known Exceptions
- `common.auth` is a hybrid package. It behaves like a shared platform feature and already contains its own `controller/entity/repository/service` shape.
- `audit` is top-level and reused across features. Do not assume every cross-cutting concern must live under `common`.

### Current `common` Shape
Current repo evidence shows packages such as:
- `common/api`
- `common/auth`
- `common/config`
- `common/error`
- `common/logging`
- `common/security`

## Reference: Common Module Example
Illustration based on the architecture document and current conventions. This is reference material, not a claim that every subtree already exists exactly as shown.

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
│   ├── CustomUserDetailsService.java
│   ├── CustomUserDetails.java
│   └── SecurityUtils.java
├── auth/                           # hybrid shared platform feature
│   ├── controller/
│   ├── dto/
│   ├── service/
│   ├── entity/
│   └── repository/
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

## Reference: Feature Module Template
Illustration for new or realigned feature packages. This is a preferred template, not a statement of universal current layout.

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

### Template Notes
- `dto/request` and `dto/response` are preferred for aligned modules, but some legacy modules still keep request/response records inside controllers.
- `Entity` suffix is preferred where the module already uses it, but the repo still contains mixed naming patterns. Do not force a naming cleanup unless requested.
- Match the module you are editing before applying a new structure.

## Backend API Contract Defaults
- Use `ApiResponse<T>` for successful and error responses.
- Keep DTO shapes aligned with actual backend contracts.
- Use Jakarta Validation annotations on request DTOs or controller-bound request models.
- Follow the module's existing controller/service/repository naming pattern unless the task is a planned structure realignment.
- Do not change schema directly. Use Flyway migrations in `backend/src/main/resources/db/migration/`.
- Keep tenant naming on backend APIs and services as `center`.
- Use `Long` for backend identifiers unless the surrounding code clearly requires another type.

## Frontend Defaults
- Use React + TypeScript.
- Use CSS Modules (`.module.css`) unless the existing area already follows another local pattern.
- Use existing API utilities from `frontend/src/api/client.ts`, especially `apiGet`, `apiPost`, and `apiPatch`.
- Keep frontend API types aligned with backend DTOs and envelopes.
- Preserve current UI structure and avoid broad component rewrites unless requested.
- Run relevant frontend build/test checks after frontend edits.

## Build, Lint, And Test Commands

### Backend
- Base directory: `backend/`
- Build: `./gradlew build`
- Compile only: `./gradlew compileJava`
- Run dev: `SPRING_PROFILES_ACTIVE=dev ./gradlew bootRun`
- Test all: `./gradlew test`
- Test single class: `./gradlew test --tests "com.gymcrm.member.MemberControllerTest"`
- Test single method: `./gradlew test --tests "com.gymcrm.member.MemberControllerTest.createMemberSuccess"`
- Clean: `./gradlew clean`

### Frontend
- Base directory: `frontend/`
- Install: `npm install`
- Build: `npm run build`
- Run dev: `npm run dev`
- Test all: `npm run test`
- Test single file: `npx vitest run src/pages/Login.test.tsx`
- Lint/check: `npx @biomejs/biome check .`
- Lint fix: `npx @biomejs/biome check --write .`

## Documentation Sync Rules
- If implementation or document rewrite scope is complete, update related `status`, phase checklists, acceptance criteria, and validation checkboxes in the same delivery unit.
- Do not leave plan files or execution checklists partially unchecked when the work is already done.
- If a documentation gap is found while the scoped work is otherwise complete, close it in the same PR or turn instead of deferring it to later cleanup.
- When validation is performed, note where proof lives:
  - PR description
  - `docs/notes/`
  - plan appendix or linked validation log

## Operational Checklist
- Prefer minimal diffs.
- Follow existing patterns before introducing new structure.
- Read referenced plans/docs before editing a risky area.
- Run relevant validation before concluding work.
- Keep branch strategy, package guidance, and validation expectations unambiguous.
- If a rule conflicts with current repo reality, call it out explicitly instead of silently applying a broad cleanup.

## Reference Documents
- [docs/02_시스템_아키텍처_설계서.md](docs/02_%EC%8B%9C%EC%8A%A4%ED%85%9C_%EC%95%84%ED%82%A4%ED%85%8D%EC%B2%98_%EC%84%A4%EA%B3%84%EC%84%9C.md)
- [docs/AGENTS.md](docs/AGENTS.md)

Use these as explanatory references. If they disagree with this file about agent working rules, follow this file.
