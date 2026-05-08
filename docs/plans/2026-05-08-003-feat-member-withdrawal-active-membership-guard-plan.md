---
title: feat: Complete Member Withdrawal with Refund Handling
type: feat
status: completed
date: 2026-05-08
origin: docs/notes/2026-05-08-requirements-gap-tracker.md
---

# feat: Complete Member Withdrawal with Refund Handling

## Overview

Close the deferred FR-MBR-003 gap left out of Sprint 1 by extending member withdrawal from a pure status change into the requirement-shaped flow:

1. check remaining memberships,
2. handle refund processing for refundable remaining memberships,
3. then change the member to `WITHDRAWN`,
4. while preserving the existing audit and PII-retention behavior from Sprint 1.

This plan assumes FR-MBR-003 should follow its literal wording rather than the narrower “block withdrawal only” interpretation.

## Problem Frame

`FR-MBR-003` says: when a withdrawal is requested, the system must confirm remaining memberships, process refunds, then change the member to withdrawn. The current repo only implements the final member-side step:

- `POST /api/v1/members/{memberId}/withdraw`
- member status transition to `WITHDRAWN`
- `withdrawnAt` persistence
- success-path audit logging
- downstream 5-year PII destruction policy

What is missing is the entitlement-resolution portion. The gap tracker and Sprint 1 plan explicitly recorded this as deferred because the active-membership handling policy was not fixed. Re-reading the formal requirement makes the stronger interpretation more faithful: FR-MBR-003 is not merely a guard on withdrawal — it is a withdrawal workflow that includes membership/refund handling before the final member status change.

## Requirements Trace

- **R1 (FR-MBR-003):** A withdrawal request must inspect the member’s remaining memberships before changing the member status to `WITHDRAWN`.
- **R2 (FR-MBR-003):** If refundable remaining memberships exist, the withdrawal workflow must process refund handling before the member is marked withdrawn.
- **R3 (FR-MBR-003):** After membership/refund handling is complete, the member must transition to `WITHDRAWN` and persist `withdrawnAt`.
- **R4 (FR-MBR-003 + Sprint 1 carry-forward):** Existing withdrawal-side compliance behavior remains intact: audit event on successful withdrawal plus legal-retention-driven PII destruction after withdrawal.
- **R5 (repo-aligned operational rule):** The withdrawal flow must reuse the existing membership lifecycle components (`MembershipRefundService`, membership status transitions, payment/refund records) instead of inventing a parallel refund implementation.
- **R6 (policy lock):** Only `ACTIVE` memberships and `HOLDING` memberships that are first resumed under the existing hold policy are refund targets during withdrawal. `REFUNDED`, `TRANSFERRED`, `EXPIRED`, and other terminal memberships are excluded.
- **R7 (policy lock):** If multiple refund-target memberships exist, all of them must be processed successfully before the member is marked withdrawn; partial completion is not allowed.
- **R8 (policy lock):** The withdrawal workflow is atomic. If hold resume, refund handling, or final member withdrawal fails, the whole transaction must roll back.
- **R9 (policy lock):** The withdrawal endpoint must return a structured workflow summary payload, not only a bare success/failure signal.
- **R10 (policy lock):** A repeat withdrawal request for an already withdrawn member is a business error, not a silent no-op.

## Scope Boundaries

- **In scope:**
  - backend orchestration of membership check + refund handling + final withdrawal
  - repository query for withdrawal-relevant memberships
  - service-level integration with existing refund flow
  - audit/transaction behavior for successful withdrawal completion
  - API documentation and gap-tracker alignment
  - regression coverage for the new end-to-end withdrawal workflow
- **Out of scope:**
  - automatic transfer or cancellation of memberships as an alternative to refund
  - redesign of refund formulas, penalty rules, or payment-method rules
  - new customer-facing self-service withdrawal UI
  - PII destruction schedule changes
  - multi-step operator workflow screens beyond what existing membership APIs already support

## Context & Research

### Relevant Code and Patterns

