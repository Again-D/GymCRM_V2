---
title: feat: Core API Observability SLO Guardrails
type: feat
status: active
date: 2026-02-27
origin: docs/brainstorms/2026-02-27-gym-crm-observability-slo-first-brainstorm.md
---

# feat: Core API Observability SLO Guardrails

## Overview

프로토타입 이후 기능 확장보다 운영 안정화를 우선하기 위해, Gym CRM 핵심 업무 API(회원/상품/회원권 + 예약/출입) 전체에 대해 SLO 기반 운영 가드레일을 도입한다.

이번 계획은 브레인스토밍에서 확정된 결정을 구현 가능한 단계로 전개한다.

- 관측성 전략은 `SLO-First`
- 범위는 핵심 업무 API 전체
- 측정 환경은 `dev + staging`, 공식 Go/No-Go 판정은 `staging`
- 초기 임계치: `p95 < 250ms`, `5xx < 0.5%`, `availability >= 99.7%`
- 초기 판정 윈도우: 최근 7일 rolling, 이후 30일 확장

(see brainstorm: docs/brainstorms/2026-02-27-gym-crm-observability-slo-first-brainstorm.md)

## Problem Statement

현재 저장소는 `traceId` 기반 요청-응답-로그 상관관계와 핵심 도메인 무결성 검증 체계는 갖췄지만, 운영 품질을 수치로 판정하는 표준 SLO 체계가 없다.

- `traceId`는 있으나 SLO 위반 판정 기준(집계 창, 대상 API, 에러율 계산식)이 고정되지 않음
- Phase 9 완료 문서에도 성능 항목이 미완료로 남아 있음 (`p95 < 300ms` unchecked)
- 아키텍처 문서 목표(가용성/응답성능)와 런타임 운영 체크리스트가 아직 직접 연결되지 않음

결과적으로 배포/운영 의사결정이 정성적 판단에 의존할 수 있고, 환경별(특히 staging) 품질 게이트 일관성이 흔들릴 수 있다.

## Proposed Solution

핵심 API를 대상으로 SLI/SLO를 정의하고, 측정 파이프라인-대시보드-알림-Go/No-Go 체크리스트를 하나의 운영 규약으로 고정한다.

핵심 원칙:

1. 기존 `traceId`는 유지하고, SLO 집계는 메트릭 중심으로 분리
2. 판정의 단일 기준은 `staging` 7일 rolling
3. dev는 진단/회귀 탐지 용도(참고치), 공식 판정은 staging 전용
4. 불변식(데이터 정합성) 검증과 SLO(품질) 검증을 동시에 운영

## Research Summary

### Origin brainstorm
- Found brainstorm from 2026-02-27: `gym-crm-observability-slo-first`.
- Carried-forward decisions:
  - SLO-First 전략 고정
  - API 범위(회원/상품/회원권 + 예약/출입) 고정
  - `dev + staging` 측정, `staging` 판정
  - 균형형 임계치 + 7일 rolling 윈도우
- Reference: `docs/brainstorms/2026-02-27-gym-crm-observability-slo-first-brainstorm.md`

### Repository patterns (local)
- Actuator dependency already present: `backend/build.gradle:24`
- Trace correlation implemented:
  - `backend/src/main/java/com/gymcrm/common/logging/TraceIdFilter.java:18`
  - `backend/src/main/resources/application.yml:19`
  - `backend/src/main/java/com/gymcrm/common/api/ApiResponse.java:13`
- JWT mode security allows health endpoint only by default:
  - `backend/src/main/java/com/gymcrm/common/config/SecurityConfig.java:52`
- Architecture monitoring target exists (CloudWatch + Grafana):
  - `docs/02_시스템_아키텍처_설계서.md:106`
- Architecture SLI-level goals already documented:
  - `docs/02_시스템_아키텍처_설계서.md:29`
  - `docs/02_시스템_아키텍처_설계서.md:30`
