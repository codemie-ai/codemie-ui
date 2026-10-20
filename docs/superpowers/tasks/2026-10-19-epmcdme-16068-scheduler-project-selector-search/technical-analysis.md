# Technical Research

**Task**: scheduler project selector filters multiselect
**Generated**: 2026-10-19
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-16068 (Bug, Major) — Scheduler page: project selector has no search bar and is not aligned with the common project selector component

Description: The project selector on the Scheduler page shows only a checkbox list for choosing a project. It has no search bar, so users cannot filter projects by name. Other pages in the application already use the correct project selector component with search. The Scheduler page should use the same component so the experience is consistent.

Preconditions: User is authenticated in AI/Run CodeMie. User has access to the Scheduler page. The user has access to more than one project.

Steps to Reproduce: 1. Open the Scheduler page. 2. Open the project selector. 3. Observe the list of projects.

Expected Result: The project selector includes a search bar and uses the same component and behavior as the project selectors on other pages.

Actual Result: The project selector shows only a checkbox list of projects. There is no search bar.

Affected Areas: Scheduler page: project selector. Shared project selector component (reuse only, no changes expected).

Acceptance Criteria:
1. The Scheduler page project selector includes a search bar.
2. Entering a query filters the project list, and clearing it restores the full list.
3. The project selector uses the same shared component as other pages and matches their look and behavior.
4. Selecting and deselecting projects on the Scheduler page works as before.

(feature_area: scheduler project selector filters multiselect. Lead document: `/mnt/c/Users/AleksandrBudanov/Projects/EPMCDME-16068/EPMCDME-16068-repro-wsl-linux.md`, verified against code below.)

---

## 2. Codebase Findings

### Existing Implementations
- `src/pages/schedulers/SchedulerFilters.tsx` (157 lines) — the only file defining the Scheduler Project filter. Lines 85-91: `{ name: 'projectId', label: 'Project', type: FilterDefinitionType.Multiselect, options: projectOptions, value: values.projectId ? [values.projectId] : [] }`, with no `config`. `projectOptions` (66-69) maps `filterOptions.projects` to `{label: p.name || p.id, value: p.id}`. `handleApply` (128-142) casts `raw.projectId as string[]` and sends `projectIdArr?.[0]`. Same shape for `resourceId` (92-98, 130-136). Renders `<Filters ... refreshOnValuesUpdate />`.
- `src/components/Filters/Filters.tsx` — generic panel. `Multiselect` branch (280-314) renders `components/form/MultiSelect` with `showCheckbox`, `className="w-full h-[35px]"`, `scrollHeight="200px"`, and `onFilter={definition.config?.onFilter}`. No `config.onFilter` means no search box (`MultiSelect.tsx:467` `filter={typeof onFilter === 'function'}`). The root cause is confirmed in code. The Filters wrapper also draws its own clear "X" for Multiselect (305-312).
- `Custom` branch (326-330) calls `renderCustomFilter(definition, filters[definition.name], (v) => handleInputChange(definition.name, v))`. State for Custom entries is the raw `definition.value` (JSON-cloned, 55-65), and only `Multiselect` entries are wrapped into an array. `createEmptyFilters` (`src/utils/filters.ts:328`) resets arrays to `[]`, strings to `''`, other values to `null`. Any change in `filters` (except the search key) triggers `onApply` immediately (130-136).
- `src/components/ProjectSelector/ProjectSelector.tsx` (shared component, `index.ts` re-export). Props: `value (string|string[]|null)`, `onChange`, `disabled`, `label`, `hideLabel`, `className`, `multiple`, `fullWidth`, `adminOnly`, `selectDefault (default true)`, `error`, `size (default 'medium')`, `panelSize`.
  - Loads options with `userStore.getProjects(search, adminOnly)` on mount and on `user` change. Search is debounced 300 ms through `onFilter`.
  - Option `value = project.name`, label from `formatProjectLabel` (shows "name (display_name)"). `useResolvedProjectOptions` adds selected values missing from the list.
  - `placeholder='Project'`, `filterPlaceholder='Search for project'`, hard-coded `id/name="project-selector"` (one instance per page).
  - `multiple` gives `showCheckbox` and an array value. Single mode gives `singleValue`.
