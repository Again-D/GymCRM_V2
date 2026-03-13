---
title: "refactor: Frontend page-scoped CSS and UI polish"
type: refactor
status: active
date: 2026-03-13
origin: docs/brainstorms/2026-03-12-frontend-rebuild-comparison-brainstorm.md
---

# Refactor: Frontend page-scoped CSS and UI polish

## Enhancement Summary

**Deepened on:** 2026-03-13  
**Sections enhanced:** Overview, Technical Approach, Implementation Phases, Token-Cost Efficiency Plan, Acceptance Criteria, Sources & References

### Key Improvements

1. CSS ownership 기준을 `global / shared-layout / page-scoped modules`로 더 엄격하게 정의하고, 어디에 어떤 selector를 둘지 결정 규칙을 구체화했다.
2. phase별 완료 조건, migration 체크리스트, 검증 샘플링 전략을 추가해 실제 실행 중 흔들릴 부분을 줄였다.
3. Vite CSS import/cascade 특성과 현재 코드베이스의 shared selector 분포를 반영해 import 순서 및 specificity 리스크를 보강했다.
4. 토큰 비용 절감 전략을 “읽기 범위 통제”, “phase 배치”, “대표 페이지 검증”, “selector inventory 고정” 수준까지 세분화했다.

### New Considerations Discovered

- 현재 `frontend/src/index.css`에는 단순 토큰만 있는 것이 아니라 `placeholder-card`, `placeholder-stack`, `context-fallback-toolbar`처럼 사실상 page/workspace 성격을 띠는 shared selectors가 일부 남아 있다. 이들은 무조건 global에 둘지, shared workspace primitives로 따로 남길지 먼저 분류해야 한다.
- Vite는 CSS를 모듈 그래프의 일부로 처리하고 build 시 async chunk CSS도 자동 로드하므로 CSS Modules 도입 자체는 현재 빌드 구조와 잘 맞는다. 다만 global primitive와 module-local selectors가 혼합될 때는 **global vs local 경계**와 `className` 치환 누락이 주요 회귀 포인트가 된다.
- “페이지별 CSS 분리”와 “UI polish”는 같은 작업처럼 보이지만, 회귀 리스크를 줄이려면 구조 분리 단계와 시각 polish 단계를 분리해서 진행하는 편이 낫다.

## Overview

`frontend/src/index.css` currently mixes three responsibilities:

1. global design primitives
2. shared app-shell/layout rules
3. page-specific visual tweaks

That was acceptable while the rebuild was proving routing, state ownership, and query orchestration, but it is now becoming a drag on UI polish work. We recently removed repeated inline styles, which was the right first step, but the next step should be structural: move page-specific styling into page-scoped CSS Modules while keeping a lean shared foundation in `index.css`.

This plan follows the project’s current recommended direction of **“keep the existing frontend structure and refactor incrementally”** rather than attempting a rebuild (see brainstorm: `docs/brainstorms/2026-03-12-frontend-rebuild-comparison-brainstorm.md`). It also borrows the “stage one area first, then expand” principle from the dashboard theme brainstorm so we can improve quality without destabilizing the whole app at once (reference: `docs/brainstorms/2026-03-04-dashboard-theme-refactor-light-dark-brainstorm.md`).

## Problem Statement / Motivation

The current styling model makes UI refinement more expensive than it should be:

- `frontend/src/index.css` is becoming the catch-all home for both shared rules and page-specific adjustments.
- The shell, login, and workspace pages now have clearer structure, but visual decisions for spacing, panel emphasis, density, and local layout still live in a global file.
- Future polish work such as “make reservations denser,” “give products a more admin-heavy tone,” or “tune dashboard rhythm independently” will become increasingly risky if every change touches the global stylesheet.

The goal is not to invent a new design system or introduce CSS-in-JS. The goal is to create a clean split between:

- **Global foundation**: tokens, primitives, shared layout helpers, app-shell basics
- **Module-scoped styling**: page/component-specific hierarchy, spacing, arrangement, and visual polish

