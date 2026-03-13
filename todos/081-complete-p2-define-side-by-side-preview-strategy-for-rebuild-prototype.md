---
status: pending
priority: p2
issue_id: 081
tags: [code-review, architecture, frontend, routing, rebuild]
dependencies: []
---

# Problem Statement

prototype-first 재구축 플랜이 별도 worktree와 baseline snapshot은 정의했지만, 새 프로토타입과 기존 프런트를 같은 worktree에서 어떻게 비교 검증할지 명시하지 않았다. 현재 문구대로면 rebuild branch의 `/frontend/src`를 바로 대체해 가며 작업하게 되는데, 그러면 prototype checkpoint에서 "구조가 더 나은가"를 side-by-side로 검증하기 어렵고 baseline과의 비교가 주관적으로 흐를 수 있다.

## Findings

- `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-12-refactor-frontend-rebuild-in-worktree-plan.md:65` 이후 문장은 새 레이아웃을 worktree에서 만든다고만 적고, prototype이 기존 shell과 나란히 비교 가능한 실행 형태인지가 없다.
- `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-12-refactor-frontend-rebuild-in-worktree-plan.md:164`의 `New Shell Prototype`도 URL surface parity만 요구하고, 기존 app과의 비교 방식은 정의하지 않는다.
- worktree isolation만으로는 baseline 보존은 되지만, rebuild branch 내부에서 prototype과 parity 대상 앱을 동시에 관찰하는 전략은 별도로 필요하다.

## Proposed Solutions

### Option 1: Alternate frontend entry in same worktree
새 프로토타입을 `frontend-rebuild/` 또는 별도 Vite entry로 두고, 기존 `frontend/`는 worktree 안에서 baseline으로 유지한다.

**Pros**
- side-by-side 비교가 가장 쉽다.
- prototype 단계에서 rollback cost가 낮다.

**Cons**
- dependency and dev server 관리가 이중화된다.
- 최종 merge 시 디렉터리 합치기 작업이 필요하다.

**Effort**: Medium  
**Risk**: Medium

### Option 2: Single app replacement with checkpoint artifacts only
현재 플랜대로 `/frontend/src`를 직접 대체하되, 각 checkpoint마다 screenshot/video/log를 baseline과 비교하는 artifact 절차를 더 강하게 정의한다.

**Pros**
- 구조가 단순하다.
- 최종 merge 경로가 직접적이다.

**Cons**
- side-by-side 체감 비교가 약하다.
- prototype 판단이 더 주관적일 수 있다.

**Effort**: Small  
**Risk**: Medium-High

### Option 3: Separate host path/route prefix during prototype
같은 앱 안에서 `/prototype/*` 같은 별도 route prefix로 새 shell을 띄워 baseline과 공존시킨다.

**Pros**
- 한 앱 안에서 비교 가능하다.
- 최종 흡수 전까지 baseline 유지가 쉽다.

**Cons**
- route contract가 임시로 두 벌 생긴다.
- prototype용 분기 코드가 남을 위험이 있다.

**Effort**: Medium  
**Risk**: Medium

## Recommended Action


## Technical Details

- Affected file: `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-12-refactor-frontend-rebuild-in-worktree-plan.md`
- Review context: prototype-first rebuild should have a concrete comparison model, not just a separate branch.

## Acceptance Criteria

- [ ] prototype와 baseline을 어떤 실행 형태로 비교할지 플랜에 명시된다.
- [ ] `Prototype Checkpoint / Go-NoGo 1`에서 그 비교 전략을 사용한 산출물이 정의된다.
- [ ] rebuild branch inside worktree에서 baseline 관찰 방법이 문서상 분명하다.

## Work Log

- 2026-03-12: plan review 중 prototype-first checkpoint가 side-by-side comparison strategy 없이 정의된 점을 finding으로 기록.

## Resources

- Plan: `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-12-refactor-frontend-rebuild-in-worktree-plan.md`
