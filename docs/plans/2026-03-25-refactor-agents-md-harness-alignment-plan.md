---
title: refactor: Rewrite AGENTS.md for Harness-style project rules
type: refactor
status: completed
date: 2026-03-25
origin: docs/brainstorms/2026-03-25-agents-md-rewrite-brainstorm.md
---

# refactor: Rewrite AGENTS.md for Harness-style project rules

## Enhancement Summary

**Deepened on:** 2026-03-25
**Deepened with:** architecture, pattern, documentation clarity, documentation-gap learning review

### Key Improvements
1. 규칙 계층을 `Non-Negotiable Rules / Defaults / Reference / Future Direction`으로 명시해 현재 규칙과 비구속적 설명을 분리했다.
2. 백엔드 구조 규칙을 “현재 repo-wide 강제 규칙”이 아니라 “새로 추가하거나 수정하는 feature 패키지의 preferred default”로 재정의했다.
3. `common`의 역할을 설명 수준이 아니라 dependency rule과 예외(`common.auth`, top-level `audit`)까지 포함한 경계 규칙으로 보강했다.
4. 문서 변경 특성에 맞는 `Documentation Sync Rules`, rollout/go-no-go, rollback, evidence ownership 규칙을 추가했다.

### New Considerations Discovered
- 아키텍처 문서에는 여전히 `release` 흐름이 남아 있으므로, `AGENTS.md`에서 `release`를 agent working branch가 아닌 deploy/release concern으로 분리해 설명해야 한다.
- 현재 저장소는 혼합 구조다. `member/membership/product/reservation/settlement`는 layered subpackage가 진전됐지만 `trainer/access/locker/crm/audit/integration`은 평평한 구조가 남아 있다.
- `common`은 순수 infra 패키지 집합이 아니라 `common.auth`처럼 mini-feature를 포함하는 hybrid 구조다.
- 문서 재작성도 운영 행위에 영향을 주므로, 단순 편집 완료가 아니라 smoke validation, ownership, rollback trigger가 필요하다.

## Reference Documents
- Primary target: [AGENTS.md](/Users/abc/projects/GymCRM_V2/AGENTS.md)
- Architecture reference: [02_시스템_아키텍처_설계서.md](/Users/abc/projects/GymCRM_V2/docs/02_%EC%8B%9C%EC%8A%A4%ED%85%9C_%EC%95%84%ED%82%A4%ED%85%8D%EC%B2%98_%EC%84%A4%EA%B3%84%EC%84%9C.md)
- Secondary agent doc: [docs/AGENTS.md](/Users/abc/projects/GymCRM_V2/docs/AGENTS.md)

`AGENTS.md`는 agent-operational source of truth로 재작성하되, [02_시스템_아키텍처_설계서.md](/Users/abc/projects/GymCRM_V2/docs/02_%EC%8B%9C%EC%8A%A4%ED%85%9C_%EC%95%84%ED%82%A4%ED%85%8D%EC%B2%98_%EC%84%A4%EA%B3%84%EC%84%9C.md)는 브랜치 전략과 backend/common 구조 설명의 근거 문서로 사용한다. 둘 사이에 불일치가 있으면 새 `AGENTS.md`에서 agent working rules를 더 명확히 정의하고, 아키텍처 문서는 explanatory reference로 취급한다.

## Overview
`AGENTS.md`를 참고성 문서에서 에이전트가 바로 따를 수 있는 강한 운영 규칙 문서로 재작성한다 `(see brainstorm: docs/brainstorms/2026-03-25-agents-md-rewrite-brainstorm.md)`. 이번 작업의 성공 기준은 문서 첫 화면만 읽어도 에이전트가 아래 세 가지를 즉시 답할 수 있게 만드는 것이다.

- 이 문서는 무엇인가
- 어떤 규칙이 반드시 지켜야 하는 규칙인가
- 어떤 브랜치/패키지 구조 규칙을 따라야 하는가

핵심 목표는 규칙 우선순위를 분리하고, 저장소의 공식 브랜치 전략과 백엔드 구조 원칙을 오해 없이 고정하는 것이다. 프론트엔드는 이번 재작성의 중심이 아니므로 기존 React/TypeScript 기본 원칙만 간결하게 유지한다.

