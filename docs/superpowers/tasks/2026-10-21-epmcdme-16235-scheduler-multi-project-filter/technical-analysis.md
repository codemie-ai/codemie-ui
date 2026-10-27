# Technical Research

**Task**: schedulers filters project-selector url-sync
**Generated**: 2026-10-21
**Research path**: codegraph

---

## 1. Original Context

EPMCDME-16235 (Bug) — Scheduler page: project selector has checkboxes but only one can be checked. Expected: user can select several projects.
This run is the FRONTEND MR (codemie-ui). Backend MR (codemie) is already done; its run artifacts (spec.md, plan.md, code-review.md, code-review.local.diff) are at /home/aliaksei_chumakou/codemie-dev/codemie/docs/superpowers/tasks/2026-10-21-scheduler-multi-project-filter/ — read the backend diff/spec there to confirm the exact API contract (GET /v1/schedulers projectId/resourceId as repeated query params, OR semantics, single value backward compatible).

Ticket acceptance criteria:
1. The user can check two or more projects in the Scheduler page project selector, and all of them stay checked.
2. The user can uncheck any selected project without affecting the other selected projects.
3. The Scheduler page content reflects all projects currently selected.
4. The selector's behavior matches its checkbox appearance (multi-select).

Ticket comment (technical analysis, verbatim excerpt):
Root cause — Frontend, codemie-ui/src/pages/schedulers/SchedulerFilters.tsx: the project filter renders <ProjectSelector multiple>, but SchedulerFilterValues.projectId is a single string and handleApply keeps only projectIdArr?.[0]. Because of refreshOnValuesUpdate, the filter then shows that single value again, so every other checked project disappears. The Resource filter (Multiselect) has the same bug: resourceIdArr?.[0].
Decisions: D1 Resource filter fixed in this ticket. D2 OR semantics. D3 Scheduler Run History page (SchedulerRunFilters.tsx) out of scope. D4 one ticket, two MRs.
MR 2 — frontend (codemie-ui):
- SchedulerFilters.tsx: change projectId / resourceId to string[], pass full arrays in handleApply, pass arrays as value, update areFiltersEmpty (empty array = no filter).
- store/schedulers.ts: change SchedulersQuery.projectId / resourceId to string[]. Send arrays as-is; the API client's default queryParamArrayHandling: 'separate' already emits repeated params.
- SchedulersPage.tsx (URL sync, about lines 99–138): read with searchParams.getAll(...) and write each value with append, so a multi-selection survives a page reload or a shared link.
- Tests: pages/schedulers/__tests__/SchedulerFilters.test.tsx (check two or more projects and resources, uncheck one, the others stay selected) and the store params.
Refined AC: 1 multiple projects stay checked; 2 unchecking one doesn't affect others; 3 list shows schedulers of ANY selected project; 4 criteria 1–3 also apply to Resource filter; 5 non-admin never sees inaccessible projects (backend); 6 clearing all selections shows unfiltered list.

---

## 2. Codebase Findings

### Existing Implementations
- `src/pages/schedulers/SchedulerFilters.tsx` — sidebar filter form.
  - `SchedulerFilterValues` (L28-35): `projectId?: string`, `resourceId?: string`.
  - `filterDefinitions` (L81-94): `projectId` is `FilterDefinitionType.Custom` with `value: values.projectId ? [values.projectId] : []`; `resourceId` is `FilterDefinitionType.Multiselect` with `value: values.resourceId ? [values.resourceId] : []`, options from `filterOptions.resources` (`value: r.id`).
  - `areFiltersEmpty` (L113-122): `!values.projectId && !values.resourceId && ...` (truthiness).
  - `handleApply` (L124-138): `projectId: projectIdArr?.[0] || undefined`, `resourceId: resourceIdArr?.[0] || undefined` — the truncation point.
  - `renderCustomFilter` (L140-158): renders `<ProjectSelector multiple fullWidth label="" value={value as string[]} onChange={(v) => updateValue(v)} />`.
  - `<Filters ... refreshOnValuesUpdate />` (L160-170).
- `src/pages/schedulers/SchedulersPage.tsx` — page; URL is the source of truth for filters.
  - `filters` memo (L94-106): `projectId: searchParams.get('projectId') || undefined`, same for `resourceId`.
  - `query` memo (L108-120): passes `filters.projectId` / `filters.resourceId` to `SchedulersQuery`; `useEffect` (L127-129) calls `schedulersStore.fetchSchedulers(query)`.
  - `handleApplyFilters` (L131-144): builds `new URLSearchParams()` with `next.set('projectId', values.projectId)` / `next.set('resourceId', ...)`, then `setSearchParams(next)`.
  - `handleChangeSchedulerType` (L151-155) calls `clearParams()`.
