---
title: "feat: Self-hosted runner staging on Windows (Docker + Nginx) with WireGuard VPN access"
type: feat
status: completed
date: 2026-04-15
origin: docs/brainstorms/2026-04-15-self-hosted-runner-external-staging-requirements.md
---

# feat: Self-hosted runner staging on Windows (Docker + Nginx) with WireGuard VPN access

## Overview

AWS 실배포(CD)는 보류하고, 집 Windows PC 1대에 GitHub self-hosted runner를 붙여 `staging`을 Docker로 상시 구동한다. 외부에서는 ipTime 공유기 WireGuard VPN(+DDNS)로만 접근하고, Nginx가 단일 진입점(`/` + `/api`)을 제공한다. `develop` push 시 GitHub Actions가 Windows PC에서 컨테이너를 갱신하고, smoke 체크까지 자동 수행한다.

## Problem Frame

현 시점 목표는 “배포 환경이 아직 없어서 CD를 못 한다”가 아니라, “CD 루프(빌드/갱신/스모크/수동 QA)를 먼저 돌려서 개발 속도와 신뢰도를 올린다”이다. 따라서 서비스는 인터넷에 직접 노출하지 않고(VPN only), 단일 진입점으로 MacBook에서 외부 수동 QA가 가능해야 한다. (see origin: `docs/brainstorms/2026-04-15-self-hosted-runner-external-staging-requirements.md`)

## Requirements Trace

- R1-R3a: 외부 접근 가능 + 인증 없는 인터넷 공개 금지 + VPN(WireGuard)로만 접근
- R4-R5: `develop` 기준 자동 갱신 + 갱신 후 smoke 자동 수행
- R5a: frontend 포함 단일 진입점 + `/api`는 backend 프록시
- R6-R7: 재부팅/네트워크 변동 시 복구 단순 + 비밀정보 커밋 금지

## Scope Boundaries

- AWS 기반 CD(`deploy-staging.yml`, `deploy-production.yml`)는 “실제 배포 환경 구성 후”에만 사용한다.
- 외부 노출(포트포워딩/공개 HTTPS)은 다루지 않는다. 외부 QA는 WireGuard VPN 내부에서만 수행한다.

## Key Technical Decisions

- **External access는 ipTime WireGuard + DDNS**로 고정한다 (origin 결정).
- **단일 진입점 reverse proxy는 Nginx**로 고정한다 (대화 결정).
- **frontend는 production build 정적 자산**으로 제공하고, **API는 상대 경로 `/api`**로 호출한다.
  - 근거: frontend API client는 기본적으로 `API_BASE_URL=""`(same-origin)로 동작하며, `/api` 프록시와 결합이 자연스럽다: `frontend/src/api/client.ts`.
- **Windows self-hosted runner에서 Docker로 이미지 빌드/갱신**한다.
  - 초기 단계에서는 registry(GHCR) 없이 “로컬 빌드 + compose up --build”로 단순화한다.

## Open Questions

### Resolved During Planning

- Reverse proxy: Nginx로 결정.
- QA 형태: frontend 포함, MacBook에서 외부 접속(단 VPN 내부).

### Deferred to Implementation

- backend/frontend 컨테이너 빌드 방식: **Dockerfile multi-stage**로 결정
- smoke/E2E 범위: **health + index smoke**만(Phase 1)로 결정
- self-hosted runner label/선정 방식: **`runs-on: [self-hosted, windows, gymcrm-staging]`** label 강제로 결정

## Implementation Units

- [x] **Unit 1: Self-hosted staging Docker/Compose baseline (backend + db + redis + nginx)**

**Goal:** Windows PC에서 `staging`을 Docker로 상시 구동할 수 있는 최소 구성을 만든다.

**Requirements:** R5a, R6, R7

**Approach (high-level):**
- 기존 `compose.yaml`(local dev DB/Redis)과 충돌을 피하기 위해 self-hosted 전용 compose 파일을 별도로 둔다.
- Nginx 컨테이너가 `/`는 frontend 정적 자산, `/api`는 backend로 proxy 한다.
- DB/Redis는 compose 내부 네트워크로만 노출(호스트 포트 publish 최소화).

**Files (proposed):**
- `compose.selfhosted-staging.yaml`
- `deploy/selfhosted/nginx/nginx.conf`
- `deploy/selfhosted/nginx/Dockerfile` (frontend build + nginx static serve + /api proxy)
- `backend/Dockerfile` (Spring Boot app container)
- `docs/ops/selfhosted-staging-runbook.md`

