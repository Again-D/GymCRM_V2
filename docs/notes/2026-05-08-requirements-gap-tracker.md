---
title: GymCRM_V2 Requirements Gap Tracker
type: note
status: draft
date: 2026-05-08
source: docs/01_요구사항_분석서.md
---

# GymCRM_V2 Requirements Gap Tracker

> [!NOTE]
> 작성 기준: 2026-05-08
> 목적: `docs/01_요구사항_분석서.md`와 현재 구현을 비교해 남은 기능/보안 격차를 우선순위별로 추적한다.
> 범위: 현재 문서에서는 "미구현" 또는 "부분 구현" 항목만 관리한다. 이미 완료된 항목은 반복 기재하지 않는다.

## Status Legend

| 상태 | 의미 |
|---|---|
| `미구현` | 코드/화면/정책 모두 아직 없는 상태 |
| `부분 구현` | 일부 기능은 있으나 요구사항 수준까지 닫히지 않은 상태 |
| `인프라 확인 필요` | 애플리케이션 코드만으로는 충족 여부를 확정할 수 없는 상태 |

## Must Have

| ID | 구분 | 현재 상태 | 남은 갭 | 추적 근거 |
|---|---|---|---|---|
| FR-MBR-001 | 회원 | 부분 구현 | 회원 등록 시 사진, 비상연락처 등 요구 입력 항목을 저장/조회 경로까지 일치시켜야 한다. | `docs/01_요구사항_분석서.md`, `backend/src/main/java/com/gymcrm/member/dto/request/MemberCreateRequest.java` |
| FR-MBR-003 | 회원 | 완료 | `POST /api/v1/members/{memberId}/withdraw`가 잔여 회원권 조회, `HOLDING` 재개 후 환불, 최종 `WITHDRAWN` 전환, `withdrawnAt` 기록, 성공 감사 로그까지 포함하는 원자적 워크플로우로 구현됐다. 응답은 처리 요약(`memberId`, `withdrawn`, `refundedMembershipCount`, `resumedHoldingCount`, `refundAmount`)을 반환한다. | `docs/01_요구사항_분석서.md`, `backend/src/main/java/com/gymcrm/member/service/MemberWithdrawalService.java`, `backend/src/main/java/com/gymcrm/member/service/MemberService.java`, `backend/src/main/java/com/gymcrm/member/controller/MemberController.java` |
| FR-RSV-004/005/006/009 | 예약 | 부분 구현 | GX 대기열, 자동 전환, 취소 정책, 예약 알림, 차감 시점 선택을 요구사항 수준으로 정리해야 한다. | `docs/01_요구사항_분석서.md`, `backend/src/main/java/com/gymcrm/reservation/service/ReservationService.java` |
| FR-ACC-001 | 출입 | 부분 구현 | 회원이 모바일 웹에서 자기 QR을 직접 확인하고 Dynamic QR로 주기 갱신되는 흐름을 완성해야 한다. | `docs/01_요구사항_분석서.md`, `backend/src/main/java/com/gymcrm/access/QrCodeService.java`, `frontend/src/app/routes.ts` |
| FR-LKR-001 | 라커 | 미구현 | 라커 시각적 맵/UI가 없다. | `docs/01_요구사항_분석서.md`, `backend/src/main/java/com/gymcrm/locker/LockerService.java` |
| FR-LKR-004 | 라커 | 미구현 | 만료 자동 안내 및 자동 반납 처리가 없다. | `docs/01_요구사항_분석서.md`, `backend/src/main/java/com/gymcrm/locker/LockerService.java` |
| FR-LKR-005 | 라커 | 미구현 | 키 분실 처리 플로우가 없다. | `docs/01_요구사항_분석서.md`, `backend/src/main/java/com/gymcrm/locker/LockerService.java` |
| FR-CRM-004 | CRM | 완료 | CRM 템플릿 목록/상세에 심사 상태, 운영 상태, 발송 가능 여부가 노출된다. | `docs/01_요구사항_분석서.md`, `backend/src/main/java/com/gymcrm/crm/controller/CrmMessageTemplateController.java`, `backend/src/main/java/com/gymcrm/crm/service/CrmMessageTemplateService.java`, `frontend/src/pages/crm/CrmPage.tsx` |
| FR-CRM-006 | CRM | 부분 구현 | 알림 실패 시 SMS 폴백 경로를 요구사항 수준으로 고정해야 한다. | `docs/01_요구사항_분석서.md`, `backend/src/main/java/com/gymcrm/crm/service/CrmMessageService.java` |
| NFR-012 | 보안 | 인프라 확인 필요 | `docs/ops/tls-enforcement.md` 정책 문서 완료. 실제 배포 계층(Nginx/ALB) 설정은 인프라 확인 필요. | `docs/ops/tls-enforcement.md` |
| NFR-013 | 보안 | 완료 | `passwordChangedAt` 필드 추가(V44), 90일 변경 권고 soft 정책 구현, `docs/ops/password-policy.md` 작성. | `docs/ops/password-policy.md`, `backend/src/main/java/com/gymcrm/common/auth/service/AuthService.java` |
| NFR-015 | 보안 | 완료 | `AuditLogRetentionScheduler` 배치 + `AuditLogRetentionSchedulerActorGuard` 구현 완료. `app.audit.retention.enabled` opt-in으로 배포 시 활성화. | `backend/src/main/java/com/gymcrm/audit/AuditLogRetentionScheduler.java` |
| NFR-016 | 보안 | 완료 | `MemberPiiDestructionScheduler` 배치 + `MemberPiiDestructionSchedulerActorGuard` 구현 완료. `app.member.pii-destruction.enabled` opt-in, 5년 보존 후 PII 파기. | `backend/src/main/java/com/gymcrm/member/service/MemberPiiDestructionScheduler.java` |

