---
title: "feat: Add membership summary columns to member list"
type: feat
status: active
date: 2026-03-04
origin: docs/brainstorms/2026-03-04-members-table-membership-summary-columns-brainstorm.md
---

# feat: Add membership summary columns to member list

## Enhancement Summary

**Deepened on:** 2026-03-04  
**Origin:** `docs/brainstorms/2026-03-04-members-table-membership-summary-columns-brainstorm.md`

### Key Improvements Added
1. 대표 회원권 선정/상태 매핑을 SQL 친화적으로 구현할 수 있는 구체 전략 추가
2. 응답 계약(API field contract)과 프론트 렌더 책임 경계 명확화
3. 성능/인덱스 검증 플로우(실행 전후 체크)와 테스트 매트릭스 강화
4. 릴리즈 후 모니터링/회귀 점검 항목 추가

### New Considerations Discovered
- 기존 인덱스(`idx_member_memberships_center_member`, `idx_member_memberships_member_status`)로 1차 구현은 가능하나, 대표회원권 정렬(`end_date`) 비용이 크면 보조 인덱스 검토가 필요함.
- `ACTIVE + end_date IS NULL`(COUNT형) 케이스는 운영상태를 `정상`으로 명시 처리해야 판단 오류를 방지할 수 있음 (see brainstorm: `docs/brainstorms/2026-03-04-members-table-membership-summary-columns-brainstorm.md`).

## Overview
회원관리 목록 테이블에 운영 관점의 회원권 요약 컬럼을 추가한다. 기존 `ID/이름/연락처/상태/가입일/액션`에 더해 `회원권 운영상태`, `회원권 만료일`, `남은 PT 횟수`를 표시한다.

핵심은 프론트 조합이 아닌 회원 목록 API 확장으로 요약 데이터를 제공하는 것이다. 이를 통해 N+1 호출 없이 목록 성능과 페이징 정합성을 유지한다 (see brainstorm: `docs/brainstorms/2026-03-04-members-table-membership-summary-columns-brainstorm.md`).

## Problem Statement / Motivation
- 운영자가 만료 임박 회원/PT 잔여 현황을 즉시 판단하기 어렵다.
- 현재는 상세/회원권 탭으로 이동해야 하므로 반복 작업 비용이 크다.
- 리스트 수준에서 운영 요약을 제공하면 후속 액션(연장 안내, PT 소진 안내, 예약 유도) 속도를 높일 수 있다.

## Proposed Solution
`/api/v1/members` 응답에 회원권 요약 필드 3개를 추가하고, 프론트 회원 목록 테이블이 해당 필드를 렌더링하도록 확장한다.

- `membershipOperationalStatus`: `정상 | 만료임박 | 만료 | 없음`
- `membershipExpiryDate`: `YYYY-MM-DD | null`
- `remainingPtCount`: `number | null`

규칙은 브레인스토밍 합의를 그대로 따른다:
- 대표 회원권: `ACTIVE` 우선 + 가장 빠른 만료일
- 만료임박: 7일 기준
- PT 잔여: 사용 가능한 PT 총합, 값 없으면 `-`

### API Contract Example (Target)
```json
{
  "memberId": 101,
  "centerId": 1,
  "memberName": "홍길동",
  "phone": "010-1111-2222",
  "memberStatus": "ACTIVE",
  "joinDate": "2026-01-02",
  "membershipOperationalStatus": "만료임박",
  "membershipExpiryDate": "2026-03-10",
  "remainingPtCount": 4
}
```

표기 규칙:
- `membershipExpiryDate == null` → UI `-`
- `remainingPtCount == null || remainingPtCount <= 0` → UI `-`

## Technical Considerations
- 백엔드
  - 현재 회원 목록은 `MemberRepository.findAll()`에서 members 테이블만 조회함.
  - 회원권 요약 산출을 위해 `member_memberships` 기반 집계/대표선정 로직이 필요함.
  - 타임존 기준 일자 비교(센터 운영 기준, 로컬 day boundary)를 명확히 적용해야 함.
