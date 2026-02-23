# Phase 1 Local Run Notes

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

샘플 API:

- `GET /api/v1/health`

## Frontend

```bash
cd frontend
npm install
npm run dev
```

## Known Gaps (Phase 1 start point)

- Docker 미설치 환경에서는 로컬 PostgreSQL fallback 설정이 필요함
- `psql` CLI 미설치 환경일 수 있음 (필수 아님)
- 실제 도메인 CRUD는 Phase 2부터 추가
- DB 마이그레이션 실제 적용 검증(`P1-2`)은 Docker/로컬 DB 기동 후 수행 필요

## Local PostgreSQL Fallback (Allowed, Not Default)

Docker 사용이 어려운 경우 로컬 PostgreSQL 설치를 사용해도 된다.

조건:
- DB/계정/비밀번호를 문서 기본값과 맞추거나 env로 동등하게 설정
- `./gradlew bootRun` 시 Flyway migration 성공 로그 확인
- 이슈 재현 요청 시 Docker 기준으로 재검증 가능해야 함
