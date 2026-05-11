---
title: Sprint 3 Ops Growth Execution Plan
type: feat
status: draft
date: 2026-05-08
origin: docs/plans/2026-05-08-003-feat-sprint3-ops-growth-plan.md
---

# Sprint 3 Ops Growth Execution Plan

## Overview

This plan breaks Sprint 3 into concrete execution tickets that can be implemented and reviewed incrementally.

Goal:
- keep Sprint 3 aligned with the existing ops-growth plan
- sequence the work so CRM and catalog changes land before lower-risk UI extensions
- preserve Sprint 1 and Sprint 2 invariants while extending admin workflows

## Ticket 1: Add CRM Template Review State Visibility

**Related items**
- `FR-CRM-004`
- Sprint 3 `U1`

**Problem**
- CRM template CRUD exists, but operators still cannot read template review/approval state from the workspace.

**Work**
- Add template review-state fields and response mapping in the CRM template flow.
- Surface review/operational status in the CRM template list and detail state.
- Keep current template activation and validation behavior intact.

**Done when**
- Operators can distinguish draft/active/rejected-style template states inside the CRM workspace.
- Existing template create/update/list flows still work with the new fields present.

**Validation**
- Backend integration test for template create/update/list with review-state fields.
- Frontend test confirming template state rendering and filtering behavior.

## Ticket 2: Lock in CRM Failure Visibility and SMS Fallback

**Related items**
- `FR-CRM-006`
- Sprint 3 `U1`

**Problem**
- The requirements expect failed CRM sends to have a stable fallback path and readable operator feedback.

**Work**
- Define the fallback decision point inside the existing CRM dispatch path.
- Preserve or tighten SMS fallback behavior without introducing a second queue model.
- Expose fallback/failure outcomes in CRM history so operations can tell what happened.

**Done when**
- Failed primary sends follow a documented fallback path.
- CRM history clearly shows success, fallback, and final failure outcomes.

**Validation**
- Service-level tests for primary failure -> fallback send behavior.
- UI test confirming fallback/failure state appears in send history.

## Ticket 3: Add Long-Term Inactive and Scheduled CRM Campaign Operations

**Related items**
- `FR-CRM-007`
- `FR-CRM-008`
- Sprint 3 `U2`

**Problem**
- CRM has trigger/history foundations, but long-term inactive outreach and reserved-send operations are not closed at the workspace level.

**Work**
- Add a long-term inactive target query that reuses current dedupe and opt-out filtering rules.
- Add scheduled-send request handling through the same event/history pipeline.
- Extend the CRM page so operators can launch, inspect, and retry these campaign types.

**Done when**
- Long-term inactive campaigns can be created without duplicate event creation.
- Scheduled sends remain pending until their planned dispatch time and stay visible in history.

**Validation**
- Integration coverage for campaign creation, dedupe, queue processing, and history refresh.
- Frontend coverage for scheduled state and inactive-target campaign actions.

## Ticket 4: Extend the Product Catalog with Trainer Linkage

**Related items**
- `FR-PRD-006`
- Sprint 3 `U3`

**Problem**
- PT products cannot currently express trainer linkage, which limits catalog accuracy for trainer-specific offerings.

**Work**
- Add trainer reference fields to product create/update/read shapes.
- Validate trainer linkage only where product type/category requires it.
- Surface trainer-linked metadata in the product workspace without disturbing current filters.

**Done when**
- PT products can store and display trainer linkage.
- Existing non-PT products remain valid without trainer metadata.

**Validation**
- Product API tests for create/update/read with and without trainer linkage.
- Frontend tests for rendering trainer-linked product rows and edit state.

## Ticket 5: Add Product Promotion Metadata

**Related items**
- `FR-PRD-007`
- Sprint 3 `U3`

**Problem**
- The catalog lacks a structured way to express promotion windows or discounted pricing.

**Work**
- Add promotion metadata to the product model and DTOs.
- Validate invalid discount values or date windows before persistence.
- Show promotion state in product list and edit flows where operators make pricing decisions.

**Done when**
- Products can represent time-bounded or explicit promotional pricing.
- Existing catalog behavior remains stable when promotion fields are empty.

