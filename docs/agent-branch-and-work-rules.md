# Agent Branch And Work Rules

This document expands the branch, execution, validation, and documentation-sync rules summarized in [AGENTS.md](/Users/abc/projects/GymCRM_V2/AGENTS.md).
If this file conflicts with [AGENTS.md](/Users/abc/projects/GymCRM_V2/AGENTS.md), follow [AGENTS.md](/Users/abc/projects/GymCRM_V2/AGENTS.md).

## Git Branch Strategy
- `main` is the production deployment branch.
- `develop` is the integration branch for upcoming releases.
- `feature/*` is the default working branch for features, fixes, and scoped refactors.

## Agent Working Rules
- Start new implementation work from `develop`.
- Create one dedicated `feature/*` branch per user-requested change.
- Do not work directly on `main` or `develop` unless the user explicitly asks for it.
- Merge `feature/*` into `develop` after review and verification.
- Merge `develop` into `main` when preparing a production release.
- Keep environment differences in config and deployment settings, not in long-lived environment branches.
- If the user explicitly asks for release-branch work, follow the request. Otherwise default to `develop -> feature/*`.

## Work Unit Rules
- Start from the current user request only.
- Prefer minimal diffs over opportunistic cleanup.
- Keep backend and frontend changes separate unless the task truly requires both.
- Follow surrounding patterns before introducing new structure.
- Read referenced plans/docs before editing risky or cross-cutting areas.
- Call out rule conflicts with current repo reality instead of silently performing broad cleanup.

## Validation Rules

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

## System-Wide Validation Expectations
- When changing callbacks, middleware, persistence flow, or error handling, test the real execution chain, not only mocks.
- Trace at least one failure path if the code persists state before risky operations.
- Check whether the same behavior is exposed through multiple entry points or interfaces.
- Verify that retry/fallback/error strategies do not conflict across layers.
- Skip deep chain checks only for leaf changes with no state or callback impact.

## Documentation Sync Rules
- If implementation or document rewrite scope is complete, update related `status`, phase checklists, acceptance criteria, and validation checkboxes in the same delivery unit.
- Do not leave plan files or execution checklists partially unchecked when the work is already done.
- If a documentation gap is found while the scoped work is otherwise complete, close it in the same PR or turn instead of deferring it.
- When validation is performed, record where the evidence lives.
- If API endpoints, request/response shapes, error surfaces, status codes, or API-facing business rules change, update [docs/04_API_설계서.md](/Users/abc/projects/GymCRM_V2/docs/04_API_%EC%84%A4%EA%B3%84%EC%84%9C.md) in the same delivery unit.
- Keep the main spec sections of [docs/04_API_설계서.md](/Users/abc/projects/GymCRM_V2/docs/04_API_%EC%84%A4%EA%B3%84%EC%84%9C.md) as the current effective contract. Do not preserve outdated API contract text in the main body once the new contract is accepted.
- Add a summary row for API contract changes to Appendix C (`부록 C: API 변경 이력`) in [docs/04_API_설계서.md](/Users/abc/projects/GymCRM_V2/docs/04_API_%EC%84%A4%EA%B3%84%EC%84%9C.md).
- Typical evidence locations:
  - PR description
  - `docs/notes/`
  - plan appendix or linked validation log

## Operational Checklist
- Prefer minimal diffs.
- Run relevant validation before concluding work.
- Keep branch strategy, validation expectations, and documentation ownership unambiguous.
- If a change truly has no operational/runtime impact, say so explicitly rather than omitting validation rationale.
