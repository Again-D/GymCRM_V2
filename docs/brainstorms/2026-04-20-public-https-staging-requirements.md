---
date: 2026-04-20
topic: public-https-staging
---

# Public HTTPS Staging Access (Windows PC)

## Problem Frame
Windows PC의 `staging`을 VPN 없이도 외부 네트워크에서 열 수 있게 하고 싶다.
이 문서는 기존 `staging` 환경과 배포 루프를 그대로 재사용하되, 외부 QA가 인터넷에서 바로 접근 가능한 **공개 HTTPS ingress** 를 추가하는 안을 정의한다.

## Requirements

**Access & Trust**
- R1. `staging`은 VPN 없이도 공용 인터넷에서 접근 가능해야 한다.
- R2. `staging`의 canonical URL은 HTTPS를 사용해야 하며, 브라우저가 신뢰하는 인증서를 제공해야 한다.
- R3. `staging`은 URL만 알면 누구나 쓸 수 있는 익명 공개 상태가 아니어야 한다.
- R3a. UI와 `/api/*`는 같은 접근 제어 경계를 공유해야 하며, 익명 API 우회 경로가 있으면 안 된다.
- R4. 개별 테스터의 접근은 빠르게 부여/회수할 수 있어야 하며, 공유 계정은 사용하지 않아야 한다.

**Deployment Loop**
- R5. `develop` 기준의 갱신 루프는 유지되어야 하며, 배포 후 자동 smoke 체크가 계속 실행되어야 한다.
- R6. smoke 체크는 최소한 `/`와 `/api/v1/health`를 포함해야 한다.
- R7. 단일 공용 URL은 frontend와 API를 함께 제공해야 하며, 브라우저 관점에서는 하나의 public origin으로 보여야 한다.

**Operations**
- R8. 재부팅, DNS 변경, 인증서 갱신 이후에도 복구 절차가 단순해야 한다.
- R9. 공개 staging은 기본적인 인터넷 노출 방어수단을 포함해야 한다. 예: 접근 로그, 실패 로그인 완화, 간단한 rate limit.
- R10. 비밀정보는 repo에 커밋하지 않고 환경변수나 외부 secret 저장소로 관리해야 한다.

## Success Criteria
- 외부 네트워크(LTE, 타 Wi-Fi)에서 VPN 없이 staging URL에 접속할 수 있다.
- 브라우저 경고 없이 HTTPS가 동작한다.
- 접근 권한이 없는 사용자는 staging을 실사용하지 못한다.
- 배포 실패, 인증서 만료, 접근 제어 문제를 빠르게 감지할 수 있다.

## Scope Boundaries
- production 공개 배포와 동일한 운영 수준의 완전한 보안 체계는 이 문서의 범위가 아니다.
- 공개 staging은 마케팅 사이트나 일반 사용자용 서비스가 아니다.
- VPN-only 접근 방식은 이 대안의 기본 전제가 아니다.

## Key Decisions
- 공개 HTTPS는 기존 staging을 재사용하고, public ingress와 access control만 추가하는 안이다.
- TLS는 공용 신뢰 체계에 맞춰 public entry point에서 종단되어야 하며, backend는 그 뒤의 private boundary 안에 유지되어야 한다.
- public URL은 사람이 공유할 수 있는 하나의 canonical 주소여야 한다.
- 브라우저가 사용하는 public origin은 하나여야 한다.
- 공개 staging이라도 익명 무제한 사용은 허용하지 않는다.
- 접근 제어의 기본 모델은 tester별 계정 기반 로그인이다.

## Dependencies / Assumptions
- staging에 사용할 public DNS 이름이 준비되어야 한다.
- 공용 인터넷에서 staging entry point로 들어오는 경로가 열려 있어야 한다.
- 공개 entry point 이후의 트래픽은 private deployment boundary 안에서 처리되어야 한다.
- 인증서 발급과 갱신은 운영 부담이 과도하지 않은 방식이어야 한다.

## Outstanding Questions

### Deferred to Planning
- [Affects R1-R2][Technical] public ingress를 어디에서 종단할지: host reverse proxy, cloud edge, 또는 다른 entry point
- [Affects R2][Technical] public certificate 발급/갱신 전략을 무엇으로 할지
- [Affects R3-R4][Technical] tester 계정 발급/회수와 세션 무효화의 구체 운영 방식

## Next Steps
→ `/ce:plan` for implementation planning.
