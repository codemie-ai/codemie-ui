# Technical Research

**Task**: Projects management table Cost center/Budgets header overlap (EPMCDME-15751)
**Generated**: 2026-10-12
**Research path**: filesystem

---

## 1. Original Context

Goal: sdlc-light research for EPMCDME-15751 in repo /Users/gokhan_ozdemir/codemie-dev/codemie-ui.

Contract:
- run_dir: /Users/gokhan_ozdemir/codemie-dev/codemie-ui/docs/superpowers/tasks/2026-10-12-epmcdme-15751-projects-header-overlap
- Write technical-analysis.md into run_dir (must contain sections "Codebase Findings" and "Risk Indicators").
- Return a <=400-word digest.
- Working tree has unrelated uncommitted changes (package-lock.json, pnpm-lock.yaml, pnpm-workspace.yaml); do not touch them.

Scope decision: The ticket body was unreadable (Jira sign-in). User confirmed scope: the Projects management page table header row, where the 'Cost center' and 'Budgets' header labels overlap each other (the screenshot shows Name, Cost center, Budgets, Created, Assignments, Users, Actions columns with 'Cost center' colliding with 'Budgets'; the Budgets filter dropdown is labelled 'All projects'). Also user reported 'Projects management' with a Create button. Fix scope = that page's table header overlap only.

