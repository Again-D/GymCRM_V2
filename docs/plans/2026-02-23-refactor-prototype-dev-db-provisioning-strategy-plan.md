---
title: refactor: Standardize Prototype Dev DB Provisioning Strategy
type: refactor
status: completed
date: 2026-02-23
origin: docs/brainstorms/2026-02-23-gym-crm-product-brainstorm.md
---

# refactor: Standardize Prototype Dev DB Provisioning Strategy

## Overview

`Phase 1`/`Phase 2` 진행을 위해 PostgreSQL 실행 방식을 **Docker 컨테이너 기반으로 표준화할지**, 아니면 **개발자 로컬 DB 설치 방식으로 둘지** 결정한다.

현재 상태에서는 백엔드(Flyway + JDBC)가 실제 DB 연결을 요구하도록 정리되었고, `P1-2`(DB 마이그레이션 기반 준비 완료)와 이후 CRUD 개발을 위해 일관된 개발 DB 실행 경로가 필요하다.

브레인스토밍 결정사항(프로토타입, 관리자 포털 only, 외부 연동 없음, 빠른 검증 중심)을 고려하면, 개발 환경도 “빠르게 재현 가능하고 팀 간 편차가 적은 방식”이 우선이다 (see brainstorm: `docs/brainstorms/2026-02-23-gym-crm-product-brainstorm.md`).

## Decision Summary (Recommendation)

### Recommended Standard

- **기본 표준(권장): Docker 컨테이너 PostgreSQL**
- **허용 예외(선택): 로컬 설치 PostgreSQL**

즉, **팀 표준 문서/체크리스트/검증 명령은 Docker 기준으로 작성**하고, 로컬 DB는 이미 환경이 잘 갖춰진 개발자만 선택적으로 사용하도록 한다.

## Problem Statement / Motivation

현재 `docs/notes/local-run-phase1.md`에 PostgreSQL 환경변수는 정의되어 있으나, DB 실행 자체는 자동화/표준화되어 있지 않다.

이 상태의 문제:

- 개발자별 설치/버전/포트 차이로 재현성이 낮음
- `P1-2` 마이그레이션 검증 결과를 팀 공통 기준으로 공유하기 어려움
- 리뷰/버그 재현 시 “DB 환경 차이”가 잡음을 유발
- Phase 2 진입 전에 가장 기본적인 런타임 조건(backend + Flyway + Postgres)을 표준화하지 못함

## Options Considered

### Option A: Docker 컨테이너 PostgreSQL (권장)

**Approach**
- `docker compose` 또는 `docker run`으로 로컬 개발용 PostgreSQL 컨테이너를 실행
- 프로젝트 문서의 기본 `DB_URL/DB_USERNAME/DB_PASSWORD`를 컨테이너 기본값과 맞춘다
- 초기 검증(`./gradlew bootRun`, Flyway migration) 절차를 Docker 기준으로 통일한다

**Pros**
- 재현성 높음 (OS별 설치 편차 감소)
- 버전 고정 가능 (예: Postgres 16/17)
- 초기화/삭제/재생성이 쉬움 (프로토타입 개발 속도에 유리)
- 온보딩이 쉬움 (로컬 설치 없이 시작 가능)
- 향후 CI 서비스 컨테이너/테스트컨테이너로 확장하기 좋음

**Cons**
- Docker Desktop/Engine 설치가 필요
- 로컬 리소스 사용량 증가
- 일부 환경(회사 정책/가상화 제한)에서는 Docker 사용이 어려울 수 있음

**Best fit**
- 현재 GYM CRM 프로토타입 단계의 팀 표준 경로

### Option B: 로컬 설치 PostgreSQL

**Approach**
- 각 개발자가 직접 PostgreSQL 설치 및 서비스 관리
- DB/유저/비밀번호를 문서대로 맞춰 수동 구성

**Pros**
- Docker 미설치 환경에서도 가능
- 이미 로컬 DB 환경이 있는 개발자는 즉시 사용 가능
- Docker 리소스 오버헤드 없음

