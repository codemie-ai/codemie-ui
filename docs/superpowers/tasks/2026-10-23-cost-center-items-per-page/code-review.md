---
schema: sdlc-factory/code-review@1
decision: approve
reviewed_head: 54ae229ba3c5d7a8816ad94ecc1451a915c22e9b
---

# Code review — 2026-10-23-cost-center-items-per-page

**Decision:** request-changes (final round, confidence high)  
**Reviewed head:** `54ae229` · **Rounds:** final

Compact profile (edge+acceptance) ran; all 4 acceptance criteria pass. One surviving defect: Pagination (and its per-page selector) unmounts when the chosen page size >= project count, stranding the user. 1 deferred (page index not clamped after unassign/shrink, pre-existing); 0 dismissed; verification-gap and blind lenses n/a under compact.

## Open — 1

### CR-001 · code · major — Pagination hides itself after choosing large page size

`src/pages/settings/administration/projectsManagement/CostCenterProjectsManager.tsx:266` · not re-checked

**Problem:** Pagination is rendered only when filteredProjects.length > perPage. Selecting a page size >= the project count (e.g. 50 with 25 projects) makes the condition false, so the whole Pagination component including the Items per page selector unmounts.

**Impact:** User cannot return to a smaller page size without remounting the page; the selector the ticket fixes becomes a one-way trap.

**Recommendation:** Gate on the smallest option, not the current size: render when filteredProjects.length > PAGE_SIZE (default 10), so the selector stays visible once the list exceeds the minimum page size.

## Pre-existing (not blocking) — 1

- **Page index not clamped when list shrinks** — `src/pages/settings/administration/projectsManagement/CostCenterProjectsManager.tsx:109` — after unassigning the last item on the final page, `page` can exceed `totalPages`, yielding an empty list. Pre-existing: page state and unassign/refresh flow predate this change; the ticket concerns the per-page selector only.

## Coverage

| Acceptance criterion | Status | Notes |
|---|---|---|
| Changing Items per page re-renders list with that many projects | pass | perPage state drives slice |
| Page count and controls reflect selected page size | pass | totalPages uses perPage |
| Selected page size persists while paging in same visit | pass | state retained across page nav |
| Page size resets to default on reload/revisit | pass | plain useState(PAGE_SIZE) |

Standards: commit-format na · code-quality na · security na

## Gate decision

`code-review.final`: **approve** (human), recorded in `decisions.jsonl`. The reviewer's `request-changes` verdict above is retained as raw output. CR-001 was accepted as-is by the user because the same behaviour exists on other pages (the pagination bar hides when the list fits one page).
