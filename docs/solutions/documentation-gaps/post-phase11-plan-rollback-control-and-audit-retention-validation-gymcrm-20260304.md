---
module: System
date: 2026-03-04
problem_type: documentation_gap
component: documentation
symptoms:
  - "Post-Phase11 plan rollback rule assumed feature-flag rollback for every track without confirming track-specific controls"
  - "NFR-015 audit retention validation existed as prose but lacked executable SQL/log checks for release evidence"
  - "Review findings kept reappearing because acceptance criteria did not enforce control mechanism and evidence attachment"
root_cause: inadequate_documentation
resolution_type: documentation_update
severity: medium
tags: [planning, documentation, rollback-control, nfr-015, audit-retention, runbook]
---

# Troubleshooting: Post-Phase11 Plan Rollback Control Assumption and NFR-015 Validation Gaps

## Problem
Post-Phase11 실행 계획은 운영 임계치 자체는 정의했지만, 실제 롤백 제어수단과 감사로그 보존 검증의 실행 절차가 문서화되지 않아 운영자가 배포 게이트에서 즉시 실행 가능한 판단 근거를 확보하기 어려웠다.

## Environment
- Module: System-wide
- Affected Component: Documentation (`docs/plans`, `todos`)
- Date: 2026-03-04
- Related PRs: [#28](https://github.com/Again-D/GymCRM_V2/pull/28), [#29](https://github.com/Again-D/GymCRM_V2/pull/29)

## Symptoms
- `Rollback Thresholds & Owners` 규칙이 "전 트랙 feature flag rollback"을 가정했지만 트랙별 제어수단 정의가 없었다.
- NFR-015(감사로그 1년 보존) 검증 항목이 문장 수준이어서 SQL/로그 증빙으로 바로 실행하기 어려웠다.
- 리뷰에서 동일한 유형의 계획 공백(todo 048, 049)이 재발했다.

## What Didn't Work

**Attempted Solution 1:** 임계치/오너만 추가하고 공통 "feature flag rollback" 문구 유지
- **Why it failed:** SAL/CRM/Security 트랙에서 실제 제어수단이 feature flag인지 보장되지 않아 runbook 실행 가능성이 낮았다.

**Attempted Solution 2:** NFR-015를 acceptance 항목으로만 추가
- **Why it failed:** 검증 쿼리/로그 패턴/데이터 소스가 없으면 릴리즈 게이트 증빙(재현 가능성)이 부족했다.

## Solution

플랜 문서에 운영 실행성을 직접 보강했다.

**Document changes:**
- `Rollback Control Mechanisms by Track` 표를 추가해 ACC/SAL/CRM/Security별 Primary/Secondary 제어수단과 rollback action을 명시.
- 공통 운영 판단 규칙을 "feature flag 단일 가정"에서 "트랙별 제어수단 적용"으로 수정.
- `NFR-015 Executable Validation Examples` 섹션에 PostgreSQL 기준 SQL 3종(Q1/Q2/Q3)과 로그 검색 패턴을 추가.
- Acceptance Criteria에 다음을 추가:
  - 제어수단 기반 rollback 근거
  - NFR-015 SQL/로그 패턴 + 데이터 소스(`audit_logs`, `audit_retention_job_runs`) 명시
  - 보안 phase 완료 PR의 검증 결과 첨부 기준
- 관련 리뷰 todo를 완료 처리:
  - `todos/048-complete-p2-post-phase11-plan-feature-flag-rollback-assumption-gap.md`
  - `todos/049-complete-p2-post-phase11-plan-audit-retention-query-executability-gap.md`

**Key references:**
- Plan file: `docs/plans/2026-03-04-feat-post-phase11-requirements-architecture-execution-plan.md`

## Why This Works
1. **Root cause alignment:** 문제의 핵심은 기능 미구현이 아니라 계획 문서의 운영 실행성 부족이었다.
2. **Control-plane clarity:** 트랙별 제어수단을 명시함으로써 임계치 초과 시 "무엇을 끌지"가 즉시 결정된다.
3. **Evidence-first validation:** NFR-015를 실행 가능한 SQL/로그 증빙으로 고정해 릴리즈 게이트의 객관성을 확보한다.
4. **Workflow closure:** 리뷰 finding -> plan 수정 -> todo complete를 한 PR 체인으로 닫아 재발 가능성을 낮춘다.

## Prevention
- 계획 문서에서 rollback 규칙을 작성할 때는 반드시 `Threshold + Window + Owner + Control Mechanism` 4요소를 세트로 기록한다.
- NFR/컴플라이언스 항목은 문장형 요구사항으로 끝내지 말고, 최소 2~3개의 실행 쿼리와 로그 검색 패턴을 함께 남긴다.
- `workflows-review` 결과가 plan 문서 공백일 경우, 동일 턴에서 `workflows-work`로 todo를 complete까지 닫는다.
- 계획 acceptance criteria에는 "증빙 첨부 위치(PR/노트)"를 명시해 완료 판정 기준을 고정한다.

## Related Issues
- See also: [prototype-plan-checklist-status-drift-gymcrm-20260227.md](/Users/abc/projects/GymCRM_V2/docs/solutions/documentation-gaps/prototype-plan-checklist-status-drift-gymcrm-20260227.md)
- See also: [048-complete-p2-post-phase11-plan-feature-flag-rollback-assumption-gap.md](/Users/abc/projects/GymCRM_V2/todos/048-complete-p2-post-phase11-plan-feature-flag-rollback-assumption-gap.md)
- See also: [049-complete-p2-post-phase11-plan-audit-retention-query-executability-gap.md](/Users/abc/projects/GymCRM_V2/todos/049-complete-p2-post-phase11-plan-audit-retention-query-executability-gap.md)
