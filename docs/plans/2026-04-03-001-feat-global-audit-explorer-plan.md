# 시스템 전체 통합 감사 대시보드 (Global Audit Explorer) 설계서

## 개요
운영자가 시스템 내 민감한 변경 사항(회원권 홀딩, 계정 상태 변경, 환불, 등)을 한 곳에서 원클릭으로 통합 추적하고 모니터링할 수 있는 UI 컴포넌트를 구축합니다. 모든 로그를 최신순으로 가져와서 출력하는 기본 뷰를 생성하며, 세부 조회와 이벤트 별 필터 조회를 허용합니다. 

## 연관 요구사항
- 기획서: `docs/brainstorms/2026-04-03-audit-logs-requirements.md`

## 구현 파트 상세 내역

### [Phase 1: 백엔드 이벤트 제약조건 완화]
- **Goal:** `AuditLogController`의 이벤트 타입 파라미터가 모든 커스텀 감사 이벤트(MEMBERSHIP_HOLD 등)를 허용하도록 업데이트합니다.
- **Files:**
  - `backend/src/main/java/com/gymcrm/audit/AuditLogController.java`
- **Approach:** `@Pattern`의 정규식 부분을 삭제하거나 최신 이벤트를 모두 포함하게 수정하여 프론트엔드의 자유로운 조회를 가능케 합니다.
- **Verification:** Unit 테스트 등 실행 결과 400 Bad Request 가 없어져야 함.

### [Phase 2: 프론트엔드 라우팅 및 타입 구조 셋업]
- **Goal:** 프론트엔드 라우터에 메뉴를 등록하고 서버 데이터 통신을 위한 기반을 닦습니다.
- **Files:**
  - `frontend/src/app/routes.ts`
  - `frontend/src/App.tsx`
  - `frontend/src/pages/audit/modules/types.ts`
  - `frontend/src/pages/audit/modules/useAuditLogsQuery.ts`
- **Approach:**
  - `NavSectionKey`에 `audit` 등록 (Admin 용 View)
  - `useAuditLogsQuery.ts`를 생성하여 `react-query`의 `useQuery`로 `/api/v1/audit-logs` 엔드포인트를 호출하도록 구성.
  - 파라미터: `eventType`, `limit`(100 기본)

### [Phase 3: 감사 로그 전용 화면 구성]
- **Goal:** 필터 입력, 데이터 테이블, 상호작용 가능한 화면을 제공합니다.
- **Files:**
  - `frontend/src/pages/audit/AuditLogsPage.tsx`
- **Approach:**
  - `Ant Design`의 `Card`와 `Table` 위주 UI. 상단에 이벤트 타입을 선택할 수 있는 `Select` 필터 메뉴. (초기 상태는 조건 없음)
  - 테이블 컬럼: `ID`, `구분(EventType)`, `수행자ID`, `대상 리소스`, `수행 일시`, `Action`
  - `Action` 열에는 "상세 보기" 버튼을 노출. 선택 시 Modal 창을 열고, 내부에 `<Typography.Text code>` 또는 `<pre>` 블럭으로 JSON(`attributesJson`)을 Pretty formatting 상태로 출력.

## Test Scenarios & Verification
1. **백엔드 필터 테스트:** `GET /api/v1/audit-logs?eventType=MEMBERSHIP_HOLD` 로 올바르게 최신 데이터가 조회되는지.
2. **사이드바 메뉴 권한 테스트:** `ROLE_CENTER_ADMIN`, `ROLE_SUPER_ADMIN`인 유저 로그인 시 메뉴에서 보이며 정상 진입 가능한지 확인.
3. **상세 조회 동작 확인:** 모달 오픈 시 빈 값이 아니라 올바른 JSON 페이로드가 파싱되어 뷰어에 표시되는가.