- `src/store/schedulers.ts` — `SchedulersQuery` (L61-71) `projectId?: string`, `resourceId?: string`; `fetchSchedulers` (L115-145) builds `params: Record<string, string | number>` and sets `params.projectId = query.projectId` when truthy, then `api.get('/v1/schedulers', { params })`.
- `src/utils/api.ts` `makeRequest` (L310-343): `queryParamArrayHandling = 'separate'` default; arrays are emitted as repeated `searchParams.append(key, item)`; `undefined`/`null` skipped. An empty array emits nothing.
- `src/hooks/useSearchParams.ts` — custom hook (not react-router). Holds a `URLSearchParams` in state; `setSearchParams` pushes history and persists `toString()` to `sessionStorage` key `filters:<pathname>`, restored on mount when URL has no query. `URLSearchParams.toString()` preserves repeated keys.
- `src/components/ProjectSelector/ProjectSelector.tsx` — with `multiple`, `onChange(e.value)` emits a `string[]` of project **names** (`value: project.name`); accepts `value?: string | string[] | null`. Options come from `userStore.getProjects(search, adminOnly)`.
- `src/components/Filters/Filters.tsx` — `filterValuesFromProps` deep-clones each definition value (Multiselect scalar wrapped into array); with `refreshOnValuesUpdate` local `filters` state is reset from props whenever definitions change (L71-75); any non-search change auto-applies via JSON diff (L123-136); search debounced 1000 ms.

### Architecture and Layers Affected
- Page/component layer: `SchedulerFilters.tsx`, `SchedulersPage.tsx` (`src/pages/schedulers/`).
- Store layer: `schedulersStore.fetchSchedulers` / `SchedulersQuery` (`src/store/schedulers.ts`).
- HTTP layer `src/utils/api.ts` — already supports arrays; no change indicated.

### Integration Points
- Data flow: `ProjectSelector`/Multiselect -> `Filters` local state -> `SchedulerFilters.handleApply` -> `SchedulersPage.handleApplyFilters` -> URL (`useSearchParams`) -> `filters` memo -> `values` prop back into `SchedulerFilters` (refresh loop) and `query` memo -> `schedulersStore.fetchSchedulers` -> `GET /v1/schedulers`.
- Backend contract: see Section 8.
- `useVueRouter.tsx` `createSearchParamsString` / `parseSearchParams` already handle arrays (not used by this page).

### Patterns and Conventions
- Filter components define `FilterDefinition[]` and pass to shared `Filters`; custom widgets via `renderCustomFilter`.
- Other pages read multi-value URL params with `searchParams.getAll(key)` (`src/utils/filters.ts` `getFiltersFromUrl`, L148).
- Valtio store methods build `params` objects and rely on `api.get` serialization.

---

## 3. Documentation Findings

### Guides and Architecture Docs
Routed by `AGENTS.md`: `.ai-run/guides/testing/testing-patterns.md` (tests), `.ai-run/guides/patterns/state-management.md` (stores), `.ai-run/guides/architecture/routing-patterns.md` (URL/navigation). Not opened in this run — conventions below derived from code.

### Architectural Decisions
Ticket decisions D1-D4 (Section 1). Backend spec non-goals: no comma-separated format, Run History endpoints keep single `resourceId`.

### Derived Conventions
- Arrays to API: pass `string[]` in `params`; default `'separate'` mode yields `?projectId=a&projectId=b`.
- Multi-value URL params: `getAll` on read, `append` on write.

---

## 4. Testing Landscape

### Existing Coverage
- `src/pages/schedulers/__tests__/SchedulerFilters.test.tsx` (unit): renders resource names; renders project names + search input; `applies the selected project as projectId` asserts `objectContaining({ projectId: 'Platform Team' })` (scalar); `clears projectId when ... unchecked` passes `values={{ projectId: 'Platform Team' }}` and asserts `projectId: undefined`. Mocks `userStore.getProjects`; opens PrimeReact via `.p-multiselect` index (0 = Project, 1 = Resource), items via `.p-multiselect-item`.
- `src/pages/schedulers/__tests__/SchedulersPage.integration.test.tsx`: filter-options fetch, dropdown contents, `ownerType` query, type switch. Uses `mockAPI` / `renderPage` from `@/test-utils/integration`. No URL-sync or projectId/resourceId param assertions.
- `src/store/__tests__/schedulers.filterOptions.test.ts`: `fetchFilterOptions` only.
- Other scheduler tests (`NewSchedulerPage`, `SchedulerRunHistoryPage`, `SchedulerRunDetailsPage`, `renderSchedulerSchedule`) unrelated.

