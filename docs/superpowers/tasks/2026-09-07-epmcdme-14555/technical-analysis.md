# Technical Research

**Task**: project-management projects api duplicate-requests
**Generated**: 2026-09-07T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

Project Management page sends two identical requests to the projects endpoint on initial load (projects?page=0&per_page=10&include_budgets=true&has_assigned_budgets=true). Goal: find and fix the root cause of the duplicate fetch so only one request fires on page open. Acceptance criteria: single initial request, filters/pagination/budget data remain functional, regression test coverage for the duplicate.

---

## 2. Codebase Findings

### Existing Implementations

- `/src/pages/settings/administration/projectsManagement/ProjectsManagementFull.tsx` — the Project Management list page; contains `loadProjects`, all fetch-triggering `useEffect` hooks, and the budget/pagination filter logic.
- `/src/pages/settings/administration/projectsManagement/hooks/useProjectsFilters.ts` — encapsulates `search`, `budgetAssignmentFilter`, and `budgetCategory` state, restoring initial values from localStorage via `getFilters`.
- `/src/store/projects.ts` — Valtio proxy store; `indexProjects()` builds the `v1/projects` URL and updates `pagination` in state.
- `/src/hooks/useFeatureFlags.ts` — `useBudgetManagementEnabled()` reads from `appInfoStore`; returns `[false, false]` until configs are fetched, then `[true, true]` if the flag is on.
- `/src/hooks/useDebounceApply.ts` — `useDebouncedApply` compares prev/current value with `JSON.stringify`; does NOT fire on mount.

### Architecture and Layers Affected

- **Store layer** (`src/store/projects.ts`): `indexProjects` is the single write path; it overwrites `this.pagination` on every call, which triggers Valtio reactivity.
- **Page/component layer** (`ProjectsManagementFull.tsx`): two `useEffect` hooks call `loadProjects`; a third side-effects the `budgetQueryParamsRef`.
- **Hook layer** (`useProjectsFilters.ts`, `useFeatureFlags.ts`): provide reactive inputs that both effects depend on.

### Integration Points

- `projectsStore.indexProjects` — the single HTTP entry point; called via `loadProjects` callback inside the component.
- `appInfoStore` (via `useBudgetManagementEnabled`) — async config fetch; the flag may be `false` on first render and become `true` after configs arrive.
- `FILTER_ENTITY.PROJECTS` in localStorage — persists `search`, `budget_assignment`, `budget_category` across sessions via `getFilters` / `setFilters`.

### Patterns and Conventions