## Problem Statement / Motivation
현재 [AGENTS.md](/Users/abc/projects/GymCRM_V2/AGENTS.md)는 빌드/테스트 명령, 아키텍처, 운영 베스트 프랙티스를 폭넓게 담고 있지만, 문제와 영향이 분리되어 있지 않다.

- 규칙 계층이 없다.
  - 결과: 에이전트가 “반드시 지킬 규칙”과 “배경 설명”을 구분하지 못한다.
- 브랜치 전략이 저장소 운영 규칙으로 고정되어 있지 않다.
  - 결과: `develop` 기반 작업 원칙과 옛 `release` 흐름이 동시에 읽혀 두 개의 공식 진실이 생긴다.
- 백엔드 구조 설명이 현재 강제 규칙인지, 앞으로의 기본 방향인지 분리되어 있지 않다.
  - 결과: 혼합 구조 저장소를 이미 완전히 통일된 것처럼 잘못 문서화할 위험이 있다.
- `common` 경계가 설명형 문장만 있고 dependency rule과 예외가 없다.
  - 결과: 어떤 공통 책임이 `common`에 들어가고 어떤 것은 feature나 top-level module에 남아야 하는지 판단 기준이 약하다.
- 프론트엔드와 운영 기본값이 백엔드 구조 규칙과 같은 무게로 섞여 있다.
  - 결과: 문서의 핵심 의도인 branch/package 규칙이 묻힌다.

이 상태는 사람이 읽을 때도 애매하고, 에이전트가 문서를 실행 규칙으로 사용할 때는 더 큰 모호성을 만든다.

## Proposed Solution
문서 재작성 원칙:
- 문서 정체성은 `프로젝트 소개`가 아니라 `에이전트 운영 규칙`으로 둔다.
- 규칙 계층을 명시한다.
  - `Non-Negotiable Rules`: 현재 즉시 적용되는 강제 규칙
  - `Defaults`: 기본적으로 따를 현재 선호 패턴
  - `Reference`: 설명과 맥락을 위한 비구속성 정보
  - `Future Direction`: 있다면 명시적으로 비구속성으로 표기
- 문서 앞부분에서 비협상 규칙을 먼저 보여준다.
- Git 전략은 `main / develop / feature/*`를 agent working branch 표준으로 고정한다.
  - `release`가 남아 있더라도 deploy/release concern으로만 취급하고, agent working branch로는 다루지 않는다.
- 백엔드는 `feature-first`를 새로 추가하거나 수정하는 feature 패키지의 preferred default로 둔다.
- `common`은 공통 인프라와 횡단 관심사의 primary home으로 정의하되, dependency rule과 예외를 함께 적는다.
- 문서 안에 `common` 예시 트리와 일반 feature 모듈 예시 트리를 둘 다 포함한다.
- 프론트엔드는 현재 수준의 짧은 기본 규칙만 유지한다. 여기서 “짧다”는 뜻은 구조 정책을 추가하지 않고, 스타일/API utility/검증 기본값만 4~6개 bullet 안에 유지하는 것이다.

이 순서는 에이전트가 첫 화면에서 강제 규칙을 먼저 보고, 세부 구조와 실행 명령은 뒤에서 참조하게 만들기 위한 것이다.

예상 섹션 구조:

```text
1. Purpose
2. Rule Hierarchy
3. Non-Negotiable Rules
4. Git Branch Strategy
5. Backend Dependency Rules
6. Common Boundary and Exceptions
7. Feature Module Template
8. Backend API Contract Defaults
9. Frontend Defaults
10. Build/Test Commands
11. Operational Checklist
```

## Research Summary

### Local Findings
- 현재 [AGENTS.md](/Users/abc/projects/GymCRM_V2/AGENTS.md)는 빌드/테스트, 아키텍처, 운영 원칙을 한 문서에 담고 있으나, 규칙 강도와 우선순위가 분리되어 있지 않다.
- [02_시스템_아키텍처_설계서.md](/Users/abc/projects/GymCRM_V2/docs/02_%EC%8B%9C%EC%8A%A4%ED%85%9C_%EC%95%84%ED%82%A4%ED%85%8D%EC%B2%98_%EC%84%A4%EA%B3%84%EC%84%9C.md)는 이미 `main/develop/feature` 브랜치 전략과 `common` 중심 구조 예시를 담고 있어, 새 `AGENTS.md`의 근거 문서로 참조 가능하다.
- 코드베이스는 `ApiResponse` 표준 응답 규약과 `com.gymcrm.common.*` 기반 공통 패키지를 이미 실제로 사용하고 있다.
- 실제 패키지 구조는 혼합 상태다.
  - layered subpackage가 잘 보이는 feature: `member`, `membership`, `product`, `reservation`, `settlement`
  - 여전히 평평한 구조가 남아 있는 feature/top-level module: `trainer`, `access`, `locker`, `crm`, `audit`, `integration`
