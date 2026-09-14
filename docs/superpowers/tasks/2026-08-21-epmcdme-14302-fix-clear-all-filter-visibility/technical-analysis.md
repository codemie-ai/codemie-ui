# Technical Research

**Task**: assistants filters clear-all filter-state
**Generated**: 2026-08-21T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

On the Assistants page, the 'Clear all' action in the Filters panel is displayed even when no filters are applied. The 'Clear all' action should only be visible/enabled when at least one filter is active (Search field non-empty, Project filter selected, Categories filter selected, Created By filter selected, or Shared filter selected). When all filters are cleared/reset, the 'Clear all' action should be hidden or disabled.

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/assistants/components/AssistantList/AssistantFilters/AssistantFilters.tsx` — renders the `<Filters>` shared component for the Assistants page; computes `areFiltersEmpty` using `checkEmptyFilters(filters)` and passes it as a prop to `<Filters>`
- `src/components/Filters/Filters.tsx` — shared Filters component; renders the "Clear all" button conditionally at line 176: `{!areFiltersEmpty && (<Button ...>Clear all</Button>)}`
- `src/pages/assistants/hooks/useAssistantFilters.ts` — centralized hook that manages assistant filter state; builds a `filters` object from `FILTER_INITIAL_STATE` merged with saved filters; always appends `result[scope] = null`; also strips `sort_order` when `sort_by` is absent when applying filters, but NOT when computing the displayed `filters` object
- `src/constants/assistants.ts` (line 200–218) — defines `FILTER_INITIAL_STATE` which includes `sort_order: 'desc'` as a non-empty string
- `src/utils/filters.ts` (line 308–316) — `checkEmptyFilters`: returns `true` when every value is null / undefined / empty string / empty array; returns `false` if any value is a non-empty string

### Architecture and Layers Affected

- **Presentation layer**: `src/components/Filters/Filters.tsx` (shared), `src/pages/assistants/components/AssistantList/AssistantFilters/AssistantFilters.tsx`
- **State/hook layer**: `src/pages/assistants/hooks/useAssistantFilters.ts`
- **Constants/config layer**: `src/constants/assistants.ts` (`FILTER_INITIAL_STATE`)
- **Utility layer**: `src/utils/filters.ts` (`checkEmptyFilters`)

### Integration Points

- `AssistantFilters` is consumed inside the Assistants list page and receives `filters` from `useAssistantFilters`.
- The `Filters` shared component is also used by other pages (e.g. DataSources, UsersManagement, ProjectsManagement) — any change to shared logic must not regress those.

### Patterns and Conventions

- The "Clear all" visibility is controlled by the `areFiltersEmpty` prop passed into the shared `<Filters>` component. This prop is computed locally in `AssistantFilters` via `useMemo(() => checkEmptyFilters(filters), [filters])`.
- `checkEmptyFilters` is a generic utility that treats any non-empty string as a non-empty filter.
- The fix should be local to `AssistantFilters` (computing `areFiltersEmpty`) rather than changing the shared utility, to avoid regressions elsewhere.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/patterns/state-management.md` — covers Valtio stores and hooks; relevant to understanding `useAssistantFilters` pattern.
- `.ai-run/guides/components/component-patterns.md` — covers shared component usage conventions.

### Architectural Decisions

No ADRs found specific to filter state management.

### Derived Conventions

- Filter state is persisted per entity+scope key via `setFilters`/`getFilters` (localStorage-backed).
- Initial state always includes `sort_order: 'desc'` as a default; this value is not considered a "user-applied filter" for UX purposes.
- The `filters` object always contains `result[scope] = null` (scope key with null value).

---

## 4. Testing Landscape

### Existing Coverage

- `src/components/Filters/__tests__/Filters.test.tsx` — tests for the shared Filters component.
- `src/pages/assistants/hooks/__tests__/` — may contain tests for `useAssistantFilters`.
- No dedicated test file found for `AssistantFilters.tsx` itself.

### Testing Framework and Patterns

Vitest with React Testing Library. Two projects: `unit` and `integration`.

### Coverage Gaps

- No test file found for `AssistantFilters.tsx` — the component computing `areFiltersEmpty` has no direct test coverage.
- The specific interaction "Clear all hidden when all filters are default" is not covered.

---

## 5. Configuration and Environment

### Environment Variables

None relevant to this feature.

### Configuration Files

- `src/constants/assistants.ts` — `FILTER_INITIAL_STATE` is the source of truth for default filter values.

### Feature Flags and Deployment Concerns

None identified.

---

## 6. Risk Indicators

- **Root cause confirmed**: `FILTER_INITIAL_STATE` includes `sort_order: 'desc'` (a non-empty string). The `filters` object returned by `useAssistantFilters` always has `sort_order: 'desc'` set. `checkEmptyFilters` treats any non-empty string as an active filter, so `areFiltersEmpty` is always `false`, and "Clear all" is always rendered.
- The `filters` object also always contains `result[scope] = null` (the active scope name as a key with null value). This does not cause the bug since null is treated as empty by `checkEmptyFilters`.
- **Shared utility risk**: `checkEmptyFilters` is used by other filter panels (DataSources, UsersManagement, ProjectsManagement). Any change to the utility itself must be verified not to regress them.
- **Sort filter ambiguity**: `sort_by` and `sort_order` are included in the filter definitions for the Marketplace scope but not for other scopes (they are filtered out in `filterDefinitions`). Yet they are always present in the `filters` object passed to `checkEmptyFilters`. The fix must account for these "hidden" filter fields that should not influence "Clear all" visibility.
- No existing test coverage for `AssistantFilters.tsx` — new behavior should be regression-tested.

---

## 7. Summary for Complexity Assessment

The task touches two layers: the hook layer (`useAssistantFilters`) where filter state is assembled, and the presentation layer (`AssistantFilters.tsx`) where `areFiltersEmpty` is computed. The `Filters` shared component already has the correct conditional rendering (`{!areFiltersEmpty && ...}`); the bug is entirely in the value passed to that prop.

The fix is low-complexity. The `areFiltersEmpty` computation in `AssistantFilters.tsx` uses `checkEmptyFilters(filters)`, but `filters` always contains `sort_order: 'desc'` from `FILTER_INITIAL_STATE`, making `checkEmptyFilters` always return `false`. The correct fix is to exclude non-user-facing fields (`sort_order`, `sort_by`, and the injected `[scope]` key) from the emptiness check. This can be done by deriving a subset of `filters` that contains only user-visible filter fields (search, project, categories, created_by, shared, is_global) before calling `checkEmptyFilters`, keeping the change local to `AssistantFilters.tsx` and avoiding any risk to the shared utility or other filter panels.

The affected file surface is small: primarily `src/pages/assistants/components/AssistantList/AssistantFilters/AssistantFilters.tsx` (the `areFiltersEmpty` useMemo). No new patterns are introduced — this follows the established convention for computing `areFiltersEmpty` used by sibling pages. Test coverage for this component is absent and a unit test asserting the "Clear all" button is hidden when no user-visible filters are active would be a valuable addition.
