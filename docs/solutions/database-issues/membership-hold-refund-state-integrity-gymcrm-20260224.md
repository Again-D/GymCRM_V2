---
module: Gym CRM Membership
date: 2026-02-24
problem_type: database_issue
component: database
symptoms:
  - "Concurrent hold requests could create multiple ACTIVE rows in membership_holds for the same membership"
  - "Refunding a HOLDING membership could leave membership_holds.hold_status='ACTIVE' on a REFUNDED membership"
root_cause: missing_index
resolution_type: code_fix
severity: high
tags: [membership-hold, refund-policy, concurrency, partial-unique-index, state-integrity]
---

# Troubleshooting: Membership Hold/Refund State Integrity in Gym CRM

## Problem

회원권 홀딩/환불 플로우에서 상태 정합성이 깨질 수 있었다. 동시 홀딩 요청 시 활성 홀딩 이력이 중복 생성될 수 있었고, `HOLDING` 상태에서 환불하면 활성 홀딩 이력이 열린 채로 남을 수 있었다.

## Environment

- Module: Gym CRM Membership
- Affected Component: membership hold/refund domain + `membership_holds` persistence
- Date: 2026-02-24

## Symptoms

- `membership_holds`에 동일 `membership_id`로 `hold_status='ACTIVE'` row가 2개 이상 생길 가능성
- `member_memberships.membership_status='REFUNDED'`인데 `membership_holds.hold_status='ACTIVE'`가 남는 비정합 상태 가능성
- UI에서 `HOLDING` 상태 회원권에 환불 버튼이 노출되어, 백엔드 정책과 상호작용이 혼란스러움

## What Didn't Work

**Attempted Solution 1:** 애플리케이션 선조회(pre-check)만으로 활성 홀딩 중복을 방지
- **Why it failed:** `findActiveByMembershipId()` 후 insert는 비원자적이라 동시 요청에서 둘 다 통과 가능했다. DB invariant가 없으면 레이스를 막을 수 없다.

**Attempted Solution 2:** 환불 서비스 로직만 수정하고 UI는 그대로 둠
- **Why it failed:** 백엔드에서 `HOLDING` 환불을 막아도 UI가 환불 폼/버튼을 계속 보여주면 사용자 혼란과 불필요한 실패 요청이 발생한다.

## Solution

홀딩/환불 상태 정합성을 **DB 제약 + 서비스 정책 + UI 가드** 3층으로 정렬했다.

### 1) DB invariant 추가 (핵심)

- `membership_holds`에 활성 홀딩 1건만 허용하는 partial unique index 추가
- 파일: `/Users/abc/projects/GymCRM_V2/backend/src/main/resources/db/migration/V5__enforce_single_active_hold_per_membership.sql`

```sql
create unique index if not exists uk_membership_holds_membership_active
    on membership_holds (membership_id)
    where hold_status = 'ACTIVE';
```

### 2) 홀딩 서비스 동시성 보호 보강

- 회원권 상태 변경을 "현재 상태 조건부" 업데이트로 변경 (`ACTIVE`일 때만 `HOLDING`)
- unique index 위반을 API `CONFLICT`로 매핑
- 파일:
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/membership/MembershipHoldService.java`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/membership/MemberMembershipRepository.java`

핵심 아이디어:
- `ensureNoActiveHoldExists()` 같은 pre-check는 유지하되, 최종 보장은 DB에서 수행
- 레이스 발생 시 서비스는 DB 예외를 `CONFLICT`로 변환해 사용자에게 일관된 에러를 반환

### 3) 환불 정책 명확화 (`HOLDING` 환불 금지)

- 프로토타입 정책에서 환불 가능 상태를 `ACTIVE`만 허용하도록 제한
- `HOLDING` 상태는 먼저 해제 후 환불하도록 규칙 고정
- 파일: `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/membership/MembershipRefundService.java`

### 4) UI 가드 정렬

- 프론트에서 `HOLDING` 상태면 환불 폼/버튼 숨김
- 안내 문구 노출: `홀딩 상태 회원권은 먼저 해제 후 환불해주세요.`
- 파일: `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`

## Why This Works

1. **Root cause (DB invariant 부재):**
   - 애플리케이션 레벨 pre-check는 동시성 경쟁 조건에서 안전하지 않다.
   - "한 회원권당 활성 홀딩 1건"은 비즈니스 규칙이자 데이터 invariant이므로 DB 제약으로 강제해야 한다.

2. **서비스 레벨 보강의 역할:**
   - 상태 전이를 현재 상태 조건부 업데이트로 제한해 stale request 성공 가능성을 줄인다.
   - DB 제약 예외를 도메인 에러(`CONFLICT`)로 변환해 API 경험을 안정화한다.

3. **환불 정책 + UI 정렬의 역할:**
   - `HOLDING -> REFUNDED`를 허용하면 활성 홀딩 이력 정리 정책(`RESUMED`/`CANCELED`)까지 함께 정의해야 한다.
   - 프로토타입에서는 정책 복잡도를 줄이기 위해 `HOLDING 환불 금지`가 더 안전하다.
   - UI에서 같은 정책을 즉시 반영하면 실패 요청/혼란을 줄일 수 있다.

## Prevention

- **DB invariant는 DB 제약으로 먼저 모델링**: `ACTIVE 1건` 같은 규칙은 partial unique index 후보로 검토
- **pre-check만으로 동시성 안전하다고 가정하지 않기**: 최종 쓰기 경로에서 조건부 update / unique violation 처리 포함
- **상태 전이 정책 변경 시 UI/백엔드 동시 점검**: 백엔드만 막고 UI를 그대로 두지 않기
- **정합성 검증 로그 남기기**: `flyway_schema_history`, 인덱스 존재, UI 회귀 검증 결과를 문서화
- **통합 테스트에 실패 경로 포함**: 중복 ACTIVE hold insert 차단, HOLDING 환불 차단, 롤백 시나리오 확인

## Commands run

```bash
# Membership domain tests
cd /Users/abc/projects/GymCRM_V2/backend
GRADLE_USER_HOME=/Users/abc/projects/GymCRM_V2/.gradle-local ./gradlew test --no-daemon --tests 'com.gymcrm.membership.*'

# Verify Flyway V5 + index
docker exec gymcrm-postgres psql -U gymcrm -d gymcrm_dev -c "select version, success from flyway_schema_history where version='5';"
docker exec gymcrm-postgres psql -U gymcrm -d gymcrm_dev -c "\\d membership_holds"

# Frontend build after UI refund guard fix
cd /Users/abc/projects/GymCRM_V2/frontend
npm run build
```

## Validation Evidence

- `/Users/abc/projects/GymCRM_V2/docs/notes/phase3-refund-api-ui-validation-log.md`
- `/Users/abc/projects/GymCRM_V2/docs/testing/artifacts/holding-refund-message-validation.png`
- `/Users/abc/projects/GymCRM_V2/docs/testing/artifacts/holding-refund-message-validation-after-hold.png`
- `/Users/abc/projects/GymCRM_V2/todos/009-complete-p1-membership-hold-race-can-create-duplicate-active-holds.md`
- `/Users/abc/projects/GymCRM_V2/todos/010-complete-p2-refund-during-holding-leaves-active-hold-orphaned.md`

## Related Issues

No related issues documented yet.
