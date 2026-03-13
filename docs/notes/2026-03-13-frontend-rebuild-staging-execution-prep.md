# Frontend Rebuild Staging Execution Prep

Date: 2026-03-13

## Purpose

이 문서는 staging smoke를 실제로 수행하기 전에 필요한 입력값과 실행 순서를 고정한다.

현재 blocker는 smoke 절차 자체가 아니라, **staging target / credential / exposure path가 아직 채워지지 않은 상태**다.
즉 이 문서는 다음 실행자가 환경 정보만 채우면 바로 smoke를 시작할 수 있게 만드는 준비 문서다.

## Required Inputs

아래 6개가 채워지면 staging smoke를 바로 시작할 수 있다.

1. rebuild staging URL
2. baseline staging URL
3. admin 계정
4. desk 계정
5. trainer 계정
6. mobile/desktop에서 접속 가능한 브라우저 경로

## Fill-In Sheet

- rebuild staging URL:
- baseline staging URL:
- login route:
- logout route:
- health endpoint:
- admin login id:
- desk login id:
- trainer login id:
- password delivery method:
- notes:

## Execution Order

### Step 1: Pre-check

- [ ] rebuild staging URL 접속 가능
- [ ] baseline staging URL 접속 가능
- [ ] health endpoint 200
- [ ] auth/session이 staging에서 실제로 동작

### Step 2: Auth / Session Matrix

- [ ] logged-out -> protected route redirect
- [ ] admin login / logout
- [ ] desk login / logout
- [ ] trainer login / logout
- [ ] refresh on protected route

### Step 3: Core Workflow Matrix

- [ ] `/members`
- [ ] `/memberships`
- [ ] `/reservations`
- [ ] `/access`

### Step 4: Evidence Collection

- [ ] desktop screenshots
- [ ] mobile screenshots
- [ ] role matrix screenshots
- [ ] blocker note update
- [ ] staging results note update

## Screenshot Naming Convention

다음 패턴으로 저장한다.

- `rebuild-staging-admin-members.png`
- `rebuild-staging-admin-memberships.png`
- `rebuild-staging-desk-access.png`
- `rebuild-staging-trainer-access.png`
- `rebuild-staging-trainer-reservations.png`
- `rebuild-staging-mobile-members.png`
- `rebuild-staging-mobile-reservations.png`
- `rebuild-staging-mobile-access.png`

저장 위치:
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/testing/artifacts/`

## Output Documents To Update

staging smoke를 끝내면 아래 문서를 같이 업데이트한다.

- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-staging-smoke-results.md`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-live-api-blocker-log.md`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-migration-rollback-plan.md`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-final-candidate-checkpoint-draft.md`

## Current Blocker Statement

현재는 아래 문장이 정확하다.

> staging smoke를 수행할 절차와 evidence template는 준비돼 있지만, 실제 staging target/credential 정보가 아직 채워지지 않았다.

따라서 지금 단계의 다음 액션은 구현이 아니라 **환경 정보 확보**다.