- `common`도 순수 infra only 구조가 아니라 hybrid다.
  - `common/api`, `common/config`, `common/error`, `common/security`, `common/logging`은 stable infra package에 가깝다.
  - `common/auth`는 `controller/entity/repository/service`를 포함한 mini-feature에 가깝다.

### Research Insights
- 이 plan은 외부 리서치 없이 repo 문서와 현재 코드 패턴만을 근거로 한다.
- documentation-gap 학습 관점에서, 실행/완료 조건과 문서 상태(`status`, 체크리스트, evidence location)는 같은 delivery unit에서 함께 갱신되도록 plan에 명시하는 편이 안전하다.

## Spec / Flow Analysis
이번 작업은 런타임 기능 추가가 아니라 운영 문서 재작성이다. 가장 중요한 reader behavior insight는 하나다.

- 에이전트는 문서 첫 30~50줄만 읽고 작업을 시작할 가능성이 높다.
  - 따라서 문서 첫 화면 안에서 문서 목적, 강제 규칙, 브랜치/패키지 규칙이 모두 드러나야 한다.

## Scope

### In Scope
- [x] 현재 `AGENTS.md`의 섹션 구조 전면 재편
- [x] 문서 목적을 “에이전트 운영 규칙” 중심으로 재정의
- [x] `main / develop / feature/*` 브랜치 전략을 공식 표준으로 명시
- [x] 백엔드 `feature-first` 기본 원칙 명시
- [x] `common` 모듈 공식 구조 설명 추가
- [x] `common` 예시 트리 추가
- [x] 일반 feature 모듈 예시 트리 추가
- [x] API 응답, DTO, 테스트, 검증 최소 기준 정리
- [x] 프론트엔드 규칙을 짧은 기본값 수준으로 압축
- [x] 문서 sync, rollout, rollback, evidence ownership 규칙 추가

### Out of Scope
- [ ] 실제 코드 패키지 구조 변경
- [ ] `docs/02_시스템_아키텍처_설계서.md` 자체 수정
- [ ] 프론트엔드 디렉터리 구조의 상세 표준화
- [ ] 다른 문서 전체를 이번 기회에 일괄 정리하는 작업

## Implementation Plan

### Phase 1: Validate Current-State Sources and Extract Keep/Replace Boundary
목표: 재작성 전에 현재 규칙과 레거시 예외를 검증하고, 유지할 내용과 버릴 내용을 분류한다.

작업:
- [x] 현재 [AGENTS.md](/Users/abc/projects/GymCRM_V2/AGENTS.md), [02_시스템_아키텍처_설계서.md](/Users/abc/projects/GymCRM_V2/docs/02_%EC%8B%9C%EC%8A%A4%ED%85%9C_%EC%95%84%ED%82%A4%ED%85%8D%EC%B2%98_%EC%84%A4%EA%B3%84%EC%84%9C.md), [docs/AGENTS.md](/Users/abc/projects/GymCRM_V2/docs/AGENTS.md) 사이의 우선순위를 정리
- [x] `AGENTS.md`를 agent-operational source of truth로 선언할지 plan에 명시
- [x] `release` 흐름을 deprecate할지, agent working branch 바깥의 deploy concern으로 남길지 결정
- [x] 현재 [AGENTS.md](/Users/abc/projects/GymCRM_V2/AGENTS.md)의 내용을 규칙/배경설명/명령어/권장사항으로 분류
- [x] 새 문서에 반드시 남길 불변 규칙 목록 작성
- [x] 백엔드 중심 재작성에 맞지 않는 장황한 설명 제거 후보 표시
- [x] 프론트엔드 항목 중 유지할 최소 규칙만 남김
- [x] 실제 패키지 예외(`trainer`, `access`, `locker`, `crm`, `audit`, `integration`, `common.auth`) 목록화

산출물:
- [x] current-state rule inventory
- [x] source-of-truth decision note
- [x] legacy exception list

