# Spec: EPMCDME-13424 — Fix Workflow Templates search filter state (two-bug scope)

## Status

- **Fix 1** — `WorkflowTemplates.tsx` fallback to store: **committed** (regression test included)
- **Fix 2** — `WorkflowsFilters.tsx` URL sync on restore: **pending** (this spec)

---

## Problem — Fix 2

After Fix 1, the filtered list is correctly restored on return to `/workflows/templates`. However, the URL is **not updated** (`?name=Example` does not appear). Because `WorkflowTemplates.useEffect` watches `route.query?.name`, clicking **"Clear All"** produces a `undefined → undefined` URL transition — React detects no change, the effect does not re-run, and the list stays filtered instead of resetting to the full set.

**Root cause.** The restore effect in `WorkflowsFilters.tsx` (lines 142–146) calls `workflowsStore.setWorkflowsFilters(initialFilterValues)` but does **not** call `updateUrlWithFilters(initialFilterValues)`. The existing `handleApply` path (triggered by user interaction) does sync the URL via `setFilters()`, but the mount-time restore path is missing this step.

**Why the existing "Clear All" button appears correctly.** `areFiltersEmpty` is computed from `initialFilterValues` (localStorage). Since `{ name: 'Example' }` is in localStorage on return, `areFiltersEmpty = false` and the button is shown. The button disappears only after `handleApply({})` clears localStorage — which never fires because the re-fetch never runs.

---

## Fix — Fix 2

**File:** `src/pages/workflows/components/WorkflowsFilters.tsx`

### Re-render loop risk and mitigation

`initialFilterValues` (lines 63–79) is an IIFE — new object reference on every render. The restore effect dep array is `[initialFilterValues, onApply]`. Without a guard, adding `updateUrlWithFilters()` → `replace()` → hash-router navigation → `useLocation()` update → React re-render → new IIFE object → effect fires again → another navigation → infinite loop.

`useMemo([scope])` would stop the loop but freeze `initialFilterValues` at mount-time. `areFiltersEmpty` (lines 271–279) derives directly from it, so the "Clear All" button would stop appearing when the user types or applies filters within the same mount — a broader regression across all scopes.

**Chosen mitigation: conditional guard.** Keep the IIFE reactive. Make the `updateUrlWithFilters` call conditional on the URL not yet reflecting the restored value. Add `route.query?.name` to the dep array (it is now read in the effect body).

Loop trace:
- Render 1 (bare-path return, `route.query?.name = undefined`, `initialFilterValues.name = 'Example'`): guard true → `updateUrlWithFilters` called → URL becomes `?name=Example`.
- Render 2 (after navigation, `route.query?.name = 'Example'`): guard `'Example' !== 'Example'` → false → no second `updateUrlWithFilters`. Stopped.

**Step 1 — extend import (line 32):**

```tsx
// Before
import { FILTER_ENTITY, getFilters, setFilters } from '@/utils/filters'

// After
import { FILTER_ENTITY, getFilters, setFilters, updateUrlWithFilters } from '@/utils/filters'
```

**Step 2 — update restore effect (lines 142–146):**

```tsx
// Before
useEffect(() => {
  if (!onApply) {
    workflowsStore.setWorkflowsFilters(initialFilterValues)
  }
}, [initialFilterValues, onApply])

// After
useEffect(() => {
  if (!onApply) {
    workflowsStore.setWorkflowsFilters(initialFilterValues)
    if (initialFilterValues.name && route.query?.name !== initialFilterValues.name) {
      updateUrlWithFilters(initialFilterValues)
    }
  }
}, [initialFilterValues, onApply, route.query?.name])
```

`initialFilterValues` remains the reactive IIFE — no changes to lines 63–79. No other production files require changes.

### Manual browser verification (required)

After the fix, verify in the browser on `/workflows/templates`:

**Scenario A — navigation restore + Clear All:**
1. Search for 'Example' → navigate away → navigate back.
2. Confirm: URL shows `?name=Example`, list is filtered.
3. Click "Clear All" once → list resets to full.
4. DevTools → Network: no repeated navigate calls (loop check).
5. DevTools → Console: no React infinite-render warnings.

