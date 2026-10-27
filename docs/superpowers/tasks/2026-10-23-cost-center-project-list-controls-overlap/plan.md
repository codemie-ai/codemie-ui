# Cost center project list controls overlap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** Pagination and "Show" controls sit below the cost center projects table with their own space, never overlapping rows.

**Architecture:** Expected fix: add a top-margin Tailwind class (e.g. `mt-4`) to the `className` of the `<Pagination>` in `CostCenterProjectsManager.tsx`. Task 1 briefly confirms that is the cause; only if it is not does the work widen (first to `CostCenterDetailsPage.tsx`, then to shared components only if proven safe).

**Tech Stack:** React 18, Tailwind 3, PrimeReact.

**Spec:** `docs/stories/2026-10-23-cost-center-project-list-controls-overlap/story.md` (analysis: `technical-analysis.md` in this directory)

Commit per task using the repository's existing convention (ticket EPMCDME-16326).

## Global Constraints

- Layout only: the "Show" selector must behave exactly as before (it ignores per-page; fixing that is story `2026-10-23-cost-center-items-per-page`). Do not touch `PAGE_SIZE` or `handlePaginationChange`.
- Tailwind utilities; follow `.ai-run/guides/styling/styling-guide.md`.
- Other pages using `Table`/`Pagination` must render unchanged.

## Review Focus

- Exactly 10 vs 11 projects (Pagination returns null at one page): no overlap and no stray gap.
- Last page with fewer than 10 rows: controls still below rows.
- Narrow viewport (`max-lg:flex-wrap` on Pagination): wrapped controls do not cover rows.
- Open "Show" dropdown panel: selector still works as before.
- Budget rollup card flag on/off: controls remain below the list.

---

### Task 1: Confirm the missing top margin is the cause

**Files:**
- Inspect only: `src/pages/settings/administration/projectsManagement/CostCenterProjectsManager.tsx:244-271`

**Test-first: no — layout inspection; jsdom cannot compute layout, so no failing test can be written.**

- [ ] **Step 1:** Run the app (see `.ai-run/guides/testing/local-verification.md`), open Settings -> Cost Centers -> a cost center with more than 10 projects. Capture a "before" screenshot.
- [ ] **Step 2:** In devtools, check the Pagination root against the Table's last row: confirm it sits in normal flow directly after the table with zero top margin (the Table has `!mt-0 !mb-0`, the Pagination has `!p-0 !mb-4`, and no existing class on it sets a top margin or negative margin, so nothing conflicts with adding `mt-*`). Temporarily add `mt-4` in devtools and confirm the overlap disappears.
- [ ] **Step 3:** If the overlap persists, record the real cause (fixed/absolute position, clipping `overflow`/height in `Table`, `PageLayout`/`Layout`, sticky `thead`) as a one-line note under Task 2 and widen only as the architecture note says. Shared-component changes require listing other callers and why the change is safe; otherwise override locally.

### Task 2: Add top margin to the Pagination

**Files:**
- Modify: `src/pages/settings/administration/projectsManagement/CostCenterProjectsManager.tsx:269` (the `className` on `<Pagination>`)

**Test-first: no — CSS spacing change with no jsdom-observable behavior; verified in the browser against the story's acceptance criteria. Existing `CostCenterDetailsPage.test.tsx` must still pass.**

- [ ] **Step 1:** Append `mt-4` to the Pagination `className` (`"w-full !bg-transparent !border-t-0 !p-0 !mb-4 !bg-none"`). Use a plain class; use `!mt-4` only if Task 1 shows an important rule overriding it. Leave all props and handlers unchanged.
- [ ] **Step 2:** Verify in the browser with an "after" screenshot: more than 10 projects (every row visible and selectable, controls below), exactly 10 and 11 projects, last page, narrow window, rollup card on/off, page buttons navigate as before, "Show" selector behaves as before (resets to page 0, size unchanged).
- [ ] **Step 3:** Spot-check `CostCentersManagementPage.tsx` and `UserProjectsTable.tsx` render unchanged, then run `npx vitest run --project unit src/pages/settings/administration/__tests__/CostCenterDetailsPage.test.tsx` and expect pass (quote the `Test Files` line).

## Negative-constraint pass

- "do NOT make Show change page size" / "Out of scope: items-per-page": honored by Task 2 Step 1 (handler, `PAGE_SIZE` and props untouched) and Step 2 (selector behavior checked unchanged).
- "do not alter shared Table/Pagination/PageLayout unless proven safe": honored by Task 2 (one class in the manager) and the Task 1 Step 3 gate.
- "Redesigning page/pagination" and "other pages' layout unchanged": honored by Task 2 Step 3 spot-check.
- negative-constraints: covered above, none violated.
