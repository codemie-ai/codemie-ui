# Technical Research

**Task**: cost center projects pagination items-per-page settings administration
**Generated**: 2026-10-23T00:00:00Z
**Research path**: codegraph

---

## 1. Original Context

EPMCDME-16325: Cost center page "Items per page" selector for projects does not change the number of items shown. Description: The "Items per page" selector for the projects list on the cost center page does not work. Changing the default value of 10 items has no effect on the list. Preconditions: user is logged in, can open a cost center's detail page, cost center has more than 10 linked projects so pagination is shown. Steps to Reproduce: 1) Open Settings -> Cost Centers and open a cost center's detail page. 2) Find the projects list and its "Items per page" selector, which shows the default value of 10. 3) Change the value to another option. Expected Result: The projects list shows the selected number of items per page. Actual Result: The selected value has no effect; the list still shows the default 10 items. Affected Areas: Cost center details page, project list pagination (CostCenterDetailsPage.tsx, CostCenterProjectsManager.tsx). Acceptance Criteria: 1) Changing the Items per page value updates the number of projects shown. 2) Page count and navigation match the selected page size. 3) The selected page size remains applied after moving between pages.

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/settings/administration/projectsManagement/CostCenterProjectsManager.tsx` — client-side list for projects assigned to a cost center. Filters, paginates, and renders the `Table` + `Pagination` for the cost center detail page. Root of the bug:
  - `PAGE_SIZE = 10` (line 44) is a **module-level constant**, not state.
  - `totalPages` (line 132) and `pagedProjects` (line 134-137) both slice using this fixed `PAGE_SIZE`.
  - `handlePaginationChange` (line 163-165) is `(nextPage: number) => setPage(nextPage)` — it takes only one argument and never updates any page-size state (there is none to update).
  - `Pagination` is rendered with `perPage={PAGE_SIZE}` and `perPageOptions={DECIMAL_PAGINATION_OPTIONS}` (lines 263-270), so the size dropdown renders and is interactive, but its selection has nowhere to land.
- `src/components/Pagination/Pagination.tsx` — shared pagination control. Its `setPage` prop type is `(page: number, perPage?: number) => void` (confirmed by call sites `setPage(0, newPerPage)` at line 86 and `setPage(page, currentPerPage)` throughout). On a page-size change it calls `setPage(0, newPerPage)`; on a page click it calls `setPage(page, currentPerPage)` to preserve the currently selected size across navigation.
- `src/pages/settings/administration/CostCenterDetailsPage.tsx` — hosts `CostCenterProjectsManager`, passing `projects` from `loadCostCenter()`. No pagination state lives here; pagination is entirely internal to `CostCenterProjectsManager` (client-side slicing of the already-fetched project list, not a server page request).
- `src/pages/settings/administration/CostCentersManagementPage.tsx` — **working reference implementation** of the same control for the cost-centers list itself: `handlePaginationChange` is `(nextPage: number, nextPerPage?: number) => { setPage(nextPage); if (nextPerPage) setPerPage(nextPerPage) }` (lines 104-109), paired with a `perPage` state variable fed into `costCentersStore.getCostCenters({ page, per_page })`.
- `src/pages/schedulers/SchedulersPage.tsx` — second working reference with the identical two-argument handler shape (lines 146-149).

### Architecture and Layers Affected

- **Presentation layer only.** `CostCenterProjectsManager` does client-side pagination over an already-fetched `projects: ProjectListItem[]` array (no store or API call is involved in paging). The fix is confined to this one component: add page-size state, accept the second `setPage` argument, and use that state instead of the `PAGE_SIZE` constant for slicing.
- No store (`src/store/costCenters.ts`) or API changes are implicated — `getCostCenter` returns the full project list already; the manager paginates it in-browser.

### Integration Points

- `CostCenterProjectsManager` ← `CostCenterDetailsPage` (sole caller, prop-driven, no shared pagination state to coordinate).
- `CostCenterProjectsManager` → `Pagination` (shared component, contract: `setPage(page, perPage?)`).
- `DECIMAL_PAGINATION_OPTIONS` (`src/constants/common.ts:21-26`) — already imported and passed as `perPageOptions`; values `10/20/50/100`. Used by 17 other call sites across the app, several of which (the two reference implementations above) demonstrate the correct wiring.

### Patterns and Conventions

- The established convention for this `Pagination` component is a page-size `useState` alongside the page `useState`, with a two-argument change handler that conditionally updates the size state — see `CostCentersManagementPage.tsx` and `SchedulersPage.tsx`. `CostCenterProjectsManager.tsx` is the outlier: it has the `Pagination` wiring for size but never implemented the state side.

---

## 3. Documentation Findings

### Guides and Architecture Docs

No guide names this bug or this component specifically. Relevant general guides: `.ai-run/guides/patterns/state-management.md` (Valtio/hooks conventions — not applicable here, this is local `useState`), `.ai-run/guides/testing/testing-patterns.md` (test file location/naming).

### Architectural Decisions

None recorded for this component.

### Derived Conventions

Confirmed from code (not documentation): page-size state is local `useState<number>`, initialized from the same default passed to `Pagination`, and the `setPage` callback signature is always `(page: number, perPage?: number) => void` wherever `Pagination` is used with a `perPageOptions` prop.

---

## 4. Testing Landscape

### Existing Coverage

- No test file exists for `CostCenterProjectsManager.tsx` (confirmed via directory listing of `projectsManagement/__tests__/`; only `CostCenterBudgetRollupCard.test.tsx` covers a sibling component in that folder).
- `src/pages/settings/administration/projectsManagement/__tests__/ProjectsManagementFull.pagination.integration.test.tsx` exercises pagination behavior for the sibling full projects list and is the closest existing precedent for how this app tests "items per page" interactions.

### Testing Framework and Patterns

Vitest + React Testing Library, two projects (`unit`, `integration`); AAA pattern; `cleanup` in `afterEach`. File would go in `src/pages/settings/administration/projectsManagement/__tests__/CostCenterProjectsManager.test.tsx` per the co-location convention.

### Coverage Gaps

`CostCenterProjectsManager` itself — the component this ticket's fix lands in — has zero existing tests at any level. Gap pre-dates this ticket; the fix needs to add coverage for the size-change interaction described in the acceptance criteria rather than rely on existing tests.

---

## 5. Configuration and Environment

### Environment Variables

None relevant — purely client-side rendering logic, no env-gated behavior found.

### Configuration Files

None — `DECIMAL_PAGINATION_OPTIONS` in `src/constants/common.ts` is a static array, not environment configuration.

### Feature Flags and Deployment Concerns

None found adjacent to this component.

---

## 6. Risk Indicators

- Component under change has no existing test coverage at all — any fix needs its own test(s) to meet the acceptance criteria evidence bar.
- Speculative: the fix is a small, local change to `CostCenterProjectsManager.tsx` (replace `PAGE_SIZE` constant with `useState`, widen `handlePaginationChange` to accept and apply the optional second argument) with two in-repo precedents (`CostCentersManagementPage.tsx`, `SchedulersPage.tsx`) to mirror; no server/store/API change appears necessary since pagination here is client-side slicing of an already-fetched array.
- `codegraph_explore` reported `CostCenterProjectsManager` and `loadCostCenter` as having "no tests found within 3 caller hops" — corroborates the coverage gap above.

---

## 7. Summary for Complexity Assessment

This is a presentation-layer-only bug confined to a single component, `CostCenterProjectsManager.tsx`. The root cause is that its page size is a hardcoded module constant (`PAGE_SIZE = 10`) rather than state, and its `handlePaginationChange` callback only accepts a page number, silently discarding the second `perPage` argument the shared `Pagination` component passes when the user changes the "items per page" dropdown. Pagination here is entirely client-side (slicing an array already fetched by the parent page), so no store or API changes are implicated. Two other pages in the same codebase (`CostCentersManagementPage.tsx`, `SchedulersPage.tsx`) already implement the correct two-argument, stateful pattern against the same shared `Pagination` component, giving a direct in-repo template for the fix.

Technical novelty is low — this is matching an existing, already-proven pattern, not introducing a new one. The main risk is test coverage: `CostCenterProjectsManager` has zero existing tests, so verifying the three acceptance criteria (size changes list length, page/nav count matches selected size, size persists across page navigation) will require writing new tests rather than extending existing ones, following the co-located `__tests__/` convention and the precedent set by `ProjectsManagementFull.pagination.integration.test.tsx`.

---

## 8. External References

None named by the task — the task context named only in-repo file paths (`CostCenterDetailsPage.tsx`, `CostCenterProjectsManager.tsx`) already covered in Section 2, not an external source of truth.
