---
title: refactor: Slim AGENTS.md and split detailed rules into docs
type: refactor
status: completed
date: 2026-03-25
origin: docs/brainstorms/2026-03-25-agents-md-slimming-brainstorm.md
---

# refactor: Slim AGENTS.md and split detailed rules into docs

## Overview
`AGENTS.md`를 약 100줄 내외의 짧은 운영 규칙 문서로 축약하고, 길어진 설명과 구조 예시는 `docs/` 아래 2개의 보조 문서로 분리한다 `(see brainstorm: docs/brainstorms/2026-03-25-agents-md-slimming-brainstorm.md)`.

이번 작업의 핵심은 문서를 줄이는 것 자체가 아니라, 에이전트가 첫 화면만 읽고도 바로 행동할 수 있도록 `AGENTS.md`를 다시 실행 문서로 복구하는 것이다. 상세 구조, 예시 트리, 작업/검증/문서 sync 해설은 별도 문서로 이동하되, 문서 체계는 더 복잡하게 만들지 않는다.

## Problem Statement
현재 [AGENTS.md](/Users/abc/projects/GymCRM_V2/AGENTS.md)는 237줄로 커졌고, 실행 규칙과 설명 자료가 한 파일에 섞여 있다.

- 첫 화면에서 읽혀야 할 강한 규칙이 긴 배경 설명과 예시 트리 사이에 묻힌다.
- 브랜치 전략, package 구조, build/test 명령, documentation sync 규칙이 한 문서에 과밀하게 들어 있어 인덱스 문서로서의 속도가 떨어진다.
- `AGENTS.md`가 최상위 규칙 문서인지, 상세 설명서인지 역할이 흐려졌다.
- 현재 파일은 존재하지 않는 [docs/AGENTS.md](/Users/abc/projects/GymCRM_V2/docs/AGENTS.md)까지 참조하고 있어 reference hygiene도 깨져 있다.

사용자 목표는 OpenAI 권장처럼 짧은 목차형 규칙 문서로 되돌리는 것이며, 이미 브레인스토밍에서 다음 원칙이 확정됐다 `(see brainstorm: docs/brainstorms/2026-03-25-agents-md-slimming-brainstorm.md)`.

- `AGENTS.md`는 “지금 당장 행동에 필요한 규칙”만 담는다.
- 상세 문서는 2개만 둔다.
- `AGENTS.md`는 최상위 source of truth로 유지한다.
- 목표 길이는 약 100줄 내외로 둔다.

## Proposed Solution
문서 구조를 아래처럼 재편한다.

1. [AGENTS.md](/Users/abc/projects/GymCRM_V2/AGENTS.md)
   - 절대 규칙
   - 핵심 실행 기본값
   - 브랜치 전략 요약
   - backend/frontend 최소 실행 규칙
   - 보조 문서 링크와 우선순위
2. 신규 문서 A: branch/work rules
   - 브랜치 전략 상세
   - 작업 단위 원칙
   - 검증 기준
   - 문서 sync 규칙
3. 신규 문서 B: backend structure rules
   - backend package 기본 구조
   - `common` 경계
   - feature-first 기본 구조
   - 예시 트리와 예외

문서 계층은 고정한다 `(see brainstorm: docs/brainstorms/2026-03-25-agents-md-slimming-brainstorm.md)`.

- [AGENTS.md](/Users/abc/projects/GymCRM_V2/AGENTS.md): agent-operational source of truth
- 상세 문서 2개: [AGENTS.md](/Users/abc/projects/GymCRM_V2/AGENTS.md)를 보조하는 참조 문서
- 충돌 시 [AGENTS.md](/Users/abc/projects/GymCRM_V2/AGENTS.md)를 우선

## Research Summary