**Scenario B — within-mount reactivity (regression guard for `areFiltersEmpty`):**
1. Navigate to `/workflows/templates` fresh (no prior search).
2. Type a search term directly in the search box.
3. Confirm: "Clear All" button appears immediately — without reload or navigation.
4. Repeat on `/workflows/all` with a project filter — "Clear All" must also appear immediately.

---

## Regression Test

**File:** `src/pages/workflows/__tests__/WorkflowsListPage.integration.test.tsx`
**Location:** new `it(...)` inside the existing `describe('search filter state preservation', ...)`

**Scenario:** search → navigate away → return (bare path) → single "Clear All" click → list resets to full.

### Setup

```tsx
// Wire replace and push mocks to update mockRouterState.query
replace.mockImplementation(({ query }: any) => { mockRouterState.query = query ?? {} })
;(mockRouterState.push as any).mockImplementation(({ query }: any) => { mockRouterState.query = query ?? {} })

// Simulate the state written by setFilters() after a previous search
localStorage.setItem('test-user-id_filters_workflows.templates', JSON.stringify({ name: 'Example' }))

// Filtered API response for the initial render
mockAPI('GET', 'v1/workflows/prebuilt', [
  { id: 'tmpl-ex', slug: 'example-pipeline', name: 'Example Pipeline', description: 'An example' },
])
```

### Sequence

1. `renderPage('/workflows/templates')` — `mockRouterState.path = '/workflows/templates'` (set by `describe('Templates')` `beforeEach`)
2. `await waitFor(() => expect('Example Pipeline')...)` — restore effect fires; **after fix** calls `updateUrlWithFilters({ name: 'Example' })` → `replace({ query: { name: 'Example' } })` → `mockRouterState.query.name = 'Example'`
3. Assert `expect(replace).toHaveBeenCalledWith({ query: { name: 'Example' } })` — **this is the RED/GREEN gate**: fails before fix (replace not called with `name`), passes after
4. Overwrite API mock with full list (Data Pipeline + Example Pipeline)
5. Click "Clear All"
6. `await act(async () => { vi.advanceTimersByTime(1100) })` — fires 1s debounce → `handleApply({})` → `router.push({ page: '1' })` + `replace({ query: {} })` → `mockRouterState.query = {}`
7. `await act(async () => { workflowsStore.workflowTemplates = [] })` — triggers Valtio re-render of `WorkflowTemplates`; in that render `route.query?.name = undefined` (changed from `'Example'`) → effect re-runs → `indexWorkflowTemplates(0, 12, '')` → full list API call
8. `await waitFor(() => expect('Data Pipeline')...)` — full list visible

### Additional import needed in test file

```tsx
import { act, screen, waitFor } from '@testing-library/react'
import { mockRouterState, replace } from '@/hooks/__mocks__/useVueRouter'
```

### Cleanup

Add to the existing `afterEach` in `describe('search filter state preservation')`:

```tsx
replace.mockReset()
mockRouterState.push.mockReset()
;(mockRouterState as any).query = {}
```

---

## Acceptance Criteria

1. Search query state is preserved (filtered list shown) after navigating from `/workflows/templates` to another page and back.
2. The URL shows `?name=Example` after returning to `/workflows/templates` (Fix 2 verification).
3. Clicking "Clear All" **once** after returning resets the list to the full template set.
4. Clearing the search input character-by-character also works (existing behavior; not changed).
5. Typing a new search after returning correctly refines the list.
6. The Playwright test `test_workflow_template_search_journey[chromium]` passes.
7. No regression in Workflow Templates search/filter behaviour.

---

## Out of Scope

- `WorkflowsListPage.clearWorkflowsFilters` guard for TEMPLATES scope — not required for either fix.
- Any backend changes — fix is entirely client-side.
- Removing the URL-as-communication-channel pattern for templates — out of scope for this ticket.