- `userStore.getProjects` (`src/store/user.ts:343`): admins and auditors go to `getAdminProjects` (`v1/admin/applications`, server-side search only from 3 characters unless `SHOW_ALL_PROJECTS` is on, otherwise limited to the user's own projects). Everyone else uses `getUserProjects` (the in-memory `user.projects` list filtered client-side by `matchesProjectSearch`, sorted by name).
- Scheduler data source: `schedulersStore.fetchFilterOptions` (`src/store/schedulers.ts:147`) calls `GET /v1/schedulers/filter-options`. The result goes to `filterOptions.{resources,projects}` (type `SchedulerFilterOptions`, line 78). `SchedulersPage.tsx` fetches it on mount and passes `filterOptions` into `SchedulerFilters`. Per the lead doc (backend read, not re-verified here), the backend returns only projects that have at least one scheduler, with `id == name`, cached 60 s per user.
- `SchedulersPage.tsx`: `projectId` is a single URL param (`searchParams.get('projectId')`, line ~83). `handleApplyFilters` writes one `projectId`, and `schedulersStore.fetchSchedulers` sends `projectId` as a query param (`store/schedulers.ts:124`). The table's Project column shows `item.project.name`.

### Architecture and Layers Affected
- Page/UI layer: `src/pages/schedulers/SchedulerFilters.tsx` (the only code that must change). `SchedulersPage.tsx` and the store need no change if value semantics stay "one project name string".
- Shared component layer: `ProjectSelector` and `Filters` (reuse only per the ticket). `Filters` already has the Custom extension point, so no change to it is needed.
- Store/API layer: `schedulersStore.filterOptions.projects` would stop feeding the Project filter. `filterOptions.resources` still needs it. The backend payload is unchanged.

### Integration Points
- How other `Filters` consumers use Custom: Assistants, Workflows, Skills and DataSources use it for "Created by" (`UserFilter`) and `SchedulerRunHistoryPage` for DatePickers. All of them dispatch by `definition.name` inside `renderCustomFilter` and return `null` otherwise. `renderCustomFilter` is a single prop, so `SchedulerFilters` needs one dispatcher on `definition.name === 'projectId'`.
- No existing consumer embeds `ProjectSelector` inside generic `Filters`. Existing `ProjectSelector` usages in filter UIs are outside `Filters`: `AnalyticsFilters.tsx:268-276` (inside `FilterAccordionItem`, `fullWidth label="" multiple`) and `UsersManagementFilters.tsx:112-120` (`label="Project" fullWidth multiple size="small" panelSize="md"`). `ProjectSelector` is used by about 14 production files (grep list, excluding tests).
- Alternative pattern in the repo (not the shared component): `SkillsFilters.tsx:55-130` keeps a generic Multiselect and supplies `config: { filter: true, filterPlaceholder, onFilter, loading, emptyFilterMessage }` plus `useProjectOptions` and `useResolvedProjectOptions`. It gives search but does not use `ProjectSelector`, so it does not satisfy AC3 literally.
- `Filters` spreads `definition.config` last onto `MultiSelect`, so `config.onFilter`, `filter` and `label` can be injected without a custom renderer.

### Patterns and Conventions
- Components import via `@/components/<Name>`. `reusable-components.md` lists `ProjectSelector` as the "Project-scope dropdown".
- For a filter-panel embed, the Analytics convention is `label=""` (the accordion header already shows "PROJECT"), `fullWidth` and `multiple`.
- `Filters` Multiselect rows use `h-[35px]` and `tracking-normal`. `ProjectSelector` defaults to `size='medium'` and the Users filter passes `size="small"`. `MultiSelect` itself defaults to `SMALL`. `panelSize='md'` sets the panel to 320 px, otherwise the panel width equals the input width (`useInputWidth`). Matching "look" is a judgement call between these. It is not determined by the code.
- Behaviour in single mode (verified in `useMultiSelectLogic.ts:66-69` and `MultiSelect.tsx:494`): selecting the already-selected item returns null (no deselect), there is no clear button, and the panel hides on pick. In `multiple` mode there is a clear button and deselect by unchecking.

---

## 3. Documentation Findings

### Guides and Architecture Docs
- `.ai-run/guides/components/reusable-components.md:163` lists `ProjectSelector` ("varies"). `.ai-run/guides/components/component-patterns.md` and `testing/testing-patterns.md` exist and are relevant to implementation and tests. They were not read in depth. AGENTS.md says to write tests only when explicitly requested.
- The lead doc's §1 root cause matches the code; every cited line was re-read and is correct (the Filters Multiselect branch is at 280-314, not 280-310).

### Architectural Decisions
- In `ProjectSelector.tsx`, a comment cites EPMCDME-13637 (display name resolution for projects the user is not assigned to). That is the reason for `useResolvedProjectOptions`.

### Derived Conventions
- Filter definitions are `useMemo`'d and `Filters` re-syncs from props when `refreshOnValuesUpdate` is set (as in the scheduler). A `renderCustomFilter` that is an inline arrow works elsewhere (Skills, Assistants), though Workflows uses `useCallback`.

---

## 4. Testing Landscape

### Existing Coverage
- `src/pages/schedulers/__tests__/SchedulerFilters.test.tsx` — 2 tests. They render `SchedulerFilters` with `filterOptions` (projects `Platform Team`, `Growth Squad`), click `.p-multiselect` index 0 (Project) or 1 (Resource), and assert option names via `getByText`. After the swap, the first test's Project case would fail: `ProjectSelector` reads `userStore.getProjects`, not `filterOptions.projects`. The Resource test would still pass, but its index-based selector depends on the Project trigger still being a `.p-multiselect` (it is: `ProjectSelector` renders the same `MultiSelect`).
- `src/pages/schedulers/__tests__/SchedulersPage.integration.test.tsx` — "shows project names in the Project filter dropdown" waits for `schedulersStore.filterOptions.projects` and clicks `.p-multiselect[0]`, asserting `Platform Team`. It breaks after the swap. The default mocked `v1/user` in `src/setupTests.tsx:230` has `is_admin:false, applications: []`, so the user has no projects unless the test overrides `mockAPI('GET','v1/user', ...)` (done elsewhere in this file for the admin case). The "Resource" test and the "calls GET filter-options on mount" test are unaffected.
- `src/components/Filters/__tests__/Filters.test.tsx` — 2 tests (search + submit; renders all major types). It has no Custom-type test, and none of its assertions depend on the scheduler. Unaffected unless `Filters.tsx` is changed.
- `src/components/ProjectSelector/__tests__/ProjectSelector.test.tsx` — mocks `@/store/user` and `@/components/form/MultiSelect`, captures `onFilter` and asserts the debounce. It documents how to mock `getProjects` in tests.
- `src/pages/analytics/components/__tests__/AnalyticsFilters.test.tsx` — mocks the user store; reference for testing `ProjectSelector` embedded in a filter panel.
- `SchedulerRunHistoryPage.integration.test.tsx` and `NewSchedulerPage.integration.test.tsx` — not affected by the filter.

### Testing Framework and Patterns
- Vitest with React Testing Library, two projects (`unit` and `integration`; integration files are `*.integration.test.*`). Integration uses `renderPage` and `mockAPI` from `@/test-utils/integration`. Unit tests use `vi.mock` for stores. The repro doc has a ready failing test (jsdom: `.p-multiselect-panel input[type="text"]`), which fits the AC1 check.

### Coverage Gaps
- Nothing asserts a search input on the scheduler filters, filter-by-typing, selection and deselection round-trip through `onApply`, or the string-versus-array value handling of a Custom entry.
- Debounced search (300 ms) and the admin 3-character threshold need fake timers or mocking `userStore.getProjects`.

---

## 5. Configuration and Environment

### Environment Variables
- None specific to this feature.

### Configuration Files
- Feature flag `features:schedulersView` gates the page (`src/router.tsx:333`, per the lead doc, not re-read). `FEATURE_FLAGS.SHOW_ALL_PROJECTS` (read in `userStore.getAdminProjects`) changes how many projects admins can search.

### Feature Flags and Deployment Concerns
- No deployment, secret or config change is implied by the code surface.
- Pre-existing, out of scope (lead doc §8): `schedulersStore` calls pass `'/v1/...'` with a leading slash, unlike the rest of the app. This breaks local dev against uvicorn only and is not part of this ticket.

---

## 6. Risk Indicators

- Value-shape mismatch (high likelihood if done naively): `Filters` wraps values in an array only for `Multiselect`. For `Custom`, `filters.projectId` is whatever `definition.value` is. `handleApply` does `(raw.projectId as string[])?.[0]`. If the definition keeps `value: values.projectId ? [values.projectId] : []` and `ProjectSelector` is `multiple`, the array contract holds. If `value` becomes a string, `?.[0]` would return the first character of the project name. Keep this contract consistent.
- Single versus multiple: the current UI already behaves as single-select (the second tick does not stick, observed in the lead doc). `ProjectSelector` has two modes. `multiple` keeps checkboxes, deselect by unchecking and the clear button, but still lets users tick several (`handleApply` still keeps only the first, so the quirk persists). Single mode (`multiple={false}`) cannot be deselected and has no clear button (see above), which regresses AC4 ("deselecting works as before") and `areFiltersEmpty` / "Clear all" would be the only way to reset. Speculative: `multiple` plus `value` as an array is the lowest-risk reading of AC4.
- `selectDefault` (default true) only fires in single mode (`!multiple`) and calls `onChange(projects[0].name)` when `value` is empty. In single mode with the default, the scheduler page would silently filter by the first project on load and push it into the URL. That conflicts with the current "no project selected" default. In `multiple` mode it never fires. If single is chosen, `selectDefault={false}` is needed.
- Option source change (product risk): the shared selector lists the user's projects (and, for admins, others via search), not "projects with at least one scheduler". Users can now pick projects that return no rows, and admins with `SHOW_ALL_PROJECTS` off see a short list. A scheduler's project name is the filter key, and `id == name` per the lead doc, so values stay compatible. Whether this is acceptable needs a product decision; the ticket says to use the shared component. `filterOptions.projects` becomes unused by the Project filter (the backend and store field stay).
- Selected project not in the list: a project in the URL that is outside the user's list still resolves (`useResolvedProjectOptions`), and label/format becomes "name (display_name)", which differs from the plain name shown today. The table's Project column still shows plain `project.name`.
- Auto-apply on change: any change in `filters` triggers `onApply` (`Filters.tsx:130-136`). `ProjectSelector`'s search is local to its own state and does not touch `filters`, so typing a query does not trigger an apply. Only picks do.
- Layout consistency: `Filters` Multiselect rows are `h-[35px]` with its own clear X. `ProjectSelector` defaults `size='medium'`, so height, label (`label=""` needed to avoid a duplicate "Project" caption above the accordion title), `fullWidth` and panel width (`panelSize` 'md' = 320 px versus input width) can drift from both the Resource row and other pages. Placeholder is the hard-coded 'Project', and the Resource filter keeps its generic look beside it.
- Resource filter keeps no search box. It is not in the ticket scope, and the lead doc flags it. A visible inconsistency next to the new Project selector.
- `id/name="project-selector"` is hard-coded. Only one instance per page; relevant if the Scheduler page ever embeds a second.
- Tests: the two Project-name tests in `SchedulerFilters.test.tsx` and `SchedulersPage.integration.test.tsx` will fail and need a `userStore`/`v1/user` project setup. Index-based `.p-multiselect[0/1]` selectors depend on the render order of Project and Resource (Radio groups render no `.p-multiselect`).
- Admin search: non-admins filter client-side. Admins with `SHOW_ALL_PROJECTS` off hit `v1/admin/applications` only at 3 or more characters, so a 1-2 character query returns the full local list rather than a filtered one. This is inherited shared behaviour (AC2 should be checked with that in mind).
- Hidden dependency: the `Filters` `form` element wraps the selector. Pressing Enter in the PrimeReact filter input may submit the form (calls `apply`). Not verified for `ProjectSelector`; other pages that use Multiselect with a filter in `Filters` have the same exposure.

---

## 7. Summary for Complexity Assessment

The defect is confined to one page-level file, `src/pages/schedulers/SchedulerFilters.tsx` (about 157 lines), where Project is declared as a generic `Multiselect` without `config.onFilter`, so no search box appears. The expected change surface is that file plus its two affected tests. The layers touched are the page UI layer and, read-only, the shared `ProjectSelector` and `Filters` components, which need no change because `Filters` already offers `FilterDefinitionType.Custom` with `renderCustomFilter`. The store, router, API and backend are untouched. This is a small change in volume, but it has a few subtle contract points (array versus string values, single versus multiple mode, option source).

Technical novelty is low: `Custom` plus `renderCustomFilter` is a well-used pattern in Assistants, Skills, Workflows, DataSources and the scheduler run history. The only new combination is embedding `ProjectSelector` inside `Filters`, which no page currently does (Analytics and Users render it outside `Filters`). The Analytics embed (`label="" fullWidth multiple`) is the closest precedent. The main non-trivial points are the value contract with `handleApply`, the deselect behaviour of the single mode, the changed option data source (the user's projects instead of projects that have schedulers), and visual alignment (label, size, panel width).

Test posture: `SchedulerFilters.test.tsx` (2 tests) and `SchedulersPage.integration.test.tsx` cover the filters, and the Project-name assertions in both depend on `filterOptions.projects`, which will no longer feed that control, so they will need updates. There is no existing coverage for search input, typing and clearing, or selection round-trips. `ProjectSelector` has its own unit test, and `AnalyticsFilters.test.tsx` shows how to mock it. Risks are mostly product and UX (option set change, single versus multiple), not technical, and the repo's guides and the lead doc agree with the code.

---

## 8. External References

None named by the task as a source of truth. The task points to a prior analysis as a lead (not a source of truth), `/mnt/c/Users/AleksandrBudanov/Projects/EPMCDME-16068/EPMCDME-16068-repro-wsl-linux.md` (resolved, read in full). Facts taken from it and re-verified in code: root cause (SchedulerFilters Multiselect with no `config.onFilter`, `MultiSelect.tsx:467`), single-value `handleApply`, `ProjectSelector` search and debounce. Facts taken from it and NOT re-verified here (backend and runtime): `GET /v1/schedulers/filter-options` returns only projects with at least one scheduler, `id == name`, 60 s cache, and the observed browser behaviour (the second tick not sticking).