성공 기준:
- 새 문서에 들어갈 핵심 규칙, 삭제/축약 대상, 예외 목록이 명확해진다.
- 두 개의 공식 진실처럼 읽히는 branch rule 충돌이 정리된다.

### Phase 2: Define Rule Hierarchy and Top-Level Structure
목표: 문서 첫 부분만 읽어도 운영 규칙이 보이도록 규칙 계층과 구조를 확정한다.

작업:
- [x] `Non-Negotiable Rules / Defaults / Reference / Future Direction` 계층 정의
- [x] 문서 첫머리에 Purpose / Non-Negotiable Rules 배치
- [x] `must`, `preferred`, `context` 성격이 드러나는 서술 방식 선택
- [x] Build/Test 명령 섹션은 유지하되 문서 후반으로 이동
- [x] Operational Checklist를 결론부에 배치
- [x] Frontend defaults와 Operational defaults를 분리

산출물:
- [x] top-level outline
- [x] rule taxonomy draft

성공 기준:
- 문서 상단에서 핵심 규칙과 문서 목적이 즉시 드러난다.
- 규칙 계층이 문서 구조만 봐도 구분된다.

### Phase 3: Lock the Git Branch Strategy
목표: 브랜치 전략을 예외 없는 공식 규칙으로 고정한다.

작업:
- [x] `main`: production deployment branch
- [x] `develop`: integration branch
- [x] `feature/*`: 모든 기능/수정 작업 브랜치
- [x] agent는 기본적으로 `develop`에서 `feature/*`를 생성한다는 운영 규칙 명시
- [x] 직접 `main` 또는 `develop`에 작업하지 않는 원칙 명시
- [x] hotfix 허용 여부와 처리 경로 명시
- [x] `release`가 남아 있다면 deploy/release concern이지 agent working branch는 아니라는 점 명시
- [x] release 흐름 설명은 짧게 유지하고 상세 배포 문맥은 참조 문서로 넘김

산출물:
- [x] branch strategy section draft
- [x] release contradiction resolution note

성공 기준:
- 에이전트가 어떤 브랜치에서 시작해야 하는지 해석할 여지가 없다.

### Phase 4: Define Backend Structure Rules
목표: 백엔드 구조를 “feature-first 기본 + common 공식 모듈”로 명확히 문서화한다.

작업:
- [x] backend 구조 규칙을 “repo-wide uniform current state”가 아니라 “new or edited feature packages의 preferred default”로 표현
- [x] feature 모듈 기본 규칙 서술
- [x] `controller/service/repository/entity/dto` 등 대표 계층 설명
- [x] 실제 강한 현재 규칙과 선호 구조를 분리
  - 현재 강한 규칙 예: `ApiResponse`, `@PreAuthorize(AccessPolicies.XXX)`, `ApiException + ErrorCode`, `CurrentUserProvider`
  - 선호 구조 예: layered subpackage, `dto/request`, `dto/response`
- [x] `common` 모듈의 역할과 허용 책임 범위 정의
- [x] `common` dependency rule 정의
  - `common` may contain shared platform capabilities, cross-cutting infra, framework integration
  - `common` must not depend on feature packages
  - feature packages may depend on `common`
  - cross-feature reuse does not automatically justify promotion to `common`
- [x] `common.auth`와 top-level `audit` 같은 예외를 별도 표기
- [x] 현재 코드베이스와 충돌하는 표현 제거

산출물:
- [x] backend dependency rules section
- [x] common boundary and exception notes

성공 기준:
- 새 파일을 어느 패키지에 둘지 판단 기준이 문서만으로 충분하다.
- 현재 강제 규칙과 선호 구조가 섞이지 않는다.

### Phase 5: Add Common and Feature Example Trees
목표: 해석을 줄이기 위해 예시 구조를 직접 제시한다.

작업:
- [x] 사용자가 제공한 `common` 트리를 문서에 예시로 반영
- [x] 일반 feature 모듈 예시 트리 작성
- [x] 예시가 “규칙 설명용”, “현재 예외 포함 hybrid 예시”, “보편 현재 상태 설명” 중 무엇인지 명확히 표기
- [x] 트리와 텍스트 규칙이 모순되지 않는지 검토
- [x] `common` 트리에 `common.auth` hybrid 성격 반영
- [x] feature 트리에서 dual entity naming을 hard rule처럼 보이지 않게 조정
  - `MemberEntity`와 `Member`를 모두 mandatory로 보이게 두지 않거나 optional variant로 표기