- Current withdrawal baseline:
  - `backend/src/main/java/com/gymcrm/member/controller/MemberController.java`
  - `backend/src/main/java/com/gymcrm/member/service/MemberService.java`
  - `backend/src/main/java/com/gymcrm/member/repository/MemberRepository.java`
  - `backend/src/main/resources/db/migration/V45__add_withdrawn_at_to_members.sql`
- Existing refund and membership-lifecycle behavior:
  - `backend/src/main/java/com/gymcrm/membership/service/MembershipRefundService.java`
  - `backend/src/main/java/com/gymcrm/membership/controller/MembershipRefundController.java`
  - `backend/src/main/java/com/gymcrm/membership/repository/MemberMembershipRepository.java`
  - `backend/src/main/java/com/gymcrm/membership/service/MembershipStatusTransitionService.java`
  - `backend/src/main/java/com/gymcrm/membership/service/MembershipHoldService.java`
  - `backend/src/main/java/com/gymcrm/membership/service/MembershipExtendService.java`
- Existing member summary / operational-status derivation:
  - `backend/src/main/java/com/gymcrm/member/repository/MemberQueryRepository.java`
- Existing member-management live mutation patterns:
  - `frontend/src/pages/members/modules/useMemberManagementState.ts`
  - `frontend/src/pages/members/components/MemberListSection.tsx`

### Institutional Learnings

- `docs/solutions/database-issues/membership-hold-refund-state-integrity-gymcrm-20260224.md`
  - state policies must align across service logic, API behavior, and UI visibility
  - refund rules are safest when they reuse the established lifecycle service, not a side-channel write path
  - lifecycle actions that cross state boundaries need explicit integration tests for both success and failure modes

### External References

- External research showed that production systems often split member cancellation from refund execution for operational reasons, but the repo’s formal FR text is more specific: this feature is expected to include refund handling before final withdrawal. Therefore this plan follows the requirement wording over the lower-risk “guard only” interpretation.

## Key Technical Decisions

### Decision 1: Treat withdrawal as an orchestration flow, not a simple member-state mutation

**Approach:** `MemberService.withdraw()` should become an orchestration point (or delegate to a dedicated withdrawal service) that resolves remaining memberships first, then finalizes the member withdrawal.

**Rationale:** FR-MBR-003 describes a sequence, not a single row update. The current status-only implementation is only a partial slice of the requirement.

### Decision 2: Reuse the existing refund service instead of duplicating refund logic inside withdrawal

**Approach:** The withdrawal workflow should call `MembershipRefundService` for memberships that are eligible for refund rather than reproducing refund math or direct payment/refund writes.

**Rationale:** Refund calculations already encode duration-vs-count logic, payment creation, penalty handling, and membership status transition to `REFUNDED`. Reusing that service preserves consistency and reduces risk.

### Decision 3: Withdrawal-relevant membership discovery must be broader than `existsNonTerminalPtMembership()`

**Approach:** Add a dedicated repository query/projection that surfaces memberships which must be considered during withdrawal, across both duration and count products.

**Rationale:** The existing helper is PT-only and cannot drive FR-MBR-003 for all membership categories.

### Decision 4: Refund target scope is limited to `ACTIVE` and resume-first `HOLDING` memberships

**Approach:** The orchestration layer should classify memberships before final withdrawal:

| Membership shape | Expected treatment in withdrawal flow |
|---|---|
| `ACTIVE` duration membership with remaining validity | refund flow required before withdrawal |
| `ACTIVE` count membership with `remainingCount > 0` | refund flow required before withdrawal |
| `HOLDING` membership | resume first using existing hold lifecycle, then refund, then continue withdrawal |
| `REFUNDED`, `TRANSFERRED`, `EXPIRED` | no refund step required |
| Other terminal / already-resolved memberships | no refund step required |

**Rationale:** FR-MBR-003 is about remaining memberships, but the repo already has lifecycle rules about what can and cannot be refunded. The locked plan interpretation is intentionally narrow: only currently active value-bearing memberships are refund targets, and `HOLDING` memberships are not directly refundable. The withdrawal plan must compose that rule rather than override it implicitly.

### Decision 5: `HOLDING` memberships follow a resume-then-refund branch inside withdrawal

**Approach:** If the member has remaining-value memberships in `HOLDING`, the withdrawal workflow should:

