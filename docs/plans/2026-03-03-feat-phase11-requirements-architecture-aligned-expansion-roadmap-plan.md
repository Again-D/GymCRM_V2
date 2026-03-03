---
title: feat: Phase11 Requirements-Architecture Aligned Expansion Roadmap
type: feat
status: active
date: 2026-03-03
origin: docs/brainstorms/2026-02-23-gym-crm-product-brainstorm.md
---

# feat: Phase11 Requirements-Architecture Aligned Expansion Roadmap

## Enhancement Summary

- Deepened on: 2026-03-03
- Sections enhanced: 8
- Research inputs:
  - Origin brainstorm + related brainstorm
  - Institutional learnings (`docs/solutions/*`)
  - Official docs: Spring Boot Actuator/Metrics, AWS SQS DLQ, PostgreSQL partial index, transactional outbox pattern

### Key Improvements

1. 기능 확장을 4개 트랙으로 유지하되, 각 트랙에 운영 품질 게이트(보안/관측성/문서 동기화)를 필수화
2. 큐/외부연동 구간에 DLQ/재시도/idempotency/outbox 패턴을 명시해 실패 복구 경로를 구체화
3. Phase별 완료 기준을 "기능 + 통합 테스트 + 운영 검증 로그" 3축으로 강화

### New Considerations Discovered

- low-traffic 환경에서 SLO 판정 왜곡 방지를 위한 최소 샘플 정책 필요
- partial unique index는 정합성 강제에 효과적이지만 쿼리 패턴/파라미터화 영향을 고려한 검증이 필요
- SQS DLQ retention은 source queue보다 길게 설정해야 운영 디버깅 손실을 줄일 수 있음

## Overview

프로토타입 이후 확장을 요구사항 분석서(`docs/01_요구사항_분석서.md`)와 시스템 아키텍처 설계서(`docs/02_시스템_아키텍처_설계서.md`)에 맞춰 진행하기 위한 실행 계획이다.

핵심 방향은 브레인스토밍에서 확정된 원칙을 유지한다.

- 도메인 코어 우선 + 외부 연동 단계적 활성화
- 단일 지점 운영 기본값 유지, 멀티지점 확장 가능 구조 유지
- 문서 규칙 불일치 해소를 선행 과제로 관리
- 운영 안정화(SLO/보안)와 기능 확장을 병행

(see brainstorm: docs/brainstorms/2026-02-23-gym-crm-product-brainstorm.md)

### Research Insights

- 아키텍처 문서 목표(가용성/응답성/MTTR)를 기능 확장 각 Phase의 비기능 수용기준으로 연결해야 drift를 줄일 수 있다.
- 최근 완료한 observability baseline(Phase10)을 신규 도메인에도 동일 적용하면 운영 판정 일관성이 높아진다.

## Problem Statement / Motivation

현재 저장소는 회원/상품/회원권 및 예약/출입의 기반과 observability 보강까지 확보했지만, 요구사항 문서의 In-Scope 전체(라커, 매출/정산, CRM 메시지, 외부 연동 운영 절차)는 미완결 상태다.

이 상태로 기능을 임의 확장하면 다음 리스크가 발생한다.

- 요구사항과 구현 간 추적 불일치
- 아키텍처의 모듈/인터페이스 원칙(SOLID, 12-factor) 훼손
- 운영 관점(보안, 관측성, 장애 대응) 누락

### Research Insights

- 과거 해결 사례에서 반복된 공통 실패 패턴은 "정책-DB 제약-서비스-UI-테스트 불일치"였다.
- 따라서 도메인 확장은 기능 구현보다 먼저 정책/불변식 문서화를 고정해야 재작업 비용이 줄어든다.

## Research Summary

### Origin brainstorm (primary)

Found brainstorm from 2026-02-23: `gym-crm-product`.

Carried-forward decisions:
- 1차 목표는 운영 안정화
- 외부 연동은 인터페이스 우선, 실제 활성화는 단계 적용
- 권한/식별자/용어 등 문서 불일치 정리가 선행 과제
- 관리자 포털 중심 + 핵심 데스크 업무 우선

