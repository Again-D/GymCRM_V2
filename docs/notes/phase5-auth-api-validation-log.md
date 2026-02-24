# Phase 5-2 Auth API Validation Log

- Date: 2026-02-24
- Scope: Phase 5-2 (JWT Auth APIs / Backend)

## Implemented (This Turn)

- JWT access/refresh token 발급/검증 서비스 추가 (`iss/aud/exp/nbf/jti/type`)
- refresh token hash 저장 + DB 기반 rotation/revoke 구현
- Auth API 추가
  - `POST /api/v1/auth/login`
  - `POST /api/v1/auth/refresh`
  - `POST /api/v1/auth/logout`
  - `GET /api/v1/auth/me`
- JWT 인증 필터 + JSON 401/403 핸들러 추가
- 보안 체인에서 `/api/v1/auth/*`, `/api/v1/health` permitAll / 나머지 `/api/v1/**` authenticated 반영
- `/auth/me` 보호 방식을 `@PreAuthorize`에서 HTTP security 레벨로 정렬 (500 회귀 수정)

## Automated Test Verification

Commands:

```bash
cd /Users/abc/projects/GymCRM_V2/backend
GRADLE_USER_HOME=/Users/abc/projects/GymCRM_V2/.gradle-local ./gradlew test --no-daemon --tests com.gymcrm.auth.AuthControllerIntegrationTest
GRADLE_USER_HOME=/Users/abc/projects/GymCRM_V2/.gradle-local ./gradlew test --no-daemon
```

Result:
- ✅ `AuthControllerIntegrationTest` PASS
- ✅ backend 전체 테스트 PASS

Covered by integration tests:
- login → me → refresh → logout 정상 흐름
- refresh rotation 후 이전 refresh 재사용 차단 (`401 TOKEN_REVOKED`)

## Runtime Verification (Manual / curl)

Backend run mode:

```bash
cd /Users/abc/projects/GymCRM_V2/backend
SPRING_PROFILES_ACTIVE=dev \
APP_SECURITY_MODE=jwt \
PORT=8083 \
DB_URL=jdbc:postgresql://localhost:5433/gymcrm_dev \
DB_USERNAME=gymcrm \
DB_PASSWORD=gymcrm \
./gradlew bootRun --no-daemon
```

Seed account used:
- `loginId`: `center-admin`
- `password`: `dev-admin-1234!`

Manual flow (final re-run):
- ✅ `POST /api/v1/auth/login` → `200`
- ✅ `GET /api/v1/auth/me` (Bearer access token) → `200`
- ✅ `POST /api/v1/auth/refresh` (HttpOnly refresh cookie) → `200`
- ✅ `POST /api/v1/auth/logout` → `200`
- ✅ 이전 refresh cookie 재사용 (`/auth/refresh`) → `401 TOKEN_REVOKED`

Observed response summary:
- login/refresh 응답에 access token body + refresh `Set-Cookie` 발급 확인
- logout 응답에서 refresh cookie clear (`Max-Age=0`) 확인
- replay 응답에서 `error.code=TOKEN_REVOKED`, `status=401` 확인

## Debug Note (Fixed During Validation)

- 초기 수동 검증에서 `/auth/me`가 `500`으로 응답
- 원인: `@PreAuthorize`가 적용된 `/auth/me`가 method security에서 `AuthorizationDeniedException`을 발생시키고 글로벌 예외 핸들러로 흘러감
- 조치: `/auth/me`는 HTTP security config에서 인증 강제, 컨트롤러 메서드의 `@PreAuthorize` 제거
- 재검증 결과: `/auth/me` `200` 정상

## Remaining Work (Phase 5-3+)

- RBAC (`ROLE_CENTER_ADMIN`, `ROLE_DESK`) 기존 API 적용
- 프론트 로그인/토큰 재발급 전환
- `ApiResponse.traceId` + 로그 상관관계 정렬
