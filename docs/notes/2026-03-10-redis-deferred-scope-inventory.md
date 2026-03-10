---
title: Redis deferred scope inventory
status: completed
date: 2026-03-10
origin:
  - docs/plans/2026-03-10-feat-redis-deferred-scope-follow-up-plan.md
  - docs/notes/2026-03-10-redis-runtime-rollout-validation.md
---

# Redis Deferred Scope Inventory

## Track A: Refresh Token Canonical Migration Assessment

결론:
- 현재는 `no-go`
- refresh token canonical source는 계속 PostgreSQL `auth_refresh_tokens` 유지

근거:
- 최근 auth revoke 작업이 `access_revoked_after + refresh revoke`를 PostgreSQL canonical 기준으로 이미 닫았다.
- Redis로 refresh token canonical을 옮기면 replay detection, family revoke, rollback, dual-write/read cutover를 다시 설계해야 한다.
- 현재 코드와 문서 어디에도 PostgreSQL refresh token path가 병목이라는 증거는 없다.
- 따라서 이 항목은 구현 backlog가 아니라 `clear bottleneck observed` 조건부 재검토 항목으로 남기는 것이 맞다.

재검토 trigger:
- `auth_refresh_tokens` write/read latency가 명확한 운영 병목으로 확인될 때
- auth revoke/read path에서 PostgreSQL 스케일 한계가 측정될 때
- multi-region/session store 요구가 실제로 생길 때

## Track B: CRM / Settlement Ephemeral State Inventory

### CRM candidates

1. `processPending` dispatch claim lock
- 위치:
  - [CrmMessageService.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/crm/CrmMessageService.java)
  - [CrmMessageEventRepository.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/crm/CrmMessageEventRepository.java)
- 문제:
  - 현재 `findDispatchable -> send -> markSent/markRetryWait/markDead` 흐름은 병렬 worker가 늘어나면 같은 event를 중복 집을 수 있다.
- Redis 적합성:
  - 높음
  - canonical DB는 그대로 두고, 짧은 TTL claim key로 중복 dispatch만 줄일 수 있다.
- 분류:
  - `implementable now`

2. trigger-time pre-dedupe cache
- 문제:
  - membership expiry / birthday / event campaign trigger 시 dedupe key를 미리 Redis에 적재하는 방식
- 평가:
  - 낮음
  - 이미 DB `ON CONFLICT (dedupe_key)`가 canonical dedupe를 수행한다.
- 분류:
  - `reject`

3. retry backoff scheduler wheel
- 문제:
  - `RETRY_WAIT` event를 Redis sorted set으로 관리하는 방식
- 평가:
  - 중간
  - 장점은 있지만 현재 DB `next_attempt_at`만으로도 기능은 충분하다.
- 분류:
  - `later`

### Settlement candidates

1. sales report export snapshot cache
- 위치:
  - [SalesSettlementReportController.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/settlement/SalesSettlementReportController.java)
- 문제:
  - 같은 파라미터 CSV export 반복 요청 캐싱
- 평가:
  - 낮음
  - 현재는 동기 export 문자열 생성뿐이고 job handoff/state machine이 없다.
- 분류:
  - `later`

2. sales dashboard short TTL cache
- 위치:
  - [SalesDashboardService.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/settlement/SalesDashboardService.java)
- 문제:
  - 반복 조회에 대한 단기 캐시
- 평가:
  - 낮음
  - 캐시는 가능하지만 canonical state 분리 효과보다 단순 조회 최적화에 가깝다.
- 분류:
  - `later`

3. trainer payroll/export job coordination
- 평가:
  - 현재 비동기 job/state가 없어 Redis coordinator 필요성이 약함
- 분류:
  - `reject for now`

## Recommended Next Implementation

다음 실제 구현 대상은 `CRM processPending dispatch claim lock`이다.

이유:
- canonical DB를 바꾸지 않는다.
- 기존 CRM 메시지 이벤트 모델을 그대로 유지한다.
- Redis의 짧은 TTL lock/claim 역할과 가장 잘 맞는다.
- 다중 worker 중복 발송 리스크를 직접 줄일 수 있다.

추천 key 방향:
- `crm:dispatch:claim:{crmMessageEventId}`
- 짧은 TTL lease 기반 claim
- send 완료/실패 후 명시 해제보다 TTL 만료를 기본으로 두고, 상태 최종 기록은 DB canonical로 유지

실행 상태:
- 2026-03-10 구현 완료
- feature flag: `app.redis.crm-dispatch-claim.enabled`
- 동작 정책: claim 획득 성공 시에만 send 진행, Redis 장애 시 `fail-open`
