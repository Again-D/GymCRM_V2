---
status: complete
priority: p2
issue_id: "002"
tags: [code-review, backend, security, configuration]
dependencies: []
---

# Harden no-auth guard beyond prod-profile-only check

## Problem Statement

프로토타입 no-auth 안전장치가 `prod` 프로필 활성화 여부만 기준으로 동작한다. 운영 환경이 실수로 `prod` 프로필 없이 배포되면 기본값(`no-auth-enabled=true`)으로 기동될 수 있어, 인증 없는 상태가 노출될 위험이 남아 있다.

## Findings

- `application.yml` 기본 설정에서 `app.prototype.no-auth-enabled` 기본값이 `true`다.
- `prod` 프로필 블록에서만 `no-auth-enabled: false`를 강제한다.
- `PrototypeModeGuard`는 `settings.isProdProfileActive()`일 때만 차단한다.
- 즉, 운영 배포가 `prod` 프로필을 누락하면 guard가 동작하지 않는다.

## Proposed Solutions

### Option 1: Allowlist 방식으로 no-auth 허용 환경을 제한 (권장)

**Approach:** no-auth는 `dev`, `staging` 등 명시적 허용 프로필에서만 켜지도록 검사하고, 그 외 프로필/무프로필에서는 차단한다.

**Pros:**
- 배포 실수에 강함
- 의도(프로토타입 전용)를 코드로 명확히 표현

**Cons:**
- 로컬 실행 기본값이 바뀌면 문서 갱신 필요

**Effort:** 30-60분

**Risk:** Low

---

### Option 2: 기본값을 `false`로 바꾸고 로컬에서만 명시적으로 활성화

**Approach:** `application.yml` 기본값을 안전한 값으로 두고, 개발 시 환경변수/프로필로만 no-auth를 켠다.

**Pros:**
- secure-by-default
- 운영 미스컨피그 위험 감소

**Cons:**
- 로컬 개발 편의성 감소 (매번 설정 필요)

**Effort:** 15-30분

**Risk:** Low

## Recommended Action

**To be filled during triage.**

## Technical Details

**Affected files:**
- `/Users/abc/projects/GymCRM_V2/backend/src/main/resources/application.yml:17`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/common/config/PrototypeModeGuard.java:16`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/common/config/PrototypeModeSettings.java:26`

**Related components:**
- Prototype mode safety policy
- Deployment configuration discipline

## Resources

- `/Users/abc/projects/GymCRM_V2/docs/notes/prototype-canonical-rules.md`
- `/Users/abc/projects/GymCRM_V2/docs/plans/2026-02-23-feat-gym-crm-admin-portal-core-prototype-plan.md`

## Acceptance Criteria

- [x] no-auth 허용 조건이 allowlist/secure-default 방식으로 강화됨
- [x] `prod` 프로필 누락 배포 시에도 no-auth가 안전하게 차단되거나 기본 비활성화됨
- [x] 로컬 실행 문서(`README` 또는 `docs/notes`)가 새 동작 기준과 일치함
- [x] 최소 1개 테스트 또는 재현 절차로 guard 동작 시나리오가 검증됨

## Work Log

### 2026-02-23 - Code Review Finding Created

**By:** Codex

**Actions:**
- no-auth 설정 기본값과 프로필 오버라이드 구조 점검
- `PrototypeModeGuard` 조건식 검토
- 운영 배포 프로필 누락 시나리오 리스크 정리

**Learnings:**
- “prod에서만 금지”는 프로토타입 안전장치로 충분하지 않다.
- 프로토타입일수록 기본값을 안전하게 두는 편이 사고를 줄인다.

### 2026-02-23 - Resolved with Profile Allowlist + Runtime Verification

**By:** Codex

**Actions:**
- 기본 no-auth 값을 `false`로 변경
- `dev/staging` allowlist 검사 추가
- `PrototypeModeGuardTest`로 허용/차단 케이스 테스트 추가
- `dev`, `staging` 런타임 기동 + `/api/v1/health` 응답 확인
- `prod + APP_PROTOTYPE_NO_AUTH_ENABLED=true` 강제 차단 런타임 확인

**Learnings:**
- 프로필 allowlist + secure default 조합이 운영 실수에 더 강하다.

## Notes

- 브레인스토밍에서 no-auth를 선택했더라도, 배포 실수 방지는 별개로 강화 필요.
