---
date: 2026-04-15
topic: self-hosted-runner-external-staging
---

# Self-hosted Runner Staging External Access (Windows PC)

## Problem Frame
Windows PC에서 self-hosted runner로 `staging` 환경을 돌리고, MacBook에서 **외부 네트워크**에서도 접속해 수동 QA를 진행하고 싶다.
현재 AWS 실배포는 나중에 붙이며, 지금은 GitHub Actions 기반으로 배포/갱신/테스트 루프를 먼저 검증한다.

## Requirements

**Access & Security**
- R1. 외부에서 `staging`에 접속 가능해야 한다.
- R2. `staging`은 인증 없이 인터넷에 공개되지 않아야 한다.
- R3. `staging` 접근 권한은 최소한의 인원으로 제한되어야 한다(팀원/테스터).
- R3a. 외부 접속은 공유기 VPN(WireGuard)로 제한한다(포트포워딩으로 서비스 직접 노출 금지).

**Deployment Loop**
- R4. `develop` 기준으로 Windows PC의 `staging`이 갱신된다(자동 또는 수동 트리거).
- R5. 갱신 후 최소 smoke 체크(`/api/v1/health`, `/`)가 자동 수행되어야 한다.
- R5a. 수동 QA를 위해 frontend 포함 단일 진입점(예: `http://<vpn-ip>/`)을 제공하고, `/api`는 backend로 프록시한다.

**Operations**
- R6. Windows PC 재부팅/네트워크 변동에도 복구 절차가 단순해야 한다.
- R7. 비밀정보는 repo에 커밋하지 않고 GitHub Secrets/Variables 또는 로컬 환경으로 관리한다.

## Success Criteria
- MacBook이 외부 네트워크(예: LTE/타 Wi-Fi)에서 `staging` URL에 접속해 화면 확인 + 핵심 플로우 1~2개 수동 QA 가능
- GitHub Actions에서 “갱신 성공/실패”가 명확히 보이고, 실패 시 원인 파악이 가능

## Scope Boundaries
- AWS(EC2/S3/CloudFront/ALB) 실배포는 제외한다.
- 운영(production) 외부 노출/보안 인증 체계는 이 범위에서 다루지 않는다.

## Key Decisions
- [External access] ipTime 공유기 WireGuard VPN + DDNS 사용
- [Frontend] backend뿐 아니라 frontend까지 포함해 수동 QA 가능하게 구성

## Dependencies / Assumptions
- Windows PC에 Docker Desktop(or Engine)과 GitHub self-hosted runner가 설치된다.
- `compose.yaml`은 현재 DB/Redis만 포함하므로, backend/frontend 구동 방식은 이후 결정/추가가 필요하다.
- ipTime DDNS가 설정되어 있고, MacBook에서 DDNS endpoint로 VPN 연결이 가능하다.

## Outstanding Questions

### Resolve Before Planning
- [Affects R5a][User decision] 단일 진입점 reverse proxy 선택: Nginx vs Caddy(또는 다른 프록시)

### Deferred to Planning
- [Affects R4-R5][Technical] backend/frontend를 Windows PC에서 어떤 형태로 띄울지: 컨테이너 이미지 기반 vs 로컬 빌드 산출물 기반
- [Affects R5][Technical] smoke/E2E 테스트 범위: health만 vs 로그인 포함 핵심 시나리오 1~2개

## Next Steps
→ Resume /ce:brainstorm to choose the external access method, then /ce:plan.