1. locate the active hold,
2. resume the membership through the existing hold lifecycle,
3. apply refund handling through the existing refund flow,
4. then continue toward final member withdrawal.

**Rationale:** Repo evidence is consistent across service code, tests, solution docs, and UI guidance: `HOLDING` memberships are not refundable in-place. The established policy is “홀딩 상태는 먼저 해제 후 환불해주세요.” Reusing that policy inside withdrawal is more repo-aligned than inventing a special-case direct refund path only for FR-MBR-003.

### Decision 6: The withdrawal API route stays stable while the response payload becomes a workflow summary

**Approach:** Preserve `POST /api/v1/members/{memberId}/withdraw` as the entrypoint and keep the existing API response envelope. Internally, the endpoint becomes a transactionally coordinated workflow and the success payload deepens into a structured summary that reports what the withdrawal flow actually processed.

**Rationale:** The route already exists and is repo-canonical after Sprint 1. This is an implementation-deepening, not a route replacement, but the payload should expose enough information for operators and clients to understand what happened during the multi-step workflow.

### Decision 7: Use a dedicated `MemberWithdrawalService` for orchestration and keep `MemberService` as the member-facing facade

**Approach:** Introduce a dedicated `MemberWithdrawalService` that owns the multi-step withdrawal workflow (membership discovery, hold resume where needed, refund handling, final member withdrawal). Keep `MemberService.withdraw()` as the stable member-domain entrypoint, but reduce it to delegation plus any member-specific guards that naturally belong there.

**Rationale:** Repo patterns favor dedicated feature services for workflows that span multiple domains and side effects:
- `MembershipTransferService` coordinates member lookup, product policy, membership writes, payment writes, and transfer audit records.
- `MembershipExtendService` coordinates membership validation, payment creation, extension record creation, and end-date/status mutation.
- `MembershipPurchaseService` coordinates member validation, product rules, membership creation, payment creation, and trainer-scoped policy checks.

By contrast, `MemberService` is currently a member CRUD/query service plus a minimal withdrawal baseline. Expanding it into a full cross-domain refund/hold/payment orchestrator would blur boundaries more than the rest of the repo tends to allow.

## Locked Workflow Rules

### Rule 1: Refund target membership scope

- Refund targets:
  - `ACTIVE` memberships with remaining refundable value
  - `HOLDING` memberships only after they are resumed through the existing hold lifecycle
- Non-target memberships:
  - `REFUNDED`
  - `TRANSFERRED`
  - `EXPIRED`
  - other terminal or already-resolved memberships

Plan wording:

> Withdrawal refund handling is limited to currently effective remaining memberships. `ACTIVE` memberships are directly eligible for refund processing. `HOLDING` memberships must first be resumed through the existing hold lifecycle before refund handling continues. `REFUNDED`, `TRANSFERRED`, `EXPIRED`, and other terminal memberships are excluded from refund handling during withdrawal.

### Rule 2: Multiple membership handling

- If multiple refund-target memberships exist, all targets must be processed before final withdrawal.
- Partial success is not allowed.

Plan wording:

> If a member has multiple refund-target memberships, the workflow completes refund handling for all target memberships before marking the member withdrawn. The system does not allow a partially processed outcome where only some target memberships are refunded but the member is still withdrawn.

### Rule 3: Transaction and rollback policy

- The workflow is all-or-nothing.
- A failure in hold resume, refund handling, or final member withdrawal aborts the entire operation.

Plan wording:

> The member withdrawal workflow is atomic. If any hold resume step, refund step, or final member withdrawal step fails, the entire transaction rolls back. The system does not allow a partially completed withdrawal outcome.

### Rule 4: Response payload contract

- Keep `POST /api/v1/members/{memberId}/withdraw`.
- Return a structured summary payload inside the existing API envelope.
- Minimum planned payload fields:
  - `memberId`
  - `withdrawn`
  - `refundedMembershipCount`
  - `resumedHoldingCount`
  - `refundAmount`

Plan wording:

> The withdrawal endpoint returns a workflow summary payload rather than only a bare success/failure signal. At minimum, the response includes the member ID, withdrawal completion flag, refunded membership count, resumed holding count, and total refund amount.

