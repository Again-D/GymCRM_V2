---
title: feat: Redis Deferred Scope Follow-up
type: feat
status: completed
date: 2026-03-10
origin:
  - docs/notes/2026-03-10-redis-runtime-rollout-validation.md
  - docs/plans/2026-03-10-feat-redis-runtime-adoption-execution-plan.md
---

# feat: Redis Deferred Scope Follow-up

## Overview

이 계획은 Redis runtime rollout 이후에도 deferred로 남아 있는 두 범위를 별도 후속 트랙으로 분리한다.

대상 범위:
- refresh token canonical source Redis 이전 검토
- Redis 기반 CRM/settlement ephemeral state 후보 정리 및 후속 구현

핵심 원칙:
- refresh token canonical은 현재 PostgreSQL 유지가 기본값이다.
- 즉, refresh token migration은 바로 구현이 아니라 별도 cutover 판단 트랙으로 다룬다.
- 반대로 CRM/settlement는 ephemeral state 후보가 있으면 저위험 단위부터 분리 구현할 수 있다.

## Track A: Refresh Token Canonical Migration Assessment

문제:
- 현재 refresh token은 PostgreSQL `auth_refresh_tokens`가 canonical이다.
- 이를 Redis로 옮기면 auth revoke/read/write/cutover가 모두 바뀌므로 고위험이다.

목표:
- 실제 migration이 필요한지 먼저 판단한다.
- 필요 시에만 별도 migration plan으로 승격한다.

Checklist:
- [x] PostgreSQL canonical 유지 비용과 병목을 정리한다.
- [x] Redis canonical 전환 시 장점보다 운영 리스크가 큰지 검토한다.
- [x] dual-write/read, rollback, replay detection cutover가 필요한지 정리한다.
- [x] go/no-go 결론을 문서화한다.

기본 판단:
- 현재는 `assessment only`
- 구현 착수 기본값은 `no-go unless clear bottleneck`

## Track B: CRM / Settlement Ephemeral State Inventory

문제:
- CRM/settlement 영역에는 Redis가 꼭 필요한 canonical business state는 아직 보이지 않는다.
- 다만 dedupe, short TTL lock, export job handoff 같은 ephemeral state 후보는 있을 수 있다.

목표:
- 실제로 Redis가 도움이 되는 state만 좁혀서 inventory를 만든다.
- canonical DB를 건드리지 않는 후보부터 후속 구현 순서를 정한다.

Checklist:
- [x] CRM 영역의 ephemeral state 후보를 인벤토리화한다.
- [x] settlement 영역의 ephemeral state 후보를 인벤토리화한다.
- [x] candidate를 `implementable now / later / reject`로 분류한다.
- [x] 가장 저위험 후보 1개를 다음 구현 대상으로 고정한다.

## Acceptance Criteria

- [x] refresh token migration은 구현/비구현 판단 근거가 문서화된다.
- [x] CRM/settlement Redis 후보가 inventory 문서로 정리된다.
- [x] 다음 구현 우선순위가 1개로 좁혀진다.

## Execution Notes

- 2026-03-10:
  - Redis rollout note의 deferred scope를 별도 후속 plan으로 분리했다.
  - refresh token migration은 implementation track이 아니라 assessment track으로 둔다.
  - CRM/settlement는 ephemeral state inventory를 먼저 만들고, canonical DB 변경 없는 후보만 후속 구현 대상으로 본다.


## Execution Result

- 2026-03-10:
  - refresh token canonical migration은 현재 `no-go`로 정리했다.
  - CRM/settlement deferred scope inventory를 작성했다.
  - 다음 구현 우선순위를 `CRM processPending dispatch claim lock`으로 고정했다.
  - inventory note: [2026-03-10-redis-deferred-scope-inventory.md](/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-10-redis-deferred-scope-inventory.md)
  - 후속 구현으로 `CRM processPending dispatch claim lock`을 적용했다.
  - Redis feature flag: `app.redis.crm-dispatch-claim.enabled`
  - 후속 구현으로 `sales dashboard short TTL cache`를 적용했다.
  - Redis feature flag: `app.redis.settlement-dashboard-cache.enabled`
  - 후속 구현으로 `sales report export snapshot cache`를 적용했다.
  - Redis feature flag: `app.redis.settlement-report-cache.enabled`