## Should Have

| ID | 구분 | 현재 상태 | 남은 갭 | 추적 근거 |
|---|---|---|---|---|
| FR-PRD-006 | 상품 | 미구현 | PT 트레이너 연결 상품 정책이 없다. | `docs/01_요구사항_분석서.md`, `backend/src/main/java/com/gymcrm/product/service/ProductService.java` |
| FR-PRD-007 | 상품 | 미구현 | 상품 할인/프로모션 모델이 없다. | `docs/01_요구사항_분석서.md`, `backend/src/main/java/com/gymcrm/product/service/ProductService.java` |
| FR-LKR-006 | 라커 | 부분 구현 | 구역/등급 기반 요금 및 운영 정책이 부족하다. | `docs/01_요구사항_분석서.md`, `backend/src/main/java/com/gymcrm/locker/LockerService.java` |
| FR-SAL-007 | 정산 | 미구현 | 미수금 관리와 후불/분할납부 추적이 없다. | `docs/01_요구사항_분석서.md`, `backend/src/main/java/com/gymcrm/settlement/controller/SalesDashboardController.java` |
| FR-CRM-007 | CRM | 미구현 | 장기 미방문 대상 발송 운영이 없다. | `docs/01_요구사항_분석서.md`, `frontend/src/pages/crm/CrmPage.tsx` |
| FR-CRM-008 | CRM | 미구현 | 예약 발송 운영 화면/API가 부족하다. | `docs/01_요구사항_분석서.md`, `frontend/src/pages/crm/CrmPage.tsx` |
| FR-MBR-009 | 회원 | 미구현 | 회원 사진 업로드/저장 경로가 없다. | `docs/01_요구사항_분석서.md`, `backend/src/main/java/com/gymcrm/member/dto/request/MemberCreateRequest.java` |

## Future

