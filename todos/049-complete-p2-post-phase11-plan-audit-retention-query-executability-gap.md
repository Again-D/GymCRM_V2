---
status: complete
priority: p2
issue_id: "049"
tags: [code-review, planning, security, compliance]
dependencies: []
---

# 감사로그 보존 검증 항목이 실행 가능한 쿼리 수준으로 구체화되지 않음

## Problem Statement

PR #28은 NFR-015 대응으로 보존 검증 항목을 추가했지만, 검증 대상 테이블/지표 정의가 없어 운영자가 즉시 실행 가능한 확인 절차로 사용하기 어렵다. 문구 수준 검증은 릴리즈 게이트 통과 근거로 약하다.

## Findings

- Deployment validation에 "보존기간 >= 365일, 파티션/TTL 상태"가 추가됐지만 구체 쿼리 대상이 없음.
  - `docs/plans/2026-03-04-feat-post-phase11-requirements-architecture-execution-plan.md`
  - `Phase 13-B Migration & Key Management Plan -> Deployment validation`
- 기존 레포 관행상 운영 검증은 SQL/로그 패턴을 명시하는 형태로 남겨 추적성을 확보해 왔음.
  - `docs/solutions/database-issues/access-events-and-open-session-integrity-gymcrm-20260227.md`

## Proposed Solutions

### Option 1: 문서에 최소 실행 쿼리/로그 패턴 예시를 직접 추가

**Approach:**
- 감사로그 저장소 기준으로 최소 3종 검증 쿼리(보존기간, 적재 누락, 정책 배치 성공률)를 명시
- 알림 검색어/대시보드 지표명을 함께 기재

**Pros:**
- 릴리즈 게이트의 객관성 강화
- 운영자 온보딩/교대 시 재현 가능

**Cons:**
- 저장소 스키마 변경 시 문서 업데이트 필요

**Effort:** Small

**Risk:** Low

---

### Option 2: 별도 운영 검증 문서로 분리하고 본문 링크

**Approach:**
- `docs/notes/`에 "security-retention-validation" 문서 생성
- 본 플랜에는 링크와 필수 체크 항목만 유지

**Pros:**
- 운영 절차 상세화에 유리

**Cons:**
- 참조 문서 동기화 비용 증가

**Effort:** Medium

**Risk:** Medium

## Recommended Action

Option 1 채택: 문서에 NFR-015 실행 SQL/로그 패턴을 직접 추가하고, acceptance criteria에 데이터 소스/증빙 첨부 요건을 명시한다.

## Technical Details

**Affected files:**
- `docs/plans/2026-03-04-feat-post-phase11-requirements-architecture-execution-plan.md`
- `docs/solutions/database-issues/access-events-and-open-session-integrity-gymcrm-20260227.md`

## Acceptance Criteria

- [x] NFR-015 검증용 최소 실행 쿼리/로그 패턴이 정의된다.
- [x] 보존 검증의 데이터 소스(테이블/인덱스/배치 작업)가 명시된다.
- [x] 보안 phase 완료 판정에 쿼리 실행 결과 첨부 기준이 추가된다.

## Work Log

### 2026-03-04 - Review Finding Captured

**By:** Codex

**Actions:**
- Reviewed PR #28 added deployment validation bullets
- Compared with repository's query-first validation documentation pattern

**Learnings:**
- 컴플라이언스 검증 항목은 문장보다 실행 가능한 검증 쿼리 형태로 남겨야 운영 품질이 안정된다.

## Resources

- PR: https://github.com/Again-D/GymCRM_V2/pull/28

### 2026-03-04 - Execution Complete

**By:** Codex

**Actions:**
- Added executable PostgreSQL validation queries for retention days, sensitive event ingestion, and retention job runs
- Added concrete log search patterns for audit retention failures
- Added acceptance criteria requiring explicit data sources and PR evidence attachment

**Learnings:**
- 컴플라이언스 요구사항은 실행 가능한 검증 쿼리와 증빙 요구가 있어야 릴리즈 게이트로 기능한다.
