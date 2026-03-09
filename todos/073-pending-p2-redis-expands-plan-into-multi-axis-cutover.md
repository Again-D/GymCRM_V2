---
status: pending
priority: p2
issue_id: "073"
tags: [code-review, architecture, backend, redis, planning]
dependencies: []
---

# Redis expands plan into multi-axis cutover

## Problem Statement

현재 `docs/plans/2026-03-09-refactor-backend-jpa-querydsl-openapi-alignment-plan.md`는 저장소 기술 표준화(`JdbcClient -> JPA/QueryDSL`)와 API 문서화(OpenAPI) 정렬에 집중하도록 범위를 좁혔다. 여기에 Redis까지 다시 포함하면, 저장소 구현 전환과 별개로 런타임 상태 저장소 전환까지 동시에 일어나면서 계획의 성격이 단순 리팩터링이 아니라 다중 축 cutover로 바뀐다.

이 경우 일정이 길어지는 수준이 아니라, 실패 원인 분리와 rollback 경계가 급격히 어려워진다.

## Findings

- 현재 플랜은 Redis를 제외한 이유를 브레인스토밍에서 이미 확정했다.
  - `docs/brainstorms/2026-03-09-backend-architecture-stack-alignment-brainstorm.md`
- Post-Phase11 실행계획은 Redis 도입을 현 단계 기본값이 아니라 후속 trigger 기반 도입으로 정리했다.
  - `docs/plans/2026-03-04-feat-post-phase11-requirements-architecture-execution-plan.md`
- Phase 5 JWT 계획도 refresh token canonical을 PostgreSQL로 두고 Redis denylist는 후속 단계 검토로 밀어 둔 상태다.
  - `docs/plans/2026-02-24-feat-phase5-jwt-rbac-operational-basics-plan.md`
- 현재 JPA/OpenAPI 정렬 플랜은 이미 인증 저장소, 상태성 도메인, heavy query까지 포함하고 있어 저장소 기술 전환만으로도 충분히 큰 범위다.

## Proposed Solutions

### Option 1: Keep Redis out of this plan

**Approach:** 현재 플랜은 `JPA/QueryDSL + OpenAPI`까지만 유지하고, Redis는 별도 후속 플랜으로 분리한다.

**Pros:**
- 저장소 기술 전환과 런타임 상태 저장소 전환을 분리할 수 있다.
- rollback 원인 분리가 쉬워진다.
- 기존 브레인스토밍/Phase 5/Phase 13 의사결정과 일치한다.

**Cons:**
- 아키텍처 문서와 완전 일치까지 시간이 더 걸린다.

**Effort:** Small

**Risk:** Low

---

### Option 2: Add Redis, but as a separate milestone inside the plan

**Approach:** 같은 문서 안에 두되, JPA/QueryDSL/OpenAPI 완료 이후의 별도 마일스톤으로 Redis를 분리한다.

**Pros:**
- 장기 방향을 한 문서에서 볼 수 있다.
- Redis를 언제 붙일지 순서를 명확히 적을 수 있다.

**Cons:**
- 계획 문서가 다시 넓어지고 실행 우선순위가 흐려질 수 있다.
- 잘못 실행되면 Redis가 조기 도입될 여지가 남는다.

**Effort:** Small

**Risk:** Medium

---

### Option 3: Re-include Redis in the same implementation stream

**Approach:** JPA/QueryDSL/OpenAPI와 함께 Redis도 같은 마일스톤에서 구현한다.

**Pros:**
- 문서와 구현의 겉보기 일치가 빨라진다.

**Cons:**
- 저장소 전환 + 상태 저장소 전환 + 운영 인프라 추가가 겹친다.
- 실패 원인 분리와 rollback이 어렵다.
- 인증/QR/예약에서 동시 회귀 가능성이 커진다.

**Effort:** Large

**Risk:** High

## Recommended Action


## Technical Details

**Affected files:**
- `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-09-refactor-backend-jpa-querydsl-openapi-alignment-plan.md`
- `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-04-feat-post-phase11-requirements-architecture-execution-plan.md`
- `/Users/abc/projects/GymCRM_V2/docs/plans/2026-02-24-feat-phase5-jwt-rbac-operational-basics-plan.md`

**Architectural considerations:**
- Repository technology migration and runtime state-store migration should not share the same rollback unit unless cutover strategy is explicit.

## Resources

- [Current plan](/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-09-refactor-backend-jpa-querydsl-openapi-alignment-plan.md)
- [Redis stage boundary](/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-04-feat-post-phase11-requirements-architecture-execution-plan.md)
- [Phase 5 auth canonical decision](/Users/abc/projects/GymCRM_V2/docs/plans/2026-02-24-feat-phase5-jwt-rbac-operational-basics-plan.md)

## Acceptance Criteria

- [ ] Redis를 같은 실행 단위에 넣을지 여부가 별도 결정으로 분리된다.
- [ ] 저장소 기술 전환과 상태 저장소 전환이 같은 rollback unit인지 아닌지가 문서에 명시된다.
- [ ] JPA/QueryDSL/OpenAPI 플랜의 우선순위가 Redis 때문에 흐려지지 않는다.

## Work Log

### 2026-03-09 - Review finding creation

**By:** Codex

**Actions:**
- 현재 JPA/QueryDSL/OpenAPI 정렬 플랜과 기존 Redis 보류 결정 문서를 대조했다.
- Redis를 같은 플랜에 다시 포함할 경우 cutover 축이 증가하는지 검토했다.

**Learnings:**
- Redis를 같은 플랜에 넣는 순간 이 작업은 단순 저장소 표준화가 아니라 multi-axis cutover가 된다.