(see brainstorm: docs/brainstorms/2026-02-23-gym-crm-product-brainstorm.md)

### Related recent decision

- SLO-First 운영 가드레일은 이미 Phase10에서 도입됨
- 확장 기능도 동일한 운영 게이트(dev 측정, staging 판정)에 편입 필요

Reference:
- `docs/plans/2026-02-27-feat-core-api-observability-slo-guardrails-plan.md`

### Repository / docs signals

- Requirement scope reference: `docs/01_요구사항_분석서.md`
- Architecture module and external integration contract: `docs/02_시스템_아키텍처_설계서.md`
- Current operational baseline: observability docs in `docs/observability/`
- Institutional learnings:
  - `docs/solutions/database-issues/membership-hold-refund-state-integrity-gymcrm-20260224.md`
  - `docs/solutions/database-issues/reservation-capacity-and-usage-deduction-integrity-gymcrm-20260225.md`
  - `docs/solutions/database-issues/access-events-and-open-session-integrity-gymcrm-20260227.md`

### External references (official)

- Spring Boot Metrics/Actuator: https://docs.spring.io/spring-boot/reference/actuator/metrics.html
- AWS SQS DLQ guide: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html
- AWS SQS DLQ retention: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/setting-up-dead-letter-queue-retention.html
- PostgreSQL partial indexes: https://www.postgresql.org/docs/current/indexes-partial.html
- Transactional outbox pattern: https://microservices.io/patterns/data/transactional-outbox

### External research decision

- 새 프레임워크 도입이 아닌 내부 확장 중심이므로 광범위 외부 리서치는 생략하고, 운영 안정성에 필요한 공식 문서만 반영한다.

## Proposed Solution

확장 대상을 4개 트랙으로 분리해 병행 가능하게 구성한다.

1. 요구사항-구현 정합성 트랙
- FR 항목 대비 현재 구현 매핑표 작성
- 미구현/부분구현/완료 구분
- 우선순위(Must/Should/Could) 기반 Phase 분할

2. 도메인 확장 트랙
- Phase11: 라커 관리(LKR) + 기본 정산 리포트(SAL 기초)
- Phase12: CRM 메시지 최소 자동화(CRM)
- Phase13: 외부 연동 활성화(PG/알림톡/QR) 단계 적용

3. 아키텍처 정합성 트랙
- 외부 연동 어댑터 인터페이스 표준화
- 이벤트/비동기 경로(SQS/worker) 실패 처리 기준 고정
- 권한 모델 확장(ADMIN -> CENTER_ADMIN / DESK / TRAINER)

4. 운영 품질 트랙
- 신규 도메인을 SLO 대시보드/알림/Go-NoGo 체크리스트에 편입
- 보안 경계(공개 endpoint, 인증 정책) 사전 점검 템플릿 적용

### Research Insights

**Best Practices:**
- 외부 연동 이벤트는 "DB 상태 변경 + outbox 기록"을 동일 트랜잭션으로 처리하고, 별도 relay가 발행하도록 설계한다.
- 큐 소비자는 at-least-once 전달을 전제로 idempotent key를 강제한다.
- 정합성 규칙은 서비스 로직만이 아니라 partial unique index/constraint로 DB에 고정한다.

**Implementation details:**
- Queue 운영 기본값
  - source/DLQ는 같은 account+region
  - `maxReceiveCount`를 업무 특성별로 분리
  - DLQ retention > source retention

## SpecFlow Analysis

### Primary user flows to add

- 라커 배정 -> 만료 예정 확인 -> 연장/해지
- 정산 집계 -> 기간별 리포트 조회 -> 검증/확정
- CRM 트리거(만료 임박/이벤트) -> 큐 적재 -> 발송 결과 기록
- 결제/출입 외부 연동 실패 -> 재시도/폴백 -> 운영자 조치