**Cons**
- 설치/버전/설정 차이로 재현성 낮음
- 초기 셋업/문제 해결이 사람마다 다름
- 삭제/초기화가 번거로워 프로토타입 반복 검증 속도 저하
- 팀 문서/체크리스트 표준화가 어려움

**Best fit**
- 개인 선호 환경을 가진 숙련 개발자의 예외 경로

## Why Docker Is Recommended for This Project (Now)

### 1. 프로토타입의 목표와 맞음 (속도 + 재현성)

브레인스토밍에서 1차 목표는 빠른 범위 수렴과 핵심 데스크 업무 검증이다. 이 단계에서는 DB 운영 최적화보다 **개발 환경의 빠른 재현**이 더 중요하다 (see brainstorm: `docs/brainstorms/2026-02-23-gym-crm-product-brainstorm.md`).

### 2. 현재 기술 스택과 충돌이 적음

- 백엔드: Spring Boot + Flyway + PostgreSQL
- 이미 `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` 기반으로 연결 설정됨
- Docker 표준을 추가해도 애플리케이션 코드 변경은 최소화됨

### 3. 리뷰에서 지적된 DB/Flyway 검증 신뢰도 문제를 해소하는 데 유리

이번 리뷰에서 “DB/Flyway path is not actually wired” 이슈를 수정했고, 이제는 실제 DB가 있어야 검증이 완료된다. 팀 공통으로 가장 쉽게 재현 가능한 방식은 Docker 컨테이너다.

## Proposed Solution

프로토타입 단계의 개발 DB 표준을 아래처럼 정의한다.

### Team Standard (Default)

- **Docker PostgreSQL 컨테이너를 공식 개발 DB 경로로 채택**
- `docs/notes/local-run-phase1.md`와 `README.md`를 Docker 기준으로 업데이트
- `P1-2` / `Phase 2 착수 조건`의 DB 검증을 Docker 실행 절차 기준으로 체크

### Allowed Fallback

- 로컬 설치 PostgreSQL도 허용하되, 다음 조건을 만족해야 함
  - 동일 접속 정보 또는 동등한 env 설정 제공
  - Flyway migration 성공 로그 확인
  - 문제 재현 요청 시 Docker 기준으로 재검증 가능

## Technical Considerations

- **Version pinning:** Docker 이미지 태그를 명시해야 함 (`postgres:16` 등)
- **Persistence:** 프로토타입에서는 named volume 사용 권장 (reset 절차도 문서화)
- **Ports:** 기본 `5432` 충돌 가능성 있으므로 대체 포트 예시 제공 고려
- **Credentials:** 로컬 개발 전용 고정값 사용 가능하나 `.env` 예시 문서화 필요
- **Health checks:** `pg_isready` 기반 readiness 확인 절차가 있으면 기동 실패 디버깅이 쉬움

## System-Wide Impact

- **Interaction graph**
  - `docker compose up postgres` → Postgres 기동
  - `./gradlew bootRun` → Hikari DataSource 생성 → Flyway migration 실행 → 앱 기동
  - 실패 시 DB 연결/Flyway 단계에서 즉시 오류 노출

- **Error propagation**
  - DB 미기동/접속 불가 → Flyway/Hikari 예외 → Spring startup 실패
  - 이 실패는 정상적인 “환경 미준비” 신호이며, 문서화가 중요

- **State lifecycle risks**
  - 프로토타입 데이터 리셋 과정에서 볼륨 삭제 시 데이터 손실 (의도된 동작일 수 있음)
  - 로컬 DB fallback 사용 시 기존 개인 데이터와 혼재될 위험

- **API surface parity**
  - 애플리케이션 API 자체 변경 없음
  - 변경 대상은 로컬 개발 운영 절차/문서/체크리스트

- **Integration test scenarios**
  - Docker DB 기동 후 `bootRun` 성공 + Flyway 적용
  - DB 미기동 상태에서 `bootRun` 실패(명확한 연결 오류)
  - 로컬 DB fallback 환경에서도 동일 마이그레이션 결과 확인

## Acceptance Criteria

### Functional Requirements