## Local Research Summary

### Repo Findings

- [`frontend/src/main.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/main.tsx) 에서 global stylesheet는 현재 한 번만 로드된다.
- [`frontend/src/index.css`](/Users/abc/projects/GymCRM_V2/frontend/src/index.css) 는 reset/token 수준을 넘어 shell, utility, workspace-shared, page-adjacent selectors까지 폭넓게 포함하고 있다.
- 현재 `frontend/src/pages` 아래 주요 진입 화면은 다음과 같다:
  - access
  - crm
  - dashboard
  - login
  - lockers
  - products
  - reservations
  - settlements
  - memberships
  - members / member-context
- 최근 작업으로 반복 inline styles는 제거됐지만, 그 결과 새 utility-like selector가 `index.css`로 더 모이는 형태가 되었다.
- shared selector 분포를 보면 `placeholder-card`, `placeholder-stack`, `context-fallback-toolbar`, `checkbox-row`, `detail-grid`, `compact-detail-grid`, `members-page-grid` 같은 규칙은 “완전한 global primitive”라기보다 “rebuild workspace surface 규칙”에 가깝다.

### Institutional Learnings Applied

- [docs/brainstorms/2026-03-12-frontend-rebuild-comparison-brainstorm.md](/Users/abc/projects/GymCRM_V2/docs/brainstorms/2026-03-12-frontend-rebuild-comparison-brainstorm.md)
  - current structure should be improved incrementally, not replaced
- [docs/brainstorms/2026-03-04-dashboard-theme-refactor-light-dark-brainstorm.md](/Users/abc/projects/GymCRM_V2/docs/brainstorms/2026-03-04-dashboard-theme-refactor-light-dark-brainstorm.md)
  - stage one area first, validate, then expand
- [docs/solutions/ui-bugs/admin-portal-sidebar-workspace-reorg-login-first-gymcrm-20260225.md](/Users/abc/projects/GymCRM_V2/docs/solutions/ui-bugs/admin-portal-sidebar-workspace-reorg-login-first-gymcrm-20260225.md)
  - visual cleanup is not enough if information hierarchy is weak
  - responsive verification must stay part of UI refactors
- [todos/095-complete-p3-extract-repeated-inline-frontend-styles.md](/Users/abc/projects/GymCRM_V2/todos/095-complete-p3-extract-repeated-inline-frontend-styles.md)
  - repeated inline style extraction succeeded, which makes the next problem one of ownership rather than duplication

### Minimal Framework Research

Vite official documentation confirms:

- importing CSS from JS/TS/component files is a supported first-class pattern
- CSS participates in the module graph
- CSS for async chunks is loaded before associated chunks evaluate, which helps avoid FOUC in build mode
- `@import` and asset URL rebasing are handled by Vite

This means the planned CSS-Modules-per-page/component approach is aligned with the existing build tool and does not require additional bundler customization. The main technical cautions are:

- keeping global primitives separate from module-local selectors
- avoiding partial migrations where some class names stay string-based while others switch to `styles.*`
- preventing visual drift caused by mixed global utility and module-local ownership

## Chosen Direction

Use a **global primitives + page-level CSS Modules hybrid split**, not a rebuild.

Carried forward decisions from the origin brainstorm:

- Keep the current frontend structure and improve it incrementally rather than restarting the UI architecture.
- Prefer targeted refactors that lower future cost without interrupting ongoing workspace development.
- Treat structural cleanup as a support layer for future feature work, not as an isolated aesthetic exercise.

Additional styling-specific decisions:

- Keep shared primitives in plain global CSS.
- Use colocated `*.module.css` files for shell/page/component-local styling.
- Do not introduce Tailwind, CSS-in-JS, or a new styling library in this pass.
- Update plan execution in two passes:
  - Pass A: CSS ownership split only
  - Pass B: targeted UI polish on top of the new ownership model

## Why This Approach

This gives the best balance of cost and leverage:

- It preserves the current routing and page ownership model.
- It reduces global stylesheet sprawl without changing the rendering model.
- It makes future UI polish cheaper because each page/component gets an obvious local styling boundary.
- It reduces accidental selector collision without forcing a broader styling-stack migration.
- It keeps token usage efficient during implementation because each pass can focus on one page, one module file, and one small set of className conversions instead of reopening the entire app.

## Technical Approach

### Styling Target Architecture

#### 1. Global Layer

Keep these in [`frontend/src/index.css`](/Users/abc/projects/GymCRM_V2/frontend/src/index.css):

- color variables and typography defaults
- element resets
- button primitives
- shared card primitives
- table primitives
- pills/badges
- pagination primitives
- small reusable utilities that are truly shared
- responsive primitives used by many pages

Examples that likely stay global:

- `:root` variables
- reset rules
- `.primary-button`, `.secondary-button`
- `.panel-card`, `.selected-member-card`
- `.members-table`
- generic pills and pagination rules

Examples that should be challenged before staying global:

- `.placeholder-card`
- `.placeholder-stack`
- `.context-fallback-toolbar`
- `.members-page-grid`
- `.detail-grid`
- `.compact-detail-grid`

#### 2. Shared Layout Layer

Create component-level CSS files for reusable structural surfaces:

- [`frontend/src/components/layout/DashboardLayout.css`](/Users/abc/projects/GymCRM_V2/frontend/src/components/layout/DashboardLayout.tsx)
- Optional future extraction for shared member-context surfaces if styling grows

This layer should contain:

- sidebar layout and navigation look
- auth panel styling
- shell-specific spacing and responsive behavior
- nav active-state presentation
- shell-only typography/layout helpers that should not leak into page CSS

#### 3. Module Layer

Add page-scoped CSS Modules alongside each page/component, for example:

- [`frontend/src/pages/Dashboard.module.css`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/Dashboard.tsx)
- [`frontend/src/pages/Login.module.css`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/Login.tsx)
- [`frontend/src/pages/access/AccessPage.module.css`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/access/AccessPage.tsx)
- [`frontend/src/pages/products/ProductsPage.module.css`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/products/ProductsPage.tsx)
- [`frontend/src/pages/reservations/ReservationsPage.module.css`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/reservations/ReservationsPage.tsx)
- [`frontend/src/pages/crm/CrmPage.module.css`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/crm/CrmPage.tsx)
- [`frontend/src/pages/lockers/LockersPage.module.css`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/lockers/LockersPage.tsx)
- [`frontend/src/pages/settlements/SettlementsPage.module.css`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/settlements/SettlementsPage.tsx)
- Optional later: memberships and members page/component modules once those screens get targeted polish

Module CSS should own:

- panel ordering and local spacing rhythm
- page-specific empty-state presentation
- local density tuning
- emphasis hierarchy for sections within a workspace
- page-only responsive refinements
- component-local shell/page arrangement rules that should not be globally reusable

### Selector Inventory Rule

Before moving any CSS, create an explicit selector inventory with three columns:

| Selector | Current file | Target owner |
|----------|--------------|--------------|
| `.panel-card` | `index.css` | global |
| `.app-shellSidebar` | `index.css` | `DashboardLayout.module.css` |
| `.summaryCard` | new | `AccessPage.module.css` |

This inventory should be created once at the start of implementation and updated only when a conscious ownership decision changes. It prevents repeated “where should this live?” debates that burn both time and tokens.

### Naming Strategy

Use semantic local names inside each module file and rely on CSS Modules for collision safety:

- `.summaryCard`
- `.editorPane`
- `.contextColumn`
- `.routeList`

Use short shared primitives only when they are truly cross-page:

- `.panel-card`
- `.primary-button`
- `.members-table`

Do not create new ambiguous global utility names like:

- `.section-box`
- `.content-wrap`
- `.page-panel`

unless they are deliberately shared and documented. Prefer local module names for page-only layout rules.

### Import Strategy

Each page/component should import only its own CSS Module file:

```tsx
import styles from "./AccessPage.module.css";
```

Global CSS remains imported once from [`frontend/src/main.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/main.tsx).