- Valtio `proxy` store; `useSnapshot` for reactive reads; direct mutation for writes.
- `useCallback(..., [])` for `loadProjects` — intentionally stable reference, never re-created.
- `useRef` for cross-render mutable state (`budgetQueryParamsRef`, `previousBudgetFiltersRef`, `skipPaginationReloadRef`).
- Effect guards: `skipPaginationReloadRef` prevents the pagination effect from doubling up when sort/search resets `pagination.page` to 0.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/architecture/architecture.md` — system design guide present in repo.
- `.ai-run/guides/patterns/state-management.md` — Valtio store and hooks patterns.
- `.ai-run/guides/testing/testing-patterns.md` — Vitest + RTL patterns; two workspace projects (`unit` / `integration`).

### Architectural Decisions

No ADR or inline `DECISION:` marker found for the dual-effect fetch pattern. The `skipPaginationReloadRef` flag has a comment explaining its purpose (prevent double-fetch when sort resets page to 0), but no comment covers the `previousBudgetFiltersRef` initialization assumption.

### Derived Conventions

- Effects that trigger fetches use ref-based guards rather than `enabled` flags in the dep array.
- When an effect both resets pagination and fires a fetch, it sets `skipPaginationReloadRef.current = true` before mutating `projectsStore.pagination.page`, so the pagination effect skips the resulting re-run.
- `previousBudgetFiltersRef` is intended to track "last fetched" budget filter state to detect changes — the pattern mirrors how `skipPaginationReloadRef` works, but its initialization is the source of the bug.

---

## 4. Testing Landscape

### Existing Coverage

- `/src/store/__tests__/projects.test.ts` — unit tests for `projectsStore.indexProjects`, URL params, pagination state, CRUD operations. Does not cover the component's effect behaviour.
- `/src/pages/settings/administration/projectsManagement/__tests__/ProjectsManagementFull.test.tsx` — unit test for resource counter link rendering. Mocks `useSnapshot`, `useDebouncedApply`, and `useFeatureFlags`; does not assert on `indexProjects` call count.
- `/src/pages/settings/administration/projectsManagement/__tests__/ProjectsManagementFull.editFlow.test.tsx` — unit test for create/edit modal flows. Also mocks `useBudgetManagementEnabled` as `[false, true]`.
- `/src/pages/settings/administration/projectsManagement/__tests__/ProjectsManagementFull.search.test.tsx` — integration test that wires `mockGet` directly; mocks `useBudgetManagementEnabled` as `[false, true]`.
- `/src/pages/settings/administration/projectsManagement/hooks/__tests__/useProjectsFilters.test.ts` — unit tests for the filter hook, including stored-filter restoration and persistence.
- `/src/pages/settings/administration/projectsManagement/__tests__/ProjectsManagementFull.editFlow.test.tsx` — edit/delete flow tests.

### Testing Framework and Patterns

- Vitest 1.6.1 + React Testing Library.
- Two workspace projects: `unit` (`*.test.tsx`) and `integration` (`*.integration.test.tsx`).
- Unit tests mock `useSnapshot` globally via `setupTests.unit.ts`; integration tests use real Valtio stores.
- API is mocked with `vi.mock('@/utils/api', ...)` and a `mockGet` function.
- `useBudgetManagementEnabled` is universally mocked as `[false, true]` in all existing `ProjectsManagementFull` tests — this hides the bug.

### Coverage Gaps

- No test asserts that `projectsStore.indexProjects` (or `api.get`) is called **exactly once** on initial render.
- No test covers the scenario where `useBudgetManagementEnabled` returns `[true, true]` (flag enabled from first render) combined with a non-default stored `budgetAssignmentFilter`.
- The `previousBudgetFiltersRef` initialization assumption (hardcoded `'all'` vs actual stored value) has no test coverage.

---

## 5. Configuration and Environment

### Environment Variables

No environment variables directly govern the projects fetch or budget management flag. The budget management feature flag lives in `appInfoStore.configs` (fetched from the backend).

### Configuration Files

- `FEATURE_FLAGS.BUDGET_MANAGEMENT` constant — governs whether budget columns and budget fetch params are included.
- `FILTER_ENTITY.PROJECTS` — localStorage key used by `useProjectsFilters` for session persistence.

### Feature Flags and Deployment Concerns

- `features:budgetManagement` — if enabled at runtime, `budgetQueryParams` is computed with `includeBudgets: true`; the flag drives both the UI columns and the API query params.
- No deployment manifests or Dockerfiles are affected by this change.

---

## 6. Risk Indicators

- **Root cause pinpointed — `previousBudgetFiltersRef` initialized with hardcoded `'all'` values instead of actual initial filter state.** In `ProjectsManagementFull.tsx` at the `useRef` call on line 165–168, both `budgetAssignmentFilter` and `budgetCategory` are hardcoded to `'all'`. When the component mounts with `isBudgetManagementEnabled = true` (config already fetched) AND a stored `budget_assignment = 'assigned'` filter, Effect 1 (line 269) always fires on mount and Effect 2 (line 286) also fires because `hasBudgetFiltersChanged` is incorrectly `true`. Both calls use the same `budgetQueryParamsRef.current`, producing two identical requests.
- **All existing `ProjectsManagementFull` tests mock `useBudgetManagementEnabled` as `[false, true]`.** This masks the bug entirely — no existing test can reproduce it. A regression test must mock the flag as `[true, true]` and set a stored `budgetAssignmentFilter = 'assigned'`.
- **Fix is a one-line change** — replacing `budgetAssignmentFilter: 'all'` and `budgetCategory: 'all'` in the `useRef` initializer with the actual `budgetAssignmentFilter` and `budgetCategory` values from `useProjectsFilters()`. This ensures `hasBudgetFiltersChanged = false` on the first Effect 2 run, so only Effect 1 fires.
- **Speculative: changing `previousBudgetFiltersRef` initialization does not affect the budget filter change path** — when the user actually changes a filter, the ref is correctly updated inside Effect 2 before the early-return check, so subsequent filter changes continue to trigger fetches normally.
- **`skipPaginationReloadRef` guard in Effect 1 is unrelated to this bug** — it prevents Effect 1 from double-firing when sort or search resets `pagination.page` to 0, not when Effect 2 also fires.

---

## 7. Summary for Complexity Assessment

The duplicate-request bug is confined to a single component (`ProjectsManagementFull.tsx`) and is caused by a one-line initialization error. The `previousBudgetFiltersRef` useRef on lines 165–168 is hardcoded to `{budgetAssignmentFilter: 'all', budgetCategory: 'all'}` instead of using the actual initial values from `useProjectsFilters()`. When the component mounts with budget management already enabled (appInfoStore configs pre-fetched) and a stored filter of `'assigned'`, both the pagination effect (Effect 1, line 269) and the budget-filter-change effect (Effect 2, line 286) fire on mount and call `loadProjects` with identical parameters. The fix is to initialize the ref from the live state: `useRef({ budgetAssignmentFilter, budgetCategory })`. No store, API utility, or routing changes are needed.

Test coverage is the other half of the work. All existing `ProjectsManagementFull` test files mock `useBudgetManagementEnabled` as `[false, true]`, which completely hides the bug because Effect 2 short-circuits at `if (!isBudgetManagementEnabled) return`. A regression test must render the component with `useBudgetManagementEnabled` returning `[true, true]` and `useProjectsFilters` returning `budgetAssignmentFilter = 'assigned'`, then assert that `api.get` is called exactly once. This test belongs in the existing `ProjectsManagementFull` unit test suite or a new `ProjectsManagementFull.initialLoad.test.tsx` file under `__tests__/`. The `unit` project is the right workspace because the test mocks `useSnapshot` and `api`.

Overall complexity is low-to-medium. The change surface is one file, one line of production code, plus one new test case. The surrounding effect logic (sort, search, pagination skip guard) is untouched. The only caution is verifying that the fix does not suppress genuine budget filter changes on mount — it does not, because the change only affects the ref's initial value, not the comparison or update logic inside Effect 2.

---

## 8. External References

None named by the task.
