---
title: backend architecture stack alignment umbrella plan status
status: active
date: 2026-03-10
author: Codex
origin:
  - docs/plans/2026-03-09-refactor-backend-architecture-stack-alignment-plan.md
  - docs/brainstorms/2026-03-10-backend-architecture-stack-alignment-remaining-work-brainstorm.md
  - docs/plans/2026-03-10-feat-redis-runtime-adoption-execution-plan.md
---

# Backend Architecture Stack Alignment Umbrella Plan Status

## Purpose

`docs/plans/2026-03-09-refactor-backend-architecture-stack-alignment-plan.md`는 작성 시점에는 단일 실행 계획으로 유효했지만, 현재 기준으로는 완료된 축과 미완료 축이 함께 남아 있는 umbrella plan 상태다.

이 문서는 umbrella plan 자체를 다시 구현 기준으로 쓰기보다, 현재 어떤 항목이 이미 닫혔고 어떤 항목이 후속 실행 계획으로 분리되었는지 정리하기 위한 상태 메모다.

## Current Status Summary

- umbrella plan status: `active`
- 실제 성격: `historical umbrella plan with follow-up tracks`
- 완료된 주 실행 축:
  - `JPA + QueryDSL` 도입 및 핵심 저장소 전환
  - `SpringDoc/OpenAPI` dev-only 노출 및 보안 문서화
  - parity / integration / startup smoke test 기준선 정리
  - heavy query / native SQL 예외 경계 문서화
- 남은 주 실행 축:
  - `Redis runtime adoption`
- 명시적 비대상:
  - `docs/02_시스템_아키텍처_설계서.md` 현재화 작업

## Decision Baseline

2026-03-10 브레인스토밍 기준으로 아래 원칙을 고정한다.

- 아키텍처 문서는 목표 상태 문서로 유지한다.
- 현재 구현과 목표 상태의 차이는 실행계획 및 상태 메모 문서에서 관리한다.
- Redis 도입 순서는 `QR token -> reservation lock -> auth denylist`로 유지한다.
- umbrella plan은 다음 구현을 직접 이끄는 세부 실행 문서가 아니라, 분리된 후속 플랜을 가리키는 상위 맥락 문서로 본다.

## Track Classification

### 1. Completed Track

다음 축은 구현과 머지까지 완료되어 umbrella plan의 후속 실행 대상으로 더 이상 보지 않는다.

- Gradle canonical build 유지
- JPA/QueryDSL 저장소 패턴 도입
- 핵심 도메인 저장소 전환
- OpenAPI dev-only 노출 및 보안/에러 응답 문서화
- parity test / startup smoke test 추가
- native SQL intentional exception inventory 정리

관련 구현은 이미 `main`에 반영되어 있다.

## 2. Active Follow-up Track

현재 가장 큰 미완료 축은 Redis 런타임 도입이다.

이 축은 umbrella plan 안에서 계속 확장하지 않고, 아래 후속 실행 계획으로 분리해 관리한다.

- execution plan:
  - `docs/plans/2026-03-10-feat-redis-runtime-adoption-execution-plan.md`
- earlier boundary reference:
  - `docs/plans/2026-03-09-feat-redis-runtime-adoption-boundary-plan.md`

Redis 축의 canonical source 기준은 다음과 같이 고정한다.

- QR token consume: Redis
- reservation business state: PostgreSQL
- refresh token canonical: PostgreSQL `auth_refresh_tokens`
- access revoke state: Redis denylist

## 3. Deferred / Intentionally Unchanged Track

다음 항목은 지금 단계에서 일부러 진행하지 않는다.

- `docs/02_시스템_아키텍처_설계서.md`를 현재 구현 기준으로 수정하는 작업

이 문서는 목표 상태 문서로 유지하며, 실행계획/상태 메모가 현재 구현 상태를 보완한다.

## Operational Interpretation

현재부터는 아래처럼 해석한다.

- umbrella plan:
  - 배경, 범위, 전환 맥락을 설명하는 상위 문서
- Redis execution plan:
  - 다음 실제 구현 작업의 기준 문서
- architecture document:
  - 목표 상태 문서
- notes/status documents:
  - 현재 구현 상태와 목표 상태의 갭을 관리하는 보조 문서

## Recommended Next Step

다음 실제 구현은 `docs/plans/2026-03-10-feat-redis-runtime-adoption-execution-plan.md` 기준으로 시작한다.

권장 순서:

1. Redis foundation
2. QR token Redis migration
3. reservation lock adoption
4. auth denylist extension

## Exit Condition For Umbrella Plan

아래 조건이 충족되면 umbrella plan은 사실상 후속 참조 문서로만 남겨도 된다.

- Redis execution plan의 단계 구현과 검증이 완료된다.
- 후속 notes/runbook에서 rollout/rollback 기준이 정리된다.
- architecture document는 그대로 유지하되, 추가 gap 관리는 execution/notes 문서로 충분히 커버된다.

그 시점에는 umbrella plan 상태를 `completed` 또는 `superseded`로 정리하는 것이 적절하다.