Order rule:

1. `main.tsx` continues to import `index.css` once
2. each page/component imports its own local module in the component file
3. module CSS should assume global primitives exist, but should not re-define them

Implementation caution:

- if a component-level module and a page-level module both try to own the same visual concern, the problem becomes ownership confusion rather than selector collision
- prefer a single owning module per surface instead of layering multiple local modules on the same DOM subtree without a clear boundary
- global classes such as `panel-card` or `primary-button` should stay string-based; module-local classes should use `styles.*`

### Scope Boundary Rule

Before placing a selector in `index.css`, ask:

1. Will 3+ pages use this?
2. Is it a design primitive rather than a page decision?
3. Would changing it globally be desirable?

If the answer is not clearly “yes,” keep it in the page/module file.

### Migration Guardrails

- Do not move query/state logic while moving CSS ownership.
- Do not rename class names purely for taste if the current name is already stable and clear.
- Do not mix markup refactor and visual polish into the same patch unless the markup change is required for selector scoping.
- When a selector is shared by exactly two pages, bias toward a shared layout/workspace file only if the semantic surface is genuinely shared. Otherwise duplicate intentionally into two modules and revisit later.
- Do not convert shared primitives like `panel-card` into module-local classes just for consistency; keep the global/module boundary meaningful.
- During migration, avoid mixed usage like `className="summaryCard"` after introducing modules. All local selectors should switch completely to `styles.summaryCard`.

