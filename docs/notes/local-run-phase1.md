# Phase 1 Local Run Notes

> Note (2026-02-24): 이 문서는 Phase 1 시작 문서로 생성되었지만, 현재는 Phase 5(jwt/rbac) 로컬 실행 참고도 함께 포함한다.

## Development DB (Recommended: Docker)

기본 표준은 Docker PostgreSQL 컨테이너다.

기동:

```bash
docker compose up -d postgres
```

상태 확인:

```bash
docker compose ps
docker compose logs -f postgres
```

중지:

```bash
docker compose stop postgres
```

리셋(데이터 삭제 포함):

```bash
docker compose down -v
```

포트 충돌 시 대안:
- 현재 표준 Docker 포트 매핑은 `5433:5432`다 (로컬 PostgreSQL과 공존 목적)
- 로컬 PostgreSQL fallback 사용 시 `DB_URL=jdbc:postgresql://localhost:5432/gymcrm_dev` 예시를 사용한다

## Backend

필수 환경변수(예시):

```bash
export DB_URL=jdbc:postgresql://localhost:5432/gymcrm_dev
export DB_USERNAME=gymcrm
export DB_PASSWORD=gymcrm
```

Docker 표준 경로(권장) 예시:

```bash
export DB_URL=jdbc:postgresql://localhost:5433/gymcrm_dev
export DB_USERNAME=gymcrm
export DB_PASSWORD=gymcrm
```

실행:

```bash
cd backend
SPRING_PROFILES_ACTIVE=dev ./gradlew bootRun
```

참고:
- `dev` 또는 `staging` 프로필에서 no-auth를 허용한다 (기본값은 안전하게 `false`)

### Backend (JWT Mode - Phase 5)

권장 실행(인증/RBAC 검증용):

```bash
cd /Users/abc/projects/GymCRM_V2/backend
SPRING_PROFILES_ACTIVE=dev \
APP_SECURITY_MODE=jwt \
DB_URL=jdbc:postgresql://localhost:5433/gymcrm_dev \
DB_USERNAME=gymcrm \
DB_PASSWORD=gymcrm \
./gradlew bootRun
```

dev/staging JWT seed 계정:
- `center-admin / dev-admin-1234!`

JWT 기본 만료 정책 (환경변수 override 가능):
- Access Token: `15분` (`APP_SECURITY_ACCESS_TOKEN_MINUTES`, 기본값 `15`)
- Refresh Token: `7일` (`APP_SECURITY_REFRESH_TOKEN_DAYS`, 기본값 `7`)

JWT 관련 주요 설정값:
- `APP_SECURITY_MODE=jwt|prototype`
- `APP_SECURITY_JWT_ISSUER` (기본 `gymcrm`)
- `APP_SECURITY_JWT_AUDIENCE` (기본 `gymcrm-admin`)
- `APP_SECURITY_JWT_SECRET` (개발 기본값은 예시값이므로 운영에서 반드시 교체)

샘플 API:

- `GET /api/v1/health`

## Frontend

```bash
cd frontend
npm install
npm run dev
```

JWT 모드 프론트 실행 시 참고:
- 기본 API 경로는 `/api/v1/...`를 사용하며, Vite dev proxy(`/api`)로 백엔드에 연결한다.
- refresh token은 `HttpOnly` cookie로 처리되므로 프론트 JS에서 직접 읽지 않는다.

## Known Gaps (Phase 1 start point)

- Docker 미설치 환경에서는 로컬 PostgreSQL fallback 설정이 필요함
- `psql` CLI 미설치 환경일 수 있음 (필수 아님)
- 실제 도메인 CRUD는 Phase 2부터 추가
- DB 마이그레이션 실제 적용 검증(`P1-2`)은 Docker/로컬 DB 기동 후 수행 필요

## Terminology / Naming (Phase 5 Doc Alignment)

- 테넌트 표준 용어는 `center` / `centerId`를 사용한다.
- 과거 문서의 `gym`, `gymId` 표기는 레거시 표현으로 간주한다.
- Phase 5 최소 역할 표준(실구현):
  - `ROLE_CENTER_ADMIN`
  - `ROLE_DESK`
- 장기 역할 표준(문서 기준)은 유지:
  - `ROLE_SUPER_ADMIN`, `ROLE_CENTER_ADMIN`, `ROLE_CENTER_MANAGER`, `ROLE_TRAINER`, `ROLE_DESK`


## Local PostgreSQL Fallback (Allowed, Not Default)

Docker 사용이 어려운 경우 로컬 PostgreSQL 설치를 사용해도 된다.

조건:
- DB/계정/비밀번호를 문서 기본값과 맞추거나 env로 동등하게 설정
- `./gradlew bootRun` 시 Flyway migration 성공 로그 확인
- 이슈 재현 요청 시 Docker 기준으로 재검증 가능해야 함
