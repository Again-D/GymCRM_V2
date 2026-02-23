---
title: refactor: Standardize Backend Build Tool to Gradle Before Phase 2
type: refactor
status: active
date: 2026-02-23
origin: docs/brainstorms/2026-02-23-gym-crm-product-brainstorm.md
---

# refactor: Standardize Backend Build Tool to Gradle Before Phase 2

## Overview

`Phase 2`(회원/상품 CRUD) 착수 전에 백엔드 빌드 도구를 현재 `Maven`에서 설계서 기준 `Gradle`로 표준화한다. 목표는 단순 변환이 아니라, 이후 도메인 구현과 CI/문서가 동일한 빌드 표준을 참조하도록 정렬하는 것이다.

이 계획은 아키텍처 설계서의 백엔드 스택/빌드 도구 기준(Gradle 8.x)을 따라가며 (`docs/02_시스템_아키텍처_설계서.md:67`, `docs/02_시스템_아키텍처_설계서.md:78`), 현재 Phase 1 프로토타입 골격에서 생긴 불일치(Maven 사용)를 해소한다 (`backend/pom.xml:1`).

상태 메모:
- 본 문서의 실행 항목은 `docs/plans/2026-02-23-feat-gym-crm-admin-portal-core-prototype-execution-checklist-plan.md`의 **Phase 1.5**로 통합 운영한다.
- 본 문서는 전환 범위/근거/수용 기준을 보존하는 참조 계획으로 유지한다.

## Problem Statement

현재 구현은 백엔드를 `Maven`으로 스캐폴딩했지만, 아키텍처 설계서는 `Gradle 8.x`를 표준으로 정의한다. 이 상태로 Phase 2 이후 구현을 계속 진행하면 다음 문제가 발생한다.

- 설계서/실제 구현 간 표준 불일치 지속
- 향후 CI/CD 스크립트 작성 시 빌드 명령 재변경 필요
- 팀 온보딩/문서/명령어 가이드 중복 관리
- 리뷰 기준에서 “의도된 프로토타입 축소”가 아닌 “도구 표준 이탈”로 계속 지적됨

## Proposed Solution

백엔드 빌드 도구를 **Phase 2 전에 일괄 전환**한다.

- `pom.xml` 기반 의존성 구성을 **Groovy DSL 기준** `build.gradle` + `settings.gradle`로 이전
- Gradle Wrapper 포함 (`gradlew`, `gradlew.bat`, `gradle/wrapper/*`)
- Spring Boot/Flyway/PostgreSQL/Test 의존성 parity 유지
- 실행/빌드 명령어를 문서 및 체크리스트에 반영
- 검증 완료 전까지 Maven 파일 제거 여부는 보수적으로 결정 (권장: 전환 검증 후 제거)

Gradle DSL 스타일 결정(사전 고정):

- **채택**: `build.gradle` / `settings.gradle` (Groovy DSL)
- **비채택**: `build.gradle.kts` / `settings.gradle.kts` (Kotlin DSL)
- **이유**:
  - Phase 2 착수 전 빠른 전환/문서 정렬이 우선
  - 팀 표준을 먼저 “단일 파일명/단일 명령”으로 고정하는 목적에 적합
  - 향후 Kotlin DSL 전환은 별도 리팩터링으로 분리 가능

## Scope

### In Scope

- `backend` 빌드 도구 표준화 (Maven → Gradle)
- 빌드/실행/테스트 명령어 문서 업데이트
- Phase 1 체크리스트/노트에서 백엔드 명령 정렬
- 기본 컴파일/앱 기동/Flyway 실행 확인(가능한 환경에서)

### Out of Scope

- Phase 2 도메인 구현(회원/상품 CRUD)
- API 응답 포맷 표준 재설계
- JWT/RBAC 도입
- 프론트엔드 빌드 체계 변경

## Technical Approach

### Dependency Parity Matrix (현재 Maven → 목표 Gradle)

현재 Maven 의존성(`backend/pom.xml`)을 Gradle로 1:1 대응한다.

- `spring-boot-starter-web`
- `spring-boot-starter-validation`
- `spring-boot-starter-actuator`
- `flyway-core`
- `postgresql` (runtime)
- `spring-boot-starter-test` (test)

추가 원칙:

- Java 21 유지
- Spring Boot 3.x 유지 (현재 3.4.2 기준)
- 프로파일/설정 파일(`application.yml`) 변경 최소화

### File Strategy

생성/변경 대상(예상):

- `backend/settings.gradle` (Groovy DSL)
- `backend/build.gradle` (Groovy DSL)
- `backend/gradle/wrapper/gradle-wrapper.properties`
- `backend/gradlew`
- `backend/gradlew.bat`
- `README.md` (백엔드 실행 명령)
- `docs/notes/local-run-phase1.md`
- `docs/plans/2026-02-23-feat-gym-crm-admin-portal-core-prototype-execution-checklist-plan.md` (P1 명령어/검증 문구)

보류/후속 결정:

- `backend/pom.xml` 삭제 여부
  - 권장: 전환 검증 완료 후 삭제
  - 대안: 임시 병행 유지(짧은 기간) 후 제거

### Implementation Phases

#### Phase A: Gradle Build Definition 작성

- Maven 의존성/플러그인 매핑
- Spring Boot + Dependency Management 플러그인 구성
- Java Toolchain 21 설정
- 테스트 태스크 기본 설정

완료 기준:
- `./gradlew tasks` 실행 가능

#### Phase B: Wrapper 및 실행 검증

