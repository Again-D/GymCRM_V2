# Phase 2 Member API Validation Log (P2-4)

날짜: 2026-02-23

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
