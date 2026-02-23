# GymCRM_V2

GYM CRM 프로토타입 저장소입니다.

현재 상태:
- 설계 문서 + Phase 1 구현 골격
- 관리자 포털 전용 프로토타입 (no-auth 모드)

## Local Run (Phase 1)

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

백엔드:

```bash
cd backend
SPRING_PROFILES_ACTIVE=dev ./gradlew bootRun
```

참고:
- 기본 no-auth 모드는 `dev/staging`에서만 허용됩니다.
- Docker 사용이 어려우면 로컬 PostgreSQL fallback 사용 가능(문서 참고)

프론트엔드:

```bash
cd frontend
npm install
npm run dev
```

참고 문서:
- `docs/plans/2026-02-23-feat-gym-crm-admin-portal-core-prototype-execution-checklist-plan.md`
- `docs/plans/2026-02-23-refactor-backend-build-tool-gradle-standardization-plan.md`
- `docs/plans/2026-02-23-refactor-prototype-dev-db-provisioning-strategy-plan.md`
- `docs/notes/prototype-canonical-rules.md`
- `docs/notes/local-run-phase1.md`
