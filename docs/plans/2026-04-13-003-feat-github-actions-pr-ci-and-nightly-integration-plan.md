---
title: "feat: Add GitHub Actions PR CI gates and nightly integration checks"
type: feat
status: completed
date: 2026-04-13
origin: docs/brainstorms/2026-04-13-pr-ci-gate-requirements.md
---

# feat: Add GitHub Actions PR CI gates and nightly integration checks

## Overview

PR 단계에서 머지 차단 게이트(Standard)를 제공하고, DB/Redis 의존 통합 테스트는 `develop` 기준으로 야간 스케줄에서 별도 실행한다. 야간 통합 테스트 실패 시에는 “알림 + 소프트 블록” 운영 규칙으로 회귀를 빠르게 드러내되, PR 머지 자체를 기계적으로 막지는 않는다.

## Problem Frame

현재 저장소는 `backend/`(Gradle/Spring Boot) + `frontend/`(Vite/TypeScript) 모노레포 구조지만 `.github/workflows/`가 없어 PR에서 “머지 가능한 상태인지”를 자동으로 판정할 수 없다 (see origin: `docs/brainstorms/2026-04-13-pr-ci-gate-requirements.md`).

또한 backend 테스트 중 일부는 로컬 Postgres/Redis(`localhost:5433`, `localhost:6379`) 의존을 갖고 있어 PR 기본 게이트에 포함하면 CI가 불안정해질 수 있다. 따라서 PR 게이트는 통합 테스트를 제외한 Standard 게이트로 고정하고, 통합 테스트는 야간 워크플로우로 분리한다.

## Requirements Trace

- R1-R2. PR 이벤트에서 자동 실행, 대상 브랜치 `develop`/`main`
- R3-R5. backend 변경 시 backend 게이트 통과 필요 (기본 게이트는 통합 테스트 제외)
- R6-R8. frontend 변경 시 frontend 게이트 통과 필요 (build/test/biome)
- R9-R11. path 기반으로 불필요한 실행 최소화, 배포/compose 기동은 PR 게이트 범위 밖
- R12-R13. 통합 테스트는 `develop` 기준 야간 스케줄 실행, 실패 시 알림 + 소프트 블록

## Scope Boundaries

- staging/production 배포, GitHub Environment 승인, ECR/S3 업로드는 포함하지 않는다.
- PR 머지 차단 게이트에서 DB/Redis 의존 통합 테스트를 필수로 강제하지 않는다.

## Context & Research

### Relevant Repo Signals

- Backend 빌드 표준은 Gradle wrapper이며 Java 21 toolchain을 사용한다: `backend/build.gradle`.
- Frontend는 `package-lock.json`이 있어 CI에서 `npm ci` 기반 설치가 가능하다: `frontend/package.json`, `frontend/package-lock.json`.
- 개발용 로컬 DB/Redis는 `compose.yaml`에 정의되어 있고, 다수의 backend 통합 테스트가 `localhost:5433`을 직접 참조한다: `compose.yaml`, `backend/src/test/java/**/*IntegrationTest.java`.
- `.github/workflows/`가 아직 없으므로 신규로 추가해야 한다.

### Institutional Learnings

- 문서/실행 드리프트는 “작동하는 자동화”가 붙기 전까지 반복적으로 다시 생기므로, 최소 CI를 빠르게 붙여 기준선을 고정하는 편이 안전하다.
  - `docs/solutions/documentation-gaps/prototype-plan-checklist-status-drift-gymcrm-20260227.md`

## Key Technical Decisions

- **PR 게이트는 Standard로 고정**한다 (origin 결정 존중).
  - backend: 기본 `test`는 통합 테스트 제외, 통과 시 머지 가능
  - frontend: build + test + biome check 통과 시 머지 가능
- **path 최적화는 “워크플로우 미실행”이 아니라 “워크플로우 실행 후 빠른 스킵”**으로 구현한다.
  - 이유: branch protection에서 “필수 체크”를 안정적으로 유지하려면 PR마다 체크가 동일하게 등장하는 편이 운영이 쉽다.
- **통합 테스트는 nightly로 분리**하고, 실패 시 알림 + 소프트 블록으로 운영한다.

## Open Questions

### Resolved During Planning

- path 최적화 방식은 “job 자체가 항상 존재”하도록 한다. (branch protection과의 결합을 단순화)

### Deferred to Implementation

