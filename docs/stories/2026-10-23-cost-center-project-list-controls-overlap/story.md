# Cost center project list controls overlap — Story

**Date**: 2026-10-23
**Status**: Approved
**Ticket**: EPMCDME-16326

---

## Context

- The cost center details page (Settings → Cost Centers → a cost center) shows the linked projects in a table, followed by pagination ("Page" buttons) and a "Show: N items" selector.
- The ticket reports that these controls overlap the bottom rows of the projects list instead of sitting below it. The attached screenshot shows the controls directly under the table border with a very small gap, so the overlap should be confirmed in the browser with more than 10 projects.
- The pagination and table are shared components used across many settings pages; the problem may be specific to this page's wrapper spacing or may come from a shared layout.
- Separately, the "Show: N items" selector currently has no effect on this page. Fixing that is tracked by the sibling story `2026-10-23-cost-center-items-per-page` and is not part of this one.
- The page has no automated coverage of its project list, so verification is largely visual.

---

## Complexity

**Size**: S (10/36) · **Recommended flow**: sdlc-light

Presentation-only fix local to the cost center projects list; the exact cause of the overlap still needs browser reproduction, and shared table/pagination components should stay untouched.

---

## Story

**As a** platform administrator managing cost centers, **I want** the project list's pagination and "Show" controls to sit below the list with their own space **so that** I can read every project row and use the controls without them covering each other.

---

## Background

On a cost center with more than one page of projects, the pagination and items-per-page controls overlap the last rows of the list. Administrators cannot comfortably read the bottom rows or click the controls. The defect makes a routine management screen look broken.

---

## Acceptance Criteria

- [ ] Given a cost center with more than 10 linked projects, when I scroll to the bottom of the projects list, then the pagination and "Show" controls appear below the list and do not overlap any project row.
- [ ] Given a cost center with exactly one page of projects, when I view the list, then the controls (where shown) do not overlap any row.
- [ ] Given any list length, when I view the bottom of the list, then every project row is fully visible and can be selected.
- [ ] Given the controls are displayed below the list, when I click a page button, then the list moves to that page as it did before this change.
- [ ] Given the layout has been fixed, when I use the "Show" selector, then it behaves exactly as before this change (no regression; making it change the page size is a separate story).
- [ ] Given a narrow browser window, when I view the list and controls, then the controls still do not overlap the rows.
- [ ] Given pages that share the same pagination and table components, when I view them, then their layout is unchanged.

---

## Out of Scope

- Making the "Show: N items" selector change the number of projects shown (sibling story `2026-10-23-cost-center-items-per-page`).
- Redesigning the cost center details page or the pagination controls.
- Changes to other settings pages' layout.

---

## Decisions

- D1: Should this story also make the "Show" selector functional? → No, layout only; the selector is handled by the sibling items-per-page story — user

---

## Open Questions

- None