## Implementation Phases

### Phase 1: Baseline and Styling Contract

#### Goals

- Freeze the shared/global boundary before migrating page styles.
- Prevent `index.css` from continuing to absorb page-local rules.

#### Tasks

- Audit `index.css` into three buckets:
  - keep global
  - move to shared layout module
  - move to page module
- Define naming conventions for module-local selectors and component-side `styles.*` usage.
- Identify the first-wave pages:
  - DashboardLayout
  - Login
  - Dashboard
  - Access
  - Products
  - Reservations
- Record a “do not add page-local selectors to `index.css`” rule in the plan execution notes or todo comments if needed.
- Create a selector inventory table before moving any rules.
- Identify selectors that are rebuild-workspace shared rather than globally generic.
- Decide whether `members` / `memberships` stay out of scope for the first pass or get pulled in as shared-surface outliers.

#### Deliverables

- final CSS ownership map
- target file list
- migration order
- selector inventory snapshot
- module adoption rules

#### Done When

- `index.css` ownership is explicitly documented
- no ambiguous selector remains unlabeled in the inventory
- implementation order is fixed before code edits begin
- module naming and import rules are fixed before any batch migration starts

#### Estimated Effort

- Small

### Phase 2: Shell and Entry Surfaces

#### Goals

- Isolate the app shell and entry views first because they are cross-cutting and visually central.

#### Tasks

