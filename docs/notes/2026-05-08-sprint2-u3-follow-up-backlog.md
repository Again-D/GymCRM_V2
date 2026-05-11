---
title: Sprint 2 U3 Follow-Up Backlog
type: backlog
status: active
date: 2026-05-08
origin: docs/plans/2026-05-08-002-feat-sprint2-core-ops-flow-plan.md
---

# Sprint 2 U3 Follow-Up Backlog

This backlog captures the scope that is intentionally deferred while implementing Sprint 2 U3.

## Deferred Items

### 1. Member account generation and login

- Member-auth/session model for UC-07 remains out of scope for Sprint 2.
- The current flow continues to use the auto-generated `memberQrPath` and bootstrap token path.
- Any future member login UI, member password setup, or member-session refresh contract should be tracked separately.

### 2. FR-ACC-005 delivery channel expansion

- Sprint 2 U3 limits FR-ACC-005 to the operator-facing alert summary in the access workspace.
- CRM queue dispatch, push notification, SMS, or other active alert delivery channels are deferred.
- If operations wants an outbound alert channel later, it should be planned as a separate follow-up item with its own contract and tests.

### 3. Automatic access-page refresh

- Sprint 2 U3 uses manual refresh for the access page.
- Automatic polling, push-driven updates, or realtime streaming for alert/presence data are deferred.
- If the page later needs live refresh, it should be added as a dedicated follow-up because it affects query lifecycle, backend load, and test coverage.

## Notes

- The requirements document remains unchanged.
- Sprint 2 documents should continue to describe the current implementation as a narrow, token-based QR path plus operator-facing access summaries.