- [x] 개발 DB 표준 경로가 Docker(PostgreSQL)로 문서화된다
- [x] Docker 기준 실행 절차로 `backend`가 Flyway 적용 후 기동 가능하다
- [x] 로컬 DB fallback 허용 조건이 문서에 명시된다

### Non-Functional Requirements

- [ ] 팀 온보딩 시 10~15분 내 DB 준비가 가능하도록 절차가 단순하다
- [ ] DB 버전/접속 정보가 재현 가능하게 고정된다
- [x] DB 미준비 시 실패 원인이 문서에서 바로 식별 가능하다

### Quality Gates

- [x] `README.md`와 `docs/notes/local-run-phase1.md`의 DB 실행 가이드가 일치한다
- [x] `docs/plans/2026-02-23-feat-gym-crm-admin-portal-core-prototype-execution-checklist-plan.md`의 `P1-2` 검증 기준과 연결된다
- [x] 실제 검증 로그 또는 실행 결과(성공/실패 예시)가 작업 로그에 남는다

## Implementation Plan (If Approved)

### Phase A: 표준 결정 반영 (문서)

- `README.md`에 Docker DB 기본 경로 추가
- `docs/notes/local-run-phase1.md`에 Docker 기동/중지/리셋 절차 추가
- 로컬 DB fallback 절차를 별도 섹션으로 분리

### Phase B: 실행 자동화 최소화

- `docker-compose.yml` 또는 `compose.yaml` 추가 (PostgreSQL 1개 서비스)
- 기본 env 값이 현재 `application.yml`와 맞도록 설정
- (선택) `healthcheck` 추가

### Phase C: 검증 및 체크리스트 반영

- Docker DB 기동 상태에서 `./gradlew bootRun` 실행
- Flyway 적용 및 앱 기동 로그 확인
- `P1-2` 및 관련 체크리스트 항목 업데이트

## Alternative Approaches Considered (Rejected for Now)

- **로컬 DB만 공식 지원**
  - 이유: Phase 1/2에서 재현성/온보딩 비용이 더 큼

- **클라우드 공유 개발 DB 사용**
  - 이유: 프로토타입 단계에 과함, 네트워크/권한/비용/충돌 리스크 증가

## Dependencies & Risks

### Dependencies

- 개발자 로컬의 Docker 실행 가능 환경 (Docker Desktop/Colima 등)
- 사용 가능한 포트 (`5432` 또는 대체 포트)

### Risks

- Docker 미사용 환경 존재
  - 대응: 로컬 DB fallback 허용 + 문서 분리
- 포트 충돌
  - 대응: `5433:5432` 대체 예시 제공
- 볼륨 데이터 잔존으로 인한 테스트 오염
  - 대응: reset 명령(`down -v`) 명시

## Recommendation to Apply Now

**지금 시점 추천안:** `Docker PostgreSQL를 팀 기본값으로 채택`하고, `로컬 PostgreSQL은 예외 경로로 허용`.

이 선택이 현재 프로젝트 상태(프로토타입, 빠른 검증, Flyway 실제 활성화 필요)에 가장 잘 맞는다.

## Sources & References

### Origin

- **Brainstorm document:** `/Users/abc/projects/GymCRM_V2/docs/brainstorms/2026-02-23-gym-crm-product-brainstorm.md`
  - Carry-forward decisions:
  - 프로토타입 범위 축소(핵심 데스크 업무 중심)
  - 빠른 검증/데모 중심 완료 기준
  - 외부 연동 없음, 단순 운영 경로 우선

### Internal References

- `/Users/abc/projects/GymCRM_V2/docs/notes/local-run-phase1.md:1`
- `/Users/abc/projects/GymCRM_V2/README.md:1`
- `/Users/abc/projects/GymCRM_V2/docs/plans/2026-02-23-feat-gym-crm-admin-portal-core-prototype-execution-checklist-plan.md:65`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/resources/application.yml:6`
- `/Users/abc/projects/GymCRM_V2/backend/build.gradle:21`

### Related Work

- `/Users/abc/projects/GymCRM_V2/docs/plans/2026-02-23-refactor-backend-build-tool-gradle-standardization-plan.md`
