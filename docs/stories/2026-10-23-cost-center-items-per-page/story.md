# Cost Center Projects List — Items Per Page Fix — Story

**Date**: 2026-10-23
**Status**: Approved
**Ticket**: EPMCDME-16325

---

## Context

- The cost center details page shows a projects list with a shared "Items per page" selector, backed by the common `Pagination` component.
- In `CostCenterProjectsManager.tsx`, the page size is a hardcoded constant (`PAGE_SIZE = 10`) rather than state, so changing the selector has no effect on the rendered list.
- The component's pagination change handler only accepts a page number and silently discards the second `perPage` argument the shared `Pagination` component passes when the dropdown changes.
- Pagination here is entirely client-side (slicing an already-fetched array) — no store or API change is implicated.
- Two sibling pages, `CostCentersManagementPage.tsx` and `SchedulersPage.tsx`, already implement the correct stateful, two-argument pattern against the same shared `Pagination` component, giving an in-repo template for the fix.

---

## Complexity

**Size**: XS (8/36) · **Recommended flow**: sdlc-light

Entirely self-contained in one component (`CostCenterProjectsManager.tsx`); no other component, store, or layer is touched.

---

## Story

**As an** admin managing cost centers, **I want** the "Items per page" selector on a cost center's projects list to actually change how many projects are shown **so that** I can scan larger linked-project lists at the page size I choose instead of being stuck at 10 per page.

---

## Background

Cost centers can have more than 10 linked projects, so the projects list on a cost center's details page paginates. The "Items per page" selector is visible and interactive, but changing it has no effect — the list always shows 10 items, undermining trust in the control and forcing admins to page through more screens than necessary to review all projects tied to a cost center.

---

## Acceptance Criteria

- [ ] Given a cost center details page with more than 10 linked projects, when the admin changes the "Items per page" value, then the projects list re-renders showing that number of projects.
- [ ] Given a page size other than the default has been selected, when the admin navigates to another page of the list, then the page count and navigation controls reflect the selected page size, not the default.
- [ ] Given a page size other than the default has been selected, when the admin moves between pages within the same visit to the details page, then the selected page size remains applied on each subsequent page.
- [ ] Given the admin reloads the page or revisits the cost center details page later, when the projects list renders, then the page size resets to the default (10) — the selection is not persisted across reloads or visits.

---

## Out of Scope

- Persisting the selected page size across page reloads or future visits (e.g. via localStorage or user preferences).
- Any change to how the projects list data is fetched (pagination stays client-side, slicing an already-fetched array).
- Auditing or fixing the same pattern on other pages — only the cost center projects list is in scope.

---

## Decisions

- D1: Who is the primary persona for this story? → Admin / platform ops — user
- D2: Should the selected page size persist across reloads/visits, or only within the current visit while paging? → Current visit only; resets to default on reload or a later visit — user

---

## Open Questions

- None
