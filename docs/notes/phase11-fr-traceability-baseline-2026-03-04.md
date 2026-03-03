# Phase11 FR Traceability Baseline (2026-03-04)

Date: 2026-03-04  
Scope: `docs/01_요구사항_분석서.md`의 Must(필수) FR 45건  
Purpose: Phase11 확장 전 기준선 고정 및 2개 스프린트 구현 우선순위 입력

## 1) Status Definition

- `Complete`: 백엔드 API + 프론트 작업면(또는 운영 화면) + 핵심 정책이 구현됨
- `Partial`: 일부 API/화면/정책만 구현됨(핵심 경로는 있으나 요구사항 전체 미충족)
- `Not Started`: 구현 근거 없음

## 2) Must FR Coverage Snapshot

| Module | Must FR | Complete | Partial | Not Started | Coverage (Complete) |
|---|---:|---:|---:|---:|---:|
| MBR | 8 | 4 | 2 | 2 | 50.0% |
| PRD | 6 | 5 | 1 | 0 | 83.3% |
| RSV | 9 | 3 | 2 | 4 | 33.3% |
| ACC | 5 | 3 | 0 | 2 | 60.0% |
| LKR | 5 | 0 | 0 | 5 | 0.0% |
| SAL | 6 | 0 | 0 | 6 | 0.0% |
| CRM | 6 | 0 | 0 | 6 | 0.0% |
| **Total** | **45** | **15** | **5** | **25** | **33.3%** |

## 3) Module-to-Implementation Mapping

## MBR (회원관리)

| FR ID | Requirement | Status | Evidence |
|---|---|---|---|
| FR-MBR-001 | 신규 회원 등록 | Complete | `backend/src/main/java/com/gymcrm/member/MemberController.java` (`POST /api/v1/members`) |
| FR-MBR-002 | 회원 정보 조회/수정(+상세 이력) | Partial | `GET/PATCH /api/v1/members/*`는 존재. 예약/출입/회원권 이력 통합 응답은 미흡 |
| FR-MBR-003 | 회원 탈퇴 처리 | Not Started | 탈퇴 전용 API/정책 부재 |
| FR-MBR-004 | 회원권 구매 등록 | Complete | `backend/src/main/java/com/gymcrm/membership/MembershipPurchaseController.java` |
| FR-MBR-005 | 회원권 양도 처리 | Not Started | 양도 API/정책 부재 |
| FR-MBR-006 | 회원권 홀딩 처리 | Complete | `MembershipHoldController` (`/hold`, `/resume`) + 정합성 보강 이력 |
| FR-MBR-007 | 회원권 환불 처리 | Complete | `MembershipRefundController` (`/refund/preview`, `/refund`) |
| FR-MBR-008 | 회원권 연장 | Partial | 홀딩 해제로 인한 만료일 재계산은 있으나 별도 연장 기능/API 없음 |

## PRD (상품관리)

| FR ID | Requirement | Status | Evidence |
|---|---|---|---|
| FR-PRD-001 | 상품 등록 | Complete | `ProductController` (`POST /api/v1/products`) |
| FR-PRD-002 | 상품 수정/비활성화 | Complete | `PATCH /api/v1/products/{id}`, `PATCH /status` |
| FR-PRD-003 | 기간제 상품 설정 | Complete | `productType=DURATION`, `validityDays` |
| FR-PRD-004 | 횟수제 상품 설정 | Complete | `productType=COUNT`, `totalCount` |
| FR-PRD-005 | GX 수업 상품 설정(수업 정원 연계) | Partial | 상품 카테고리 `GX` 지원. 수업 정원 연계 규칙은 RSV 쪽 보완 필요 |
| FR-PRD-008 | 상품 목록 조회 | Complete | `GET /api/v1/products` (category/status filter) |

## RSV (예약)

