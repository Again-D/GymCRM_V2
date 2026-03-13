---
title: refactor: rebuild pattern harvest into main
type: refactor
status: active
date: 2026-03-13
---

# refactor: Rebuild Pattern Harvest Into Main

## Overview

The rebuild prototype branch in `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/frontend-rebuild` has now answered its main architectural question: the page-first structure, explicit query ownership, selected-member domain ownership, and invalidation contract all scale better than the current shell coordinator pattern in the baseline app.

The next work should not be “keep rebuilding until everything exists twice.” The next work should be to identify the strongest patterns the rebuild proved and reintroduce them into `main` deliberately, in production-safe increments.

This plan organizes that harvesting effort.

## Problem Statement / Motivation

The rebuild branch is useful because it is easier to explain and reason about than the current frontend. But the branch is still prototype-heavy and mock-driven. That means its biggest value is no longer breadth alone. Its biggest value is the **architectural evidence** it provides:

- route-level composition is easier to follow than a shell coordinator
- `selectedMember` works better as an explicit domain owner
- query-owned reads with explicit invalidation are more stable than bundled reload behavior
- slice-local state boundaries stay understandable as the app grows

If we leave those ideas trapped in the experiment branch, the most valuable output of the rebuild never reaches the actual product.

## Proposed Solution

Treat the rebuild as a reference implementation and run a focused pattern-harvest program back into `main`:

1. identify the highest-confidence patterns already proven in the rebuild
2. rank them by value and migration risk
3. move them back into the baseline frontend one by one with production-quality tests
4. record which patterns are adopted, deferred, or rejected

The goal is to improve the real app without forcing an all-at-once cutover.

## Technical Considerations

- Harvest patterns, not whole slices, unless a slice is small enough to migrate safely.
- Prefer production-backed migrations over mock-first code when moving into `main`.
- Keep shell routing, selected-member ownership, invalidation, and query boundaries as separate migration tracks.
- Avoid introducing a second coordinator while extracting patterns. Each adoption should reduce ambiguity in the baseline code.
- Every harvested pattern should have a parity check against the existing user-visible behavior in `main`.

## Pattern Candidates

### 1. Selected Member Canonical Ownership

Current rebuild evidence:
- members-domain source of truth
- memberships/reservations/access/lockers consume the same owner
- auth changes clear stale member context

Why harvest:
- this is one of the clearest wins versus the current `App.tsx` coordination pattern

Risk:
- medium
- affects multiple existing flows

### 2. Explicit Query Invalidation Contract

Current rebuild evidence:
- shared invalidation domains
- request-version guards
- cross-slice refresh behavior is easier to explain

Why harvest:
- improves stale-state handling without requiring a full UI rewrite

Risk:
- medium
- touches multiple query hooks and mutation flows

### 3. Page-Owned Query / Mutation Separation

Current rebuild evidence:
- each slice splits query reads from page-local mutation state
- easier to test and reason about than centralized state

Why harvest:
- strong long-term maintainability gain

Risk:
- medium to high
- requires iterative adoption per slice

### 4. Shell Route Metadata Discipline

Current rebuild evidence:
- explicit shell routes
- no hidden preview/detail routes leaking into navigation
- sidebar/dashboard share one route metadata source

Why harvest:
- improves navigation clarity
- lowers future routing drift

Risk:
- low to medium
- shell-only routing is already in `main`, so this is a refinement rather than a new concept

## Implementation Phases

### Phase 1: Harvest Candidate Selection

Goal:
- choose the first 2-3 rebuild patterns worth moving into `main`

Tasks:
- compare rebuild wins against current pain points in `main`
- rank by:
  - user value
  - migration risk
  - cross-slice impact
  - testability
- write a recommended adoption order

Success criteria:
- there is a written, prioritized list of harvest candidates
- each candidate has a clear “why now” and “why not yet”

### Phase 2: Adoption Planning Per Pattern

Goal:
- turn each selected pattern into a migration-ready plan for `main`

Tasks:
- define the target files/modules in `main`
- identify existing logic that must be preserved
- list regression risks and required tests
- decide whether the move is:
  - pure refactor
  - refactor + behavior cleanup
  - new infrastructure with delayed adoption

Success criteria:
- each chosen pattern has its own executable plan
- migration scope is bounded enough to run in normal feature branches

### Phase 3: Adoption Execution

Goal:
- move the highest-value rebuild patterns into `main`

Tasks:
- implement one pattern at a time
- verify parity with existing flows
- document what was adopted and what changed
- keep the rebuild branch available as a reference

Success criteria:
- at least one concrete rebuild pattern is successfully adopted into `main`
- the baseline app becomes easier to reason about without a full cutover

## Acceptance Criteria

- [ ] the rebuild branch’s strongest reusable patterns are identified explicitly
- [ ] there is a prioritized adoption order for moving patterns into `main`
- [ ] each selected pattern has a migration-ready follow-up plan
- [ ] the rebuild branch remains documented as a reference implementation while harvest work proceeds

## Success Metrics

- the next frontend architecture work in `main` starts from proven rebuild patterns instead of abstract preference
- the rebuild branch produces concrete improvements in the live codebase
- future frontend refactors in `main` become easier to explain and test

## Dependencies & Risks

### Dependencies

- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-readiness-checkpoint.md`
- draft PR `#73`
- rebuild slice hardening notes and smoke artifacts

### Risks

- harvesting too many patterns at once can recreate cutover-sized risk inside `main`
- some prototype-friendly patterns may need different implementation details against real APIs
- without explicit prioritization, the team may keep the rebuild branch but adopt none of its benefits

## Recommended Execution Order

1. selected-member ownership
2. explicit query invalidation contract
3. page-owned query/mutation separation
4. route metadata discipline refinements

Why this order:
- the first two offer the clearest stability and maintainability wins
- the third is valuable but broader
- the fourth is useful, but the baseline app already has partial progress there

## Sources & References

- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-readiness-checkpoint.md`
- `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-parity-hardening.md`
- draft PR `#73`