| ID | 구분 | 현재 상태 | 남은 갭 | 추적 근거 |
|---|---|---|---|---|
| FR-SAL-008 | 정산 | 향후 | 일일 마감 정산은 후속 단계로 미루는 것이 적절하다. | `docs/01_요구사항_분석서.md` |
| FR-ACC-006 | 출입 | 미구현 | 게이트 수동 제어가 없다. | `docs/01_요구사항_분석서.md` |
| FR-ACC-007 | 출입 | 미구현 | 운영 시간 제한 정책이 없다. | `docs/01_요구사항_분석서.md` |
| NFR-031 | 확장성 | 설계 단계 | 다중 지점 지원을 위한 멀티 테넌시 구조가 아직 후속 과제다. | `docs/01_요구사항_분석서.md` |

## Notes

- `NFR-010` 인증 및 인가, `NFR-011` 개인정보 암호화, `NFR-014` QR 코드 보안, `FR-ACC-005` 비정상 출입 알림은 현재 구현이 확인되어 본 추적 문서에서 제외했다.
- 보안 항목은 코드 구현만으로 확정할 수 없는 경우가 있어, `NFR-012`는 배포/프록시 설정까지 함께 확인해야 한다.
- 감사 로그와 개인정보 파기 항목은 운영 정책과 스케줄러가 같이 있어야 하므로, 기능 구현과 운영 검증을 한 묶음으로 관리하는 것이 좋다.

## Sprint Plan

### Sprint 1: 보안 기준선 + 법적 리스크 차단

**목표**
- 릴리스 전에 반드시 막아야 하는 보안/컴플라이언스 빈칸을 먼저 닫는다.

**실행 플랜**
- [2026-05-08-001-feat-sprint1-security-compliance-execution-plan.md](/Users/abc/projects/GymCRM_V2/docs/plans/2026-05-08-001-feat-sprint1-security-compliance-execution-plan.md)

**포함 항목**
- ✅ `NFR-012` HTTPS/TLS 1.2 이상 적용 여부 확정 → `docs/ops/tls-enforcement.md` (인프라 배포 확인 필요)
- ✅ `NFR-013` 비밀번호 정책 정리, 90일 변경 권고 구현 → `docs/ops/password-policy.md`
- ✅ `NFR-015` 감사 로그 1년 보존 자동화 → `AuditLogRetentionScheduler`
- ✅ `FR-MBR-003` 회원 탈퇴 플로우 보강 → `POST /api/v1/members/{memberId}/withdraw` (잔여 회원권 조회, 홀딩 해제 후 환불, 최종 탈퇴, 감사 로그까지 포함)
- ✅ `NFR-016` 탈퇴 회원 개인정보 5년 후 파기 정책 정리 → `MemberPiiDestructionScheduler`

**완료 기준**
- 보안 정책이 코드 또는 인프라 설정으로 명시된다.
- 탈퇴/보존/파기 흐름이 운영 관점에서 설명 가능하다.
- 감사 로그 보존이 실행 가능한 절차로 남는다.

**진입 기준**
- HTTPS/TLS 적용 위치가 애플리케이션 또는 배포 계층 중 어디인지 확정된다.
- 탈퇴 후 보존/파기 정책의 책임 범위가 정리된다.

**Sprint 1 미해결 항목 (후속 스프린트 이관)**

없음. 기존 `FR-MBR-003` 잔여 회원권 연계 갭은 refund-inclusive withdrawal workflow 구현으로 해소되었다.

### Sprint 2: 핵심 운영 흐름 정리

**목표**
- 데스크와 현장 운영에서 가장 자주 쓰는 흐름을 안정화한다.

**실행 플랜**
- [2026-05-08-002-feat-sprint2-core-ops-flow-plan.md](/Users/abc/projects/GymCRM_V2/docs/plans/2026-05-08-002-feat-sprint2-core-ops-flow-plan.md)
- [2026-05-08-005-feat-sprint2-core-ops-flow-execution-plan.md](/Users/abc/projects/GymCRM_V2/docs/plans/2026-05-08-005-feat-sprint2-core-ops-flow-execution-plan.md)

