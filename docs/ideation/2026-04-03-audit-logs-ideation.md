---
date: 2026-04-03
topic: audit-logs
focus: 운영자용 감사로그 조회 화면
---

# Ideation: 운영자용 감사로그 조회 화면

## Codebase Context
- **백엔드**: `com.gymcrm.audit` 내에 `AuditLogController`, `AuditLogService`, `AuditLogRepository`가 구현되어 있음. `GET /api/v1/audit-logs` API 존재. 단, `@Pattern` 제약조건에 최신 커스텀 이벤트(MEMBERSHIP_HOLD 등)가 누락되어 확장/수정 필요.
- **프론트엔드**: API 통신을 위한 기반이 갖추어져 있으며, `SettlementsPage`와 유사한 Data Table 위주의 페이지 구조를 사용할 수 있음. 기능 개발 시 `App.tsx` 및 `routes.ts`에 라우팅 추가가 필요함.

## Ranked Ideas

### 1. 시스템 전체 통합 감사 대시보드 (Global Audit Explorer) *(Selected)*
**Description:** "운영 관리" 하위 메뉴로 `/audit-logs` 페이지를 신설하여 전체 이벤트 타입을 통합 리스트로 노출하고, 모달을 통해 속성(JSON)을 상세 조회하며, 다양한 필터링(기간, 이벤트 유형 등) 기능을 제공합니다.
**Rationale:** 운영 관리자가 시스템 내 모든 민감 변경 이력을 한 곳에서 통합 추적/관제 가능.
**Downsides:** 로그 데이터 양이 방대할 경우 성능 최적화가 필요할 수 있음.
**Confidence:** 95%
**Complexity:** Medium
**Status:** Explored

### 2. 맥락 중심의 '이력 탭' 확장 (Contextual Audit View)
**Description:** 회원이나 상품 모달 내부에 자신이 연관된 이벤트만 필터링해서 보여주는 탭 추가.
**Rationale:** 페이지 스위칭 없이 기존 작업 맥락 내에서 바로 이력 확인 가능.
**Downsides:** 포괄적인 시스템 감사에는 적합하지 않음.
**Confidence:** 80%
**Complexity:** Low-Medium
**Status:** Unexplored

### 3. 감사로그 보존 배치 모니터링 (Retention Job Dashboard)
**Description:** `AuditRetentionJobRun` 테이블 데이터를 활용해 로그 삭제 배치의 성공 여부 및 통계를 시각화.
**Rationale:** 정책(GDPR 등) 준수 관점 모니터링.
**Downsides:** 일반 운영자보다는 최고 관리자/개발자 대상의 기능임.
**Confidence:** 70%
**Complexity:** Low
**Status:** Unexplored

## Session Log
- 2026-04-03: Initial ideation — 3 ideas generated, Idea 1 (Global Audit Explorer) selected by user.