### Rule 5: Repeat withdrawal requests

- Repeating withdrawal for an already withdrawn member is a business error.
- Silent no-op behavior is not allowed.

Plan wording:

> A repeated withdrawal request for a member who is already withdrawn is handled as a business error. The workflow does not silently succeed without doing work.

### Rule 6: Audit and service reuse policy

- Existing domain services keep their own step-level audit responsibilities.
- `MemberWithdrawalService` records the final member-withdrawal completion audit.
- Withdrawal orchestration must reuse existing hold/refund/status-transition services instead of reimplementing their rules.

Plan wording:

> Step-level audit behavior remains owned by the existing domain services that perform hold resume and refund work. `MemberWithdrawalService` records the final successful member-withdrawal audit event. The withdrawal workflow reuses existing `MembershipHoldService`, `MembershipRefundService`, and status-transition rules rather than implementing separate refund or lifecycle logic.

## Open Questions

### Resolved During Planning

- **Should the plan follow the strict FR wording or the safer blocked-withdrawal interpretation?** → Strict FR wording: membership check + refund handling + then withdrawal.
- **Should refund logic be reimplemented in the withdrawal service?** → No. The withdrawal flow should compose the existing refund service.
- **Should terminal memberships participate in withdrawal handling?** → No. `REFUNDED`, `TRANSFERRED`, and `EXPIRED` rows are already resolved lifecycle outcomes.
- **How should `HOLDING` memberships be handled in a refund-inclusive withdrawal flow?** → Resume first under the existing hold policy, then refund, then continue withdrawal.
- **Where should the orchestration live?** → In a dedicated `MemberWithdrawalService`, with `MemberService.withdraw()` delegating to it so the existing API/service entrypoint stays stable.
- **How should multiple refund-target memberships be handled?** → Process all refund-target memberships successfully before final withdrawal; partial success is not allowed.
- **What is the rollback posture?** → All-or-nothing transaction. Any hold/refund/withdraw failure rolls the workflow back.
- **What should the endpoint return?** → A structured workflow summary payload inside the existing API response envelope.
- **How should duplicate withdrawal requests behave?** → Repeated withdrawal of an already withdrawn member is a business error.
- **How should audit and lifecycle rules be owned?** → Keep step-level audit and policy logic in existing domain services; `MemberWithdrawalService` adds the final withdrawal audit.

### Deferred to Implementation

- None at the plan level. Implementation still needs to choose concrete DTO/file names consistent with the surrounding member module.

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

```mermaid
flowchart TB
  A[POST /api/v1/members/{memberId}/withdraw] --> B[Load member + auth/center guard]
  B --> C[Load withdrawal-relevant memberships]
  C --> D{Remaining memberships found?}
  D -- No --> H[Finalize member withdrawal]
  D -- Yes --> E[Classify memberships by lifecycle state]
  E --> F[Resume HOLDING memberships first]
  F --> G[Invoke refund flow for refundable memberships]
  G --> I{Any resume/refund step failed?}
  I -- Yes --> J[Abort withdrawal and return business error]
  I -- No --> H[Finalize member withdrawal]
  H --> K[Set memberStatus=WITHDRAWN + withdrawnAt]
  K --> L[Record MEMBER_WITHDRAWN audit event]
```

## Implementation Units

- [x] **U1. Add a withdrawal-relevant membership query and classification rule**

**Goal:** Give the withdrawal workflow a repo-grounded way to discover memberships that must be evaluated before final withdrawal.

**Requirements:** R1, R2, R6

**Dependencies:** None

**Files:**
- Modify: `backend/src/main/java/com/gymcrm/membership/repository/MemberMembershipRepository.java`
- Create: `backend/src/test/java/com/gymcrm/member/MemberWithdrawalIntegrationTest.java`
- Test: `backend/src/test/java/com/gymcrm/member/MemberServiceTest.java`

