# Frontend Rebuild Local Staging-Profile Smoke Checklist

Date: 2026-03-13

## Goal

`replacement candidate` 판단 전, rebuild frontend가 local staging-profile 환경에서 baseline과 같은 운영 흐름을 재현하는지 확인한다.

이 문서는 실행 체크리스트이자 evidence 수집 기준이다. 체크 항목은 local staging-profile 환경에서 실제로 수행되고, 성공/실패/차이를 간단히 메모로 남겨야 한다.

## Environment Contract

- rebuild frontend target:
  - local rebuild dev/prod-preview URL
- backend target:
  - local backend running with staging profile
- browser baseline:
  - Chrome desktop
- mobile baseline:
  - iPhone 14 Pro Max viewport
- compared references:
  - `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-core-workflow-parity-diff.md`
  - `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-live-auth-session-flow.md`

Before execution, fill environment details in:
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-staging-execution-prep.md`

## Role Matrix

- `ROLE_CENTER_ADMIN`
- `ROLE_DESK`
- `ROLE_TRAINER`
- logged-out user

## Auth / Session Smoke

- [ ] Logged-out user direct-entry to `/members` redirects to `/login`
- [ ] Login as `ROLE_CENTER_ADMIN` lands on expected shell route
- [ ] Logout clears protected state and direct-entry to `/members` returns to `/login`
- [ ] Refresh on protected route keeps current section with no broken auth bootstrap
- [ ] `ROLE_DESK` can access `/access`
- [ ] `ROLE_TRAINER` cannot use live `/access` surface and sees explicit unsupported state
- [ ] `ROLE_TRAINER` can still access `/reservations`

## Core Workflow Smoke

### 1. 회원관리

- [ ] `/members` list loads with real member summary data
- [ ] search / filter applies and list remains usable
- [ ] row select opens current member context
- [ ] selected member card/detail stays in sync after route transitions

### 2. 회원권 업무

- [ ] `/memberships` with selected member loads memberships
- [ ] product list is populated from shared live product data
- [ ] membership purchase succeeds or returns expected validation error
- [ ] hold / resume / refund surface matches role and backend response
- [ ] cross-section return to `/members` reflects updated member summary

### 3. 예약 관리

- [ ] `/reservations` target list loads in live mode
- [ ] selected member handoff works from target list
- [ ] reservable memberships and schedules load without stale mix
- [ ] reservation create succeeds or returns expected validation error
- [ ] check-in / complete / cancel / no-show actions reflect live backend contract

### 4. 출입 관리

- [ ] `/access` is globally usable without selected member
- [ ] presence and event lists load in live mode
- [ ] member search results load and can prefill actions
- [ ] entry / exit actions work for supported roles
- [ ] trainer unsupported state does not leak stale member rows

## Difference Logging

차이가 보이면 아래 기준으로 기록한다.

- baseline behavior:
- local staging-profile rebuild behavior:
- acceptable difference인지:
- blocker인지:
- screenshot or console evidence path:

## Required Evidence

- [ ] desktop screenshots for core workflow 4개
- [ ] mobile screenshots for at least `/members`, `/reservations`, `/access`
- [ ] auth role matrix screenshots
- [ ] short result note with pass/fail/blocker summary

## Exit Criteria

다음 단계로 넘어가려면 아래가 필요하다.

- [ ] core workflow 4개가 local staging-profile 환경에서 적어도 한 번 end-to-end로 확인됨
- [ ] role-specific 제한이 baseline과 같은 수준으로 설명 가능함
- [ ] blocker는 `known + reproducible + documented` 상태로 남음
- [ ] cutover 논의를 막는 local staging-profile blocker가 있으면 별도 blocker로 승격됨
