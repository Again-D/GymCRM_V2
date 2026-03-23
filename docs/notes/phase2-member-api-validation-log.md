# Phase 2 Member API Validation Log (P2-4)

날짜: 2026-02-23

## 2026-03-23 Refactor Revalidation

- 목적: `member` 모듈 패키지 재배치, DTO 분리, enum 전환 이후에도 Phase 2 API 계약이 유지되는지 재확인
- 브랜치: `codex/refactor-member-module-package-realignment`
- 확인 방식:
  - `./gradlew test --tests com.gymcrm.member.MemberServiceTest`
  - `./gradlew test --tests com.gymcrm.member.MemberSummaryApiIntegrationTest`
  - `./gradlew test --tests com.gymcrm.member.MemberSummaryQueryPerformanceIntegrationTest --stacktrace`

### 재확인 결과

- `POST /api/v1/members`
  - 소문자/공백 포함 enum 입력(`" active "`, `" female "`)도 기존 의도대로 성공
  - 응답은 canonical uppercase(`ACTIVE`, `FEMALE`) 유지
- `GET /api/v1/members`
  - `memberStatus` 필터가 기존과 동일하게 동작
  - invalid enum query param은 `400 VALIDATION_ERROR`
- `GET /api/v1/members/{memberId}`
  - 상세 응답은 유지됨
  - `phoneEncrypted`, `birthDateEncrypted`, `piiKeyVersion`는 외부 응답에 노출되지 않음
  - `PII_READ` audit log 기록 유지
- `PATCH /api/v1/members/{memberId}`
  - enum 기반 update 이후에도 응답 계약 유지
  - `memberStatus`, `gender`, `memo` 수정 반영 확인
- 저장소/성능
  - facade repository + QueryDSL 구조에서 member summary 성능 테스트 통과

### 비고

- 현행 `members.gender`, `members.member_status`는 DB CHECK 제약으로 canonical uppercase만 저장된다.
- 따라서 mixed-case legacy row를 실제 DB fixture로 재현하는 테스트는 현재 스키마와 충돌한다.
- 대신 Java enum factory는 `trim + uppercase`를 유지해 외부 입력/백필 데이터에 대한 방어 경로를 보존한다.

## 범위

- `POST /api/v1/members`
- `GET /api/v1/members`
- `GET /api/v1/members/{memberId}`
- `PATCH /api/v1/members/{memberId}`
- 중복 연락처 `CONFLICT` 응답

## 실행 환경

- Docker PostgreSQL (`gymcrm-postgres`, host port `5433`)
- Backend:
  - `SPRING_PROFILES_ACTIVE=dev`
  - `DB_URL=jdbc:postgresql://localhost:5433/gymcrm_dev`

## 수동 검증 결과

### 1) 회원 등록 (`POST /api/v1/members`)

- 결과: 성공 (`200`)
- 응답 확인:
  - `success=true`
  - `data.memberId` 생성됨
  - `data.centerId=1`
  - `data.memberStatus=ACTIVE`

### 2) 회원 목록 (`GET /api/v1/members?phone=...`)

- 결과: 성공 (`200`)
- 응답 확인:
  - 검색된 회원 1건 반환
  - 이름/연락처/상태/가입일 필드 반환

### 3) 회원 상세 (`GET /api/v1/members/{memberId}`)

- 결과: 성공 (`200`)
- 응답 확인:
  - 등록된 회원 상세 필드 일치

### 4) 회원 수정 (`PATCH /api/v1/members/{memberId}`)

- 결과: 성공 (`200`)
- 수정 확인:
  - `memberName`: 변경됨
  - `memberStatus`: `INACTIVE`로 변경
  - `consentMarketing`: `true`로 변경

### 5) 중복 연락처 등록 (`POST /api/v1/members`)

- 결과: 실패 (`409`)
- 응답 확인:
  - `error.code = CONFLICT`
  - `error.status = 409`
  - `error.detail = 동일 연락처 회원이 이미 존재합니다.`

## 비고

- Partial unique index (`center_id + phone`, `is_deleted = FALSE`)와 API `CONFLICT` 매핑이 의도대로 동작함
