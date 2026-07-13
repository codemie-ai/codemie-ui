# Technical Research

**Task**: workflowsFilters valtio workflow templates search filter state — two-bug scope
**Generated**: 2026-07-09T00:00:00Z (updated after first fix landed, second bug identified)

---

## 1. Original Context

Bug EPMCDME-13424: Workflow Templates search filter state is not preserved after navigating away and returning. After entering a search query (e.g. 'Example') on /workflows/templates, navigating away to /workflows, and then returning to /workflows/templates, the page shows all template cards instead of the filtered set.

**First bug (committed):** `WorkflowTemplates.tsx` read `name` exclusively from `route.query?.name`. Navigation pushes a bare path with no query string, so `name` became `''` on remount → all templates shown. Fix: fall back to `workflowsStore.workflowsFilters.name` when URL param absent.

**Second bug (pending):** After the first fix, the filtered list correctly restores on return, but `?name=Example` does NOT appear in the URL (the restore effect never called `updateUrlWithFilters`). Because `WorkflowTemplates.useEffect` watches `route.query?.name`, clicking "Clear All" produces a `undefined → undefined` transition — React sees no change, no re-fetch fires, the list stays filtered instead of resetting to the full set.

---

## 2. Codebase Findings

### Existing Implementations

- `src/store/workflows.ts` — Valtio `proxy<WorkflowsStore>`. Contains `workflowsFilters: WorkflowsFilters` (name, project, shared, created_by, categories), `setWorkflowsFilters()`, `clearWorkflowsFilters()`, `indexWorkflowTemplates(page, perPage, name='')`. NOTE: ticket says "Zustand store" but the implementation is Valtio.

- `src/pages/workflows/WorkflowsListPage.tsx` — Top-level page. `useEffect([scope, isFavorites])` calls `workflowsStore.clearWorkflowsFilters()` on every scope mount. No `useSnapshot` subscription. Renders `WorkflowsFilters` (sidebar) and `WorkflowTemplates` (main area) as children for TEMPLATES scope.

- `src/pages/workflows/components/WorkflowTemplates.tsx` (line 84–92) — Fetch effect:
  ```tsx
  useEffect(() => {
    if (route.path.includes('/workflows/templates')) {
      const { page, perPage } = getPageFromURL()
      const name = (route.query?.name as string) || workflowsStore.workflowsFilters.name || ''
      workflowsStore.indexWorkflowTemplates(page, perPage, name).catch(...)
    }
  }, [route.path, route.query?.name])
  ```
  This is the **post-first-fix state**. The URL param fallback reads the Valtio store. The effect has `route.query?.name` as a dependency — this is the communication channel for "Clear All" to trigger a re-fetch.

- `src/pages/workflows/components/WorkflowsFilters.tsx` — Sidebar filter panel.
  - `initialFilterValues` is an IIFE computed on every render: calls `getFilters('workflows.${scope}')` which reads URL-first, localStorage-second.
  - **Restore effect** (lines 142–146):
    ```tsx
    useEffect(() => {
      if (!onApply) {
        workflowsStore.setWorkflowsFilters(initialFilterValues)
        // SECOND FIX: updateUrlWithFilters(initialFilterValues) belongs here
      }
    }, [initialFilterValues, onApply])
    ```
  - `handleApply` (lines 234–269): for templates scope (`onApply = undefined`), calls `router.push({path, query: {page: '1', ...cleanFilters}})` + `workflowsStore.setWorkflowsFilters(filters)` + `setFilters('workflows.templates', filters)`. The `setFilters` utility calls `updateUrlWithFilters` internally, so subsequent applies DO sync the URL. Only the **restore-on-mount** path is missing `updateUrlWithFilters`.
  - Import line 32: `import { FILTER_ENTITY, getFilters, setFilters } from '@/utils/filters'` — `updateUrlWithFilters` is NOT yet imported here.

- `src/utils/filters.ts` — Key utilities:
  - `getFilters(entityKey)`: reads URL first (via `window.location.search`), then `storage.getObject(userId, key)`. key = `filters_${entityKey}`.
  - `setFilters(entityKey, filters)`: calls `updateUrlWithFilters(filters)` + `storage.put(userId, key, filters)`.
  - `updateUrlWithFilters(filters)`: builds `URLSearchParams` (skips `null`, `undefined`, `''`, empty arrays), calls standalone `replace({ query: parseSearchParams(searchParams) })`.
  - Storage key format: `${userId}_filters_${entityKey}` — e.g. `test-user-id_filters_workflows.templates`.

- `src/hooks/useVueRouter.ts` (production) and `src/hooks/__mocks__/useVueRouter.ts` (test mock) — The standalone `replace` is imported by `updateUrlWithFilters`:
  ```ts
  import { parseSearchParams, replace } from '@/hooks/useVueRouter'
  ```
  In tests, this resolves to the mock module's standalone `export const replace = vi.fn()` (line 92 of the mock). This is SEPARATE from `mockRouterState.replace`.

