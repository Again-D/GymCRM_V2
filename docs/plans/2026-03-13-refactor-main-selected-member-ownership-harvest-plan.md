---
title: refactor: harvest selected-member ownership into main
type: refactor
status: completed
date: 2026-03-13
---

# refactor: Harvest Selected-Member Ownership Into Main

## Enhancement Summary

**Deepened on:** 2026-03-13  
**Primary references added:** React official guidance on single-source-of-truth state ownership, context-based shared state, and reset behavior on identity changes

### Key Improvements
1. Clarified why `selectedMember` belongs in a domain owner instead of `App.tsx`, using React's single-source-of-truth guidance.
2. Added a stricter migration boundary so we do not accidentally turn the first extraction into a broader routing or workspace rewrite.
3. Added explicit implementation cautions around auth-driven reset, consumer parity, and stale in-flight member loads.
4. Fixed the ownership boundary so the provider owns only member-context detail and lifecycle, not downstream memberships/reservations query data.
5. Fixed the migration scope so the members-page edit/open flow is part of the same ownership model rather than an implicit second owner.

### New Considerations Discovered
- The canonical owner should not just expose current member state; it also needs a clear revalidation/reset contract when auth identity changes.
- The highest-risk regression is not provider creation itself, but partial migration where `App.tsx` and consumers temporarily both act like owners.
- The provider must not absorb slice-owned reads such as memberships or reservations data, or it will recreate coordinator drift in a new place.
- The members-page editor/open flow must be treated as part of the same selected-member model, otherwise `App.tsx` will still remain a practical second owner.

## Overview

The rebuild experiment in `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/frontend-rebuild` proved that `selectedMember` works better as a **members-domain owned context** than as an implicit shell coordinator concern inside `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`.

The goal of this plan is to adopt that pattern into `main` without attempting a full frontend cutover.

This is not a UI rewrite. It is a state-ownership refactor that should make the baseline app easier to reason about, safer across auth changes, and less dependent on `App.tsx` as the place where member-context rules are reconstructed.

### Research Insights

**Best Practices**
- React's guidance for shared state is to choose one owner for each piece of state and move it to the closest common owner of all consumers.
- Context is appropriate here because `selectedMember` is read by multiple distant consumers (`memberships`, `reservations`, and supporting shell-level surfaces), but it should still remain domain-owned rather than becoming a generic app-global store.

**Implementation Details**
- The provider should own both the data (`selectedMemberId`, `selectedMember`) and the transition API (`selectMember`, `clearSelectedMember`) so that downstream pages do not recreate ownership rules.
- The provider should preserve current consumer ergonomics: consumers should not need to know whether the selected member came from a list click, reservation target selection, or workspace picker.
- The provider should not load or cache memberships, reservations, or page-form state. Those remain in slice-owned query/state modules and react to `selectedMemberId`.

**Edge Cases**
- Auth identity changes must clear or revalidate the current member selection before consumers render stale unauthorized context.
- A stale in-flight member detail request must not win after the selection has been cleared or replaced.

## Problem Statement / Motivation

Today, `selectedMemberId` and `selectedMember` live directly in `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`, and many related responsibilities are coupled to that location:

- member detail loading
- memberships/reservations context handoff
- workspace fallback behavior
- reset behavior on auth/session changes
- route-level behavior in members/memberships/reservations

That has three costs:

1. `App.tsx` remains a coordinator for member-context behavior even after recent refactors.
2. Auth or navigation changes can leave stale assumptions if every consumer is not manually updated.
3. The mental model is harder than it needs to be: the selected member is conceptually part of the members domain, but operationally controlled from the shell.

The rebuild branch demonstrated a better model:

- one canonical selected-member owner in the members domain
- memberships/reservations consume that owner
- auth changes clear stale member context
- invalid or unauthorized member handoff falls back to picker/list flows cleanly

### Research Insights

**Best Practices**
- React's “single source of truth” guidance maps cleanly to this problem: `selectedMember` should have one canonical owner, and other slices should derive from that owner instead of storing their own parallel version.
- Shared state should be lifted only to the minimum level needed. In this app, that boundary is the members domain plus its consumers, not the full shell.

**Implementation Details**
- The baseline should not migrate directly from “shell-owned state” to “global app store.” The rebuild proved that a domain-scoped provider is a better midpoint.
- Existing workspace hooks can keep their current shape if they accept the canonical `selectedMemberId` from the provider instead of from `App.tsx`.
- The members-page edit/open flow should be migrated into the same ownership boundary so that “currently open member context” is not split between the members page and downstream workspaces.

## Proposed Solution

Introduce a `SelectedMember` domain store/provider into the baseline frontend and migrate existing member-context consumers to read from it instead of reading directly from `App.tsx` state.

The migration should happen in bounded phases:

1. create the canonical selected-member owner in the members domain
2. move member detail loading and clear/reselect rules into that owner
3. rewire memberships and reservations to consume the owner
4. preserve existing UI behavior and fallback flows while shrinking `App.tsx` ownership

This should be done without changing the current shell-only routing contract and without broadening into full URL-driven member-context handling.

