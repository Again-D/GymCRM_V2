# Prototype Canonical Rules (Phase 1)

날짜: 2026-02-23

## 목적

설계 문서 간 불일치가 있더라도 프로토타입 구현 단계에서 흔들리지 않도록 기준 규칙을 고정한다.

## 규칙

- 테넌트 명칭은 `center`를 표준으로 사용한다.
- 프론트엔드/API 필드명은 `centerId`를 사용한다.
- 리소스 식별자는 숫자 PK(`Long`)를 사용한다.
- 표시용 비즈니스 ID(`MBR-...`)는 프로토타입 범위에서 제외한다.
- 인증은 no-auth 프로토타입 모드로 운영한다.
- no-auth 모드는 `dev`/`staging`에서만 허용하고 `prod`에서는 차단한다.
- 환불 정책은 프로토타입 고정 단순 정책(비례 사용분 + 10% 위약금)을 사용한다.

## 감사(Audit) 기본값 전략

- 로그인 미도입 단계에서는 `CurrentUserProvider`가 고정 관리자 ID를 반환한다.
- 기본값: `userId=1`, `username=prototype-admin`

## 후속 단계에서 재검토할 항목

- JWT/Refresh 토큰 정책
- RBAC 역할명 표준 적용 (`ROLE_*`)
- 표시용 비즈니스 ID 도입
- 멀티 센터 운영 정책/UI

