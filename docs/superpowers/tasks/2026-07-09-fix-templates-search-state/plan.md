# EPMCDME-13424: Fix Workflow Templates search filter state (two-bug scope)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fully preserve search filter state on `/workflows/templates` when the user navigates away and returns — both the initial display (Fix 1, committed) and "Clear All" after return (Fix 2, this plan).

**Architecture:** Fix 1 (committed) added a non-reactive Valtio store fallback to `WorkflowTemplates.useEffect`. Fix 2 adds a single `updateUrlWithFilters(initialFilterValues)` call to the restore effect in `WorkflowsFilters.tsx`, mirroring the same pattern already used in `useAssistantFilters.ts`. This makes the URL authoritative on mount so that "Clear All" produces a real `?name=X → (absent)` URL transition, triggering the existing `WorkflowTemplates.useEffect` re-fetch.

**Tech Stack:** React 18, Valtio, Vitest + React Testing Library, `@testing-library/user-event`

---

## Status

**Task 1 — Fix 1 + regression test: COMMITTED** (see git log). `WorkflowTemplates.tsx` line 87 already has the store fallback. The `restores persisted search filter when returning via bare-path navigation` test already exists and passes.

**Task 2 — Fix 2 (URL sync on restore): pending.** This is the only task that remains.

---

## File map

| Action | File |
|--------|------|
| ~~Modify~~ _(committed)_ | `src/pages/workflows/components/WorkflowTemplates.tsx:87` |
| Modify | `src/pages/workflows/components/WorkflowsFilters.tsx:32,142-146` |
| Modify | `src/pages/workflows/__tests__/WorkflowsListPage.integration.test.tsx` — add imports + new test inside `describe('search filter state preservation')` |

---

### Task 1 (DONE — committed)

Fix `WorkflowTemplates.tsx` line 87 — store fallback when URL param absent. Regression test: `restores persisted search filter when returning via bare-path navigation`. All 290 integration tests pass.

---

### Task 2: Fix `WorkflowsFilters.tsx` — sync URL on filter restore

**Files:**
- Modify: `src/pages/workflows/components/WorkflowsFilters.tsx:32` (import)
- Modify: `src/pages/workflows/components/WorkflowsFilters.tsx:142-146` (restore effect)
- Modify: `src/pages/workflows/__tests__/WorkflowsListPage.integration.test.tsx` (new test)

**Test-first: yes** — the RED gate for this fix is `expect(replace).toHaveBeenCalledWith({ query: { name: 'Example' } })` failing before the fix.

- [ ] **Step 1: Add test imports**

In `src/pages/workflows/__tests__/WorkflowsListPage.integration.test.tsx`, extend two existing import lines.

Find:
```typescript
import { screen, waitFor } from '@testing-library/react'
```
Replace with:
```typescript
import { act, screen, waitFor } from '@testing-library/react'
```

Find:
```typescript
import { mockRouterState } from '@/hooks/__mocks__/useVueRouter'
```
Replace with:
```typescript
import { mockRouterState, replace } from '@/hooks/__mocks__/useVueRouter'
```

(If either import already exists with the required identifier, skip that replacement.)

- [ ] **Step 2: Write the failing test**

Inside the existing `describe('search filter state preservation', () => { ... })` block (directly after the last `it(...)` test), add this test:

```typescript
it('resets to full list after Clear All when returning via bare-path navigation', async () => {
  // Wire replace and push so they update mockRouterState.query,
  // making the URL change visible to WorkflowTemplates.useEffect on re-render.
  replace.mockImplementation(({ query }: any) => {
    ;(mockRouterState as any).query = query ?? {}
  })
  ;(mockRouterState as any).push = vi.fn(({ query }: any) => {
    ;(mockRouterState as any).query = query ?? {}
  })

  // Seed localStorage: what setFilters() would have written after a previous search
  localStorage.setItem(
    'test-user-id_filters_workflows.templates',
    JSON.stringify({ name: 'Example' })
  )

  // Filtered API response for the initial render
  mockAPI('GET', 'v1/workflows/prebuilt', [
    {
      id: 'tmpl-ex',
      slug: 'example-pipeline',
      name: 'Example Pipeline',
      description: 'An example template',
    },
  ])

  renderPage('/workflows/templates')

  // Wait for filtered list to appear
  await waitFor(() => {
    expect(screen.getByText('Example Pipeline')).toBeInTheDocument()
  })

  // RED gate: after fix, restore effect must have called updateUrlWithFilters({ name: 'Example' })
  // which calls standalone replace({ query: { name: 'Example' } }).
  // Before fix: replace has NOT been called with { query: { name: 'Example' } } → test fails here.
  expect(replace).toHaveBeenCalledWith({ query: { name: 'Example' } })

  // Overwrite API mock with full list
  mockAPI('GET', 'v1/workflows/prebuilt', [
    {
      id: 'tmpl-dp',
      slug: 'data-pipeline',
      name: 'Data Pipeline',
      description: 'A data template',
    },
    {
      id: 'tmpl-ex',
      slug: 'example-pipeline',
      name: 'Example Pipeline',
      description: 'An example template',
    },
  ])

  // Click "Clear All" — this clears local React state in Filters.tsx
  await userEvent.click(screen.getByText('Clear all'))

  // Advance 1100ms to fire the 1s debounce → handleApply({}) →
  // router.push({ page: '1' }) + replace({ query: {} }) → mockRouterState.query = {}
  await act(async () => {
    vi.advanceTimersByTime(1100)
  })

  // Force a Valtio-driven re-render of WorkflowTemplates by mutating subscribed state.
  // WorkflowTemplates uses useSnapshot(workflowsStore), so mutating workflowTemplates
  // triggers a re-render where route.query?.name is now undefined (changed from 'Example').
  // WorkflowTemplates.useEffect dep changes → indexWorkflowTemplates(0, 12, '') fires.
  await act(async () => {
    workflowsStore.workflowTemplates = []
  })

  // Full list must now be visible
  await waitFor(() => {
    expect(screen.getByText('Data Pipeline')).toBeInTheDocument()
  })
})
```