### Local Findings
- 현재 [AGENTS.md](/Users/abc/projects/GymCRM_V2/AGENTS.md)는 237줄이다.
- [02_시스템_아키텍처_설계서.md](/Users/abc/projects/GymCRM_V2/docs/02_%EC%8B%9C%EC%8A%A4%ED%85%9C_%EC%95%84%ED%82%A4%ED%85%8D%EC%B2%98_%EC%84%A4%EA%B3%84%EC%84%9C.md)는 `main / develop / feature` 브랜치 전략과 `common` 구조, `ApiResponse` 규약을 이미 설명하고 있다.
- 저장소 메모 문서인 [2026-03-23-member-module-package-patterns.md](/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-23-member-module-package-patterns.md)는 `AGENTS.md`를 작업 규칙 문서, 구조 노트를 구현 가이드로 분리하는 방식이 유효함을 보여준다.
- documentation gap 학습 문서들은 plan/checklist/status/evidence를 같은 delivery unit에서 함께 갱신하지 않으면 drift가 생긴다고 반복적으로 경고한다.
- 현재 [AGENTS.md](/Users/abc/projects/GymCRM_V2/AGENTS.md)의 reference 목록에는 실제로 존재하지 않는 [docs/AGENTS.md](/Users/abc/projects/GymCRM_V2/docs/AGENTS.md)가 포함돼 있다.

### Planning Implications
- 이번 작업은 단순 문장 축약이 아니라 문서 책임 분리 작업이다.
- 새 보조 문서의 이름과 위치는 찾기 쉬워야 하고, 3개 이상으로 세분화하면 안 된다 `(see brainstorm: docs/brainstorms/2026-03-25-agents-md-slimming-brainstorm.md)`.
- [AGENTS.md](/Users/abc/projects/GymCRM_V2/AGENTS.md)는 링크 인덱스만 남긴 빈 문서가 되어서는 안 되고, 브랜치와 실행 규칙의 최소 셋은 본문에 유지해야 한다 `(see brainstorm: docs/brainstorms/2026-03-25-agents-md-slimming-brainstorm.md)`.

## Scope

### In Scope
- [x] `AGENTS.md`를 약 100줄 내외로 재구성
- [x] `AGENTS.md`에 남길 최소 규칙 세트 정의
- [x] 상세 문서 2개의 이름, 위치, 책임 확정
- [x] 현재 `AGENTS.md` 섹션을 새 목적지로 매핑
- [x] 브랜치/작업 규칙 문서 작성
- [x] 백엔드 구조 규칙 문서 작성
- [x] 문서 간 source-of-truth 우선순위와 링크 정리
- [x] 깨진 참조 정리

### Out of Scope
- [ ] 백엔드 실제 패키지 구조 변경
- [ ] [02_시스템_아키텍처_설계서.md](/Users/abc/projects/GymCRM_V2/docs/02_%EC%8B%9C%EC%8A%A4%ED%85%9C_%EC%95%84%ED%82%A4%ED%85%8D%EC%B2%98_%EC%84%A4%EA%B3%84%EC%84%9C.md) 자체 개편
- [ ] 프론트엔드 구조 규칙을 별도 상세 문서로 확장
- [ ] 전체 문서 체계 재정비

## Implementation Plan

### Phase 1: Define the Slim Boundary for AGENTS.md
목표: [AGENTS.md](/Users/abc/projects/GymCRM_V2/AGENTS.md)에 남길 항목과 빼낼 항목을 line-budget 기준으로 고정한다.

작업:
- [x] 현재 섹션을 `must keep in AGENTS`, `move to docs`, `delete/compress`로 분류
- [x] 약 100줄 내외 목표를 section budget으로 나눈다
- [x] `AGENTS.md`에 남길 최소 셋을 확정한다
  - 문서 목적
  - 절대 규칙
  - 브랜치 전략 요약
  - backend/frontend 핵심 실행 기본값
  - 보조 문서 링크와 우선순위
- [x] build/test 명령과 example tree를 `AGENTS.md` 본문에서 제거할지 최종 결정

산출물:
- [x] keep/move/delete mapping
- [x] line-budget outline

성공 기준:
- [x] 무엇을 남기고 무엇을 옮길지 모호함이 없다
- [x] [AGENTS.md](/Users/abc/projects/GymCRM_V2/AGENTS.md)를 100줄 내외로 유지할 수 있는 구조가 확보된다

### Phase 2: Define the Two Supporting Documents
목표: 보조 문서 2개의 책임과 이름을 확정한다.

작업:
- [x] `docs/` 아래 최종 경로를 결정한다
- [x] 문서 A를 `branch/work rules` 책임으로 고정한다
  - 브랜치 전략
  - 작업 단위
  - 검증 기준
  - 문서 sync 규칙
