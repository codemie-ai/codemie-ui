# Members Table Internal Scroll Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On the project Members tab only the Users table scrolls; header, project title, tabs, filters and pagination stay put (EPMCDME-15890).

**Architecture:** Give the Members tab a viewport-bounded flex column (PageLayout's `div.h-full` → `flex h-full flex-col` → `min-h-0 flex-1` chain) so the existing `overflow-y-auto` table container finally has a bounded height; switch the table wrapper to `overflow-clip` so the Table's sticky thead sticks to that container. Edits stay in three page/feature files.

**Tech Stack:** React 19, TypeScript, Tailwind 3.4, Vitest + RTL.

**Spec:** inline requirements (ticket EPMCDME-15890); research in `technical-analysis.md` in this directory.

Commit per task using the repository's existing convention (`EPMCDME-15890: <summary>`, see `.ai-run/guides/standards/git-workflow.md`).

## Acceptance criteria

- [ ] AC1 — On the Members tab the Users table sits in its own independently scrollable container.
- [ ] AC2 — Scrolling inside the Users table does not move the page header, project title or tab bar.
- [ ] AC3 — Pagination stays below the table, visible, and works independently of the table scroll area.
- [ ] AC4 — Verified in a browser on "2024-06-ai-challenge-hackaton" and one other multi-member project (plus a short viewport and mobile width).
- [ ] Other tabs (Overview, Models, Integrations, Budgets) lay out exactly as before.
- [ ] The table's sticky header stays pinned at the top of the table container while it scrolls and never paints over the tab bar.

## Global Constraints

- Do NOT modify `PageLayout`, `Layout`, `SettingsLayout`, `Table`, `Pagination` (style Pagination only through its existing `className` prop).
- Do not redesign the user-selected approach; keep `isolate` on the table wrapper.
- No new arbitrary Tailwind values: the safety-net min-height is `min-h-60` (Tailwind 3.4 spacing scale, 240px), not `min-h-[240px]`.
- `overflow: clip` on Safari ≥16 is accepted.

## Negative constraints

| Constraint | Honored by |
|---|---|
| Shared layout/Table/Pagination unchanged | Task 1 edits only the 3 listed files |
| Other tabs unchanged | Task 1 wraps the column only when `activeTab === 'members' && canOpenActiveTab` |
| Approach not redesigned; `isolate` kept | Task 1 |
| Gutter fix kept small | Task 2 (one callback ref, ~6 lines) |
| No class-name-only jsdom tests | Task 1 is `Test-first: no` |

## Review Focus

1. Short viewport: when heading + filters + `min-h-60` + pagination exceed the column, content must fall back to the outer page scroller with nothing clipped or hidden (Task 1; browser-verified).
2. Mobile (`< lg`): `TableCardList` renders inside the same container; cards must remain reachable by scroll (Task 1; browser-verified).
3. `pr-4` scrollbar gutter must be right after loading finishes and after a window resize (Task 2 test).
4. Row `NavigationMore` menu now dismisses on table scroll (`ancestorScroll`); role `Select` and Pagination per-page dropdowns must not be clipped by `overflow-clip` (browser-verified).
5. Select-all overlay (`absolute inset-0`, ProjectMembersManager.tsx:933) covers the wrapper, not just the visible area — confirm it still reads correctly (browser-verified).

---

### Task 1: Bound the Members tab so only the table container scrolls

**Test-first: no — every change is a Tailwind class on a layout box; jsdom computes no layout, so a test could only assert class names. AC1–AC3 are covered by browser verification.**

**Files:**
- Modify: `src/pages/settings/administration/ProjectDetailsPage.tsx:258-320`
- Modify: `src/pages/settings/administration/projectsManagement/ProjectDetailsNavigation.tsx:58-61`
- Modify: `src/pages/settings/administration/projectsManagement/ProjectMembersManager.tsx:869-955`

**Interfaces:**
- Produces: table container at ProjectMembersManager.tsx:908 is the scroll box Task 2 measures.

- [ ] **Step 1: Apply the layout classes, then run the existing suites**
  - `ProjectDetailsPage.tsx`: when `activeTab === 'members' && canOpenActiveTab`, the `content` root becomes `<div className="flex h-full flex-col">` (it must be the direct child of PageLayout's `div.h-full`) holding the navigation and the members branch; every other tab keeps the current fragment. Members wrapper L286 `pt-5 pb-8` → `flex min-h-0 flex-1 flex-col pt-5 pb-8`. Budgets wrapper L300 unchanged.
  - `ProjectDetailsNavigation.tsx` `<nav>`: add `shrink-0`.
  - `ProjectMembersManager.tsx`: `<section>` L869 → `flex min-h-0 flex-1 flex-col`; heading row L870, filters L880, bulk actions L889 get `shrink-0`; Pagination `className` L953 gets `shrink-0`; table container L908 gets `flex-1 min-h-60` (replacing `min-h-0`); wrapper L915 `overflow-hidden` → `overflow-clip` (keep `rounded-lg relative isolate`).
  - Run each separately; all must PASS with an unchanged test count:
    `npx vitest run --project unit src/pages/settings/administration/__tests__/ProjectDetailsPage.test.tsx`
    `npx vitest run --project unit src/pages/settings/administration/projectsManagement/__tests__/ProjectMembersSpending.test.tsx`
    `npx vitest run --project integration src/pages/settings/administration/projectsManagement/__tests__/ProjectMembersViewAnalytics.integration.test.tsx`

### Task 2: Re-measure the scrollbar gutter after loading and on resize

**Test-first: yes — a new test resizes the table container (via a captured `ResizeObserver` callback) and fails because `hasScroll` is never recomputed today.**

**Files:**
- Modify: `src/pages/settings/administration/projectsManagement/ProjectMembersManager.tsx:292-299, 908`
- Create: `src/pages/settings/administration/projectsManagement/__tests__/ProjectMembersTableScroll.test.tsx`

**Interfaces:**
- Consumes: table container from Task 1.
- Produces: `data-testid="project-members-table-scroll"` on the container at L908.

- [ ] **Step 1: Write the failing tests.** Reuse the setup of `ProjectMembersSpending.test.tsx:1-105` (toaster mock, `userStore.getUsers` resolving one user). In `beforeEach`, `vi.stubGlobal('ResizeObserver', …)` with a class that pushes its callback to a `resizeCallbacks` array; `vi.unstubAllGlobals()` in `afterEach`. Stub `HTMLElement.prototype` `scrollHeight`/`clientHeight` getters with `vi.spyOn(..., 'get')`.
  - `adds the scrollbar gutter once loaded rows overflow the container` — scrollHeight 1000, clientHeight 200; after `findByText('Jane Doe')`, `getByTestId('project-members-table-scroll').firstElementChild` has class `pr-4`.
  - `re-measures the gutter when the container is resized` — start 200/200 → no `pr-4`; set clientHeight 100, call every captured callback inside `act`, expect `pr-4`.
- [ ] **Step 2: Run** `npx vitest run --project unit src/pages/settings/administration/projectsManagement/__tests__/ProjectMembersTableScroll.test.tsx` — expect the resize test to FAIL (no test id / no observer).
- [ ] **Step 3: Implement.** Add the test id at L908. Rewrite `tableContainerRef` (L292-299) as a React 19 callback ref with deps `[users, loading]`: measure `node.scrollHeight > node.clientHeight` immediately, create a `ResizeObserver(measure)` observing `node`, and return `() => observer.disconnect()`.
- [ ] **Step 4: Run** the new file plus `ProjectMembersSpending.test.tsx` — expect PASS.

### Task 3: Delete the superseded 2026-10-13 run directory

**Test-first: no — repository housekeeping, no code.**

**Files:**
- Delete: `docs/superpowers/tasks/2026-10-13-epmcdme-15890-fix-members-table-sticky-overlap/` (tracked `plan.md`, `actual-complexity.json`, `code-review-final.json`, `code-review-brief.md`, plus all untracked `*.local*` files, `dynamic-tests.local/`, `evidence.local/`)

- [ ] **Step 1:** `git rm -r --ignore-unmatch docs/superpowers/tasks/2026-10-13-epmcdme-15890-fix-members-table-sticky-overlap`, then `rm -rf` the same path for untracked files. Verify `git ls-files docs/superpowers/tasks/2026-10-13-epmcdme-15890-fix-members-table-sticky-overlap` prints nothing and the directory no longer exists. Leave this run's directory (`2026-10-19-…`) untouched.
