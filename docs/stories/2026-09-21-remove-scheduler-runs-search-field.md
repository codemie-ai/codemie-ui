# Remove Search Field from Scheduler Runs View — Story

**Date**: 2026-09-21
**Status**: Draft
**Ticket**: EPMCDME-15135

---

## Context

- The Scheduler Runs History page (`SchedulerRunHistoryPage`) uses a shared `Filters` component that previously required a `searchKey` prop, rendering a search input unconditionally.
- The search field on the runs view had no meaningful backing — there is no server-side or client-side search implemented for scheduler runs, making the field non-functional and confusing.
- The `Filters` component and `FiltersProps` type both needed to be updated to make `searchKey` optional so callers can omit the search input without workarounds.
- The fix was already delivered on branch `EPMCDME-15135_remove-search-field-from-scheduler` by making `searchKey` and `searchPlaceholder` optional and removing their usage from `SchedulerRunHistoryPage`.

---

## Story

**As a** platform user viewing scheduler run history, **I want** the runs view to not show a non-functional search field **so that** I am not misled into expecting search capability that does not exist.

---

## Background

The scheduler runs history page displayed a search input inherited from a shared `Filters` component. Because no search functionality was implemented for runs, the field confused users and triggered bug reports. The correct fix is to remove the field rather than implement search, since the feature is not needed in this context.

---

## Acceptance Criteria

- [ ] Given I open the Scheduler Run History page, when the page loads, then no search input field is visible.
- [ ] Given the `Filters` component is used elsewhere with a search field, when it is rendered with a `searchKey` prop, then the search input still appears as expected (no regression).
- [ ] Given the `Filters` component is used without a `searchKey` prop, when it renders, then no search input is shown and no console errors occur.

---

## Out of Scope

- Implementing actual search/filter functionality for scheduler runs.
- Changes to any other page or component that uses the `Filters` component with a search field.

---

## Open Questions

- None — scope is clear and implementation is complete.