### Research Insights

**Best Practices**
- This migration should be treated as an ownership refactor first, not a routing or UX redesign. Keeping the current shell-only route contract fixed reduces moving parts and makes parity easier to validate.
- The provider should be introduced before consumer rewiring starts, so new code has a stable target to depend on.

**Implementation Details**
- A safe intermediate state is acceptable temporarily: `App.tsx` may still compose the provider while consumers are being migrated, but only the provider should be allowed to own the underlying selected-member data.
- `loadMemberDetail()` semantics should move into the provider behind `selectMember()` so consumer pages no longer depend on shell helpers.

## Technical Considerations

- The canonical owner should live in the members domain, not in `App.tsx` and not in a generic global store.
- The owner should expose only the minimum shared contract:
  - `selectedMemberId`
  - `selectedMember`
  - `selectedMemberLoading`
  - `selectedMemberError`
  - `selectMember(memberId)`
  - `clearSelectedMember()`
- The owner should **not** expose or own:
  - `selectedMemberMemberships`
  - `selectedMemberReservations`
  - members-page edit form state
  - membership purchase/refund/hold drafts
  - reservation create/action state
- The owner must react to auth/session changes and clear stale member context when identity/role changes invalidate the current selection.
- Existing workspace-local state hooks (`useMembershipWorkspaceState`, `useReservationWorkspaceState`) should continue to receive `selectedMemberId`, but from the domain owner instead of direct `App.tsx` state.
- The migration should preserve current fallback UX:
  - `/memberships` without a selected member -> picker fallback
  - `/reservations` without a selected member -> target list / picker fallback
- `App.tsx` should continue composing routes and sections, but it should stop owning selected-member business rules.

### Research Insights

**Best Practices**
- Keep the provider API narrow. Exposing derived helpers or page-specific mutation state from the owner would recreate shell-style coupling in a different place.
- React context should carry dynamic state from a provider, but page-local state such as purchase forms, reservation forms, and messages should remain in their existing slice-level hooks.
- Query ownership should remain where the data is actually consumed. The provider is only a shared pointer to “which member is active now,” not a replacement for memberships/reservations/access query modules.

**Performance Considerations**
- Member detail fetches should stay request-id guarded so a stale response cannot repopulate cleared context after auth changes or rapid reselection.
- The provider should avoid becoming a broad render hotspot; only selected-member state and transitions belong there.

**Edge Cases**
- Trainer/user scope changes must clear member context even if the newly active session would still allow some members, because the provider cannot assume the current selection remains valid without revalidation.
- Invalid direct handoffs from reservations/memberships should preserve today's picker/list fallback behavior instead of surfacing a blank page.

## System-Wide Impact

- **Interaction graph**
  - members domain becomes the source of truth for current member context
  - memberships/reservations become consumers of that source rather than side-loading member detail directly
- **Error propagation**
  - member load failures should stay local to the selected-member owner and surface through consumer UI without duplicating error logic in multiple sections
- **State lifecycle risks**
  - auth/session resets must clear member context consistently
  - route transitions should not accidentally clear valid selected-member context
- **Integration points**
  - `loadMemberDetail()` behavior in `App.tsx`
  - members-page edit/open flow
  - memberships picker workflow
  - reservation target selection workflow
  - shell/auth reset behavior

### Research Insights

**Best Practices**
- The riskiest system interaction is not rendering; it is transition timing. Member-context consumers must never observe a half-cleared state where one slice thinks a member is selected and another does not.
- Consumer migration should happen in a way that preserves current entry points: member list selection, reservation target selection, and explicit workspace pickers must all reach the same owner.

**Implementation Details**
- Focus parity validation on transitions:
  - members list row -> members edit/open state
  - member list -> memberships
  - reservation target -> reservations
  - auth change -> member-context clear
  - workspace switch with current selection intact

**References**
- React official docs: sharing state between components, passing data deeply with context, and preserving/resetting state patterns.

## Implementation Phases

### Phase 1: Create The Canonical Owner

Goal:
- introduce a members-domain selected-member provider/store in the baseline frontend

Scope:
- add a provider and hook under the members domain
- move member detail loading contract into the provider
- support `selectMember()` and `clearSelectedMember()`
- clear selection on auth identity/role changes
- leave memberships/reservations/access/lockers query ownership outside the provider

Target files:
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/members/...` new selected-member module(s)
- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`
- `/Users/abc/projects/GymCRM_V2/frontend/src/shared/hooks/useAuthSession.ts` consumer wiring only if needed

Success criteria:
- there is exactly one selected-member owner
- `App.tsx` no longer owns raw `selectedMember` business rules directly
- auth changes cannot leave stale selected member state behind

### Research Insights

**Implementation Details**
- Start by creating the provider and wrapping the current shell with it before changing consumer code. This lets us verify ownership in isolation.
- Port the rebuild's request-id and auth-identity reset pattern nearly as-is, but adapt it to the baseline auth/session hook instead of the prototype auth preset layer.
- Keep `loadMemberMemberships()` and `loadReservationsForMember()` out of the provider during this phase. They remain slice-owned and will subscribe to provider state later.