- Existing plan gap showing unfinished performance gate:
  - `docs/plans/2026-02-27-feat-phase9-access-checkin-operational-hardening-plan.md:202`

### Institutional learnings (`docs/solutions`)
- Reservation capacity/usage integrity requires policy + DB constraints + service checks alignment:
  - `docs/solutions/database-issues/reservation-capacity-and-usage-deduction-integrity-gymcrm-20260225.md`
- Attendance/no-show/usage event integrity requires explicit state semantics and idempotency invariant:
  - `docs/solutions/database-issues/reservation-checkin-noshow-usage-event-integrity-gymcrm-20260225.md`
- Access/open-session integrity validated through operational SQL invariant checks:
  - `docs/solutions/database-issues/access-events-and-open-session-integrity-gymcrm-20260227.md`
- Documentation status drift risk: rollout state must be synchronized in plan/checklist artifacts:
  - `docs/solutions/documentation-gaps/prototype-plan-checklist-status-drift-gymcrm-20260227.md`

### External research decision
- Decision: skip external research.
- Reason: this scope is internal observability standardization on existing stack/patterns, with strong local precedents and no new high-risk external integration.

## SpecFlow Analysis

### User Flow Overview

1. `CENTER_ADMIN` or `DESK` performs core API action (회원/상품/회원권/예약/출입)
2. Request receives `traceId` and returns API response
3. Actuator/metrics pipeline aggregates latency, status code, availability per endpoint group
4. Dashboard shows env-specific SLI snapshots (`dev`, `staging`)
5. Alert engine evaluates thresholds
6. Release gate checks staging 7-day rolling SLO; pass/fail recorded in runbook

### Flow Permutations Matrix

| Dimension | Variant A | Variant B | Required Handling |
|---|---|---|---|
| Environment | dev | staging | dev is diagnostic only, staging is official gate |
| Outcome | success (2xx) | failure (5xx) | both counted in availability/error SLI |
| Endpoint group | membership/product/member | reservation/access | separate panels + aggregate panel |
| Traffic level | low volume | burst | low-volume false positive suppression policy |
| Incident window | single spike | sustained degradation | warning vs critical threshold separation |

### Missing Elements & Gaps

- **Gap: SLI 집계 공식 미고정**
  - Impact: 팀마다 다른 계산식 사용 가능
- **Gap: 저트래픽 시간대 판정 규칙 없음**
  - Impact: error-rate 과대해석 가능
- **Gap: 경고/치명 임계치 분리 규칙 없음**
  - Impact: 알림 노이즈 증가 혹은 감지 지연
- **Gap: 배포 게이트 절차 미문서화**
  - Impact: 판정 근거 재현 불가
- **Gap: plan/checklist 상태 동기화 규칙 약함**
  - Impact: 운영 readiness 신호 drift 재발 가능

### Decisions Applied From SpecFlow

- SLI 공식/윈도우/대상 endpoint를 명시적으로 문서화한다.
- 저트래픽 보호 규칙(최소 샘플 수 미달 시 참고치 처리)을 도입한다.
- 경고/치명 임계치를 분리해 알림 노이즈를 제어한다.
- staging Go/No-Go 체크리스트를 배포 절차에 포함한다.
- 산출물 status/checklist 동기화를 quality gate에 포함한다.

## Technical Approach

### Scope Definition (API groups)

- Membership/Product/Member APIs
- Reservation APIs
- Access APIs
- Auth/session lifecycle APIs (login/refresh/logout) is supporting metric surface but not business KPI panel main target

### SLI/SLO Definition (v1)

- **Latency SLI**: endpoint group별 request duration `p95`
- **Error SLI**: endpoint group별 `5xx / total`
- **Availability SLI**: endpoint group별 성공률(`1 - 5xx_rate`), 운영판정은 availability SLO로 직접 사용

Initial SLO targets (from brainstorm):
- `p95 < 250ms`
- `5xx error rate < 0.5%`
- `availability >= 99.7%`

Gate window:
- `staging`, rolling 7 days (official)
- later expansion to 30 days after stabilization