- [x] 문서 B를 `backend structure rules` 책임으로 고정한다
  - package 기본 구조
  - `common` 경계
  - feature-first 구조
  - example tree와 예외
- [x] 두 문서가 서로 중복 설명하지 않도록 boundary note를 작성한다

산출물:
- [x] detailed doc ownership note
- [x] target filenames and locations

성공 기준:
- [x] 2개 문서만으로 상세 설명을 수용할 수 있다
- [x] `AGENTS.md`와 보조 문서의 역할이 겹치지 않는다

### Phase 3: Map Current Sections to Their New Home
목표: 현재 장문의 [AGENTS.md](/Users/abc/projects/GymCRM_V2/AGENTS.md)에서 각 섹션이 어디로 이동할지 명시적으로 정리한다.

작업:
- [x] `Rule Hierarchy`, `Non-Negotiable Rules`, `Frontend Defaults`에서 축약 유지 대상 추린다
- [x] `Git Branch Strategy`, `Documentation Sync Rules`, `Operational Checklist`를 문서 A 대상 내용으로 정리한다
- [x] `Backend Dependency Rules`, `Common Boundary And Exceptions`, example tree를 문서 B 대상 내용으로 정리한다
- [x] `Build, Lint, And Test Commands`를 문서 A로 이동할지, 기존 다른 운영 문서로 위임할지 결정한다
- [x] 존재하지 않는 [docs/AGENTS.md](/Users/abc/projects/GymCRM_V2/docs/AGENTS.md) 참조를 제거 또는 교체한다

산출물:
- [x] section destination map
- [x] broken-reference cleanup decision

성공 기준:
- [x] 구현 단계에서 임의 판단 없이 섹션 이동을 수행할 수 있다

### Phase 4: Rewrite AGENTS.md as the Short Operational Index
목표: [AGENTS.md](/Users/abc/projects/GymCRM_V2/AGENTS.md)를 실행 규칙 중심의 짧은 문서로 다시 쓴다.

작업:
- [x] 문서 첫 화면에 목적과 강한 규칙을 배치
- [x] branch 전략은 요약만 남긴다
- [x] backend/frontend는 핵심 실행 기본값만 남긴다
- [x] 상세 문서 링크와 우선순위를 마지막에 명시한다
- [x] 문장을 설명형보다 명령형으로 압축한다
- [x] 최종 줄 수가 목표 범위를 크게 벗어나면 다시 줄인다

산출물:
- [x] slimmed [AGENTS.md](/Users/abc/projects/GymCRM_V2/AGENTS.md)

성공 기준:
- [x] 대략 100줄 내외
- [x] 첫 화면만 읽고도 branch/package/validation 기본 행동을 결정할 수 있다

### Phase 5: Author the Branch and Work Rules Reference
목표: [AGENTS.md](/Users/abc/projects/GymCRM_V2/AGENTS.md)에서 빠진 운영 해설을 문서 A에 정리한다.

작업:
- [x] `main / develop / feature/*` 전략을 상세하게 적는다
- [x] 작업 단위와 minimal diff 원칙을 구조화한다
- [x] relevant validation 기준을 정리한다
- [x] 문서 sync와 status/evidence 갱신 규칙을 포함한다
- [x] 필요 시 build/test 명령의 배치 위치를 이 문서에 수용한다

산출물:
- [x] branch/work rules reference doc

성공 기준:
- [x] 브랜치와 작업 검증 규칙을 상세하게 확인할 단일 문서가 생긴다

### Phase 6: Author the Backend Structure Rules Reference
목표: backend 구조 설명, `common` 경계, example tree를 문서 B에 분리한다.

작업:
- [x] feature-first preferred default를 명시한다
- [x] legacy mixed-state와 예외를 함께 적는다
- [x] `common` dependency rule과 `common.auth`, top-level `audit` 예외를 포함한다
- [x] `common` example tree를 옮긴다
- [x] feature module example tree를 옮긴다
- [x] 현재 저장소 전체가 이미 통일됐다는 식의 표현은 제거한다

산출물:
- [x] backend structure rules reference doc

성공 기준:
- [x] 구조 설명이 [AGENTS.md](/Users/abc/projects/GymCRM_V2/AGENTS.md) 밖으로 빠지면서도, 후속 구조 작업에 필요한 맥락은 보존된다

