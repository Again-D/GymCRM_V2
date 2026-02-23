# Phase 2 Product API Validation Log (P2-5)

날짜: 2026-02-23

## 범위

- `POST /api/v1/products`
- `GET /api/v1/products`
- `GET /api/v1/products/{productId}`
- `PATCH /api/v1/products/{productId}`
- `PATCH /api/v1/products/{productId}/status`
- 중복 상품명 `CONFLICT` 응답

## 실행 환경

- Docker PostgreSQL (`gymcrm-postgres`, host port `5433`)
- Backend:
  - `SPRING_PROFILES_ACTIVE=dev`
  - `DB_URL=jdbc:postgresql://localhost:5433/gymcrm_dev`
  - `PORT=8081` (`8080` 점유로 대체 포트 사용)

## 수동 검증 결과

### 1) 기간제 상품 등록 (`DURATION`)

- 결과: 성공 (`200`)
- 확인:
  - `productType=DURATION`
  - `validityDays=30`
  - `totalCount=null`
  - `allowHold/maxHoldDays/maxHoldCount` 저장 확인

### 2) 횟수제 상품 등록 (`COUNT`)

- 결과: 성공 (`200`)
- 확인:
  - `productType=COUNT`
  - `totalCount=10`
  - `validityDays=null`

### 3) 상품 목록 조회 (`GET /api/v1/products?status=ACTIVE`)

- 결과: 성공 (`200`)
- 확인:
  - 등록된 기간제/횟수제 상품 2종 조회
  - 목록에 카테고리/타입/가격/상태 표시

### 4) 상품 상세 조회 (`GET /api/v1/products/{productId}`)

- 결과: 성공 (`200`)
- 확인:
  - 등록값과 동일한 상세 필드 반환

### 5) 상품 수정 (`PATCH /api/v1/products/{productId}`)

- 결과: 성공 (`200`)
- 확인:
  - `priceAmount` 변경
  - `maxHoldDays` 변경
  - `description` 저장

### 6) 상품 상태 변경 (`PATCH /api/v1/products/{productId}/status`)

- 결과: 성공 (`200`)
- 확인:
  - `productStatus=INACTIVE`로 변경

### 7) 중복 상품명 등록 (`POST /api/v1/products`)

- 결과: 실패 (`409`)
- 확인:
  - `error.code = CONFLICT`
  - `error.status = 409`
  - `error.detail = 동일 상품명이 이미 존재합니다.`

## 비고

- partial unique index (`center_id + product_name`, `is_deleted = FALSE`)와 API `CONFLICT` 매핑이 의도대로 동작함
- 포트 `8080` 점유 상태라 검증 시 `PORT=8081` 사용