**Validation**
- Backend validation tests for invalid promotion combinations.
- Frontend tests for promotion display and edit behavior.

**Status**
- 완료: 상품 프로모션 메타데이터를 모델, DTO, 화면, 테스트까지 반영했다.

## Ticket 6: Add Locker Zone and Grade Commercial Settings

**Related items**
- `FR-LKR-006`
- Sprint 3 `U4`

**Problem**
- Locker management can assign and return slots, but it does not yet express zone/grade-based commercial settings.

**Work**
- Extend locker slot configuration with zone/grade/pricing metadata.
- Surface those settings in locker create/list/edit flows.
- Keep current assignment and return behavior unchanged.

**Done when**
- Operators can configure and view locker commercial settings from the existing locker workspace.
- Locker assignment lifecycle still works after the metadata is added.

**Validation**
- Locker integration tests for create/list/assign/return with commercial metadata present.
- Frontend tests for locker settings rendering and form validation.

**Status**
- 완료: 라커 슬롯에 `monthlyFee`를 추가하고 목록/등록/배정 흐름과 문서를 현재 구현 기준으로 동기화했다.

## Ticket 7: Add a Settlement Receivables Slice

**Related items**
- `FR-SAL-007`
- Sprint 3 `U5`

**Problem**
- Settlements show sales/reporting data, but unpaid balances and reminder candidates are not visible as an operational view.

**Work**
- Add a receivables-focused backend slice using current payment/adjustment context.
- Expose outstanding balances and reminder eligibility in the settlements workspace.
- Fail softly so receivables errors do not break existing sales dashboard/report flows.

**Done when**
- Operators can see unpaid balances and follow-up candidates in the settlements page.
- Existing sales dashboard and report behavior remains intact.

**Validation**
- Integration tests for receivables queries and empty-state behavior.
- Frontend tests confirming receivables rendering alongside current settlement sections.

**Status**
- 완료: 정산 워크스페이스에 미수금 / 후불 후보 카드와 조회 API를 추가하고, CRM 적재 후보와 REVIEW 대상을 함께 노출했다.

## Ticket 8: Add Member Photo Upload and Display

**Related items**
- `FR-MBR-009`
- Sprint 3 `U6`

**Problem**
- Member registration and detail flows still lack the photo upload/manage path called out by the requirements.

**Work**
- Add member photo fields/service/API handling in the member module.
- Surface photo upload and current-photo state in the existing member management UI.
- Keep photo input optional unless a stricter policy is later requested.

**Done when**
- Frontdesk staff can attach, replace, and review a member photo from the current member workspace.
- Member create/edit flows still work when no photo is supplied.

**Validation**
- Backend tests for photo upload/update/read flows and invalid input handling.
- Frontend tests for member modal/photo field behavior with and without existing photo state.

## Suggested Execution Order

1. Ticket 1: Add CRM Template Review State Visibility
2. Ticket 2: Lock in CRM Failure Visibility and SMS Fallback
3. Ticket 3: Add Long-Term Inactive and Scheduled CRM Campaign Operations
4. Ticket 4: Extend the Product Catalog with Trainer Linkage
5. Ticket 5: Add Product Promotion Metadata
6. Ticket 6: Add Locker Zone and Grade Commercial Settings
7. Ticket 7: Add a Settlement Receivables Slice
8. Ticket 8: Add Member Photo Upload and Display

## Sprint Completion Criteria

- CRM template governance, fallback visibility, and campaign coverage are implemented on the existing queue/history model.
- Product, locker, settlement, and member extensions land without regressing current admin workflows.
- Any API contract changes are reflected in `docs/04_API_설계서.md`.
- The gap tracker can be updated item by item from `미구현` or `부분 구현` to `완료`.

## Cross-Cutting Checks

- Keep center scoping and existing RBAC intact on every new API surface.
- Keep backend and frontend DTOs aligned when new fields are introduced.
- Update `docs/07_화면_정의서.md` if visible CRM, product, locker, settlement, or member controls materially change.
- Prefer characterization coverage before extending CRM, product, locker, or settlement flows that already exist.
