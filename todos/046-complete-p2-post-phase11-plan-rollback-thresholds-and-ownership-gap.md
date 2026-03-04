---
status: complete
priority: p2
issue_id: "046"
tags: [code-review, planning, operations, reliability]
dependencies: []
---

# Quantitative rollback thresholds/owners missing in post-Phase11 plan

## Problem Statement

심화된 플랜이 rollback trigger를 정의했지만, 임계치 수치/검증 윈도우/오너가 빠져 있어 실제 배포 중 Go/No-Go 판단이 팀별로 달라질 수 있다.
운영 관점에서 정성 트리거만 있으면 incident 대응 시 의사결정 지연이 발생한다.

## Findings

- 문서에 rollback trigger는 존재하지만 정량 기준이 없다.
  - `docs/plans/2026-03-04-feat-post-phase11-requirements-architecture-execution-plan.md:295-299`
- 플랜 acceptance는 runbook 기록만 요구하고, 임계치/오너를 필수 증빙으로 고정하지 않았다.
  - `docs/plans/2026-03-04-feat-post-phase11-requirements-architecture-execution-plan.md:306-310`

## Proposed Solutions

### Option 1: 각 도메인별 SLO 기반 임계치/윈도우/오너를 본문에 직접 추가

**Approach:**
- ACC/SAL/CRM/Security 각 항목에 수치 임계치(예: 실패율, DLQ 누적, MTTR), 관찰 윈도우, 1차 오너를 명시
- Acceptance Criteria에 "임계치 + 오너 기재" 체크 추가

**Pros:**
- 즉시 실행 가능, 의사결정 일관성 확보
- incident triage 속도 개선

**Cons:**
- 초기 수치 합의 필요

**Effort:** Small

**Risk:** Low

---

### Option 2: 별도 운영 검증 부록 문서로 분리

**Approach:**
- `docs/notes/` 또는 `docs/plans/`에 validation appendix 문서를 생성하고 본문에서 링크

**Pros:**
- 운영팀 협업/갱신이 용이

**Cons:**
- 문서 동기화 포인트 증가

**Effort:** Medium

**Risk:** Medium

## Recommended Action

Option 1 채택: 본문에 도메인별 rollback 정량 임계치/검증 윈도우/오너를 직접 추가하고 acceptance criteria에 Go/No-Go 기준으로 고정한다.

## Technical Details

**Affected files:**
- `docs/plans/2026-03-04-feat-post-phase11-requirements-architecture-execution-plan.md`

## Acceptance Criteria

- [x] ACC/SAL/CRM/Security별 rollback 정량 임계치가 정의된다.
- [x] 각 임계치에 관찰 윈도우와 책임 오너가 명시된다.
- [x] plan acceptance에 "임계치+오너" 증빙 요구가 추가된다.

## Work Log

### 2026-03-04 - Review Finding Captured

**By:** Codex

**Actions:**
- Reviewed deepened plan diff against `origin/main`
- Identified qualitative-only rollback triggers and missing operational ownership anchors

**Learnings:**
- 운영 리스크 항목은 문구보다 임계치/책임자 정의가 실행 가능성의 핵심이다.

## Resources

- Diff target: `docs/plans/2026-03-04-feat-post-phase11-requirements-architecture-execution-plan.md`

### 2026-03-04 - Execution Complete

**By:** Codex

**Actions:**
- Added domain-specific rollback threshold table with metric, threshold, window, and owner
- Added operational decision rules tying threshold breaches to immediate feature-flag rollback
- Added acceptance criterion requiring threshold+owner evidence

**Learnings:**
- 운영 리스크 통제는 정성 트리거보다 정량 임계치와 책임자 명시가 우선이다.
