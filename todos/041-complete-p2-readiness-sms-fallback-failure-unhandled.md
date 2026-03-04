---
status: complete
priority: p2
issue_id: "041"
tags: [code-review, reliability, integration]
dependencies: []
---

# Handle SMS fallback failure in readiness scenario

`ExternalIntegrationReadinessService` catches AlimTalk failure but calls SMS fallback without handling SMS-side `ExternalAdapterException`, causing the readiness flow to throw instead of returning a structured failure result.

## Problem Statement

When AlimTalk send fails, fallback to SMS is attempted. If SMS also fails (timeout/5xx/offline), the service currently throws an exception and exits early.
This breaks the contract of returning `ReadinessResult` and reduces operational visibility for double-failure scenarios.

## Findings

- In `backend/src/main/java/com/gymcrm/integration/ExternalIntegrationReadinessService.java:75-87`, AlimTalk failure is caught.
- Inside that catch block, `smsAdapter.send(...)` is called directly without nested exception handling.
- `SandboxSmsAdapter` can throw for `TIMEOUT`, `HTTP_5XX`, `OFFLINE` (`backend/src/main/java/com/gymcrm/integration/SandboxSmsAdapter.java`).
- Test coverage does not include AlimTalk+SMS double-failure path (`ExternalIntegrationReadinessServiceIntegrationTest`).

## Proposed Solutions

### Option 1: Return explicit failure outcome for fallback failure

**Approach:** Catch `ExternalAdapterException` around SMS send, log `message.sms.fallback.failed:*`, return `ReadinessResult` outcome such as `MESSAGE_FALLBACK_FAILED`.

**Pros:**
- Preserves structured result contract
- Improves observability and triage

**Cons:**
- Adds one new outcome state

**Effort:** 1-2 hours

**Risk:** Low

---

### Option 2: Keep exception behavior and document as fatal

**Approach:** Keep current throw path but document that fallback failure is terminal and should be handled by caller.

**Pros:**
- Minimal code changes

**Cons:**
- Loses unified readiness result semantics
- Harder operational diagnosis

**Effort:** 30-60 min

**Risk:** Medium

## Recommended Action

To be filled during triage.

## Technical Details

**Affected files:**
- `backend/src/main/java/com/gymcrm/integration/ExternalIntegrationReadinessService.java`
- `backend/src/test/java/com/gymcrm/integration/ExternalIntegrationReadinessServiceIntegrationTest.java`

**Database changes:**
- No

## Resources

- PR #22
- Merge commit: `ee0f85d19874d4e8e6b43c199ef9065ac4926026`

## Acceptance Criteria

- [x] AlimTalk 실패 + SMS 실패 시 예외 대신 `ReadinessResult`가 반환된다.
- [x] 결과에 fallback 실패를 나타내는 outcome/log가 포함된다.
- [x] 해당 경로 통합 테스트가 추가된다.

## Work Log

### 2026-03-04 - Initial Discovery

**By:** Codex

**Actions:**
- Reviewed Phase11-D readiness service and adapters
- Traced failure path for AlimTalk -> SMS fallback
- Identified unhandled fallback exception path

**Learnings:**
- Double-failure path is currently untested and not represented as structured outcome.

## Notes

- This issue does not block compilation but can break readiness drill consistency under fault injection.
