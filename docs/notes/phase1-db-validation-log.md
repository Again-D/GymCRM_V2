# Phase 1 DB Validation Log (Docker PostgreSQL)

날짜: 2026-02-23

## 목적

- `P1-2` (DB 연결 및 마이그레이션 기반) 실제 검증
- Docker 기반 개발 DB 표준 경로 검증
- Flyway 초기 적용 및 재실행 동작 확인

## 사용 환경

- DB: `compose.yaml`의 `postgres` 서비스 (`postgres:16`)
- 호스트 포트: `5433` (`5433:5432`)
- Backend 실행:
  - `SPRING_PROFILES_ACTIVE=dev`
  - `DB_URL=jdbc:postgresql://localhost:5433/gymcrm_dev`
  - `DB_USERNAME=gymcrm`
  - `DB_PASSWORD=gymcrm`

## 실행 결과

### 1) Docker PostgreSQL 컨테이너 기동

- `docker compose up -d postgres` 성공
- `docker compose ps` 상태: `healthy`

### 2) 첫 번째 `bootRun` (초기 마이그레이션)

성공 로그 핵심:
- `Database: jdbc:postgresql://localhost:5433/gymcrm_dev (PostgreSQL 16.12)`
- `Creating Schema History table "public"."flyway_schema_history"`
- `Migrating schema "public" to version "1 - init core tables"`
- `Successfully applied 1 migration ... now at version v1`
- `Started GymCrmApplication`

### 3) 두 번째 `bootRun` (재실행/중복 적용 방지 확인)

성공 로그 핵심:
- `Successfully validated 1 migration`
- `Current version of schema "public": 1`
- `Schema "public" is up to date. No migration necessary.`
- `Started GymCrmApplication`

## 검증 중 발견/조치

- 포트 `5432` 충돌 발생 → Docker 표준 포트를 `5433`으로 변경 (`compose.yaml`)
- Flyway가 PostgreSQL 16.12를 인식하지 못함 (`Unsupported Database`) → `flyway-database-postgresql` runtime 모듈 추가

## 결론

- Docker 기반 개발 DB 표준 경로로 `P1-2` 마이그레이션 검증 가능
- Flyway 초기 적용/재실행 동작 모두 확인 완료
