---
title: "feat: Replace trainer schedule grid with monthly calendar UI"
type: feat
status: active
date: 2026-04-29
---

# feat: Replace trainer schedule grid with monthly calendar UI

## Overview

Replace the current custom CSS grid-based month view (`TrainerAvailabilityMonthView.tsx`) with `react-big-calendar` to provide a proper calendar experience. Users will see day-of-week labels, proper calendar layout, and improved visual clarity while maintaining all existing functionality (date selection, exception editing, weekly rule management).

**Performance Focus:** This plan prioritizes response time and runtime performance through lazy loading, memoization, and efficient event transformation.

---

## Problem Frame

The current `TrainerAvailabilityMonthView.tsx` displays dates in a simple grid without weekday labels. Users must refer to a separate calendar to identify which day of the week each date falls on. The grid-based layout lacks the visual language users expect from a calendar application.

**Key pain points:**
- No weekday information visible in the schedule view
- Users cannot quickly correlate date numbers with actual days
- Grid layout doesn't leverage calendar conventions users are familiar with

---

## Requirements Trace

- R1. Display trainer availability in a proper monthly calendar format with weekday headers (일-토)
- R2. Show availability status (가능/불가능/미설정) with color coding on each date cell
- R3. Display time range text on each date (e.g., "10:00 - 18:00")
- R4. Click on a date to open the existing exception modal (preserving current interaction)
- R5. Month navigation (previous/next month) works as before via `selectedMonth` state
- R6. Maintain existing API data flow via `useTrainerAvailabilityQuery`

---

## Scope Boundaries

- **In scope:** Replace month view component, preserve existing data hooks and API integration
- **Out of scope:** Week view or day view (not requested), adding new API endpoints, modifying backend
- **Deferred:** None identified for this iteration

---

## Context & Research

### Relevant Code and Patterns

- `frontend/src/pages/trainer-availability/TrainerAvailabilityMonthView.tsx` — current grid implementation to replace
- `frontend/src/pages/trainer-availability/TrainerAvailabilityPage.tsx` — parent component managing `selectedMonth`, date selection, and modals
- `frontend/src/pages/trainer-availability/modules/useTrainerAvailabilityQuery.ts` — React Query hook providing data
- `frontend/src/pages/trainer-availability/modules/types.ts` — `TrainerAvailabilitySnapshot` and related types

### External References

- `react-big-calendar` documentation — for calendar component configuration
- Vite dynamic import patterns — for lazy loading the calendar module

---

## Key Technical Decisions

- **Library choice:** `react-big-calendar` — lightweight compared to FullCalendar, easy customization, dayGridMonth view supported
- **Lazy loading:** Use dynamic import for `react-big-calendar` to minimize initial bundle size impact
- **Memoization:** Apply `useMemo` for event transformation from `effectiveDays` to calendar events
- **Date adapter:** Use native JavaScript Date (react-big-calendar supports without moment/dayjs for basic usage)
- **Custom cell rendering:** Leverage calendar's `components` prop to render availability status with color and text

---

## Open Questions

### Resolved During Planning

- **Date adapter:** Native Date object sufficient for month-only view — no external library needed
- **CSS approach:** Import calendar's default CSS via dynamic import for code splitting

### Deferred to Implementation

- Exact custom cell component structure and styling details
- Specific color palette finalization matching existing Ant Design theme

---

## Implementation Units

- [ ] U1. **Install react-big-calendar dependency**

**Goal:** Add calendar library to frontend project

**Requirements:** R1

**Dependencies:** None

**Files:**
- Modify: `frontend/package.json`
- Test: None (dependency installation)

**Approach:**
- Run `npm install react-big-calendar` in frontend directory
- Verify package appears in package.json with compatible version
- Confirm TypeScript types are included (react-big-calendar ships with types)

**Verification:**
- `npm list react-big-calendar` shows installed package

---

- [ ] U2. **Create calendar event transformer utility**

**Goal:** Convert `TrainerAvailabilityEffectiveDay[]` to react-big-calendar event format efficiently

**Requirements:** R2, R3

**Dependencies:** U1

**Files:**
- Create: `frontend/src/pages/trainer-availability/modules/calendarUtils.ts`
- Test: `frontend/src/pages/trainer-availability/modules/calendarUtils.test.ts`

**Approach:**
- Create pure function `transformEffectiveDaysToEvents(effectiveDays)` returning `Event[]`
- Each event: `{ title: string, start: Date, end: Date, resource: EffectiveDay }`
- Use `useMemo` in the view component to transform only when `effectiveDays` changes

**Patterns to follow:**
- Existing pattern in `types.ts` for pure transformation functions
- Test file using Vitest (same as existing tests)

**Test scenarios:**
- Happy path: Transform a list of effective days with various statuses to events
- Edge case: Empty effectiveDays array returns empty array
- Edge case: Date strings are properly parsed to Date objects

**Verification:**
- Unit tests pass for transformation logic

---

- [ ] U3. **Create custom calendar event component**

**Goal:** Render availability status color and time text within calendar cells

**Requirements:** R2, R3

**Dependencies:** U2

**Files:**
- Create: `frontend/src/pages/trainer-availability/modules/CalendarEventCell.tsx`

