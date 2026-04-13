---
date: 2026-04-13
topic: pr-ci-gate
---

# PR CI Gate (GitHub Actions)

## Problem Frame
현재 저장소는 `backend/`(Gradle/Spring Boot)와 `frontend/`(Vite/TypeScript)로 구성된 모노레포다. 하지만 PR에서 “머지 가능한 상태인지”를 자동으로 판정하는 GitHub Actions 워크플로우가 아직 없다.

이 문서는 PR 단계에서 **머지 차단 게이트**(CI)를 어디까지 강제할지와, 어떤 결과를 “통과”로 볼지 요구사항을 고정한다.

## Requirements

**Triggers**
- R1. PR 이벤트에서 자동으로 CI가 실행된다.
- R2. PR 대상 브랜치는 최소 `develop`과 `main`을 포함한다.

**Backend Gate**
- R3. `backend/` 변경이 포함된 PR은 backend CI 게이트를 통과해야 머지가 가능하다.
- R4. backend 게이트는 `backend/` 기준으로 `./gradlew test`를 실행하되, DB/Redis가 필요한 통합 테스트는 기본 게이트에서 제외한다. (예: `*IntegrationTest` 네이밍 규칙 기반 제외)
- R5. backend 게이트는 테스트 실패 시 머지를 차단한다.

**Frontend Gate**
- R6. `frontend/` 변경이 포함된 PR은 frontend CI 게이트를 통과해야 머지가 가능하다.
- R7. frontend 게이트는 `frontend/` 기준으로 아래를 순서대로 실행한다.
  - `npm ci`
  - `npm run build`
  - `npm run test`
  - `npx biome check` (변경된 파일만)
- R8. 위 단계 중 하나라도 실패하면 머지를 차단한다.

**Scope Rules**
- R9. path 기반 필터링으로 불필요한 실행을 줄인다.
  - branch protection/required check 운영을 단순화하기 위해 workflow/job은 PR마다 항상 존재하되,
    변경이 없는 영역은 step을 빠르게 skip하여 green으로 끝낸다.
- R10. PR CI 게이트에는 배포(staging/production)를 포함하지 않는다.
- R11. PR CI 게이트에 Docker/`compose.yaml` 기반의 Postgres/Redis 기동은 기본 포함하지 않는다. (통합 테스트는 별도 정책으로 분리)
- R12. DB/Redis가 필요한 통합 테스트는 **야간 스케줄**로 별도 실행한다. 실행 기준 ref는 `develop` 최신이다.
- R13. 야간 통합 테스트 실패 시 동작은 “알림 + 소프트 블록”이다.
  - 알림: 실패 사실과 실패한 job 링크를 팀 채널로 전파한다.
  - 소프트 블록: 원인 파악 전까지 `develop` 머지를 자제하고, 당일 오전(예: 12:00 KST)까지 복구를 목표로 한다.
  - (임시) 팀 채널 연동 전까지는 GitHub Issue 생성/갱신으로 실패 알림을 남긴다.

## Success Criteria
- PR이 backend/frontend 게이트 중 해당되는 체크를 모두 통과해야만 머지 가능하다.
- CI 실패 원인이 PR 화면에서 빠르게 식별 가능하다. (어떤 job/스텝이 실패했는지 명확)
- 야간 통합 테스트 실패가 “방치”되지 않고, 다음 영업일 내 복구 흐름으로 연결된다.

## Scope Boundaries
- GitHub Environment 승인, staging/production 배포, ECR/S3 업로드는 이 요구사항 범위 밖이다.
- DB/Redis가 필요한 통합 테스트를 PR 머지 차단의 기본 게이트로 강제하지 않는다.
  - 대신 야간 통합 테스트로 커버하고, 실패 시 알림 + 소프트 블록 운영 규칙으로 리스크를 관리한다.

## Key Decisions
- 머지 차단 게이트 수준은 **Standard**로 고정한다.
  - backend: `./gradlew test` (통합 테스트 제외)
  - frontend: `npm run build` + `npm run test` + `biome check`
  - 이유: 일부 backend 통합 테스트는 로컬 Postgres/Redis 의존(예: `localhost:5433`, `localhost:6379`)이 있어 PR 기본 게이트에 포함하면 CI가 불안정해질 수 있다.

## Dependencies / Assumptions
- GitHub 저장소에서 Branch protection rule로 “필수 체크”를 설정한다. (어떤 체크 이름을 필수로 둘지는 계획 단계에서 확정)
- `frontend/`는 CI에서 `npm ci`로 설치 가능해야 한다.
- 야간 통합 테스트를 위한 실행 환경은 Docker를 사용할 수 있어야 한다. (`compose.yaml` 기반)
- 알림 전파 채널(Slack/Discord 등)과 Webhook/토큰은 계획 단계에서 결정한다.

## Outstanding Questions

### Resolve Before Planning
- (없음)

### Deferred to Planning
- [Affects R9][Technical] path 필터링을 “변경된 파일 기준”으로만 할지, “항상 둘 다 실행”으로 단순화할지
- [Affects R4][Technical] backend 테스트를 1 job으로 고정할지, `test`와 `compileJava`를 분리해 실패 원인을 더 빠르게 좁힐지
- [Affects Success Criteria][Technical] CI 실행 시간 목표(예: PR당 P95 10분/15분)를 명시할지
- [Affects R12][Technical] 통합 테스트 스코프를 `*IntegrationTest` 전체로 둘지, flaky/고비용 테스트를 별도 그룹으로 분리할지
- [Affects R13][Needs research] GitHub Actions에서 실패 알림을 보낼 최소 구성(채널, 인증 방식, 포맷)

## Next Steps
→ `/ce:plan` for structured implementation planning