**Approach:**
- Add a dedicated repository method and projection for memberships relevant to withdrawal handling.
- Include the fields needed to decide whether a refund step is required: status, product type/category, date window, remaining count, and member/center ownership.
- Include enough identity to support `HOLDING` resume orchestration without a second ad hoc lookup chain later.
- Keep the query scoped to `centerId`, `memberId`, and `isDeleted = false` so it matches the repo’s visibility rules.

**Patterns to follow:**
- `backend/src/main/java/com/gymcrm/member/repository/MemberQueryRepository.java` for date/count-based membership semantics
- `backend/src/main/java/com/gymcrm/membership/repository/MemberMembershipRepository.java` for feature-facing QueryDSL repository methods
- `backend/src/main/java/com/gymcrm/membership/service/MembershipRefundService.java` for the distinction between duration and count refund inputs

**Test scenarios:**
- Happy path: an `ACTIVE` duration membership with future `endDate` is returned as withdrawal-relevant.
- Happy path: an `ACTIVE` count membership with `remainingCount > 0` is returned as withdrawal-relevant.
- Happy path: a `HOLDING` membership with remaining value is returned as withdrawal-relevant and distinguishable from directly refundable memberships.
- Edge case: a count membership with `remainingCount = 0` is not returned as remaining-value.
- Edge case: `REFUNDED`, `TRANSFERRED`, `EXPIRED`, and other non-target lifecycle states are excluded.
- Edge case: only memberships for the target member and center are returned.
- Integration: mixed refundable and non-refundable memberships are classified consistently enough for downstream orchestration.

**Verification:**
- The withdrawal workflow can enumerate only the memberships that materially affect FR-MBR-003.
- The repository output is sufficient for refund orchestration without duplicating ad hoc membership lookups later.

- [x] **U2. Orchestrate refund handling before final member withdrawal**

**Goal:** Extend the withdrawal service so remaining memberships are refund-processed before the member is finally marked withdrawn.

**Requirements:** R1, R2, R3, R5, R6, R7, R8, R9, R10

**Dependencies:** U1

**Files:**
- Modify: `backend/src/main/java/com/gymcrm/member/service/MemberService.java`
- Create: `backend/src/main/java/com/gymcrm/member/service/MemberWithdrawalService.java`
- Create: `backend/src/main/java/com/gymcrm/member/dto/response/MemberWithdrawResponse.java`
- Modify: `backend/src/main/java/com/gymcrm/member/controller/MemberController.java`
- Modify: `backend/src/main/java/com/gymcrm/membership/service/MembershipRefundService.java`
- Create: `backend/src/test/java/com/gymcrm/member/MemberWithdrawalIntegrationTest.java`
- Test: `backend/src/test/java/com/gymcrm/member/MemberServiceTest.java`
- Create: `backend/src/test/java/com/gymcrm/member/MemberWithdrawalServiceTest.java`
- Test: `backend/src/test/java/com/gymcrm/membership/MembershipRefundServiceTest.java`

**Approach:**
- Keep `MemberService.withdraw()` as the current public entrypoint from `MemberController`, but delegate the multi-step workflow to `MemberWithdrawalService`.
- In `MemberWithdrawalService`, after auth and center validation, load the member’s withdrawal-relevant memberships.
- For memberships in `HOLDING`, first invoke the existing resume path so the membership returns to a refundable state under current repo policy.
- For memberships that still require refund handling after any required resume step, invoke the existing refund capability rather than writing refunds directly.
- Treat only `ACTIVE` and resume-first `HOLDING` memberships as refund targets; skip terminal or already-resolved memberships entirely.
- Only after all required refund handling succeeds for every target membership should the workflow perform the existing member withdrawal write.
- If a remaining membership cannot be processed through the current resume/refund policy, fail the withdrawal transaction instead of partially withdrawing the member.
- Preserve the current successful member-withdraw side effects (`WITHDRAWN`, `withdrawnAt`, `MEMBER_WITHDRAWN` audit log) as the final step.
- Return a structured summary payload with the final withdrawal result, refunded membership count, resumed holding count, and total refund amount.

**Execution note:** Start with an integration test for “HOLDING membership is resumed, then refunded, then member becomes withdrawn” so the most policy-sensitive branch is locked down before refactoring service structure.

