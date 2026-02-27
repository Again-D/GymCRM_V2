# Core API SLO Contract (v1)

Date: 2026-02-27
Status: active
Origin: /Users/abc/projects/GymCRM_V2/docs/brainstorms/2026-02-27-gym-crm-observability-slo-first-brainstorm.md

## 1) Goal

핵심 업무 API(회원/상품/회원권 + 예약/출입)에 대해 단일 SLO 기준을 정의하고,
`dev + staging`에서 측정하되 공식 Go/No-Go 판정은 `staging`에서만 수행한다.

## 2) Scope

### 2.1 Core API groups

- `member_domain`
  - `POST /api/v1/members`
  - `GET /api/v1/members`
  - `GET /api/v1/members/{memberId}`
  - `PATCH /api/v1/members/{memberId}`
- `product_domain`
  - `POST /api/v1/products`
  - `GET /api/v1/products`
  - `GET /api/v1/products/{productId}`
  - `PATCH /api/v1/products/{productId}`
  - `PATCH /api/v1/products/{productId}/status`
- `membership_domain`
  - `POST /api/v1/members/{memberId}/memberships`
  - `POST /api/v1/members/{memberId}/memberships/{membershipId}/hold`
  - `POST /api/v1/members/{memberId}/memberships/{membershipId}/resume`
  - `POST /api/v1/members/{memberId}/memberships/{membershipId}/refund/preview`
  - `POST /api/v1/members/{memberId}/memberships/{membershipId}/refund`
- `reservation_domain`
  - `POST /api/v1/reservations`
  - `GET /api/v1/reservations`
  - `GET /api/v1/reservations/schedules`
  - `GET /api/v1/reservations/{reservationId}`
  - `POST /api/v1/reservations/{reservationId}/cancel`
  - `POST /api/v1/reservations/{reservationId}/complete`
  - `POST /api/v1/reservations/{reservationId}/check-in`
  - `POST /api/v1/reservations/{reservationId}/no-show`
- `access_domain`
  - `POST /api/v1/access/entry`
  - `POST /api/v1/access/exit`
  - `GET /api/v1/access/events`
  - `GET /api/v1/access/presence`

### 2.2 Supporting (non-core KPI panel)

- `auth_support`
  - `POST /api/v1/auth/login`
  - `POST /api/v1/auth/refresh`
  - `POST /api/v1/auth/logout`
  - `GET /api/v1/auth/me`

### 2.3 Exclusions (v1)

- `/api/v1/health`
- `/api/v1/samples/**`
- `/actuator/**`
- static resource routes

## 3) SLI definitions

- Latency SLI: `http.server.requests` p95
- Error SLI: `5xx_count / total_count`
- Availability SLI: `1 - 5xx_rate`

Notes:
- URI label은 path variable raw value가 아닌 템플릿 경로 기준으로 집계한다.
- 집계 단위는 endpoint group + env (`dev`/`staging`)로 분리한다.

## 4) SLO targets (v1)

- `p95 < 250ms`
- `5xx_rate < 0.5%`
- `availability >= 99.7%`

## 5) Decision window

- Official gate: `staging` rolling 7 days
- Early diagnostics: `dev` rolling 24h / 7d (reference only)
- Expansion plan: 운영 데이터 안정화 후 30일 윈도우 확장

## 6) Low-traffic rule

샘플 부족 시간대의 과민 알림을 줄이기 위해 아래 규칙을 사용한다.

- 7일 rolling `total_count < 200`이면 `warning-only`로 표시
- `critical` 판정은 `total_count >= 200`일 때만 가능

## 7) Alert policy (v1)

- Warning
  - 1시간 창 p95 >= 250ms 또는 5xx_rate >= 0.5%
- Critical
  - 6시간 연속 p95 >= 250ms 또는 5xx_rate >= 0.5%
  - 또는 1시간 availability < 99.7% (샘플 기준 충족 시)

## 8) Runtime instrumentation baseline

Current repo settings:
- Actuator enabled
- Prometheus registry enabled
- `http.server.requests` histogram + SLO buckets (`100ms,250ms,500ms,1s`)
- Metrics tag baseline: `application`, `environment`

Reference files:
- `/Users/abc/projects/GymCRM_V2/backend/build.gradle`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/resources/application.yml`

## 9) Known constraints

- JWT 모드에서 `/actuator/prometheus`는 앱 레벨 인증(`ROLE_CENTER_ADMIN`)을 요구한다.
- 운영 스크레이퍼는 인증 토큰 주입 또는 내부 접근 프록시 구성 중 하나를 반드시 사용해야 한다.
- 현재 단계는 계약/기준선 고정이며, 대시보드/알림 인프라 연결은 단계적으로 적용한다.

## 10) Validation checklist

- [ ] `dev`에서 `/actuator/prometheus` 노출 확인
- [ ] `staging`에서 동일 메트릭 노출 확인
- [ ] endpoint group 매핑 문서 리뷰 완료
- [ ] 7일 rolling 계산식 샘플 검증 완료
