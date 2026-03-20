---
status: complete
priority: p2
issue_id: "106"
tags: [code-review, frontend, ui, quality]
dependencies: []
---

# members-table width contract is attached to the wrong selector

## Problem Statement

[`frontend/src/pages/members/components/MemberListSection.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/MemberListSection.tsx) renders the list as `<div className="table-shell"><table className="members-table">...</table></div>`, but the width rule in [`frontend/src/index.css`](/Users/abc/projects/GymCRM_V2/frontend/src/index.css) is written against `.members-table table`.

That selector only matches a nested `<table>` inside an element with class `members-table`. In the actual markup, the class is applied directly to the `<table>` element, so `width: 100%` and the related table formatting rule never apply.

## Findings

- [`MemberListSection.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/MemberListSection.tsx) uses `<table className="members-table">`.
- [`index.css`](/Users/abc/projects/GymCRM_V2/frontend/src/index.css) defines table width on `.members-table table`, which does not match that DOM.
- As a result, the table falls back to intrinsic width behavior, which explains why a devtools `width: max-content` experiment can leave the section looking like it no longer stretches to the container width.

## Proposed Solutions

1. Move the width/collapse rule to `.members-table`.
   - Pros: matches the real DOM; smallest and correct fix.
   - Cons: requires quick regression check on other shared table consumers.
   - Effort: small.

2. Wrap every table in a parent element that owns the `members-table` class.
   - Pros: would make the current selector valid.
   - Cons: unnecessary markup churn across many screens.
   - Effort: medium.

3. Create a dedicated table module per page.
   - Pros: stronger local ownership.
   - Cons: over-scoped for a selector bug.
   - Effort: medium to large.

## Recommended Action


## Technical Details

- Affected component: [`frontend/src/pages/members/components/MemberListSection.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/MemberListSection.tsx)
- Affected shared style: [`frontend/src/index.css`](/Users/abc/projects/GymCRM_V2/frontend/src/index.css)
- Potentially affected consumers: every page using `<table className="members-table">`

## Acceptance Criteria

- [x] The width rule matches the actual `<table className="members-table">` markup.
- [x] The member list table stretches to the available container width again.
- [x] Other screens using `members-table` keep their current layout behavior.

## Work Log

### 2026-03-20 - Review finding captured

**By:** Codex

**Actions:**
- Reviewed the "회원 작업 화면" section in [`MemberListSection.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/MemberListSection.tsx).
- Traced the related shared table selectors in [`index.css`](/Users/abc/projects/GymCRM_V2/frontend/src/index.css).
- Confirmed the width rule is attached to `.members-table table` even though the class is on the table element itself.

**Learnings:**
- The issue is not in the section wrapper or the `table-shell` div.
- The primary fix point is the shared selector, not `MemberListSection` markup.

### 2026-03-20 - Selector fixed

**By:** Codex

**Actions:**
- Updated [`frontend/src/index.css`](/Users/abc/projects/GymCRM_V2/frontend/src/index.css) to move the width and table formatting rule from `.members-table table` to `.members-table`.
- Ran `npm test` and `npm run build` in [`frontend`](/Users/abc/projects/GymCRM_V2/frontend).

**Learnings:**
- The width regression was caused by a non-matching selector, not by a sticky browser devtools override.
- Because `members-table` is shared across several screens, the correct fix was to repair the shared selector rather than patch only the members page.

## Resources

- [`frontend/src/pages/members/components/MemberListSection.tsx`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/members/components/MemberListSection.tsx)
- [`frontend/src/index.css`](/Users/abc/projects/GymCRM_V2/frontend/src/index.css)
