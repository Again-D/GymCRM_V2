---
status: complete
priority: p2
issue_id: "035"
tags: [code-review, quality, architecture, observability]
dependencies: []
---

# Phase11 success metrics are not operationally measurable

The plan defines headline metrics, but measurement baselines and exact formulas are not specified. This can lead to inconsistent Go/No-Go decisions across teams.

## Problem Statement

`Success Metrics` currently includes targets such as `FR Must 커버리지 +30%p` and `신규 도메인 API 5xx < 0.5%`, but the baseline snapshot, metric scope, aggregation window, and data source are not explicitly fixed in the same section. Without this, success criteria may be interpreted differently.

## Findings

- Plan metric statements are high-level only:
  - `FR Must 항목 커버리지: baseline 대비 +30%p 이상` (line 294)
  - `신규 도메인 API의 staging 기준 5xx < 0.5%` (line 295)
- Missing operational definitions:
  - baseline date/source (which commit or document snapshot)
  - numerator/denominator and excluded endpoints
  - minimum sample policy for low traffic
  - reporting cadence/owner
- Related sections already mention low-traffic caveat and staging gate, but not bound directly to these metrics.

## Proposed Solutions

### Option 1: Add explicit metric contracts under Success Metrics

**Approach:** For each metric, add formula, scope, window, baseline snapshot date, data source, and owner.

**Pros:**
- Enables objective pass/fail decisions
- Reduces team interpretation drift

**Cons:**
- Slightly longer plan document

**Effort:** Small (30-90 min)

**Risk:** Low

---

### Option 2: Link Success Metrics to an external SLO contract appendix

**Approach:** Keep summary metrics in plan and bind details to `docs/observability/*` contract tables.

**Pros:**
- Avoids duplication
- Keeps metrics centrally maintained

**Cons:**
- Requires strict synchronization discipline

**Effort:** Medium (1-2 h)

**Risk:** Medium

---

### Option 3: Keep as-is and enforce interpretation during review meetings

**Approach:** Do not change plan text; rely on verbal alignment.

**Pros:**
- No document changes

**Cons:**
- High drift risk
- Weak auditability

**Effort:** Small

**Risk:** High

## Recommended Action

Option 1 적용 완료:
- Success Metrics 하위에 `Metric Contracts (Operational)` 섹션 추가
- 각 지표별 formula/scope/window/source/owner/baseline/min-sample 정책 명시

## Technical Details

**Affected files:**
- `docs/plans/2026-03-03-feat-phase11-requirements-architecture-aligned-expansion-roadmap-plan.md`
- Potential linked doc: `docs/observability/core-api-slo-contract.md`

**Related components:**
- Release readiness gates
- Observability and quality governance

**Database changes (if any):**
- No

## Resources

- Review target: `docs/plans/2026-03-03-feat-phase11-requirements-architecture-aligned-expansion-roadmap-plan.md`
- Related baseline precedent: `docs/plans/2026-02-27-feat-core-api-observability-slo-guardrails-plan.md`

## Acceptance Criteria

- [x] Each success metric has explicit formula/scope/window/source/owner
- [x] Baseline snapshot date and reference artifact are documented
- [x] Low-traffic minimum-sample handling is tied to pass/fail logic
- [x] Plan reviewers can reproduce metric calculation from documented steps

## Work Log

### 2026-03-03 - Initial Discovery

**By:** Codex

**Actions:**
- Reviewed Success Metrics section for measurability and reproducibility.
- Identified missing contract fields required for objective release decisions.
- Drafted options balancing brevity and auditability.

**Learnings:**
- Metric targets without operational definitions tend to regress into subjective interpretation.

### 2026-03-03 - Resolution Applied

**By:** Codex

**Actions:**
- Added measurable contracts for FR coverage delta, staging 5xx rate, MTTR, and release artifact completeness.
- Bound each metric to explicit data source and ownership.
- Added low-traffic minimum-sample policy for staging Go/No-Go consistency.

**Learnings:**
- 지표는 목표값만이 아니라 계산 경계와 운영 소유자가 함께 있어야 품질 게이트로 작동한다.