### Edge cases and gaps

- 라커 이중 배정/해지 레이스 컨디션
- 정산 집계 기준 시점 불일치(타임존, 취소/환불 반영 시차)
- 메시지 중복 발송/누락(재시도 시 idempotency)
- 외부 API 장애 시 부분 성공 상태의 정합성
- 권한 세분화 전환 시 기존 ADMIN-only 경로 회귀

### SpecFlow decisions applied

- 각 트랙별 최소 1개 통합 테스트 시나리오를 필수 조건으로 설정
- 외부 연동은 항상 "실패 경로" 기준 acceptance criteria 포함
- 운영 체크리스트를 기능 완료 정의(DoD)에 포함

### Research Insights

- 저트래픽 구간에서는 5xx rate 단일치만으로 배포 차단하지 않고 "최소 샘플 수" 보조 조건을 둔다.
- 외부 연동 실패 시나리오는 "최대 재시도 횟수 초과 -> DLQ 격리 -> 운영자 재처리"를 기본 흐름으로 명시한다.

## Technical Considerations

- Architecture impacts
  - domain module 증가에 따라 서비스 경계/패키지 구조 명확화 필요
  - worker/queue 경로의 관측성 및 DLQ 운영정책 필요
- Performance implications
  - 정산 쿼리/리포트 조회는 p95 기준 별도 패널 필요
  - CRM 배치/스케줄러가 API 응답에 영향 주지 않도록 비동기 분리
- Security considerations
  - 권한 분리 시 endpoint별 역할 매핑 정의 필요
  - 외부 연동 credential/secret 관리 및 감사 로그 강화

### Research Insights

**Performance:**
- `http.server.requests` 기반으로 URI template 단위 집계 사용(원시 path 금지)해 cardinality 폭증을 방지한다.
- 정산 리포트는 읽기 전용 조회 경로를 명확히 분리하고, p95 목표를 일반 API와 별도 관리한다.

**Security:**
- 운영 endpoint 접근정책은 allow-list 기반으로 문서화하고, 보안 테스트에 무인증 접근 검증을 포함한다.
- 권한 확장 시 API와 UI의 역할 행렬을 단일 소스로 관리한다.

## System-Wide Impact

- **Interaction graph**: 데스크/매니저 액션 -> API/Service -> DB 상태 변경 -> 이벤트 큐 -> 워커/외부 연동 -> 운영 지표/알림
- **Error propagation**: 외부 연동 실패가 도메인 트랜잭션에 미치는 영향(보상/재시도) 규칙 필요
- **State lifecycle risks**: partial success 시 정합성 붕괴 가능성(결제 성공-회원권 미발급 등)
- **API surface parity**: ADMIN 단일 역할에서 다중 역할 전환 시 UI/API 모두 권한 일관성 유지 필요
- **Integration test scenarios**:
  - 라커 중복 배정 경쟁 상황
  - 정산 집계 기간 경계(월말/환불 동시 발생)
  - 메시지 발송 재시도 중복 방지
  - 외부 결제 실패 후 롤백/보상 처리

### Research Insights

- outbox/relay를 적용하면 "DB commit 이후 발행 누락" 리스크를 줄일 수 있다.
- 소비자 idempotency 보장을 위해 `event_id`/`message_key` unique 제약 + 처리 이력 저장이 필요하다.

## Implementation Phases

### Phase 11-A: Requirement Traceability Freeze (1주)

Deliverables:
- FR-모듈별 구현 매핑표 (`docs/notes/`)
- 우선순위 재정렬(Phase11/12/13)
- 문서 불일치 목록 및 표준 용어 사전

Success criteria:
- Must/Should/Could별 구현 상태 합의
- 다음 2개 스프린트 백로그 확정

Quality gates:
- PR마다 관련 FR ID를 본문에 명시
- 계획/체크리스트/status 동기화 확인