### Instrumentation & Exposure

- Spring Boot Actuator + Micrometer 기반 지표 노출 경로 정렬
- endpoint group 태깅 기준 정의(URI template 기반)
- `traceId`는 로그/응답 상관분석 축으로 유지, 메트릭 판정은 집계 지표 기준으로 분리

### Dashboard & Alerting

- Dashboard panels:
  - overall core API health
  - group-wise latency/error/availability
  - deploy window overlay (when available)
- Alert tiers:
  - warning: short-window breach
  - critical: sustained breach or availability severe drop

### Go/No-Go Runbook

- staging 7-day SLO snapshot 캡처
- 위반 지표/영향 endpoint group 명시
- release decision record (go/no-go + traceable reason)
- rollback or mitigation trigger rules 명시

## System-Wide Impact

### Interaction Graph

`API request` -> `TraceIdFilter` -> `Controller/Service` -> `ApiResponse(traceId)` + `MDC log` -> `Actuator metrics scrape` -> `Dashboard aggregation` -> `Alert evaluation` -> `Staging go/no-go decision`

### Error & Failure Propagation

- Application errors become API error responses (`traceId` included)
- 5xx spikes propagate to error-rate SLI breach
- Alerting failures (pipeline outage) can hide breach; runbook must include telemetry health check precondition

### State Lifecycle Risks

- 잘못된 endpoint grouping은 SLI 왜곡을 유발
- metric cardinality explosion 위험(URI raw path label)
- low-volume env에서 rolling window 통계 편향 위험

Mitigations:
- URI template normalization
- label cardinality 제한
- minimum sample threshold rule

### API Surface Parity

- Core domains covered in same SLO policy:
  - members/products/memberships
  - reservations
  - access
- 응답 표준(`traceId`)은 기존 패턴 유지

### Integration Test Scenarios

1. 정상 요청 다수 + 단일 endpoint 5xx 주입 시, 해당 group 지표만 위반으로 계산되는지
2. low-traffic 상태에서 1회 5xx 발생 시 경고 정책이 과민 반응하지 않는지
3. `staging`에서 7일 rolling 계산 결과와 대시보드 수치가 일치하는지
4. 대시보드 지표 정상인데 로그 상관(traceId)으로 원인 추적 가능한지
5. telemetry 파이프라인 장애 시 go/no-go를 자동 pass하지 않고 보수적으로 fail/hold 처리되는지

## Implementation Phases

### Phase 1: SLO Contract and Metric Surface

Deliverables:
- SLI/SLO contract 문서 초안 (`docs/observability/`)
- endpoint group taxonomy and exclusion rules
- 7-day rolling calculation spec

Success criteria:
- metric 공식/윈도우/판정 환경 문서 확정
- core API endpoint mapping 리뷰 완료

### Phase 2: Runtime Instrumentation and Dashboard

Deliverables:
- actuator/metrics exposure hardening
- dashboard definition (dev, staging)
- warning/critical alert policy draft

Success criteria:
- staging에서 핵심 패널 조회 가능
- endpoint group별 p95/5xx/availability 확인 가능

### Phase 3: Go/No-Go Operationalization

Deliverables:
- staging go/no-go checklist
- release decision record template
- telemetry health precheck and incident fallback

Success criteria:
- 최소 1회 staging rehearsal 실행 및 기록
- no-go/fallback path 문서화 완료

### Phase 4: Stabilization and Baseline Freeze

Deliverables:
- 2주 관측 후 threshold tuning(필요 시)
- 30-day expansion readiness criteria
- final status sync across plan/checklist/docs

Success criteria:
- false positive/negative 패턴 정리
- 30일 확장 조건 충족 여부 판정 가능

## Alternative Approaches Considered

### Approach B: Trace-centric first

장점:
- 장애 조사 속도는 즉시 개선

미채택 이유:
- 운영 품질의 수치 기반 release gate를 먼저 잠그는 목표와 직접 일치하지 않음

### Approach C: Minimal telemetry only