**Approach:**
- Create a custom event component using React.memo for performance
- Display: colored background based on status, time range text
- Handle "multiple events" case with "+N" badge
- Use Ant Design color tokens for consistency

**Patterns to follow:**
- Ant Design theming (use tokens from ConfigProvider)
- Existing Card component styling in current `TrainerAvailabilityMonthView`

**Test scenarios:**
- Happy path: Available status shows green color and time text
- Happy path: OFF status shows red color
- Edge case: Multiple events show "+N" indicator

**Verification:**
- Component renders correctly with different status types

---

- [ ] U4. **Implement TrainerAvailabilityCalendarView component**

**Goal:** Replace existing grid with react-big-calendar month view

**Requirements:** R1, R2, R3, R4, R5, R6

**Dependencies:** U2, U3

**Files:**
- Create: `frontend/src/pages/trainer-availability/TrainerAvailabilityCalendarView.tsx`
- Modify: `frontend/src/pages/trainer-availability/TrainerAvailabilityPage.tsx` (swap component)
- Test: `frontend/src/pages/trainer-availability/TrainerAvailabilityPage.test.tsx` (update if needed)

**Approach:**
- Implement `TrainerAvailabilityCalendarView` using `Calendar` from react-big-calendar
- Configure `dayLayoutAlgorithm` for optimal cell sizing
- Use `components={{ event: CalendarEventCell }}` for custom rendering
- Handle `onSelectEvent` to trigger the same callback as current date selection
- Use `useMemo` for event transformation — critical for performance
- Implement lazy calendar import pattern:

```typescript
const Calendar = useMemo(
  () => lazy(() => import("react-big-calendar/lib/css/react-big-calendar.css").then(() => import("react-big-calendar"))),
  []
);
```

- Keep `selectedMonth` navigation working by passing current month dates to calendar

**Technical design:**
- Use `localizer` with native `format` functions (no moment/dayjs required for basic month view)
- Pass `date` prop to calendar to control visible month
- Handle `onNavigate` callback to sync with parent's `selectedMonth` state

**Patterns to follow:**
- Current `TrainerAvailabilityMonthView` prop interface for backward compatibility
- React Query data flow from `useTrainerAvailabilityQuery`

**Test scenarios:**
- Happy path: Calendar renders with current month data
- Happy path: Clicking a date calls onSelectDate callback
- Happy path: Month navigation updates displayed dates
- Edge case: Dates with no availability still render correctly
- Integration: Calendar interacts correctly with parent page's month selector

**Verification:**
- Calendar displays with weekday headers (Sun-Sat)
- Available dates show green color and time
- OFF dates show red color
- Clicking date opens exception modal as before

---

- [ ] U5. **Performance verification and optimization**

**Goal:** Ensure calendar rendering doesn't degrade response time

**Requirements:** (implicit) performance requirement

**Dependencies:** U4

**Files:**
- Test: Performance benchmark if applicable

**Approach:**
- Verify `useMemo` prevents unnecessary event re-transformations
- Confirm lazy loading reduces initial bundle size (check Vite build output)
- Ensure calendar doesn't cause re-renders on unrelated state changes
- Test with data for a full month (30-31 days) to verify performance

**Patterns to follow:**
- Existing React performance patterns in the codebase

**Test scenarios:**
- Performance: Month switch doesn't cause perceptible lag
- Performance: Initial load time with calendar vs without (compare build sizes)

**Verification:**
- Build output shows calendar CSS/JS loaded asynchronously
- No jank when switching months with full month data

---

- [ ] U6. **Final integration and cleanup**

**Goal:** Ensure complete replacement with no regression

**Requirements:** R5, R6, R7

**Dependencies:** U5

**Files:**
- Modify: Remove or deprecate `TrainerAvailabilityMonthView.tsx`
- Test: Full page integration test

**Approach:**
- Swap component in `TrainerAvailabilityPage.tsx`
- Remove old grid component file or mark as deprecated
- Run existing tests to ensure no regression
- Verify all interactions (date selection, exception modal, weekly rules) work

**Test scenarios:**
- Integration: Full page renders without errors
- Integration: Month selector controls calendar view
- Integration: Exception modal opens from calendar click

**Verification:**
- All existing functionality preserved
- New calendar UI visible with weekday headers and proper layout

---

## System-Wide Impact

- **Interaction graph:** This change only affects the trainer availability page. No middleware, callbacks, or observers involved.
- **Error propagation:** Calendar errors won't crash the page — react-big-calendar handles graceful degradation
- **API surface parity:** None — data layer unchanged
- **Integration coverage:** Calendar integration with parent page's modal system tested via U4/U6
- **Unchanged invariants:** API contract, exception modal behavior, weekly rule editor all remain the same

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Calendar bundle size impact | Lazy loading via dynamic import mitigates initial load |
| Event transformation performance | Use `useMemo` to avoid re-computation on unrelated renders |
| Calendar styling conflicts with Ant Design | Use CSS modules or scoped styles; verify no class name collisions |
| Browser compatibility | Test on target browsers (react-big-calendar supports modern browsers) |

---

## Documentation / Operational Notes

- No documentation update required for user-facing changes (UI improvement only)
- If calendar customization proves complex, consider reducing scope to basic rendering first, then enhance

---

## Sources & References

- Related code: `frontend/src/pages/trainer-availability/`
- External docs: https://react-big-calendar.readthedocs.io/