- 프론트
  - `frontend/src/App.tsx`의 `MemberSummary` 타입 확장 필요.
  - `frontend/src/features/members/MemberManagementPanels.tsx` 컬럼 추가 및 표기 포맷(`-`) 적용.
  - 좁은 화면에서 열 증가로 가독성 저하 가능성이 있어 반응형 숨김/축약 규칙 재조정 필요.
- 성능
  - 목록당 최대 100건 조회 경로에서 membership 집계 쿼리 비용이 증가할 수 있음.
  - 필요한 인덱스/쿼리 플랜 확인 필요.

### Query Strategy (Recommended)
- 단일 SQL에서 회원 목록 + 요약 필드를 함께 반환한다.
- 대표 회원권 선택:
  - `ACTIVE`만 후보
  - `ORDER BY end_date NULLS LAST, membership_id ASC`로 안정 tie-break
- PT 잔여 집계:
  - `membership_status='ACTIVE' AND product_category_snapshot='PT' AND product_type_snapshot='COUNT'`
  - `SUM(remaining_count)` 사용, 결과 `<=0`이면 null 취급

예시 스케치(설계용):
```sql
WITH base_members AS (
  SELECT m.member_id, m.center_id, m.member_name, m.phone, m.member_status, m.join_date
  FROM members m
  WHERE m.center_id = :centerId
    AND m.is_deleted = FALSE
    -- optional filters(name/phone)
  ORDER BY m.member_id DESC
  LIMIT 100
),
rep_membership AS (
  SELECT DISTINCT ON (mm.member_id)
         mm.member_id,
         mm.membership_id,
         mm.end_date
  FROM member_memberships mm
  JOIN base_members bm ON bm.member_id = mm.member_id
  WHERE mm.center_id = :centerId
    AND mm.is_deleted = FALSE
    AND mm.membership_status = 'ACTIVE'
  ORDER BY mm.member_id, mm.end_date NULLS LAST, mm.membership_id ASC
),
pt_summary AS (
  SELECT mm.member_id,
         SUM(CASE
               WHEN mm.remaining_count IS NOT NULL AND mm.remaining_count > 0
               THEN mm.remaining_count
               ELSE 0
             END) AS pt_remaining_sum
  FROM member_memberships mm
  JOIN base_members bm ON bm.member_id = mm.member_id
  WHERE mm.center_id = :centerId
    AND mm.is_deleted = FALSE
    AND mm.membership_status = 'ACTIVE'
    AND mm.product_category_snapshot = 'PT'
    AND mm.product_type_snapshot = 'COUNT'
  GROUP BY mm.member_id
)
SELECT ...
```

### Status Mapping Logic (Server-side)
- `없음`: 대표 회원권 없음
- `만료`: 대표 만료일이 today 이전
- `만료임박`: 대표 만료일이 today~today+7
- `정상`: 그 외 (`ACTIVE + end_date NULL` 포함)

## System-Wide Impact
- **Interaction graph**
  - `GET /api/v1/members` → `MemberController.list` → `MemberService.list` → `MemberRepository.findAll` (+ membership summary join/aggregation).
- **Error propagation**
  - 목록 조회 실패 시 기존 `memberPanelError` 표시 경로 유지 (`frontend/src/App.tsx`).
- **State lifecycle risks**
  - 조회 전용 기능이므로 영속 상태 변경 없음.
  - 단, 잘못된 집계 규칙은 운영판단 오류로 이어질 수 있어 테스트 케이스 강화 필요.
- **API surface parity**
  - 회원 목록 응답 스키마 확장에 따라 프론트 타입과 테스트 픽스처 동시 갱신 필요.
- **Integration test scenarios**
  - 복수 ACTIVE 회원권, 만료일 null, 경계일(D-7/D-8), PT 0/null/양수 케이스를 API 레벨에서 검증.

