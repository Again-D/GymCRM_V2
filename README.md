# GymCRM_V2

GYM CRM 프로토타입 저장소입니다.

현재 상태:
- 관리자 포털 핵심 업무 프로토타입 완료 (Phase 1~4)
- Phase 5 진행 중: `JWT + Refresh Token + RBAC + traceId` 운영 기본기 도입

## CI

PR 게이트(머지 차단, 필수 체크로 설정):
- `backend-ci`: `cd backend && ./gradlew test` (DB/Redis 의존 `*IntegrationTest` 제외)
- `frontend-ci`: `cd frontend && npm ci && npm run build && npm test` + Biome check(변경된 frontend 파일만)

Nightly 통합 테스트(`develop` 기준, 소프트 블록):
- `nightly-integration`: `docker compose`로 Postgres/Redis 기동 후 `cd backend && ./gradlew integrationTest` 실행
- 실패 알림은 현재 GitHub Issue 생성/갱신으로 처리 (Slack/Discord 등 팀 채널은 후속으로 연결)

## Local Run

개발 DB(권장: Docker PostgreSQL):

```bash
docker compose up -d postgres redis
docker compose ps
```

표준 Docker 포트(`5433`)를 사용할 때 백엔드 env 예시:

```bash
export DB_URL=jdbc:postgresql://localhost:5433/gymcrm_dev
export DB_USERNAME=gymcrm
export DB_PASSWORD=gymcrm
```

백엔드 (프로토타입 no-auth 모드, 빠른 확인용):

```bash
cd backend
SPRING_PROFILES_ACTIVE=dev ./gradlew bootRun
```

참고:
- 기본 no-auth 모드는 `dev/staging`에서만 허용됩니다.
- Docker 사용이 어려우면 로컬 PostgreSQL fallback 사용 가능(문서 참고)

백엔드 (권장: jwt 모드 검증/개발):

```bash
cd backend
SPRING_PROFILES_ACTIVE=dev \
APP_SECURITY_MODE=jwt \
DB_URL=jdbc:postgresql://localhost:5433/gymcrm_dev \
DB_USERNAME=gymcrm \
DB_PASSWORD=gymcrm \
./gradlew bootRun
```

백엔드 (Redis + JWT 함께 검증/개발):

```bash
cd backend
SPRING_PROFILES_ACTIVE=dev \
APP_SECURITY_MODE=jwt \
DB_URL=jdbc:postgresql://localhost:5433/gymcrm_dev \
DB_USERNAME=gymcrm \
DB_PASSWORD=gymcrm \
APP_REDIS_ENABLED=true \
REDIS_HOST=localhost \
REDIS_PORT=6379 \
APP_REDIS_QR_TOKEN_STORE_ENABLED=true \
APP_REDIS_RESERVATION_LOCK_ENABLED=true \
APP_REDIS_CRM_DISPATCH_CLAIM_ENABLED=true \
APP_REDIS_CRM_RETRY_WHEEL_ENABLED=true \
APP_REDIS_SETTLEMENT_DASHBOARD_CACHE_ENABLED=true \
APP_REDIS_SETTLEMENT_REPORT_CACHE_ENABLED=true \
APP_REDIS_AUTH_DENYLIST_ENABLED=true \
./gradlew bootRun
```

Redis + JWT 검증 포인트:
- `docker compose up -d postgres redis`
- `curl -s http://localhost:8080/api/v1/health | jq '.data.redis'`
- 로그인 후 logout/access revoke/CRM process/settlement 조회 경로가 정상 동작하는지 확인
- 상세 로컬 실행 참고:
  - [local-run-phase1.md](/Users/abc/projects/GymCRM_V2/docs/notes/local-run-phase1.md)

백엔드 빌드 표준:
- `backend`의 canonical build는 Gradle이다.
- QueryDSL generated source는 `backend/build/generated/sources/annotationProcessor/java/main`에 생성된다.
- 생성 확인만 필요하면 `cd backend && ./gradlew clean compileJava`를 사용한다.
- OpenAPI/Swagger UI는 `dev` 프로필에서만 노출되며 경로는 `/v3/api-docs`, `/swagger-ui`다.
- Redis foundation 기본값은 `disabled`다. Redis 관련 기능 검증 시에만 아래 env를 추가한다.

```bash
export APP_REDIS_ENABLED=true
export REDIS_HOST=localhost
export REDIS_PORT=6379
```

- 책임별 feature flag:
  - `APP_REDIS_QR_TOKEN_STORE_ENABLED`
  - `APP_REDIS_RESERVATION_LOCK_ENABLED`
  - `APP_REDIS_CRM_DISPATCH_CLAIM_ENABLED`
  - `APP_REDIS_CRM_RETRY_WHEEL_ENABLED`
  - `APP_REDIS_SETTLEMENT_DASHBOARD_CACHE_ENABLED`
  - `APP_REDIS_SETTLEMENT_REPORT_CACHE_ENABLED`
  - `APP_REDIS_AUTH_DENYLIST_ENABLED`

로컬에서 Redis 전체 책임을 켜서 확인하려면:

```bash
cd backend
SPRING_PROFILES_ACTIVE=dev \
APP_REDIS_ENABLED=true \
APP_REDIS_QR_TOKEN_STORE_ENABLED=true \
APP_REDIS_RESERVATION_LOCK_ENABLED=true \
APP_REDIS_CRM_DISPATCH_CLAIM_ENABLED=true \
APP_REDIS_CRM_RETRY_WHEEL_ENABLED=true \
APP_REDIS_SETTLEMENT_DASHBOARD_CACHE_ENABLED=true \
APP_REDIS_SETTLEMENT_REPORT_CACHE_ENABLED=true \
APP_REDIS_AUTH_DENYLIST_ENABLED=true \
./gradlew bootRun
```

검증:

```bash
curl -s http://localhost:8080/api/v1/health | jq '.data.redis'
```

기본 개발 seed 계정(`dev/staging`, jwt 모드):
- `loginId`: `center-admin`
- `password`: `dev-admin-1234!`

토큰 기본값(환경변수로 변경 가능):
- Access Token: `15분` (`APP_SECURITY_ACCESS_TOKEN_MINUTES`)
- Refresh Token: `7일` (`APP_SECURITY_REFRESH_TOKEN_DAYS`)

프론트엔드:

```bash
cd frontend
npm install
npm run dev
```

JWT 모드 프론트 개발 참고:
- Vite dev server는 `/api` 요청을 백엔드로 프록시하여 refresh cookie를 same-origin처럼 처리합니다.

참고 문서:
- `docs/plans/2026-02-23-feat-gym-crm-admin-portal-core-prototype-execution-checklist-plan.md`
- `docs/plans/2026-02-23-refactor-backend-build-tool-gradle-standardization-plan.md`
- `docs/plans/2026-02-23-refactor-prototype-dev-db-provisioning-strategy-plan.md`
- `docs/notes/prototype-canonical-rules.md`
- `docs/notes/local-run-phase1.md`
- `docs/testing/gym-crm-phase5-auth-rbac-manual-test-checklist.md`