장점:
- 구현 속도 빠름

미채택 이유:
- 핵심 API 전체 범위와 staging go/no-go 기준을 충족하기 어려움

(see brainstorm: docs/brainstorms/2026-02-27-gym-crm-observability-slo-first-brainstorm.md)

## Acceptance Criteria

### Functional Requirements

- [x] 핵심 API 그룹(회원/상품/회원권 + 예약/출입) SLI 대상 매핑이 문서로 고정된다.
- [ ] `dev`, `staging`에서 동일 SLI 정의로 지표를 조회할 수 있다.
- [x] staging 7일 rolling 기반 Go/No-Go 체크리스트가 존재하고 실행 가능하다.

### Non-Functional Requirements

- [ ] `p95 < 250ms` 기준으로 group별 판정이 가능하다.
- [ ] `5xx < 0.5%` 기준으로 group별 판정이 가능하다.
- [ ] `availability >= 99.7%` 기준으로 group별 판정이 가능하다.
- [x] 저트래픽 구간 최소 샘플 수 규칙이 명시된다.

### Quality Gates

- [ ] SLO 산출식과 대시보드 수치의 샘플 검증이 수행된다.
- [x] 알림 임계치(warning/critical)와 대응 runbook이 연결된다.
- [x] telemetry 파이프라인 장애 시 운영 fallback 절차가 문서화된다.
- [ ] 관련 plan/checklist/status 동기화가 완료된다.

## Success Metrics

- 배포 전 staging go/no-go 판단 시간이 단축된다 (주관 판단 -> 체크리스트 기반)
- 운영 이슈 대응에서 endpoint group 단위 원인 분류 시간이 단축된다
- SLO 위반 탐지 후 조치 시작까지의 리드타임이 감소한다

## Dependencies & Risks

Dependencies:
- existing Actuator dependency and runtime profiles
- CloudWatch/Grafana(or equivalent) dashboard setup access
- staging traffic volume sufficiency for rolling window evaluation

Risks:
- low traffic noise in staging
- metric label/cardinality misconfiguration
- documentation drift between plan/runbook/checklists

Mitigations:
- minimum sample rules + smoothing guidance
- URI template normalization policy
- status-sync gate in final review

## Documentation Plan

Planned docs update:
- `docs/observability/core-api-slo-contract.md` (new)
- `docs/observability/staging-go-no-go-checklist.md` (new)
- `docs/notes/` validation log for rehearsal run (new)
- relevant existing phase summary docs with SLO gate state

## Sources & References

### Origin
- Brainstorm document: `docs/brainstorms/2026-02-27-gym-crm-observability-slo-first-brainstorm.md`
- Key carried-forward decisions:
  - SLO-First strategy
  - full core API scope
  - staging-only official gate
  - balanced threshold + 7-day rolling window

### Internal References
- `backend/build.gradle:24`
- `backend/src/main/resources/application.yml:19`
- `backend/src/main/java/com/gymcrm/common/logging/TraceIdFilter.java:18`
- `backend/src/main/java/com/gymcrm/common/config/SecurityConfig.java:52`
- `docs/02_시스템_아키텍처_설계서.md:29`
- `docs/02_시스템_아키텍처_설계서.md:30`
- `docs/02_시스템_아키텍처_설계서.md:106`
- `docs/plans/2026-02-27-feat-phase9-access-checkin-operational-hardening-plan.md:202`

### Institutional Learnings
- `docs/solutions/database-issues/reservation-capacity-and-usage-deduction-integrity-gymcrm-20260225.md`
- `docs/solutions/database-issues/reservation-checkin-noshow-usage-event-integrity-gymcrm-20260225.md`
- `docs/solutions/database-issues/access-events-and-open-session-integrity-gymcrm-20260227.md`
- `docs/solutions/database-issues/membership-hold-refund-state-integrity-gymcrm-20260224.md`
- `docs/solutions/documentation-gaps/prototype-plan-checklist-status-drift-gymcrm-20260227.md`