### Error Handling Expectations
- 요약 필드 계산 실패 시 목록 전체 실패로 처리(침묵 무시 금지).
- validation/runtime 예외는 기존 API 에러 포맷으로 반환하고 프론트 `memberPanelError`에 표출.

## Implementation Plan
### Phase 1: Backend API Summary Extension
- [x] 회원 목록 전용 summary projection 모델 정의
  - 대상: `backend/src/main/java/com/gymcrm/member/`
- [x] `MemberRepository.findAll` 쿼리 확장 또는 요약 조회 쿼리 분리
  - 대표 회원권 선정 규칙 반영 (ACTIVE 우선 + 만료일 오름차순 + 안정 tie-break)
- [x] 운영 상태 매핑 로직 구현
  - `정상/만료임박/만료/없음`, 7일 기준, 만료일 null 처리
- [x] PT 잔여 횟수 집계 로직 구현
  - 사용 가능한 PT 총합, 값 없으면 null
- [x] `MemberController.MemberSummaryResponse` 필드 확장
  - API contract: `membershipOperationalStatus`, `membershipExpiryDate`, `remainingPtCount`
- [x] (선택) 성능 보강 인덱스 검토
  - 후보: `member_memberships(center_id, member_id, membership_status, end_date)`
  - 적용 여부는 `EXPLAIN ANALYZE`로 판단

### Phase 2: Frontend Table Expansion
- [x] `frontend/src/App.tsx`의 `MemberSummary` 타입/로드 경로 확장
- [x] `frontend/src/features/members/MemberManagementPanels.tsx` 테이블 헤더/셀 추가
  - 컬럼: 회원권 상태, 회원권 만료일, 남은 PT 횟수
  - 표기 규칙: 날짜 없으면 `-`, PT 값 없거나 0/비대상이면 `-`
- [x] 운영 상태 pill/텍스트 스타일 추가
  - 기존 테마 변수 체계 유지 (`frontend/src/styles.css`)
- [x] 모바일 반응형 컬럼 가시성 규칙 점검/보정
- [x] 테이블 헤더/컬럼 우선순위 재배치
  - 모바일에서 저우선 열(ID/가입일) 숨김과 요약열 노출 균형 재조정

### Phase 3: Verification & Regression
- [x] 백엔드 통합 테스트 추가/갱신
  - 대상: `backend/src/test/java/com/gymcrm/member/` (필요시 신규)
- [x] 프론트 타입/렌더 회귀 검증
  - `npm run build` 통과
- [ ] 수동 스모크
  - 회원 목록 조회/검색/선택/액션(보기·수정·회원권업무·예약관리) 회귀 확인
- [x] 쿼리 성능 검증
  - 기준 데이터(예: 회원 100, 회원권 5k+)에서 응답 시간/플랜 체크

## SpecFlow-Driven Edge Cases
- [x] 회원권이 전혀 없는 회원 → `없음 / - / -`
- [x] ACTIVE(만료일 없음, COUNT형) → `정상 / - / [숫자 또는 -]`
- [x] ACTIVE(만료일 D-7) → `만료임박`
- [x] ACTIVE(만료일 D-8) → `정상`
- [x] ACTIVE 다건 + 동일 만료일 → tie-break 일관성 검증
- [x] PT 잔여가 0 또는 null → `-`
- [x] ACTIVE 없음 + EXPIRED/REFUNDED만 존재 → `없음`
- [x] ACTIVE 1건 + end_date NULL + PT 집계 양수 → `정상 / - / 숫자`