- 알림 채널(Slack/Discord) 및 인증 방식(Webhook/App token) 선택
- nightly 스케줄 시간(예: KST 06:00)과 UTC 변환값
- 통합 테스트 스코프를 `*IntegrationTest` 전체로 둘지, flaky/high-cost 그룹을 추가로 분리할지
- Node 버전 고정 방식(`.nvmrc`/actions setup-node pinned version) 여부

## Implementation Units

- [x] **Unit 1: Add PR CI workflows (backend/frontend)**

**Goal:** PR에서 backend/frontend Standard 게이트를 수행하고, 결과를 머지 차단 체크로 노출한다.

**Requirements:** R1, R2, R3, R5, R6, R8, R9, Success Criteria

**Dependencies:** None

**Files:**
- Create: `.github/workflows/backend-ci.yml`
- Create: `.github/workflows/frontend-ci.yml`

**Approach:**
- 두 워크플로우 모두 `pull_request` 트리거로 `develop`/`main`을 대상으로 실행한다.
- “변경이 없는 영역”은 job을 통째로 없애지 않고, 항상 job이 존재하되 빠르게 성공(skipped/green)으로 끝나도록 한다.
  - 예: 변경 파일 기반 필터 액션을 사용해 `backend/**` 또는 `frontend/**` 변경이 없는 경우 빌드/테스트 단계를 skip 처리한다.
- 체크 이름(job name)은 branch protection에서 요구 체크로 고정할 수 있도록 안정적인 문자열로 유지한다.
  - 권장: `backend-ci` / `frontend-ci`처럼 워크플로우와 동일한 의미를 갖는 고정 이름

**Patterns to follow:**
- backend Gradle wrapper 표준: `backend/gradlew`, `backend/build.gradle`
- frontend npm ci 표준: `frontend/package-lock.json`

**Test scenarios:**
- Happy path: backend 파일 변경 PR에서 backend CI가 실행되고 “green”이 된다.
- Happy path: frontend 파일 변경 PR에서 frontend CI가 실행되고 “green”이 된다.
- Edge case: docs-only 변경 PR에서 backend/frontend CI job은 존재하되 빌드/테스트 단계는 skip되어 “green”이 된다.
- Error path: backend unit test 실패 시 backend CI가 실패로 표시되어 머지가 차단된다.
- Error path: frontend build/test/biome 중 하나가 실패하면 frontend CI가 실패로 표시되어 머지가 차단된다.

**Verification:**
- PR 화면에서 backend/frontend 체크가 항상 나타나며, 변경 영역에 따라 실제 실행/스킵이 합리적으로 동작한다.

- [x] **Unit 2: Split backend unit tests vs DB/Redis integration tests**

**Goal:** PR 기본 게이트에서 backend `test`가 DB/Redis 의존 통합 테스트 때문에 실패하지 않도록 분리한다.

**Requirements:** R4, R11, Key Decisions

**Dependencies:** Unit 1 (선후는 바뀌어도 무방하나, CI를 붙이기 전에 분리가 되어야 PR 게이트가 안정적이다)

**Files:**
- Modify: `backend/build.gradle`

**Approach:**
- 기본 `test` task에서 `*IntegrationTest`를 제외한다.
- 별도 Gradle task(예: `integrationTest`)를 추가해 `*IntegrationTest`를 실행할 수 있게 한다.
- 로컬 개발/운영 기준선에서 “통합 테스트를 어디서 돌리는지”가 명확해지도록, task naming을 문서와 워크플로우에서 일관되게 사용한다.

**Patterns to follow:**
- Querydsl generated source 경로 고정/CI 드리프트 방지 맥락: `docs/plans/2026-03-09-refactor-backend-jpa-querydsl-openapi-alignment-plan.md`

**Test scenarios:**
- Happy path: `test` 실행 시 DB가 없어도 `*IntegrationTest`는 실행되지 않아 테스트 단계가 안정적으로 끝난다.
- Happy path: `integrationTest` 실행 시 DB/Redis가 준비된 환경에서 `*IntegrationTest`가 실행된다.
- Edge case: 기존에 `*IntegrationTest`가 아닌 이름이지만 DB 의존이 있는 테스트가 발견되면, 이름 규칙 또는 태그 정책으로 편입할 수 있다. (발견 시 문서 갱신)

**Verification:**
- PR CI의 backend 게이트가 DB/Redis 없이도 안정적으로 통과/실패를 판정한다.
- nightly 통합 테스트 워크플로우에서 통합 테스트만 실행할 수 있다.

- [x] **Unit 3: Add nightly integration workflow (develop)**

**Goal:** `develop` 최신 기준으로 DB/Redis 의존 통합 테스트를 야간에 실행하고, 실패 시 알림 + 소프트 블록으로 연결한다.

