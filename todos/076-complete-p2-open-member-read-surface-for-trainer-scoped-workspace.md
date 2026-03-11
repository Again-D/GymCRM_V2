---
status: complete
priority: p2
issue_id: "076"
tags: [code-review, architecture, security, quality, backend, frontend, auth]
dependencies: []
---

# Open member read surface for trainer scoped workspace

## Problem Statement

플랜은 `ROLE_TRAINER`를 프런트 세션 타입과 예약 관리 워크스페이스에 도입하라고 되어 있지만, 실제로 트레이너가 사용해야 하는 `members` 읽기 surface를 어떻게 열지 명시하지 않습니다. 현재 `/api/v1/members` 와 `/api/v1/members/{memberId}` 는 `ROLE_TRAINER`를 허용하지 않으므로, 이 경계를 플랜에 추가하지 않으면 구현자가 프런트 타입만 열고 실제 조회 API는 계속 막힌 상태로 남길 가능성이 큽니다.

## Findings

- 플랜은 `ROLE_TRAINER` 프런트 세션 활성화와 member summary filter 확장을 범위에 포함합니다.
- 그러나 `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberController.java` 의 `list`/`detail`/`update` 는 여전히 `AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN_OR_DESK` 를 사용합니다.
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/common/security/AccessPolicies.java` 에는 trainer를 포함한 policy 상수가 이미 존재하지만, member controller에는 아직 적용되지 않았습니다.
- 현재 플랜은 `ROLE_TRAINER`가 어떤 member read endpoint를 통과해야 하는지, full member detail을 그대로 열지 아니면 trainer-scoped read DTO를 따로 둘지 결정이 빠져 있습니다.

## Proposed Solutions

### Option 1: Existing member read endpoints에 trainer scoped read 허용 추가

**Approach:** `/api/v1/members` 와 `/api/v1/members/{memberId}` 에 trainer role을 허용하고, service 레벨에서 trainer scope를 강제합니다.

**Pros:**
- 기존 프런트 흐름 재사용이 쉽습니다.
- 구현 범위가 가장 작습니다.

**Cons:**
- detail endpoint가 현재보다 더 민감한 데이터를 trainer에게 열 수 있습니다.
- service 레벨 scope 누락 시 권한 누수 위험이 있습니다.

**Effort:** Medium

**Risk:** Medium

---

### Option 2: trainer 전용 read endpoint를 별도로 추가

**Approach:** trainer 전용 list/detail endpoint 또는 DTO를 만들고, 예약 워크스페이스는 그 surface만 사용합니다.

**Pros:**
- 공개 데이터 범위를 더 명확히 통제할 수 있습니다.
- member 상세의 과노출을 줄이기 쉽습니다.

**Cons:**
- API surface가 늘어납니다.
- 초심자 구현 난도가 더 높습니다.

**Effort:** Medium-Large

**Risk:** Low-Medium

## Recommended Action


## Technical Details

**Affected files:**
- `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-10-feat-trainer-scoped-reservation-management-plan.md`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberController.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/common/security/AccessPolicies.java`

**Related components:**
- member summary query/service
- reservation workspace detail modal
- auth/session role handling

**Database changes (if any):**
- None directly, but service-level trainer scope must align with `assigned_trainer_id` query path.

## Resources

- **Plan:** `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-10-feat-trainer-scoped-reservation-management-plan.md`
- **Controller:** `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberController.java`
- **Access policy:** `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/common/security/AccessPolicies.java`

## Acceptance Criteria

- [ ] 플랜에 trainer가 어떤 member read endpoint를 사용할지 명시돼 있다.
- [ ] trainer가 member list/detail에 접근할 때의 backend authorization policy가 정의돼 있다.
- [ ] trainer scope가 controller annotation뿐 아니라 service/query 레벨에서도 강제된다는 점이 문서에 드러난다.
- [ ] member detail surface가 과도한 개인정보를 열지 않는지 결정이 반영돼 있다.

## Work Log

### 2026-03-11 - Initial Discovery

**By:** Codex

**Actions:**
- 플랜의 `ROLE_TRAINER` 세션/필터/예약 워크스페이스 항목을 검토했습니다.
- `MemberController` 와 `AccessPolicies` 를 대조해 trainer가 아직 member read surface를 통과하지 못한다는 점을 확인했습니다.
- 구현 전에 이 경계를 플랜에 고정해야 한다고 판단했습니다.

**Learnings:**
- 프런트 role 타입 확장만으로는 기능이 성립하지 않습니다.
- trainer가 어떤 member detail surface를 읽는지 먼저 정해야 이후 상세 모달과 개인정보 범위가 흔들리지 않습니다.

### 2026-03-11 - Plan Updated

**By:** Codex

**Actions:**
- 플랜에 trainer가 통과해야 하는 member list/detail read surface를 명시했습니다.
- 기존 member endpoint를 trainer까지 열 경우 service/query 레벨에서 `center scope + assigned_trainer_id scope`를 강제해야 한다는 점을 추가했습니다.
- 구현 선택지와 권장안을 플랜에 반영했습니다.

**Learnings:**
- 이 기능은 프런트 auth 타입보다 backend read surface 계약을 먼저 고정해야 안전합니다.
