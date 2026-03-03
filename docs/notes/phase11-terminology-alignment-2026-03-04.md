# Phase11 Terminology Alignment (2026-03-04)

Date: 2026-03-04  
Purpose: 요구사항/아키텍처/구현 문서 간 용어 불일치 제거

## 1) Canonical Terms

| Domain | Canonical Term | Notes |
|---|---|---|
| Tenant | `center` | DB/API/코드에서 `center_id`를 표준으로 사용 |
| Role prefix | `ROLE_*` | Spring Security role naming 표준 |
| Center admin | `ROLE_CENTER_ADMIN` | 현재 핵심 운영 역할 |
| Desk | `ROLE_DESK` | 현재 운영 역할 |
| Manager | `ROLE_CENTER_MANAGER` | Phase11 이후 확장 예정 |
| Trainer | `ROLE_TRAINER` | Phase11 이후 확장 예정 |
| Membership lifecycle | `ACTIVE/HOLDING/EXPIRED/REFUNDED` | 정책/테스트/화면 일치 필요 |
| Reservation lifecycle | `RESERVED/CANCELLED/COMPLETED/CHECKED_IN/NO_SHOW` | 정원(`current_count`) 규칙과 동기화 |

## 2) Mismatch Inventory

| Topic | Current State | Canonical Decision | Action |
|---|---|---|---|
| center vs gym | 문서 일부에서 gym/센터 혼용 | `center`로 통일 | Phase11-A 문서 정비 시 용어 치환 |
| 역할 체계 | 문서 장기안은 다중 역할, 구현은 admin/desk 중심 | 단기: admin/desk 유지, 중기: manager/trainer 도입 | 권한 매트릭스 문서 추가 |
| 출입 QR | 요구사항은 Dynamic QR 강제, 구현은 entry API 중심 | Dynamic QR은 ACC 확장 항목으로 분리 | FR-ACC-001 별도 Epic |
| 예약 대기 | 요구사항은 자동 전환 포함, 구현은 기본 예약 중심 | waitlist 정책/상태 전이 명시 필요 | RSV 확장 작업에 상태도 추가 |
| 메시지 발송 | 요구사항은 알림톡 중심 자동화, 구현 부재 | 이벤트+큐+이력 중심 baseline 도입 | CRM baseline 스프린트 투입 |

## 3) Role Matrix (Current -> Target)

| Capability | Current (Implemented) | Target (Phase11+) |
|---|---|---|
| 회원/회원권 처리 | CENTER_ADMIN, DESK | + CENTER_MANAGER(조회/승인), TRAINER(제한조회) |
| 상품 관리 | CENTER_ADMIN | + CENTER_MANAGER |
| 예약 운영 | CENTER_ADMIN, DESK | + TRAINER (자신의 스케줄/수업) |
| 출입 모니터링 | CENTER_ADMIN, DESK | + CENTER_MANAGER |
| 정산/리포트 | CENTER_ADMIN (예정) | + CENTER_MANAGER |
| CRM 캠페인 | CENTER_ADMIN (예정) | + CENTER_MANAGER |

## 4) Naming/Contract Rules

- API path는 `/api/v1/{module}` 형태 유지
- 모든 도메인 row는 `center_id` 스코프 필수
- 이벤트 메시지는 `event_id`, `trace_id`, `center_id`를 공통 필드로 유지
- 문서의 상태 필드는 `active/completed`만 사용하고, 계획/체크리스트/todo 동기화 규칙을 지킨다

## 5) Adoption Checklist

- [x] Phase11 plan에 canonical 용어(`center`, role model) 반영
- [x] FR 기준선 문서에 상태 정의(complete/partial/not started) 고정
- [ ] 권한 확장 매트릭스(API별 역할) 상세 문서 작성
- [ ] Dynamic QR 용어/보안 정책을 ACC 작업계획에 반영
- [ ] CRM 이벤트 명명 규칙(`MEMBERSHIP_EXPIRY_REMINDER` 등) 확정