**Requirements:** R12, R13, Success Criteria

**Dependencies:** Unit 2 (integration test task가 준비돼 있어야 nightly가 단순해진다)

**Files:**
- Create: `.github/workflows/nightly-integration.yml`
- Use: `compose.yaml`

**Approach:**
- `schedule` 트리거로 야간 실행한다. 실행 ref는 `develop` 최신이다.
- GitHub Actions cron은 UTC 기준이므로, KST 기준 실행 시각을 UTC로 변환해 반영한다.
- 워크플로우 내에서 `compose.yaml`로 Postgres/Redis를 기동하고, backend `integrationTest`를 실행한다.
- 실패 시에는 팀 채널로 알림을 보낸다. (채널/인증 방식은 deferred)
- 알림 메시지에는 최소한 다음을 포함한다: 실패 워크플로우 링크, 실패 job, 실패한 테스트(가능하면).
- “소프트 블록”은 GitHub Actions가 강제하는 기계적 차단이 아니라 운영 규칙으로 문서화한다.

**Test scenarios:**
- Happy path: `develop`에서 통합 테스트가 통과하면 nightly가 green으로 끝난다.
- Error path: 통합 테스트가 실패하면 워크플로우는 red가 되고 알림이 전송된다.
- Edge case: compose 서비스 기동 실패/헬스체크 실패 시도 알림이 전송되고, 원인(서비스/로그)이 추적 가능해야 한다.

**Verification:**
- 스케줄 실행이 매일 한 번 발생하며, 실패 시 팀이 “당일 내 복구”로 연결할 수 있는 정보가 남는다.

- [x] **Unit 4: Document CI expectations for contributors**

**Goal:** PR 게이트와 nightly 통합 테스트의 “어디서 무엇이 돌아가는지”를 문서로 고정해 팀 혼선을 줄인다.

**Requirements:** Success Criteria, Institutional Learnings

**Dependencies:** Unit 1-3

**Files:**
- Modify: `README.md` (CI 관련 짧은 섹션 추가)
- Modify: `docs/brainstorms/2026-04-13-pr-ci-gate-requirements.md` (필요 시 운영 규칙을 더 명확히)

**Approach:**
- PR 게이트에 포함되는 것(Standard)과 nightly에서만 돌리는 통합 테스트를 한 문단으로 분리해 설명한다.
- 통합 테스트 로컬 실행의 전제(로컬 compose로 DB/Redis 준비)만 간단히 언급하고, 상세는 후속 문서로 분리 가능하게 한다.

**Test scenarios:**
- Test expectation: none -- documentation-only change

**Verification:**
- 신규 기여자가 “PR에서 무엇이 막히는지 / 통합 테스트는 언제 도는지”를 README만 보고 이해할 수 있다.

## System-Wide Impact

- **Developer workflow:** PR 머지 전 자동 품질 게이트가 생기며, 실패 시 머지 차단이 발생한다.
- **Operational posture:** nightly 실패는 강제 차단이 아니라 운영 규칙(SLA)으로 대응하므로, 팀 합의가 필요하다.
- **CI stability risks:** 통합 테스트 분리가 부정확하면 PR 게이트가 flaky 해질 수 있다.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| path 최적화를 `paths:` 트리거로만 처리해 required check가 PR에 나타나지 않는 문제 | “항상 실행 + 빠른 스킵” 방식으로 job 존재를 보장한다 |
| `*IntegrationTest` 규칙 밖의 DB 의존 테스트가 PR 게이트로 새어 들어옴 | 발견 즉시 이름/태그 정책으로 편입하고, CI 기준선에 반영한다 |
| nightly 알림이 설정되지 않아 실패가 방치됨 | 최소 알림부터 먼저 붙이고, 운영 규칙(소프트 블록)을 README/문서로 고정한다 |
| GitHub Actions runner에서 compose/포트/헬스체크 이슈 | compose healthcheck 기반 대기 + 실패 시 로그 노출로 원인 추적 가능하게 한다 |

## Documentation / Operational Notes

- Branch protection의 “필수 체크”는 워크플로우 적용 이후 GitHub 설정에서 별도로 고정해야 한다.
- “소프트 블록”은 자동화가 아니라 팀 운영 규칙이므로, 합의된 대응 시간(예: 당일 12:00 KST)과 담당자를 명확히 두는 편이 좋다.

## Sources & References

- Origin document: `docs/brainstorms/2026-04-13-pr-ci-gate-requirements.md`
- Local dev services: `compose.yaml`
- Backend build: `backend/build.gradle`
