# Technical Research

**Task**: cost center details projects list pagination layout
**Generated**: 2026-10-23
**Research path**: codegraph

---

## 1. Original Context

EPMCDME-16326 — Cost center page: project list control buttons overlap with the list of projects. On the cost center details page (Settings → Cost Centers → a cost center with >10 linked projects), the pagination "Page" buttons and the "Show: 10 items" selector overlap the bottom rows of the projects list instead of sitting below it. Expected: controls appear below the list with their own space, no overlap with any rows at any list length; rows remain fully visible/selectable; page navigation and items-per-page selection still work. Affected areas per ticket: CostCenterDetailsPage.tsx, CostCenterProjectsManager.tsx.

---

## 2. Codebase Findings

### Existing Implementations
- `src/pages/settings/administration/CostCenterDetailsPage.tsx` — loads cost center via `costCentersStore.getCostCenter`; renders `<SettingsLayout content={<div className="flex flex-col gap-6 pt-6 pb-8">…}>`. The "Linked projects" `<section>` (l.170-177) wraps `CostCenterProjectsManager` and passes all `costCenter.projects` (client-side paging).
- `src/pages/settings/administration/projectsManagement/CostCenterProjectsManager.tsx` — search + bulk actions toolbar, `<Table embedded className="!mb-0 !mt-0">` (l.244-260), then `{filteredProjects.length > PAGE_SIZE && <Pagination … perPage={PAGE_SIZE} perPageOptions={DECIMAL_PAGINATION_OPTIONS} className="w-full !bg-transparent !border-t-0 !p-0 !mb-4 !bg-none" />}` (l.262-271), sibling of Table in a plain `<section>`.
- `PAGE_SIZE = 10` is a module constant (l.44); `page` state only; `handlePaginationChange(nextPage)` (l.163) takes ONE arg and ignores the `newPerPage` that `Pagination.setPage(page, perPage)` supplies. So the "Show:" selector is displayed but changing it resets to page 0 with unchanged size (functional defect adjacent to the layout bug).
- `src/components/Table/Table.tsx` — root `div.w-full.relative.flex.flex-col`; inner `div.w-full.grow` gets `overflow-auto min-h-[300px] show-scroll` only when NOT `embedded`. Its own Pagination is rendered only when `pagination && !embedded` and is `fixed bottom-0 right-0 … z-40` plus `pb-20` wrapper; the manager does not use it (embedded, no `pagination` prop). Table `<thead>` is `sticky top-0 z-20`; `<table>` has `mt-4` (overridden by `!mt-0`).
- `src/components/Pagination/Pagination.tsx` — flex row (`border-t-1 bg-surface-base-primary bg-no-repeat bg-right-bottom`, `max-lg:flex-wrap`), returns null if `totalPages <= 1`; page nav `ul` is `h-[32px]`; "Show:" Select `!w-33` with `ml-auto`. Normal flow, not positioned; the className passed by the manager strips border/padding/background and adds `!mb-4`.
- Same Pagination pattern in other embedded contexts: `src/pages/settings/administration/usersManagement/components/UserProjectsTable.tsx` (own `perPageOptions`, `handlePaginationChange(newPage, newPerPage?)` handles per-page), `CostCentersManagementPage.tsx` (non-embedded Table with fixed pagination; handler takes both args).
- Static reading found no explicit overlap mechanism in the manager's own markup (Pagination is in normal flow after Table). Candidate causes to verify in browser: fixed-position/`z-40` Pagination from a non-embedded Table elsewhere, `PageLayout`/`Layout` content scroll container clipping (`main` is `h-full`, `Layout` is `min-h-full h-full`), or the Select dropdown panel. Not confirmed.

### Architecture and Layers Affected
Presentation only: settings page (`CostCenterDetailsPage`) → feature component (`CostCenterProjectsManager`) → shared components (`Table`, `Pagination`) within `SettingsLayout` → `Layout` → `PageLayout`. No store/API change implied by the ticket; `costCentersStore` data is fully client-paged.

### Integration Points
`SettingsLayout` (24 callers), `Table` and `Pagination` are shared; edits there affect many pages (`DECIMAL_PAGINATION_OPTIONS` has 17 callers). `useTableSelection` drives selection on `pagedProjects`; `CostCenterProjectsBulkActions`, `AssignProjectToCostCenterPopup` in the same directory.

### Patterns and Conventions
Tailwind utilities with `cn()`; `!`-important overrides on shared components; Valtio stores; embedded Table pattern.

---

## 3. Documentation Findings

### Guides and Architecture Docs
`.ai-run/guides/` exists (components/component-patterns.md, styling/styling-guide.md, testing/testing-patterns.md, testing/local-verification.md). Not read in depth; no cost-center specific guide.

### Architectural Decisions
None found for this area.

### Derived Conventions
Prefer Tailwind classes via `cn`; fix local layout at the consuming component before touching shared `Table`/`Pagination`. Per AGENTS.md, tests only on explicit request; verify locally via harness/browser.

---

## 4. Testing Landscape

### Existing Coverage
- `src/pages/settings/administration/__tests__/CostCenterDetailsPage.test.tsx` — mocks `CostCenterProjectsManager` and `CostCenterBudgetRollupCard`; covers budget rollup flag, reload wiring. Does not exercise pagination/layout.
- `CostCenterBudgetRollupCard.test.tsx` exists. None for `CostCenterProjectsManager`.

### Testing Framework and Patterns
Vitest + React Testing Library (`unit` and `integration` projects); `vi.mock` for stores/hooks/router.

### Coverage Gaps
`CostCenterProjectsManager` has no tests (paging, per-page change, search reset). Overlap is a CSS/layout matter jsdom cannot assert; needs browser verification.

---

## 5. Configuration and Environment

### Environment Variables
None relevant.

### Configuration Files
`vite.config.ts` (`test.projects`), Tailwind config (theme tokens such as `h-layout-header`, `w-33`).

### Feature Flags and Deployment Concerns
`useBudgetManagementEnabled` toggles the rollup card above the list (changes page height only).

---

## 6. Risk Indicators

- Root cause of the overlap not identified statically; manager markup looks correct, so cause may be in a shared parent (`Table`, `PageLayout`) — `Table.tsx`, `PageLayout.tsx`.
- Shared `Pagination`/`Table` have wide blast radius (17+ pagination-option callers, 24 `SettingsLayout` callers).
- `handlePaginationChange` ignores per-page argument in `CostCenterProjectsManager.tsx`; "Show:" selector currently has no effect on page size.
- No unit tests for `CostCenterProjectsManager`; layout can't be asserted in jsdom.
- Speculative: the fix may be confined to wrapper spacing classes in `CostCenterProjectsManager.tsx` / `CostCenterDetailsPage.tsx`, but this is unverified until reproduced in the browser.
- Speculative: making per-page functional would need `perPage` state in the manager, replacing `PAGE_SIZE`; this may be out of ticket scope.

---

## 7. Summary for Complexity Assessment

The change sits in the presentation layer: two named files (`CostCenterDetailsPage.tsx`, `CostCenterProjectsManager.tsx`), with the real defect possibly in shared `Table`/`Pagination`/`PageLayout`. The manager renders `Table embedded` followed by an in-flow `Pagination`, so the overlap's mechanism is not visible statically and needs browser reproduction with >10 projects.

Technical novelty is low (Tailwind spacing/layout on existing components, established pattern elsewhere). Test posture is weak: the page test mocks the manager, and the manager has none; visual verification is manual. Key risks are an unlocated root cause, shared-component blast radius, and the adjacent per-page handler defect that could widen scope.

---

## 8. External References

None named by the task.
