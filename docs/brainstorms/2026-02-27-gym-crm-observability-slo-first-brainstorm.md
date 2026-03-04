---
date: 2026-02-27
topic: gym-crm-observability-slo-first
---

# Gym CRM Observability SLO-First Brainstorm

## What We're Building
프로토타입 이후 확장 단계에서 기능 추가보다 운영 안정화를 우선하기 위해, Gym CRM의 핵심 업무 API 전체(회원/상품/회원권 + 예약/출입)에 대한 SLO-First 운영 가드레일을 정의한다.

이번 브레인스토밍의 목표는 구현 상세(툴/코드)보다 "운영 품질을 어떤 수치로 관리할지"를 먼저 고정하는 것이다. 이를 통해 이후 개발/배포/검증에서 동일한 Go/No-Go 기준을 적용하고, 장애 대응 시 우선순위를 빠르게 결정할 수 있게 한다.

## Why This Approach
검토한 접근은 3가지였다.

- Approach A: SLO-First 운영 가드레일
- Approach B: traceId 중심 상관분석 심화
- Approach C: 최소 계측만 도입

A를 선택한 이유:
- 아키텍처 문서의 목표 지표(지연/가용성)와 직접 정렬된다.
- 기능 확장 전에 운영 품질 기준을 먼저 잠글 수 있다.
- traceId 기반 운영 경험은 이미 있으므로, 다음 단계는 "수치 기반 판단 체계"가 더 큰 레버리지다.

## Key Decisions
- 운영 안정화 우선순위는 `성능/관측성`으로 확정한다.
- 관측성 전략은 `SLO-First`로 진행한다.
- SLO 적용 대상은 `회원/상품/회원권 + 예약/출입` 핵심 API 전체로 고정한다.
- 측정은 `dev + staging`에서 수행하되, 공식 Go/No-Go 판정은 `staging`만 사용한다.
- 초기 SLO 임계치는 균형형으로 시작한다.
  - API p95 < 250ms
  - 5xx error rate < 0.5%
  - availability >= 99.7%
- 초기 Go/No-Go 판정 윈도우는 최근 7일(rolling)로 고정하고, 운영 데이터 안정화 후 30일로 확장한다.
- 기존 `traceId` 체계는 유지하고, SLO 판단의 보조 상관분석 축으로 사용한다.

## Resolved Questions
- Q: 다음 확장의 1순위 목적은?
  - A: 기술 안정화로 확정.
- Q: 기술 안정화에서 무엇을 우선할지?
  - A: 성능/관측성 우선.
- Q: 핵심 API 범위는 어디까지인지?
  - A: 회원/상품/회원권 + 예약/출입 전체.
- Q: SLO 판정 환경은 어떻게 둘지?
  - A: dev + staging 측정, staging 판정.
- Q: 초기 수치 임계치는 어느 수준으로 시작할지?
  - A: 균형형(추천안).

## Open Questions
- 없음.

## Next Steps
- `/prompts:workflows-plan`에서 구현 계획으로 전환.
- 구현 계획에서는 아래를 산출물로 명시:
  - SLI/SLO 정의 문서(대상 API, 집계 윈도우, 제외 규칙)
  - 대시보드/알림 기준(경고/치명 임계치)
  - staging Go/No-Go 체크리스트
