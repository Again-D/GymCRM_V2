# Phase 1.5 Gradle Standardization Work Log

날짜: 2026-02-23

## 목표

Phase 2 착수 전에 백엔드 빌드 표준을 Maven에서 Gradle(Groovy DSL)로 정렬한다.

## 결정사항

- Gradle DSL 스타일은 `build.gradle` / `settings.gradle` (Groovy DSL)로 고정
- Maven(`pom.xml`)은 전환 검증 전까지 임시 유지

## 완료 항목

- `backend/build.gradle` 생성 (Spring Boot 3.4.2, Java 21, Flyway/Postgres/Test parity)
- `backend/settings.gradle` 생성
- `backend/gradlew`, `backend/gradlew.bat`, `backend/gradle/wrapper/*` 추가
- `README.md` 백엔드 실행 명령을 Gradle 기준으로 정렬
- `docs/notes/local-run-phase1.md` 백엔드 실행 명령을 Gradle 기준으로 정렬
- `./gradlew tasks` 검증 성공 (Gradle 8.13)
- `./gradlew test --no-daemon` 검증 성공 (`test NO-SOURCE`)
- `./gradlew bootRun --no-daemon` 기동 확인 성공 (Spring Boot startup log 확인 후 종료)

## 환경 블로커

- 현재 환경에서 `gradle` CLI 미설치 (`gradle -v` 실패)
- 샌드박스 실행 시 `./gradlew`가 `~/.gradle` lock 파일 생성에서 실패 (`Operation not permitted`)
- 샌드박스 밖 검증 시에는 Gradle 실행 가능

## 실행 메모

- Wrapper 파일은 로컬 기존 프로젝트의 Gradle Wrapper 자산을 재사용해 추가했다.
- `GRADLE_USER_HOME=/Users/abc/projects/GymCRM_V2/.gradle-local`로 워크스페이스 내부 캐시를 사용해 샌드박스 lock-file 제약을 우회했다.
- `.gradle-local/`는 로컬 검증 캐시이므로 루트 `.gitignore`에 추가했다.

## 다음 작업

1. `backend/pom.xml` 제거 시점 확정 (Phase 2 직전 또는 첫 CI 확인 후)
2. DB 마이그레이션 실제 실행 검증(P1/P2 착수 조건) 진행
3. 프론트엔드 앱 기동 검증 및 Phase 1 미체크 항목 정리
