# Prototype Commit Strategy (Current Workspace State)

- Date: 2026-02-24
- Context: `/Users/abc/projects/GymCRM_V2` is a Git repo, but the current prototype files are mostly `untracked`

## Summary

현재 시점에서는 `backend/`, `frontend/`, `docs/`, `todos/` 등 거의 전체가 `untracked` 상태이므로, 과거 작업 단위별 커밋 히스토리를 깔끔하게 재구성하는 비용이 매우 높다.

권장 전략은 아래와 같다.

1. **기준 스냅샷 1커밋**으로 현재 프로토타입 완료본을 먼저 고정
2. 이후 변경부터는 **기능 단위 분할 커밋**으로 진행

## Why This Strategy

- 현재 워크트리 전체가 신규 파일로 보이기 때문에 `git add -p`로도 의미 있는 히스토리 분리가 어렵다
- 백엔드/프론트/문서/테스트가 서로 교차 의존하여 중간 커밋이 쉽게 깨질 수 있다
- 프로토타입은 이미 문서/검증 산출물 기준으로 완료 판정됨
- 지금 필요한 것은 “완벽한 과거 히스토리”보다 “안정적인 기준점 확보”다

## Recommended Approach (Baseline First)

### Step 1. Create a Feature Branch

`main`에 직접 커밋하지 말고 브랜치를 먼저 만든다.

```bash
cd /Users/abc/projects/GymCRM_V2
git checkout -b codex/prototype-baseline
```

### Step 2. Review Scope to Commit

```bash
git status --short
```

확인 포인트:
- 포함: `backend/`, `frontend/`, `compose.yaml`, `docs/`, `README.md`, `.gitignore`, `todos/`
- 제외(있다면): 개인 IDE 설정, 로컬 캐시, OS 임시 파일

### Step 3. Create Baseline Commit

```bash
git add .gitignore README.md compose.yaml backend frontend docs todos
git commit -m "feat(prototype): add gym crm admin portal core prototype baseline"
```

권장 커밋 메시지 설명:
- 현재 완성 상태의 프로토타입를 기준점으로 고정하는 목적
- 과거 단계별 히스토리 복원 대신 “검증 완료 baseline”을 명확히 남김

## Optional: Two-Commit Variant (If You Want Slightly Better Separation)

히스토리를 아주 조금만 더 나누고 싶다면:

1. 코드/런타임 산출물 먼저
2. 문서/검증 로그/체크리스트 다음

예시:

```bash
git add .gitignore README.md compose.yaml backend frontend
git commit -m "feat(prototype): implement admin portal core desk workflows"

git add docs todos
git commit -m "docs(prototype): add plans, validation logs, and handoff artifacts"
```

주의:
- 문서가 코드와 강하게 연결되어 있어 완벽한 분리는 아님
- 중간 커밋에서도 테스트/빌드가 가능해야 함

## What Not To Do (Now)

- 단계별 과거 히스토리를 억지로 재현하려고 수십 개 커밋으로 쪼개기
- `git add .` 후 바로 `main`에 커밋
- 검증 없이 커밋 분할

## After Baseline (Normal Workflow Resumes)

기준 스냅샷 이후부터는 일반적인 기능 단위 커밋을 사용한다.

예시:
- `feat(auth): add jwt login endpoint`
- `feat(rbac): add center admin and desk role checks`
- `docs(api): align response format with traceId`

## Pre-Commit Verification (Recommended)

기준 스냅샷 전 최소 확인:

```bash
cd /Users/abc/projects/GymCRM_V2/backend
GRADLE_USER_HOME=/Users/abc/projects/GymCRM_V2/.gradle-local ./gradlew test --no-daemon

cd /Users/abc/projects/GymCRM_V2/frontend
npm run build
```

추가 권장:
- Docker DB 기동 상태에서 `backend` 실행 확인 (`Flyway v5`)
- 릴리즈/핸드오프 문서 링크 깨짐 여부 확인

## Related Docs

- `/Users/abc/projects/GymCRM_V2/docs/notes/prototype-release-notes.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/prototype-final-handoff-summary.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/prototype-completion-readiness-decision.md`