Progress (2026-03-04):
- [x] `docs/notes/phase11-fr-traceability-baseline-2026-03-04.md` 작성
- [x] `docs/notes/phase11-priority-backlog-2026-03-04.md` 작성
- [x] `docs/notes/phase11-terminology-alignment-2026-03-04.md` 작성
- [x] 다음 2개 스프린트 우선순위(11-1, 11-2) 확정

### Phase 11-B: Locker + Settlement Foundation (1~2주)

Deliverables:
- 라커 배정/연장/해지 API + UI 기본 플로우
- 정산 기본 리포트(기간/상품/담당자 기준)
- 관련 DB 제약 및 통합 테스트

Success criteria:
- 핵심 시나리오 E2E 동작
- 데이터 무결성 테스트 통과

Quality gates:
- 중복 배정 방지 DB 제약 적용
- 기간 경계(월말/타임존) 정산 테스트 포함

Progress (2026-03-04):
- [x] LKR 백엔드 기초 구현: 슬롯/배정/반납 API + DB 제약 + 통합 테스트 추가
- [x] LKR 프론트 기본 플로우(조회/배정/반납) 연결
- [x] SAL 기본 리포트(기간/상품/결제수단/순매출) 구현

### Phase 11-C: CRM Messaging Baseline (1주)

Deliverables:
- 이벤트 기반 메시지 트리거(만료 임박)
- 큐 적재/재시도/결과 기록 구조
- 운영자 확인용 발송 이력 화면(최소)

Success criteria:
- 중복 발송 방지 키 적용
- 실패 재시도 및 가시성 확보

Quality gates:
- source->DLQ 이동 시나리오 테스트
- 운영 로그에서 traceId/event_id 추적 가능

### Phase 11-D: External Integration Readiness (1~2주)

Deliverables:
- PG/알림톡/QR 연동 어댑터 계약 고정
- sandbox/stub 기반 통합 테스트
- 운영 활성화 체크리스트

Success criteria:
- 실연동 전환 전 계약 테스트 통과
- 장애/폴백 절차 문서화

Quality gates:
- 외부 장애 주입(타임아웃/5xx) 테스트
- fallback/보상 트랜잭션 검증 로그 확보

## Acceptance Criteria

- [x] 요구사항 문서 FR 항목과 현재 구현의 추적 매트릭스가 작성된다.
- [ ] Phase11 범위(라커/정산 기초/CRM 기초)가 아키텍처 원칙에 맞게 설계된다.
- [ ] 외부 연동은 인터페이스 우선 + 실패 경로 기준으로 수용 기준이 정의된다.
- [ ] 신규 기능이 observability SLO 체크리스트에 편입된다.
- [ ] 역할/권한 확장 전략(ADMIN -> 다중 역할)이 API/프론트 공통 기준으로 문서화된다.
- [ ] 문서 상태 동기화 규칙(계획/체크리스트/검증 로그)이 운영된다.

### Research Insights

추가 수용 기준:
- [ ] 각 Phase에 최소 1개 통합 테스트(실제 DB/큐 경로)가 존재한다.
- [ ] 메시지 처리 경로에 idempotency 키와 중복 방지 규칙이 문서/코드에 모두 반영된다.
- [ ] 운영 체크리스트에 DLQ 모니터링 지표(`ApproximateAgeOfOldestMessage` 등)가 포함된다.

## Success Metrics

- FR Must 항목 커버리지: baseline 대비 +30%p 이상
- 신규 도메인 API의 staging 기준 5xx < 0.5%
- 신규 흐름 장애 재현 시 MTTR 30분 이내(아키텍처 목표 정렬)
- 릴리스 의사결정 문서 누락률 0%

### Metric Contracts (Operational)

1. FR Must Coverage Delta
- Formula: `(current_completed_must / current_total_must) - (baseline_completed_must / baseline_total_must)`
- Target: `>= +30%p`
- Baseline snapshot date: `2026-03-04`
- Baseline source: `docs/notes/phase11-fr-traceability-baseline-2026-03-04.md` (Phase 11-A 산출물)
- Scope: `docs/01_요구사항_분석서.md`의 Must 항목 전체
- Owner: Product + Backend Lead
- Cadence: Phase 종료 시 1회 + 주간 점검