- [x] DTO placement, entity naming이 현재 repo에서는 혼합 상태임을 경고

예시 feature 트리 초안:

```text
backend/src/main/java/com/gymcrm/member/
├── controller/
│   └── MemberController.java
├── dto/
│   ├── request/
│   └── response/
├── entity/
│   └── MemberEntity.java
├── repository/
│   ├── MemberRepository.java
│   ├── MemberJpaRepository.java
│   └── MemberQueryRepository.java
└── service/
    └── MemberService.java
```

산출물:
- [x] labeled common example tree
- [x] labeled feature module example tree

성공 기준:
- `common`과 feature 모듈 규칙 차이가 예시만 봐도 이해된다.
- 예시가 현재 보편 상태를 과장하지 않는다.

### Phase 6: Compress Frontend Defaults and Define Operational/Documentation Sync Rules
목표: 프론트엔드 규칙은 짧게 유지하고, 문서 작업에 필요한 운영/동기화 규칙은 별도로 명확히 만든다.

작업:
- [x] 프론트엔드에 React + TypeScript, CSS Modules, 기존 API utilities 사용 원칙만 유지
- [x] 테스트/검증 최소 기준 정리
- [x] 작은 diff, 관련 테스트 실행, 기존 패턴 추종 같은 운영 기본값 명시
- [x] 과하게 일반적인 베스트 프랙티스는 제거
- [x] `Documentation Sync Rules` 섹션 추가
  - 구현/검증이 끝났으면 frontmatter `status`, phase checklist, acceptance criteria, validation checkboxes를 같은 delivery unit에서 갱신
  - scope가 끝났는데 문서 sync를 후속 cleanup으로 미루지 않음
- [x] evidence location rule 추가
  - 증빙은 `PR`, `docs/notes`, 또는 plan appendix에 남김

산출물:
- [x] frontend defaults section
- [x] operational defaults section
- [x] documentation sync rules section

성공 기준:
- 문서 초점은 백엔드 구조와 운영 규칙에 남고, 프론트엔드도 필요한 최소 정보는 유지한다.
- 프론트엔드 규칙과 운영/문서 sync 규칙이 분리된다.

### Phase 7: Rollout, Validation, Rollback, and Repo-Reality Review
목표: 새 `AGENTS.md`가 현재 코드와 심하게 어긋나지 않음을 검증하고, 머지 후 운영 리스크까지 관리한다.

작업:
- [x] `common.api.ApiResponse`, `common.error`, `common.config` 등 실제 패키지와 문서 일치 여부 확인
- [x] `member`, `membership`, `product`, `reservation`, `settlement`와 `trainer`, `access`, `locker`, `crm`, `audit`, `integration`의 차이를 검토해 현재/선호 구조 표기를 검증
- [x] “현재 규칙”과 “장기 목표 구조”가 섞이지 않도록 최종 문구 조정
- [x] 관련 문서 링크가 깨지지 않는지 점검
- [x] rollout/staging validation section 추가
  - rewritten `AGENTS.md` top-of-file smoke check
  - first-screen rule visibility 점검
  - branch strategy / backend structure / validation expectations이 첫 섹션에서 식별 가능한지 확인
- [x] post-merge monitoring subsection 추가
  - owner
  - monitoring window
  - signals: branch misuse, plan-status drift, validation-step confusion
- [x] go/no-go 기준 추가
  - ambiguous rule 존재 시 no-go
  - current repo conventions와 충돌하면 no-go
  - executable validation step이 없으면 no-go
- [x] rollback 규칙 추가
  - trigger
  - owner
  - `AGENTS.md` 이전 버전으로 revert하는 명시적 절차

산출물:
- [x] repo-reality validation checklist
- [x] rollout / go-no-go / rollback notes
- [x] ownership and evidence table

성공 기준:
- 문서가 현실과 괴리된 선언문이 아니라, 바로 사용할 수 있는 운영 규칙 문서가 된다.
- 문서 변경의 검증, 증빙, rollback 경로가 모두 명시된다.

## Risks and Mitigations
- 문서가 너무 길어져 다시 읽히지 않을 수 있다.
  - 문서 첫 화면의 `Non-Negotiable Rules`는 6개 안팎 bullet로 제한하고, 설명은 후반 섹션으로 보낸다.