### Phase 7: Validate Consistency, Links, and Length
목표: 분리 후 문서 체계가 실제로 더 가벼워지고 충돌이 없는지 검증한다.

작업:
- [x] [AGENTS.md](/Users/abc/projects/GymCRM_V2/AGENTS.md) 줄 수 확인
- [x] 모든 새 링크가 실제 파일을 가리키는지 확인
- [x] `AGENTS.md`가 보조 문서보다 우선이라는 문구가 일관되게 들어갔는지 점검
- [x] 문서 A/B가 서로 중복 설명하지 않는지 검토
- [x] 필요 시 기존 참조 문서 링크를 정리한다

산출물:
- [x] doc consistency check
- [x] link validation note

성공 기준:
- [x] 깨진 참조가 없다
- [x] `AGENTS.md`가 다시 짧은 운영 문서로 읽힌다

## Risks and Controls
- 위험: `AGENTS.md`를 너무 줄여 실행력이 떨어질 수 있다.
  - 대응: 브랜치 전략, 절대 규칙, backend/frontend 핵심 기본값은 본문에 유지한다 `(see brainstorm: docs/brainstorms/2026-03-25-agents-md-slimming-brainstorm.md)`.
- 위험: 보조 문서가 많아져 탐색 비용이 다시 커질 수 있다.
  - 대응: 상세 문서는 정확히 2개로 제한한다 `(see brainstorm: docs/brainstorms/2026-03-25-agents-md-slimming-brainstorm.md)`.
- 위험: 새 문서와 [AGENTS.md](/Users/abc/projects/GymCRM_V2/AGENTS.md) 사이에 source-of-truth 충돌이 생길 수 있다.
  - 대응: 모든 상세 문서에 `AGENTS.md 우선` 원칙을 명시한다.
- 위험: 실제 없는 참조 문서를 그대로 두고 넘어갈 수 있다.
  - 대응: 존재하지 않는 [docs/AGENTS.md](/Users/abc/projects/GymCRM_V2/docs/AGENTS.md) 링크는 이번 작업 범위 안에서 정리한다.

## Acceptance Criteria
- [x] [AGENTS.md](/Users/abc/projects/GymCRM_V2/AGENTS.md)가 약 100줄 내외다
- [x] [AGENTS.md](/Users/abc/projects/GymCRM_V2/AGENTS.md)는 실행 규칙만 담고 긴 설명은 제거됐다
- [x] 상세 문서 2개가 생성됐다
- [x] 문서 A는 브랜치/작업/검증/doc sync 규칙을 담는다
- [x] 문서 B는 backend 구조/`common`/feature template/example tree를 담는다
- [x] [AGENTS.md](/Users/abc/projects/GymCRM_V2/AGENTS.md)가 최상위 source of truth임이 분명하다
- [x] 깨진 참조가 없다

## Validation
- [x] `wc -l AGENTS.md`로 줄 수 확인
- [x] 새 상세 문서 경로 확인
- [x] 링크/참조 경로 수동 점검
- [x] 문서 우선순위 문구 점검

## Sources
- **Origin brainstorm:** [2026-03-25-agents-md-slimming-brainstorm.md](/Users/abc/projects/GymCRM_V2/docs/brainstorms/2026-03-25-agents-md-slimming-brainstorm.md)
- **Current target:** [AGENTS.md](/Users/abc/projects/GymCRM_V2/AGENTS.md)
- **Architecture reference:** [02_시스템_아키텍처_설계서.md](/Users/abc/projects/GymCRM_V2/docs/02_%EC%8B%9C%EC%8A%A4%ED%85%9C_%EC%95%84%ED%82%A4%ED%85%8D%EC%B2%98_%EC%84%A4%EA%B3%84%EC%84%9C.md)
- **Structure note:** [2026-03-23-member-module-package-patterns.md](/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-23-member-module-package-patterns.md)
- **Documentation-gap learning:** [prototype-plan-checklist-status-drift-gymcrm-20260227.md](/Users/abc/projects/GymCRM_V2/docs/solutions/documentation-gaps/prototype-plan-checklist-status-drift-gymcrm-20260227.md)