2. Staging 5xx Error Rate (New Domain APIs)
- Formula: `sum(rate(http_server_requests_seconds_count{status=~"5..",env="staging",uri=~"/api/v1/(lockers|settlements|crm.*)"}[7d])) / sum(rate(http_server_requests_seconds_count{env="staging",uri=~"/api/v1/(lockers|settlements|crm.*)"}[7d]))`
- Target: `< 0.5%`
- Window: `rolling 7d`
- Data source: Prometheus/Micrometer (`http_server_requests_seconds_*`)
- Minimum sample policy: 7일 total request 수가 500 미만이면 `참고치`로 표기하고 Go/No-Go 단독 기준으로 사용하지 않음
- Owner: Platform/Backend On-call
- Cadence: 배포 전/후 + 주간 점검

3. MTTR for New Domain Incident
- Formula: `incident_resolved_at - incident_detected_at`
- Target: `<= 30m`
- Scope: Locker/Settlement/CRM 관련 sev2+ incident
- Data source: incident log + ops timeline record
- Owner: On-call lead
- Cadence: incident 발생 건별 측정, 주간 회고 집계

4. Release Decision Artifact Completeness
- Formula: `missing_decision_records / total_release_events`
- Target: `0%`
- Required artifact: `release decision record + staging go/no-go checklist evidence`
- Owner: Release manager
- Cadence: 모든 release 이벤트마다 점검

## Dependencies & Risks

Dependencies:
- 기존 auth/RBAC 기반 안정성
- observability 대시보드/알림 채널 운영
- DB migration 및 seed 데이터 전략

Risks:
- 범위 확장으로 인한 과도한 병렬 변경
- 외부 연동 계약 지연
- 문서/코드 드리프트 재발

Mitigation:
- 트랙 단위 병렬, PR 크기 제한
- stub-first 계약 테스트
- 각 Phase 종료 시 문서 동기화 게이트 적용

### Research Insights

- DB+메시지 이중쓰기 위험을 outbox 패턴으로 통제
- DLQ 운영 실패를 막기 위해 "DLQ 비우기"가 아니라 "원인 분류 + redrive" 절차를 runbook에 고정
- partial index/unique 제약 추가 시 쿼리 경로 영향 분석을 포함한 migration 검증 필요

## Sources & References

- **Origin brainstorm:** `docs/brainstorms/2026-02-23-gym-crm-product-brainstorm.md`
  - carried decisions: 도메인 코어 우선, 외부 연동 단계 적용, 문서 불일치 선해소
- Requirements: `docs/01_요구사항_분석서.md`
- Architecture: `docs/02_시스템_아키텍처_설계서.md`
- Related plans:
  - `docs/plans/2026-02-27-feat-core-api-observability-slo-guardrails-plan.md`
  - `docs/plans/2026-02-25-feat-phase8-attendance-checkin-and-usage-event-hardening-plan.md`
  - `docs/plans/2026-02-27-feat-phase9-access-checkin-operational-hardening-plan.md`
- Institutional learnings:
  - `docs/solutions/database-issues/membership-hold-refund-state-integrity-gymcrm-20260224.md`
  - `docs/solutions/database-issues/reservation-capacity-and-usage-deduction-integrity-gymcrm-20260225.md`
  - `docs/solutions/database-issues/access-events-and-open-session-integrity-gymcrm-20260227.md`
- External references:
  - Spring Boot Metrics: https://docs.spring.io/spring-boot/reference/actuator/metrics.html
  - AWS SQS DLQ: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html
  - AWS SQS DLQ retention: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/setting-up-dead-letter-queue-retention.html
  - PostgreSQL partial index: https://www.postgresql.org/docs/current/indexes-partial.html
  - Transactional outbox pattern: https://microservices.io/patterns/data/transactional-outbox
