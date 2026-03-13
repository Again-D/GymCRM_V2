# Frontend Rebuild Local Staging-Profile Execution Prep

Date: 2026-03-13

## Purpose

이 문서는 local staging-profile smoke를 실제로 수행하기 전에 필요한 입력값과 실행 순서를 고정한다.

현재 blocker는 smoke 절차 자체가 아니라, **실행 환경을 어떤 dev origin으로 맞출지와 결과를 어떻게 남길지 정리하는 상태**였다.
이 문서는 실제 실행 후 입력이 채워진 준비/실행 기록이 됐다.

## Required Inputs

아래 6개가 채워지면 local staging-profile smoke를 바로 시작할 수 있다.

1. rebuild local URL
2. baseline local URL
3. admin 계정
4. desk 계정
5. trainer 계정
6. mobile/desktop에서 접속 가능한 브라우저 경로

## Fill-In Sheet

- rebuild local URL: `http://127.0.0.1:5173`
- baseline local URL: sequential reference only; simultaneous side-by-side browser smoke는 local CORS allowlist 제약으로 생략
- login route: `/login`
- logout route: shell sidebar logout button
- health endpoint: `http://127.0.0.1:8080/api/v1/health`
- admin login id: `center-admin`
- desk login id: `desk-user`
- trainer login id: `trainer-user`
- password delivery method: local seeded dev credentials
- notes: rebuild local browser auth/session smoke는 `5173`에서 수행해야 backend CORS allowlist와 맞는다

## Execution Order

### Step 1: Pre-check

- [x] rebuild local URL 접속 가능
- [ ] baseline local URL 접속 가능
- [x] health endpoint 200
- [x] auth/session이 local staging-profile 환경에서 실제로 동작

### Step 2: Auth / Session Matrix

- [x] logged-out -> protected route redirect
- [x] admin login / logout
- [x] desk login / logout
- [x] trainer login / logout
- [x] refresh on protected route

### Step 3: Core Workflow Matrix

- [x] `/members`
- [x] `/memberships`
- [x] `/reservations`
- [x] `/access`

### Step 4: Evidence Collection

- [x] desktop screenshots
- [x] mobile screenshots
- [x] role matrix screenshots
- [x] blocker note update
- [x] local smoke results note update

## Screenshot Naming Convention

다음 패턴으로 저장한다.

- `rebuild-local-staging-admin-members.png`
- `rebuild-local-staging-admin-memberships.png`
- `rebuild-local-staging-desk-access.png`
- `rebuild-local-staging-trainer-access.png`
- `rebuild-local-staging-trainer-reservations.png`
- `rebuild-local-staging-mobile-members.png`
- `rebuild-local-staging-mobile-reservations.png`
- `rebuild-local-staging-mobile-access.png`

저장 위치:
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/testing/artifacts/`

## Output Documents To Update

local staging-profile smoke를 끝내면 아래 문서를 같이 업데이트한다.

- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-staging-smoke-results.md`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-live-api-blocker-log.md`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-migration-rollback-plan.md`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-final-candidate-checkpoint-draft.md`

## Current Blocker Statement

현재는 아래 문장이 정확하다.

> local staging-profile smoke를 수행할 절차와 evidence template는 준비됐고, 실제 실행 입력도 채워졌다. 다음 단계는 smoke 결과를 기반으로 internal cutover rehearsal을 수행하는 것이다.
