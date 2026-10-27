# Technical Research

**Task**: schedulers filters resource-type
**Generated**: 2026-10-15
**Research path**: filesystem

---

## 1. Original Context

Jira EPMCDME-15591:
"Schedulers: reorder Resource Type filter options.
Summary: Update the Resource Type filter on the Schedulers page to present scheduler resource types in the expected order: All, Assistant, Workflow, Datasource.
Description: The current Resource Type filter on the Schedulers page displays the options in the following order: All, Workflow, Assistant, Datasource. Reorder the options so that Assistant appears before Workflow, while retaining the existing All default option and Datasource option. This is a UI presentation improvement only; the existing filtering behavior must remain unchanged.
Affected Areas: Schedulers page; Resource Type filter UI; Scheduler list filtering state and option rendering.
Acceptance Criteria:
1. The Resource Type filter on the Schedulers page displays options in this order: All, Assistant, Workflow, Datasource.
2. All remains selected by default when no Resource Type filter is applied.
3. Selecting Assistant displays only schedulers associated with assistants.
4. Selecting Workflow displays only schedulers associated with workflows.
5. Selecting Datasource displays only schedulers associated with datasources.
6. Reordering options does not change the existing filtering behavior, URL/filter-state handling, pagination, or interactions with other Schedulers filters.
7. The updated ordering is applied consistently in every Scheduler view where this filter is available."

---

## 2. Codebase Findings

### Existing Implementations
- `src/pages/schedulers/SchedulerFilters.tsx:44-49` — the module-level constant that defines the order:
  ```ts
  const RESOURCE_TYPE_OPTIONS: FilterOption[] = [
    ALL_OPTION,
    { label: 'Workflow', value: 'Workflow' },
    { label: 'Assistant', value: 'Assistant' },
    { label: 'Datasource', value: 'Datasource' },
  ]
  ```
  `ALL_OPTION = { label: 'All', value: '' }` (line 42) is shared with `STATUS_OPTIONS` and `LAST_RUN_STATUS_OPTIONS`. The constant is not exported.
- `SchedulerFilters.tsx:77-84` — a `FilterDefinitionType.RadioGroup` definition named `resourceType`, labelled `Resource Type`, with `value: values.resourceType ?? ''`. When `''` (All) is the value, All is selected by default.
- `SchedulerFilters.tsx:134` — on apply, `raw.resourceType || undefined`.
- `src/pages/schedulers/SchedulersPage.tsx:97-98, 113, 136` — reads `resourceType` from URL search params, passes it into the `SchedulersQuery`, and writes it back to the URL on apply. This code uses values only and does not depend on option order.
- `src/store/schedulers.ts:23` — `type SchedulerResourceType = 'Assistant' | 'Workflow' | 'Datasource'`; line 123 sends `params.resourceType` to the API.

### Architecture and Layers Affected
- Page and components layer only: `src/pages/schedulers/SchedulerFilters.tsx`.
- Shared rendering: `src/components/Filters/Filters.tsx:253-266` renders `RadioGroup` (`src/components/form/RadioGroup/RadioGroup.tsx`) from `definition.options` in array order (`vertical`). Array order is display order, and nothing re-sorts it.

### Integration Points
- `SchedulerFilters` is imported only by `SchedulersPage.tsx`. That page is the single `schedulers` route (`src/router.tsx:340-342`). Its User/Project "Scheduler Type" switch (`schedulerType` / `ownerType`) reuses the same `SchedulerFilters` instance, so one constant serves both views (AC7).
- `SchedulerRunFilters.tsx` / `SchedulerRunHistoryPage.tsx` have no resource-type filter, so they are not affected.
- The backend contract (`resourceType` query param values `Assistant|Workflow|Datasource`) does not change.

### Patterns and Conventions
- Filter options are static `FilterOption[]` constants passed through `FilterDefinition` to the generic `Filters` component.

---

## 3. Documentation Findings

### Guides and Architecture Docs
- `.ai-run/guides/testing/testing-patterns.md` and `qa-strategy.md` cover testing. `.ai-run/guides/testing/local-verification.md` covers browser verification before an MR. No scheduler-specific guide exists.

### Architectural Decisions
- None recorded for this filter. The file history has one commit: `c9a17a33e EPMCDME-10682: Add schedulers integrations view`.

### Derived Conventions
- Labels are equal to values. The `All` option uses the empty string.

---

## 4. Testing Landscape

### Existing Coverage
- `src/pages/schedulers/__tests__/SchedulerFilters.test.tsx` (unit) — 2 tests, both about Project/Resource multiselect labels. No test covers the Resource Type radio group or its order.
- `src/pages/schedulers/__tests__/SchedulersPage.integration.test.tsx` — filter-options fetch, resource and project dropdowns, `ownerType` query, and the type switch. It does not assert Resource Type order or selection.
- `src/store/__tests__/schedulers.filterOptions.test.ts` — store filter-options (not order related).

### Testing Framework and Patterns
- Vitest + React Testing Library, with `unit` and `integration` projects. `SchedulerFilters.test.tsx` renders the component directly with a `filterOptions` fixture, `values={{}}`, and `onApply` set to `vi.fn()`.

### Coverage Gaps
- No test checks Resource Type option order, the default All selection, or that selecting a type emits the right `resourceType`. No existing test would fail because of the reorder.

---

## 5. Configuration and Environment

### Environment Variables
- None relevant.

### Configuration Files
- None relevant.

### Feature Flags and Deployment Concerns
- None.

---

## 6. Risk Indicators

- Low risk overall. Only the order of a non-exported, static array changes. Values, labels, default and URL handling stay the same.
- `ALL_OPTION` is shared by three constants. It must stay first and stay the same object, and `STATUS_OPTIONS` and `LAST_RUN_STATUS_OPTIONS` should not be touched.
- Speculative: a new unit assertion in `SchedulerFilters.test.tsx` that opens the filter panel and reads radio labels in order. The way the `Filters` panel is opened (toggle button vs always rendered) needs checking in `src/components/Filters/Filters.tsx` before writing it.

---

## 7. Summary for Complexity Assessment

The change touches one layer: the page-level filter component `src/pages/schedulers/SchedulerFilters.tsx`. The only edit needed is swapping two entries in the `RESOURCE_TYPE_OPTIONS` constant (lines 44-49). The shared `Filters` / `RadioGroup` components render options in array order. `SchedulersPage.tsx` handles filter state, URL params and the API query by value, not by position, so AC2-AC6 hold without change. The component has a single consumer, and the User/Project switch reuses it, which satisfies AC7.

Nothing in the change is new: it uses no new patterns, dependencies, config or API changes. Test coverage of the Resource Type filter is absent. `SchedulerFilters.test.tsx` and `SchedulersPage.integration.test.tsx` cover only the multiselect labels and the page wiring, so a small order or default assertion is the natural addition. This is an XS change: one source file plus one test file.

---

## 8. External References

None named by the task.