Extend the existing `afterEach` inside `describe('search filter state preservation')` to include mock cleanup:

```typescript
afterEach(() => {
  // existing resets ...
  replace.mockReset()
  ;(mockRouterState as any).query = {}
})
```

- [ ] **Step 3: Run the test and verify it FAILS (RED)**

```bash
npm run test:integration -- --reporter=verbose --testNamePattern="resets to full list after Clear All"
```

Expected: test **fails**. The assertion `expect(replace).toHaveBeenCalledWith({ query: { name: 'Example' } })` reports that `replace` was not called with `name` — confirming the URL sync is missing.

- [ ] **Step 4: Apply the production fix**

Open `src/pages/workflows/components/WorkflowsFilters.tsx`. Two changes only — `initialFilterValues` (lines 63–79) is left as the original reactive IIFE, no changes there.

**Why not `useMemo([scope])`:** it would freeze `initialFilterValues` at mount-time, breaking `areFiltersEmpty` (lines 271–279) which derives directly from it — "Clear All" would stop appearing when the user types a search within the same mount, across all scopes.

**Loop mitigation instead:** conditional guard in the effect — `updateUrlWithFilters` is called only when the URL does not already reflect the restored value. After the first `replace()` the URL updates to `?name=Example`; on the next render `route.query?.name === initialFilterValues.name` → guard false → no second call. Stopped after one iteration.

**4a. Extend the import at line 32:**

Find:
```typescript
import { FILTER_ENTITY, getFilters, setFilters } from '@/utils/filters'
```
Replace with:
```typescript
import { FILTER_ENTITY, getFilters, setFilters, updateUrlWithFilters } from '@/utils/filters'
```

**4b. Update the restore effect (lines 142–146):**

Find:
```typescript
  useEffect(() => {
    if (!onApply) {
      workflowsStore.setWorkflowsFilters(initialFilterValues)
    }
  }, [initialFilterValues, onApply])
```
Replace with:
```typescript
  useEffect(() => {
    if (!onApply) {
      workflowsStore.setWorkflowsFilters(initialFilterValues)
      if (initialFilterValues.name && route.query?.name !== initialFilterValues.name) {
        updateUrlWithFilters(initialFilterValues)
      }
    }
  }, [initialFilterValues, onApply, route.query?.name])
```

`route.query?.name` is added to the dep array because the effect body now reads it (exhaustive-deps).

- [ ] **Step 5: Run the new test and verify it PASSES (GREEN)**

```bash
npm run test:integration -- --reporter=verbose --testNamePattern="resets to full list after Clear All"
```

Expected: test **passes**.

- [ ] **Step 6: Run both tests in `search filter state preservation`**

```bash
npm run test:integration -- --reporter=verbose --testNamePattern="search filter state preservation"
```

Expected: both tests pass (`restores persisted search filter` + `resets to full list after Clear All`).

- [ ] **Step 7: Manual browser verification**

Start the dev server (`npm run dev` or equivalent).

**Scenario A — navigation restore + Clear All (primary fix):**
1. Open `/workflows/templates` → search 'Example' → list filters.
2. Navigate to `/workflows` → navigate back to `/workflows/templates`.
3. Confirm: URL shows `?name=Example`, list is filtered.
4. Click "Clear All" once → list resets to full.
5. DevTools → Network: no repeated navigate calls (loop check).
6. DevTools → Console: no React "Maximum update depth exceeded" or similar warnings.

**Scenario B — within-mount reactivity (`areFiltersEmpty` regression guard):**
1. Navigate to `/workflows/templates` fresh (no prior search, URL clean).
2. Type a search term in the search box.
3. Confirm: "Clear All" button appears immediately — no reload or navigation required.
4. Open `/workflows/all` → apply a project filter → "Clear All" must also appear immediately.

- [ ] **Step 8: Run the full Templates suite**

```bash
npm run test:integration -- --reporter=verbose --testNamePattern="Templates"
```

Expected: all tests pass.

- [ ] **Step 10: Run the full integration suite**

```bash
npm run test:integration
```

Expected: no failures.

- [ ] **Step 11: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 12: Commit**

```bash
git add src/pages/workflows/components/WorkflowsFilters.tsx \
        src/pages/workflows/__tests__/WorkflowsListPage.integration.test.tsx
git commit -m "EPMCDME-13424: Fix URL not synced on restore causing Clear All not to reset list"
```
