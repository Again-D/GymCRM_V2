# 2026-04-03-001-feat-membership-hold-additional-improvements-plan

This document outlines the technical plan for finalizing the additional "Membership Holding Improvements":
1. **SMS Template Registration**: Seed the `MEMBERSHIP_HOLD_RESUMED` template in the database.
2. **Hold History Override Indicator**: Expose the backend `overrideLimits` flag to the frontend and display it as a UI indicator ("강제 승인됨") in the hold history.

## Expected Behavior
- When the background job auto-resumes a holding, the queued CRM event `MEMBERSHIP_HOLD_RESUMED` will correctly match an active template in the DB and trigger SMS.
- Operations users reviewing a member's membership details will see an explicit "강제 승인됨" (Force Approved / Bypassed) tag next to any hold span that bypassed the standard limits.

## System-Wide Impact
- No structural change to the domain logic.
- Purely additive for frontend display and DB seed data.

## Implementation Units

### [x] 1. Backend: DTO & Mapper Update
**Goal**: Surface `overrideLimits` in `MembershipHoldSummaryResponse` so the frontend can detect bypassed holds.
**Files**:
- `backend/src/main/java/com/gymcrm/membership/dto/response/MembershipHoldSummaryResponse.java`

**Approach**:
- Add `Boolean overrideLimits` or `Boolean isBypassed` to `MembershipHoldSummaryResponse` record.
- Update the `.from(MembershipHold hold)` static factory to map `hold.overrideLimits()` to this field.

**Test Scenarios**:
- Update existing `MembershipHoldControllerTest` or DTO serialization tests if they assert exact JSON mappings.

### [x] 2. Database: Seed SMS Template for Auto-Resume
**Goal**: Provide the actual template text for `MEMBERSHIP_HOLD_RESUMED` via Flyway.
**Files**:
- `backend/src/main/resources/db/migration/V32__seed_membership_hold_resumed_crm_template.sql`

**Approach**:
- Write an `INSERT IGNORE` or standard `INSERT INTO crm_message_templates` targeting center `1` (or whichever default center).
- Use `MEMBERSHIP_HOLD_RESUMED` as the `template_code`.
- Add SMS payload indicating the holding has naturally expired.

**Test expectation**: none -- purely seed data configuration.

### [x] 3. Frontend: Membership Type Extension & UI Update
**Goal**: Consume the new `overrideLimits` DTO field and render it within the membership Hold History display.
**Files**:
- `frontend/src/pages/memberships/modules/types.ts`
- `frontend/src/pages/memberships/MembershipsPage.tsx` (or related historical view component)

**Approach**:
- Add `overrideLimits?: boolean` to the frontend `MembershipHoldRecord` or related type in `types.ts`.
- In the React component rendering the hold history, conditionally render an Ant Design `<Tag color="red">강제 승인됨</Tag>` (or similar "soft" tag per the recent UI upgrade) next to the hold dates if `overrideLimits` is true.

**Test Scenarios**:
- Verify the tag appears correctly via manual UI check using mock data update or E2E.

## Open Questions
- **DB Seed**: Are we targeting Center 1 explicitly for global CRM templates, or is there a global `center_id = 0` convention in `crm_message_templates`? (Assumed Center 1 base based on existing files).
- **Frontend File**: Is the hold history exposed in `MembershipsPage.tsx` or specifically in a slide-out drawer like `MembershipDetailDrawer`? (This will be verified during execution).

## Verification Plan
### Automated Tests
- Run backend API integration tests for `MembershipHoldService` or `MembershipHoldController` to verify JSON payload updates.

### Manual Verification
- Launch the backend application and verify that Flyway successfully applies `V32`.
- Check CRM templates API response to see if `MEMBERSHIP_HOLD_RESUMED` is present.
- In the frontend, intercept the hold API response and inject `overrideLimits: true` to confirm the UI tag safely displays without layout breakage.