**포함 항목**
- `FR-ACC-001` 회원 모바일 QR 표시 + Dynamic QR 갱신
- `FR-ACC-005` 비정상 출입 알림 운영 정리
- `FR-RSV-004/005/006/009` GX 대기열, 자동 전환, 취소 정책, 차감 시점, 알림 정책
- `FR-MBR-001` 회원 등록 입력 항목 보강

**범위 메모**
- Sprint 2는 `FR-MBR-001` 회원 등록 완성도만 다루며, `FR-MBR-009` 회원 사진 업로드/관리 전체 플로우는 Sprint 3 소유로 둔다.
- 회원 QR은 전체 회원 포털이 아니라 `signed link / one-time token` 계열의 좁은 bootstrap 계약을 전제로 한다.
- 예약 정책값은 프론트 상수가 아니라 backend-owned center 설정 또는 backend default 값으로 해석한다.

**완료 기준**
- 출입/예약/회원등록의 핵심 정책이 문서와 구현에서 일치한다.
- 운영자가 차감, 거부, 알림 시점을 일관되게 설명할 수 있다.
- 회원 QR 흐름이 운영자 전용이 아니라 회원 플로우로도 정리된다.

**진입 기준**
- Sprint 1의 보안/개인정보 정책이 먼저 확정된다.
- 예약 차감 시점과 알림 정책의 우선 기준이 합의된다.

### Sprint 3: 운영 고도화 + 선택 기능

**목표**
- 있어도 좋은 부가 기능과 운영 고도화를 후순위로 정리한다.

**실행 플랜**
- [2026-05-08-003-feat-sprint3-ops-growth-plan.md](/Users/abc/projects/GymCRM_V2/docs/plans/2026-05-08-003-feat-sprint3-ops-growth-plan.md)
- [2026-05-08-004-feat-sprint3-ops-growth-execution-plan.md](/Users/abc/projects/GymCRM_V2/docs/plans/2026-05-08-004-feat-sprint3-ops-growth-execution-plan.md)

**포함 항목**
- `FR-CRM-004` 템플릿 심사 상태/운영 상태
- `FR-CRM-006` SMS 폴백
- `FR-CRM-007` 장기 미방문 발송
- `FR-CRM-008` 예약 발송
- `FR-PRD-006` PT 트레이너 연결 상품
- `FR-PRD-007` 상품 할인/프로모션
- `FR-LKR-006` 라커 구역/등급 요금
- `FR-SAL-007` 미수금 관리
- `FR-MBR-009` 회원 사진

**범위 메모**
- CRM 발송은 `sendable` 상태 템플릿만 사용 가능하며, rejected/inactive 템플릿은 거버넌스/이력용으로만 남긴다.
- `FR-SAL-007`의 reminder hook은 별도 정산 알림 엔진이 아니라 기존 CRM 큐를 재사용하는 operator action 또는 eligibility marker로 제한한다.
- `FR-MBR-009` 구현 시 업로드 가드레일(MIME, 파일 크기, 교체 정책, 접근 권한)을 함께 정의한다.

**완료 기준**
- CRM/상품/라커/정산의 부가 운영 기능이 정책 단위로 정리된다.
- 핵심 운영 기능과 충돌하지 않는다.
- 후속 확장 항목은 Future 백로그로 분리된다.

**진입 기준**
- Sprint 1, 2의 릴리스 블로커가 모두 정리된다.
- 운영팀이 부가 기능의 우선순위를 재확인한다.

### Future

**보류 항목**
- `FR-SAL-008` 일일 마감 정산
- `FR-ACC-006` 게이트 수동 제어
- `FR-ACC-007` 운영 시간 제한
- `NFR-031` 다중 지점 지원

**운영 원칙**
- 현재 단일 지점 운영 MVP 기준에서는 후속 과제로 유지한다.
- 실제 사업 확장 시점에 별도 계획 문서로 승격한다.