- Create `DashboardLayout.module.css` and move shell-specific styling out of `index.css`.
- Convert [`frontend/src/components/layout/DashboardLayout.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/components/layout/DashboardLayout.tsx) to use `styles.*` for shell-local selectors.
- Create `Login.module.css` and `Dashboard.module.css`.
- Move login/dashboard-local rhythm and text styling out of `index.css`.
- Keep only generic typography/status utility styles global if they are reused elsewhere.
- Verify nav active/inactive styling works without depending on global selector coincidence.
- Confirm login shell still renders correctly in JWT unauthenticated flow.

#### Deliverables

- shell styling isolated from page styling
- entry surfaces prepared for future polish work

#### Done When

- shell selectors are no longer authored in `index.css`
- login and dashboard have local module entrypoints
- authenticated and unauthenticated shell paths both render without visual regression

#### Estimated Effort

- Small-Medium

### Phase 3: First-Wave Workspace Migration

#### Goals

- Move the busiest operational screens onto page-scoped CSS Modules.

#### Tasks

- Create `AccessPage.module.css`, `ProductsPage.module.css`, and `ReservationsPage.module.css`.
- Move page-specific classes from `index.css` into those modules.
- Replace generic utility overuse where a page-local selector is clearer.
- Refine local hierarchy while migrating:
  - section spacing
  - card prominence
  - local dense vs roomy table context
  - empty-state readability
- Keep DOM structure changes light unless needed for clarity.
- If a page still relies on a “global utility” that is only used there, rename and move it into the page module during this phase.

#### Deliverables

- three key pages isolated enough for independent UI iteration

#### Done When

- Access, Products, and Reservations can each accept local visual tweaks without touching `index.css`
- module files own their local rhythm and hierarchy selectors
- no first-wave page-specific selector is left in `index.css`

#### Estimated Effort

- Medium

### Phase 4: Remaining Workspace Migration

#### Goals

- Finish the page-scoped module split across remaining workspaces.

#### Tasks

- Create `CrmPage.module.css`, `LockersPage.module.css`, and `SettlementsPage.module.css`.
- Move their page-local rules out of `index.css`.
- Review whether memberships and members pages need immediate CSS files or can wait until they receive focused visual work.
- Ensure no orphan selectors remain in `index.css`.
- Evaluate whether `placeholder-*` surfaces should become a shared workspace-surface CSS file rather than staying global.

#### Deliverables

- complete first-pass page CSS split for core workspaces

#### Done When

- remaining targeted workspaces have their own module files
- `index.css` is visibly smaller and more primitive-focused
- any intentionally deferred pages are explicitly listed

#### Estimated Effort

- Medium

### Phase 5: UI Polish Pass

#### Goals

- Use the new CSS structure to make targeted visual improvements with lower risk.

#### Tasks

- Review each migrated page for:
  - spacing rhythm
  - panel grouping
  - readability of dense data
  - action prominence
  - mobile compression behavior
- Apply page-specific polish without modifying unrelated pages.
- Capture screenshots for before/after on the most impacted pages.
- Review one representative dense page on a narrow viewport before broadening polish changes.

#### Deliverables

- visibly cleaner workspace presentation
- stronger information hierarchy with lower regression risk

#### Done When

- before/after screenshots exist for representative pages
- polish changes are isolated to module files
- no broad global visual regressions are observed

#### Estimated Effort

- Medium-Large depending on ambition

## Alternative Approaches Considered

### Option A: Keep using only `index.css`

**Rejected because:**

- it keeps local page polish expensive
- it encourages accidental cross-page coupling
- it makes ownership unclear

### Option B: Use global primitives plus CSS Modules

**Chosen because:**

- it improves ownership and collision safety at the same time
- it still fits the current Vite + React stack without additional tooling
- it gives page-level polish a natural home while preserving existing shared primitives

### Option C: Adopt Tailwind or another utility framework

**Rejected for now because:**

- it would change the implementation model rather than just improve current structure
- the request is to make page polish easier, not to replace the styling stack

## SpecFlow Gap Analysis

### Happy Path

- each targeted page/component imports its own module file
- shared primitives remain in `index.css`
- local polish changes stay isolated to one page

### Invalid / Drift Scenarios

- page selectors accidentally stay in `index.css`, so ownership remains muddy
- overly generic utility classes reintroduce global coupling under a different name
- local class conversion is only partially applied, leaving `styles.*` and string classes mixed incorrectly

### Boundary Conditions

- mobile breakpoint behavior must stay intact when rules are split
- layout shell must not regress in authenticated vs unauthenticated states
- table overflow wrappers must keep horizontal scrolling behavior

### Concurrent / Team Workflow Risks

- multiple UI changes landing in parallel can cause duplicated ownership decisions across modules
- if module adoption rules are inconsistent, reviewers will spend more time reconciling style ownership

### Failure Scenarios

- import omission causes a page to render unstyled
- selector migration changes specificity and unexpectedly alters a shared component
- “quick fix” additions return to `index.css`, undoing the structural benefit
- a selector that looked page-local is actually referenced from a shared child component
- duplicate page-local selector names create false coupling during later edits

## System-Wide Impact

### Interaction Graph

This is mostly a presentation-layer refactor. The main interaction surface is:

- `main.tsx` loads `index.css`
- page/component files load their local CSS Modules
- React routing composes shell + page UI
- tests render the same components, so missing imports or incorrect `styles.*` usage surface visually or via layout-sensitive assertions

No backend callbacks or data mutation chains are involved.

### Error & Failure Propagation

- The likely failures are visual: missing styles, broken responsive layout, or local class mapping mistakes.
- Runtime JavaScript error risk is still low, but wrong module import names or `styles.foo` typos can create silent unstyled states.

### State Lifecycle Risks

- None for persisted application state.
- The risk is UI readability or accidental hiding/misalignment of controls.

### API Surface Parity

- Shell, login, and workspace pages all share the same styling foundation.
- If one page adopts modules while another stays half-global/half-local without a clear rule, the style ownership model becomes inconsistent.

### Integration Test Scenarios

- authenticated shell renders correctly with local CSS imports present
- unauthenticated `/login` remains readable and aligned
- key workspace pages still render their primary tables/cards without losing structure
- mobile-ish narrow viewport screenshot check on at least one dense workspace page

## Implementation Details

### Suggested File Creation Order

1. `frontend/src/components/layout/DashboardLayout.module.css`
2. `frontend/src/pages/Login.module.css`
3. `frontend/src/pages/Dashboard.module.css`
4. `frontend/src/pages/access/AccessPage.module.css`
5. `frontend/src/pages/products/ProductsPage.module.css`
6. `frontend/src/pages/reservations/ReservationsPage.module.css`
7. `frontend/src/pages/crm/CrmPage.module.css`
8. `frontend/src/pages/lockers/LockersPage.module.css`
9. `frontend/src/pages/settlements/SettlementsPage.module.css`

This order maximizes leverage because:

- shell and entry surfaces influence everything visually
- first-wave operational pages are the most likely to need near-term polish
- later pages can reuse the ownership decisions already proven earlier

### Migration Patch Template

For each page:

1. add `import styles from "./PageName.module.css";`
2. create the module file with only selectors used by that page
3. move page-local selectors from `index.css`
4. convert local `className` usage to `styles.*`
5. run page-relevant tests
6. only then remove the old selectors from `index.css`

This order reduces the risk of a temporary unstyled page during implementation.

### Example Selector Split

```css
/* stays in index.css */
.panel-card {
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(22, 33, 38, 0.1);
}
```

```css
/* moves to AccessPage.module.css */
.summaryCard {
  margin-bottom: 16px;
}
```

```tsx
// AccessPage.tsx
import styles from "./AccessPage.module.css";
```

### Representative Validation Matrix

| Surface | Why it matters | Validation |
|--------|----------------|------------|
| Login | simplest entry page, unauthenticated path | route render + screenshot |
| DashboardLayout | shell-wide impact | sidebar/nav/auth-panel screenshot |
| Reservations | dense, action-heavy, two-column layout | route render + narrow viewport screenshot |
| Products | form-heavy admin surface | route render + editor area screenshot |
| Access | summary + tables + selection state | route render + table readability check |

## Token-Cost Efficiency Plan

This refactor can consume tokens unnecessarily if done as a “read every page, rewrite everything” operation. The implementation should be structured to minimize repeated context loading.

### Core Strategy

#### 1. Work one page family at a time

Load only:

- the page component
- its new module file
- relevant shared CSS section

Avoid reopening unrelated pages while working on one target.

#### 2. Freeze the shared contract early

Decide once what stays in `index.css` vs module-local CSS. Re-deciding this on every page wastes tokens and causes churn.

Concretely:

- create the selector inventory before implementation
- do not reopen ownership decisions unless a selector is discovered to be used by another page

#### 3. Use a migration checklist template

For each page:

- create module file
- import module
- move selectors
- convert local class usage to `styles.*`
- remove global leftovers
- verify tests

This reduces planning repetition during execution.

Also reuse the same patch shape for every page:

- add import
- add module file
- move selectors
- run targeted checks
- remove globals

#### 4. Prefer selector moves over markup rewrites

If the DOM already communicates the structure well, move classes and CSS first. Avoid spending tokens on JSX restructuring unless it directly improves hierarchy.

#### 5. Batch reads, keep edits narrow

When implementing:

- batch-read target files once
- patch only the touched page and module file
- avoid full-project rereads after each small change

Token-efficient batch suggestion:

- Batch A: `index.css` + target page + new module file
- Batch B: sibling shared layout file only if a selector is reused
- Skip reopening unrelated pages unless a class name is discovered there by `rg`

#### 6. Validate by representative pages

Do not browser-test every screen after every micro-change. Validate by representative buckets:

- shell/login
- dense data workspace
- action-heavy workspace

Then run the full test suite once per completed phase.

Do not spend tokens on:

- repeated global `rg` scans after every selector move
- re-reading full-page files whose only change is CSS import placement
- large prose check-ins after each micro-refactor

### Expected Token Savings

- lower repeated context loading
- fewer broad diffs in `index.css`
- fewer cross-page naming collisions
- reduced need to re-evaluate unrelated pages during polish

### Suggested Token Budget by Phase

| Phase | Budget posture | Why |
|------|----------------|-----|
| Phase 1 | deliberate | ownership decisions are expensive to revisit |
| Phase 2 | moderate | shell/login/dashboard set patterns for later work |
| Phase 3 | efficient and repetitive | apply established migration template |
| Phase 4 | efficient and repetitive | repeat with remaining pages |
| Phase 5 | selective | spend tokens on visual judgment, not structural rereads |

## Acceptance Criteria

### Functional / Structural

- [ ] `frontend/src/index.css` contains only global/shared primitives and intentionally shared utilities
- [ ] Shell-specific styles live outside `index.css`
- [ ] Each targeted page imports its own `*.module.css` file
- [ ] Page-local selectors are owned through CSS Modules rather than accidental global coupling

### UI / UX

- [ ] Dashboard, login, and primary workspaces can be polished independently without editing `index.css`
- [ ] Mobile and narrow-layout behavior remain intact
- [ ] Dense operational screens remain readable after the split

### Quality Gates

- [ ] `cd /Users/abc/projects/GymCRM_V2/frontend && npm test` passes
- [ ] Browser/screenshot verification is run on the most impacted pages
- [ ] No repeated page-only selectors remain in `index.css`
- [ ] New module imports are present and correctly resolved
- [ ] Shared global classes and local module classes are not mixed ambiguously on the same ownership boundary
- [ ] Deferred pages are explicitly recorded rather than silently left half-migrated

## Success Metrics

- Lower frequency of page-only selector edits in `index.css`
- Faster iteration on one page without spillover edits on unrelated pages
- Smaller future UI diffs because local polish stays inside module files
- Clearer review diffs where style changes map cleanly to one page

## Dependencies & Risks

### Dependencies

- existing React page/component structure
- Vite CSS import handling
- current test suite for regression confidence

### Risks

- partial `styles.*` conversion leaving pages half-global and half-local
- accidental duplication of shared primitives in module files
- too many utility classes migrating back into a pseudo-global layer

### Mitigations

- keep shared/page boundary explicit
- migrate in phases, not all at once
- use before/after screenshots for the most changed pages
- keep module-local ownership explicit
- validate selector ownership with `rg` before deleting moved rules

## Operational / Review Notes

Even though this is a frontend styling refactor, reviewers should explicitly check:

- whether any moved selector was secretly shared by another page/component
- whether any local class should have remained global
- whether shell/login still look correct in unauthenticated and authenticated flows
- whether mobile layout regressions were checked on at least one dense workspace page

## Resource Requirements

- 1 engineer
- roughly half day for structural split
- 1 additional day if UI polish is applied broadly across all workspaces

## Documentation Plan

- Keep this plan updated during execution
- If the final structure becomes the new frontend convention, add a short note to frontend documentation or folder-structure notes explaining:
  - what belongs in `index.css`
  - what belongs in `*.module.css`
  - when to keep a class global vs local
  - naming conventions for module-local selectors and `styles.*` usage

## Sources & References

### Origin

- **Brainstorm document:** [docs/brainstorms/2026-03-12-frontend-rebuild-comparison-brainstorm.md](/Users/abc/projects/GymCRM_V2/docs/brainstorms/2026-03-12-frontend-rebuild-comparison-brainstorm.md)
  - carried-forward decisions:
  - keep the current frontend structure
  - prefer incremental refactoring over rebuild
  - improve local boundaries where ongoing work is getting expensive

### Additional Brainstorm Reference

- [docs/brainstorms/2026-03-04-dashboard-theme-refactor-light-dark-brainstorm.md](/Users/abc/projects/GymCRM_V2/docs/brainstorms/2026-03-04-dashboard-theme-refactor-light-dark-brainstorm.md)
  - reused principle: stage one surface first, validate, then expand

### Internal References

- shared stylesheet: [frontend/src/index.css](/Users/abc/projects/GymCRM_V2/frontend/src/index.css)
- shell layout: [frontend/src/components/layout/DashboardLayout.tsx](/Users/abc/projects/GymCRM_V2/frontend/src/components/layout/DashboardLayout.tsx)
- recent inline-style extraction result: [todos/095-complete-p3-extract-repeated-inline-frontend-styles.md](/Users/abc/projects/GymCRM_V2/todos/095-complete-p3-extract-repeated-inline-frontend-styles.md)
- selector usage scan: pages under [frontend/src/pages](/Users/abc/projects/GymCRM_V2/frontend/src/pages)

### Institutional Learnings

- [docs/solutions/ui-bugs/admin-portal-sidebar-workspace-reorg-login-first-gymcrm-20260225.md](/Users/abc/projects/GymCRM_V2/docs/solutions/ui-bugs/admin-portal-sidebar-workspace-reorg-login-first-gymcrm-20260225.md)
  - styling-only cleanup is not enough when information architecture is the real issue
  - responsive stability must be verified during UI refactors
- [docs/solutions/runtime-errors/memberships-workspace-maximum-update-depth-effect-loop-gymcrm-20260313.md](/Users/abc/projects/GymCRM_V2/docs/solutions/runtime-errors/memberships-workspace-maximum-update-depth-effect-loop-gymcrm-20260313.md)
  - keep styling changes clearly separated from state/query lifecycle work to reduce regression debugging cost

### Minimal External References

- Vite official docs, CSS as part of the module graph and CSS code splitting behavior
- Vite official docs, CSS `@import` and asset URL rebasing support

## Execution Checklist

- [ ] Define and document the global vs page CSS ownership rule
- [ ] Define and document the global vs module CSS ownership rule
- [ ] Build the selector inventory table
- [ ] Create `DashboardLayout.module.css` and migrate shell styles
- [ ] Create `Login.module.css` and `Dashboard.module.css`
- [ ] Create `AccessPage.module.css`, `ProductsPage.module.css`, and `ReservationsPage.module.css`
- [ ] Create `CrmPage.module.css`, `LockersPage.module.css`, and `SettlementsPage.module.css`
- [ ] Remove migrated page-local selectors from `index.css`
- [ ] Run frontend tests
- [ ] Capture representative before/after screenshots
- [ ] Update this plan with completed checkboxes during execution
