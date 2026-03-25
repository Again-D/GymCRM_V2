# GymCRM_V2 Agent Rules

This file is the agent-operational source of truth for this repository.
Read this first when deciding branch strategy, file placement, validation, and document sync.

## Purpose
- This is an execution rules document, not a project overview.
- Keep this file short enough to scan before starting work.
- If supporting docs disagree with this file, follow this file.

## Non-Negotiable Rules
- Start from the current user request only.
- Ignore older unfinished tasks unless the user explicitly revives them.
- Make minimal diffs. Do not broad-refactor unless requested or required for safety.
- Do not invent files, modules, or package layouts that are not grounded in repo context.
- Do not work directly on `main` or `develop` unless the user explicitly asks for it.
- Use `main / develop / feature/*` as the default branch strategy.
- Keep backend and frontend changes separate unless the task truly requires both.
- Run relevant validation before concluding work.
- When scoped work is complete, update related plan/checklist/document status in the same delivery unit.

## Branch Strategy
- `main`: production deployment branch
- `develop`: integration branch for upcoming releases
- `feature/*`: default branch for user-requested features, fixes, and scoped refactors

## Working Defaults
- Start implementation from `develop` and create a dedicated `feature/*` branch.
- Merge `feature/*` into `develop` after review and verification.
- Treat any `release` flow as deployment/release concern, not the default agent working branch.
- Keep environment differences in config and deployment settings, not long-lived env branches.

## Backend Defaults
- Keep controllers thin. Put business logic in services.
- Use `com.gymcrm.common.api.ApiResponse` for backend API responses.
- Use Java `record` for backend request/response DTOs.
- Keep API routes under `/api/v1/`.
- Use `@PreAuthorize(AccessPolicies.XXX)` where the module already follows that pattern.
- Use `ApiException` and `ErrorCode` for business/application errors.
- Use `CurrentUserProvider` for current center/user context where applicable.
- Do not change schema directly. Use Flyway migrations in `backend/src/main/resources/db/migration/`.
- Keep backend tenant naming as `center`.
- Use `Long` for backend identifiers unless surrounding code clearly requires another type.

## Backend Structure Defaults
- Prefer feature-first packages for new or edited backend modules.
- Default feature shape: `controller`, `dto/request`, `dto/response`, `service`, `repository`, `entity`, `enums`.
- Preserve surrounding legacy layout unless the task explicitly includes structure realignment.
- The repo is still mixed. Do not assume every backend package already matches the preferred template.
- `common` is the primary home for shared platform capabilities, cross-cutting infra, security, error handling, and stable utilities.
- `common` must not depend on feature packages.
- Feature packages may depend on `common`.
- Cross-feature reuse alone does not justify moving code into `common`.
- Known exceptions such as `common.auth` and top-level `audit` are allowed.

## Frontend Defaults
- Use React + TypeScript.
- Use CSS Modules unless the local area already follows another pattern.
- Use existing API helpers from `frontend/src/api/client.ts`, especially `apiGet`, `apiPost`, and `apiPatch`.
- Keep frontend API types aligned with backend DTOs and response envelopes.
- Preserve current UI structure unless the task explicitly requires broader UI refactoring.

## Validation Defaults
- Run the smallest relevant backend or frontend checks that prove the change.
- Prefer at least one real integration path when changing callbacks, middleware, persistence flow, or error handling.
- Fix failing tests or lint issues before concluding the task.

## When To Open Supporting Docs
- Open the branch/work rules doc when branch choice, validation scope, or documentation sync is ambiguous.
- Open the backend structure rules doc when deciding whether code belongs in `common`, a feature package, or a legacy module boundary.
- Use the architecture document as explanatory context, not as a stronger rule source than this file.

## Supporting References
- Branch/work rules: [docs/agent-branch-and-work-rules.md](/Users/abc/projects/GymCRM_V2/docs/agent-branch-and-work-rules.md)
- Backend structure rules: [docs/backend-structure-rules.md](/Users/abc/projects/GymCRM_V2/docs/backend-structure-rules.md)
- Architecture reference: [docs/02_시스템_아키텍처_설계서.md](/Users/abc/projects/GymCRM_V2/docs/02_%EC%8B%9C%EC%8A%A4%ED%85%9C_%EC%95%84%ED%82%A4%ED%85%8D%EC%B2%98_%EC%84%A4%EA%B3%84%EC%84%9C.md)

Use the supporting docs for explanation and examples. If they conflict with this file about agent behavior, follow this file.
