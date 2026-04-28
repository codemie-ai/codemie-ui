---
name: integration-tester
description: Use this skill when the user asks to write integration tests, improve branch coverage on changed files, or cover Component → Store → API → UI flows. Triggers: 'write integration tests', 'add integration coverage', 'cover changed files', 'integration test for [page]', 'improve branch coverage', 'run coverage check'.
version: 0.3.0
---

# Integration Tester

## Core Mission

Write production-ready **integration tests** that verify the full Component → Store → API → UI chain. Follow a coverage-driven cycle: measure first, then write tests only where branch coverage is insufficient.

**Integration test = Component renders → user interacts → store method called → API mocked → UI updates.**

---

## Step 1: Determine Mode

Two modes depending on how the skill was invoked:

### Mode A — target provided explicitly

User passed a component name or path as argument (e.g. `/integration-tester ProvidersManagementPage` or "write integration tests for Categories page").

→ **Skip coverage measurement entirely.** Use the provided name as the target. Proceed to Step 2.

### Mode B — no target provided (coverage-driven)

Run coverage on changed files:

```bash
npx vitest run --coverage --changed main 2>&1
```

Parse the output table. Focus on **Branch %** column:

```
 % Stmts | % Branch | % Funcs | % Lines | File
---------|----------|---------|---------|------
   82.35 |    45.00 |   75.00 |   82.35 | src/pages/settings/administration/ProvidersManagementPage.tsx
   91.00 |    78.00 |   88.00 |   91.00 | src/store/providers.ts
```

**Thresholds:**
- Branch < 70% → write integration tests (priority target)
- Branch 70–85% → write tests for uncovered edge cases
- Branch > 85% → acceptable, skip unless explicitly requested

**If the command fails, produces no coverage table, or no changed files detected** — do NOT debug, do NOT retry. Ask the user directly:

> "No changed files detected (or coverage failed). Which page or component should I write integration tests for?"

Then proceed to Step 2 with the user's answer as the target.

---

## Step 2: Read and Analyse

Read the following files:
1. The **component file** — what it renders, what user interactions exist, what store it uses
2. The **store file** — what methods exist, exact API call URLs, what state it manages
3. **Existing tests** in `__tests__/` — what's already covered, avoid duplication
4. **`src/test-utils/integration.tsx`** — available test utilities so you know which helper to use before writing the first test

```bash
grep -r "from '@/store/" src/pages/TARGET_PAGE.tsx
```

---

## Step 2b: Plan the Test List

After reading, output a numbered test plan before writing anything:

```
📋 Test plan for ProvidersManagementPage (8 tests):

1. renders providers list on mount
2. shows empty state when no providers
3. shows error when API fails
4. opens create modal on Add button click
5. creates provider and refreshes list
6. opens edit modal with pre-filled data
7. deletes provider after confirmation
8. does not delete when confirmation cancelled

API endpoints found:
  GET  v1/providers
  POST v1/providers
  PUT  v1/providers/:id
  DELETE v1/providers/:id
```

**Wait for user to confirm or adjust the plan before proceeding to Step 3.**
If user says "go" or "ok" — proceed. If user removes or adds items — update the list.

---

## Step 3: Write Tests Incrementally

**One test at a time. Write → Run → Fix → Next. Never write all tests upfront.**

### File setup first

Create the file with boilerplate only — no test cases yet:

```tsx
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'

import { mockAPI, navigate, renderPage } from '@/test-utils/integration'

describe('MyPage — Integration', () => {
  const user = userEvent.setup()
})
```

Run it immediately to confirm the file loads without errors:
```bash
npx vitest run src/path/__tests__/MyPage.integration.test.tsx 2>&1 | tail -15
```

### Then add one test at a time

Before writing each test, announce progress:

```
[1/8] Writing: "renders providers list on mount"
```

After running and passing:

```
[1/8] ✅ renders providers list on mount
[2/8] Writing: "shows empty state when no providers"
```

If skipped:

```
[3/8] ⏭️ skipped: "shows error when API fails" — internal detail, revisit later
```

**Cycle for each test case:**

```
1. Announce [N/Total] Writing: "test name"
2. Add ONE test case to the file
3. Run: npx vitest run src/path/__tests__/MyPage.integration.test.tsx 2>&1 | tail -20
4. PASS → announce [N/Total] ✅, move to next
   FAIL → apply one fix, run again
   FAIL again → announce [N/Total] ⏭️ skipped, move to next (see Anti-loop Rule)
```

### File naming

