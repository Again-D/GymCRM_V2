---
status: complete
priority: p2
issue_id: "034"
tags: [code-review, quality, documentation]
dependencies: []
---

# Plan references non-versioned artifacts

The deepened Phase11 plan references local markdown artifacts that are currently not tracked in git. If this plan is shared or committed without those artifacts, references become dead links and weaken auditability.

## Problem Statement

The plan cites brainstorm/solution paths as core evidence, but those files are not currently versioned in repository history from this branch state. This creates review friction and can block downstream workflows that rely on linked context.

## Findings

- `docs/plans/2026-03-03-feat-phase11-requirements-architecture-aligned-expansion-roadmap-plan.md` references:
  - `docs/brainstorms/2026-02-27-gym-crm-observability-slo-first-brainstorm.md` (line 85, 326)
  - `docs/solutions/documentation-gaps/prototype-plan-checklist-status-drift-gymcrm-20260227.md` (line 97, 337)
- `git ls-files` for above referenced artifacts returned no tracked paths in current branch state.
- Impact: reviewers cannot reliably follow cited evidence once plan is pushed/checked out elsewhere.

## Proposed Solutions

### Option 1: Commit referenced artifacts together with the plan

**Approach:** Stage and commit all referenced brainstorm/solutions files in the same change set as the plan.

**Pros:**
- Preserves full traceability
- No link breakage

**Cons:**
- May include unrelated historical docs if scope is not curated

**Effort:** Small (30-60 min)

**Risk:** Low

---

### Option 2: Remove/replace unstable references with tracked equivalents

**Approach:** Keep only references to already tracked artifacts and paraphrase missing context inline.

**Pros:**
- Smaller commit surface
- Immediate consistency

**Cons:**
- Loses provenance detail
- Duplicates context in plan text

**Effort:** Small (30-60 min)

**Risk:** Medium

---

### Option 3: Add a dedicated appendix section with reference state

**Approach:** Keep links, but add `Reference Availability` section marking each source as tracked/untracked and required follow-up.

**Pros:**
- Transparent interim state
- Avoids silent link failures

**Cons:**
- Still not fully resolved until files are tracked

**Effort:** Small (15-30 min)

**Risk:** Medium

## Recommended Action

Option 2 적용 완료:
- 비추적 아티팩트 레퍼런스를 계획 문서에서 제거
- 추적되는 계획/요구사항/아키텍처/솔루션 레퍼런스로 정렬

## Technical Details

**Affected files:**
- `docs/plans/2026-03-03-feat-phase11-requirements-architecture-aligned-expansion-roadmap-plan.md`
- `docs/brainstorms/2026-02-27-gym-crm-observability-slo-first-brainstorm.md` (reference target)
- `docs/solutions/documentation-gaps/prototype-plan-checklist-status-drift-gymcrm-20260227.md` (reference target)

**Related components:**
- Planning workflow traceability
- Review/readiness documentation chain

**Database changes (if any):**
- No

## Resources

- Review target: `docs/plans/2026-03-03-feat-phase11-requirements-architecture-aligned-expansion-roadmap-plan.md`
- Command evidence: `git ls-files -- <referenced paths>`

## Acceptance Criteria

- [x] Every reference in the plan points to tracked repository artifacts
- [x] Plan can be reviewed in a clean clone with no missing context documents
- [x] Sources section validated with one command-based check

## Work Log

### 2026-03-03 - Initial Discovery

**By:** Codex

**Actions:**
- Reviewed deepened plan references and cross-checked file tracking state.
- Confirmed reference targets missing from `git ls-files` in current branch state.
- Documented remediation options with effort/risk.

**Learnings:**
- Plan quality depends on reference portability, not only content depth.

### 2026-03-03 - Resolution Applied

**By:** Codex

**Actions:**
- Removed untracked reference targets from Phase11 plan Sources/Research sections.
- Kept only tracked artifacts (`git ls-files` 확인) as references.
- Revalidated review portability in clean-clone assumption.

**Learnings:**
- 계획 문서의 근거 링크는 "존재"보다 "버전관리 추적성"이 우선이다.