- `src/pages/assistants/hooks/useAssistantFilters.ts` (lines 79–87) — Reference pattern for URL sync on restore:
  ```ts
  useEffect(() => {
    if (user?.userId) {
      const saved = getSavedFilters()
      setFilterState(saved)
      if (Object.keys(saved).length > 0) {
        updateUrlWithFilters(saved)
      }
    }
  }, [user?.userId, getSavedFilters])
  ```
  Developer comment: "Also syncs the URL to reflect the restored filters so that ?search=value reappears after navigating away and back (clearUrlFilters strips it on navigation, so we restore it here)." This is exactly the pattern needed for `WorkflowsFilters`.

### Effect Ordering (corrected from original analysis)

React runs effects **bottom-up** (children before parent). For the `/workflows/templates` component tree the actual order is:

1. `WorkflowsFilters.useEffect` (child, sidebar) — restores `workflowsStore.workflowsFilters.name = 'Example'` from localStorage. **After second fix**: also calls `updateUrlWithFilters({ name: 'Example' })` → standalone `replace({ query: { name: 'Example' } })`.
2. `WorkflowTemplates.useEffect` (child, main area) — reads `route.query?.name` (absent on bare path), falls back to `workflowsStore.workflowsFilters.name = 'Example'`. Calls `indexWorkflowTemplates(0, 12, 'Example')`.
3. `WorkflowsListPage.useEffect` (parent) — calls `clearWorkflowsFilters()`. Runs **last**, after both children have completed their effects. This is why Approach B (reactive dep on `workflowsFilters.name`) is unsafe: the parent clear would fire after the children restore, triggering a third effect run with `name = ''`.

### Architecture and Layers Affected

- **Page/View layer**: `WorkflowTemplates.tsx` (first fix, already committed), `WorkflowsFilters.tsx` (second fix, pending)
- **Filter/Sidebar layer**: `WorkflowsFilters.tsx`, `Filters.tsx` (Clear All mechanism)
- **State layer**: `src/store/workflows.ts` (Valtio proxy)
- **Persistence layer**: `src/utils/filters.ts` + `src/utils/storage/index.ts` (localStorage)
- **Routing layer**: `src/hooks/useVueRouter.ts` / mock

### Integration Points

- `updateUrlWithFilters` → standalone `replace` → `mockRouterState` via mock in tests
- `handleApply({})` (after "Clear All") → `router.push({ query: { page: '1' } })` + `setFilters({})` → `updateUrlWithFilters({})` → `replace({ query: {} })`
- `WorkflowTemplates.useEffect` dependencies `[route.path, route.query?.name]` — only re-runs when `route.query?.name` changes, which requires a React re-render with updated `mockRouterState.query`

---

## 3. Testing Landscape

### Existing Coverage

- `WorkflowsListPage.integration.test.tsx` — `describe('Templates', 'search filter state preservation')` — **first test committed**: asserts `indexWorkflowTemplates` called with `name='Example'` when localStorage is pre-seeded. **Second test pending**: asserts full list restored after "Clear All" following bare-path navigation.
- No test yet covers: "Clear All after returning via bare-path → full list restored".

### Test Infrastructure — Second Test Constraints

The test mock for `useVueRoute` returns `mockRouterState` by reference. `mockRouterState.query` is a plain object; changing it does NOT trigger a React re-render (no React state involved).

**Required test setup for "Clear All" scenario:**
1. `replace.mockImplementation(({ query }) => { mockRouterState.query = query ?? {} })` — wire the standalone `replace` mock to update `mockRouterState.query`, so `updateUrlWithFilters({ name: 'Example' })` on mount makes `mockRouterState.query.name = 'Example'`.
2. `(mockRouterState.push as any).mockImplementation(({ query }) => { mockRouterState.query = query ?? {} })` — wire `push` similarly for `handleApply`'s `router.push` call.
3. After advancing timers 1100ms to fire the debounce and run `handleApply({})`, `mockRouterState.query` becomes `{}` (cleared by `replace.mockImpl`).
4. Force a re-render of `WorkflowTemplates` (which subscribes to Valtio `workflowTemplates`) via `act(() => { workflowsStore.workflowTemplates = [] })`. This triggers a re-render where `route.query?.name` reads `undefined` (changed from `'Example'`), the effect dep changes, and `indexWorkflowTemplates(0, 12, '')` fires.
5. `afterEach` must call `replace.mockReset()` and `mockRouterState.push.mockReset()` to avoid polluting other tests.

**Before fix (RED):** `replace` is NOT called with `{ query: { name: 'Example' } }` on mount → `mockRouterState.query.name` stays `undefined` throughout → after "Clear All" the transition is `undefined → undefined` → no re-fetch → "Data Pipeline" never rendered.