### Phase 2: Rewire Memberships And Reservations

Goal:
- make the existing member-context consumers read from the canonical owner

Scope:
- memberships section consumes selected-member provider state
- reservations section consumes selected-member provider state
- current picker/target list flows call `selectMember()` instead of duplicating detail-load logic
- keep current fallback UX intact

Target files:
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/memberships/MembershipsSection.tsx`
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/reservations/ReservationsSection.tsx`
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/reservations/ReservationManagementPanels.tsx`
- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`

Success criteria:
- memberships and reservations do not each reinvent member selection rules
- invalid/unauthorized member handoff falls back safely
- existing UX remains functionally equivalent

### Research Insights

**Implementation Details**
- `onSelectWorkspaceMember`, reservation target row clicks, and any existing “change member” actions should all call the provider's `selectMember()` contract.
- Consumer pages should stop depending on shell-local `loadMemberDetail()` or `setSelectedMemberId()` helpers once this phase is complete.

**Edge Cases**
- Reservations should keep their current “target list first” behavior when no member is selected.
- Memberships should keep their current picker-first fallback when a handoff fails or the member becomes unavailable.

### Phase 2.5: Rewire Members Edit / Open Flow

Goal:
- ensure the members page does not remain a practical second owner of current member context

Scope:
- row click, “회원 선택”, and editor open flows use the canonical selected-member owner
- members-page edit form state remains page-local, but derives its current member from the provider
- create/edit success paths update provider-backed current member state instead of bypassing it

Target files:
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/members/MemberManagementPanels.tsx`
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/members/MembersSection.tsx`
- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`

Success criteria:
- the members page no longer maintains a separate practical owner for “current member”
- members edit/open behavior and workspace handoff behavior are explainable from the same ownership model

### Phase 3: Reduce App-Shell Coordination

Goal:
- remove the remaining selected-member coordinator residue from `App.tsx`

Scope:
- delete duplicated local state and helper branches that become obsolete
- keep workspace-local state hooks intact, but feed them from the provider
- update tests to assert selected-member ownership through the members domain rather than the shell
- delete obsolete members-page shell helpers after members edit/open flow has been migrated

Success criteria:
- `App.tsx` remains a composition layer, not the canonical selected-member store
- selected-member behavior is easier to locate and reason about from code search

### Research Insights

**Best Practices**
- Cleanup should happen only after provider-backed consumers are already passing parity checks. Removing shell state too early will blur whether a regression came from ownership or from consumer rewiring.
- Tests should lock the new ownership boundary in place so later work does not drift selected-member state back into `App.tsx`.

## Acceptance Criteria

- [x] a members-domain canonical owner exists for selected-member state
- [x] auth/session changes clear stale selected-member context
- [x] memberships and reservations consume the selected-member owner instead of duplicating member-detail logic
- [x] members edit/open flow participates in the same selected-member ownership model
- [x] current picker/list fallback behavior remains intact
- [x] `App.tsx` no longer serves as the de facto selected-member business-logic owner
- [x] tests cover auth-driven clear and consumer handoff behavior

### Research Insights

**Recommended Validation**
- Add provider-level tests for:
  - successful member select
  - auth-driven clear
  - stale request discard
- Add consumer-level tests for:
  - members row select / editor open parity
  - memberships picker fallback
  - reservations target handoff
  - invalid member handoff preserving fallback UI

## Success Metrics

- selected-member behavior is discoverable from a single domain module instead of scattered through `App.tsx`
- memberships/reservations handoff logic becomes smaller and more consistent
- auth or route changes are less likely to leave stale member context behind
- future member-context routing work has a clearer ownership boundary to build on

## Dependencies & Risks

### Dependencies

- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/frontend-rebuild/src/pages/members/modules/SelectedMemberContext.tsx`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/plans/2026-03-13-refactor-rebuild-pattern-harvest-into-main-plan.md`
- current shell-only routing baseline in `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`

### Risks

- moving ownership too aggressively can break existing memberships/reservations fallback behavior
- consumers may still carry hidden assumptions about `App.tsx`-local state
- auth/session reset parity must be validated carefully to avoid regressions in prototype/jwt modes

### Research Insights

**Mitigations**
- Keep the first phase narrow and provider-focused.
- Rewire consumers one domain at a time instead of switching all member-context users at once.
- Treat auth/session reset parity as a first-class acceptance criterion, not a post-merge cleanup.

## Recommended Execution Order

1. create selected-member provider in the members domain
2. migrate `loadMemberDetail()` semantics into that provider
3. rewire memberships and reservations consumers
4. remove obsolete `App.tsx` state/branches
5. run focused browser and test validation

Why this order:
- it establishes ownership first
- then consumer migration becomes mechanical rather than speculative
- cleanup happens only after parity is visible

## Sources & References

- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/frontend-rebuild/src/pages/members/modules/SelectedMemberContext.tsx`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/plans/2026-03-13-refactor-rebuild-pattern-harvest-into-main-plan.md`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-readiness-checkpoint.md`
- React official docs on:
  - sharing state between components
  - passing data deeply with context
  - preserving and resetting state