The requested work is research only; no source edits.

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/settings/administration/projectsManagement/ProjectsManagementFull.tsx:180-683` — actual Projects management page component (`ProjectsManagementFull`); renders `contentTitle="Projects management"` at line 678 and conditionally renders a Create button. Its page table uses `tableClassName="table-fixed"` at line 638.
- `src/pages/settings/administration/projectsManagement/ProjectsManagementFull.tsx:122-158` — `columnDefinitions` for the screenshot's seven columns: Name (15%), Cost center (8%), Budgets (26%), Created (9%), Assignments (21%), Users (5%), Actions (6%). Cost center is `cost_center_name` and Budgets is `budgets`.
- `src/pages/settings/administration/projectsManagement/ProjectsManagementFull.tsx:69-70,233-241` — column keys and conditional filtering: Cost center and Budgets columns are removed when their respective feature flags are off.
- `src/pages/settings/administration/projectsManagement/ProjectsManagementFull.tsx:72-82` — budget assignment filter options; the “all” option label is “All projects”. The nearby “Budget category” selector is a separate filter, not a table header.
- `src/components/Table/Table.tsx:223-249` — shared Table renders the table with caller's `tableClassName` and maps column definitions to `TableColHeader`.
- `src/components/Table/TableColHeader.tsx:37-43,72-142` — shared header component. At lines 91-100 it combines `column.headClassNames` with padding and defaults to `text-nowrap` unless `column.headerNoWrap === false`; only then does it use `whitespace-normal break-words`. Header label itself is placed in a span (line 128 or 135).

### Architecture and Layers Affected

- Page/presentation: administration Projects management component and its column definitions.
- Shared UI component: Table's header-cell rendering and shared `ColumnDefinition` styling contract.
- Utility styling: Tailwind width and whitespace classes applied to table header cells.

### Integration Points

- The Projects page passes its conditional `effectiveColumnDefinitions` into shared `Table`.
- Shared `Table` passes each definition to `TableColHeader`; header style behavior therefore applies consistently across pages using the same component.
- `ProjectsManagementFull` uses `features:costCenters` and budget-management feature state to decide which columns are shown. The table is fixed-layout via `table-fixed` (line 638).

### Patterns and Conventions

- Columns are declared as `ColumnDefinition[]` with per-header `headClassNames` utility classes; optional header wrapping is controlled by `headerNoWrap` in shared `TableColHeader`.
- Shared Table component centralizes header rendering, sort behavior, and table layout; callers supply columns, renderers, and optional class names.
- The Users page (`src/pages/settings/administration/UsersManagementPage.tsx`) is not the target component; the target is `ProjectsManagementFull.tsx`.

---

## 3. Documentation Findings

### Guides and Architecture Docs

No task-specific guides or architecture docs were established in the indexed repository research for this table/header issue. The source implementation is the primary evidence.

### Architectural Decisions

No relevant ADR or explicit recorded architectural decision was identified in the inspected source excerpts.

### Derived Conventions

Table header widths and wrapping are expressed through `ColumnDefinition` properties and Tailwind classes. The shared header uses nowrap as its default; callers must explicitly set `headerNoWrap: false` to allow whitespace wrapping.

---

## 4. Testing Landscape

### Existing Coverage

- The indexed search for “Projects management” in test files returned `src/pages/settings/administration/usersManagement/components/popups/__tests__/UserDetailsPopup.projectsGate.test.tsx`, which tests a projects-management gate in the user details popup, not this table's headers or widths.
- No direct Projects management table-header overlap test was located in that targeted search. This is a limited search result, not proof that no related tests exist anywhere.

### Testing Framework and Patterns

The matched test uses Vitest/Jest-style `describe` and `beforeEach` APIs, but no page/table-specific testing pattern was inspected.

### Coverage Gaps

No directly relevant test covering the Cost center/Budgets header widths, wrapping, or responsive overlap was identified in the targeted lookup.

---

## 5. Configuration and Environment

### Environment Variables

No relevant environment variable was identified in the inspected page/table sources.

### Configuration Files

- `src/pages/settings/administration/projectsManagement/ProjectsManagementFull.tsx:69-70,233-241` — feature flags control visibility of Cost center and Budgets columns.
- `src/pages/settings/administration/projectsManagement/ProjectsManagementFull.tsx:72-82` — budget assignment/category filter option labels.

### Feature Flags and Deployment Concerns

Cost center visibility is controlled by `features:costCenters`; budget column and budget filters depend on budget-management state. No deployment concern was identified from the inspected sources.

---

## 6. Risk Indicators

- [INFERENCE] Most probable overlap mechanism: the Cost center header column is only 8% wide (`ProjectsManagementFull.tsx:131-136`), while `TableColHeader.tsx:91-100` applies `text-nowrap` by default. Under the fixed table layout (`ProjectsManagementFull.tsx:638`, `Table.tsx:223-249`), the non-wrapping “Cost center” label may overflow its narrow cell and visually intrude into the adjacent Budgets header. Source confirms the narrow width and nowrap behavior; no screenshot reproduction or browser measurement was performed, so this remains a probable cause rather than confirmed runtime behavior.
- All configured column percentages total 90% (`ProjectsManagementFull.tsx:122-158`); how the remaining width is distributed by browser table layout may affect actual cell widths.
- Header wrapping is a shared component behavior (`TableColHeader.tsx:91-100`); any adjustment there can affect other tables, not only Projects.
- No direct regression test for this pair of headers was identified in the targeted test lookup.

---

## 7. Summary for Complexity Assessment

The relevant implementation is the Projects page component `src/pages/settings/administration/projectsManagement/ProjectsManagementFull.tsx`, not the Users management page previously cited. Its fixed-layout table gives Cost center an 8% header width (`:131-136`, table layout at `:638`) and Budgets 26%; the common table header in `src/components/Table/TableColHeader.tsx:91-100` defaults to `text-nowrap` unless a column opts out. This makes a narrow, non-wrapping Cost center heading overflowing into Budgets the most likely overlap mechanism [INFERENCE]. The cell definitions, shared Table wiring, and shared header presentation are the primary code surface.

The targeted lookup found no directly applicable regression test for header sizing/wrapping; a related user-details Projects gate test does not cover this case. The component is feature-flagged, and shared header changes would have cross-page effects. Source analysis establishes the configuration and likely CSS cause but not an actual browser reproduction; verify exact behavior at the affected viewport if implementation proceeds.

---

## 8. External References

None named by the task.