**After fix (GREEN):** `replace` IS called → `mockRouterState.query.name = 'Example'` → re-render detects change → `indexWorkflowTemplates(0, 12, '')` fires → full list rendered.

---

## 4. Documentation Findings

No `.ai-run/guides/` files cover this specific feature area. Patterns derived from source (assistants, filters utilities) are described above.

---

## 5. Configuration and Environment

No environment variables or feature flags affect this flow. Fix is purely client-side.

---

## 6. Risk Indicators

- **Primary (first fix, committed):** `WorkflowTemplates.tsx` read `name` from URL only. Fixed: fallback to `workflowsStore.workflowsFilters.name`. Regression test added.

- **Secondary (second fix, pending):** `WorkflowsFilters.tsx` restore effect does not call `updateUrlWithFilters`. "Clear All" broken because the URL transition is `undefined → undefined`. Fix: add `updateUrlWithFilters(initialFilterValues)` to the restore effect — but see the re-render loop risk below.

- **Re-render loop risk (must resolve before adding `updateUrlWithFilters`):** `initialFilterValues` (lines 63–79) is an IIFE recomputed on every render — new object reference each time. The restore effect dep array is `[initialFilterValues, onApply]`. If `updateUrlWithFilters()` → `replace()` → hash-router navigation → `useLocation()` update → React re-render, `initialFilterValues` becomes a new object, effect dep changes, effect fires again, navigation fires again → infinite loop.

  **Rejected mitigation — `useMemo([scope])`:** Wrapping the IIFE in `useMemo([scope])` stops the loop but freezes `initialFilterValues` at mount-time. `areFiltersEmpty` (lines 271–279) derives directly from `initialFilterValues`, so it would never update when the user types a search or applies a filter within the same mount. The "Clear All" button would not appear for normal filter operations on any scope (`templates`, `all`, `my`, `marketplace`). This is a broader regression than the original bug.

  **Chosen mitigation — conditional guard in the restore effect:** Keep the IIFE reactive. Make the `updateUrlWithFilters` call conditional on the URL not already reflecting the restored value:

  ```tsx
  useEffect(() => {
    if (!onApply) {
      workflowsStore.setWorkflowsFilters(initialFilterValues)
      if (initialFilterValues.name && route.query?.name !== initialFilterValues.name) {
        updateUrlWithFilters(initialFilterValues)
      }
    }
  }, [initialFilterValues, onApply, route.query?.name])
  ```

  Loop trace:
  - Render 1 (bare-path return, URL empty, `route.query?.name = undefined`, `initialFilterValues.name = 'Example'`): guard `'Example' && undefined !== 'Example'` → true → `updateUrlWithFilters` called → `replace({ query: { name: 'Example' } })` → URL becomes `?name=Example`.
  - Render 2 (triggered by navigation, `route.query?.name = 'Example'`, `initialFilterValues.name = 'Example'`): guard `'Example' && 'Example' !== 'Example'` → false → `updateUrlWithFilters` NOT called. Loop stopped.

  `initialFilterValues` remains the reactive IIFE — `areFiltersEmpty` stays fully live for all scopes.

  Note: `route.query?.name` is added to the dep array since the effect body now reads it; React's exhaustive-deps rule requires this.

  **Manual browser verification required** after implementing:
  1. Search → navigate away → back: URL shows `?name=Example`, "Clear All" resets list, Network shows no repeated navigate calls.
  2. Within the same mount (no navigation): type a search on `/workflows/templates` — "Clear All" button appears immediately without reload or navigation.

- **Effect ordering dependency (Approach B is unsafe):** Adding `workflowsFilters.name` as a reactive Valtio dep to `WorkflowTemplates.useEffect` would trigger a third run after parent's `clearWorkflowsFilters()`, overwriting the filtered result. Approach A (non-reactive one-shot store read) remains correct.

- **Test infrastructure fragility:** `replace` (standalone) and `mockRouterState.push` do not update `mockRouterState.query` by default. Tests that need to assert on the "URL → re-render" chain must wire `mockImplementation` for these mocks and force a Valtio-driven re-render manually. Note: in the test environment `replace` mock does NOT trigger a React re-render (no `useLocation()` connection), so the infinite-loop risk does not manifest in tests — but must be verified manually in the browser.

- **No feature flags, no backend changes, no DB schema changes.**

---

## 7. Summary for Complexity Assessment

Two tightly sequenced fixes in `src/pages/workflows/`. First fix (1 line in `WorkflowTemplates.tsx`) committed with regression test. Second fix adds `useMemo([scope])` wrapper to `initialFilterValues` (prevents re-render loop) + `updateUrlWithFilters(initialFilterValues)` in restore effect + import extension. Follows the established `useAssistantFilters.ts` pattern. Regression test for second fix requires careful mock setup (see §3). Total change surface: 2 production files, 1 test file. Requires manual browser verification for the loop-safety property.