- Gradle Wrapper 생성/커밋
- `./gradlew build` 또는 `./gradlew test` 최소 검증
- `./gradlew bootRun` 실행 경로 확인

완료 기준:
- 백엔드 앱 기동 가능
- 기존 `application.yml` + Flyway 설정이 그대로 동작

#### Phase C: 문서/체크리스트 정렬

- `README.md` 백엔드 명령어 `mvn` → `./gradlew`
- `docs/notes/local-run-phase1.md` 명령어/전제 업데이트
- Phase 1 체크리스트 문구(실행/검증 명령 기준) 정렬
- 필요 시 기준 계획 문서에 “빌드 도구 표준 확정 완료” 반영

완료 기준:
- 문서에서 Maven 명령이 남아있지 않음(의도된 예외 제외)

#### Phase D: Maven 제거 또는 보류 결정

- 전환 검증 결과에 따라 `pom.xml` 제거 여부 확정
- 제거 시 관련 문서/스크립트 참조 정리

완료 기준:
- 저장소에 빌드 표준이 단일화되거나, 병행 유지 사유가 문서화됨

## Risks & Mitigation

### Risk 1: 네트워크/환경 제한으로 Gradle 검증 실패

- 영향: 실제 전환 성공 여부를 이 환경에서 확인 못할 수 있음
- 대응:
  - 계획상 검증 단계를 명시하고, 가능 환경에서 재검증
  - 최소한 파일/의존성 parity와 명령어 정합성 확보

### Risk 2: Maven→Gradle 전환 중 의존성 누락

- 영향: 런타임/테스트 실패
- 대응:
  - 의존성 parity 체크리스트 운영
  - `web/validation/actuator/flyway/postgres/test` 6개 축 확인

### Risk 3: 문서 갱신 누락으로 작업자 혼선

- 영향: 팀이 `mvn`/`gradle` 명령 혼용
- 대응:
  - README + local-run + execution checklist 동시 갱신을 수용 기준에 포함

## Acceptance Criteria

### Functional

- [x] 백엔드 빌드 표준이 Gradle(Groovy DSL)로 정의된다 (`build.gradle`, `settings.gradle`, wrapper 포함).
- [x] Maven 의존성 기능 범위와 Gradle 의존성 기능 범위가 동등하다.
- [x] `./gradlew` 기반으로 최소 빌드/실행 경로가 정의된다.
- [x] Phase 2 착수 문서에서 백엔드 빌드 명령이 Gradle 기준으로 정렬된다.

### Non-Functional

- [x] Java 21 / Spring Boot 3.x / Flyway / PostgreSQL 방향성이 유지된다.
- [x] 기존 Phase 1 no-auth 가드 및 설정 구조에 영향이 없다.
- [x] 문서 기준 빌드 도구 표준(Gradle 8.x)과 구현이 일치한다.

### Quality Gates

- [x] `README.md`와 `docs/notes/local-run-phase1.md`의 백엔드 명령이 일관된다.
- [x] 전환 검증 결과(성공/환경제약)가 문서 또는 작업 로그에 기록된다.
- [x] `pom.xml` 유지/삭제 결정이 명확히 문서화된다.

## Execution Checklist (for `/workflows-work`)

### Task 1. 현재 Maven 설정 고정점 파악

- [x] `backend/pom.xml` 의존성/플러그인 목록 추출
- [x] Java 버전/Boot 버전 기록

### Task 2. Gradle 파일 생성

- [x] `settings.gradle` 생성 (Groovy DSL)
- [x] `build.gradle` 생성 (Groovy DSL)
- [x] Spring Boot/Dependency Management 플러그인 설정
- [x] 의존성 parity 반영
- [x] test/bootRun 기본 태스크 확인

### Task 3. Wrapper 준비

- [x] Gradle Wrapper 추가
- [x] 실행 권한/스크립트 확인 (`gradlew`)

### Task 4. 로컬 검증

- [x] `./gradlew tasks` 확인
- [x] `./gradlew test` 또는 `build` 확인
- [x] `./gradlew bootRun` 확인 (가능 환경)

### Task 5. 문서 정렬

- [x] `README.md` 수정
- [x] `docs/notes/local-run-phase1.md` 수정
- [x] Phase1 체크리스트 문구 수정

### Task 6. Maven 정리 결정

- [x] `pom.xml` 제거 or 유지 결정
- [x] 결정 사유 기록

## Success Metrics

- Phase 2 시작 전 빌드 표준 관련 추가 논의 없이 단일 명령 체계 사용 가능
- 리뷰에서 “Maven vs Gradle 불일치” 지적 제거
- 신규 작업자가 백엔드 실행 명령을 문서만 보고 1회에 성공 가능

## Sources & References

### Origin / Related Planning

- 브레인스토밍: `docs/brainstorms/2026-02-23-gym-crm-product-brainstorm.md`
- 기준 계획: `docs/plans/2026-02-23-feat-gym-crm-admin-portal-core-prototype-plan.md`
- 실행 체크리스트: `docs/plans/2026-02-23-feat-gym-crm-admin-portal-core-prototype-execution-checklist-plan.md`

### Internal References

- 아키텍처 설계서 백엔드 스택/빌드 도구: `docs/02_시스템_아키텍처_설계서.md:67`, `docs/02_시스템_아키텍처_설계서.md:78`
- 현재 Maven 설정: `backend/pom.xml:1`
- 실행 가이드(현재 Maven 명령): `README.md:10`, `docs/notes/local-run-phase1.md:12`
- 통합 대상 실행 체크리스트: `docs/plans/2026-02-23-feat-gym-crm-admin-portal-core-prototype-execution-checklist-plan.md`