- `common` 예시와 현재 코드 사이에 일부 차이가 있을 수 있다.
  - 모든 예시에 `current rule`, `exception`, `illustration` 중 하나를 붙여 해석 범위를 고정한다.
- 프론트엔드 규칙을 지나치게 줄이면 정보가 부족할 수 있다.
  - 프론트엔드 섹션은 스타일/API utility/검증 기본값만 남기고 구조 표준화는 별도 후속 작업으로 분리한다.
- 문서와 실행 상태가 다시 어긋날 수 있다.
  - final validation에 status/checklist/evidence sync review를 포함하고, 완료된 scope의 문서 갭은 같은 PR/turn에서 닫는다.

## Acceptance Criteria
- [x] `AGENTS.md`가 에이전트 운영 규칙 문서로 재구성된다.
- [x] 문서 상단에 비협상 규칙과 목적이 명확히 보인다.
- [x] Git 브랜치 전략이 `main / develop / feature/*`로 공식 표준화된다.
- [x] `release` 흐름과 branch strategy 충돌이 정리된다.
- [x] 백엔드 구조가 `preferred default for new/edited feature packages`로 설명되고, 현재 강제 규칙과 분리된다.
- [x] `common` dependency direction과 예외(`common.auth`, top-level shared concerns)가 명시된다.
- [x] `common` 예시 트리와 feature 모듈 예시 트리가 모두 포함된다.
- [x] 모든 예시가 `current rule`, `exception`, `illustration` 중 하나로 라벨링된다.
- [x] 프론트엔드 규칙은 현재 수준의 짧은 기본값으로 유지된다.
- [x] 문서가 현재 코드베이스 규칙과 심하게 충돌하지 않는다.
- [x] 문서 sync, rollout, rollback, ownership, evidence location 규칙이 포함된다.

## Validation
- [x] [AGENTS.md](/Users/abc/projects/GymCRM_V2/AGENTS.md) 최종 문안을 처음부터 끝까지 읽었을 때 섹션 순서가 목적에 맞는지 검토
- [x] top-of-file first-screen smoke check 수행
- [x] 브랜치 전략과 [02_시스템_아키텍처_설계서.md](/Users/abc/projects/GymCRM_V2/docs/02_%EC%8B%9C%EC%8A%A4%ED%85%9C_%EC%95%84%ED%82%A4%ED%85%8D%EC%B2%98_%EC%84%A4%EA%B3%84%EC%84%9C.md) wording이 모순되지 않는지 검토
- [x] `backend/src/main/java/com/gymcrm/common`, `member`, `membership`, `product`, `reservation`, `settlement`, `trainer`, `access`, `audit`, `integration`을 기준으로 예시와 현재 패턴 차이를 점검
- [x] linked path/doc references가 모두 열리는지 확인
- [x] plan status/checklist/evidence location sync review 수행

## Sources
- **Origin brainstorm:** [2026-03-25-agents-md-rewrite-brainstorm.md](/Users/abc/projects/GymCRM_V2/docs/brainstorms/2026-03-25-agents-md-rewrite-brainstorm.md)
- **Current target document:** [AGENTS.md](/Users/abc/projects/GymCRM_V2/AGENTS.md)
- **Secondary agent doc:** [docs/AGENTS.md](/Users/abc/projects/GymCRM_V2/docs/AGENTS.md)
- **Architecture reference:** [02_시스템_아키텍처_설계서.md](/Users/abc/projects/GymCRM_V2/docs/02_%EC%8B%9C%EC%8A%A4%ED%85%9C_%EC%95%84%ED%82%A4%ED%85%8D%EC%B2%98_%EC%84%A4%EA%B3%84%EC%84%9C.md)
- **Relevant learnings:** [member-summary-staging-rollout-checklist-gymcrm-20260306.md](/Users/abc/projects/GymCRM_V2/docs/solutions/documentation-gaps/member-summary-staging-rollout-checklist-gymcrm-20260306.md), [prototype-plan-checklist-status-drift-gymcrm-20260227.md](/Users/abc/projects/GymCRM_V2/docs/solutions/documentation-gaps/prototype-plan-checklist-status-drift-gymcrm-20260227.md), [post-phase11-plan-rollback-control-and-audit-retention-validation-gymcrm-20260304.md](/Users/abc/projects/GymCRM_V2/docs/solutions/documentation-gaps/post-phase11-plan-rollback-control-and-audit-retention-validation-gymcrm-20260304.md)