**Patterns to follow:**
- `backend/src/main/java/com/gymcrm/membership/service/MembershipTransferService.java` for a dedicated orchestration service that spans member, membership, payment, and feature-history writes
- `backend/src/main/java/com/gymcrm/membership/service/MembershipExtendService.java` for feature service ownership of multi-write workflows
- `backend/src/main/java/com/gymcrm/membership/service/MembershipRefundService.java` for refund execution ownership
- `backend/src/main/java/com/gymcrm/membership/service/MembershipHoldService.java` for resume semantics and end-date recalculation
- `backend/src/main/java/com/gymcrm/membership/service/MembershipStatusTransitionService.java` for status-transition correctness
- `backend/src/main/java/com/gymcrm/member/service/MemberService.java` for the current public member-domain facade and auth/center guard style

**Test scenarios:**
- Happy path: withdrawing a member with one refundable active duration membership refunds that membership, then sets the member to `WITHDRAWN`.
- Happy path: withdrawing a member with one refundable count membership refunds that membership based on remaining count, then sets the member to `WITHDRAWN`.
- Happy path: withdrawing a member with one `HOLDING` membership resumes the membership first, recalculates lifecycle fields through the existing hold flow, then refunds it, then sets the member to `WITHDRAWN`.
- Happy path: withdrawing a member with multiple refund-target memberships processes every target membership before the member becomes `WITHDRAWN`.
- Happy path: withdrawing a member with only terminal memberships performs no refund work and still succeeds.
- Happy path: `MemberService.withdraw()` delegates to `MemberWithdrawalService` without changing the controller-facing contract.
- Happy path: the response payload returns `memberId`, `withdrawn`, `refundedMembershipCount`, `resumedHoldingCount`, and `refundAmount`.
- Error path: if refund processing for a remaining membership fails, the member is not set to `WITHDRAWN`.
- Error path: if resume of a `HOLDING` membership fails, the workflow aborts before any refund or member withdrawal mutation.
- Error path: if a remaining membership is not eligible under the current resume/refund policy, the workflow aborts rather than partially completing.
- Edge case: already-withdrawn members still return the existing duplicate-withdraw error.
- Edge case: cross-center attempts still fail before any refund or member-state mutation occurs.
- Integration: on full success, `HOLDING` memberships move through resume then refund, payment/refund records are created, and the member row is updated exactly once.
- Integration: on failure, no `withdrawnAt` timestamp and no `MEMBER_WITHDRAWN` audit event are recorded.

**Verification:**
- FR-MBR-003’s sequence is materially true in the implementation: membership check → refund handling → withdrawal.
- The workflow does not create partial “member withdrawn but refundable membership unresolved” states.
- The repo’s service boundary remains consistent: member CRUD/query concerns stay in `MemberService`, while the cross-domain withdrawal workflow lives in a dedicated feature service.
- The API contract reports enough structured outcome data that operators and clients can verify what the workflow actually processed.

- [x] **U3. Align API and requirements tracking docs with the refund-inclusive withdrawal flow**

**Goal:** Make the repo’s documented behavior match the stronger FR-MBR-003 interpretation once code lands.

**Requirements:** R2, R3, R4, R9

**Dependencies:** U2

**Files:**
- Modify: `docs/04_API_설계서.md`
- Modify: `docs/notes/2026-05-08-requirements-gap-tracker.md`

**Approach:**
- Document that the withdrawal endpoint now includes remaining-membership evaluation and refund handling before final withdrawal.
- Document that the success payload is now a workflow summary rather than a bare status-only response.
- Correct any lingering mismatch where member delete/deactivate semantics are conflated with the dedicated withdraw flow.
- Update Appendix C in `docs/04_API_설계서.md` with the withdrawal contract change, per repo documentation rules.
- Update the gap tracker so FR-MBR-003 is no longer described as having an unresolved active-membership policy gap.

**Patterns to follow:**
- `docs/plans/2026-05-08-001-feat-sprint1-security-compliance-execution-plan.md` deferred-item wording for continuity
- `docs/04_API_설계서.md` endpoint/business-rule formatting and Appendix C change-log style

**Test scenarios:**
- Test expectation: none -- this unit is documentation/tracking alignment only.