### Testing Framework and Patterns
Vitest + React Testing Library, projects `unit` and `integration` (`vite.config.ts`). `fireEvent` + `waitFor`, `vi.spyOn(...).mockResolvedValue`, `vi.restoreAllMocks` in `afterEach`.

### Coverage Gaps
- No test for multi-select (2+ projects/resources) or unchecking one of several.
- No test of `fetchSchedulers` query-param serialization.
- No test of `SchedulersPage` URL read/write (`getAll`/`append`, reload/shared link).
- No test of `areFiltersEmpty`.

---

## 5. Configuration and Environment

### Environment Variables
None specific. `api.ts` base URL from `window._env_.VITE_API_URL` / `import.meta.env.VITE_API_URL`.

### Configuration Files
None for this feature area.

### Feature Flags and Deployment Concerns
None. Filter query string persisted in `sessionStorage` (`filters:/schedulers` path key) by `useSearchParams`.

---

## 6. Risk Indicators

- Existing tests in `SchedulerFilters.test.tsx` assert scalar `projectId` (`'Platform Team'`, `undefined`) and pass scalar `values` — they encode the bug and will break under any array change.
- `Filters.tsx` `refreshOnValuesUpdate` reset loop: any lossy round-trip (component -> URL -> `values` -> definition) re-truncates the selection; all three hops (handleApply, URL write, URL read) must preserve arrays or the bug persists.
- `SchedulersPage` `filters` memo: `getAll` returns a fresh array per render of the memo; memo keyed on `searchParams` only, so stable — but array identity feeds `filterDefinitions` deps.
- Empty-array semantics: `areFiltersEmpty` uses truthiness; `[]` is truthy. AC6 (clear all -> unfiltered) depends on empty arrays being treated as no filter at every hop (`api.ts` emits nothing for `[]`).
- `fetchSchedulers` `params` typed `Record<string, string | number>` — does not admit `string[]` as typed today.
- Project values are project **names** (`ProjectSelector` `value: project.name`) sent as `projectId`; backend compares to `s.project_name`. Consistent today; not a new issue.
- `sessionStorage`-restored filters from before the change contain at most one `projectId` — still valid under single-value backward compatibility.
- Out-of-scope neighbour: `SchedulerRunFilters.tsx` (D3) — must not be touched.
- Speculative: the page-level URL hop is untested in integration tests; a reload/shared-link regression would go unnoticed without a new test.

---

## 7. Summary for Complexity Assessment

The change sits in two layers of one product area: the page/component layer (`src/pages/schedulers/SchedulerFilters.tsx`, `SchedulersPage.tsx`) and the store layer (`src/store/schedulers.ts`). The HTTP client (`src/utils/api.ts`) already serializes arrays as repeated query params by default, `ProjectSelector multiple` already emits `string[]`, and the shared `Filters` Multiselect already holds arrays — the defect is purely that three hops (`handleApply` `[0]`, URL `set`/`get`, scalar store types) collapse arrays to one value, which `refreshOnValuesUpdate` then feeds back into the UI. Surface is about 3 source files plus 1-3 test files, with small, type-driven edits.

No novel patterns: `getAll` for multi-value URL params is used elsewhere (`src/utils/filters.ts`), and the backend contract is finished and backward compatible for single values. Run History filters are explicitly out of scope.

Test posture is moderate: `SchedulerFilters.test.tsx` exists with PrimeReact multiselect interaction helpers, but its two apply/clear tests assert scalar values and must be rewritten; there is no coverage for store query params or page URL sync. Key risks are the refresh round-trip (every hop must preserve arrays) and empty-array handling for AC6.

---

## 8. External References

- `/home/aliaksei_chumakou/codemie-dev/codemie/docs/superpowers/tasks/2026-10-21-scheduler-multi-project-filter/spec.md` — resolved. Contract facts:
  - "`GET /v1/schedulers` accepts `projectId` and `resourceId` as repeated query params (`?projectId=a&projectId=b`). ... A single `?projectId=a` still works unchanged."
  - OR within a dimension: "a scheduler matches if it belongs to ANY selected project and matches ANY selected resource. The two filters (and all other filters) stay ANDed with each other."
  - "Absent, `None`, empty list, or only blank strings = no filter for that dimension. Blank entries are dropped so `?projectId=` keeps today's 'unfiltered' behavior."
  - Non-admin scope is an independent ANDed condition; selecting an inaccessible project yields an empty intersection, never widened results (covers refined AC5 server-side).
  - Non-goals: "Comma-separated value format (analytics style); repeated params only." Run History `/scheduler-runs*` keeps single `resourceId`.
- `code-review.local.diff`, `plan.md` in the same directory — present, not opened (spec is sufficient for the contract).
