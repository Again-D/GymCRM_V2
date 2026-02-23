# Phase 2 Schema Bootstrap Decisions (P2-1 ~ P2-3)

날짜: 2026-02-23

## 범위

- `P2-1` 시스템/기본 엔티티 마이그레이션
- `P2-2` 회원 도메인 스키마
- `P2-3` 상품 도메인 스키마

## 결정사항

### 1) `users` / `roles` 최소 stub 생성 여부

- **결정: 보류 (미생성)**
- 이유:
  - 프로토타입은 no-auth + `ADMIN` 단일 역할 모드로 운영 (브레인스토밍 결정사항)
  - 현재 런타임 권한 검사는 `CurrentUserProvider` 추상화로 대체됨
  - Phase 2의 핵심 목표는 회원/상품 CRUD와 도메인 플로우 검증

후속 기준:
- 인증/RBAC를 실제 도입하는 시점(후속 Phase)에서 `users`, `roles`, `user_roles`를 함께 설계/생성

### 2) 기본 `center` 시드 전략

- **결정: 고정 1개 센터 시드 (Flyway migration)**
- 시드 값:
  - `center_id = 1`
  - `center_name = 'Prototype Center'`
- 이유:
  - 프로토타입은 단일 센터 운영 가정
  - `members`, `products` 생성 테스트를 바로 진행할 수 있는 기준 데이터 필요
  - API/UI 구현 시 `centerId = 1` 기본값 사용이 가능해짐

### 3) 회원 연락처 unique 전략

- **결정: `center_id + phone` unique (soft delete 제외 조건 포함)**
- 구현: partial unique index (`WHERE is_deleted = FALSE`)

### 4) 상품 모델 전략 (기간제/횟수제 공통 모델)

- **결정: 단일 `products` 테이블 + `product_type` 분기**
- `product_type = DURATION`
  - `validity_days` 사용
  - `total_count`는 `NULL`
- `product_type = COUNT`
  - `total_count` 사용
  - `validity_days`는 `NULL`
- 체크 제약조건으로 타입별 필드 조합을 강제