**Verification:**
- Repo docs consistently describe withdrawal as a refund-inclusive workflow, not just a member-state mutation.
- The API spec and gap tracker no longer conflict with the formal FR wording.

## System-Wide Impact

- **Interaction graph:** `MemberService.withdraw()` becomes a cross-domain orchestration path spanning member lifecycle, membership hold/resume lifecycle, membership refund lifecycle, payment/refund persistence, and withdrawal audit logging.
- **Interaction graph:** `MemberController` -> `MemberService.withdraw()` -> `MemberWithdrawalService` becomes the stable delegation chain for this workflow, keeping the controller contract unchanged while isolating the orchestration boundary.
- **Error propagation:** resume failures, refund failures, or refund-ineligible remaining memberships must abort the withdrawal before any member-state mutation is persisted.
- **Error propagation:** repeated withdrawal requests for already withdrawn members remain business errors and do not silently succeed.
- **State lifecycle risks:** the main risk is partial completion; the flow must not leave the member withdrawn while a refundable membership remains unresolved.
- **API surface parity:** `POST /api/v1/members/{memberId}/withdraw` remains the canonical route, but its semantics deepen from status-only to refund-inclusive processing.
- **API payload depth:** the response now needs to describe the processed workflow summary, not just whether the request succeeded.
- **Integration coverage:** end-to-end tests must validate member row change, membership refund status change, payment/refund record creation, and audit behavior together.
- **Unchanged invariants:** Sprint 1 PII retention/destruction behavior remains keyed off successful withdrawal; refund formulas and penalty policy remain owned by the existing refund domain.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Withdrawal orchestration duplicates or drifts from refund-domain rules | Reuse `MembershipRefundService` instead of reproducing refund math or refund writes |
| A `HOLDING` membership follows a different lifecycle rule than direct refund | Reuse the repo’s established resume-first rule instead of inventing a special-case direct refund path |
| A remaining membership is not refundable under current policy even after required resume handling | Explicitly test and document the failure path; do not silently skip or partially withdraw |
| `MemberService` grows into an oversized cross-domain coordinator | Put orchestration in `MemberWithdrawalService` and leave `MemberService` as the stable member-domain facade |
| Cross-domain transaction boundaries create partial side effects | Verify rollback behavior with integration coverage that spans refund + member withdrawal |
| API consumers assume withdraw is still a simple status mutation | Update the API spec and gap tracker in the same delivery unit |
| API consumers cannot tell what the multi-step workflow actually did | Return a structured workflow summary payload and document it in the API spec |

## Documentation / Operational Notes

- This plan treats FR-MBR-003 as a complete withdrawal workflow, not a guard-only policy choice.
- Existing refund operations remain operator-facing concepts in the domain, but this feature composes them inside the withdrawal transaction because the formal requirement expects refund handling before final withdrawal.
- `HOLDING` refund semantics remain unchanged at the domain level: the withdrawal workflow respects the existing rule that holding must be resumed first before refund can proceed.
- If the team later wants a more guided operator experience, a follow-up can add a withdrawal preview surface without changing the core backend contract established here.

## Sources & References

- **Origin document:** `docs/notes/2026-05-08-requirements-gap-tracker.md`
- Formal requirement: `docs/01_요구사항_분석서.md` (FR-MBR-003)
- Deferred context: `docs/plans/2026-05-08-001-feat-sprint1-security-compliance-execution-plan.md`
- Related code:
  - `backend/src/main/java/com/gymcrm/member/service/MemberService.java`
  - `backend/src/main/java/com/gymcrm/member/controller/MemberController.java`
  - `backend/src/main/java/com/gymcrm/membership/repository/MemberMembershipRepository.java`
  - `backend/src/main/java/com/gymcrm/membership/service/MembershipRefundService.java`
  - `backend/src/main/java/com/gymcrm/membership/controller/MembershipRefundController.java`
  - `backend/src/main/java/com/gymcrm/membership/service/MembershipStatusTransitionService.java`
- Institutional learning: `docs/solutions/database-issues/membership-hold-refund-state-integrity-gymcrm-20260224.md`
