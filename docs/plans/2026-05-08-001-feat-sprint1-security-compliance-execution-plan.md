---
title: Sprint 1 Security & Compliance Execution Plan
type: feat
status: draft
date: 2026-05-08
origin: docs/notes/2026-05-08-requirements-gap-tracker.md
---

# Sprint 1 Security & Compliance Execution Plan

## Overview

This plan breaks down Sprint 1 from the requirements gap tracker into concrete work tickets.

Goal:
- close the highest-risk security and compliance gaps first
- keep the work scoped to policy, backend, and infrastructure boundaries
- avoid expanding into Sprint 2 operational flow changes

## Ticket 1: Confirm HTTPS/TLS Enforcement Boundary

**Related item**
- `NFR-012` 통신 암호화

**Problem**
- The requirements document requires HTTPS/TLS 1.2+ for all client-server traffic.
- Application code alone does not prove that the deployment path enforces it.

**Work**
- Confirm whether TLS termination is enforced at the reverse proxy, load balancer, or app server.
- Record the canonical enforcement point in docs/ops or deployment docs.
- Add a validation note for staging and production smoke checks.

**Done when**
- The enforcement boundary is documented.
- A reviewer can point to the exact layer that guarantees HTTPS/TLS 1.2+.

**Validation**
- Inspect deployment config and reverse proxy settings.
- Verify the public endpoint does not serve plain HTTP in the target environment.

## Ticket 2: Finalize Password Policy for Admin Accounts

**Related item**
- `NFR-013` 비밀번호 정책

**Problem**
- Strong password composition is implemented.
- The 90-day change recommendation is not yet captured as a tracked policy decision.

**Work**
- Confirm whether the business wants a soft recommendation or a forced rotation policy.
- If soft recommendation is chosen, document the reminder path and where it is surfaced.
- If forced rotation is chosen, define the expiry marker and the user journey for change enforcement.

**Done when**
- The policy is written down and consistent with backend behavior.
- The admin account lifecycle doc reflects the final rule.

**Validation**
- Check that login/password change behavior matches the policy decision.
- Confirm the UI or admin guidance text matches the agreed rule.

## Ticket 3: Implement Audit Log Retention Execution Path

**Related item**
- `NFR-015` 감사 로그

**Problem**
- Sensitive actions are logged.
- The 1-year retention requirement still needs an explicit execution path.

**Work**
- Define the retention cutoff and the deletion/anonymization behavior.
- Implement or confirm the scheduled retention job.
- Record retention job runs and failures with enough detail for operations.

**Done when**
- Audit logs older than the retention window are handled according to policy.
- Retention execution is visible in an operational log or run history.

**Validation**
- Run the retention path in a non-production environment.
- Verify the run history and the affected log count.

## Ticket 4: Complete Member Withdrawal Flow

**Related item**
- `FR-MBR-003` 회원 탈퇴 처리

**Problem**
- Current soft delete behavior is not enough for the withdrawal requirements.

**Work**
- Define the withdrawal sequence: membership check, refund decision, status transition, data retention.
- Confirm which part is automated and which part is operator-driven.
- Align the member state transition with the legal retention policy.

**Done when**
- Withdrawal is more than soft delete.
- The system state after withdrawal is explicit and searchable.

**Validation**
- Test withdrawal with active membership, inactive membership, and refund-required cases.
- Confirm resulting member status and audit trail.

## Ticket 5: Define Post-Withdrawal Personal Data Destruction

**Related item**
- `NFR-016` 개인정보보호법 준수

**Problem**
- The requirements call for destruction after the legal retention period.
- That lifecycle is not yet closed in the current implementation.

**Work**
- Define the data classes covered by destruction.
- Confirm the retention clock start point.
- Add the deletion job or archival policy that performs the destruction after 5 years.

**Done when**
- Post-withdrawal PII destruction is policy-backed and executable.
- The deletion path is auditable and can be reviewed by operations.

**Validation**
- Simulate a withdrawal record past the retention threshold.
- Verify the destruction behavior and the audit trail.

## Sprint Completion Criteria

- All tickets above are either implemented or explicitly accepted as infrastructure/policy decisions.
- No open question remains for TLS enforcement, password policy, audit retention, member withdrawal, or legal destruction.
- The gap tracker can be updated from `부분 구현` to `완료` or `인프라 확인 필요` as appropriate.

## Deferred Items

The following item was scoped out of Sprint 1 due to an unresolved business policy decision and is tracked here for continuity.

### FR-MBR-003: Active Membership Handling on Withdrawal

**What was implemented**
- Member status transition to `WITHDRAWN`
- `withdrawnAt` timestamp recorded
- `POST /api/v1/members/{memberId}/withdraw` endpoint

**What was not implemented**
- Checking for active memberships before or during withdrawal
- Automatic cancellation or refund of remaining active memberships

**Why deferred**
The handling policy for active memberships at withdrawal time was not confirmed:
- Option A: Block withdrawal if active memberships exist (guard rejection)
- Option B: Auto-cancel active memberships on withdrawal (no refund)
- Option C: Auto-cancel and trigger refund flow via `MembershipRefundService`
- Option D: Allow withdrawal, leave membership handling to operator manually

No business decision was made during Sprint 1, so this was deferred to avoid assuming the wrong behavior.

**Re-entry conditions**
- Business confirms which option (A/B/C/D) applies
- Confirm whether refund should be automatic or operator-initiated

**Implementation note**
`MemberMembershipRepository.existsNonTerminalPtMembership()` and `MembershipRefundService` already exist. Once the policy is confirmed, integration cost is low.