```
src/pages/settings/administration/
├── ProvidersManagementPage.tsx
└── __tests__/
    ├── ProvidersManagementPage.test.tsx              ← existing unit test (don't touch)
    └── ProvidersManagementPage.integration.test.tsx  ← created incrementally
```

---

## Infrastructure Reference

### What `setupTests.tsx` provides globally (no import needed)

Integration tests run under the `integration` Vitest project which loads `setupTests.tsx` only.
Valtio and stores are **real** — no mocks. The global `fetch` is stubbed — all fetch calls (both `@/utils/api` wrapper and raw `fetch` in stores) go through the same mock.

| Mock | What it does |
|------|-------------|
| `global.fetch` | Stubbed — routes to `requestRegistry` then `globalDefaults` |
| `useNavigate` | Replaced with a `vi.fn()` spy — captures calls, no real navigation |
| `SettingsLayout` | Renders as `<div><h1>{contentTitle}</h1><div>{rightContent}</div><div>{content}</div></div>` |
| `useVueRouter` | Returns `{ push: vi.fn(), params: {} }` |
| `toaster` | All methods are `vi.fn()` |
| `localStorage` | In-memory mock |
| `ResizeObserver` | `vi.fn()` stub |
| `matchMedia` | `vi.fn()` stub |

**Global GET defaults** (auto-responds without explicit mock):
- `v1/llm_models` → `[]`
- `v1/embeddings_models` → `[]`
- `v1/config` → `[]`
- `v1/assistants/user` → `[]`
- `v1/assistants/categories` → array of 3 categories
- `v1/user` → `{ applications: [] }`
- `v1/settings/user/available` → `[]`
- `v1/conversations/folders/list` → `[]`

Endpoints **not** in global defaults return `null` with status 200. Mock them per-test via `mockAPI`.

### `mockAPI` — per-test API mocking

Imported from `@/test-utils/integration`. Registry is cleared automatically in `afterEach`.

```tsx
import { mockAPI } from '@/test-utils/integration'

// Standard response (status 200)
mockAPI('GET', 'v1/providers', [{ id: '1', name: 'AWS' }])
mockAPI('POST', 'v1/providers', { id: 'new', name: 'GCP' })
mockAPI('PUT', 'v1/providers/1', { id: '1', name: 'Updated' })
mockAPI('DELETE', 'v1/providers/1', null)

// Error response — pass HTTP status as 4th argument
mockAPI('POST', 'v1/providers', { error: { message: 'Conflict' } }, 422)
mockAPI('GET', 'v1/providers', { error: 'Forbidden' }, 403)

// GET with specific query params — matches only when all params match (order-insensitive)
mockAPI('GET', 'v1/providers', [{ id: '1' }], { page: 0, active: 'true' })
// matches:     v1/providers?page=0&active=true  ✅
// not matches: v1/providers?page=1&active=true  ❌
// not matches: v1/providers/user                ❌ (sub-path, not a query match)
```

**Matching rules:**
- No 4th arg → **prefix match**: `v1/providers` matches `v1/providers?page=0&...` but NOT `v1/providers/user`
- Number 4th arg → status code, still uses prefix match
- Object 4th arg → **exact match**: path must equal AND all specified params must be present

> ⚠️ **Factory functions removed.** The old `mockRequest(method, url, (body) => computed)` pattern no longer exists. For dynamic responses based on request body, use `vi.spyOn(global, 'fetch')` in that specific test.

### `navigate` — assert router calls

```tsx
import { navigate } from '@/test-utils/integration'

await waitFor(() => expect(navigate).toHaveBeenCalledWith('/dashboard'))
await waitFor(() => expect(navigate).toHaveBeenCalledWith('/auth/sign-in'))
```

`navigate` is the same `vi.fn()` that replaces `useNavigate` globally — all navigation calls from components and hooks are captured. Cleared automatically in `afterEach`.

> **Limitation:** navigate calls are recorded but do NOT update the router history. The target page will not render after navigation.

### `renderPage` — render with full router context

```tsx
import { renderPage } from '@/test-utils/integration'

// Pass the route path — uses real route config (createMemoryRouter)
renderPage('/settings/providers')
renderPage('/auth/sign-in')
renderPage('/assistants')
```

Routes under `/` render through `App` (Navigation, providers, `useInitialDataFetch`).
Top-level routes (`/auth/sign-in`, `/auth/sign-up`) render without `App` — intentional, auth has no Navigation.

---

## Query Priority

| Priority | Query | Example |
|----------|-------|---------|
| 1st | `getByRole` (sync) | `screen.getByRole('button', { name: 'Add' })` |
| 2nd | `findByRole` (async) | `await screen.findByRole('button', { name: 'Delete' })` |
| 3rd | `getByLabelText` | `screen.getByLabelText('Email address')` |
| 4th | `getByPlaceholderText` | `screen.getByPlaceholderText('Search...')` |
| 5th | `getByText` | `screen.getByText('Provider 1')` |
| Last | `getByTestId` | `screen.getByTestId('confirm-button')` |