## Acceptance Criteria
- [x] 회원 목록 API가 요약 필드 3개를 반환한다.
- [x] 운영 상태가 합의된 규칙(정상/만료임박/만료/없음, 7일 기준)에 맞게 계산된다.
- [x] 남은 PT 횟수는 숫자 또는 `-` 규칙을 일관되게 따른다.
- [x] 프론트 회원관리 테이블에 3개 컬럼이 추가되고 기존 액션 동작이 유지된다.
- [x] 목록 검색/정렬/표시 성능이 실사용 범위에서 저하되지 않는다.
- [x] `npm run build` 및 백엔드 관련 테스트가 통과한다.
- [x] API 예시 응답 스냅샷이 문서/테스트에 반영되어 FE-BE 계약이 고정된다.

## Success Metrics
- 회원관리 탭에서 만료 임박/만료/PT 잔여 정보를 상세 이동 없이 확인 가능.
- 운영자가 대상 회원 식별에 필요한 클릭 수 감소(정성 확인).
- 목록 API 호출 수 증가는 없고(단일 호출 유지), P95 응답시간이 허용 범위 내 유지.
- 운영 상태 오분류(샘플 수동검증 기준) 0건.

## Dependencies & Risks
- **Risk:** 대표 회원권 선정 로직 해석 불일치
  - **Mitigation:** 쿼리/서비스 로직과 테스트 케이스에서 동일 규칙을 명문화
- **Risk:** 목록 쿼리 성능 저하
  - **Mitigation:** 집계 범위 제한(center_id + listed members), 필요 시 인덱스 검토
- **Risk:** 프론트 컬럼 증가로 모바일 가독성 저하
  - **Mitigation:** 반응형에서 저우선 열 숨김/축약 정책 적용
- **Risk:** 서버/프론트 상태 문자열 불일치
  - **Mitigation:** enum-like 허용값을 테스트로 고정하고 UI 매핑 fallback(`-`) 정의

## Validation & Rollout Checklist
- [x] 백엔드 단위/통합 테스트 통과 (`./gradlew test --tests 'com.gymcrm.member.*'`)
- [x] 프론트 빌드 통과 (`npm run build`)
- [ ] 스테이징에서 회원관리 목록 수동 점검:
  - [ ] 상태 pill/텍스트 정확성
  - [ ] 만료일/잔여횟수 `-` 표기 정확성
  - [ ] 회원 선택/아이콘 액션 회귀 없음
- [ ] 배포 후 모니터링(초기 24시간):
  - [ ] `/api/v1/members` 에러율
  - [ ] 응답시간 P95
  - [ ] 운영팀 피드백(오분류 사례 여부)

## Sources & References
- **Origin brainstorm:** [`docs/brainstorms/2026-03-04-members-table-membership-summary-columns-brainstorm.md`](/Users/abc/projects/GymCRM_V2/docs/brainstorms/2026-03-04-members-table-membership-summary-columns-brainstorm.md)
  - Carry-forward decisions:
  - 대표 회원권 = ACTIVE 우선 + 빠른 만료일
  - 운영 상태 = 정상/만료임박/만료/없음
  - 만료임박 기준 = 7일
- Existing API surface:
  - `backend/src/main/java/com/gymcrm/member/MemberController.java:52`
  - `backend/src/main/java/com/gymcrm/member/MemberService.java:55`
  - `backend/src/main/java/com/gymcrm/member/MemberRepository.java:52`
- Schema/index baseline:
  - `backend/src/main/resources/db/migration/V3__create_members_and_products.sql:1`
  - `backend/src/main/resources/db/migration/V4__create_membership_payment_and_history_tables.sql:1`
  - `backend/src/main/resources/db/migration/V4__create_membership_payment_and_history_tables.sql:53`
- Frontend member list:
  - `frontend/src/App.tsx:65`
  - `frontend/src/App.tsx:971`
  - `frontend/src/features/members/MemberManagementPanels.tsx:8`
- Institutional learnings:
  - `docs/solutions/database-issues/reservation-capacity-and-usage-deduction-integrity-gymcrm-20260225.md`
    - COUNT 잔여(`remaining_count`)는 UI 추론이 아닌 서버 규칙/검증 중심으로 다뤄야 함.
