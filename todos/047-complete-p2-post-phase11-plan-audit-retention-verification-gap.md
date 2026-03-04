---
status: complete
priority: p2
issue_id: "047"
tags: [code-review, planning, security, compliance]
dependencies: []
---

# NFR-015 감사로그 1년 보존 검증 기준이 계획에 명시되지 않음

## Problem Statement

플랜은 NFR-010/011/015 충족을 목표로 두지만, NFR-015(감사로그 최소 1년 보존)에 대한 배포 검증 쿼리/만료 정책 검증 항목이 없다.
이 상태로 진행하면 보존 정책 누락을 구현 후반 또는 운영 단계에서 발견할 위험이 있다.

## Findings

- Security phase success criteria에 NFR-015가 언급되나, 검증 항목은 암호화/복호화 중심으로만 구성됨.
  - `docs/plans/2026-03-04-feat-post-phase11-requirements-architecture-execution-plan.md:237-262`
- Acceptance criteria도 감사로그 "동기화" 수준이며 보존기간 검증 기준이 없다.
  - `docs/plans/2026-03-04-feat-post-phase11-requirements-architecture-execution-plan.md:307-310`
- 요구사항 원문은 감사로그 최소 1년 보존을 명시.
  - `docs/01_요구사항_분석서.md:325`

## Proposed Solutions

### Option 1: Phase 13-B Deployment validation에 보존 검증 항목 추가

**Approach:**
- 감사로그 테이블 보존기간/파티셔닝/TTL 정책 확인 쿼리 추가
- "민감 이벤트 로그 누락 0" + "보존 정책 365일 이상" 검증 항목 반영

**Pros:**
- NFR-015를 구현-운영 관문으로 직접 연결
- 보안/컴플라이언스 리뷰 준비도 향상

**Cons:**
- 로그 저장소 스키마 기준 합의 필요

**Effort:** Small

**Risk:** Low

---

### Option 2: 보존 정책을 별도 컴플라이언스 체크리스트로 분리

**Approach:**
- 감사로그 보존/파기 정책 문서를 별도 작성 후 본문 참조

**Pros:**
- 감사/보안팀 검토에 용이

**Cons:**
- 본문과 별도 문서 간 추적 비용 증가

**Effort:** Medium

**Risk:** Medium

## Recommended Action

Option 1 채택: Phase 13-B Deployment validation에 NFR-015 보존 검증 항목(365일, 파티션/TTL, 적재 누락)을 직접 추가하고 acceptance criteria에도 반영한다.

## Technical Details

**Affected files:**
- `docs/plans/2026-03-04-feat-post-phase11-requirements-architecture-execution-plan.md`
- `docs/01_요구사항_분석서.md`

## Acceptance Criteria

- [x] NFR-015(1년 보존) 검증 쿼리/지표가 Phase 13-B에 추가된다.
- [x] 감사로그 보존 정책(저장/파기/예외 처리) 확인 절차가 계획에 명시된다.
- [x] 보안 phase 완료 판정에 보존 검증 증빙이 포함된다.

## Work Log

### 2026-03-04 - Review Finding Captured

**By:** Codex

**Actions:**
- Cross-checked deepened plan security section against NFR-015 requirement
- Identified retention verification gap in deployment validation and acceptance criteria

**Learnings:**
- NFR 문구를 성공기준에 넣는 것과 검증 가능한 보존 통제를 정의하는 것은 별개다.

## Resources

- Requirement: `docs/01_요구사항_분석서.md`
- Plan: `docs/plans/2026-03-04-feat-post-phase11-requirements-architecture-execution-plan.md`

### 2026-03-04 - Execution Complete

**By:** Codex

**Actions:**
- Extended Phase 13-B deployment validation with audit retention checks (>=365 days, partition/TTL status)
- Added log/alert validation for audit ingestion failures and missing sensitive-event logs
- Added acceptance criterion requiring NFR-015 retention verification evidence

**Learnings:**
- NFR-015는 목표 문구만으로 충족되지 않으며 보존 검증 절차가 완료조건에 포함돼야 한다.