**Scoping to a table row:**
```tsx
import { within } from '@testing-library/react'

const row = screen.getByText('Provider 1').closest('tr')!
const deleteBtn = within(row).getByRole('button', { name: 'Delete' })
await user.click(deleteBtn)
```

---

## Standard Test Cases for CRUD Pages

```tsx
describe('ProvidersList — Integration', () => {
  it('loads and displays providers on mount', async () => {
    mockAPI('GET', 'v1/providers', [{ id: '1', name: 'AWS' }])
    renderPage('/settings/providers')
    await waitFor(() => expect(screen.getByText('AWS')).toBeInTheDocument())
  })

  it('shows empty state when no providers exist', async () => {
    mockAPI('GET', 'v1/providers', [])
    renderPage('/settings/providers')
    await waitFor(() => expect(screen.getByText('No providers')).toBeInTheDocument())
  })

  it('opens create modal and creates provider', async () => { ... })
  it('opens edit modal with pre-filled data', async () => { ... })
  it('deletes provider after confirmation', async () => { ... })
  it('does not delete provider when confirmation cancelled', async () => { ... })
  it('shows error toast when loading fails', async () => {
    mockAPI('GET', 'v1/providers', { error: 'Server error' }, 500)
    renderPage('/settings/providers')
    await waitFor(() => expect(toaster.error).toHaveBeenCalled())
  })
})
```

---

## Anti-loop Rule — STRICT

**Maximum 2 fix attempts per failing test. Maximum 1 fix attempt per coverage gap. Then STOP.**

### When a test fails after writing:

**Attempt 1:** read the error, make one targeted fix (wrong selector, wrong URL, missing `waitFor`, etc.)

**Attempt 2 (if still failing):** step back — ask "is this testing user-visible behavior or an internal detail?"
- **Internal detail** → delete the test, leave a comment:
  ```tsx
  // NOTE: Skipped — tests internal implementation detail, not user-visible behavior.
  ```
- **Real behavior** → skip the test with `it.skip(...)` and move on

**Never attempt a 3rd fix. Never spend more than 2 rounds debugging a single test.**

### When coverage is below threshold after writing tests:

**Attempt 1:** add one more targeted test case for the uncovered branch

**If still below threshold** → stop, report current state to the user:
> "Coverage for [file] is at X% Branch. Remaining uncovered branches appear to require [reason]. Here is what is covered: [list]. Stopping here."

**Never chase 100% coverage. Ship what passes and move on.**

---

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Using `mockRequest` (removed) | Replace with `mockAPI` — factory functions no longer supported |
| Passing JSX to `renderPage` | Pass a route path string: `renderPage('/path')` |
| Wrong API URL or method | Check exact URL + method in store file |
| GET with query params not matching | Use `mockAPI('GET', 'v1/endpoint', data, { param: val })` for exact param match |
| Sub-path unintentionally matched | Prefix match stops at `?`, not `/` — register sub-path explicitly if needed |
| Missing `waitFor` | Wrap async assertions in `waitFor` |
| Multiple "Delete" buttons | Use `within(row)` scope |
| Dropdown items not found | Use `findByRole` (async) — dropdowns render asynchronously |
| `navigate` not called | Wrap assertion in `waitFor` — navigation is async |

---

## Step 4: Final Coverage Check

After all tests are written and passing, run a final coverage check.

**Mode B (coverage-driven — changed files):**
```bash
npx vitest run --coverage --changed main 2>&1 | tail -30
```

**Mode A (explicit target — specific page):**
```bash
npx vitest run --coverage src/pages/PATH/__tests__/ComponentName.integration.test.tsx 2>&1 | tail -30
```

Branch % should be ≥ 70%. If below — add one more targeted test, run once more.
If still below after one attempt → stop and report to the user (see Anti-loop Rule).

---

## Checklist Before Delivering

- [ ] File named `ComponentName.integration.test.tsx` in `__tests__/` folder
- [ ] `mockAPI(method, url, data)` — not `mockRequest`, no factory functions
- [ ] `renderPage('/route/path')` — path string, not JSX component
- [ ] `mockAPI` called before `renderPage` for each test
- [ ] `waitFor()` for all async assertions
- [ ] `navigate` assertions wrapped in `waitFor`
- [ ] Happy path + empty state + error state covered
- [ ] Branch coverage improved after re-run
