# GymCRM_V2

GYM CRM 프로토타입 저장소입니다.

현재 상태:
- 관리자 포털 핵심 업무 프로토타입 완료 (Phase 1~4)
- Phase 5 진행 중: `JWT + Refresh Token + RBAC + traceId` 운영 기본기 도입

## Local Run

개발 DB(권장: Docker PostgreSQL):

```bash
docker compose up -d postgres
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