**Test Scenarios:**
- Windows PC에서 compose 기동 후 `http://localhost:<host-port>/`가 200 응답
- `http://localhost:<host-port>/api/v1/health`가 200 + `status=UP`
- DB 볼륨이 유지되는지(컨테이너 재기동 후에도 backend 정상 기동)

- [x] **Unit 2: GitHub Actions deploy to self-hosted runner (develop -> staging)**

**Goal:** GitHub Actions가 Windows self-hosted runner에서 `develop` push 시 컨테이너를 갱신하고 smoke 체크까지 수행한다.

**Requirements:** R4, R5, R6, R7

**Approach (high-level):**
- 새 워크플로우를 추가한다. 기존 AWS용 `deploy-staging.yml`은 “나중에” 사용하므로, self-hosted 전용 workflow 이름/트리거를 분리한다.
- `runs-on`은 반드시 self-hosted runner로 제한하고, 가능하면 특정 label을 요구해 “집 Windows PC”로만 배포되게 한다.
- smoke 체크는 runner 로컬에서 실행해 “배포 직후 즉시 실패 감지”를 우선한다.

**Files (proposed):**
- `.github/workflows/deploy-staging-selfhosted.yml`

**Workflow expectations (non-exhaustive):**
- concurrency로 중복 배포를 취소/직렬화
- `docker compose -f compose.selfhosted-staging.yaml up -d --build`
- smoke: `/api/v1/health` + `/` 2개를 재시도 기반으로 체크

**Test Scenarios:**
- `develop`에 작은 변경(README 등) push 시에도 workflow가 실행되는지(또는 path 조건이 있으면 기대대로 스킵되는지)
- backend 변경 시 backend image가 갱신되고 health가 정상
- frontend 변경 시 정적 자산이 갱신되고 index가 정상

- [x] **Unit 3: External QA access runbook (WireGuard + DDNS + URLs)**

**Goal:** MacBook이 외부 네트워크에서도 “VPN 연결 -> staging 접속 -> 기본 QA”가 재현 가능하도록 절차를 문서화한다.

**Requirements:** R1-R3a, R6

**Approach (high-level):**
- ipTime/DDNS/WireGuard 설정은 repo 밖이지만, 운영 관점에서 필요한 “무엇을 어디에 넣는지”와 “접속 체크 포인트”를 정리한다.
- staging URL은 “VPN IP + 포트” 기반으로 고정한다(예: `http://<windows-vpn-ip>:8088/`).

**Files (proposed):**
- `docs/ops/selfhosted-staging-runbook.md`

**Test Scenarios:**
- MacBook에서 LTE 등 외부망에서 WireGuard 연결 후 staging 접속 성공
- QA 체크리스트 최소 1개(예: 로그인 화면 진입 + health 확인) 수행 가능

## Rollout / Migration

- Phase 1(최소): health + index smoke만 자동화하고, 수동 QA로 앱 흐름을 확인한다.
- Phase 2(확장): 핵심 플로우 1~2개를 E2E 테스트로 추가하고, 실패 시 알림 채널을 붙인다.

## Risks & Mitigations

- **Windows self-hosted runner 환경 드리프트**: Docker Desktop 업데이트/재부팅으로 동작이 흔들릴 수 있음
  - Mitigation: runbook에 “재부팅 후 확인 절차” 및 “기본 상태 점검 체크” 포함
- **비밀정보 노출**: `.env`/DB password 등을 repo에 커밋할 위험
  - Mitigation: GitHub Environment(예: `staging-selfhosted`) Secrets/Variables만 사용, 파일은 런타임 생성
- **오배포(대상 머신 혼동)**: 여러 self-hosted runner가 생기면 엉뚱한 PC에 배포될 수 있음
  - Mitigation: `runs-on` label 강제 + workflow에 대상 식별 로그 출력

## Validation Strategy

- 자동: workflow smoke(`/api/v1/health`, `/`) 성공
- 수동: VPN 연결 후 MacBook에서 주요 화면/핵심 플로우 1~2개 QA

## Next Step

→ `/ce:work`로 Unit 1부터 구현 (compose + nginx + Dockerfile) 후 self-hosted workflow까지 연결
