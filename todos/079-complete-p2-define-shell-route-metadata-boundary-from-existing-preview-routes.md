---
status: complete
priority: p2
issue_id: "079"
tags: [code-review, quality, architecture, frontend, routing, react]
dependencies: []
---

# Define shell route metadata boundary from existing preview routes

## Problem Statement

The shell-only routing plan promotes `/Users/abc/projects/GymCRM_V2/frontend/src/app/routes.tsx` into the canonical route metadata source for `App.tsx`, `SidebarNav`, and `DashboardSection`, but the file currently already contains non-shell preview entries like `/members/:memberId` and `/products/new`.

Without an explicit rule for separating shell routes from preview/detail routes, implementation can accidentally expose non-goal routes in sidebar/dashboard navigation, or overwrite the existing preview usage with a shell-only interpretation that drops valid metadata consumers. This creates route drift at the exact point the plan is trying to centralize.

## Findings

- The plan says `routes.tsx` should become the canonical shared route metadata source for shell navigation.
- The current file already contains entries outside this plan's route surface, including `/members/:memberId` and `/products/new`.
- The plan does not specify whether `routes.tsx` should be split into shell vs preview metadata, or whether a new exported subset should be introduced.
- `DashboardSection` still consumes `routePreview`, while the shell-only plan also wants the same source to drive sidebar/dashboard navigation and `App.tsx` section derivation.

## Proposed Solutions

### Option 1: Split route metadata into shell and preview exports

**Approach:**
Keep `/Users/abc/projects/GymCRM_V2/frontend/src/app/routes.tsx` but export separate arrays such as `shellRoutes` and `routePreviewRoutes`, with shell-only navigation consuming only `shellRoutes`.

**Pros:**
- Keeps the existing preview use case intact.
- Makes shell-only scope explicit.
- Minimizes accidental exposure of detail/non-goal routes.

**Cons:**
- Slightly more metadata structure to maintain.

**Effort:** Small

**Risk:** Low

### Option 2: Move shell routes to a dedicated file

**Approach:**
Create a dedicated shell route config file and leave the existing preview `routes.tsx` untouched.

**Pros:**
- Strongest separation of concerns.
- Lowest ambiguity during implementation.

**Cons:**
- Duplicates some route metadata unless carefully composed.
- Adds another config surface.

**Effort:** Small-Medium

**Risk:** Low

## Recommended Action

**To be filled during triage.** Prefer Option 1 unless the team expects the preview metadata file to keep expanding independently of real route navigation.

## Technical Details

**Affected files:**
- `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-11-feat-shell-only-react-router-adoption-plan.md:93`
- `/Users/abc/projects/GymCRM_V2/frontend/src/app/routes.tsx:1`
- `/Users/abc/projects/GymCRM_V2/frontend/src/features/dashboard/DashboardSection.tsx:7`
- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx:802`

## Acceptance Criteria

- [ ] The plan explicitly states how shell route metadata is separated from existing preview/detail route entries.
- [ ] Sidebar, dashboard quick actions, and section derivation consume only shell route metadata.
- [ ] Non-goal routes like `/members/:memberId` and `/products/new` are not accidentally surfaced as shell navigation targets.
- [ ] `routePreview` usage remains intentional rather than inheriting shell-only filtering by accident.

## Work Log

### 2026-03-11 - Initial Discovery

**By:** Codex

**Actions:**
- Reviewed the shell-only routing plan against the current `/frontend/src/app/routes.tsx` contents.
- Compared the proposed canonical route-table direction with existing preview consumers in `App.tsx` and `DashboardSection.tsx`.
- Identified that the plan does not yet fix the boundary between shell navigation routes and existing non-shell preview entries.

### 2026-03-11 - Resolved In Plan

**By:** Codex

**Actions:**
- Updated `/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-11-feat-shell-only-react-router-adoption-plan.md` to require split exports from `/Users/abc/projects/GymCRM_V2/frontend/src/app/routes.tsx`.
- Pinned `shellRoutes` as the canonical source for `App.tsx`, `SidebarNav`, and `DashboardSection` navigation.
- Explicitly preserved non-shell preview/detail entries under `routePreviewRoutes` or equivalent non-navigation exports.

**Learnings:**
- Reusing a metadata file is fine, but only if the navigation subset is explicit.
- In this repo, `routePreview` already has a valid dashboard purpose, so the safe move is export separation rather than replacing the file wholesale.