| FR ID | Requirement | Status | Evidence |
|---|---|---|---|
| FR-RSV-001 | 트레이너 스케줄 설정 | Not Started | 스케줄 생성/수정 API 없음(조회만 존재) |
| FR-RSV-002 | GX 수업 스케줄 등록 | Not Started | GX 스케줄 등록 API 없음 |
| FR-RSV-003 | PT 예약 신청 | Partial | `POST /api/v1/reservations` 존재, 정책 세부(차감 시점 선택) 고정 미흡 |
| FR-RSV-004 | GX 예약 신청(+대기) | Partial | 기본 예약 생성은 가능, 대기열 전환 정책/구현 부재 |
| FR-RSV-005 | 예약 취소 | Complete | `POST /api/v1/reservations/{id}/cancel` |
| FR-RSV-006 | 대기 자동 전환 | Not Started | waitlist 자동 승격 구현 부재 |
| FR-RSV-007 | 트레이너 예약 현황 조회 | Complete | `GET /api/v1/reservations/schedules` |
| FR-RSV-008 | 수업 출석 처리/차감 | Complete | `check-in`, `complete`, `no-show` 경로 |
| FR-RSV-009 | 예약 알림 발송 | Not Started | 알림 워커/템플릿/발송 경로 부재 |

## ACC (출입통제)

| FR ID | Requirement | Status | Evidence |
|---|---|---|---|
| FR-ACC-001 | 회원 Dynamic QR 발급 | Not Started | QR 발급/갱신 모델/API 부재 |
| FR-ACC-002 | QR/바코드 출입 인증 | Complete | `POST /api/v1/access/entry`, `/exit` |
| FR-ACC-003 | 출입 이력 기록 | Complete | `GET /api/v1/access/events` + access event persistence |
| FR-ACC-004 | 출입 현황 모니터링 | Complete | `GET /api/v1/access/presence` |
| FR-ACC-005 | 비정상 출입 알림 | Not Started | deny 이벤트 기록은 있으나 알림 발송 자동화 부재 |

## LKR (라커관리)

| FR ID | Requirement | Status | Evidence |
|---|---|---|---|
| FR-LKR-001 | 라커 현황 조회 | Not Started | locker 도메인/테이블/API 부재 |
| FR-LKR-002 | 라커 배정 | Not Started | 동상 |
| FR-LKR-003 | 라커 반납 처리 | Not Started | 동상 |
| FR-LKR-004 | 라커 만료 관리 | Not Started | 동상 |
| FR-LKR-005 | 키 분실 처리 | Not Started | 동상 |

## SAL (매출/정산)

| FR ID | Requirement | Status | Evidence |
|---|---|---|---|
| FR-SAL-001 | 매출 대시보드 | Not Started | sales/report 도메인/API 부재 |
| FR-SAL-002 | 기간별 매출 리포트 | Not Started | 동상 |
| FR-SAL-003 | 결제 수단별 매출 조회 | Not Started | 동상 |
| FR-SAL-004 | 환불/취소 내역 조회 | Not Started | 환불 데이터는 존재하나 집계 API/리포트 부재 |
| FR-SAL-005 | 트레이너 수업 횟수 집계 | Not Started | 월간 집계 리포트 부재 |
| FR-SAL-006 | 트레이너 급여 정산 | Not Started | 정산 계산/출력 부재 |

## CRM (메시지)

| FR ID | Requirement | Status | Evidence |
|---|---|---|---|
| FR-CRM-001 | 만료 임박 자동 알림 | Not Started | crm/message 도메인/API/스케줄러 부재 |
| FR-CRM-002 | 생일 축하 메시지 | Not Started | 동상 |
| FR-CRM-003 | 이벤트 안내 메시지 | Not Started | 동상 |
| FR-CRM-004 | 메시지 템플릿 관리 | Not Started | 동상 |
| FR-CRM-005 | 발송 이력 조회 | Not Started | 동상 |
| FR-CRM-006 | 수신 거부 관리 | Not Started | 동상 |

## 4) Baseline Decisions for Phase11

- Phase11-A 기준선(2026-03-04)에서 Complete 15/45를 출발점으로 삼는다.
- 다음 2개 스프린트는 LKR/SAL/CRM 착수와 RSV/ACC 미완 기능 보강을 우선한다.
- 각 PR은 본 문서의 FR ID를 직접 참조해 진행률을 업데이트한다.

## 5) Update Rule

- 업데이트 단위: PR merge 단위
- 변경 규칙:
  - 구현 완료 시 `Partial -> Complete`, `Not Started -> Partial/Complete`
  - 근거 파일 경로를 반드시 추가
- 주간 점검 시 모듈별 Coverage를 재계산한다.
